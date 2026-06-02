# Proposal phase — staff actions

---

### `GET /proposals`

**Description** — List all proposals visible to staff, with rich filtering. Unlike the researcher view, staff see all proposals regardless of ownership.

**Query parameters**
```
status          : ProposalStatus       (optional) filter by operational status
lifecyclePhase  : ProposalLifecyclePhase (optional) SUBMITTED | PENDING | APPROVED | REJECTED
                                         groups multiple operational statuses into a phase:
                                         SUBMITTED  → SUBMITTED
                                         PENDING    → PENDING_DOCUMENTS | UNDER_REVIEW | PENDING_DIRECTION
                                         APPROVED   → APPROVED
                                         REJECTED   → REJECTED | CANCELLED
type            : UseType              (optional) EXHIBITION | RESEARCH | OTHER
assignedTo      : UUID                 (optional) filter by attendant permissionId
unassigned      : Boolean              (optional) when true, returns only proposals with no assignedTo
dateFrom        : LocalDate            (optional) filter by submission date range
dateTo          : LocalDate            (optional)
search          : String               (optional) search by title or reference number
page            : Integer              (default 0)
size            : Integer              (default 20)
```

**Response `200 OK`**
```json
{
  "content": [
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
      "collectionUseProject": {
        "id": "uuid",
        "referenceNumber": "CUP-2025-0042",
        "title": "string",
        "status": "REQUESTED"
      },
      "submittedAt": "2025-01-15T10:30:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 38,
  "totalPages": 2
}
```

---

### `POST /proposals/{proposalId}/assign`

**Description** — A staff member assumes responsibility for the request, becoming its attendant. If no `targetPermissionId` is provided the caller assigns themselves. Records a `REVIEW_STARTED` `ProposalEvent` and transitions the proposal to `UNDER_REVIEW`.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "targetPermissionId": "uuid",
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "UNDER_REVIEW",
  "assignedTo": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "COLLECTIONS_MANAGEMENT"
  },
  "lastEvent": {
    "occurredAt": "2025-01-16T08:45:00",
    "type": "REVIEW_STARTED",
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
  "error": "PROPOSAL_ALREADY_DECIDED",
  "message": "Cannot assign a proposal that is already APPROVED, REJECTED or CANCELLED"
}
```

---

### `POST /proposals/{proposalId}/request-documents`

**Description** — Attendant formally requests the institutional documents from the researcher. Stores the requested document list on the proposal, transitions the proposal from `SUBMITTED` or `UNDER_REVIEW` to `PENDING_DOCUMENTS`, and records a `DOCUMENTS_REQUESTED` `ProposalEvent`.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "requiredDocuments": [
    {
      "type": "RESEARCH_FORM",
      "description": "string"
    },
    {
      "type": "INSTITUTION_LETTER",
      "description": "string"
    }
  ],
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "PENDING_DOCUMENTS",
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
  "lastEvent": {
    "occurredAt": "2025-01-16T09:00:00",
    "type": "DOCUMENTS_REQUESTED",
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
  "message": "Documents can only be requested when proposal is SUBMITTED or UNDER_REVIEW"
}
```

---

### `POST /proposals/{proposalId}/forward`

**Description** — Attendant forwards the request to another staff member with a question or solicitation. Updates `assignedTo` and records a `FORWARDED` `ProposalEvent`. Does not change the proposal status.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "targetPermissionId": "uuid",
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "UNDER_REVIEW",
  "assignedTo": {
    "permissionId": "uuid",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "group": "CURATORIAL"
  },
  "lastEvent": {
    "occurredAt": "2025-01-17T14:00:00",
    "type": "FORWARDED",
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

**Response `422 Unprocessable Entity`**
```json
{
  "error": "INVALID_TARGET",
  "message": "Target permission does not belong to a staff group"
}
```

---

### `POST /proposals/{proposalId}/start-review`

**Description** — Attendant formally begins the review of the submitted documents. Transitions the proposal from `PENDING_DOCUMENTS` to `UNDER_REVIEW`. Records a `REVIEW_STARTED` `ProposalEvent`.

**Path parameters**
```
proposalId : UUID (required)
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
  "status": "UNDER_REVIEW",
  "lastEvent": {
    "occurredAt": "2025-01-18T10:00:00",
    "type": "REVIEW_STARTED",
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
  }
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Review can only start when proposal is in PENDING_DOCUMENTS status"
}
```

---

### `POST /proposals/{proposalId}/refer-to-direction`

**Description** — Curator escalates the proposal to direction for clarification before making a final decision. Transitions from `UNDER_REVIEW` to `PENDING_DIRECTION`. Records a `REFERRED_TO_DIRECTION` `ProposalEvent`. Only available to `CURATORIAL` group members.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "question": "string",
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "PENDING_DIRECTION",
  "lastEvent": {
    "occurredAt": "2025-01-19T11:00:00",
    "type": "REFERRED_TO_DIRECTION",
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
  }
}
```

**Response `403 Forbidden`**
```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only CURATORIAL members can refer a proposal to direction"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be UNDER_REVIEW to be referred to direction"
}
```

---

### `POST /proposals/{proposalId}/direction-clarification`

**Description** — A direction member provides the requested clarification. Transitions the proposal from `PENDING_DIRECTION` back to `UNDER_REVIEW`. Records a `DIRECTION_CLARIFIED` `ProposalEvent`. Only available to `DIRECTION` group members.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "clarification": "string",
  "note": "string"
}
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "status": "UNDER_REVIEW",
  "lastEvent": {
    "occurredAt": "2025-01-20T09:30:00",
    "type": "DIRECTION_CLARIFIED",
    "triggeredBy": {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "DIRECTION"
    },
    "note": "string"
  }
}
```

