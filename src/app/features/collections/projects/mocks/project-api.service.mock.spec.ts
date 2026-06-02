import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { MockProjectState } from '../../proposals/mocks/mock-data';
import { ProjectApiServiceMock } from './project-api.service.mock';

describe('ProjectApiServiceMock', () => {
  let service: ProjectApiServiceMock;
  let state: MockProjectState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProjectApiServiceMock],
    });

    service = TestBed.inject(ProjectApiServiceMock);
    state = TestBed.inject(MockProjectState);
  });

  it('returns seeded projects on list', async () => {
    const page = await firstValueFrom(service.listProjects());
    expect(page.totalElements).toBeGreaterThan(0);
  });

  it('transitions ACCEPTED → IN_PROGRESS and updates event log', async () => {
    state.projects.get('proj-4')!.status = 'ACCEPTED';

    const result = await firstValueFrom(
      service.startProject('proj-4', { note: 'Starting access.' }),
    );
    expect(result.status).toBe('IN_PROGRESS');

    const detail = await firstValueFrom(service.getProject('proj-4'));
    expect(detail.status).toBe('IN_PROGRESS');

    const events = await firstValueFrom(service.listEvents('proj-4'));
    const last = events.content[events.content.length - 1];
    expect(last.type).toBe('STARTED');
  });

  it('suspends and resumes a project', async () => {
    state.projects.get('proj-5')!.status = 'IN_PROGRESS';

    const r1 = await firstValueFrom(
      service.suspendProject('proj-5', { reason: 'Temporary hold.' }),
    );
    expect(r1.status).toBe('SUSPENDED');

    const r2 = await firstValueFrom(service.resumeProject('proj-5', { note: 'Resuming.' }));
    expect(r2.status).toBe('IN_PROGRESS');
  });

  it('rejects starting a project that has not been accepted', async () => {
    await expect(
      firstValueFrom(service.startProject('proj-1', { note: 'Too early.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_TRANSITION',
    });
  });

  it('rejects completing a project before it is in progress', async () => {
    state.projects.get('proj-4')!.status = 'ACCEPTED';

    await expect(
      firstValueFrom(service.completeProject('proj-4', { note: 'Done too early.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_TRANSITION',
    });
  });

  it('closes only completed projects', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';

    const completed = await firstValueFrom(
      service.completeProject('proj-4', { note: 'Completed.' }),
    );
    expect(completed.status).toBe('COMPLETED');

    const closed = await firstValueFrom(service.closeProject('proj-4', { note: 'Closed.' }));
    expect(closed.status).toBe('CLOSED');
  });

  it('rejects resuming a project that is not suspended', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';

    await expect(
      firstValueFrom(service.resumeProject('proj-4', { note: 'Already active.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_TRANSITION',
    });
  });

  it('creates an entry and lists it', async () => {
    const entry = await firstValueFrom(service.createEntry('proj-4', { content: 'Session note.' }));
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('Session note.');

    const page = await firstValueFrom(service.listEntries('proj-4'));
    expect(page.content.some((e) => e.id === entry.id)).toBe(true);
  });

  it('filters projects by status', async () => {
    const page = await firstValueFrom(service.listProjects({ status: 'IN_PROGRESS' }));
    expect(page.content.every((p) => p.status === 'IN_PROGRESS')).toBe(true);
  });

  it('has requested project examples for the clean proposal flow', async () => {
    const page = await firstValueFrom(service.listProjects({ status: 'REQUESTED', size: 20 }));
    const types = new Set(page.content.map((p) => p.type));

    expect(page.totalElements).toBe(6);
    expect(types.has('RESEARCH')).toBe(true);
    expect(types.has('EXHIBITION')).toBe(true);
    expect(types.has('OTHER')).toBe(false);
  });

  it('returns no projects for assigned staff before proposals are assigned', async () => {
    const page = await firstValueFrom(service.listProjects({ assignedTo: 'perm-bob', size: 20 }));

    expect(page.totalElements).toBe(0);
    expect(page.content.every((p) => p.proposal.assignedTo?.permissionId === 'perm-bob')).toBe(
      true,
    );
  });

  it('rejects createEntry on a CLOSED project', async () => {
    state.projects.get('proj-4')!.status = 'CLOSED';

    await expect(
      firstValueFrom(service.createEntry('proj-4', { content: 'Should be rejected.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_PROJECT_STATUS',
    });
  });

  it('rejects uploadAttachment on a CLOSED project', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';
    const entry = await firstValueFrom(service.createEntry('proj-4', { content: 'Entry.' }));

    state.projects.get('proj-4')!.status = 'CLOSED';
    await expect(
      firstValueFrom(
        service.uploadAttachment('proj-4', entry.id, new File(['x'], 'x.jpg'), 'IMAGE'),
      ),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_PROJECT_STATUS',
    });
  });

  it('filters entries by group', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';
    await firstValueFrom(service.createEntry('proj-4', { content: 'Researcher entry.' }));

    const externalOnly = await firstValueFrom(
      service.listEntries('proj-4', { group: 'EXTERNAL' }),
    );
    expect(externalOnly.content.every((e) => e.addedBy.group === 'EXTERNAL')).toBe(true);

    const curatorial = await firstValueFrom(
      service.listEntries('proj-4', { group: 'CURATORIAL' }),
    );
    expect(curatorial.content.every((e) => e.addedBy.group === 'CURATORIAL')).toBe(true);
  });

  it('filters events by type', async () => {
    state.projects.get('proj-4')!.status = 'ACCEPTED';
    await firstValueFrom(service.startProject('proj-4', { note: 'Starting.' }));

    const started = await firstValueFrom(service.listEvents('proj-4', { type: 'STARTED' }));
    expect(started.content.every((e) => e.type === 'STARTED')).toBe(true);

    const accepted = await firstValueFrom(service.listEvents('proj-4', { type: 'ACCEPTED' }));
    expect(accepted.content.every((e) => e.type === 'ACCEPTED')).toBe(true);
    expect(accepted.content.some((e) => e.type === 'STARTED')).toBe(false);
  });

  it('matches referenceNumber exactly, not as a prefix', async () => {
    const allProjects = await firstValueFrom(service.listProjects({ size: 50 }));
    const first = allProjects.content[0];

    const exact = await firstValueFrom(
      service.listProjects({ referenceNumber: first.referenceNumber }),
    );
    expect(exact.totalElements).toBe(1);

    const prefix = await firstValueFrom(
      service.listProjects({ referenceNumber: first.referenceNumber.slice(0, 3) }),
    );
    expect(prefix.totalElements).toBe(0);
  });
});
