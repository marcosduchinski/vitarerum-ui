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
      "requestNote": null,
      "type": "RESEARCH",
      "status": "CREATED",
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
  "requestNote": null,
  "type": "RESEARCH",
  "status": "IN_PROGRESS",
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
      "addedBy": "uuid",
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

**Description** — Researcher starts the project. Transitions `CollectionUseProject` from `CREATED` to `IN_PROGRESS`. Records a `PROJECT_STARTED` `UseEvent`.

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
    "note": "string"
  }
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Project must be in CREATED status to be started"
}
```

---

### `POST /collection-use-projects/{projectId}/complete`

**Description** — Researcher concludes the project. Transitions from `IN_PROGRESS` to `COMPLETED`. Records a `PROJECT_COMPLETED` `UseEvent`.

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
  "lastEvent": {
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

**Description** — Researcher cancels the project. Transitions from `CREATED` or `IN_PROGRESS` to `CANCELLED`. Records a `PROJECT_CANCELLED` `UseEvent`. A reason is mandatory.

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
  "lastEvent": {
    "occurredAt": "2025-06-05T11:00:00",
    "type": "PROJECT_CANCELLED",
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
  "message": "Cannot cancel a project that is already COMPLETED"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries`

**Description** — Researcher adds an object log entry to the project. Only allowed while the project is `IN_PROGRESS`. The caller's `permissionId` is recorded as `addedBy`. An optional `objects` list associates inventory items with this log entry.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string",
  "objects": ["inventory-number-1", "inventory-number-2"]
}
```

`objects` is optional. Each item is an inventory number string identifying a collection object.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-03T14:00:00",
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
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `GET /collection-use-projects/{projectId}/log-entries`

**Description** — List all object log entries for a project, ordered chronologically. Includes referenced objects and attachments per entry.

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
      "addedBy": "uuid",
      "objects": [
        {
          "inventoryNumber": "string",
          "displayTitle": "string",
          "objectName": "string",
          "briefDescriptionSnapshot": "string"
        }
      ],
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

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments`

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

### `POST /collection-use-projects/{projectId}/occurrence-entries`

**Description** — Researcher records an object occurrence entry — a structured note capturing which collection objects were accessed or involved in a specific activity during the project. Only allowed while the project is `IN_PROGRESS`.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string",
  "objects": ["inventory-number-1", "inventory-number-2"]
}
```

`objects` is optional.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-03T14:00:00",
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
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `GET /collection-use-projects/{projectId}/occurrence-entries`

**Description** — List all object occurrence entries for a project, ordered chronologically.

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
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

### `POST /collection-use-projects/{projectId}/occurrence-entries/{entryId}/attachments`

**Description** — Researcher uploads a file to an existing occurrence entry. Only allowed while the project is `IN_PROGRESS`.

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
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

A few conventions worth noting across this group:

**Project entries use two distinct resources** — `log-entries` record narrative activity and referenced objects observed during the research; `occurrence-entries` record structured object-level occurrences. Both follow the same request/response shape and are restricted to `IN_PROGRESS` projects for researchers.

**`addedBy` is a bare permission id** — entry responses return `addedBy` as a UUID string (the caller's `permissionId`), not a nested principal object.

**`objects` on entries reference inventory items** — the `objects` request field accepts inventory number strings; the server resolves them to `ObjectReference` snapshots (`inventoryNumber`, `displayTitle`, `objectName`, `briefDescriptionSnapshot`) in the response. This allows entries to be associated with specific collection objects.

**Project status lifecycle** — `CREATED` → `IN_PROGRESS` → `COMPLETED`, with `CANCELLED` reachable from `CREATED` or `IN_PROGRESS`. The `requestNote` field on the project carries the original request context set at submission time.

**`PENDING` is the initial event** — recorded when the proposal is submitted and the project is created. `PROJECT_STARTED`, `PROJECT_COMPLETED`, and `PROJECT_CANCELLED` follow the lifecycle transitions. `LOGGED_UPDATE` and `LOGGED_INCIDENT` are produced when log entries and occurrence entries are added, respectively.

**`GET /events` gives the full lifecycle story** — starting from `PENDING` at first contact, through `PROJECT_STARTED` on beginning, all the way to the current state. The researcher can read the complete history of their project at any time.
