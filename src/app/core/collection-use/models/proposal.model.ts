import { PermissionPrincipal } from '@core/identity/models/permission.model';
import { Page, PageQuery } from '@shared/models/page.model';

import {
  ProposalEventType,
  ProposalStatus,
  UseStatus,
  UseType,
} from './collection-use-status.model';

export type DocumentType = string;

export interface ProposalProjectSummary {
  readonly id: string;
  readonly referenceNumber: string;
  readonly title: string;
  readonly status: UseStatus;
}

export interface ProposalSummary {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly type: UseType;
  readonly requestedBy: PermissionPrincipal;
  readonly assignedTo: PermissionPrincipal | null;
  readonly collectionUseProject: ProposalProjectSummary;
  readonly submittedAt: string;
}

export interface RequestedDocument {
  readonly id: string;
  readonly type: DocumentType;
  readonly description: string;
  readonly requestedAt: string;
  readonly requestedBy: PermissionPrincipal;
}

export interface Document {
  readonly id: string;
  readonly type: DocumentType;
  readonly fileName: string;
  readonly fileReference?: string;
  readonly submittedAt: string;
  readonly submittedBy?: PermissionPrincipal;
}

export interface ProposalDetail extends ProposalSummary {
  readonly conversationId: string;
  readonly documents: readonly Document[];
  readonly requestedDocuments: readonly RequestedDocument[];
}

export interface ProposalEvent {
  readonly occurredAt: string;
  readonly type: ProposalEventType;
  readonly triggeredBy: PermissionPrincipal;
  readonly note: string | null;
}

export interface Message {
  readonly id: string;
  readonly sentAt: string;
  readonly sender: string;
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
}

export interface Conversation {
  readonly conversationId: string;
  readonly proposalId: string;
  readonly messages: readonly Message[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

export interface CreateProposalRequest {
  readonly title: string;
  readonly type: UseType;
  readonly purpose: string;
  readonly beginDate: string;
  readonly endDate: string;
}

export interface CreateProposalResponse {
  readonly proposal: Omit<ProposalSummary, 'collectionUseProject'>;
  readonly collectionUseProject: {
    readonly id: string;
    readonly referenceNumber: string;
    readonly title: string;
    readonly purpose: string;
    readonly type: UseType;
    readonly status: UseStatus;
    readonly beginDate: string;
    readonly endDate: string;
  };
  readonly conversationId: string;
}

export interface ProposalListQuery extends PageQuery {
  readonly status?: ProposalStatus;
  readonly type?: UseType;
  readonly assignedTo?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
}

export interface ProposalDocumentsResponse {
  readonly proposalId: string;
  readonly documents: readonly Document[];
}

export interface ProposalEventsPage extends Page<ProposalEvent> {
  readonly proposalId: string;
}

export interface SendMessageRequest {
  readonly recipient: string;
  readonly subject: string;
  readonly body: string;
}
