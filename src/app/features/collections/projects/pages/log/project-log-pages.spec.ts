import { ComponentRef, signal, Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

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
import { ProjectOtherLogPageComponent } from './project-other-log-page.component';
import { ProjectObjectLogPanelComponent } from './project-object-log-panel.component';
import { ProjectResearchLogPageComponent } from './project-research-log-page.component';

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
        ProjectResearchLogPageComponent,
        ProjectExhibitionLogPageComponent,
        ProjectOtherLogPageComponent,
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

  it('renders the research log page with both panels', () => {
    expect(render(ProjectResearchLogPageComponent)).toContain('Research log');
  });

  it('renders the exhibition log page with both panels', () => {
    expect(render(ProjectExhibitionLogPageComponent)).toContain('Exhibition log');
  });

  it('renders the project log page with both panels', () => {
    expect(render(ProjectOtherLogPageComponent)).toContain('Project log');
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

  it('does not render object occurrence UI on the access log page', async () => {
    const fixture = TestBed.createComponent(ProjectObjectLogPanelComponent);
    fixture.componentRef.setInput('projectId', 'proj-3');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).not.toContain('Object occurrences');
    expect(root.querySelector('.occurrence-journal')).toBeNull();
    expect(root.querySelector('#occurrence-content')).toBeNull();
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
  expect(text).not.toContain('Object occurrences');
  return text;
}
