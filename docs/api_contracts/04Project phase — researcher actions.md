# Project phase — researcher actions

---

### `GET /collection-use-projects`

**Description** — List projects. Non-staff callers are automatically scoped to projects where `CollectionUseProject.requestedBy` matches the caller's `permissionId`. Same endpoint as the staff list — visibility is decided from the caller's group.

**Query parameters**
```
status      : UseStatus    (optional) CREATED | IN_PROGRESS | COMPLETED | CANCELLED
type        : UseType      (optional) EXHIBITION | IN_SITU_VISIT | OTHER — filters intendedUse.useType
requestedBy : PermissionId (optional) staff-only; ignored for non-staff callers
dateFrom    : LocalDate    (optional) reserved — accepted but not yet applied
dateTo      : LocalDate    (optional) reserved — accepted but not yet applied
search      : String       (optional) reserved — accepted but not yet applied
page        : Integer       (default 0)
size        : Integer       (default 20)
```

> `requestedBy` has no effect for a non-staff caller: the list is always forced to their own `permissionId`, so it cannot be used to see another researcher's projects.

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
        "useType": "IN_SITU_VISIT",
        "description": "string"
      },
      "status": "CREATED",
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

`requestedBy` is stored on the project as a `PermissionId`, but the hydrated `requestedBy` response object is `null` for non-staff callers (only populated for staff).

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
  "intendedUse": {
    "useType": "IN_SITU_VISIT",
    "description": "string"
  },
  "status": "IN_PROGRESS",
  "result": null,
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "authorisedBy": null,
  "authorisedAt": null,
  "actions": {
    "canStart": false,
    "canComplete": true,
    "canCancel": true,
    "canOpenLog": true
  },
  "proposal": {
    "id": "uuid",
    "referenceNumber": "VRP-20250115-0001",
    "title": "string",
    "status": "APPROVED",
    "beginDate": "2025-06-01",
    "endDate": "2025-06-30",
    "submittedAt": "2025-01-15T10:30:00",
    "assignedTo": null
  },
  "requestedBy": null
}
```

`authorisedBy` / `authorisedAt` and the hydrated `requestedBy` object are populated only for staff callers — all three are `null` for a researcher. `CollectionUseProject.requestedBy` remains the ownership field used for access control.

`actions` is a convenience permission block for the active caller. For researchers, `canStart` is `true` only when the project is `CREATED`; `canComplete` is `true` only when the project is `IN_PROGRESS`; `canCancel` is `true` for non-terminal projects; `canOpenLog` is `true` only once the project is `IN_PROGRESS`. The backend remains authoritative: commands still return `403`/`409` when the caller or state is invalid.

Researcher project detail intentionally omits staff review context such as requested objects, proposal documents, watchers, and conversation summaries. Use the proposal endpoints for researcher-facing proposal data, and use `GET /collection-use-projects/{projectId}/log-entries` / `.../occurrence-entries` for paginated project log content.

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

**Description** — Researcher adds an **object log entry** to the project's **object access log** — a structured record of one collection object accessed, with a quantity and optional observations. The access log (one per project, with its own `OAL-XXXXXXXX` reference number) is created automatically on the first entry. For non-staff callers the project must be `IN_PROGRESS`; otherwise `409`. The caller's `permissionId` is recorded as `addedBy`. `inventoryNumber` is resolved to an `ObjectReference` snapshot by the server. Entries cannot be added once the access log is concluded (`409`).

**Path parameters**
```
projectId : UUID (required)
```

**Request body**
```json
{
  "inventoryNumber": "INV-001",
  "numberOfObjects": 2,
  "observations": "string",
  "requestedObjectId": "uuid"
}
```

`observations` is optional; `numberOfObjects` must be ≥ 1. `requestedObjectId` is optional — when present it links this access to the `RequestedObject` it fulfils; it must belong to this project's proposal and its inventory number must match `inventoryNumber` (otherwise `422`).

**Response `201 Created`**
```json
{
  "id": "uuid",
  "objectReference": {
    "inventoryNumber": "INV-001",
    "displayTitle": null,
    "objectName": null,
    "briefDescriptionSnapshot": null
  },
  "numberOfObjects": 2,
  "addedAt": "2025-06-03T14:00:00",
  "addedBy": {
    "permissionId": "uuid",
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "group": "EXTERNAL"
  },
  "observations": "string",
  "requestedObjectId": "uuid",
  "attachments": []
}
```

`addedBy` is a full permission object, not a bare UUID. `objectReference` fields other than `inventoryNumber` are `null` until a real object catalog is wired in. `requestedObjectId` is `null` when the entry isn't linked to a requested object.

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `PATCH /collection-use-projects/{projectId}/log-entries/{entryId}`

**Description** — Edit an existing object log entry. Only the entry's editable fields may be changed: `addedAt`, `numberOfObjects` and `observations`. The entry's object (`inventoryNumber` / `objectReference`), its `addedBy` and its `requestedObjectId` are immutable. The request is a partial update: only the fields present in the body are changed — omit a field to leave it untouched, send `observations: null` to clear it. For non-staff callers the project must be `IN_PROGRESS` (`409` otherwise), and the entry cannot be edited once the access log is concluded (`409`).

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

`numberOfObjects`, when present, must be ≥ 1 (otherwise `422`).

**Response `200 OK`** — the updated `ObjectLogEntry`, same shape as the `POST` response.

**Response `404 Not Found`**
```json
{
  "error": "ENTRY_NOT_FOUND",
  "message": "No entry found with id uuid"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot edit entries of a concluded object access log"
}
```

---

### `GET /collection-use-projects/{projectId}/log-entries`

**Description** — List all object log entries for a project's access log, ordered chronologically. Includes the `accessLog` header (`null` if no entry has been added yet) and `attachments` per entry.

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
  "accessLog": {
    "id": "uuid",
    "referenceNumber": "OAL-1A2B3C4D",
    "projectId": "uuid",
    "dateConclusion": null,
    "curator": null
  },
  "content": [
    {
      "id": "uuid",
      "objectReference": {
        "inventoryNumber": "INV-001",
        "displayTitle": null,
        "objectName": null,
        "briefDescriptionSnapshot": null
      },
      "numberOfObjects": 1,
      "addedAt": "2025-06-03T14:00:00",
      "addedBy": {
        "permissionId": "uuid",
        "user": { "id": "uuid", "name": "string", "email": "string" },
        "group": "EXTERNAL"
      },
      "observations": "string",
      "requestedObjectId": "uuid",
      "attachments": [
        {
          "fileReference": "string",
          "fileName": "photo_01.jpg",
          "mediaType": "IMAGE",
          "uploadedAt": "2025-06-03T14:05:00",
          "note": "string"
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

### `GET /collection-use-projects/{projectId}/object-access-log`

**Description** — Get the project's object access log header: reference number, conclusion date and the curator who concluded it (both `null` while the log is open). `404` if no entry has been added to the project yet.

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
  "dateConclusion": null,
  "curator": null
}
```

