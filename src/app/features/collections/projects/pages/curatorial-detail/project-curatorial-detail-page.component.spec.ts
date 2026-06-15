import { ComponentRef } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { CollectionUseProjectDetail, ProjectEventsPage } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectCuratorialDetailPageComponent } from './project-curatorial-detail-page.component';

const PROJECT: CollectionUseProjectDetail = {
  id: 'proj-22',
  referenceNumber: 'VR-2026-022',
  title: 'Curatorial specimen access',
  purpose: 'Review object handling during a supervised research visit.',
  type: 'IN_SITU_VISIT',
  status: 'CREATED',
  result: null,
  beginDate: '2026-07-01',
  endDate: '2026-08-15',
  requestedBy: {
    permissionId: 'perm-alice',
    user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  proposal: {
    id: 'prop-22',
    status: 'APPROVED',
    assignedTo: {
      permissionId: 'perm-carol',
      user: { id: 'u-carol', name: 'Carol Souza', email: 'carol@example.test' },
      group: 'CURATORIAL',
    },
  },
  actions: {
    canStart: false,
    canComplete: false,
    canCancel: true,
    canOpenLog: true,
    canCreateObjectLogEntry: true,
    canCreateOccurrenceEntry: true,
    canConcludeObjectAccessLog: false,
    canConcludeObjectOccurrenceLog: false,
  },
  staffContext: null,
};

const EVENTS_PAGE: ProjectEventsPage = {
  projectId: PROJECT.id,
  content: [
    {
      occurredAt: '2026-06-01T09:00:00Z',
      type: 'REQUESTED',
      triggeredBy: PROJECT.requestedBy!,
      note: null,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

class ProjectApiServiceStub {
  project: CollectionUseProjectDetail = PROJECT;
  readonly cancelled: { projectId: string; reason: string }[] = [];

  getProject(_id: string) {
    return of(this.project);
  }

  listEvents(_id: string) {
    return of(EVENTS_PAGE);
  }

  cancelProject(projectId: string, request: { reason: string }) {
    this.cancelled.push({ projectId, reason: request.reason });
    return of({
      id: projectId,
      referenceNumber: this.project.referenceNumber,
      status: 'CANCELLED' as const,
      result: 'CANCELLED' as const,
      lastEvent: EVENTS_PAGE.content[0],
    });
  }
}

describe('ProjectCuratorialDetailPageComponent', () => {
  let projectService: ProjectApiServiceStub;
  let router: Router;
  let componentRef: ComponentRef<ProjectCuratorialDetailPageComponent>;

  beforeEach(async () => {
    projectService = new ProjectApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProjectCuratorialDetailPageComponent],
      providers: [provideRouter([]), { provide: PROJECT_API_SERVICE, useValue: projectService }],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(ProjectCuratorialDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', PROJECT.id);
    componentRef.setInput('returnTo', '/p/collections/projects/my');
    componentRef.setInput('returnLabel', 'my projects');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders overview by default with accessible tabs', async () => {
    const compiled = await render();

    expect(compiled.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Overview',
    );
    expect(compiled.textContent).toContain('Curatorial specimen access');
    expect(compiled.textContent).toContain('Review object handling');
    expect(compiled.textContent).toContain('Alice Ferreira');
    expect(compiled.textContent).toContain('Carol Souza');
    expect(compiled.querySelector('#overview-panel')).not.toBeNull();
  });

  it('switches to the tasks tab and shows the cancel task', async () => {
    const compiled = await render();

    tabByName(compiled, 'Tasks').click();
    componentRef.changeDetectorRef.detectChanges();

    expect(compiled.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toContain(
      'Tasks',
    );
    expect(compiled.querySelector('#tasks-panel')).not.toBeNull();
    expect(compiled.textContent).toContain('Cancel project');
    expect(buttonByText(compiled, 'Cancel project').disabled).toBe(false);
  });

  it('disables the cancel task when project actions do not allow it', async () => {
    projectService.project = {
      ...PROJECT,
      status: 'COMPLETED',
      actions: { ...PROJECT.actions, canCancel: false },
    };

    const compiled = await render();
    tabByName(compiled, 'Tasks').click();
    componentRef.changeDetectorRef.detectChanges();

    expect(compiled.textContent).toContain('This task is unavailable for the current status.');
    expect(buttonByText(compiled, 'Cancel project').disabled).toBe(true);
  });

  it('keeps the cancel task available for cancellable projects when actions are absent', async () => {
    const projectWithoutActions: Record<string, unknown> = { ...PROJECT };
    delete projectWithoutActions['actions'];
    projectService.project = projectWithoutActions as unknown as CollectionUseProjectDetail;

    const compiled = await render();
    tabByName(compiled, 'Tasks').click();
    componentRef.changeDetectorRef.detectChanges();

    expect(buttonByText(compiled, 'Cancel project').disabled).toBe(false);
  });

  it('confirms cancellation and navigates to cancelled projects', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const compiled = await render();

    tabByName(compiled, 'Tasks').click();
    componentRef.changeDetectorRef.detectChanges();
    buttonByText(compiled, 'Cancel project').click();
    componentRef.changeDetectorRef.detectChanges();

    expect(compiled.textContent).toContain('Cancel project?');

    buttonByText(compiled, 'Cancel project').click();
    await componentRef.changeDetectorRef.detectChanges();
    await new Promise<void>((resolve) => setTimeout(resolve));

    expect(projectService.cancelled).toEqual([
      { projectId: PROJECT.id, reason: 'Cancelled from curatorial project detail.' },
    ]);
    expect(navigateSpy).toHaveBeenCalledWith(['/p/collections/projects/cancelled']);
  });
});

function tabByName(root: HTMLElement, name: 'Overview' | 'Tasks'): HTMLButtonElement {
  const tab = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]')).find((item) =>
    item.textContent?.includes(name),
  );
  expect(tab).not.toBeNull();
  return tab!;
}

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement {
  const button = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((item) =>
    item.textContent?.includes(text),
  );
  expect(button).not.toBeNull();
  return button!;
}
