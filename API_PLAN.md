# API Alignment Plan — Backend → Frontend Contract

**Goal:** change the backend so the payloads of every endpoint **implemented on both sides**
match what the Angular frontend already expects. The frontend TypeScript interfaces are the
**source of truth** (consistent with `domain-model-minimum-revised.puml` and the prior
domain-refactor decision).

**Scope:** the 36 matched endpoints from `API_DIFF.md`. Backend-only endpoints
(`suspend`, `resume`, `close`, `start-review`, `requested-objects`, `refer-to-direction`,
`direction-clarification`, `POST /users`, webhooks, health) are **out of scope** except where
their enum values leak into matched-endpoint responses.

**This is a frontend repo** — the backend is not here. This document is a work-order /
contract spec to hand to the backend, plus the exact frontend file each target shape lives in.

---

## How to read priorities

| Tag | Meaning |
| --- | --- |
| 🔴 **P0** | Frontend misparses or sends a rejected body today — must fix |
| 🟠 **P1** | Frontend type lies (nullability) or loses data — should fix |
| 🟢 **P2** | Harmless extra backend output — optional cleanup, no functional impact |
| ❓ **Decision** | Strict backend→frontend conflicts with real backend behavior; needs a product call |

---

## Phase 0 — Decisions required before coding

These four enums are where the frontend knows *fewer* members than the backend emits, but the
extra members are produced by flows that **are** implemented on both sides. Narrowing the backend
would delete real behavior, so each needs an explicit call.

### D1 — `ProposalStatus`: `PENDING_DOCUMENTS`, `PENDING_DIRECTION`
- Backend emits these after `POST .../request-documents` and `refer-to-direction`.
- `request-documents` is implemented on both sides → frontend **will** receive `PENDING_DOCUMENTS` and break.
- **Options:** (a) backend collapses both → `UNDER_REVIEW` on matched-endpoint responses; (b) **add both to the frontend enum** (recommended — they carry real workflow meaning the UI should show).
- **Recommendation:** (b). Cheaper and lossless. If chosen, this item moves out of the backend plan.

### D2 — `ProposalEventType`: `ASSIGNED`, `DIRECTION_CLARIFIED`
- `ASSIGNED` is emitted by `POST .../assign` (implemented both sides) → frontend event list breaks after any assignment.
- **Recommendation:** **add both to the frontend enum** rather than suppress backend events.

### D3 — `UseStatus`: `REQUESTED`, `ACCEPTED`, `REFUSED`, `SUSPENDED`, `CLOSED`
- Frontend models only `CREATED, IN_PROGRESS, COMPLETED, CANCELLED`.
- `SUSPENDED`/`CLOSED` belong to the out-of-scope suspend/resume/close endpoints; `REQUESTED/ACCEPTED/REFUSED` are a legacy pre-start vocabulary.
- **Recommendation:** backend maps the legacy pre-start trio → `CREATED` (see C1). Defer `SUSPENDED`/`CLOSED` until those endpoints get a UI.

### D4 — `UseEventType`: legacy members
- Backend `REQUESTED/ACCEPTED/REFUSED/SUSPENDED/RESUMED/CLOSED` have no frontend equivalent.
- **Recommendation:** rename the three lifecycle events the UI uses (see C2) and stop emitting the legacy ones on matched endpoints.

> If D1 and D2 are resolved by editing the frontend enums (recommended), items C3 and C4 below
> are **frontend** one-liners instead of backend work. They are kept in this doc for traceability.

---

## Phase 1 — 🔴 P0 enum alignment

### C1 — `UseStatus` (schema `UseStatus`)
- **Target (frontend `collection-use-status.model.ts`):** `CREATED | IN_PROGRESS | COMPLETED | CANCELLED`
- **Backend action:** map emitted values on all project responses:
  | Backend now | Emit as |
  | --- | --- |
  | `REQUESTED` / `ACCEPTED` / `REFUSED` | `CREATED` |
  | `IN_PROGRESS` | `IN_PROGRESS` |
  | `COMPLETED` | `COMPLETED` |
  | `CANCELLED` | `CANCELLED` |
  | `SUSPENDED` / `CLOSED` | *(out of scope — see D3)* |
- **Endpoints:** `GET /collection-use-projects`, `GET .../{id}`, all project command responses, `ProposalDetailProjectSummary.status`, `DualAggregateResponse.collectionUseProject.status`.

