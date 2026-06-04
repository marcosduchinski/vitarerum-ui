import { PermissionPrincipal } from '@core/auth/models/permission.model';

import { ProposalStatus, UseStatus } from '@shared/models/collection-use-status.model';
import { ProposalEvent, ProposalProjectSummary } from './proposal.model';

export interface AssignProposalRequest {
  readonly targetPermissionId?: string;
  readonly note: string;
}

export interface ForwardProposalRequest {
  readonly targetPermissionId: string;
  readonly note: string;
}

export interface AddProposalWatcherRequest {
  readonly permissionId: string;
}

export interface ProposalNoteRequest {
  readonly note: string;
}

export interface ProposalReasonRequest {
  readonly reason: string;
}

export interface ProposalAssignmentResult {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly assignedTo: PermissionPrincipal;
  readonly lastEvent: ProposalEvent;
}

export interface ProposalDecisionResult {
  readonly proposal: {
    readonly id: string;
    readonly status: ProposalStatus;
    readonly lastEvent: ProposalEvent;
  };
  readonly collectionUseProject: ProposalProjectSummary & {
    readonly status: UseStatus;
  };
}
