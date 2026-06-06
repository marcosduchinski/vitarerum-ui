# Project phase — staff actions

---

### `GET /collection-use-projects`

**Description** — List all projects across all researchers. Unlike the researcher view, staff see every project regardless of ownership. Supports richer filtering to support institutional oversight and workload management.

**Query parameters**
```
status         : UseStatus  (optional) filter by status
type           : UseType    (optional) EXHIBITION | RESEARCH | OTHER
requestedBy    : UUID       (optional) filter by researcher userId
assignedTo     : UUID       (optional) filter by proposal attendant permissionId
referenceNumber: String     (optional) exact match on reference number (use `search` for partial lookup)
dateFrom       : LocalDate  (optional) filter by begin date
dateTo         : LocalDate  (optional)
search         : String     (optional) search by title or reference number
page           : Integer    (default 0)
size           : Integer    (default 20)
```

**Response `200 OK`**
```json
{
  "content": [
    {
      "id": "uuid",
      "referenceNumber": "CUP-2025-0042",
      "title": "string",
      "purpose": "string",
      "requestNote": null,
      "type": "RESEARCH",
      "status": "IN_PROGRESS",
      "beginDate": "2025-06-01",
      "endDate": "2025-06-30",
      "requestedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
      "proposal": {
        "id": "uuid",
        "status": "APPROVED",
        "assignedTo": {
          "permissionId": "uuid",
          "user": {
            "id": "uuid",
            "name": "string",
            "email": "string"
          },
          "group": "CURATORIAL"
        }
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

**Description** — Get full detail of any project. Staff have access to all projects regardless of ownership. Response structure is identical to the researcher version with the addition of the full `requestedBy` detail and the `authorisedBy` / `authorisedAt` fields.

**Path parameters**
```
projectId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "CUP-2025-0042",
  "title": "string",
  "purpose": "string",
  "requestNote": null,
  "type": "RESEARCH",
  "status": "IN_PROGRESS",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "authorisedBy": "uuid",
  "authorisedAt": "2025-01-21T15:00:00",
  "requestedBy": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "EXTERNAL"
  },
  "proposal": {
    "id": "uuid",
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
  "entries": {
    "total": 4,
    "latest": {
      "id": "uuid",
      "content": "string",
      "addedAt": "2025-06-03T14:00:00",
      "addedBy": "uuid",
      "attachments": []
    }
  }
}
```

**Response `404 Not Found`**
```json
{
  "error": "PROJECT_NOT_FOUND",
  "message": "No project found with id uuid"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries`

**Description** — Staff adds an object log entry to the project. Unlike the researcher, staff may add entries at any non-`CANCELLED` status. The caller's `permissionId` is recorded as `addedBy`.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string",
  "objects": ["inventory-number-1"]
}
```

`objects` is optional.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-04T10:00:00",
  "addedBy": "uuid",
  "objects": [
    {
      "inventoryNumber": "string",
      "displayTitle": "string",
      "objectName": "string",
      "briefDescriptionSnapshot": "string"
    }
  ],
  "attachments": []
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Entries cannot be added to a cancelled project"
}
```

---

### `GET /collection-use-projects/{projectId}/log-entries`

**Description** — List all object log entries for a project ordered chronologically, including entries from both the researcher and staff.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
addedBy : UUID      (optional) filter by permissionId
group   : GroupName (optional) filter entries by the group of who added them
page    : Integer   (default 0)
size    : Integer   (default 20)
```

**Response `200 OK`**
```json
{
  "projectId": "uuid",
  "content": [
    {
      "id": "uuid",
      "content": "string",
      "addedAt": "2025-06-03T14:00:00",
      "addedBy": "uuid",
      "objects": [],
      "attachments": [
        {
          "fileReference": "string",
          "fileName": "photo_01.jpg",
          "mediaType": "IMAGE",
          "uploadedAt": "2025-06-03T14:05:00"
        }
      ]
    },
    {
      "id": "uuid",
      "content": "string",
      "addedAt": "2025-06-04T10:00:00",
      "addedBy": "uuid",
      "objects": [],
      "attachments": []
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments`

**Description** — Staff uploads a file, image, or video to an existing log entry. Staff may upload attachments at any non-`CANCELLED` status, unlike the researcher who is restricted to `IN_PROGRESS`.

**Path parameters**
```
projectId : UUID (required)
entryId   : UUID (required)
```

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
  "message": "No entry found with id uuid in project uuid"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Attachments cannot be added to a cancelled project"
}
```

**Response `415 Unsupported Media Type`**
```json
{
  "error": "UNSUPPORTED_FILE_TYPE",
  "message": "Uploaded file type does not match the declared mediaType"
}
```

---

### `POST /collection-use-projects/{projectId}/occurrence-entries`

**Description** — Staff records an object occurrence entry. Staff may add entries at any non-`CANCELLED` status.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string",
  "objects": ["inventory-number-1"]
}
```

