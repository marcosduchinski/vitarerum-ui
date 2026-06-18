import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '@core/config/app-config.model';

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
});
