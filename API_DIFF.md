# API Diff — Frontend vs. Backend OpenAPI

Comparison between the endpoints **implemented in the Angular frontend** and the
endpoints **exposed by the backend** at `http://127.0.0.1:8000/openapi.json`.

- **Backend base path:** `/api/v1` (matches `api-base-url` in `src/config/environment.json`).
- **Frontend HTTP services inspected:**
  - `src/app/core/auth/auth-api.service.ts`
  - `src/app/features/admin/services/user-management.service.ts`
  - `src/app/features/collections/projects/services/project-api.service.ts`
  - `src/app/features/collections/proposals/services/proposal-api.service.ts`
- **Generated:** 2026-06-07

## Summary

| Metric | Count |
| --- | --- |
| Endpoints implemented in frontend | 36 |
| Endpoints exposed by backend | 46 |
| Matched (frontend ↔ backend) | 36 |
| **Backend-only** (exposed, not consumed by frontend) | **10** |
| **Frontend-only** (called, but missing in backend) | **0** |

✅ Every endpoint the frontend calls exists in the backend, with matching HTTP method and path.
There are no broken/orphan frontend calls. All differences are backend endpoints the UI does not use yet.

## Backend-only endpoints (not consumed by the frontend)

These exist in the OpenAPI spec but no frontend service calls them.

| Method | Path | Summary | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | Health | Infra/health check; not a UI concern. |
| POST | `/api/v1/users` | Create User | User self-registration/admin create — no UI yet. |
| POST | `/api/v1/collection-use-projects/{project_id}/suspend` | Suspend Project | Project lifecycle transition not wired in UI. |
| POST | `/api/v1/collection-use-projects/{project_id}/resume` | Resume Project | Counterpart to suspend; not wired in UI. |
| POST | `/api/v1/collection-use-projects/{project_id}/close` | Close Project | Previously marked "planned" in API contracts; backend now exposes it, UI still missing. |
| POST | `/api/v1/proposals/{proposal_id}/start-review` | Start Review | Proposal workflow step not wired in UI. |
| POST | `/api/v1/proposals/{proposal_id}/requested-objects` | Add Requested Objects | Add requested objects to a proposal; no UI. |
| POST | `/api/v1/proposals/{proposal_id}/refer-to-direction` | Refer To Direction | Proposal escalation step not wired in UI. |
| POST | `/api/v1/proposals/{proposal_id}/direction-clarification` | Direction Clarification | Proposal clarification step not wired in UI. |
| POST | `/api/v1/webhooks/email-inbound` | Email Inbound | Server-to-server webhook; not a UI concern. |

## Frontend-only endpoints (missing in backend)

None. Every frontend call resolves to an existing backend route.

## Matched endpoints (implemented on both sides)

### Auth
| Method | Path | Frontend |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | `AuthApiService.login` |

### Users & Groups
| Method | Path | Frontend |
| --- | --- | --- |
| GET | `/api/v1/users` | `UserManagementService.listUsers` |
| GET | `/api/v1/users/{user_id}` | `UserManagementService.getUser` |
| GET | `/api/v1/users/{user_id}/permissions` | `UserManagementService.listUserPermissions` |
| POST | `/api/v1/users/{user_id}/groups/{group_id}` | `UserManagementService.assignGroup` |
| DELETE | `/api/v1/users/{user_id}/groups/{group_id}` | `UserManagementService.revokeGroup` |
| GET | `/api/v1/groups` | `UserManagementService.listGroups` |
| GET | `/api/v1/groups/{group_id}/users` | `UserManagementService.listGroupUsers` |

### Collection-use Projects
| Method   | Path | Frontend |
|----------| --- | --- |
| GET OK   | `/api/v1/collection-use-projects` | `ProjectApiService.listProjects` |
| GET OK   | `/api/v1/collection-use-projects/{project_id}` | `ProjectApiService.getProject` |
| POST OK  | `/api/v1/collection-use-projects/{project_id}/start` | `ProjectApiService.startProject` |
| POST OK  | `/api/v1/collection-use-projects/{project_id}/complete` | `ProjectApiService.completeProject` |
| POST OK  | `/api/v1/collection-use-projects/{project_id}/cancel` | `ProjectApiService.cancelProject` |
| POST  OK | `/api/v1/collection-use-projects/{project_id}/log-entries` | `ProjectApiService.createObjectLogEntry` |
| GET  OK  | `/api/v1/collection-use-projects/{project_id}/log-entries` | `ProjectApiService.listObjectLogEntries` |
| POST  OK | `/api/v1/collection-use-projects/{project_id}/log-entries/{entry_id}/attachments` | `ProjectApiService.uploadLogEntryAttachment` |
| POST  OK | `/api/v1/collection-use-projects/{project_id}/occurrence-entries` | `ProjectApiService.createObjectOccurrenceEntry` |
| GET   OK | `/api/v1/collection-use-projects/{project_id}/occurrence-entries` | `ProjectApiService.listObjectOccurrenceEntries` |
| POST  OK | `/api/v1/collection-use-projects/{project_id}/occurrence-entries/{entry_id}/attachments` | `ProjectApiService.uploadOccurrenceEntryAttachment` |
| GET   OK | `/api/v1/collection-use-projects/{project_id}/events` | `ProjectApiService.listEvents` |

