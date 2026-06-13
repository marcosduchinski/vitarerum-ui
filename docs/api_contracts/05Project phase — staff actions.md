# Project phase — staff actions

---

### `GET /collection-use-projects`

**Description** — List all projects across all researchers. Staff see every project regardless of ownership; for staff callers the `requestedBy` detail is populated from `CollectionUseProject.requestedBy` on each item.

**Query parameters**
```
status      : UseStatus    (optional) CREATED | IN_PROGRESS | COMPLETED | CANCELLED
type        : UseType      (optional) EXHIBITION | RESEARCH | OTHER — filters intendedUse.useType
requestedBy : PermissionId (optional) scope to projects requested by this permission
dateFrom    : LocalDate    (optional) reserved — accepted but not yet applied
dateTo      : LocalDate    (optional) reserved — accepted but not yet applied
search      : String       (optional) reserved — accepted but not yet applied
page        : Integer       (default 0)
size        : Integer       (default 20)
```

> `requestedBy` is honored only for staff callers — e.g. pass the caller's own `permissionId` for a staff "my projects" view. For non-staff callers it is ignored and the list is always scoped to their own id. The `assignedTo`, `referenceNumber`, and `proposalApproved` filters from the original design are **not implemented**.

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
      "intendedUse": {
        "useType": "RESEARCH",
        "description": "string"
      },
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
  "intendedUse": {
    "useType": "RESEARCH",
    "description": "string"
  },
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

**Description** — Staff add **object log entries** (to the project's object access log) and **object occurrence entries** (to the project's object occurrence log). Unlike non-staff callers (restricted to `IN_PROGRESS`), staff may add entries at **any** project status — but entries are rejected with `409` once the respective log is concluded. The caller's `permissionId` is recorded as `addedBy` / `reportedBy`. Request/response shapes are defined in the researcher group (file 04).

**Request body** — `log-entries`
```json
{
  "inventoryNumber": "INV-001",
  "numberOfObjects": 2,
  "observations": "string",
  "requestedObjectId": "uuid"
}
```

**Request body** — `occurrence-entries`
```json
{
  "inventoryNumber": "INV-001",
  "numberOfObjects": 1,
  "occurrenceDate": "2025-06-03T11:30:00",
  "location": "Conservation lab, room 2",
  "detailedDescription": "string",
  "testimonial": "string",
  "requestedObjectId": "uuid"
}
```

Both bodies accept an optional `requestedObjectId` linking the entry to a `RequestedObject` of this project's proposal (inventory number must match, else `422`).

**Response `201 Created`** — the `ObjectLogEntry` (`id`, `objectReference`, `numberOfObjects`, `addedAt`, `addedBy`, `observations`, `requestedObjectId`, `attachments`) or the `ObjectOccurrenceEntry` (`id`, `objectReference`, `numberOfObjects`, `occurrenceDate`, `location`, `reportedBy`, `detailedDescription`, `testimonial`, `requestedObjectId`, `attachments`) respectively.

---

### `PATCH /collection-use-projects/{projectId}/log-entries/{entryId}`

**Description** — Edit an existing object log entry. Only `addedAt`, `numberOfObjects` and `observations` are editable; the entry's object, `addedBy` and `requestedObjectId` are immutable. Partial update — only fields present in the body change (`observations: null` clears it). Staff may edit at any project status, but not once the access log is concluded (`409`). Request/response shapes are defined in the researcher group (file 04).

**Path parameters**
```
projectId : UUID (required)
entryId   : UUID (required)
```

**Request body** (all fields optional)
```json
{
  "addedAt": "2025-06-03T14:00:00",
  "numberOfObjects": 3,
  "observations": "string"
}
```

**Response `200 OK`** — the updated `ObjectLogEntry` (shape as in file 04).

---

### `PATCH /collection-use-projects/{projectId}/occurrence-entries/{entryId}`

**Description** — Edit an existing object occurrence entry. Only `numberOfObjects`, `occurrenceDate`, `location`, `detailedDescription` and `testimonial` are editable; the entry's object, `reportedBy` and `requestedObjectId` are immutable. Partial update — only fields present in the body change (`testimonial: null` clears it). Staff may edit at any project status, but not once the occurrence log is concluded (`409`). Request/response shapes are defined in the researcher group (file 04).

**Path parameters**
```
projectId : UUID (required)
entryId   : UUID (required)
```

