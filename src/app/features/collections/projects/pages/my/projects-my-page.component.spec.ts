import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import { CollectionUseProjectSummary, ProjectListQuery } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectsMyPageComponent } from './projects-my-page.component';

const PROJECTS: readonly CollectionUseProjectSummary[] = Array.from({ length: 4 }, (_, index) => ({
  id: `project-${index + 1}`,
  referenceNumber: `VR-2026-${String(index + 51).padStart(3, '0')}`,
  title: index === 2 ? 'Field notebook transcription' : 'Illuminated manuscripts access',
  purpose: 'Active collection-use work with staff supervision.',
  type: index === 1 ? 'EXHIBITION' : index === 2 ? 'OTHER' : 'RESEARCH',
  status: 'IN_PROGRESS',
  result: null,
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
  readonly completed: Array<{ projectId: string; note: string }> = [];
  readonly cancelled: Array<{ projectId: string; reason: string }> = [];

  listProjects(query: ProjectListQuery = {}) {
    this.queries.push(query);
    const page = query.page ?? 0;
    const size = query.size ?? 3;
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

  completeProject(projectId: string, request: { note: string }) {
    this.completed.push({ projectId, note: request.note });
    return of({ id: projectId, referenceNumber: PROJECTS[0].referenceNumber, status: 'COMPLETED' });
  }

  cancelProject(projectId: string, request: { reason: string }) {
    this.cancelled.push({ projectId, reason: request.reason });
    return of({ id: projectId, referenceNumber: PROJECTS[0].referenceNumber, status: 'CANCELLED' });
  }
}

describe('ProjectsMyPageComponent', () => {
  let projectService: ProjectApiServiceStub;
  let router: Router;

  beforeEach(async () => {
    projectService = new ProjectApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProjectsMyPageComponent],
      providers: [provideRouter([]), { provide: PROJECT_API_SERVICE, useValue: projectService }],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  afterEach(() => {
    document.querySelectorAll('.p-menu').forEach((element) => element.remove());
  });

  it('loads in-progress projects only', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      search: '',
    });
  });

  it('renders my project cards with operational information', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent ?? '';

    expect(text).toContain('VR-2026-051');
    expect(text).toContain('Illuminated manuscripts access');
    expect(text).toContain('Research');
    expect(text).toContain('Alice Ferreira');
    expect(text).toContain('Bob Santos');
    expect(text).toContain('In progress');
    expect(text).toContain('1-3 of 4');
    expect(compiled.querySelectorAll('.project-card')).toHaveLength(3);
  });

  it('paginates my projects three cards at a time', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'IN_PROGRESS',
      page: 1,
      size: 3,
      search: '',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('4-4 of 4');
  });

  it('applies and clears search from the first page', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(fixture.nativeElement, 'Next').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const searchInput = compiled.querySelector<HTMLInputElement>('#my-projects-search');

    expect(searchInput).not.toBeNull();

    searchInput!.value = 'notebook';
    searchInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    buttonByText(compiled, 'Search').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      search: 'notebook',
    });
    expect(compiled.textContent).toContain('1-1 of 1');
    expect(compiled.textContent).toContain('Field notebook transcription');

    compiled.querySelector<HTMLButtonElement>('.projects-search__clear')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(projectService.queries.at(-1)).toEqual({
      status: 'IN_PROGRESS',
      page: 0,
      size: 3,
      search: '',
    });
  });

  it('navigates to the correct log page by project type', async () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    buttonByText(cardByReference(fixture.nativeElement, 'VR-2026-051'), 'Log').click();
    buttonByText(cardByReference(fixture.nativeElement, 'VR-2026-052'), 'Log').click();
    buttonByText(cardByReference(fixture.nativeElement, 'VR-2026-053'), 'Log').click();

    expect(navigateSpy).toHaveBeenCalledWith('/p/collections/projects/project-1/log/research');
    expect(navigateSpy).toHaveBeenCalledWith('/p/collections/projects/project-2/log/exhibition');
    expect(navigateSpy).toHaveBeenCalledWith('/p/collections/projects/project-3/log/other');
  });

  it('opens secondary actions from the popup menu', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    openActionsMenu(fixture.nativeElement, PROJECTS[0].referenceNumber);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('View');
    expect(document.body.textContent).toContain('Conclude');
    expect(document.body.textContent).toContain('Cancel');
  });

  it('navigates to project detail from the popup menu', async () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    openActionsMenu(fixture.nativeElement, PROJECTS[0].referenceNumber);
    fixture.detectChanges();
    await fixture.whenStable();

    menuItemByText('View').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(`/p/collections/projects/${PROJECTS[0].id}`);
  });

  it('concludes a project from the popup menu and reloads the list', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    openActionsMenu(fixture.nativeElement, PROJECTS[0].referenceNumber);
    fixture.detectChanges();
    await fixture.whenStable();

    menuItemByText('Conclude').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.completed).toEqual([
      { projectId: PROJECTS[0].id, note: 'Concluded from my projects.' },
    ]);
    expect(projectService.queries).toHaveLength(2);
  });

  it('cancels a project from the popup menu and reloads the list', async () => {
    const fixture = TestBed.createComponent(ProjectsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    openActionsMenu(fixture.nativeElement, PROJECTS[0].referenceNumber);
    fixture.detectChanges();
    await fixture.whenStable();

    menuItemByText('Cancel').click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(projectService.cancelled).toEqual([
      { projectId: PROJECTS[0].id, reason: 'Cancelled from my projects.' },
    ]);
    expect(projectService.queries).toHaveLength(2);
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

function cardByReference(root: HTMLElement, referenceNumber: string): HTMLElement {
  const card = Array.from(root.querySelectorAll<HTMLElement>('.project-card')).find((candidate) =>
    candidate.textContent?.includes(referenceNumber),
  );

  if (!(card instanceof HTMLElement)) {
    throw new Error(`Project card not found: ${referenceNumber}`);
  }

  return card;
}

function openActionsMenu(root: HTMLElement, referenceNumber: string): void {
  const button = root.querySelector<HTMLButtonElement>(
    `[aria-label="More actions for ${referenceNumber}"]`,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Actions menu button not found: ${referenceNumber}`);
  }

  button.click();
}

function menuItemByText(text: string): HTMLElement {
  const item = Array.from(
    document.body.querySelectorAll<HTMLElement>('.p-menu a, .p-menu button'),
  ).find((candidate) => candidate.textContent?.trim() === text);

  if (!(item instanceof HTMLElement)) {
    throw new Error(`Menu item not found: ${text}`);
  }

  return item;
}
