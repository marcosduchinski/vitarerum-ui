import { PermissionPrincipal } from '@core/identity/models/permission.model';
import { GroupName } from '@core/identity/models/group-name.enum';
import { Page, PageQuery } from '@shared/models/page.model';

import {
  MediaType,
  ProposalStatus,
  UseEventType,
  UseResult,
  UseStatus,
  UseType,
} from './collection-use-status.model';

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
  readonly type: UseType;
  readonly status: UseStatus;
  readonly result: UseResult | null;
  readonly beginDate: string;
  readonly endDate: string;
  readonly requestedBy?: PermissionPrincipal;
  readonly proposal: ProjectProposalSummary;
}

export interface Attachment {
  readonly fileReference: string;
  readonly fileName: string;
  readonly mediaType: MediaType;
  readonly uploadedAt: string;
}

export interface ProjectEntry {
  readonly id: string;
  readonly content: string;
  readonly addedAt: string;
  readonly addedBy: PermissionPrincipal;
  readonly attachments: readonly Attachment[];
}

export interface ProjectEntrySummary {
  readonly total: number;
  readonly latest: ProjectEntry | null;
}

export interface CollectionUseProjectDetail extends CollectionUseProjectSummary {
  readonly entries: ProjectEntrySummary;
}

export interface UseEvent {
  readonly occurredAt: string;
  readonly type: UseEventType;
  readonly triggeredBy: PermissionPrincipal;
  readonly note: string | null;
}

export interface ProjectListQuery extends PageQuery {
  readonly status?: UseStatus;
  readonly type?: UseType;
  readonly result?: UseResult;
  readonly requestedBy?: string;
  readonly assignedTo?: string;
  readonly referenceNumber?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
}

export interface ProjectEntriesQuery extends PageQuery {
  readonly addedBy?: string;
  readonly group?: GroupName;
}

export interface ProjectEventsQuery extends PageQuery {
  readonly type?: UseEventType;
}

export interface ProjectEntriesPage extends Page<ProjectEntry> {
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

export interface CompleteProjectRequest {
  readonly result: Extract<UseResult, 'COMPLETED' | 'PARTIALLY_COMPLETED'>;
  readonly note: string;
}

export interface CreateProjectEntryRequest {
  readonly content: string;
}
