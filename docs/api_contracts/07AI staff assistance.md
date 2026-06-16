# AI staff assistance

Staff-only, **proposed prototype** decision-support context (**ProposalAgent**). A staff reviewer opens an assistance **session** against one requester **message** on a proposal; the agent triages the message, finds relevant documents, and searches the collection for objects, then answers follow-up questions in a chat.

> This contract documents the **current mock implementation** (`AiStaffAssistanceServiceMock`) — deterministic and synchronous. Notes mark where the shared type model is broader than what the mock actually produces or enforces.

**Boundary** — assistance only **reads** User Request data (proposal, conversation, messages, documents); it **never mutates** `Proposal`, `Conversation`, `Message`, `Document`, or `CollectionUseProject` state. All generated data lives in its own `AssistanceSession` aggregate.

**Authentication** — bearer token. The **staff-only** check (any non-`EXTERNAL` group: `CURATORIAL`, `COLLECTIONS_MANAGEMENT`, `DIRECTION`, `SYS_ADMIN`) is enforced when **creating** a session — an `EXTERNAL` caller receives `403 FORBIDDEN`. The turn, object-search, and get-session endpoints currently resolve the session **by id only**; the mock does **not** re-check the caller's role or session ownership on those. (A production backend should enforce per-session ownership and role on every endpoint.)

**Execution model** — **synchronous**. Each call runs in-process and returns the full `AssistanceSession`. A run settles to `NEEDS_STAFF_INPUT` (initial pass, or object search still needs input) or `COMPLETED` (after a successful object search). `GET …/sessions/{sessionId}` re-fetches the current session.

> **The type model is broader than the mock.** The shared types also declare values the mock does **not** yet produce: whole-proposal targets (`AssistanceTargetType.PROPOSAL`), `ARCHIVED` sessions, `SYSTEM` turns, `RUNNING` / `FAILED` run status, and multiple runs per session. The mock always creates exactly one `PROPOSAL_MESSAGE`-targeted, `ACTIVE` session with a single run.

---

## The `AssistanceSession` resource

Every endpoint below returns this shape.

```json
{
  "id": "uuid",
  "agent": "PROPOSAL_AGENT",
  "title": "ProposalAgent - VRP-20250115-0001",
  "createdBy": {
    "permissionId": "uuid",
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "group": "COLLECTIONS_MANAGEMENT"
  },
  "target": {
    "type": "PROPOSAL_MESSAGE",
    "proposalId": "uuid",
    "conversationId": "uuid",
    "messageId": "uuid"
  },
  "status": "ACTIVE",
  "selectedMessage": {
    "id": "uuid",
    "sentAt": "2025-06-01T10:30:00",
    "sender": "researcher@university.pt",
    "recipient": "collections@museum.pt",
    "subject": "string",
    "body": "string",
    "attachments": [{ "documentId": "uuid", "fileName": "string" }]
  },
  "proposalSnapshot": { "...": "Proposal detail snapshot (read-only copy)" },
  "accessibleDocuments": [
    { "id": "uuid", "type": "string", "fileName": "string", "submittedAt": "2025-06-01T10:30:00", "submittedBy": { "...": "principal" } }
  ],
  "turns": [
    {
      "id": "uuid",
      "role": "AGENT",
      "content": "I've reviewed the requester's message and pulled in 2 attachments. Where would you like to start?",
      "result": null,
      "createdAt": "2025-06-01T10:31:00"
    }
  ],
  "proposalAgentRuns": [
    {
      "id": "uuid",
      "status": "NEEDS_STAFF_INPUT",
      "capabilities": ["EMAIL_TRIAGE", "DOCUMENT_SEARCH", "OBJECT_SEARCH"],
      "triage": {
        "probableUseType": "IN_SITU_VISIT",
        "confidence": "HIGH",
        "rationale": "string",
        "evidence": ["Matched \"research\".", "Matched \"specimen\"."]
      },
      "documentSearch": {
        "query": "IN_SITU_VISIT proposal assistance documents",
        "basedOnUseType": "IN_SITU_VISIT",
        "matches": [
          {
            "documentId": "uuid",
            "fileName": "research-outline.pdf",
            "type": "REQUESTER_ATTACHMENT",
            "source": "PROPOSAL_ATTACHMENT",
            "reason": "Attached to the selected requester message."
          },
          {
            "documentId": "uuid",
            "fileName": "in-situ-access-guidelines.pdf",
            "type": "ASSISTANCE_GUIDE",
            "source": "ASSISTANCE_CATALOG",
            "reason": "In-situ visits usually need access guidance."
          }
        ],
        "summary": "Found 2 documents relevant to in situ visit."
      },
      "objectSearch": {
        "status": "NEEDS_MORE_INFORMATION",
        "query": null,
        "matches": [],
        "missingInformation": ["inventory number", "object name", "collection area", "short object description"],
        "summary": "Object search needs more information."
      },
      "createdAt": "2025-06-01T10:31:00",
      "completedAt": null
    }
  ],
  "createdAt": "2025-06-01T10:31:00",
  "archivedAt": null
}
```

