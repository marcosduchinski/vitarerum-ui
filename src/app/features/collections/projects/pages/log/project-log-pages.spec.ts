import { ComponentRef, signal, Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import {
  MOCK_SEED,
  MockProjectState,
  TEST_SEED,
} from '@features/collections/proposals/mocks/mock-data';

import { ProjectApiServiceMock } from '../../mocks/project-api.service.mock';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectExhibitionLogPageComponent } from './project-exhibition-log-page.component';
import { ProjectExhibitionOccurrenceLogPageComponent } from './project-exhibition-occurrence-log-page.component';
import { ProjectOccurrenceLogPanelComponent } from './project-occurrence-log-panel.component';
import { ProjectOtherLogPageComponent } from './project-other-log-page.component';
import { ProjectOtherOccurrenceLogPageComponent } from './project-other-occurrence-log-page.component';
import { ProjectObjectLogPanelComponent } from './project-object-log-panel.component';
import { ProjectResearchLogPageComponent } from './project-research-log-page.component';
import { ProjectResearchOccurrenceLogPageComponent } from './project-research-occurrence-log-page.component';

const identitySession = signal<IdentitySession>(curatorialSession());

const identityStub = {
  session: identitySession.asReadonly(),
  isAuthenticated: signal(true).asReadonly(),
  signIn: () => {},
  signOut: () => {},
  getAccessToken: () => 'mock-token',
  setGroup: () => {},
  updateAvailableGroups: () => {},
};

function curatorialSession(): IdentitySession {
  return {
    accessToken: 'mock-token',
    user: { id: 'u-carol', email: 'carol@curatorial.example.com', displayName: 'Carol Souza' },
    group: 'CURATORIAL',
    availableGroups: ['CURATORIAL'],
  };
}

function researcherSession(): IdentitySession {
  return {
    accessToken: 'mock-token',
    user: { id: 'u-hugo', email: 'hugo@research.example.com', displayName: 'Hugo Martins' },
    group: 'EXTERNAL',
    availableGroups: ['EXTERNAL'],
  };
}