**Response `403 Forbidden`**
```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only DIRECTION members can provide clarification"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be PENDING_DIRECTION to receive direction clarification"
}
```

---

### `POST /proposals/{proposalId}/approve`

**Description** — Curator approves the proposal. Transitions the proposal to `APPROVED` and the linked `CollectionUseProject` to `ACCEPTED`. Records an `APPROVED` `ProposalEvent` and an `ACCEPTED` `UseEvent`. Only available to `CURATORIAL` group members.

**Path parameters**
```
proposalId : UUID (required)
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
  "proposal": {
    "id": "uuid",
    "status": "APPROVED",
    "lastEvent": {
      "occurredAt": "2025-01-21T15:00:00",
      "type": "APPROVED",
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
    }
  },
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "CUP-2025-0042",
    "status": "ACCEPTED"
  }
}
```

**Response `403 Forbidden`**
```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only CURATORIAL members can approve a proposal"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be UNDER_REVIEW to be approved"
}
```

---

### `POST /proposals/{proposalId}/reject`

**Description** — Curator rejects the proposal. Transitions the proposal to `REJECTED` and the linked `CollectionUseProject` to `REFUSED`. Records a `REJECTED` `ProposalEvent` and a `REFUSED` `UseEvent`. A reason is mandatory. Only available to `CURATORIAL` group members.

**Path parameters**
```
proposalId : UUID (required)
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
  "proposal": {
    "id": "uuid",
    "status": "REJECTED",
    "lastEvent": {
      "occurredAt": "2025-01-21T15:00:00",
      "type": "REJECTED",
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
    }
  },
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "CUP-2025-0042",
    "status": "REFUSED"
  }
}
```

**Response `400 Bad Request`**
```json
{
  "error": "REASON_REQUIRED",
  "message": "A reason must be provided when rejecting a proposal"
}
```

**Response `403 Forbidden`**
```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only CURATORIAL members can reject a proposal"
}
```

**Response `409 Conflict`**
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be UNDER_REVIEW to be rejected"
}
```

---

### `POST /proposals/{proposalId}/cancel`

**Description** — Cancels the proposal at any non-terminal stage. Transitions the proposal to `CANCELLED` and the linked `CollectionUseProject` to `CANCELLED`. Records a `CANCELLED` event on both aggregates. A reason is mandatory.

**Path parameters**
```
proposalId : UUID (required)
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
  "proposal": {
    "id": "uuid",
    "status": "CANCELLED",
    "lastEvent": {
      "occurredAt": "2025-01-22T10:00:00",
      "type": "CANCELLED",
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
  },
  "collectionUseProject": {
    "id": "uuid",
    "referenceNumber": "CUP-2025-0042",
    "status": "CANCELLED"
  }
}
```

**Response `400 Bad Request`**
```json
{
  "error": "REASON_REQUIRED",
  "message": "A reason must be provided when cancelling a proposal"
}
```

**Response `409 Conflict`**
```json
{
  "error": "PROPOSAL_ALREADY_TERMINAL",
  "message": "Cannot cancel a proposal that is already APPROVED, REJECTED or CANCELLED"
}
```

---

### `POST /proposals/{proposalId}/watchers`

**Description** — Add a staff member as a watcher on a proposal. Watchers receive visibility into the proposal without being the assigned attendant. Idempotent — adding a permission that is already watching has no effect.

**Path parameters**
```
proposalId : UUID (required)
```

**Request body**
```json
{
  "permissionId": "uuid"
}
```

**Response `201 Created`**
```json
{
  "permissionId": "uuid",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  },
  "group": "CURATORIAL"
}
```

**Response `404 Not Found`**
```json
{
  "error": "PERMISSION_NOT_FOUND",
  "message": "No permission found with id uuid"
}
```

---

### `DELETE /proposals/{proposalId}/watchers/{permissionId}`

**Description** — Remove a watcher from a proposal.

**Path parameters**
```
proposalId   : UUID (required)
permissionId : UUID (required)
```

**Response `204 No Content`**

**Response `404 Not Found`**
```json
{
  "error": "WATCHER_NOT_FOUND",
  "message": "Permission uuid is not watching this proposal"
}
```

---

A few conventions worth noting across this group:

**Group-restricted commands** — `approve`, `reject`, `refer-to-direction`, and `direction-clarification` enforce group membership at the application layer, returning `403 Forbidden` when the caller's permission does not belong to the required group. This reflects the domain rule that not every staff member can make every decision.

**Dual aggregate responses on terminal decisions** — `approve`, `reject`, and `cancel` return the updated state of both `Proposal` and `CollectionUseProject` in a single response, reflecting that these commands atomically affect two aggregates.

**`reason` is mandatory on rejection and cancellation** — the audit trail requires a human-readable justification on every negative decision, enforced at the API level with `400 Bad Request`.

**Conversation endpoints are shared** — staff use the same `GET /proposals/{proposalId}/conversation` and `POST /proposals/{proposalId}/conversation/messages` contracts defined in the researcher group. The sender is always resolved from the authenticated user's session. Both request and response include message attachments via `documentIds` / `Message.attachments` — staff may attach files by first uploading to `POST /proposals/{proposalId}/documents` and then referencing the returned document `id` in `documentIds`.

**Document uploads are shared** — staff use `POST /proposals/{proposalId}/documents` to upload response files or supporting materials. The `documentType` field identifies the category. Staff may upload at any non-terminal proposal status. Uploaded documents can then be referenced in `SendMessageRequest.documentIds`.

**Watchers carry no behavior** — `POST /proposals/{proposalId}/watchers` and `DELETE /proposals/{proposalId}/watchers/{permissionId}` manage visibility only. Watchers produce no `ProposalEvent` and have no effect on status transitions. The `watchers` list is always returned in the `GET /proposals/{proposalId}` response.
