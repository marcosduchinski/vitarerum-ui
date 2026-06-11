# Proposal phase — researcher actions

---

### `POST /proposals`

**Description** — Researcher submits a first contact request. Atomically creates a `Proposal` in `SUBMITTED` status and a `Conversation` seeded with the initial email message (Business Rule 01 — every proposal opens with an email). Records a `SUBMITTED` `ProposalEvent`. The caller's `PermissionId` (as `EXTERNAL` group member) is recorded as `requestedBy`. **No `CollectionUseProject` is created at this point** — the project is materialised only when a curator approves the proposal (`POST /proposals/{proposalId}/approve`).

**Request body**
```json
{
  "title": "string",
  "type": "EXHIBITION | RESEARCH | OTHER",
  "purpose": "string",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "initialMessageRecipient": "collections@museum.pt",
  "initialMessageSubject": "string",
  "initialMessageBody": "string",
  "requestedObjects": [
    {
      "inventoryNumber": "INV-001",
      "category": "manuscript",
      "description": "string"
    }
  ]
}
```

`initialMessageRecipient` defaults to `collections@museum.pt` when omitted or blank. `initialMessageSubject` falls back to `title` and `initialMessageBody` falls back to `purpose` when omitted. The sender of the seeded message is resolved from the authenticated caller. `requestedObjects` is optional — each item names a collection object (by inventory number) the researcher wishes to use; the server resolves it to an `ObjectReference` snapshot. More objects can be added later via `POST /proposals/{proposalId}/requested-objects`.

**Response `201 Created`**
```json
{
  "proposal": {
    "id": "uuid",
    "referenceNumber": "VRP-20250115-0001",
    "title": "string",
    "status": "SUBMITTED",
    "type": "RESEARCH",
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
    "assignedTo": null,
    "submittedAt": "2025-01-15T10:30:00"
  },
  "conversationId": "uuid"
}
```

The submit response carries only the `proposal` summary and the `conversationId`; there is no project yet. `beginDate` and `endDate` are stored on the proposal as the requested use period. The proposal reference follows `VRP-YYYYMMDD-XXXX`, where `XXXX` is sequential per submission date. The project (with its `CUP-XXXXXXXX` reference number) appears once the proposal is approved.

**Response `422 Unprocessable Entity`**
```json
{
  "error": "INVALID_DATE_RANGE",
  "message": "endDate must be after beginDate"
}
```

---

### `POST /proposals/{proposalId}/requested-objects`

**Description** — Append collection objects the researcher wishes to use to an existing proposal. Each item carries an `inventoryNumber`, optional `category`, and optional `description`; the server resolves the inventory number to an `ObjectReference` snapshot. Allowed while the proposal is not in a terminal status (`APPROVED`/`REJECTED`). Returns the full updated proposal detail (same shape as `GET /proposals/{proposalId}`).

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "objects": [
    {
      "inventoryNumber": "INV-002",
      "category": "string",
      "description": "string"
    }
  ]
}
```

**Response `201 Created`** — the updated `ProposalDetail` (see `GET /proposals/{proposalId}`), with the new entries present in `requestedObjects`.

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot add requested objects to a decided proposal"
}
```

---

### `GET /proposals/{proposalId}`

**Description** — Get full detail of a proposal. The researcher only sees their own proposals (`requestedBy` must match the caller); otherwise `403`.

**Path parameters**
```
proposalId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "type": "RESEARCH",
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
  "assignedTo": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "CURATORIAL"
  },
  "watchers": [
    {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "COLLECTIONS_MANAGEMENT"
    }
  ],
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "",
    "title": "",
    "status": "CREATED",
    "requestedBy": null
  },
  "conversationId": "uuid",
  "documents": [
    {
      "id": "uuid",
      "type": "RESEARCH_FORM",
      "fileName": "research_form.docx",
      "fileReference": "string",
      "submittedAt": "2025-01-16T09:00:00",
      "submittedBy": {
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
  "requestedDocuments": [
    {
      "id": "uuid",
      "type": "RESEARCH_FORM",
      "description": "string",
      "requestedAt": "2025-01-16T09:00:00",
      "requestedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "COLLECTIONS_MANAGEMENT"
      }
    }
  ],
  "requestedObjects": [
    {
      "id": "uuid",
      "objectReference": {
        "inventoryNumber": "INV-001",
        "displayTitle": null,
        "objectName": null,
        "briefDescriptionSnapshot": null
      },
      "category": "manuscript",
      "description": "string",
      "requestedAt": "2025-01-15T10:30:00",
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
  "submittedAt": "2025-01-15T10:30:00"
}
```

