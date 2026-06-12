# Project phase — staff actions

---

### `GET /collection-use-projects`

**Description** — List all projects across all researchers. Staff see every project regardless of ownership; for staff callers the `requestedBy` detail is populated from `CollectionUseProject.requestedBy` on each item.

**Query parameters**
```
status   : UseStatus  (optional) CREATED | IN_PROGRESS | COMPLETED | CANCELLED
type     : UseType    (optional) EXHIBITION | RESEARCH | OTHER
dateFrom : LocalDate  (optional) reserved — accepted but not yet applied
dateTo   : LocalDate  (optional) reserved — accepted but not yet applied
search   : String     (optional) reserved — accepted but not yet applied
page     : Integer     (default 0)
size     : Integer     (default 20)
```

> `requestedBy`, `assignedTo`, `referenceNumber`, and `proposalApproved` filters from the original design are **not implemented**.

**Response `200 OK`**
```json
{
  "content": [
    {
      "id": "uuid",
      "referenceNumber": "CUP-1A2B3C4D",
      "title": "string",
      "purpose": "string",
      "note": null,
      "type": "RESEARCH",
      "status": "IN_PROGRESS",
      "result": null,
      "beginDate": "2025-06-01",
      "endDate": "2025-06-30",
      "proposal": {
        "id": "uuid",
        "referenceNumber": "VRP-20250115-0001",
        "title": "string",
        "status": "APPROVED",
        "beginDate": "2025-06-01",
        "endDate": "2025-06-30",
        "submittedAt": "2025-01-15T10:30:00",
        "assignedTo": {
          "permissionId": "uuid",
          "user": {
            "id": "uuid",
            "name": "string",
            "email": "string"
          },
          "group": "CURATORIAL"
        }
      },
      "requestedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 87,
  "totalPages": 5
}
```

---

### `GET /collection-use-projects/{projectId}`

**Description** — Get full detail of any project. Staff have access to all projects regardless of ownership; the response populates the `requestedBy` detail from `CollectionUseProject.requestedBy` (it is `null` for non-staff callers).

**Path parameters**
```
projectId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "CUP-1A2B3C4D",
  "title": "string",
  "purpose": "string",
  "note": null,
  "type": "RESEARCH",
  "status": "IN_PROGRESS",
  "result": null,
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "authorisedBy": null,
  "authorisedAt": null,
  "proposal": {
    "id": "uuid",
    "referenceNumber": "VRP-20250115-0001",
    "title": "string",
    "status": "APPROVED",
    "beginDate": "2025-06-01",
    "endDate": "2025-06-30",
    "submittedAt": "2025-01-15T10:30:00",
    "assignedTo": {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "CURATORIAL"
    }
  },
  "requestedBy": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "EXTERNAL"
  }
}
```

> `requestedBy` is a required `PermissionId` on `CollectionUseProject`; the API hydrates it as a permission detail for staff callers and returns `null` for non-staff. `authorisedBy` / `authorisedAt` are nullable fields on the response that are **not currently populated by any flow** — they remain `null` (the approval flow that previously set them was removed). The detail view does not embed an `entries` summary; use the `log-entries` / `occurrence-entries` list endpoints.

**Response `404 Not Found`**
```json
{
  "error": "PROJECT_NOT_FOUND",
  "message": "No project found with id uuid"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries` · `.../occurrence-entries`

