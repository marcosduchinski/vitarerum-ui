import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { API_BASE_URL } from '@core/config/app-config.model';
import { buildApiUrl } from '@core/http/api-url.util';

import {
  CreateInSituVisitReportRequest,
  InSituVisitReport,
  VisitsInSituReportPage,
  VisitsInSituReportQuery,
} from '../models/report.model';

export const REPORTS_API_SERVICE = new InjectionToken<ReportsApiService>('REPORTS_API_SERVICE');

@Injectable()
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  listVisitsInSitu(query: VisitsInSituReportQuery = {}) {
    return this.http.get<VisitsInSituReportPage>(
      this.url('/reports/collection-use/visits-in-situ'),
      { params: this.buildVisitsInSituParams(query) },
    );
  }

  createInSituVisitReport(projectId: string, request: CreateInSituVisitReportRequest) {
    return this.http.post<InSituVisitReport>(this.url(`/reports/${projectId}/in_situ_visit`), {
      target_language: request.targetLanguage,
      narrative_type: request.narrativeType,
      creativity_temperature: request.creativityTemperature,
    });
  }

  private buildVisitsInSituParams(query: VisitsInSituReportQuery): HttpParams {
    let params = new HttpParams();
    for (const status of query.status ?? []) {
      params = params.append('status', status);
    }

    const scalarParams: readonly [string, string | number | null | undefined][] = [
      ['dateFrom', query.dateFrom],
      ['dateTo', query.dateTo],
      ['search', query.search],
      ['page', query.page],
      ['size', query.size],
    ];

    return scalarParams.reduce((current, [key, value]) => {
      if (value === null || value === undefined || value === '') return current;
      return current.set(key, String(value));
    }, params);
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
