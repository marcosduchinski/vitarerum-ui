import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { Page, PageQuery } from '@shared/models/page.model';
import { ObjectReference } from '@shared/models/object-reference.model';

import {
  MediaType,
  ProposalStatus,
  UseEventType,
  UseStatus,
  UseType,
} from '@shared/models/collection-use-status.model';

export interface ProjectProposalSummary {
  readonly id: string;
  readonly status: ProposalStatus;
  readonly submittedAt?: string;
  readonly assignedTo?: PermissionPrincipal | null;
}

export interface CollectionUseProjectSummary {
  readonly id: string;
  readonly referenceNumber: string;
  readonly title: string;
  readonly purpose: string;
  readonly requestNote?: string | null;
  readonly type: UseType;
  readonly status: UseStatus;
  readonly beginDate: string;
  readonly endDate: string;
  readonly authorisedBy?: string;
  readonly authorisedAt?: string;
  readonly proposalId?: string;
  readonly requestedBy?: PermissionPrincipal;
  readonly proposal: ProjectProposalSummary;
}

export interface Attachment {
  readonly fileReference: string;
  readonly fileName: string;
  readonly mediaType: MediaType;
  readonly uploadedAt: string;
}

export interface ObjectLogEntry {
  readonly id: string;
  readonly collectionUseProjectId: string;
  readonly content: string;
  readonly addedAt: string;
  readonly addedBy: string;
  readonly objects: readonly ObjectReference[];
  readonly attachments: readonly Attachment[];
}

export interface ObjectOccurrenceEntry {
  readonly id: string;
  readonly collectionUseProjectId: string;
  readonly content: string;
  readonly addedAt: string;
  readonly addedBy: string;
  readonly objects: readonly ObjectReference[];
  readonly attachments: readonly Attachment[];
}

export interface CollectionUseProjectDetail extends CollectionUseProjectSummary {}

export interface UseEvent {
  readonly occurredAt: string;
  readonly type: UseEventType;
  readonly triggeredBy: PermissionPrincipal;
  readonly note: string | null;
}

export interface ProjectListQuery extends PageQuery {
  readonly status?: UseStatus;
  readonly type?: UseType;
  readonly requestedBy?: string;
  readonly assignedTo?: string;
  readonly referenceNumber?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
}

export interface ObjectLogEntriesQuery extends PageQuery {
  readonly addedBy?: string;
}

export interface ObjectOccurrenceEntriesQuery extends PageQuery {
  readonly addedBy?: string;
}

export interface ProjectEventsQuery extends PageQuery {
  readonly type?: UseEventType;
}

export interface ObjectLogEntriesPage extends Page<ObjectLogEntry> {
  readonly projectId: string;
}

export interface ObjectOccurrenceEntriesPage extends Page<ObjectOccurrenceEntry> {
  readonly projectId: string;
}

export interface ProjectEventsPage extends Page<UseEvent> {
  readonly projectId: string;
}

export interface NoteRequest {
  readonly note: string;
}

export interface ReasonRequest {
  readonly reason: string;
}

export interface CreateObjectLogEntryRequest {
  readonly content: string;
  readonly objects?: readonly string[];
}

export interface CreateObjectOccurrenceEntryRequest {
  readonly content: string;
  readonly objects?: readonly string[];
}
