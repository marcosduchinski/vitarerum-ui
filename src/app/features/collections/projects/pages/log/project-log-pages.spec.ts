import { ComponentRef, Type } from '@angular/core';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { MOCK_SEED, MockProjectState, TEST_SEED } from '@features/collections/proposals/mocks/mock-data';

import { ProjectApiServiceMock } from '../../mocks/project-api.service.mock';
import { PROJECT_API_SERVICE } from '../../services/project-api.service';
import { ProjectExhibitionLogPageComponent } from './project-exhibition-log-page.component';
import { ProjectOtherLogPageComponent } from './project-other-log-page.component';
import { ProjectResearchLogPageComponent } from './project-research-log-page.component';

const identityStub = {
  session: signal({
    accessToken: 'mock-token',
    user: { id: 'u-carol', email: 'carol@curatorial.example.com', displayName: 'Carol Souza' },
    group: 'CURATORIAL' as const,
    availableGroups: ['CURATORIAL' as const],
  }).asReadonly(),
  isAuthenticated: signal(true).asReadonly(),
  signIn: () => {},
  signOut: () => {},
  getAccessToken: () => 'mock-token',
  setGroup: () => {},
  updateAvailableGroups: () => {},
};

describe('project log pages', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
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
  expect(text).toContain('Object log');
  expect(text).toContain('Object occurrences');
  return text;
}
