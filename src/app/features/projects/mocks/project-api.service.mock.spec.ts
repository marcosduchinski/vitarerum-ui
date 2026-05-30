import { firstValueFrom } from 'rxjs';

import { ProjectApiServiceMock } from './project-api.service.mock';

describe('ProjectApiServiceMock', () => {
  let service: ProjectApiServiceMock;

  beforeEach(() => {
    service = new ProjectApiServiceMock();
  });

  it('returns seeded projects on list', async () => {
    const page = await firstValueFrom(service.listProjects());
    expect(page.totalElements).toBeGreaterThan(0);
  });

  it('transitions ACCEPTED → IN_PROGRESS and updates event log', async () => {
    const result = await firstValueFrom(service.startProject('proj-4', { note: 'Starting access.' }));
    expect(result.status).toBe('IN_PROGRESS');

    const detail = await firstValueFrom(service.getProject('proj-4'));
    expect(detail.status).toBe('IN_PROGRESS');

    const events = await firstValueFrom(service.listEvents('proj-4'));
    const last = events.content[events.content.length - 1];
    expect(last.type).toBe('STARTED');
  });

  it('suspends and resumes a project', async () => {
    const r1 = await firstValueFrom(service.suspendProject('proj-5', { reason: 'Temporary hold.' }));
    expect(r1.status).toBe('SUSPENDED');

    const r2 = await firstValueFrom(service.resumeProject('proj-5', { note: 'Resuming.' }));
    expect(r2.status).toBe('IN_PROGRESS');
  });

  it('creates an entry and lists it', async () => {
    const entry = await firstValueFrom(service.createEntry('proj-4', { content: 'Session note.' }));
    expect(entry.id).toBeTruthy();
    expect(entry.content).toBe('Session note.');

    const page = await firstValueFrom(service.listEntries('proj-4'));
    expect(page.content.some(e => e.id === entry.id)).toBe(true);
  });

  it('filters projects by status', async () => {
    const page = await firstValueFrom(service.listProjects({ status: 'IN_PROGRESS' }));
    expect(page.content.every(p => p.status === 'IN_PROGRESS')).toBe(true);
  });
});
