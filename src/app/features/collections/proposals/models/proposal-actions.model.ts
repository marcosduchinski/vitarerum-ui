import { PermissionPrincipal } from '@core/auth/models/permission.model';

import { IntendedUse, ProposalStatus, UseStatus } from '@shared/models/collection-use-status.model';
import { ProposalEvent, ProposalProjectSummary } from './proposal.model';

export interface AssignProposalRequest {
  readonly targetPermissionId?: string;
  readonly note: string;
}

export interface ForwardProposalRequest {
  readonly targetPermissionId: string;
  readonly note: string;
}

export interface ProposalNoteRequest {
  readonly note: string;
}

export type UpdateIntendedUseRequest = IntendedUse;

// Omitted properties are left unchanged by the backend. Explicit null clears
// only the nullable metadata fields; intendedUse is replaced as a whole.
export interface UpdateProposalRequest {
  readonly title?: string | null;
  readonly intendedUse?: IntendedUse;
  readonly beginDate?: string | null;
  readonly endDate?: string | null;
}

export interface ProposalReasonRequest {
  readonly reason: string;
}

// Approve materialises the project: the curator confirms/adjusts its parameters here.
export interface ApproveProposalRequest {
  readonly title: string;
  readonly purpose: string;
  readonly beginDate: string;
  readonly endDate: string;
  readonly note?: string;
}

export interface ReferToDirectionRequest {
  readonly question: string;
  readonly note?: string;
}

export interface DirectionClarificationRequest {
  readonly clarification: string;
  readonly note?: string;
}

export interface AddRequestedObjectsRequest {
  readonly objects: readonly {
    readonly inventoryNumber: string;
    readonly category?: string;
    readonly description?: string;
  }[];
}

export interface ProposalAssignmentResult {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly assignedTo: PermissionPrincipal;
  readonly lastEvent: ProposalEvent;
}

// Shape returned by status-preserving review commands (request-documents,
// refer-to-direction, direction-clarification): the proposal plus its newest event.
export interface ProposalEventResult {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly lastEvent: ProposalEvent;
}

export interface ProposalDecisionResult {
  readonly proposal: {
    readonly id: string;
    readonly status: ProposalStatus;
    readonly lastEvent: ProposalEvent;
  };
  readonly collectionUseProject:
    | (ProposalProjectSummary & {
        readonly status: UseStatus;
      })
    | null;
}

// Cancel returns a richer proposal summary, and `collectionUseProject` is null
// when no project was ever materialised (proposal cancelled before approval).
export interface ProposalCancellationResult {
  readonly proposal: {
    readonly id: string;
    readonly referenceNumber: string;
    readonly title: string;
    readonly status: ProposalStatus;
    readonly beginDate?: string;
    readonly endDate?: string;
    readonly assignedTo: PermissionPrincipal | null;
    readonly lastEvent: ProposalEvent;
  };
  readonly collectionUseProject: (ProposalProjectSummary & { readonly status: UseStatus }) | null;
}
