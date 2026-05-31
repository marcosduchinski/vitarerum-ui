import { PermissionPrincipal } from 'src/app/core/auth/models/permission.model';

import {
  ProposalStatus,
  UseResult,
  UseStatus,
} from 'src/app/shared/models/collection-use-status.model';
import { RequestedDocument, ProposalEvent, ProposalProjectSummary } from './proposal.model';

export interface AssignProposalRequest {
  readonly targetPermissionId?: string;
  readonly note: string;
}

export interface RequiredDocumentRequest {
  readonly type: string;
  readonly description: string;
}

export interface RequestDocumentsRequest {
  readonly requiredDocuments: readonly RequiredDocumentRequest[];
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

export interface ReferToDirectionRequest {
  readonly question: string;
  readonly note: string;
}

export interface DirectionClarificationRequest {
  readonly clarification: string;
  readonly note: string;
}

export interface ProposalReasonRequest {
  readonly reason: string;
}

export interface RequestDocumentsResult {
  readonly id: string;
  readonly status: 'PENDING_DOCUMENTS';
  readonly requestedDocuments: readonly RequestedDocument[];
  readonly lastEvent: ProposalEvent;
}

export interface ProposalAssignmentResult {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly assignedTo: PermissionPrincipal;
  readonly lastEvent: ProposalEvent;
}

export interface ProposalStatusActionResult {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly lastEvent: ProposalEvent;
}

export interface ProposalDecisionResult {
  readonly proposal: ProposalStatusActionResult;
  readonly collectionUseProject: ProposalProjectSummary & {
    readonly result?: UseResult;
    readonly status: UseStatus;
  };
}