describe('project log pages', () => {
  beforeEach(async () => {
    identitySession.set(curatorialSession());
    await TestBed.configureTestingModule({
      imports: [
        ProjectObjectLogPanelComponent,
        ProjectOccurrenceLogPanelComponent,
        ProjectResearchLogPageComponent,
        ProjectResearchOccurrenceLogPageComponent,
        ProjectExhibitionLogPageComponent,
        ProjectExhibitionOccurrenceLogPageComponent,
        ProjectOtherLogPageComponent,
        ProjectOtherOccurrenceLogPageComponent,
      ],
      providers: [
        provideRouter([]),
        MockProjectState,
        { provide: MOCK_SEED, useValue: TEST_SEED },
        { provide: PROJECT_API_SERVICE, useClass: ProjectApiServiceMock },
        { provide: IDENTITY_SERVICE, useValue: identityStub },
      ],
    }).compileComponents();
  });

  it('renders the research access log page', () => {
    expect(render(ProjectResearchLogPageComponent)).toContain('Research log');
  });

  it('renders the research occurrence log page', () => {
    expect(renderOccurrence(ProjectResearchOccurrenceLogPageComponent)).toContain(
      'Research occurrences',
    );
  });

  it('renders the exhibition access log page', () => {
    expect(render(ProjectExhibitionLogPageComponent)).toContain('Exhibition log');
  });

  it('renders the exhibition occurrence log page', () => {
    expect(renderOccurrence(ProjectExhibitionOccurrenceLogPageComponent)).toContain(
      'Exhibition occurrences',
    );
  });

  it('renders the project access log page', () => {
    expect(render(ProjectOtherLogPageComponent)).toContain('Project log');
  });

  it('renders the project occurrence log page', () => {
    expect(renderOccurrence(ProjectOtherOccurrenceLogPageComponent)).toContain(
      'Project occurrences',
    );
  });

  it('enables structured object entry submission when required fields are valid', async () => {
    const state = TestBed.inject(MockProjectState);
    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const submit = root.querySelector<HTMLButtonElement>('.object-entry-form__submit')!;
    expect(submit.disabled).toBe(true);

    root.querySelector<HTMLInputElement>('#object-inventory-number')!.value = 'INV-NEW-001';
    root
      .querySelector<HTMLInputElement>('#object-inventory-number')!
      .dispatchEvent(new Event('input'));
    root.querySelector<HTMLInputElement>('#object-number-of-objects')!.value = '4';
    root
      .querySelector<HTMLInputElement>('#object-number-of-objects')!
      .dispatchEvent(new Event('input'));
    root.querySelector<HTMLTextAreaElement>('#object-observations')!.value = 'Handled in room 2.';
    root
      .querySelector<HTMLTextAreaElement>('#object-observations')!
      .dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(submit.disabled).toBe(false);

    root
      .querySelector<HTMLFormElement>('.object-entry-form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      state.logEntries
        .get('proj-3')
        ?.some((entry) => entry.objectReference.inventoryNumber === 'INV-NEW-001'),
    ).toBe(true);
  });

  it('allows curatorial staff to conclude an open access log', async () => {
    const state = TestBed.inject(MockProjectState);
    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const concludeButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Conclude access log'),
    );
    expect(concludeButton).toBeTruthy();

    concludeButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const confirmButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Conclude log'),
    );
    expect(confirmButton).toBeTruthy();

    confirmButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(state.objectAccessLogs.get('proj-3')?.dateConclusion).toBeTruthy();
  });

  it('uploads attachments for object entries', async () => {
    const state = TestBed.inject(MockProjectState);

    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const manageFilesButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Manage files'),
    );
    expect(manageFilesButton).toBeTruthy();
    expect(manageFilesButton?.getAttribute('aria-expanded')).toBe('false');

    manageFilesButton!.click();
    fixture.detectChanges();

    expect(manageFilesButton?.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('.object-register__details-row')).toBeTruthy();

    const objectFileInput = root.querySelector<HTMLInputElement>(
      'input[aria-label="Object entry file"]',
    )!;
    Object.defineProperty(objectFileInput, 'files', {
      configurable: true,
      value: [new File(['object'], 'object-photo.jpg', { type: 'image/jpeg' })],
    });
    objectFileInput.dispatchEvent(new Event('change'));
    root.querySelector<HTMLSelectElement>('select[aria-label="Object entry media type"]')!.value =
      'IMAGE';
    root
      .querySelector<HTMLSelectElement>('select[aria-label="Object entry media type"]')!
      .dispatchEvent(new Event('change'));
    root
      .querySelector<HTMLFormElement>('form[aria-label="Upload file for INV-ZOO-1892-001"]')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      state.logEntries
        .get('proj-3')
        ?.find((entry) => entry.id === 'entry-101')
        ?.attachments.some((attachment) => attachment.fileName === 'object-photo.jpg'),
    ).toBe(true);
  });

  it('keeps attachments in an expandable row below each object entry', async () => {
    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('.object-register__details-row')).toBeNull();

    const toggle = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Manage files'),
    );
    expect(toggle).toBeTruthy();
    expect(toggle?.getAttribute('aria-controls')).toMatch(/^object-entry-files-/);

    toggle!.click();
    fixture.detectChanges();

    const detailRow = root.querySelector<HTMLTableRowElement>('.object-register__details-row');
    expect(detailRow).toBeTruthy();
    expect(detailRow?.querySelector('td')?.getAttribute('colspan')).toBe('8');
    expect(root.textContent).toContain('Entry files');
    expect(root.querySelector('input[aria-label="Object entry file"]')).toBeTruthy();
  });

  it('locks researcher entry controls when the project is not in progress', async () => {
    identitySession.set(researcherSession());
    const state = TestBed.inject(MockProjectState);
    const project = state.projects.get('proj-3')!;
    state.projects.set('proj-3', { ...project, status: 'COMPLETED' });

    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';
    expect(text).toContain(
      'Researcher entries are only available while the project is in progress.',
    );
    expect(root.querySelector<HTMLInputElement>('#object-inventory-number')?.disabled).toBe(true);
    expect(root.querySelector<HTMLButtonElement>('.object-entry-form__submit')?.disabled).toBe(
      true,
    );
  });

  it('describes locked researcher controls with live status messages', async () => {
    identitySession.set(researcherSession());
    const state = TestBed.inject(MockProjectState);
    const project = state.projects.get('proj-3')!;
    state.projects.set('proj-3', { ...project, status: 'COMPLETED' });

    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('#object-access-lock-message')?.getAttribute('role')).toBe('status');
    expect(
      root
        .querySelector<HTMLInputElement>('#object-inventory-number')
        ?.getAttribute('aria-describedby'),
    ).toBe('object-access-lock-message');
    expect(
      root.querySelector<HTMLTableCaptionElement>('.object-register__table caption'),
    ).toBeTruthy();
  });

  it('locks researcher occurrence controls when the project is not in progress', async () => {
    identitySession.set(researcherSession());
    const state = TestBed.inject(MockProjectState);
    const project = state.projects.get('proj-3')!;
    state.projects.set('proj-3', { ...project, status: 'COMPLETED' });

    const fixture = TestBed.createComponent(ProjectOccurrenceLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const text = root.textContent ?? '';

    expect(text).toContain(
      'Researcher occurrence reports are only available while the project is in progress.',
    );
    expect(root.querySelector<HTMLInputElement>('#occurrence-inventory-number')?.disabled).toBe(
      true,
    );
    expect(root.querySelector<HTMLButtonElement>('.occurrence-entry-form button')?.disabled).toBe(
      true,
    );
    expect(
      root
        .querySelector<HTMLInputElement>('#occurrence-inventory-number')
        ?.getAttribute('aria-describedby'),
    ).toBe('object-occurrence-lock-message');
  });

  it('keeps staff entry controls available outside in-progress projects', async () => {
    const state = TestBed.inject(MockProjectState);
    const project = state.projects.get('proj-3')!;
    state.projects.set('proj-3', { ...project, status: 'COMPLETED' });

    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLInputElement>('#object-inventory-number')!.value = 'INV-STAFF-001';
    root
      .querySelector<HTMLInputElement>('#object-inventory-number')!
      .dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(root.querySelector<HTMLInputElement>('#object-inventory-number')?.disabled).toBe(false);
    expect(root.querySelector<HTMLButtonElement>('.object-entry-form__submit')?.disabled).toBe(
      false,
    );
  });

  it('renders object occurrence logging as a separate journal surface', async () => {
    const fixture = TestBed.createComponent(ProjectOccurrenceLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Object occurrence log');
    expect(root.textContent).toContain('Occurrences Reported');
    expect(root.querySelector('#object-occurrence-log-heading')).toBeTruthy();
    expect(root.querySelector('#occurrence-inventory-number')).toBeTruthy();
    expect(root.textContent).toContain('No object occurrence entries have been added yet.');
  });

  it('registers object occurrence entries with required contract fields', async () => {
    const state = TestBed.inject(MockProjectState);
    const fixture = TestBed.createComponent(ProjectOccurrenceLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const submit = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
      button.textContent?.includes('Register occurrence'),
    )!;
    expect(submit.disabled).toBe(true);

    root.querySelector<HTMLInputElement>('#occurrence-inventory-number')!.value = 'INV-OCC-001';
    root
      .querySelector<HTMLInputElement>('#occurrence-inventory-number')!
      .dispatchEvent(new Event('input'));
    root.querySelector<HTMLInputElement>('#occurrence-number-of-objects')!.value = '2';
    root
      .querySelector<HTMLInputElement>('#occurrence-number-of-objects')!
      .dispatchEvent(new Event('input'));
    root.querySelector<HTMLInputElement>('#occurrence-date')!.value = '2026-06-03T11:30';
    root.querySelector<HTMLInputElement>('#occurrence-date')!.dispatchEvent(new Event('input'));
    root.querySelector<HTMLInputElement>('#occurrence-location')!.value = 'Conservation lab';
    root.querySelector<HTMLInputElement>('#occurrence-location')!.dispatchEvent(new Event('input'));
    root.querySelector<HTMLTextAreaElement>('#occurrence-description')!.value =
      'Surface abrasion reported during handling.';
    root
      .querySelector<HTMLTextAreaElement>('#occurrence-description')!
      .dispatchEvent(new Event('input'));
    root.querySelector<HTMLTextAreaElement>('#occurrence-testimonial')!.value =
      'Observed by the researcher.';
    root
      .querySelector<HTMLTextAreaElement>('#occurrence-testimonial')!
      .dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(submit.disabled).toBe(false);

    root
      .querySelector<HTMLFormElement>('.occurrence-entry-form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const entry = state.occurrenceEntries
      .get('proj-3')
      ?.find((item) => item.objectReference.inventoryNumber === 'INV-OCC-001');
    expect(entry?.numberOfObjects).toBe(2);
    expect(entry?.location).toBe('Conservation lab');
    expect(entry?.reportedBy.permissionId).toBe('perm-carol');
    expect(state.objectOccurrenceLogs.get('proj-3')?.referenceNumber).toMatch(/^OOL-/);
  });

  it('uploads attachments for object occurrence entries from the expanded row', async () => {
    const state = TestBed.inject(MockProjectState);
    const projectService = TestBed.inject(PROJECT_API_SERVICE);
    const entry = await firstValueFrom(
      projectService.createObjectOccurrenceEntry('proj-3', {
        inventoryNumber: 'INV-OCC-002',
        numberOfObjects: 1,
        occurrenceDate: '2026-06-03T11:30',
        location: 'Reading room',
        detailedDescription: 'Occurrence detail.',
      }),
    );

    const fixture = TestBed.createComponent(ProjectOccurrenceLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const headers = Array.from(root.querySelectorAll<HTMLTableCellElement>('thead th')).map(
      (header) => header.textContent?.trim(),
    );
    expect(headers).not.toContain('Files');
    expect(root.querySelector('select[aria-label="Occurrence entry media type"]')).toBeNull();

    const occurrenceToggle = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.getAttribute('aria-controls') === `occurrence-entry-files-${entry.id}`,
    );
    expect(occurrenceToggle).toBeTruthy();
    const toggleButton = occurrenceToggle!;
    expect(toggleButton.classList.contains('occurrence-register__toggle')).toBe(true);
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
    expect(toggleButton.getAttribute('aria-label')).toBe('Show attachments for INV-OCC-002');

    toggleButton.click();
    fixture.detectChanges();

    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
    expect(toggleButton.getAttribute('aria-label')).toBe('Hide attachments for INV-OCC-002');
    expect(root.textContent).toContain('Occurrence files');
    const fileInput = root.querySelector<HTMLInputElement>(
      'input[aria-label="Occurrence entry file"]',
    )!;
    Object.defineProperty(fileInput, 'files', {
      configurable: true,
      value: [new File(['occurrence'], 'occurrence-photo.jpg', { type: 'image/jpeg' })],
    });
    fileInput.dispatchEvent(new Event('change'));
    root
      .querySelector<HTMLFormElement>('form[aria-label="Upload file for occurrence INV-OCC-002"]')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      state.occurrenceEntries
        .get('proj-3')
        ?.find((item) => item.id === entry.id)
        ?.attachments.some((attachment) => attachment.fileName === 'occurrence-photo.jpg'),
    ).toBe(true);
  });

  it('allows curatorial staff to conclude an open occurrence log', async () => {
    const state = TestBed.inject(MockProjectState);
    const projectService = TestBed.inject(PROJECT_API_SERVICE);
    await firstValueFrom(
      projectService.createObjectOccurrenceEntry('proj-3', {
        inventoryNumber: 'INV-OCC-003',
        numberOfObjects: 1,
        occurrenceDate: '2026-06-03T11:30',
        location: 'Reading room',
        detailedDescription: 'Occurrence detail.',
      }),
    );

    const fixture = TestBed.createComponent(ProjectOccurrenceLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const concludeButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Conclude occurrence log'),
    );
    expect(concludeButton).toBeTruthy();

    concludeButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const confirmButton = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Conclude log'),
    );
    expect(confirmButton).toBeTruthy();

    confirmButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(state.objectOccurrenceLogs.get('proj-3')?.dateConclusion).toBeTruthy();
  });
});

function render<T extends { readonly id: () => string }>(component: Type<T>): string {
  const fixture = TestBed.createComponent(component);
  const componentRef: ComponentRef<T> = fixture.componentRef;
  componentRef.setInput('id', 'proj-3');
  fixture.detectChanges();

  const backLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
    '.back-link',
  );
  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

  expect(backLink?.getAttribute('href')).toBe('/p/collections/projects/my');
  expect(text).toContain('Object access log');
  expect(text).not.toContain('Object occurrence log');
  return text;
}

function renderOccurrence<T extends { readonly id: () => string }>(component: Type<T>): string {
  const fixture = TestBed.createComponent(component);
  const componentRef: ComponentRef<T> = fixture.componentRef;
  componentRef.setInput('id', 'proj-3');
  fixture.detectChanges();

  const backLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
    '.back-link',
  );
  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

  expect(backLink?.getAttribute('href')).toBe('/p/collections/projects/my');
  expect(text).toContain('Object occurrence log');
  expect(text).not.toContain('Object access log');
  return text;
}
