# Reports — In-Situ Visit Report

A composing endpoint that produces a durable **report** for an in-situ visit
project in a single call. It chains two existing operations — the CIDOC-CRM
**export** (`08InSituVisit-CIDOC-CRM.md`) and the KG-RAG **narrative**
generation (`09KG-RAG-Narrative.md`) — and persists the linkage between the
project, the exported `InSituVisitRecord`, and the generated narrative as an
`InSituVisitReport`.

Narratives are generated in the institutional context of **MUHNAC — Museu
Nacional de História Natural e da Ciência**. This context is server-owned
configuration and is never accepted from, or overridden by, the client.

Lives in its own context (`app/reports/in_situ_visit`). Like the email webhook's
`IngestInboundEmail`, it is a **cross-context orchestrator**: it owns only the
`InSituVisitReport` aggregate and composes the export and narrative use cases
through their published interfaces — it never touches another context's
aggregates directly. The whole chain runs in **one database transaction**, so a
failure in narrative generation leaves no orphaned record.

Same auth as the rest of the API (`Authorization` + `X-Permission-Id`);
**staff-only**. Errors use the shared `{ "error": CODE, "message": str }` shape.

Each call is **append-only**: a fresh `InSituVisitRecord`, a fresh narrative, and
a fresh `InSituVisitReport` are created every time. There is no deduplication on
`project_id` — calling twice yields two independent reports. The two `GET`
endpoints below read that history back (list per project, and fetch one by id).
The report also persists the language, narrative type, and creativity
temperature used for that generation so every historical result is auditable.

---

## POST /api/v1/reports/{project_id}/in_situ_visit

Exports the project, generates a narrative from the resulting record, and
persists an `InSituVisitReport` tying them together. Staff-only.

The `project_id` must reference a project whose `intendedUse.useType` is
`IN_SITU_VISIT` (same precondition as the underlying export).

**Path parameters**

```
project_id : UUID (required) — the CollectionUseProject to report on
```

**Request body** (all optional — forwarded to narrative generation)

```json
{
  "target_language": "pt",
  "narrative_type": "institutional",
  "creativity_temperature": 0.3
}
```

```
target_language        : enum    (default "pt")   — "pt" or "en"
narrative_type         : enum    (default "institutional")
                         — "institutional", "scientific", or "social_media"
creativity_temperature : number  (default 0.3, 0.0–1.0 inclusive)
                         — finite LLM temperature
```

### Execution order

1. **Export** the project → a new `InSituVisitRecord` (`inSituVisitRecordId`).
2. **Generate** a narrative for that record with the body params → a new
   narrative (`narrativeId`).
3. **Build & persist** the `InSituVisitReport`, stamping `createdBy` from the
   caller's permission and `createdAt` with the server time, and preserving the
   three effective generation settings.
4. Commit once; return `201`.

**Response `201 Created`** — linkage and generation metadata. Fetch the record
and narrative through their own `GET` endpoints (docs 08 / 09) when the full
content is needed.

The response includes:

```http
Location: /api/v1/reports/{project_id}/in_situ_visit/{report_id}
```

```json
{
  "id": "a1b2c3d4-...",
  "createdAt": "2026-06-22T10:30:00Z",
  "createdBy": "permission-uuid",
  "projectId": "project-uuid",
  "narrativeId": "narrative-uuid",
  "inSituVisitRecordId": "record-uuid",
  "targetLanguage": "pt",
  "narrativeType": "institutional",
  "creativityTemperature": 0.3
}
```

```
id                  : UUID — the InSituVisitReport id
createdAt           : ISO-8601 timestamp (UTC) — when the report was generated
createdBy           : UUID — the staff caller's PermissionId (X-Permission-Id)
projectId           : UUID — the source CollectionUseProject
narrativeId         : UUID — the generated narrative (see 09)
inSituVisitRecordId : UUID — the exported CIDOC-CRM record (see 08)
targetLanguage      : enum — effective output language: "pt" or "en"
narrativeType       : enum — effective narrative type
creativityTemperature : number — effective finite temperature, 0.0–1.0 inclusive
```

### Errors

Because the endpoint composes the export and narrative steps, it surfaces the
union of their failures. All share the `{ "error": CODE, "message": str }` shape.