**Notes on the shape**

- `proposalAgentRuns[*]` carries the agent's computed findings (`triage`, `documentSearch`, `objectSearch`); any may be `null` until that capability has run. The latest run is `proposalAgentRuns[-1]`.
- A `turn` with `role: "AGENT"` may carry an optional `result` — the structured finding revealed *with that answer*:
  ```json
  { "kind": "TRIAGE", "triage": { "..." : "EmailTriageResult" } }
  ```
  `kind` is one of `TRIAGE | DOCUMENT_SEARCH | OBJECT_SEARCH`; exactly the matching field (`triage` / `documentSearch` / `objectSearch`) is populated. The agent decides whether to attach a result. The **opening greeting turn carries `result: null`** by design — conclusions are surfaced only when the staff asks for them.
- `result` is absent/`null` on `STAFF` turns.

---

### `POST /ai-staff-assistance/proposal-agent`

**Description** — Start (or resume) a ProposalAgent session for one requester message. The backend snapshots the proposal, resolves the selected message and its accessible documents, runs the agent's initial pass (email triage + document search; object search is left `NEEDS_MORE_INFORMATION`), seeds the opening greeting turn, and returns the session.

**Idempotent** per `(proposalId, messageId, caller)`: if the caller already has a session for that message, it is returned instead of creating a duplicate.

**Request body**
```json
{
  "proposalId": "uuid",
  "messageId": "uuid"
}
```

**Response `201 Created`** (new) / `200 OK` (existing) — an `AssistanceSession`. The initial `proposalAgentRuns[-1].status` is `NEEDS_STAFF_INPUT`.

**Response `403 Forbidden`** — caller is `EXTERNAL` (non-staff).
```json
{ "error": "FORBIDDEN", "message": "AI staff assistance is available to staff only" }
```

**Response `404 Not Found`** — unknown proposal (`NOT_FOUND`), or the message does not belong to the proposal's conversation (`MESSAGE_NOT_FOUND`).
```json
{ "error": "MESSAGE_NOT_FOUND", "message": "No message found with id uuid" }
```

---

### `GET /ai-staff-assistance/sessions/{sessionId}`

**Description** — Fetch the current state of a session by id (refresh). Returns the same `AssistanceSession` shape.

**Path parameters**
```
sessionId : UUID (required)
```

**Response `200 OK`** — the `AssistanceSession`.

**Response `404 Not Found`** — unknown session.
```json
{ "error": "NOT_FOUND", "message": "No assistance_session found with id uuid" }
```

---

### `POST /ai-staff-assistance/sessions/{sessionId}/turns`

**Description** — Add a staff chat message and get the agent's reply. The backend appends a `STAFF` turn, runs the agent over the message in the session's context, and appends an `AGENT` turn — which **may include a `result`** when the message routes to a capability (e.g. "do the triage" → an agent turn with `result.kind = "TRIAGE"`). Unmatched messages get a conversational reply with no `result`.

**Path parameters**
```
sessionId : UUID (required)
```

**Request body**
```json
{ "content": "Could you do the email triage?" }
```

**Response `200 OK`** — the updated `AssistanceSession` (with the new `STAFF` + `AGENT` turns appended). If `content` is blank the call is a **no-op** and returns the session unchanged.

**Response `404 Not Found`** — unknown session (`NOT_FOUND`).

---

### `POST /ai-staff-assistance/sessions/{sessionId}/object-searches`

**Description** — Run a collection object search for the session. The backend searches the object index for `query`, updates the latest run's `objectSearch` (`SEARCHED` with matches, or `NO_MATCHES`) and its `status` (`COMPLETED`, or `NEEDS_STAFF_INPUT` if more information is still required), and appends a `STAFF` turn (echoing the query) plus an `AGENT` turn carrying `result.kind = "OBJECT_SEARCH"`.

**Path parameters**
```
sessionId : UUID (required)
```

**Request body**
```json
{ "query": "early laboratory instruments" }
```

**Response `200 OK`** — the updated `AssistanceSession`. After a non-blank query, `proposalAgentRuns[-1].objectSearch.status` is `SEARCHED` (matches found) or `NO_MATCHES`, and the run status becomes `COMPLETED`. A **blank query** leaves `objectSearch.status` at `NEEDS_MORE_INFORMATION` (run stays `NEEDS_STAFF_INPUT`).

**Response `404 Not Found`** — unknown session (`NOT_FOUND`).

**Response `409 Conflict`** — the session has no agent run to attach the search to.
```json
{ "error": "NO_AGENT_RUN", "message": "Session has no proposal agent run" }
```
