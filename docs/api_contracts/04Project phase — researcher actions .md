# Project phase — researcher actions

---

### `GET /collection-use-projects`

**Description** — List projects. Non-staff callers are automatically scoped to projects originated by their own proposals (`requestedBy` match). Same endpoint as the staff list — visibility is decided from the caller's group.

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
      "status": "CREATED",
      "result": null,
      "beginDate": "2025-06-01",
      "endDate": "2025-06-30",
      "proposal": {
        "id": "uuid",
        "status": "APPROVED",
        "submittedAt": "2025-01-15T10:30:00",
        "assignedTo": null
      },
      "requestedBy": null
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 3,
  "totalPages": 1
}
```

`requestedBy` is `null` for non-staff callers (only populated for staff).

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
    "status": "APPROVED",
    "submittedAt": "2025-01-15T10:30:00",
    "assignedTo": null
  },
  "requestedBy": null
}
```

`authorisedBy` / `authorisedAt` and `requestedBy` are populated only for staff callers — all three are `null` for a researcher. The detail view does not embed an entries summary; use `GET /collection-use-projects/{projectId}/log-entries` and `.../occurrence-entries` for the paginated lists.

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

**Description** — Researcher starts the project. Transitions `CollectionUseProject` from `CREATED` to `IN_PROGRESS`. Records a `STARTED` `UseEvent`.

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
  "referenceNumber": "CUP-1A2B3C4D",
  "status": "IN_PROGRESS",
  "result": null,
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
  "message": "Project must be in CREATED status to be started"
}
```

---

### `POST /collection-use-projects/{projectId}/complete`

**Description** — Researcher concludes the project. Transitions from `IN_PROGRESS` to `COMPLETED` and sets `result` to `COMPLETED`. Records a `COMPLETED` `UseEvent`.

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
  "referenceNumber": "CUP-1A2B3C4D",
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

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Only IN_PROGRESS projects can be concluded"
}
```

---

### `POST /collection-use-projects/{projectId}/cancel`

**Description** — Cancels the project. Allowed from any non-terminal status except `COMPLETED` or `CANCELLED`. Transitions to `CANCELLED`, sets `result` to `CANCELLED`, and records a `CANCELLED` `UseEvent`. A `reason` is mandatory.

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
  "referenceNumber": "CUP-1A2B3C4D",
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

**Response `422 Unprocessable Entity`** — when `reason` is missing from the body (schema-enforced).

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot cancel a project that is already completed or cancelled"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries`

**Description** — Researcher adds an object **log entry** (a narrative activity note). For non-staff callers the project must be `IN_PROGRESS`; otherwise `409`. The caller's `permissionId` is recorded as `addedBy`. The optional `objects` list names collection objects (by inventory number); the server resolves each to an `ObjectReference` snapshot.

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "content": "string",
  "objects": ["INV-001", "INV-002"]
}
```

`objects` is optional.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "content": "string",
  "addedAt": "2025-06-03T14:00:00",
  "addedBy": {
    "permissionId": "uuid",
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "group": "EXTERNAL"
  },
  "objects": [
    {
      "inventoryNumber": "INV-001",
      "displayTitle": null,
      "objectName": null,
      "briefDescriptionSnapshot": null
    }
  ],
  "attachments": []
}
```

`addedBy` is a full permission object, not a bare UUID. `objectReference` fields other than `inventoryNumber` are `null` until a real object catalog is wired in.

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `GET /collection-use-projects/{projectId}/log-entries`

**Description** — List all log entries for a project, ordered chronologically. Includes `objects` and `attachments` per entry.

**Path parameters**
```
projectId : UUID (required)
```

**Query parameters**
```
addedBy : UUID     (optional) filter by permissionId
page    : Integer  (default 0)
size    : Integer  (default 20)
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
        "user": { "id": "uuid", "name": "string", "email": "string" },
        "group": "EXTERNAL"
      },
      "objects": [
        {
          "inventoryNumber": "INV-001",
          "displayTitle": null,
          "objectName": null,
          "briefDescriptionSnapshot": null
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

**Description** — Uploads a file to an existing log entry. For non-staff callers the project must be `IN_PROGRESS`. `mediaType` declares the kind of file: `DOCUMENT`, `IMAGE`, `VIDEO`, or `OTHER`.

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

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `POST /collection-use-projects/{projectId}/occurrence-entries`

**Description** — Researcher records an object **occurrence entry** — a structured note of which collection objects were accessed or involved in an activity. Same request/response shape and status rules as `POST /collection-use-projects/{projectId}/log-entries` (researcher restricted to `IN_PROGRESS`; `objects` optional, resolved to `ObjectReference` snapshots).

**Request body**
```json
{
  "content": "string",
  "objects": ["INV-001"]
}
```

**Response `201 Created`** — same `JournalEntry` shape as the log-entry response (`id`, `content`, `addedAt`, `addedBy`, `objects`, `attachments`).

---

### `GET /collection-use-projects/{projectId}/occurrence-entries`

**Description** — List all occurrence entries for a project, ordered chronologically. Same query parameters and response envelope as `GET /collection-use-projects/{projectId}/log-entries`.

---

### `POST /collection-use-projects/{projectId}/occurrence-entries/{entryId}/attachments`

**Description** — Uploads a file to an existing occurrence entry. Same `multipart/form-data` body, responses, and status rules as the log-entry attachment endpoint.

---

### `GET /collection-use-projects/{projectId}/events`

**Description** — Get the immutable audit trail of the project lifecycle, ordered chronologically. Reflects every `UseEvent` recorded on the `CollectionUseProject` aggregate.

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
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

The project's first `UseEvent` is `REQUESTED`, recorded when the curator approves the proposal and the project is created.

---

A few conventions worth noting across this group:

**Two distinct journal resources** — `log-entries` capture narrative activity; `occurrence-entries` capture structured object-occurrence records. Both are separate aggregates referencing the project, share the same request/response shape, carry an optional `objects` list resolved to `ObjectReference` snapshots, and are restricted to `IN_PROGRESS` projects for researchers.

**`objects` reference inventory items** — the request `objects` field accepts inventory-number strings; the server resolves each to an `ObjectReference` snapshot (`inventoryNumber`, `displayTitle`, `objectName`, `briefDescriptionSnapshot`). Only `inventoryNumber` is populated until a real object catalog is wired in.

**`addedBy` is a full permission object** — entry responses return `addedBy` as a nested `PermissionDetail`, not a bare UUID.

**Project status lifecycle** — `CREATED` (on proposal approval) → `IN_PROGRESS` (start) → `COMPLETED` (complete). `CANCELLED` is reachable from any non-terminal status (`CREATED` or `IN_PROGRESS`). The `result` field is `COMPLETED` or `CANCELLED` once the project reaches a terminal outcome, otherwise `null`. There are no `SUSPENDED`, `CLOSED`, `ACCEPTED`, or `REFUSED` states.

**`GET /events` gives the full lifecycle story** — starting from `REQUESTED` at project creation, through `STARTED`, to the terminal `COMPLETED` or `CANCELLED`. Staff can additionally filter by `type`.