### Proposals
| Method   | Path | Frontend |
|----------| --- | --- |
| POST OK  | `/api/v1/proposals` | `ProposalApiService.createProposal` |
| GET  OK  | `/api/v1/proposals` | `ProposalApiService.listProposals` |
| GET  OK  | `/api/v1/proposals/{proposal_id}` | `ProposalApiService.getProposal` |
| POST OK  | `/api/v1/proposals/{proposal_id}/documents` | `ProposalApiService.uploadDocument` |
| GET  OK  | `/api/v1/proposals/{proposal_id}/documents` | `ProposalApiService.listDocuments` |
| POST OK  | `/api/v1/proposals/{proposal_id}/request-documents` | `ProposalApiService.requestDocuments` |
| GET  OK  | `/api/v1/proposals/{proposal_id}/events` | `ProposalApiService.listEvents` |
| GET  OK  | `/api/v1/proposals/{proposal_id}/conversation` | `ProposalApiService.getConversation` |
| POST OK  | `/api/v1/proposals/{proposal_id}/conversation/messages` | `ProposalApiService.sendMessage` |
| POST OK  | `/api/v1/proposals/{proposal_id}/assign` | `ProposalApiService.assignProposal` |
| POST OK  | `/api/v1/proposals/{proposal_id}/forward` | `ProposalApiService.forwardProposal` |
| POST OK  | `/api/v1/proposals/{proposal_id}/watchers` | `ProposalApiService.addWatcher` |
| DELETE OK | `/api/v1/proposals/{proposal_id}/watchers/{permission_id}` | `ProposalApiService.removeWatcher` |
| POST  OK | `/api/v1/proposals/{proposal_id}/approve` | `ProposalApiService.approveProposal` |
| POST   OK | `/api/v1/proposals/{proposal_id}/reject` | `ProposalApiService.rejectProposal` |
| POST     | `/api/v1/proposals/{proposal_id}/cancel` | `ProposalApiService.cancelProposal` |

---

# Schema Diff — Request/Response Bodies (Matched Endpoints)

Field-by-field comparison of the request/response **payloads** for the 36 matched
endpoints. Backend = OpenAPI component schemas; Frontend = TypeScript interfaces under
`src/app`. Legend: `?` optional, `|null` nullable.

## Summary

| Severity | Count | Meaning |
| --- | --- | --- |
| 🔴 Breaking | 8 | Type/shape/name mismatch that will misparse or send a rejected body |
| 🟠 Incomplete | 6 | Frontend missing fields/enum members the backend emits or requires |
| 🟡 Minor | ~10 | Nullability/required-flag drift or harmless extra frontend fields |

## 🔴 Breaking mismatches

### 1. `UseStatus` enum — divergent vocabularies
- **Backend:** `REQUESTED, ACCEPTED, REFUSED, IN_PROGRESS, SUSPENDED, COMPLETED, CANCELLED, CLOSED`
- **Frontend:** `CREATED, IN_PROGRESS, COMPLETED, CANCELLED`
- Frontend's `CREATED` does not exist server-side; backend's `REQUESTED/ACCEPTED/REFUSED/SUSPENDED/CLOSED` are unhandled. Affects every project payload (`status`) and `ProposalDetailProjectSummary.status`.
- File: `src/app/shared/models/collection-use-status.model.ts`

### 2. `UseEventType` enum — no overlap at all
- **Backend:** `REQUESTED, ACCEPTED, REFUSED, STARTED, SUSPENDED, RESUMED, COMPLETED, CANCELLED, CLOSED`
- **Frontend:** `PENDING, PROJECT_STARTED, PROJECT_COMPLETED, PROJECT_CANCELLED, LOGGED_UPDATE, LOGGED_INCIDENT`
- Zero shared members. Affects `UseEventResponse.type` in `GET .../events` and every `lastEvent`.
- File: `src/app/shared/models/collection-use-status.model.ts`

### 3. `POST .../request-documents` — missing required body field
- **Backend `RequestDocumentsRequest`:** `requiredDocuments: [RequestedDocumentInput]` (required), `note?`
- **Frontend `requestDocuments()` sends `ProposalNoteRequest`:** `{ note }` only
- The required `requiredDocuments` array is never sent → backend will 422. Also frontend types the response `void` though backend returns `ProposalCommandResponse`.
- Files: `proposal-api.service.ts:62`, `proposal-actions.model.ts`

### 4. `Document.submittedBy` — name + type mismatch
- **Backend `DocumentResponse`:** `submittedBy: PermissionDetail` (object)
- **Frontend `Document`:** `submittedByPermissionId: string`
- Field name differs **and** object vs string. `submittedByPermissionId` will be `undefined`. Affects `documents`, `DocumentsListResponse`, `ProposalDetail.documents`.
- File: `proposal.model.ts`

