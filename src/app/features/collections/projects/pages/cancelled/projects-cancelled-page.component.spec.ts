import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import { CollectionUseProjectSummary, ProjectListQuery } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectsCancelledPageComponent } from './projects-cancelled-page.component';

const PROJECTS: readonly CollectionUseProjectSummary[] = Array.from({ length: 5 }, (_, index) => ({
  id: `project-${index + 1}`,
  referenceNumber: `VR-2026-${String(index + 51).padStart(3, '0')}`,
  title: index === 2 ? 'Cancelled railway survey access' : 'Cancelled manuscript request',
  purpose: 'Request cancelled before or during execution.',
  type: index % 3 === 1 ? 'EXHIBITION' : index % 3 === 2 ? 'OTHER' : 'RESEARCH',
  status: 'CANCELLED',
  result: 'CANCELLED',
  beginDate: '2026-06-10',
  endDate: '2026-06-20',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  proposal: {
    id: 'proposal-1',
    status: 'REJECTED',
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

describe('ProjectsCancelledPageComponent', () => {
  let projectService: ProjectApiServiceStub;

  beforeEach(async () => {
    projectService = new ProjectApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProjectsCancelledPageComponent],
      providers: [provideRouter([]), { provide: PROJECT_API_SERVICE, useValue: projectService }],
    }).compileComponents();
  });

  it('loads cancelled projects only', async () => {
    const fixture = TestBed.createComponent(ProjectsCancelledPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'CANCELLED',
      page: 0,
      size: 20,
      search: '',
    });
  });

  it('renders the cancelled table with project information and view links', async () => {
    const fixture = TestBed.createComponent(ProjectsCancelledPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';
    const viewLink = compiled.querySelector<HTMLAnchorElement>('a[aria-label="View VR-2026-051"]');

    expect(text).toContain('Reference');
    expect(text).toContain('Assigned staff');
    expect(text).toContain('VR-2026-051');
    expect(text).toContain('Cancelled manuscript request');
    expect(text).toContain('Research');
    expect(text).toContain('Alice Ferreira');
    expect(text).toContain('Bob Santos');
    expect(viewLink?.getAttribute('href')).toBe('/p/collections/projects/project-1');
  });
});