`status` is a `ProposalStatus` — one of `SUBMITTED`, `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`. The top-level `referenceNumber` is the proposal reference (`VRP-YYYYMMDD-XXXX`), the top-level `title` is the title submitted with the proposal, and `beginDate` / `endDate` are the requested use period. `collectionUseProject` is always present in the shape, but until the proposal is approved no project exists yet: its `referenceNumber` and `title` are empty strings, `status` is the placeholder `CREATED`, and `requestedBy` is `null`. After approval these reflect the real project (`CUP-XXXXXXXX`) and its `requestedBy` permission. `requestedDocuments` lists the document types a staff attendant has formally requested (via `POST /proposals/{proposalId}/request-documents`); `documents` lists the files actually uploaded; `requestedObjects` lists the collection objects the researcher asked to use. `submittedBy`, `requestedBy` are full permission objects, not bare ids. `objectReference` fields other than `inventoryNumber` are `null` until a real object catalog is wired in.

**Response `404 Not Found`**
```json
{
  "error": "PROPOSAL_NOT_FOUND",
  "message": "No proposal found with id uuid"
}
```

**Response `403 Forbidden`**
```json
{
  "error": "ACCESS_DENIED",
  "message": "You do not have access to this proposal"
}
```

---

### `POST /proposals/{proposalId}/cancel`

**Description** — Cancels a proposal. Only the requester recorded in `requestedBy` can cancel it, and cancellation is allowed from `SUBMITTED`, `PENDING`, or `APPROVED`. `REJECTED` proposals are terminal and cannot be cancelled. Records a `CANCELLED` `ProposalEvent`. If the proposal already has an associated `CollectionUseProject`, the project is also transitioned to `CANCELLED`, its `result` is set to `CANCELLED`, and a `CANCELLED` `UseEvent` is recorded, regardless of the project's previous status.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "reason": "Research trip cancelled"
}
```

**Response `200 OK`**
```json
{
  "proposal": {
    "id": "uuid",
    "referenceNumber": "VRP-20250115-0001",
    "title": "Research on 19th century photographs",
    "status": "CANCELLED",
    "beginDate": "2025-02-01",
    "endDate": "2025-02-10",
    "assignedTo": null,
    "lastEvent": {
      "occurredAt": "2025-01-17T10:00:00",
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
      "note": "Research trip cancelled"
    }
  },
  "collectionUseProject": null
}
```

When a linked project exists, `collectionUseProject` contains its cancelled summary:

```json
{
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "CUP-1A2B3C4D",
    "title": "Research on 19th century photographs",
    "status": "CANCELLED",
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
}
```

**Response `403 Forbidden`**
```json
{
  "error": "ACCESS_DENIED",
  "message": "Only the requester can cancel this proposal"
}
```

**Response `422 Unprocessable Entity`**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Cannot cancel a rejected proposal"
}
```

---

### `POST /proposals/{proposalId}/documents`

**Description** — Uploads a `.docx` file to the proposal's document store, in response to a staff document request. Records a `DOCUMENTS_SUBMITTED` `ProposalEvent`. The proposal must be in `PENDING` status; otherwise `409`. The `documentType` string identifies the category.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body** — `multipart/form-data`
```
file         : File    (required) .docx file
documentType : String  (required) e.g. "RESEARCH_FORM", "IDENTIFICATION", "INSTITUTION_LETTER"
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "type": "RESEARCH_FORM",
  "fileName": "research_form.docx",
  "fileReference": "string",
  "submittedAt": "2025-01-16T09:00:00",
  "submittedBy": {
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

**Response `415 Unsupported Media Type`**
```json
{
  "error": "INVALID_FILE_FORMAT",
  "message": "Only .docx files are accepted"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal is not in PENDING status"
}
```

---

### `GET /proposals/{proposalId}/documents`

**Description** — List all documents submitted for a proposal.

**Path parameters**
```
proposalId : UUID (required)
```

**Response `200 OK`**
```json
{
  "proposalId": "uuid",
  "documents": [
    {
      "id": "uuid",
      "type": "RESEARCH_FORM",
      "fileName": "research_form.docx",
      "fileReference": "string",
      "submittedAt": "2025-01-16T09:00:00",
      "submittedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      }
    }
  ]
}
```

---

### `GET /proposals/{proposalId}/documents/{documentId}`

**Description** — Download the binary content of a single document (e.g. a conversation message attachment). Streams the stored file resolved from its `fileReference`, with a `Content-Disposition: attachment` header so browsers save it under its original `fileName`. Access follows the same rules as the parent proposal: the requester and staff (`CURATORIAL`, `COLLECTIONS_MANAGEMENT`, `DIRECTION`, `SYS_ADMIN`) may download; other callers get `403`.

**Path parameters**
```
proposalId : UUID (required)
documentId : UUID (required)
```

**Response `200 OK`** — binary file stream (not JSON)
```
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="research_form.docx"

