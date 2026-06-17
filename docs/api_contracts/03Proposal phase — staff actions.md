# Proposal phase — staff actions

---

### `GET /proposals`

**Description** — List proposals. Staff (any of `CURATORIAL`, `COLLECTIONS_MANAGEMENT`, `DIRECTION`, `SYS_ADMIN`) see all proposals; non-staff callers are automatically scoped to the proposals they requested. Same endpoint as the researcher list — visibility is decided from the caller's group.

**Query parameters**

```
status      : ProposalStatus  (optional) SUBMITTED | PENDING | APPROVED | REJECTED | CANCELLED
type        : UseType          (optional) EXHIBITION | IN_SITU_VISIT | OTHER — filters intendedUse.useType
requested_by: UUID             (optional) filter by researcher (honoured for staff only)
assigned_to : UUID             (optional) filter by attendant permissionId
date_from   : LocalDate        (optional) filter by requested begin date range
date_to     : LocalDate        (optional)
search      : String           (optional) search by title or reference number
page        : Integer          (default 0)
size        : Integer          (default 20)
```

**Response `200 OK`**

```json
{
  "content": [
    {
      "id": "uuid",
      "referenceNumber": "VRP-20250115-0001",
      "title": "string",
      "status": "PENDING",
      "intendedUse": {
        "useType": "IN_SITU_VISIT",
        "description": "string"
      },
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
      "submittedAt": "2025-01-15T10:30:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 38,
  "totalPages": 2
}
```

List items carry the proposal summary only, including the proposal `referenceNumber` (`VRP-YYYYMMDD-XXXX`) and `title` — there is no embedded `collectionUseProject` (use `GET /proposals/{proposalId}` for the linked project reference).

---

### `POST /proposals/{proposalId}/assign`

**Description** — A staff member assumes responsibility for the request, becoming its attendant and moving it into review. If no `targetPermissionId` is provided the caller assigns themselves. Updates `assignedTo`, transitions the proposal from `SUBMITTED` to `PENDING`, and records an `ASSIGNED` `ProposalEvent`. Allowed from any non-terminal status. The caller must belong to a staff group, and any explicit `targetPermissionId` must also belong to a staff group.

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

Both fields are optional. When `targetPermissionId` is omitted the caller is assigned.

**Response `200 OK`**

```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
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
    "type": "ASSIGNED",
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
  "message": "Cannot assign a proposal that is already decided or cancelled"
}
```

---

### `POST /proposals/{proposalId}/request-documents`

**Description** — Staff formally request supplementary documents from the researcher. Records a `DOCUMENTS_REQUESTED` `ProposalEvent` and appends the requested document types. The proposal must be in `PENDING` status; the status is unchanged. Each requested document carries a `type` and a `description`.

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
    }
  ],
  "note": "string"
}
```

**Response `200 OK`**

```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
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
  "message": "Documents can only be requested when proposal is in PENDING status"
}
```

---

### `POST /proposals/{proposalId}/forward`

**Description** — Staff forward the request to another staff member with a question or solicitation. Updates `assignedTo` and records a `FORWARDED` `ProposalEvent`. Does not change the proposal status. The caller and target permission must both belong to staff groups.

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

`targetPermissionId` is required; `note` is optional.

**Response `200 OK`**

```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
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

---

### `PUT /proposals/{proposalId}/intended-use`

**Description** — Staff update the proposal's recorded intended use after human review. This is the durable write-back used when a staff member accepts an advisory ProposalChat suggestion. It updates `Proposal.intendedUse`, keeps the proposal status unchanged, and records an `INTENDED_USE_UPDATED` `ProposalEvent`. ProposalChat does not call this internally and does not persist suggestions.

**Path parameters**

```
proposalId : UUID (required)
```

**Request body**

```json
{
  "useType": "EXHIBITION | IN_SITU_VISIT | OTHER",
  "description": "string"
}
```

Both fields are required. `useType` uses the shared `UseType` taxonomy.

**Response `200 OK`** — the updated `ProposalDetail` (same shape as `GET /proposals/{proposalId}`), with `intendedUse` and the compatibility `type` field reflecting the accepted value.

**Response `403 Forbidden`**

```json
{
  "error": "ACCESS_DENIED",
  "message": "Only staff members can update proposal intended use"
}
```

**Response `409 Conflict`**

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Cannot update intended use for a decided or cancelled proposal"
}
```

---

### `POST /proposals/{proposalId}/refer-to-direction`

**Description** — Curator escalates the proposal to direction for clarification before making a final decision. Records a `REFERRED_TO_DIRECTION` `ProposalEvent`. The proposal must be in `PENDING` status; the status is unchanged. Only available to `CURATORIAL` group members.

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

`question` is required; `note` is optional. The note recorded on the event is `note` when present, otherwise `question`.

**Response `200 OK`**

```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
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
  "message": "Only CURATORIAL members can perform this action"
}
```

**Response `409 Conflict`**

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be PENDING to be referred to direction"
}
```

---

### `POST /proposals/{proposalId}/direction-clarification`

**Description** — A direction member provides the requested clarification. Records a `DIRECTION_CLARIFIED` `ProposalEvent`. The proposal must be in `PENDING` status; the status is unchanged. Only available to `DIRECTION` group members.

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

`clarification` is required; `note` is optional. The note recorded on the event is `clarification` when present, otherwise `note`.

**Response `200 OK`**

```json
{
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "PENDING",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
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
  "message": "Only DIRECTION members can perform this action"
}
```