### C2 — `UseEventType` (schema `UseEventType`)
- **Target:** `PENDING | PROJECT_STARTED | PROJECT_COMPLETED | PROJECT_CANCELLED | LOGGED_UPDATE | LOGGED_INCIDENT`
- **Backend action / rename map:**
  | Backend now | Emit as |
  | --- | --- |
  | `STARTED` | `PROJECT_STARTED` |
  | `COMPLETED` | `PROJECT_COMPLETED` |
  | `CANCELLED` | `PROJECT_CANCELLED` |
  | *(initial/created)* | `PENDING` |
  | *(log-entry added)* | `LOGGED_UPDATE` |
  | *(occurrence-entry added)* | `LOGGED_INCIDENT` |
  | `SUSPENDED` / `RESUMED` / `CLOSED` / `REQUESTED` / `ACCEPTED` / `REFUSED` | *(do not emit on matched endpoints — D4)* |
- **Endpoints:** `GET .../{id}/events`, every `lastEvent.type` in project command responses.
- **Note:** `LOGGED_UPDATE`/`LOGGED_INCIDENT` imply the backend emits a use-event when a log/occurrence entry is created — confirm that event is produced.

### C3 — `ProposalStatus` *(only if D1 = option a; otherwise frontend-side)*
- **Target:** `SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | CANCELLED`
- **Backend action:** collapse `PENDING_DOCUMENTS` and `PENDING_DIRECTION` → `UNDER_REVIEW` on matched responses.
- **Endpoints:** `GET /proposals`, `GET /proposals/{id}`, `ProposalCommandResponse.status`, `SubmitProposalResponse.proposal.status`.

### C4 — `ProposalEventType` *(only if D2 = option a; otherwise frontend-side)*
- **Target:** `SUBMITTED | REVIEW_STARTED | FORWARDED | DOCUMENTS_REQUESTED | DOCUMENTS_SUBMITTED | REFERRED_TO_DIRECTION | APPROVED | REJECTED | CANCELLED`
- **Backend action:** suppress/map `ASSIGNED` and `DIRECTION_CLARIFIED` on matched responses.
- **Endpoints:** `GET /proposals/{id}/events`, `lastEvent.type` in proposal command responses.

---

## Phase 2 — 🔴 P0 field renames & shape changes

### C5 — Project `note` → `requestNote`
- **Schemas:** `ProjectDetailResponse`, `ProjectListItemResponse`, `CollectionUseProjectSummary`, `SubmitProposalResponse.collectionUseProject`.
- **Backend action:** rename JSON key `note` → `requestNote` (keep nullable).
- **Frontend target:** `CollectionUseProjectSummary.requestNote?: string | null`.

### C6 — `Document.submittedBy` (object) → `submittedByPermissionId` (string)
- **Schema:** `DocumentResponse`.
- **Backend action:** replace the embedded `submittedBy: PermissionDetail` object with a flat `submittedByPermissionId: string` (the permission id).
- **Endpoints:** `POST .../documents`, `GET .../documents`, `ProposalDetail.documents`.
- **Frontend target:** `Document.submittedByPermissionId: string`.

### C7 — `JournalEntryResponse.addedBy` (object) → string
- **Backend action:** emit `addedBy` as the permission-id string, not a `PermissionDetail` object.
- **Endpoints:** `POST/GET .../log-entries`, `POST/GET .../occurrence-entries`.
- **Frontend target:** `ObjectLogEntry.addedBy: string` / `ObjectOccurrenceEntry.addedBy: string`.
- **Also:** frontend models carry `collectionUseProjectId` on each entry — add it to `JournalEntryResponse` (string) so the field is populated (P1; currently `undefined` client-side).

### C8 — `ProjectDetailResponse.authorisedBy` (object) → string
- **Backend action:** emit `authorisedBy` as a permission-id string (nullable), not an object.
- **Frontend target:** `CollectionUseProjectSummary.authorisedBy?: string`.

