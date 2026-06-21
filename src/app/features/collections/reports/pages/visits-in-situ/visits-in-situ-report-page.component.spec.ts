import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import {
  VisitsInSituReportPage,
  VisitsInSituReportQuery,
  VisitsInSituReportRow,
} from '../../models/report.model';
import { REPORTS_API_SERVICE } from '../../services/reports-api.service';
import { VisitsInSituReportPageComponent } from './visits-in-situ-report-page.component';

const ROWS: readonly VisitsInSituReportRow[] = Array.from({ length: 25 }, (_, index) => ({
  projectId: `project-${index + 1}`,
  referenceNumber: `VR-2026-${String(index + 81).padStart(3, '0')}`,
  title: index === 4 ? 'Botanical herbarium visit' : 'Photographic archive visit',
  status: index % 2 === 0 ? 'COMPLETED' : 'CANCELLED',
  result: index % 2 === 0 ? 'COMPLETED' : 'CANCELLED',
  beginDate: '2026-06-10',
  endDate: '2026-06-20',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  assignedTo: {
    permissionId: 'permission-staff',
    user: { id: 'staff-1', name: 'Bob Santos', email: 'bob@example.test' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  submittedAt: '2026-05-01T10:00:00Z',
  closedAt: index % 2 === 0 ? '2026-06-20T10:00:00Z' : '2026-06-18T10:00:00Z',
}));

class ReportsApiServiceStub {
  readonly queries: VisitsInSituReportQuery[] = [];

  listVisitsInSitu(query: VisitsInSituReportQuery = {}) {
    this.queries.push(query);
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const start = page * size;
    const search = query.search?.toLowerCase().trim() ?? '';
    const items = search
      ? ROWS.filter(
          (row) =>
            row.title.toLowerCase().includes(search) ||
            row.referenceNumber.toLowerCase().includes(search),
        )
      : ROWS;

    return of<Page<VisitsInSituReportRow> & VisitsInSituReportPage>({
      content: items.slice(start, start + size),
      page,
      size,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
    });
  }
}

describe('VisitsInSituReportPageComponent', () => {
  let reportsService: ReportsApiServiceStub;
  let router: Router;

  beforeEach(async () => {
    reportsService = new ReportsApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [VisitsInSituReportPageComponent],
      providers: [
        provideRouter([]),
        { provide: REPORTS_API_SERVICE, useValue: reportsService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    document.querySelectorAll('.p-menu').forEach((element) => element.remove());
  });

  it('loads the visits in situ report', async () => {
    const fixture = TestBed.createComponent(VisitsInSituReportPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reportsService.queries.at(-1)).toEqual({ page: 0, size: 20, search: '' });
  });

  it('renders completed and cancelled visits with a row menu', async () => {
    const fixture = TestBed.createComponent(VisitsInSituReportPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';

    expect(text).toContain('Visits in situ');
    expect(text).toContain('Reference');
    expect(text).toContain('Status');
    expect(text).toContain('Completed');
    expect(text).toContain('Cancelled');
    expect(text).toContain('Photographic archive visit');
    expect(text).toContain('Alice Ferreira');
    expect(text).toContain('Bob Santos');
    expect(text).toContain('1-20 of 25 visits');
    expect(
      compiled.querySelector('[aria-label="More actions for VR-2026-081"]'),
    ).not.toBeNull();
  });

  it('opens the row menu and navigates to the linked project', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(VisitsInSituReportPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="More actions for VR-2026-081"]')!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();

    const details = Array.from(
      document.body.querySelectorAll<HTMLElement>('.p-menu a, .p-menu button'),
    ).find((item) => item.textContent?.trim() === 'Details');
    details!.click();

    expect(navigateSpy).toHaveBeenCalledWith(['/p/collections/projects', 'project-1']);
  });

  it('applies and clears search from the first page', async () => {
    const fixture = TestBed.createComponent(VisitsInSituReportPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchInput = compiled.querySelector<HTMLInputElement>('#visits-in-situ-search');
    expect(searchInput).not.toBeNull();

    searchInput!.value = 'botanical';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonByText(compiled, 'Search').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsService.queries.at(-1)).toEqual({ page: 0, size: 20, search: 'botanical' });
    expect(compiled.textContent).toContain('1-1 of 1 visits');
    expect(compiled.textContent).toContain('Botanical herbarium visit');

    compiled.querySelector<HTMLButtonElement>('.report-search__clear')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsService.queries.at(-1)).toEqual({ page: 0, size: 20, search: '' });
  });

  it('changes page size and keeps pagination within bounds', async () => {
    const fixture = TestBed.createComponent(VisitsInSituReportPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsService.queries.at(-1)).toEqual({ page: 1, size: 20, search: '' });

    const pageSize = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#visits-in-situ-page-size',
    );
    expect(pageSize).not.toBeNull();

    pageSize!.value = '10';
    pageSize!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsService.queries.at(-1)).toEqual({ page: 0, size: 10, search: '' });

    buttonByText(fixture.nativeElement, 'Last').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(reportsService.queries.at(-1)).toEqual({ page: 2, size: 10, search: '' });

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(reportsService.queries.at(-1)).toEqual({ page: 2, size: 10, search: '' });
  });
});

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll('button')).find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${text}`);
  }

  return button;
}
