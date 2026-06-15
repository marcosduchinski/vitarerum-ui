import { ComponentRef, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { CollectionUseProjectDetail, ProjectEventsPage } from '../../models/project.model';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectDetailPageComponent } from './project-detail-page.component';

let currentProject: CollectionUseProjectDetail;
let currentSession: ReturnType<typeof signal<{ group: string } | null>>;

class IdentityServiceStub {
  readonly session = currentSession.asReadonly();
  readonly isAuthenticated = signal(true).asReadonly();
}

const PROJECT: CollectionUseProjectDetail = {
  id: 'proj-12',
  referenceNumber: 'VR-2026-012',
  title: 'Atlantic forest zoology specimens',
  purpose: 'Comparative study of specimen records.',
  type: 'IN_SITU_VISIT',
  status: 'CREATED',
  beginDate: '2026-07-01',
  endDate: '2026-12-31',
  requestedBy: {
    permissionId: 'perm-alice',
    user: { id: 'u-alice', name: 'Alice Ferreira', email: 'alice@ext.example.com' },
    group: 'EXTERNAL',
  },
  proposal: {
    id: 'prop-12',
    status: 'APPROVED',
    assignedTo: {
      permissionId: 'perm-bob',
      user: { id: 'u-bob', name: 'Bob Santos', email: 'bob@collections.example.com' },
      group: 'COLLECTIONS_MANAGEMENT',
    },
  },
};

const EVENTS_PAGE: ProjectEventsPage = {
  projectId: 'proj-12',
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
  getProject(_id: string) {
    return of(currentProject);
  }
  listEvents(_id: string) {
    return of(EVENTS_PAGE);
  }
  startProject(_id: string, _r: unknown) {
    return of({
      id: _id,
      referenceNumber: 'VR-2026-012',
      status: 'IN_PROGRESS' as const,
      result: null,
      lastEvent: EVENTS_PAGE.content[0],
    });
  }
  completeProject(_id: string, _r: unknown) {
    return of({
      id: _id,
      referenceNumber: 'VR-2026-012',
      status: 'COMPLETED' as const,
      result: 'COMPLETED' as const,
      lastEvent: EVENTS_PAGE.content[0],
    });
  }
  cancelProject(_id: string, _r: unknown) {
    return of({
      id: _id,
      referenceNumber: 'VR-2026-012',
      status: 'CANCELLED' as const,
      result: 'CANCELLED' as const,
      lastEvent: EVENTS_PAGE.content[0],
    });
  }
}

describe('ProjectDetailPageComponent', () => {
  let componentRef: ComponentRef<ProjectDetailPageComponent>;

  beforeEach(async () => {
    currentProject = { ...PROJECT };
    currentSession = signal<{ group: string } | null>({ group: 'COLLECTIONS_MANAGEMENT' });

    await TestBed.configureTestingModule({
      imports: [ProjectDetailPageComponent],
      providers: [
        provideRouter([]),
        { provide: PROJECT_API_SERVICE, useClass: ProjectApiServiceStub },
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceStub },
      ],
    }).compileComponents();
  });

  it('renders project overview with reference, title, status and events', async () => {
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('VR-2026-012');
    expect(text).toContain('Atlantic forest zoology specimens');
    expect(text).toContain('Alice Ferreira');
    expect(text).toContain('Bob Santos');
    expect(text).toContain('REQUESTED');
  });

  it('renders nullable researcher-only requester details without failing', async () => {
    currentProject = { ...PROJECT, requestedBy: null };
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Requested by');
    expect(text).toContain('—');
  });

  it('shows Start project button when CREATED', async () => {
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).map((b) => b.textContent?.trim());
    expect(buttons.some((t) => t?.includes('Start project'))).toBe(true);
  });

  it('uses safe return inputs for the back link', () => {
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    componentRef.setInput('returnTo', '/p/collections/projects/pending');
    componentRef.setInput('returnLabel', 'pending projects');
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('a[href="/p/collections/projects/pending"]')).not.toBeNull();
    expect(el.textContent).toContain('Back to pending projects');
  });

  it('lets staff open the log for created and cancelled projects', async () => {
    currentProject = { ...PROJECT, status: 'CANCELLED', result: 'CANCELLED' };
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(
      (link) => link.textContent?.trim(),
    );

    expect(links.some((text) => text?.includes('Open log'))).toBe(true);
  });

  it('blocks external researchers from opening the log before the project is in progress', async () => {
    currentSession.set({ group: 'EXTERNAL' });
    currentProject = { ...PROJECT, status: 'CREATED' };
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).not.toContain('Open log');
    expect(text).toContain('Log is available once the project is in progress.');
  });

  it('lets external researchers open the log while the project is in progress', async () => {
    currentSession.set({ group: 'EXTERNAL' });
    currentProject = { ...PROJECT, status: 'IN_PROGRESS' };
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Open log');
  });
});