### C9 — permissions list element: `group` string → `Group` object
- **Schemas:** `UserDetailResponse.permissions[]`, `UserPermissionsResponse.permissions[]` (currently `PermissionDetail`).
- **Backend action:** for these two endpoints, emit each permission as the frontend `PermissionSummary` shape: `{ permissionId: string, group: { id: string, name: GroupName } }`. (The `user` field can be dropped here — frontend doesn't read it.)
- **Frontend target:** `PermissionSummary { permissionId; group: Group }` in `permission.model.ts`.
- **Endpoints:** `GET /users/{id}`, `GET /users/{id}/permissions`.

---

## Phase 3 — 🔴 P0 request-body alignment

### C10 — `POST .../request-documents` accept frontend's body
- **Frontend sends (`ProposalNoteRequest`):** `{ note: string }` only.
- **Backend now requires:** `requiredDocuments: [RequestedDocumentInput]` (→ 422 today).
- **Backend action:** make `requiredDocuments` **optional** in `RequestDocumentsRequest` so a body of `{ note }` is accepted.
- **Response:** frontend types it `void` and ignores the body — backend may keep returning `ProposalCommandResponse` (harmless).
- ❓ If product wants required documents to be mandatory, the *frontend* must add the field instead — flag back.

---

## Phase 4 — 🟠 P1 nullability / lost-data

The frontend types these as non-null but the backend declares them nullable; if the backend ever
returns `null`, the frontend type is a lie. Align by guaranteeing non-null **on matched endpoints**
(or, cheaper, relax the frontend types — note per item).

| ID | Field | Backend now | Frontend expects | Action |
| --- | --- | --- | --- | --- |
| C11 | `ProposalDetailResponse.conversationId` | `string \| null` | `string` | guarantee non-null, or relax FE to `string \| null` |
| C12 | `ProposalCommandResponse.assignedTo` (assign/forward) | `\| null` optional | `PermissionPrincipal` required | guarantee present on assign/forward, or relax FE |
| C13 | `ProposalCommandResponse.lastEvent` | optional/null | required | guarantee present on command responses |
| C14 | `ProjectCommandResponse.lastEvent` | optional/null | required | guarantee present on start/complete/cancel |
| C15 | `GroupMemberResponse` | no per-member `group` | `GroupMembership.group: Group` | add `group: Group` per member (redundant with page-level `group`) — or drop from FE |

> For C11–C14 the **recommended** fix is to relax the frontend types to match the backend's
> nullable contract (one-line edits), since the backend nullability is intentional. They are listed
> here as backend items only to keep the contract symmetric — pick one side per row.

---

## Phase 5 — 🟢 P2 optional cleanup (no functional impact)

Extra backend output the frontend simply ignores. No action needed for correctness; listed for
contract tidiness only.

- `result: UseResult | null` on `ProjectDetailResponse` / `ProjectListItemResponse` / `ProjectCommandResponse` — frontend has no `result` field. Leave, or drop server-side. *(Do not remove if the project lifecycle actually needs it — then add `result`/`UseResult` to the frontend instead.)*
- `requestedDocuments` on `ProposalDetailResponse` — frontend `ProposalDetail` omits it. Leave; consider surfacing in UI later.
- `initialMessage*` / `requestedObjects` optional inputs on `SubmitProposalRequest` — frontend doesn't send them; already optional. Leave.

---

## Endpoint × change matrix

| Endpoint | Changes |
| --- | --- |
| `GET /collection-use-projects` | C1, C5, C11(status fields) |
| `GET /collection-use-projects/{id}` | C1, C5, C8 |
| `POST .../start` `\|` `/complete` `\|` `/cancel` | C1, C2, C14 |
| `POST/GET .../log-entries` | C2(event), C7 |
| `POST/GET .../occurrence-entries` | C2(event), C7 |
| `GET .../{id}/events` (project) | C2 |
| `POST /proposals` | C3, C5(project block) |
| `GET /proposals` `\|` `GET /proposals/{id}` | C3, C6, C5 |
| `POST/GET .../documents` | C6 |
| `POST .../request-documents` | C10, C3 |
| `GET .../{id}/events` (proposal) | C3, C4 |
| `POST .../assign` `\|` `/forward` | C3, C4, C12, C13 |
| `POST .../approve` `\|` `/reject` `\|` `/cancel` | C1, C3, C4, C13 |
| `GET /proposals/{id}/conversation` | C11 |
| `GET /users/{id}` `\|` `/users/{id}/permissions` | C9 |
| `GET /groups/{id}/users` | C15 |
| `POST /auth/login`, `GET /groups`, `GET /users`, watchers, send-message | ✅ no change (already aligned) |

---

## Suggested execution order

1. **Resolve Phase 0 decisions** (D1–D4) — they determine whether C3/C4 are backend or frontend edits.
2. **Phase 1 enums** (C1, C2 + agreed C3/C4) — highest blast radius; land behind a contract version bump.
3. **Phase 2 renames/shapes** (C5–C9) — mechanical, high value.
4. **Phase 3** (C10) — unblocks request-documents (currently 422).
5. **Phase 4** (C11–C15) — pick frontend-relax vs backend-guarantee per row; mostly one-line FE edits.
6. **Phase 5** — optional, defer.

## Verification

- Regenerate `openapi.json` after backend changes and re-run the `API_DIFF.md` comparison — target is **0 🔴 and 0 🟠**.
- Frontend contract tests: the `*-api.service.spec.ts` and mock services under
  `src/app/features/**/mocks/` and `src/app/core/auth/` should be updated to the new shapes and kept green.
