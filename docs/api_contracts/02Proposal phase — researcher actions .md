# Proposal phase — researcher actions

---

### `POST /proposals`

**Description** — Researcher submits a first contact request. Atomically creates a `Proposal` in `SUBMITTED` status, a `CollectionUseProject` in `REQUESTED` status, and an empty `Conversation`. The caller's `PermissionId` (as `EXTERNAL` group member) is recorded as `requestedBy`. The submitted purpose is stored on the project.

**Request body**
```json
{
  "title": "string",
  "type": "EXHIBITION | RESEARCH | OTHER",
  "purpose": "string",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30"
}
```

**Response `201 Created`**
```json
{
  "proposal": {
    "id": "uuid",
    "status": "SUBMITTED",
    "type": "RESEARCH",
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
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "CUP-2025-0042",
    "title": "string",
    "purpose": "string",
    "note": null,
    "type": "RESEARCH",
    "status": "REQUESTED",
    "beginDate": "2025-06-01",
    "endDate": "2025-06-30"
  },
  "conversationId": "uuid"
}
```

**Response `422 Unprocessable Entity`**
```json
{
  "error": "INVALID_DATE_RANGE",
  "message": "endDate must be after beginDate"
}
```

---

### `GET /proposals/{proposalId}`

**Description** — Get full detail of a proposal. The researcher only sees their own proposals.

**Path parameters**
```
proposalId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "PENDING_DOCUMENTS",
  "type": "RESEARCH",
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
    "referenceNumber": "CUP-2025-0042",
    "title": "string",
    "status": "REQUESTED"
  },
  "conversationId": "uuid",
  "documents": [
    {
      "id": "uuid",
      "type": "RESEARCH_FORM",
      "fileName": "research_form.docx",
      "submittedAt": "2025-01-16T09:00:00"
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
  "submittedAt": "2025-01-15T10:30:00"
}
```

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

### `POST /proposals/{proposalId}/documents`

**Description** — Researcher uploads a document requested by the attendant. Accepted format is `docx`. The document type must match one of the proposal's requested documents. Transitions the proposal event log with a `DOCUMENTS_SUBMITTED` event.

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

**Response `409 Conflict`**
```json
{
  "error": "DOCUMENTS_NOT_REQUESTED",
  "message": "Proposal is not in PENDING_DOCUMENTS status"
}
```

**Response `415 Unsupported Media Type`**
```json
{
  "error": "INVALID_FILE_FORMAT",
  "message": "Only .docx files are accepted"
}
```

---

### `GET /proposals/{proposalId}/documents`

**Description** — List all documents submitted for a proposal, ordered by submission date.

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

### `GET /proposals/{proposalId}/events`

**Description** — Get the full immutable audit trail of a proposal, ordered chronologically. Reflects every `ProposalEvent` recorded on the aggregate.

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

**Description** — Get the full conversation for a proposal with all messages, ordered chronologically.

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
      "body": "string"
    },
    {
      "id": "uuid",
      "sentAt": "2025-01-16T08:45:00",
      "sender": "collections@museum.pt",
      "recipient": "researcher@university.pt",
      "subject": "RE: Research visit request",
      "body": "string"
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

**Description** — Researcher sends a message in the conversation. The message is immutable once submitted, reflecting the email semantics of the `Message` value object.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "recipient": "collections@museum.pt",
  "subject": "string",
  "body": "string"
}
```

**Response `201 Created`**
```json
{
  "id": "uuid",
  "sentAt": "2025-01-17T11:00:00",
  "sender": "researcher@university.pt",
  "recipient": "collections@museum.pt",
  "subject": "string",
  "body": "string"
}
```

**Response `409 Conflict`**
```json
{
  "error": "CONVERSATION_CLOSED",
  "message": "No messages can be added to a closed or decided proposal"
}
```

---

A few conventions worth noting across this group:

**`sender` is derived from the authenticated user** — the researcher's email is never submitted in the request body, it is resolved from the session. Only `recipient` needs to be provided.

**`POST /proposals` is the single entry point** for the entire lifecycle — it creates three things atomically: `Proposal`, `CollectionUseProject`, and `Conversation`. This keeps the API honest about what first contact means in the domain.

**Document upload uses `multipart/form-data`** — files are never base64 encoded in JSON bodies. The `fileReference` in the response is the internal storage path or identifier resolved by the file service.

**Events are always read-only** — `GET /proposals/{proposalId}/events` exposes the immutable audit trail. There is no POST to this endpoint; events are only produced as side effects of commands.