`objects` is optional.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-04T10:00:00",
  "addedBy": "uuid",
  "objects": [],
  "attachments": []
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Entries cannot be added to a cancelled project"
}
```

---

### `GET /collection-use-projects/{projectId}/occurrence-entries`

**Description** — List all occurrence entries for a project ordered chronologically, including entries from both the researcher and staff.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
addedBy : UUID      (optional) filter by permissionId
group   : GroupName (optional) filter entries by the group of who added them
page    : Integer   (default 0)
size    : Integer   (default 20)
```

**Response `200 OK`**
```json
{
  "projectId": "uuid",
  "content": [
    {
      "id": "uuid",
      "content": "string",
      "addedAt": "2025-06-04T10:00:00",
      "addedBy": "uuid",
      "objects": [],
      "attachments": []
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

---

### `POST /collection-use-projects/{projectId}/occurrence-entries/{entryId}/attachments`

**Description** — Staff uploads a file to an existing occurrence entry at any non-`CANCELLED` project status.

**Path parameters**
```
projectId : UUID (required)
entryId   : UUID (required)
```

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
  "message": "No entry found with id uuid in project uuid"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Attachments cannot be added to a cancelled project"
}
```

**Response `415 Unsupported Media Type`**
```json
{
  "error": "UNSUPPORTED_FILE_TYPE",
  "message": "Uploaded file type does not match the declared mediaType"
}
```

---

### `GET /collection-use-projects/{projectId}/events`

**Description** — Get the full immutable audit trail of the project lifecycle ordered chronologically. Staff see the complete event history including transitions triggered by the researcher.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
type  : UseEventType (optional) filter by event type
page  : Integer      (default 0)
size  : Integer      (default 20)
```

`UseEventType` values: `PENDING` · `PROJECT_STARTED` · `PROJECT_COMPLETED` · `PROJECT_CANCELLED` · `LOGGED_UPDATE` · `LOGGED_INCIDENT`

**Response `200 OK`**
```json
{
  "projectId": "uuid",
  "content": [
    {
      "occurredAt": "2025-01-15T10:30:00",
      "type": "PENDING",
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
      "occurredAt": "2025-06-01T09:00:00",
      "type": "PROJECT_STARTED",
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
      "type": "PROJECT_COMPLETED",
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

### `POST /collection-use-projects/{projectId}/close` _(not yet implemented)_

> **Not yet implemented** — this endpoint is planned but not available in the current application.

**Description** — Staff formally closes the project record, marking the end of the institutional lifecycle. Transitions from `COMPLETED` to `CLOSED`. Records a `CLOSED` `UseEvent`. Closing is irreversible — no further entries, attachments, or status changes are permitted after this point.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "CUP-2025-0042",
  "status": "CLOSED",
  "lastEvent": {
    "occurredAt": "2025-07-15T10:00:00",
    "type": "CLOSED",
    "triggeredBy": {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "COLLECTIONS_MANAGEMENT"
    },
    "note": "string"
  }
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Only COMPLETED projects can be closed"
}
```

**Response `403 Forbidden`**
```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only staff members can close a project"
}
```

---

A few conventions worth noting across this group:

**Staff entry constraint differs from researcher** — the researcher may only add entries while `IN_PROGRESS`; staff may add entries at any non-`CANCELLED` status. This reflects the domain rule that the institution retains the right to annotate the record throughout its lifetime — before the visit, during, and after conclusion.

**Two distinct entry resources** — `log-entries` capture activity notes and object references; `occurrence-entries` capture structured object occurrence records. Both follow the same shape, and both gain the staff-only `addedBy` and `group` query filters on their `GET` endpoints.

**`addedBy` is a bare permission id** — entry responses return `addedBy` as a UUID string (the caller's `permissionId`), not a nested principal object.

**`authorisedBy` and `authorisedAt`** — the staff detail view includes these fields identifying which staff member authorised the project and when.

**`GET /collection-use-projects/{projectId}/events` gains a `type` filter** — staff can filter the audit trail by `UseEventType`. The complete set of event types is: `PENDING`, `PROJECT_STARTED`, `PROJECT_COMPLETED`, `PROJECT_CANCELLED`, `LOGGED_UPDATE`, `LOGGED_INCIDENT`.

**Shared endpoints are not repeated** — `GET /collection-use-projects/{projectId}` and `GET /collection-use-projects/{projectId}/events` follow the same response structure as the researcher group. The only difference is access scope — staff see all projects, researchers see only their own.