### 5. `JournalEntry.addedBy` — object vs string
- **Backend `JournalEntryResponse`:** `addedBy: PermissionDetail` (object)
- **Frontend `ObjectLogEntry` / `ObjectOccurrenceEntry`:** `addedBy: string`
- Affects log-entries & occurrence-entries list/create responses.
- File: `project.model.ts`

### 6. `Project.authorisedBy` — object vs string
- **Backend `ProjectDetailResponse`:** `authorisedBy: PermissionDetail | null`
- **Frontend `CollectionUseProjectSummary`:** `authorisedBy?: string`
- File: `project.model.ts`

### 7. `note` vs `requestNote` — project field renamed client-side
- **Backend** (`ProjectDetailResponse`, `ProjectListItemResponse`, `CollectionUseProjectSummary`): field is `note`
- **Frontend `CollectionUseProjectSummary`** and `CreateProposalResponse.collectionUseProject`: field is `requestNote`
- Frontend reads `requestNote` → always `undefined`.
- File: `project.model.ts`, `proposal.model.ts`

### 8. `PermissionSummary.group` — object vs enum string — RESOLVED 2026-06-10
- **Backend `PermissionDetail`** (used in `UserDetailResponse.permissions`, `UserPermissionsResponse.permissions`): `group: GroupName` (string) + a `user` field
- **Frontend `PermissionSummary`:** `group: Group` (object `{id, name}`), no `user`
- Frontend expects `group.name` but receives a bare string.
- File: `permission.model.ts`
- **Resolution:** backend now emits `group` as a nested `{ id, name }` object on the user-management endpoints (matches frontend; admin needs `group.id` to revoke). Contract `01Identity context.md` updated; login keeps the flat-string group. This was the cause of the forward-popup "undefined" group label and the EXTERNAL filter not excluding researchers.

## 🟠 Incomplete — frontend missing fields/enum members

| # | Where | Backend has | Frontend |
| --- | --- | --- | --- |
| 9 | `ProposalStatus` enum | `+ PENDING_DOCUMENTS, PENDING_DIRECTION` | omits both |
| 10 | `ProposalEventType` enum | `+ ASSIGNED, DIRECTION_CLARIFIED` | omits both |
| 11 | Project payloads | `result: UseResult\|null` (`COMPLETED/CANCELLED`) | no `result` field; no `UseResult` type at all |
| 12 | `ProposalDetailResponse` | `requestedDocuments: [RequestedDocumentResponse]` | `ProposalDetail` omits `requestedDocuments` |
| 13 | `SubmitProposalRequest` | `initialMessageRecipient?, initialMessageSubject?, initialMessageBody?, requestedObjects?` | `CreateProposalRequest` omits all four |
| 14 | `GroupMemberResponse` | `{ permissionId, user }` (no group) | `GroupMembership` adds `group: Group` server never sends |

## 🟡 Minor — nullability / required drift / harmless extras

- **`NoteRequest.note`**: backend `string\|null` optional; frontend `note: string` required (start/complete/approve).
- **`AssignProposalRequest` / `ForwardProposalRequest`**: backend `note?` optional + `targetPermissionId` nullable; frontend `note` required.
- **`ProposalCommandResponse.assignedTo` / `lastEvent`**: backend nullable/optional; frontend `ProposalAssignmentResult` types them required.
- **`ProjectCommandResponse.lastEvent` / `result`**: nullable/optional backend; `ProjectTransitionResult` requires `lastEvent`, omits `result`.
- **`ProposalDetailResponse.conversationId`**: backend `string\|null`; frontend `ProposalDetail.conversationId: string`.
- **`assignGroup` response**: backend returns empty `object`; frontend types `GroupMembership`.
- **Harmless extra frontend fields** (sent/expected but ignored by backend): `ObjectLogEntry.collectionUseProjectId`, `CollectionUseProjectSummary.proposalId`, `MessageAttachment.fileReference`, `Document.fileReference` (backend has `fileReference` on Document — OK; optional client-side).

## ✅ Schemas that match cleanly

`LoginRequest`/`LoginResponse` (+`AuthUser`/`AuthPermission`), `ReasonRequest`, `AddEntryRequest`,
`AttachmentResponse`, `SendMessageRequest`, `WatcherRequest`, `ConversationResponse`,
`MessageResponse` (modulo extra field), all `Paginated*` envelopes (`content/page/size/totalElements/totalPages`),
`GroupsListResponse`, `ObjectReferenceResponse`, `GroupName`, `UseType`, `MediaType` enums,
and `ProposalDetailProjectSummary`/`ProposalProjectSummary`.

> Note: multipart upload bodies (`POST .../attachments`, `POST .../documents`) are built as
> `FormData` client-side and were checked by field name (`file`, `mediaType`, `documentType`) —
> these align with the backend `Body_*` multipart schemas.
