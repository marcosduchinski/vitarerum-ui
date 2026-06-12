import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { IdentityServiceMock } from '@core/auth/identity.service.mock';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import { CollectionUseProjectSummary, ProjectListQuery } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectsCompletedPageComponent } from './projects-completed-page.component';

const PROJECTS: readonly CollectionUseProjectSummary[] = Array.from({ length: 25 }, (_, index) => ({
  id: `project-${index + 1}`,
  referenceNumber: `VR-2026-${String(index + 81).padStart(3, '0')}`,
  title: index === 4 ? 'Completed railway archive conservation' : 'Completed manuscript access',
  purpose: 'Completed collection-use work with staff supervision.',
  type: index % 3 === 1 ? 'EXHIBITION' : index % 3 === 2 ? 'OTHER' : 'RESEARCH',
  status: 'COMPLETED',
  result: 'COMPLETED',
  beginDate: '2026-06-10',
  endDate: '2026-06-20',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  proposal: {
    id: 'proposal-1',
    status: 'APPROVED',
    submittedAt: '2026-05-01T10:00:00',
    assignedTo: {
      permissionId: 'permission-staff',
      user: { id: 'staff-1', name: 'Bob Santos', email: 'bob@example.test' },
      group: 'COLLECTIONS_MANAGEMENT',
    },
  },
}));

class ProjectApiServiceStub {
  readonly queries: ProjectListQuery[] = [];

  listProjects(query: ProjectListQuery = {}) {
    this.queries.push(query);
    const page = query.page ?? 0;
    const size = query.size ?? 20;
    const start = page * size;
    const search = query.search?.toLowerCase().trim() ?? '';
    const items = search
      ? PROJECTS.filter(
          (project) =>
            project.title.toLowerCase().includes(search) ||
            project.referenceNumber.toLowerCase().includes(search),
        )
      : PROJECTS;

    return of<Page<CollectionUseProjectSummary>>({
      content: items.slice(start, start + size),
      page,
      size,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
    });
  }
}

describe('ProjectsCompletedPageComponent', () => {
  let projectService: ProjectApiServiceStub;

  beforeEach(async () => {
    projectService = new ProjectApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProjectsCompletedPageComponent],
      providers: [
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceMock },
        provideRouter([]),
        { provide: PROJECT_API_SERVICE, useValue: projectService },
      ],
    }).compileComponents();
  });

  it('loads completed projects only', async () => {
    const fixture = TestBed.createComponent(ProjectsCompletedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 0,
      size: 20,
      search: '',
    });
  });

  it('renders the completed table with project information and view links', async () => {
    const fixture = TestBed.createComponent(ProjectsCompletedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    const viewLink = compiled.querySelector<HTMLAnchorElement>('a[aria-label="View VR-2026-081"]');

    expect(text).toContain('Reference');
    expect(text).toContain('Assigned staff');
    expect(text).toContain('VR-2026-081');
    expect(text).toContain('Completed manuscript access');
    expect(text).toContain('Research');
    expect(text).toContain('Alice Ferreira');
    expect(text).toContain('Bob Santos');
    expect(text).toContain('1-20 of 25 projects');
    expect(viewLink?.getAttribute('href')).toBe('/p/collections/projects/project-1');
  });

  it('applies and clears search from the first page', async () => {
    const fixture = TestBed.createComponent(ProjectsCompletedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchInput = compiled.querySelector<HTMLInputElement>('#completed-projects-search');

    expect(searchInput).not.toBeNull();

    searchInput!.value = 'railway';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonByText(compiled, 'Search').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 0,
      size: 20,
      search: 'railway',
    });
    expect(compiled.textContent).toContain('1-1 of 1 projects');
    expect(compiled.textContent).toContain('Completed railway archive conservation');

    compiled.querySelector<HTMLButtonElement>('.projects-search__clear')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 0,
      size: 20,
      search: '',
    });
  });

  it('changes page size and keeps pagination within bounds', async () => {
    const fixture = TestBed.createComponent(ProjectsCompletedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 1,
      size: 20,
      search: '',
    });

    const pageSize = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#completed-projects-page-size',
    );

    expect(pageSize).not.toBeNull();

    pageSize!.value = '10';
    pageSize!.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 0,
      size: 10,
      search: '',
    });

    buttonByText(fixture.nativeElement, 'Last').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 2,
      size: 10,
      search: '',
    });

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'COMPLETED',
      page: 2,
      size: 10,
      search: '',
    });
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
