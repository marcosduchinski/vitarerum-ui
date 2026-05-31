# Project phase — researcher actions

---

### `GET /collection-use-projects`

**Description** — List the authenticated researcher's own projects. Results are filtered automatically by the caller's identity — researchers only see projects they originated.

**Query parameters**
```
status   : UseStatus  (optional) filter by status
type     : UseType    (optional) EXHIBITION | RESEARCH | OTHER
dateFrom : LocalDate  (optional) filter by begin date
dateTo   : LocalDate  (optional)
search   : String     (optional) search by title or reference number
page     : Integer    (default 0)
size     : Integer    (default 20)
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
      "status": "ACCEPTED",
      "result": null,
      "beginDate": "2025-06-01",
      "endDate": "2025-06-30",
      "proposal": {
        "id": "uuid",
        "status": "APPROVED"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3,
  "totalPages": 1
}
```

---

### `GET /collection-use-projects/{projectId}`

**Description** — Get full detail of a project. The researcher only has access to their own projects.

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
  "proposal": {
    "id": "uuid",
    "status": "APPROVED",
    "submittedAt": "2025-01-15T10:30:00"
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

**Response `403 Forbidden`**
```json
{
  "error": "ACCESS_DENIED",
  "message": "You do not have access to this project"
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

### `POST /collection-use-projects/{projectId}/start`

**Description** — Researcher starts the project. Transitions `CollectionUseProject` from `ACCEPTED` to `IN_PROGRESS`. Records a `STARTED` `UseEvent`.

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
  "status": "IN_PROGRESS",
  "lastEvent": {
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
    "note": "string"
  }
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Project must be in ACCEPTED status to be started"
}
```

---

### `POST /collection-use-projects/{projectId}/suspend`

**Description** — Researcher suspends an in-progress project. Transitions from `IN_PROGRESS` to `SUSPENDED`. Records a `SUSPENDED` `UseEvent`. A reason is mandatory.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "reason": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "CUP-2025-0042",
  "status": "SUSPENDED",
  "lastEvent": {
    "occurredAt": "2025-06-10T16:00:00",
    "type": "SUSPENDED",
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
}
```

**Response `400 Bad Request`**
```json
{
  "error": "REASON_REQUIRED",
  "message": "A reason must be provided when suspending a project"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Only IN_PROGRESS projects can be suspended"
}
```

---

### `POST /collection-use-projects/{projectId}/resume`

**Description** — Researcher resumes a previously suspended project. Transitions from `SUSPENDED` back to `IN_PROGRESS`. Records a `RESUMED` `UseEvent`.

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
  "status": "IN_PROGRESS",
  "lastEvent": {
    "occurredAt": "2025-06-15T09:00:00",
    "type": "RESUMED",
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
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Only SUSPENDED projects can be resumed"
}
```

---

### `POST /collection-use-projects/{projectId}/complete`

**Description** — Researcher concludes the project. Transitions from `IN_PROGRESS` to `COMPLETED`. Sets `UseResult` to `COMPLETED`. Records a `COMPLETED` `UseEvent`.

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
  "status": "COMPLETED",
  "result": "COMPLETED",
  "lastEvent": {
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
}
```

**Response `400 Bad Request`**
```json
{
  "error": "INVALID_RESULT",
  "message": "result must be COMPLETED"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Only IN_PROGRESS projects can be concluded"
}
```

---

### `POST /collection-use-projects/{projectId}/cancel`

**Description** — Researcher cancels the project. Transitions from `ACCEPTED`, `IN_PROGRESS`, or `SUSPENDED` to `CANCELLED`. Sets `UseResult` to `CANCELLED`. Records a `CANCELLED` `UseEvent`. A reason is mandatory.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "reason": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "CUP-2025-0042",
  "status": "CANCELLED",
  "result": "CANCELLED",
  "lastEvent": {
    "occurredAt": "2025-06-05T11:00:00",
    "type": "CANCELLED",
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
}
```

**Response `400 Bad Request`**
```json
{
  "error": "REASON_REQUIRED",
  "message": "A reason must be provided when cancelling a project"
}
```

**Response `409 Conflict`**
```json
{
  "error": "PROJECT_ALREADY_TERMINAL",
  "message": "Cannot cancel a project that is already COMPLETED or CLOSED"
}
```

---

### `POST /collection-use-projects/{projectId}/entries`

**Description** — Researcher adds a log entry to the project. Only allowed while the project is `IN_PROGRESS`. The caller's `PermissionId` is recorded as `addedBy`.

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
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_PROJECT_STATUS",
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `GET /collection-use-projects/{projectId}/entries`

**Description** — List all log entries for a project, ordered chronologically. Includes attachments per entry.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
page : Integer (default 0)
size : Integer (default 20)
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
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 4,
  "totalPages": 1
}
```

---

### `POST /collection-use-projects/{projectId}/entries/{entryId}/attachments`

**Description** — Researcher uploads a file, image, video, or other supporting file to an existing log entry. Only allowed while the project is `IN_PROGRESS`. Accepted media types are `DOCUMENT`, `IMAGE`, `VIDEO`, and `OTHER`.

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
  "fileName": "fieldwork_notes.pdf",
  "mediaType": "DOCUMENT",
  "uploadedAt": "2025-06-03T14:10:00"
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
  "message": "Attachments can only be added while the project is IN_PROGRESS"
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

**Description** — Get the full immutable audit trail of the project lifecycle, ordered chronologically. Reflects every `UseEvent` recorded on the `CollectionUseProject` aggregate.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
page : Integer (default 0)
size : Integer (default 20)
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

**Project entries are scoped to `IN_PROGRESS`** — both entries and attachments enforce this invariant at the API level, returning `409 Conflict` for any other status. This reflects the domain rule that the project must be actively running for the researcher to record activity.

**`complete` sets the result to `COMPLETED`** — the endpoint records the conclusion of the project and sets both status and result atomically.

**`cancel` sets `UseResult` to `CANCELLED`** — consistent with the model, result is always populated at terminal states.

**`GET /events` gives the full lifecycle story** — starting from `REQUESTED` at first contact, through `ACCEPTED` on approval, all the way to the current state. The researcher can read the complete history of their project at any time.
