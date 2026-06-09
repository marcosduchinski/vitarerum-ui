import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { MOCK_SEED, MockProjectState, TEST_SEED } from '../../proposals/mocks/mock-data';
import { ProjectApiServiceMock } from './project-api.service.mock';

describe('ProjectApiServiceMock', () => {
  let service: ProjectApiServiceMock;
  let state: MockProjectState;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProjectApiServiceMock,
        MockProjectState,
        { provide: MOCK_SEED, useValue: TEST_SEED },
        {
          provide: IDENTITY_SERVICE,
          useValue: {
            session: signal({
              accessToken: 'mock-token',
              user: { id: 'u-alice', email: 'alice@ext.example.com', displayName: 'Alice' },
              group: 'EXTERNAL',
              availableGroups: ['EXTERNAL'],
            }).asReadonly(),
            isAuthenticated: signal(true).asReadonly(),
            signIn: () => {},
            signOut: () => {},
            getAccessToken: () => 'mock-token',
            setGroup: () => {},
            updateAvailableGroups: () => {},
          },
        },
      ],
    });

    service = TestBed.inject(ProjectApiServiceMock);
    state = TestBed.inject(MockProjectState);
  });

  it('returns seeded projects on list', async () => {
    const page = await firstValueFrom(service.listProjects());
    expect(page.totalElements).toBeGreaterThan(0);
  });

  it('transitions CREATED → IN_PROGRESS and updates event log', async () => {
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

  it('rejects starting a project that is already in progress', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';

    await expect(
      firstValueFrom(service.startProject('proj-4', { note: 'Too early.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_TRANSITION',
    });
  });

  it('rejects completing a project before it is in progress', async () => {
    await expect(
      firstValueFrom(service.completeProject('proj-4', { note: 'Done too early.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_TRANSITION',
    });
  });

  it('completes an in-progress project', async () => {
    state.projects.get('proj-4')!.status = 'IN_PROGRESS';

    const completed = await firstValueFrom(
      service.completeProject('proj-4', { note: 'Completed.' }),
    );
    expect(completed.status).toBe('COMPLETED');
  });

  it('creates an object log entry and lists it', async () => {
    const entry = await firstValueFrom(
      service.createObjectLogEntry('proj-4', { content: 'Session note.' }),
    );
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('Session note.');

    const page = await firstValueFrom(service.listObjectLogEntries('proj-4'));
    expect(page.content.some((e) => e.id === entry.id)).toBe(true);
  });

  it('creates an object log entry with objects and preserves them', async () => {
    const entry = await firstValueFrom(
      service.createObjectLogEntry('proj-4', {
        content: 'Handled specimens.',
        objects: ['INV-001', 'INV-002'],
      }),
    );
    expect(entry.objects).toHaveLength(2);
    expect(entry.objects[0].inventoryNumber).toBe('INV-001');
    expect(entry.objects[1].inventoryNumber).toBe('INV-002');
  });

  it('creates an object occurrence entry and lists it', async () => {
    const entry = await firstValueFrom(
      service.createObjectOccurrenceEntry('proj-4', { content: 'Occurrence note.' }),
    );
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('Occurrence note.');

    const page = await firstValueFrom(service.listObjectOccurrenceEntries('proj-4'));
    expect(page.content.some((e) => e.id === entry.id)).toBe(true);
  });

  it('filters projects by status', async () => {
    const page = await firstValueFrom(service.listProjects({ status: 'IN_PROGRESS' }));
    expect(page.content.every((p) => p.status === 'IN_PROGRESS')).toBe(true);
  });

  it('has created project examples for proposals', async () => {
    const page = await firstValueFrom(service.listProjects({ status: 'CREATED', size: 20 }));
    expect(page.totalElements).toBeGreaterThan(0);
  });

  it('filters projects to those with proposals assigned to a specific reviewer', async () => {
    const page = await firstValueFrom(service.listProjects({ assignedTo: 'perm-bob', size: 20 }));

    expect(page.totalElements).toBeGreaterThan(0);
    expect(page.content.every((p) => p.proposal.assignedTo?.permissionId === 'perm-bob')).toBe(
      true,
    );
  });

  it('allows createObjectLogEntry on a COMPLETED project (post-completion entries)', async () => {
    state.projects.get('proj-4')!.status = 'COMPLETED';

    const entry = await firstValueFrom(
      service.createObjectLogEntry('proj-4', { content: 'Final report entry.' }),
    );
    expect(entry.content).toBe('Final report entry.');
  });

  it('rejects createObjectLogEntry on a CANCELLED project', async () => {
    state.projects.get('proj-4')!.status = 'CANCELLED';

    await expect(
      firstValueFrom(service.createObjectLogEntry('proj-4', { content: 'Should be rejected.' })),
    ).rejects.toMatchObject({
      status: 409,
      error: 'INVALID_PROJECT_STATUS',
    });
  });

  it('rejects uploadLogEntryAttachment when entry not found', async () => {
    await expect(
      firstValueFrom(
        service.uploadLogEntryAttachment('proj-4', 'no-such-entry', new File(['x'], 'x.jpg'), 'IMAGE'),
      ),
    ).rejects.toMatchObject({
      status: 404,
      error: 'NOT_FOUND',
    });
  });

  it('filters events by type', async () => {
    await firstValueFrom(service.startProject('proj-4', { note: 'Starting.' }));

    const started = await firstValueFrom(service.listEvents('proj-4', { type: 'STARTED' }));
    expect(started.content.every((e) => e.type === 'STARTED')).toBe(true);

    const pending = await firstValueFrom(service.listEvents('proj-4', { type: 'REQUESTED' }));
    expect(pending.content.every((e) => e.type === 'REQUESTED')).toBe(true);
    expect(pending.content.some((e) => e.type === 'STARTED')).toBe(false);
  });

});
