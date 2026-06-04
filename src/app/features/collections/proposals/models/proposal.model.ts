import { PermissionPrincipal } from 'src/app/core/auth/models/permission.model';
import { Page, PageQuery } from 'src/app/shared/models/page.model';
import { ObjectReference } from 'src/app/shared/models/object-reference.model';

import {
  ProposalLifecyclePhase,
  ProposalEventType,
  ProposalStatus,
  UseStatus,
  UseType,
} from 'src/app/shared/models/collection-use-status.model';

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

export interface RequestedObject {
  readonly objectReference: ObjectReference;
  readonly category: string;
  readonly description: string;
  readonly requestedAt: string;
  readonly requestedBy: string;
}

export interface Document {
  readonly id: string;
  readonly type: DocumentType;
  readonly fileName: string;
  readonly fileReference?: string;
  readonly submittedAt: string;
  readonly submittedByPermissionId: string;
}

export interface ProposalDetail extends ProposalSummary {
  readonly watchers: readonly PermissionPrincipal[];
  readonly conversationId: string;
  readonly documents: readonly Document[];
  readonly requestedObjects: readonly RequestedObject[];
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
  readonly attachments?: readonly MessageAttachment[];
}

export interface MessageAttachment {
  readonly documentId: string;
  readonly fileName: string;
  readonly fileReference?: string;
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
    readonly requestNote?: string | null;
    readonly type: UseType;
    readonly status: UseStatus;
    readonly beginDate: string;
    readonly endDate: string;
  };
  readonly conversationId: string;
}

export interface ProposalListQuery extends PageQuery {
  readonly status?: ProposalStatus;
  readonly lifecyclePhase?: ProposalLifecyclePhase;
  readonly type?: UseType;
  readonly requestedBy?: string;
  readonly assignedTo?: string;
  readonly unassigned?: boolean;
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
  readonly documentIds?: readonly string[];
}