**Description** — Staff add **object log entries** (to the project's object access log) and **occurrence entries**. Unlike non-staff callers (restricted to `IN_PROGRESS`), staff may add entries at **any** project status — but log entries are rejected with `409` once the access log is concluded. The caller's `permissionId` is recorded as `addedBy`. Request/response shapes are defined in the researcher group (file 04).

**Request body** — `log-entries`
```json
{
  "inventoryNumber": "INV-001",
  "numberOfObjects": 2,
  "observations": "string"
}
```

**Request body** — `occurrence-entries`
```json
{
  "content": "string",
  "objects": ["INV-001"]
}
```

**Response `201 Created`** — the `ObjectLogEntry` (`id`, `objectReference`, `numberOfObjects`, `addedAt`, `addedBy`, `observations`, `attachments`) or the `JournalEntry` (`id`, `content`, `addedAt`, `addedBy`, `objects`, `attachments`) respectively.

---

### `GET /collection-use-projects/{projectId}/log-entries` · `.../occurrence-entries`

**Description** — List a project's object log entries / occurrence entries ordered chronologically, including entries from both the researcher and staff. Both accept the `addedBy` filter and `page`/`size`, and return the paginated envelopes defined in file 04 (the `log-entries` envelope includes the `accessLog` header).

**Query parameters**
```
addedBy : UUID     (optional) filter by permissionId
page    : Integer  (default 0)
size    : Integer  (default 20)
```

---

### `GET /collection-use-projects/{projectId}/object-access-log`

**Description** — Get the project's object access log header (`referenceNumber`, `dateConclusion`, `curator`), as defined in file 04. `404` while the project has no entries yet.

---

### `POST /collection-use-projects/{projectId}/object-access-log/conclusion`

**Description** — Curator concludes the project's object access log, recording the caller as `curator` and setting `dateConclusion`. Restricted to `CURATORIAL` and `COLLECTIONS_MANAGEMENT` members (`403` otherwise). A concluded log accepts no further entries or attachments.

**Path parameters**
```
projectId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "OAL-1A2B3C4D",
  "projectId": "uuid",
  "dateConclusion": "2025-06-04T16:00:00",
  "curator": {
    "permissionId": "uuid",
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "group": "CURATORIAL"
  }
}
```

**Response `404 Not Found`**
```json
{
  "error": "OBJECT_ACCESS_LOG_NOT_FOUND",
  "message": "No object_access_log found with id uuid"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Object access log is already concluded"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments` · `.../occurrence-entries/{entryId}/attachments`

**Description** — Staff upload a file to an existing log / occurrence entry at any project status (log entries: only while the access log is not concluded). `mediaType` is one of `DOCUMENT`, `IMAGE`, `VIDEO`, `OTHER`.

**Request body** — `multipart/form-data`
```
file      : File      (required)
mediaType : MediaType (required) DOCUMENT | IMAGE | VIDEO | OTHER
```

**Response `201 Created`**
```json
{
  "fileReference": "string",
  "fileName": "conservation_note.pdf",
  "mediaType": "DOCUMENT",
  "uploadedAt": "2025-06-04T10:15:00"
}
```

**Response `404 Not Found`**
```json
{
  "error": "ENTRY_NOT_FOUND",
  "message": "No entry found with id uuid"
}
```

**Response `422 Unprocessable Entity`**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "'NOT_A_MEDIA_TYPE' is not a valid MediaType"
}
```

---

### `GET /collection-use-projects/{projectId}/events`

**Description** — Get the immutable audit trail of the project lifecycle ordered chronologically. Staff see the complete event history including transitions triggered by the researcher, and can filter by `type`.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
type : UseEventType (optional) filter by event type
page : Integer      (default 0)
size : Integer      (default 20)
```

`UseEventType` values: `REQUESTED` · `STARTED` · `COMPLETED` · `CANCELLED`

**Response `200 OK`**
```json
{
  "projectId": "uuid",
  "content": [
    {
      "occurredAt": "2025-01-21T15:00:00",
      "type": "REQUESTED",
      "triggeredBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "CURATORIAL"
      },
      "note": null
    },
    {
      "occurredAt": "2025-06-01T09:00:00",
      "type": "STARTED",
      "triggeredBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
      "note": null
    },
    {
      "occurredAt": "2025-06-30T17:00:00",
      "type": "COMPLETED",
      "triggeredBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
      "note": "string"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3,
  "totalPages": 1
}
```

---

A few conventions worth noting across this group:

**Staff entry constraint differs from researcher** — the researcher may only add entries while `IN_PROGRESS`; staff may add entries at any project status. This reflects the domain rule that the institution retains the right to annotate the record throughout its lifetime — before, during, and after the visit.

**No staff-only project commands** — `start`, `complete`, and `cancel` (file 04) are the only state-changing project commands and carry no group restriction; any authorised caller may invoke them. The earlier `suspend`, `resume`, and `close` commands have been removed, along with the `SUSPENDED` and `CLOSED` states.

**Two distinct journal resources** — `log-entries` belong to the project's **object access log** (`ObjectAccessLog` aggregate, one per project, `OAL-` reference number, concluded by a curator): each entry records exactly one `objectReference` with a `numberOfObjects` and optional `observations`. `occurrence-entries` remain a separate aggregate referencing the project, with narrative `content` and an optional `objects` list resolved to `ObjectReference` snapshots. Both gain the staff `addedBy` filter on their `GET` endpoints and return `addedBy` as a full `PermissionDetail`.

**Shared endpoints are not repeated** — `GET /collection-use-projects/{projectId}` and `GET /collection-use-projects/{projectId}/events` follow the same response structure as the researcher group. The only difference is access scope (staff see all, plus a populated `requestedBy`).