<binary file content>
```

The `Content-Type` reflects the stored file's media type (`.docx` today). Clients authenticate with the usual `Authorization` / `X-Permission-Id` headers — there is no public/presigned URL, so the file must be fetched through this endpoint rather than linked directly.

**Response `404 Not Found`**
```json
{
  "error": "NOT_FOUND",
  "message": "Document not found for this proposal"
}
```

**Response `403 Forbidden`**
```json
{
  "error": "ACCESS_DENIED",
  "message": "You do not have access to this proposal"
}
```

---

### `GET /proposals/{proposalId}/events`

**Description** — Get the immutable audit trail of a proposal, paginated in insertion order. Reflects every `ProposalEvent` recorded on the aggregate.

**Path parameters**
```
proposalId : UUID (required)
```

**Query parameters**
```
page : Integer (default 0)
size : Integer (default 20)
```

`ProposalEventType` values: `SUBMITTED` · `ASSIGNED` · `FORWARDED` · `DOCUMENTS_REQUESTED` · `DOCUMENTS_SUBMITTED` · `REVIEW_STARTED` · `REFERRED_TO_DIRECTION` · `DIRECTION_CLARIFIED` · `APPROVED` · `REJECTED` · `CANCELLED`

**Response `200 OK`**
```json
{
  "proposalId": "uuid",
  "content": [
    {
      "occurredAt": "2025-01-15T10:30:00",
      "type": "SUBMITTED",
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
      "occurredAt": "2025-01-16T08:45:00",
      "type": "ASSIGNED",
      "triggeredBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "CURATORIAL"
      },
      "note": "Assuming this request"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 2,
  "totalPages": 1
}
```

---

### `GET /proposals/{proposalId}/conversation`

**Description** — Get the conversation for a proposal with its messages, paginated in insertion order.

**Path parameters**
```
proposalId : UUID (required)
```

**Query parameters**
```
page : Integer (default 0)
size : Integer (default 20)
```

**Response `200 OK`**
```json
{
  "conversationId": "uuid",
  "proposalId": "uuid",
  "messages": [
    {
      "id": "uuid",
      "sentAt": "2025-01-15T10:30:00",
      "sender": "researcher@university.pt",
      "recipient": "collections@museum.pt",
      "subject": "Research visit request",
      "body": "string",
      "attachments": [
        {
          "documentId": "uuid",
          "fileName": "research_form.docx"
        }
      ]
    },
    {
      "id": "uuid",
      "sentAt": "2025-01-16T08:45:00",
      "sender": "collections@museum.pt",
      "recipient": "researcher@university.pt",
      "subject": "RE: Research visit request",
      "body": "string",
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

### `POST /proposals/{proposalId}/conversation/messages`

**Description** — Researcher sends a message in the conversation. The message is immutable once submitted, reflecting the email semantics of the `Message` value object. No messages can be added once the proposal reaches a terminal status (`APPROVED`, `REJECTED`).

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "recipient": "collections@museum.pt",
  "subject": "string",
  "body": "string",
  "documentIds": ["uuid"]
}
```

`documentIds` is optional. Each id must reference a document already uploaded to this proposal (`POST /proposals/{proposalId}/documents`); the server resolves the file name and returns the references in `attachments`.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "sentAt": "2025-01-17T11:00:00",
  "sender": "researcher@university.pt",
  "recipient": "collections@museum.pt",
  "subject": "string",
  "body": "string",
  "attachments": [
    {
      "documentId": "uuid",
      "fileName": "research_form.docx"
    }
  ]
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "No messages can be added to a closed or decided proposal"
}
```

---

A few conventions worth noting across this group:

**`sender` is derived from the authenticated user** — the researcher's email is never submitted in the request body, it is resolved from the session. Only `recipient` needs to be provided.

**`POST /proposals` creates two aggregates, not three** — it creates a `Proposal` (`SUBMITTED`) and a `Conversation` (with its opening message) atomically. The `CollectionUseProject` is **not** created here; it is created on approval. This is the key difference from earlier revisions of the API.

**Document upload uses `multipart/form-data`** — files are never base64 encoded in JSON bodies. Only `.docx` is accepted, and the proposal must be in `PENDING` status. The `fileReference` in the response is the internal storage path resolved by the file service.

**Events are always read-only** — `GET /proposals/{proposalId}/events` exposes the immutable audit trail. There is no POST to this endpoint; events are only produced as side effects of commands.

**Message attachments reference proposal documents** — attachments are never uploaded in the message body. The caller first uploads a file via `POST /proposals/{proposalId}/documents`, then references the returned document `id` in `documentIds`. The server resolves each to a `{ documentId, fileName }` attachment on the message, so the same file can be attached to multiple messages without duplication.