**Response `404 Not Found`**
```json
{
  "error": "OBJECT_ACCESS_LOG_NOT_FOUND",
  "message": "No object_access_log found with id uuid"
}
```

---

### `POST /collection-use-projects/{projectId}/log-entries/{entryId}/attachments`

**Description** — Uploads a file to an existing object log entry. For non-staff callers the project must be `IN_PROGRESS`, and the access log must not be concluded (`409`). `mediaType` declares the kind of file: `DOCUMENT`, `IMAGE`, `VIDEO`, or `OTHER`. `note` is an optional free-text description of the attachment.

**Path parameters**
```
projectId : UUID (required)
entryId   : UUID (required)
```

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
  "fileName": "fieldwork_notes.pdf",
  "mediaType": "DOCUMENT",
  "uploadedAt": "2025-06-03T14:10:00",
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

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Entries can only be added while the project is IN_PROGRESS"
}
```

---

### `GET /collection-use-projects/{projectId}/log-entries/{entryId}/attachments/{fileReference}`

**Description** — Downloads the raw bytes of an attachment previously uploaded to an object log entry. `fileReference` is the value returned in the entry's `attachments[].fileReference`. The response streams the file with a `Content-Disposition: attachment` header and a `Content-Type` derived from the file name's extension (falling back to `application/octet-stream`). Subject to the same project-access rules as the rest of the project's endpoints.

**Path parameters**
```
projectId     : UUID   (required)
entryId       : UUID   (required)
fileReference : String (required) the attachment's fileReference
```

**Response `200 OK`** — the file bytes (binary body; not JSON).

**Response `404 Not Found`** — when the entry doesn't exist or belong to this project (`ENTRY_NOT_FOUND`), or no attachment with that `fileReference` is stored (`ATTACHMENT_NOT_FOUND`).

---

### `POST /collection-use-projects/{projectId}/occurrence-entries`

**Description** — Researcher records an **object occurrence entry** in the project's **object occurrence log** — a structured report of one occurrence involving a collection object (when, where, what happened, optional testimonial). The occurrence log (one per project, with its own `OOL-XXXXXXXX` reference number) is created automatically on the first entry. Researcher restricted to `IN_PROGRESS`; the caller's `permissionId` is recorded as `reportedBy`; `inventoryNumber` is resolved to an `ObjectReference` snapshot. Entries cannot be added once the occurrence log is concluded (`409`).

**Request body**
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

`testimonial` is optional; `numberOfObjects` must be ≥ 1; `occurrenceDate` is when the occurrence happened (client-supplied), `location` and `detailedDescription` are required. `requestedObjectId` is optional — when present it links this occurrence to the `RequestedObject` it concerns; same validation as on log entries (must belong to this project's proposal and match `inventoryNumber`, else `422`).

**Response `201 Created`**
```json
{
  "id": "uuid",
  "objectReference": {
    "inventoryNumber": "INV-001",
    "displayTitle": null,
    "objectName": null,
    "briefDescriptionSnapshot": null
  },
  "numberOfObjects": 1,
  "occurrenceDate": "2025-06-03T11:30:00",
  "location": "Conservation lab, room 2",
  "reportedBy": {
    "permissionId": "uuid",
    "user": { "id": "uuid", "name": "string", "email": "string" },
    "group": "EXTERNAL"
  },
  "detailedDescription": "string",
  "testimonial": "string",
  "requestedObjectId": "uuid",
  "attachments": []
}
```

---

### `PATCH /collection-use-projects/{projectId}/occurrence-entries/{entryId}`

**Description** — Edit an existing object occurrence entry. Only the entry's editable fields may be changed: `numberOfObjects`, `occurrenceDate`, `location`, `detailedDescription` and `testimonial`. The entry's object (`inventoryNumber` / `objectReference`), its `reportedBy` and its `requestedObjectId` are immutable. The request is a partial update: only the fields present in the body are changed — omit a field to leave it untouched, send `testimonial: null` to clear it. For non-staff callers the project must be `IN_PROGRESS` (`409` otherwise), and the entry cannot be edited once the occurrence log is concluded (`409`).

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

`numberOfObjects`, when present, must be ≥ 1; `location` and `detailedDescription`, when present, must be non-empty (otherwise `422`).

**Response `200 OK`** — the updated `ObjectOccurrenceEntry`, same shape as the `POST` response.

**Response `404 Not Found`**
```json
{
  "error": "ENTRY_NOT_FOUND",
  "message": "No entry found with id uuid"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot edit entries of a concluded object occurrence log"
}
```

---

### `GET /collection-use-projects/{projectId}/occurrence-entries`

**Description** — List all occurrence entries for a project's occurrence log, ordered chronologically by `occurrenceDate`. Includes the `occurrenceLog` header (`null` if no entry has been added yet) and `attachments` per entry.

**Query parameters**
```
reportedBy : UUID     (optional) filter by permissionId
page       : Integer  (default 0)
size       : Integer  (default 20)
```

**Response `200 OK`** — same envelope as the log-entries listing, with `occurrenceLog` (`id`, `referenceNumber`, `projectId`, `dateConclusion`, `curator`) in place of `accessLog` and occurrence-entry items as in the `POST` response.

---

### `GET /collection-use-projects/{projectId}/object-occurrence-log`

**Description** — Get the project's object occurrence log header: reference number, conclusion date and the curator who concluded it (both `null` while the log is open). `404` if no entry has been added to the project yet.

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "OOL-1A2B3C4D",
  "projectId": "uuid",
  "dateConclusion": null,
  "curator": null
}
```