| Status | Code                             | When                                            |
| ------ | -------------------------------- | ----------------------------------------------- |
| `401`  | `UNAUTHENTICATED`                | Missing/invalid credentials.                    |
| `403`  | `ACCESS_DENIED`                  | Non-staff caller.                               |
| `404`  | `PROJECT_NOT_FOUND`              | No project with `project_id`.                   |
| `409`  | `INVALID_USE_TYPE`               | The project's `useType` is not `IN_SITU_VISIT`. |
| `400`  | `INVALID_TARGET_LANGUAGE`        | `target_language` is not `pt` or `en`.          |
| `400`  | `INVALID_NARRATIVE_TYPE`         | Unknown `narrative_type`.                       |
| `400`  | `INVALID_CREATIVITY_TEMPERATURE` | Temperature is not finite or outside `0.0–1.0`. |
| `422`  | `SEMANTIC_VALIDATION_FAILED`     | The reasoner/SHACL rejected the graph.          |
| `503`  | `MODEL_UNAVAILABLE`              | The local LLM could not be reached.             |
| `504`  | `MODEL_TIMEOUT`                  | The LLM did not respond in time.                |

The export step (`404` / `409`) runs first; if it fails, no narrative or report
is created.

---

## GET /api/v1/reports/{project_id}/in_situ_visit

Lists the reports generated for a project, **newest first** (`createdAt`
descending), paginated. Staff-only.

**Path parameters**

```
project_id : UUID (required) — the CollectionUseProject whose reports to list
```

**Query parameters**

```
page : integer (optional, default 0,  min 0)
size : integer (optional, default 20, 1..100)
```

**Response `200 OK`**

```json
{
  "content": [
    {
      "id": "a1b2c3d4-...",
      "createdAt": "2026-06-22T10:30:00Z",
      "createdBy": "permission-uuid",
      "projectId": "project-uuid",
      "narrativeId": "narrative-uuid",
      "inSituVisitRecordId": "record-uuid",
      "targetLanguage": "pt",
      "narrativeType": "institutional",
      "creativityTemperature": 0.3
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

An unknown `project_id` returns `404 PROJECT_NOT_FOUND`. A known project with no
reports returns an empty page (`totalElements: 0`). `401 UNAUTHENTICATED` and
`403 ACCESS_DENIED` follow the shared error shape.

---

## GET /api/v1/reports/{project_id}/in_situ_visit/{report_id}

Returns one report by id. Staff-only. The report must belong to the project in
the path — fetching another project's report under this `project_id` is a `404`.

**Path parameters**

```
project_id : UUID (required) — the owning CollectionUseProject
report_id  : UUID (required) — the InSituVisitReport id
```

**Response `200 OK`** — a single `InSituVisitReport` object (same shape as a
`content[]` item above).

**Response `404 REPORT_NOT_FOUND`** — no report with `report_id` under this
`project_id`.

```json
{
  "error": "REPORT_NOT_FOUND",
  "message": "No report found with id a1b2c3d4-... for project project-uuid"
}
```

`401 UNAUTHENTICATED` and `403 ACCESS_DENIED` follow the shared error shape.

---

A few conventions worth noting:

**One transaction, atomic.** The export, narrative, and report are written under
a single commit. If narrative generation fails (`422` / `503` / `504`), the
exported record is rolled back too — no partial artifacts are persisted.
Integration tests must exercise rollback after failures at each orchestration
step. Database and request timeouts must be configured above the narrative model
timeout while still bounding the maximum transaction duration.

**Synchronous and slow.** Step 2 runs a local LLM (Ollama, `llama3.1:8b`)
synchronously, so this endpoint inherits its latency and the `503` / `504`
failure modes. Clients should set a generous timeout. Runtime requirements match
`09KG-RAG-Narrative.md` (`OLLAMA_BASE_URL`, `NARRATIVE_MODEL`,
`NARRATIVE_TIMEOUT_SECONDS`).

**Append-only, no dedup.** Unlike the email webhook (which is idempotent on
`message_id`), this endpoint creates fresh artifacts on every call. Re-running it
for the same project is intentional — e.g. to produce a narrative in a different
style or language — and yields a distinct `InSituVisitReport`.
