# Project phase — staff actions

---

### `GET /collection-use-projects`

**Description** — List all projects across all researchers. Unlike the researcher view, staff see every project regardless of ownership. Supports richer filtering to support institutional oversight and workload management.

**Query parameters**
```
status        : UseStatus  (optional) filter by status
type          : UseType    (optional) EXHIBITION | RESEARCH | OTHER
result        : UseResult  (optional) COMPLETED | CANCELLED
requestedBy   : UUID       (optional) filter by researcher userId
assignedTo    : UUID       (optional) filter by proposal attendant permissionId
referenceNumber: String    (optional) exact match on reference number (use `search` for partial lookup)
dateFrom      : LocalDate  (optional) filter by begin date
dateTo        : LocalDate  (optional)
search        : String     (optional) search by title or reference number
page          : Integer    (default 0)
size          : Integer    (default 20)
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
      "note": null,
      "type": "RESEARCH",
      "status": "IN_PROGRESS",
      "result": null,
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

**Description** — Get full detail of any project. Staff have access to all projects regardless of ownership. Response structure is identical to the researcher version with the addition of the full `requestedBy` detail.

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
  "note": null,
  "type": "RESEARCH",
  "status": "IN_PROGRESS",
  "result": null,
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
      "addedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
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

### `POST /collection-use-projects/{projectId}/entries`

**Description** — Staff adds an information entry to the project. Unlike the researcher, staff may add entries at any non-`CLOSED` status — before, during, and after the research activity. The caller's `PermissionId` is recorded as `addedBy`.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string"
}
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-04T10:00:00",
  "addedBy": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "CURATORIAL"
  },
  "attachments": []
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Entries cannot be added to a CLOSED project"
}
```

---

### `GET /collection-use-projects/{projectId}/entries`

**Description** — List all log entries for a project ordered chronologically, including entries from both the researcher and staff. Identical contract to the researcher version — staff access is broader but the response structure is the same.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
addedBy : UUID    (optional) filter by permissionId
group   : GroupName (optional) filter entries by the group of who added them
page    : Integer (default 0)
size    : Integer (default 20)
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
      "addedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
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
      "addedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "CURATORIAL"
      },
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

### `POST /collection-use-projects/{projectId}/entries/{entryId}/attachments`

**Description** — Staff uploads a file, image, or video to an existing entry. Staff may upload attachments at any non-`CLOSED` status, unlike the researcher who is restricted to `IN_PROGRESS`.

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
  "message": "Attachments cannot be added to a CLOSED project"
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

**Description** — Get the full immutable audit trail of the project lifecycle ordered chronologically. Staff see the complete event history including transitions triggered by the researcher. Identical contract to the researcher version — staff access is broader but the response structure is the same.

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

**Response `200 OK`**
```json
{
  "projectId": "uuid",
  "content": [
    {
      "occurredAt": "2025-01-15T10:30:00",
      "type": "REQUESTED",
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
      "occurredAt": "2025-01-21T15:00:00",
      "type": "ACCEPTED",
      "triggeredBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "CURATORIAL"
      },
      "note": "string"
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
  "totalElements": 4,
  "totalPages": 1
}
```

---

### `POST /collection-use-projects/{projectId}/close`

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
  "result": "COMPLETED",
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

**Staff entry constraint differs from researcher** — the researcher may only add entries while `IN_PROGRESS`; staff may add entries at any non-`CLOSED` status. This reflects the domain rule that the institution retains the right to annotate the record throughout its lifetime — before the visit, during, and after conclusion.

**`close` is irreversible and requires `COMPLETED`** — only a `COMPLETED` project can be closed. Once `CLOSED`, no entries, attachments, events, or status changes are accepted. Every subsequent write command returns `409 Conflict`. This is the hardest invariant in the project phase and is enforced at both the domain and API layers.

**`GET /collection-use-projects/{projectId}/entries` gains staff-only filters** — the `addedBy` and `group` query parameters allow staff to filter entries by contributor, useful for institutional review and audit purposes.

**`GET /collection-use-projects/{projectId}/events` gains a `type` filter** — staff can filter the audit trail by `UseEventType`, useful for reviewing specific transitions in a project history.

**Shared endpoints are not repeated** — `GET /collection-use-projects/{projectId}` and `GET /collection-use-projects/{projectId}/events` follow the same response structure as the researcher group. The only difference is access scope — staff see all projects, researchers see only their own.