**Response `404 Not Found`**
```json
{
  "error": "OBJECT_OCCURRENCE_LOG_NOT_FOUND",
  "message": "No object_occurrence_log found with id uuid"
}
```

---

### `POST /collection-use-projects/{projectId}/occurrence-entries/{entryId}/attachments`

**Description** — Uploads a file to an existing occurrence entry. Same `multipart/form-data` body, responses, and status rules as the log-entry attachment endpoint; rejected with `409` once the occurrence log is concluded.

---

### `GET /collection-use-projects/{projectId}/occurrence-entries/{entryId}/attachments/{fileReference}`

**Description** — Downloads the raw bytes of an attachment previously uploaded to an occurrence entry. Identical behavior to the log-entry attachment download (binary body, `Content-Disposition: attachment`, `Content-Type` guessed from the file name), keyed by the entry's `attachments[].fileReference`. `404` when the entry doesn't belong to this project (`ENTRY_NOT_FOUND`) or no attachment with that `fileReference` exists (`ATTACHMENT_NOT_FOUND`).

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

**Two distinct journal resources** — both are per-project, curator-concluded log aggregates whose entries record exactly one `objectReference`. `log-entries` belong to the **object access log** (`ObjectAccessLog`, `OAL-` reference number): each entry records a `numberOfObjects` and optional `observations`. `occurrence-entries` belong to the **object occurrence log** (`ObjectOccurrenceLog`, `OOL-` reference number): each entry records `numberOfObjects`, `occurrenceDate`, `location`, `reportedBy`, `detailedDescription` and an optional `testimonial`. Both logs are created lazily on the first entry, reject entries and attachments once concluded, and are restricted to `IN_PROGRESS` projects for researchers. Either entry may optionally carry `requestedObjectId` linking it back to the `RequestedObject` it fulfils (log entry) or concerns (occurrence entry), giving end-to-end traceability from request → visit → attachments for a given object.

**`objects` reference inventory items** — the request `objects` field accepts inventory-number strings; the server resolves each to an `ObjectReference` snapshot (`inventoryNumber`, `displayTitle`, `objectName`, `briefDescriptionSnapshot`). Only `inventoryNumber` is populated until a real object catalog is wired in.

**`addedBy` is a full permission object** — entry responses return `addedBy` as a nested `PermissionDetail`, not a bare UUID.

**Project status lifecycle** — `CREATED` (on proposal approval) → `IN_PROGRESS` (start) → `COMPLETED` (complete). `CANCELLED` is reachable from any non-terminal status (`CREATED` or `IN_PROGRESS`). The `result` field is `COMPLETED` or `CANCELLED` once the project reaches a terminal outcome, otherwise `null`. There are no `SUSPENDED`, `CLOSED`, `ACCEPTED`, or `REFUSED` states.

**`GET /events` gives the full lifecycle story** — starting from `REQUESTED` at project creation, through `STARTED`, to the terminal `COMPLETED` or `CANCELLED`. Staff can additionally filter by `type`.
