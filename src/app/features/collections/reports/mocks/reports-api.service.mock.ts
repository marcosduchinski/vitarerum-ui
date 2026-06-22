import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import {
  makePageFrom,
  MockProjectState,
  MutableProjectState,
} from '@features/collections/proposals/mocks/mock-data';
import { Observable, of, throwError } from 'rxjs';

import {
  CreateInSituVisitReportRequest,
  InSituVisitReport,
  InSituVisitReportNarrativeType,
  InSituVisitReportTargetLanguage,
  ReportProjectStatus,
  VisitsInSituReportPage,
  VisitsInSituReportQuery,
  VisitsInSituReportRow,
} from '../models/report.model';

const DEFAULT_STATUSES: readonly ReportProjectStatus[] = ['COMPLETED', 'CANCELLED'];
const TARGET_LANGUAGES: readonly InSituVisitReportTargetLanguage[] = ['pt', 'en'];
const NARRATIVE_TYPES: readonly InSituVisitReportNarrativeType[] = [
  'institutional',
  'scientific',
  'social_media',
];

@Injectable()
export class ReportsApiServiceMock {
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly state = inject(MockProjectState);
  private readonly generatedReports: InSituVisitReport[] = [];
  private reportSequence = 0;

  listVisitsInSitu(query: VisitsInSituReportQuery = {}): Observable<VisitsInSituReportPage> {
    if (!this.identity.isStaff()) {
      return throwError(() => ({
        status: 403,
        error: 'ACCESS_DENIED',
        message: 'Reports are restricted to use-of-collections staff',
      }));
    }

    const statuses = query.status?.length ? query.status : DEFAULT_STATUSES;
    const search = query.search?.trim().toLowerCase() ?? '';

    let rows = [...this.state.projects.values()]
      .filter((project) => project.type === 'IN_SITU_VISIT')
      .filter((project) => statuses.includes(project.status as ReportProjectStatus))
      .filter((project) => !query.dateFrom || project.beginDate >= query.dateFrom)
      .filter((project) => !query.dateTo || project.endDate <= query.dateTo)
      .map((project) => this.toVisitsInSituRow(project));

    if (search) {
      rows = rows.filter((row) => this.matchesSearch(row, search));
    }

    rows.sort((a, b) => (b.closedAt ?? b.endDate).localeCompare(a.closedAt ?? a.endDate));

    return of(makePageFrom(rows, query));
  }

  createInSituVisitReport(
    projectId: string,
    request: CreateInSituVisitReportRequest,
  ): Observable<InSituVisitReport> {
    if (!this.identity.isStaff()) {
      return this.fail(403, 'ACCESS_DENIED', 'Reports are restricted to staff');
    }

    const createdBy = this.identity.getPermissionId();
    if (!createdBy) {
      return this.fail(401, 'UNAUTHENTICATED', 'An active permission is required');
    }

    const project = this.state.projects.get(projectId);
    if (!project) {
      return this.fail(404, 'PROJECT_NOT_FOUND', `No project found with id ${projectId}`);
    }
    if (project.type !== 'IN_SITU_VISIT') {
      return this.fail(409, 'INVALID_USE_TYPE', 'The project is not an in-situ visit');
    }
    if (!TARGET_LANGUAGES.includes(request.targetLanguage)) {
      return this.fail(400, 'INVALID_TARGET_LANGUAGE', 'Unsupported target language');
    }
    if (!NARRATIVE_TYPES.includes(request.narrativeType)) {
      return this.fail(400, 'INVALID_NARRATIVE_TYPE', 'Unsupported narrative type');
    }
    if (
      !Number.isFinite(request.creativityTemperature) ||
      request.creativityTemperature < 0 ||
      request.creativityTemperature > 1
    ) {
      return this.fail(
        400,
        'INVALID_CREATIVITY_TEMPERATURE',
        'Creativity temperature must be between 0.0 and 1.0',
      );
    }

    const sequence = ++this.reportSequence;
    const suffix = String(sequence).padStart(4, '0');
    const report: InSituVisitReport = {
      id: `mock-in-situ-visit-report-${suffix}`,
      createdAt: new Date(Date.UTC(2026, 5, 22, 10, 30, sequence - 1)).toISOString(),
      createdBy,
      projectId,
      narrativeId: `mock-narrative-${suffix}`,
      inSituVisitRecordId: `mock-in-situ-visit-record-${suffix}`,
      targetLanguage: request.targetLanguage,
      narrativeType: request.narrativeType,
      creativityTemperature: request.creativityTemperature,
    };
    this.generatedReports.push(report);
    return of(structuredClone(report));
  }

  private toVisitsInSituRow(project: MutableProjectState): VisitsInSituReportRow {
    const proposal = this.state.proposals.get(project.proposalId);
    const terminalEvent = [...(this.state.events.get(project.id) ?? [])]
      .reverse()
      .find((event) => event.type === 'COMPLETED' || event.type === 'CANCELLED');

    return {
      projectId: project.id,
      referenceNumber: project.referenceNumber,
      title: project.title,
      status: project.status as ReportProjectStatus,
      result: project.result ?? null,
      beginDate: project.beginDate,
      endDate: project.endDate,
      requestedBy: project.requestedBy,
      assignedTo: project.proposalAssignedTo,
      submittedAt: proposal?.submittedAt ?? null,
      closedAt: terminalEvent?.occurredAt ?? null,
    };
  }

  private matchesSearch(row: VisitsInSituReportRow, search: string): boolean {
    return [
      row.referenceNumber,
      row.title,
      row.requestedBy.user.name,
      row.requestedBy.user.email,
      row.assignedTo?.user.name ?? '',
      row.assignedTo?.user.email ?? '',
    ].some((value) => value.toLowerCase().includes(search));
  }

  private fail<T>(status: number, error: string, message: string): Observable<T> {
    return throwError(() => ({ status, error, message }));
  }
}
