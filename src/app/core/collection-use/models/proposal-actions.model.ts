import { RequestedDocument } from './proposal.model';

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
}
