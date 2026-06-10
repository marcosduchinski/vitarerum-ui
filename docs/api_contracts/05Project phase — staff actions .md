# Project phase — staff actions

---

### `GET /collection-use-projects`

**Description** — List all projects across all researchers. Staff see every project regardless of ownership; for staff callers the `requestedBy` detail is populated on each item.

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

**Description** — Get full detail of any project. Staff have access to all projects regardless of ownership; the response populates the `requestedBy` detail (it is `null` for non-staff callers).

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

> `requestedBy` is populated for staff callers (`null` for non-staff). `authorisedBy` / `authorisedAt` are nullable fields on the response that are **not currently populated by any flow** — they remain `null` (the approval flow that previously set them was removed). The detail view does not embed an `entries` summary; use the `log-entries` / `occurrence-entries` list endpoints.

**Response `404 Not Found`**
```json
{
  "error": "PROJECT_NOT_FOUND",
  "message": "No project found with id uuid"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries` · `.../occurrence-entries`

**Description** — Staff add object **log entries** and **occurrence entries**. Unlike non-staff callers (restricted to `IN_PROGRESS`), staff may add entries at **any** project status. The caller's `permissionId` is recorded as `addedBy`; the optional `objects` list is resolved to `ObjectReference` snapshots. Both resources share the request/response shape defined in the researcher group (file 04).

**Request body**
```json
{
  "content": "string",
  "objects": ["INV-001"]
}
```

**Response `201 Created`** — the `JournalEntry` (`id`, `content`, `addedAt`, `addedBy`, `objects`, `attachments`).

---

### `GET /collection-use-projects/{projectId}/log-entries` · `.../occurrence-entries`

**Description** — List a project's log entries / occurrence entries ordered chronologically, including entries from both the researcher and staff. Both accept the `addedBy` filter and `page`/`size`, and return the paginated `JournalEntry` envelope defined in file 04.

**Query parameters**
```
addedBy : UUID     (optional) filter by permissionId
page    : Integer  (default 0)
size    : Integer  (default 20)
```

---

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments` · `.../occurrence-entries/{entryId}/attachments`

**Description** — Staff upload a file to an existing log / occurrence entry at any project status. `mediaType` is one of `DOCUMENT`, `IMAGE`, `VIDEO`, `OTHER`.

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

**Two distinct journal resources** — `log-entries` capture activity notes; `occurrence-entries` capture structured object-occurrence records. Both are separate aggregates referencing the project, carry an optional `objects` list resolved to `ObjectReference` snapshots, gain the staff `addedBy` filter on their `GET` endpoints, and return `addedBy` as a full `PermissionDetail`.

**Shared endpoints are not repeated** — `GET /collection-use-projects/{projectId}` and `GET /collection-use-projects/{projectId}/events` follow the same response structure as the researcher group. The only difference is access scope (staff see all, plus a populated `requestedBy`).
