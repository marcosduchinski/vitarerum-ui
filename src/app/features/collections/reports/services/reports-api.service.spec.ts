import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@core/config/app-config.model';

import { InSituVisitReport } from '../models/report.model';
import { ReportsApiService } from './reports-api.service';

describe('ReportsApiService', () => {
  let service: ReportsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test' },
        ReportsApiService,
      ],
    });

    service = TestBed.inject(ReportsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists visits in situ report rows with repeatable status filters', () => {
    service
      .listVisitsInSitu({
        status: ['COMPLETED', 'CANCELLED'],
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        search: 'Rio',
        page: 2,
        size: 25,
      })
      .subscribe();

    const request = http.expectOne(
      (candidate) =>
        candidate.url === 'https://api.example.test/reports/collection-use/visits-in-situ',
    );

    expect(request.request.method).toBe('GET');
    expect(request.request.params.getAll('status')).toEqual(['COMPLETED', 'CANCELLED']);
    expect(request.request.params.get('dateFrom')).toBe('2026-01-01');
    expect(request.request.params.get('dateTo')).toBe('2026-12-31');
    expect(request.request.params.get('search')).toBe('Rio');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('25');
    request.flush({ content: [], page: 2, size: 25, totalElements: 0, totalPages: 0 });
  });

  it('creates an in-situ visit report with the contract wire format', () => {
    const response = {
      id: 'report-1',
      createdAt: '2026-06-22T10:30:00Z',
      createdBy: 'permission-1',
      projectId: 'project-1',
      narrativeId: 'narrative-1',
      inSituVisitRecordId: 'record-1',
      targetLanguage: 'pt' as const,
      narrativeType: 'institutional' as const,
      creativityTemperature: 0.3,
    };
    let received: InSituVisitReport | null = null;

    service
      .createInSituVisitReport('project-1', {
        targetLanguage: 'pt',
        narrativeType: 'institutional',
        creativityTemperature: 0.3,
      })
      .subscribe((value) => (received = value));

    const request = http.expectOne('https://api.example.test/reports/project-1/in_situ_visit');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      target_language: 'pt',
      narrative_type: 'institutional',
      creativity_temperature: 0.3,
    });

    request.flush(response, {
      status: 201,
      statusText: 'Created',
      headers: { Location: '/api/v1/reports/project-1/in_situ_visit/report-1' },
    });
    expect(received).toEqual(response);
  });
});
