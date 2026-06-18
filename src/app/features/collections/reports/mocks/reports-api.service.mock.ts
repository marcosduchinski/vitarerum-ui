import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import {
  makePageFrom,
  MockProjectState,
  MutableProjectState,
} from '@features/collections/proposals/mocks/mock-data';
import { Observable, of, throwError } from 'rxjs';

import {
  ReportProjectStatus,
  VisitsInSituReportPage,
  VisitsInSituReportQuery,
  VisitsInSituReportRow,
} from '../models/report.model';

const DEFAULT_STATUSES: readonly ReportProjectStatus[] = ['COMPLETED', 'CANCELLED'];

@Injectable()
export class ReportsApiServiceMock {
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly state = inject(MockProjectState);

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
}