**Request body** (all fields optional)
```json
{
  "numberOfObjects": 2,
  "occurrenceDate": "2025-06-03T11:30:00",
  "location": "Conservation lab, room 2",
  "detailedDescription": "string",
  "testimonial": "string"
}
```

**Response `200 OK`** — the updated `ObjectOccurrenceEntry` (shape as in file 04).

---

### `GET /collection-use-projects/{projectId}/log-entries` · `.../occurrence-entries`

**Description** — List a project's object log entries / occurrence entries ordered chronologically, including entries from both the researcher and staff. Both accept `page`/`size` and a permission filter (`addedBy` on log entries, `reportedBy` on occurrence entries), and return the paginated envelopes defined in file 04 (with the `accessLog` / `occurrenceLog` header respectively).

**Query parameters**
```
addedBy / reportedBy : UUID     (optional) filter by permissionId
page                 : Integer  (default 0)
size                 : Integer  (default 20)
```

---

### `GET /collection-use-projects/{projectId}/object-access-log` · `.../object-occurrence-log`

**Description** — Get the project's object access log / object occurrence log header (`referenceNumber`, `dateConclusion`, `curator`), as defined in file 04. `404` while the project has no entries yet.

---

### `POST /collection-use-projects/{projectId}/object-access-log/conclusion` · `.../object-occurrence-log/conclusion`

**Description** — Curator concludes the project's object access log / object occurrence log, recording the caller as `curator` and setting `dateConclusion`. Restricted to `CURATORIAL` and `COLLECTIONS_MANAGEMENT` members (`403` otherwise). A concluded log accepts no further entries or attachments.

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

The occurrence-log variant returns an `OOL-` reference number.

**Response `404 Not Found`**
```json
{
  "error": "OBJECT_ACCESS_LOG_NOT_FOUND",
  "message": "No object_access_log found with id uuid"
}
```

(`OBJECT_OCCURRENCE_LOG_NOT_FOUND` for the occurrence-log variant.)

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Object access log is already concluded"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments` · `.../occurrence-entries/{entryId}/attachments`

**Description** — Staff upload a file to an existing log / occurrence entry at any project status, while the respective log is not concluded (`409` afterwards). `mediaType` is one of `DOCUMENT`, `IMAGE`, `VIDEO`, `OTHER`. `note` is an optional free-text description of the attachment.

**Request body** — `multipart/form-data`
```
file      : File      (required)
mediaType : MediaType (required) DOCUMENT | IMAGE | VIDEO | OTHER
note      : String    (optional)
```

**Response `201 Created`**
```json
{
  "fileReference": "string",
  "fileName": "conservation_note.pdf",
  "mediaType": "DOCUMENT",
  "uploadedAt": "2025-06-04T10:15:00",
  "note": "string"
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

### `GET /collection-use-projects/{projectId}/log-entries/{entryId}/attachments/{fileReference}` · `.../occurrence-entries/{entryId}/attachments/{fileReference}`

**Description** — Download the raw bytes of an attachment on a log / occurrence entry, keyed by the entry's `attachments[].fileReference`. The response is the binary file (not JSON), with `Content-Disposition: attachment` and a `Content-Type` derived from the file name's extension (falling back to `application/octet-stream`). `404` when the entry doesn't belong to this project (`ENTRY_NOT_FOUND`) or no attachment with that `fileReference` exists (`ATTACHMENT_NOT_FOUND`).

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

**Two distinct journal resources** — both are per-project, curator-concluded log aggregates whose entries record exactly one `objectReference`. `log-entries` belong to the **object access log** (`ObjectAccessLog`, `OAL-` reference number) with `numberOfObjects` and optional `observations`; `occurrence-entries` belong to the **object occurrence log** (`ObjectOccurrenceLog`, `OOL-` reference number) with `numberOfObjects`, `occurrenceDate`, `location`, `reportedBy`, `detailedDescription` and optional `testimonial`. Both gain the staff permission filter on their `GET` endpoints (`addedBy` / `reportedBy`) and hydrate it as a full `PermissionDetail`. Either entry may carry an optional `requestedObjectId` tying it back to a `RequestedObject` of the proposal, for end-to-end object traceability.

**Shared endpoints are not repeated** — `GET /collection-use-projects/{projectId}` and `GET /collection-use-projects/{projectId}/events` follow the same response structure as the researcher group. The only difference is access scope (staff see all, plus a populated `requestedBy`).