**Response `409 Conflict`**

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be PENDING to receive direction clarification"
}
```

---

### `POST /proposals/{proposalId}/approve`

**Description** — Curator approves the proposal and materialises the project. Transitions the proposal from `PENDING` to `APPROVED` and **creates** the linked `CollectionUseProject` in `CREATED` status. Records an `APPROVED` `ProposalEvent` and a `REQUESTED` `UseEvent` on the new project. The project's `title`, `purpose`, `beginDate`, and `endDate` are taken from this request body (the curator confirms/adjusts the project parameters at approval time), and `requestedBy` is copied from the approved proposal. Only available to `CURATORIAL` group members.

**Path parameters**

```
proposalId : UUID (required)
```

**Request body**

```json
{
  "title": "string",
  "purpose": "string",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "note": "string"
}
```

`title`, `purpose`, `beginDate`, `endDate` are required; `note` is optional.

**Response `200 OK`**

```json
{
  "proposal": {
    "id": "uuid",
    "referenceNumber": "VRP-20250115-0001",
    "title": "string",
    "status": "APPROVED",
    "beginDate": "2025-06-01",
    "endDate": "2025-06-30",
    "assignedTo": null,
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
    "referenceNumber": "CUP-1A2B3C4D",
    "title": "string",
    "status": "CREATED",
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

The proposal `referenceNumber` follows `VRP-YYYYMMDD-XXXX`. The project `collectionUseProject.referenceNumber` follows the `CUP-XXXXXXXX` pattern (8 hex chars), and `collectionUseProject.requestedBy` is copied from the approved proposal.

**Response `403 Forbidden`**

```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only CURATORIAL members can perform this action"
}
```

**Response `422 Unprocessable Entity`** — when `endDate` precedes `beginDate`.

```json
{
  "error": "INVALID_DATE_RANGE",
  "message": "endDate must be after beginDate"
}
```

**Response `409 Conflict`**

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be PENDING to be approved"
}
```

---

### `POST /proposals/{proposalId}/reject`

**Description** — Curator rejects the proposal. Transitions the proposal from `PENDING` to `REJECTED`, records a `REJECTED` `ProposalEvent`, and appends a conversation message from the caller's permission user to the requester using `reason` as the message body. No project is created or affected (the project only exists after approval). A `reason` is mandatory. Only available to `CURATORIAL` group members.

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
  "id": "uuid",
  "referenceNumber": "VRP-20250115-0001",
  "title": "string",
  "status": "REJECTED",
  "beginDate": "2025-06-01",
  "endDate": "2025-06-30",
  "assignedTo": null,
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
}
```

**Response `422 Unprocessable Entity`** — when `reason` is missing from the body (schema-enforced).

**Response `403 Forbidden`**

```json
{
  "error": "INSUFFICIENT_GROUP",
  "message": "Only CURATORIAL members can perform this action"
}
```

**Response `409 Conflict`**

```json
{
  "error": "INVALID_TRANSITION",
  "message": "Proposal must be PENDING to be rejected"
}
```

---

### `POST /proposals/{proposalId}/watchers`

**Description** — Add a staff member as a watcher on a proposal. Watchers receive visibility into the proposal without being the assigned attendant. Idempotent — adding a permission that is already watching has no effect and still returns `201`.

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
  "error": "PROPOSAL_NOT_FOUND",
  "message": "No proposal found with id uuid"
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

**Group-restricted commands** — `assign`, `forward`, and `request-documents` require a staff permission (`CURATORIAL`, `COLLECTIONS_MANAGEMENT`, `DIRECTION`, or `SYS_ADMIN`). `approve`, `reject`, and `refer-to-direction` require `CURATORIAL`; `direction-clarification` requires `DIRECTION`. Invalid group membership returns `403 Forbidden` (`INSUFFICIENT_GROUP`). Explicit assignment/forwarding/watcher targets must be staff permissions, otherwise the API returns `422 INVALID_PERMISSION_TARGET`.

**Single review state** — the implemented flow is `SUBMITTED` → `assign` (`→ PENDING`, event `ASSIGNED`) → all review activity happens in `PENDING` (`request-documents`, document uploads, `forward`, `refer-to-direction`, `direction-clarification`, messages — none change the status) → `approve` (`→ APPROVED`, creates the project), `reject` (`→ REJECTED`), or requester cancellation (`→ CANCELLED`). There is no separate `PENDING_DOCUMENTS`/`UNDER_REVIEW`/`PENDING_DIRECTION` state, and there is no `start-review` endpoint.

**Dual-aggregate responses** — `approve` returns the updated `Proposal` and the newly-created `CollectionUseProject` together, reflecting that it atomically decides the proposal and materialises the project. Requester cancellation (`POST /proposals/{proposalId}/cancel`, defined in file 02) returns the cancelled proposal and the linked project summary when a project already exists. `reject` returns the proposal alone.

**`reason` is schema-mandatory on rejection** — a missing `reason` is rejected by request validation with `422 Unprocessable Entity`.

**Conversation and document endpoints are shared** — staff use the same `GET/POST /proposals/{proposalId}/conversation`, `POST /proposals/{proposalId}/conversation/messages`, `POST/GET /proposals/{proposalId}/documents`, and `GET /proposals/{proposalId}/documents/{documentId}` (download) contracts defined in the researcher group. The sender is always resolved from the authenticated user's session.

**Watchers carry no behavior** — watcher endpoints manage visibility only. They produce no `ProposalEvent` and have no effect on status transitions. The `watchers` list is always returned in the `GET /proposals/{proposalId}` response.
