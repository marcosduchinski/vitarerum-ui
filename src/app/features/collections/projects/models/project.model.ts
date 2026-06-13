import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { Page, PageQuery } from '@shared/models/page.model';
import { ObjectReference } from '@shared/models/object-reference.model';

import {
  MediaType,
  ProposalStatus,
  UseEventType,
  UseResult,
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
  readonly note?: string | null;
  readonly type: UseType;
  readonly status: UseStatus;
  // COMPLETED or CANCELLED once the project reaches a terminal outcome, otherwise null.
  readonly result?: UseResult | null;
  readonly beginDate: string;
  readonly endDate: string;
  // Populated only for staff callers; nullable and not yet set by any flow.
  readonly authorisedBy?: PermissionPrincipal | null;
  readonly authorisedAt?: string | null;
  readonly proposalId?: string;
  readonly requestedBy?: PermissionPrincipal | null;
  readonly proposal: ProjectProposalSummary;
}

export interface Attachment {
  readonly fileReference: string;
  readonly fileName: string;
  readonly mediaType: MediaType;
  readonly uploadedAt: string;
}

export interface ObjectAccessLog {
  readonly id: string;
  readonly referenceNumber: string;
  readonly projectId: string;
  readonly dateConclusion: string | null;
  readonly curator: PermissionPrincipal | null;
}

export interface ObjectOccurrenceLog {
  readonly id: string;
  readonly referenceNumber: string;
  readonly projectId: string;
  readonly dateConclusion: string | null;
  readonly curator: PermissionPrincipal | null;
}

export interface ObjectLogEntry {
  readonly id: string;
  readonly objectReference: ObjectReference;
  readonly numberOfObjects: number;
  readonly addedAt: string;
  readonly addedBy: PermissionPrincipal;
  readonly observations: string | null;
  readonly requestedObjectId?: string | null;
  readonly attachments: readonly Attachment[];
}

export interface ObjectOccurrenceEntry {
  readonly id: string;
  readonly objectReference: ObjectReference;
  readonly numberOfObjects: number;
  readonly occurrenceDate: string;
  readonly location: string;
  readonly reportedBy: PermissionPrincipal;
  readonly detailedDescription: string;
  readonly testimonial: string | null;
  readonly requestedObjectId?: string | null;
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
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
  // Client-side scoping helpers. The backend auto-scopes non-staff callers by the
  // acting permission, so these are honoured by the mock and ignored server-side.
  readonly requestedBy?: string;
  readonly assignedTo?: string;
}

export interface ObjectLogEntriesQuery extends PageQuery {
  readonly addedBy?: string;
}

export interface ObjectOccurrenceEntriesQuery extends PageQuery {
  readonly reportedBy?: string;
}

export interface ProjectEventsQuery extends PageQuery {
  readonly type?: UseEventType;
}

export interface ObjectLogEntriesPage extends Page<ObjectLogEntry> {
  readonly projectId: string;
  readonly accessLog: ObjectAccessLog | null;
}

export interface ObjectOccurrenceEntriesPage extends Page<ObjectOccurrenceEntry> {
  readonly projectId: string;
  readonly occurrenceLog: ObjectOccurrenceLog | null;
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
  readonly inventoryNumber: string;
  readonly numberOfObjects: number;
  readonly observations?: string;
  readonly requestedObjectId?: string;
}

export interface UpdateObjectLogEntryRequest {
  readonly addedAt?: string;
  readonly numberOfObjects?: number;
  readonly observations?: string | null;
}

export interface CreateObjectOccurrenceEntryRequest {
  readonly inventoryNumber: string;
  readonly numberOfObjects: number;
  readonly occurrenceDate: string;
  readonly location: string;
  readonly detailedDescription: string;
  readonly testimonial?: string;
  readonly requestedObjectId?: string;
}

export interface UpdateObjectOccurrenceEntryRequest {
  readonly numberOfObjects?: number;
  readonly occurrenceDate?: string;
  readonly location?: string;
  readonly detailedDescription?: string;
  readonly testimonial?: string | null;
}
