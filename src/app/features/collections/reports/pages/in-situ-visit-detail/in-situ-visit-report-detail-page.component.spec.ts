import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { InSituVisitReportDetail } from '../../models/report.model';
import { REPORTS_API_SERVICE } from '../../services/reports-api.service';
import { InSituVisitReportDetailPageComponent } from './in-situ-visit-report-detail-page.component';

const DETAIL: InSituVisitReportDetail = {
  id: 'report-1',
  createdAt: '2026-06-22T10:30:00Z',
  createdBy: 'permission-1',
  projectId: 'project-1',
  narrativeId: 'narrative-1',
  inSituVisitRecordId: 'record-1',
  narrative: {
    narrativeId: 'narrative-1',
    recordId: 'record-1',
    generatedAt: '2026-06-22T10:30:00Z',
    meta: {
      resolvedNarrativeType: 'institutional',
      resolutionSource: 'request',
      targetLanguage: 'pt',
      creativityTemperature: 0.3,
      llmModel: 'llama3.1:8b',
    },
    text: 'The generated report narrative.',
  },
  record: {
    id: 'record-1',
    code: 'CUP-ABCD1234',
    visitBeginDate: '2026-06-01',
    visitEndDate: '2026-06-03',
    visitorName: 'Maria do Rosário',
    placeName: 'Museum',
    generatedAt: '2026-06-22T10:30:00Z',
    requestedObjects: [],
    inSituOccurrences: [],
    inSituLogs: [],
    inSituPublications: [],
  },
};

class ReportsApiServiceStub {
  readonly calls: { projectId: string; reportId: string }[] = [];
  response: Observable<InSituVisitReportDetail> = of(DETAIL);

  getInSituVisitReportDetail(projectId: string, reportId: string) {
    this.calls.push({ projectId, reportId });
    return this.response;
  }
}

describe('InSituVisitReportDetailPageComponent', () => {
  let reportsService: ReportsApiServiceStub;

  beforeEach(async () => {
    reportsService = new ReportsApiServiceStub();
    await TestBed.configureTestingModule({
      imports: [InSituVisitReportDetailPageComponent],
      providers: [provideRouter([]), { provide: REPORTS_API_SERVICE, useValue: reportsService }],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(InSituVisitReportDetailPageComponent);
    fixture.componentRef.setInput('projectId', 'project-1');
    fixture.componentRef.setInput('reportId', 'report-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('loads the owned report and renders its dossier masthead and narrative', async () => {
    const compiled = await render();

    expect(reportsService.calls).toEqual([{ projectId: 'project-1', reportId: 'report-1' }]);
    // The visitor headlines the report; the catalog code is demoted to the eyebrow.
    expect(compiled.querySelector('h1')?.textContent).toContain('Maria do Rosário');
    expect(compiled.querySelector('.report-detail__code')?.textContent).toContain('CUP-ABCD1234');
    expect(compiled.textContent).toContain('The generated report narrative.');
    expect(compiled.textContent).toContain('report-1');
    expect(compiled.textContent).toContain('project-1');
    expect(
      compiled.querySelector<HTMLAnchorElement>('.report-detail__back')?.getAttribute('href'),
    ).toBe('/p/collections/reports/visits-in-situ');
  });

  it('renders API errors from the detail resource', async () => {
    reportsService.response = throwError(
      () =>
        new HttpErrorResponse({
          status: 404,
          error: { error: 'REPORT_NOT_FOUND', message: 'Report not found' },
        }),
    );

    const compiled = await render();

    expect(compiled.textContent).toContain('Not found');
    expect(compiled.textContent).toContain('The requested resource no longer exists.');
  });
});
