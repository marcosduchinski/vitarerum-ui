import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { Page, PageQuery } from '@shared/models/page.model';
import { UseResult, UseStatus } from '@shared/models/collection-use-status.model';

export type ReportProjectStatus = Extract<UseStatus, 'COMPLETED' | 'CANCELLED'>;

export type InSituVisitReportTargetLanguage = 'pt' | 'en';
export type InSituVisitReportNarrativeType = 'institutional' | 'scientific' | 'social_media';

export interface CreateInSituVisitReportRequest {
  readonly targetLanguage: InSituVisitReportTargetLanguage;
  readonly narrativeType: InSituVisitReportNarrativeType;
  readonly creativityTemperature: number;
}

export interface InSituVisitReport {
  readonly id: string;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly projectId: string;
  readonly narrativeId: string;
  readonly inSituVisitRecordId: string;
  readonly targetLanguage: InSituVisitReportTargetLanguage;
  readonly narrativeType: InSituVisitReportNarrativeType;
  readonly creativityTemperature: number;
}

export interface VisitsInSituReportQuery extends PageQuery {
  readonly status?: readonly ReportProjectStatus[];
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly search?: string;
}

export interface VisitsInSituReportRow {
  readonly projectId: string;
  readonly referenceNumber: string;
  readonly title: string;
  readonly status: ReportProjectStatus;
  readonly result: UseResult | null;
  readonly beginDate: string;
  readonly endDate: string;
  readonly requestedBy: PermissionPrincipal;
  readonly assignedTo: PermissionPrincipal | null;
  readonly submittedAt: string | null;
  readonly closedAt: string | null;
}

export type VisitsInSituReportPage = Page<VisitsInSituReportRow>;
