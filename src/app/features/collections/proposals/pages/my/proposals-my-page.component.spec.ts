import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { GroupName } from '@core/auth/models/group-name.enum';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import { UserDetail } from '@core/auth/models/user.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { Page } from '@shared/models/page.model';

import { ProposalListQuery, ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalsMyPageComponent } from './proposals-my-page.component';

const EXTERNAL_SESSION: IdentitySession = {
  accessToken: 'token',
  user: {
    id: 'user-1',
    email: 'alice@example.test',
    displayName: 'Alice Ferreira',
  },
  group: 'EXTERNAL',
  availableGroups: ['EXTERNAL'],
};

const STAFF_SESSION: IdentitySession = {
  accessToken: 'token',
  user: {
    id: 'staff-1',
    email: 'bob@example.test',
    displayName: 'Bob Santos',
  },
  group: 'COLLECTIONS_MANAGEMENT',
  availableGroups: ['COLLECTIONS_MANAGEMENT'],
};

const PROPOSAL: ProposalSummary = {
  id: 'proposal-1',
  status: 'SUBMITTED',
  type: 'RESEARCH',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  assignedTo: null,
  collectionUseProject: {
    id: 'project-1',
    referenceNumber: 'VR-2026-001',
    title: 'Photographic history of Rio de Janeiro port, 1890-1930',
    status: 'CREATED',
  },
  submittedAt: '2026-05-01T10:00:00',
};

const USERS: Page<UserDetail> = {
  content: [
    {
      id: 'user-1',
      name: 'Alice Ferreira',
      email: 'alice@example.test',
      permissions: [
        {
          permissionId: 'permission-external',
          group: { id: 'group-external', name: 'EXTERNAL' },
        },
      ],
    },
    {
      id: 'staff-1',
      name: 'Bob Santos',
      email: 'bob@example.test',
      permissions: [
        {
          permissionId: 'permission-staff',
          group: { id: 'group-collections', name: 'COLLECTIONS_MANAGEMENT' },
        },
      ],
    },
  ],
  page: 0,
  size: 100,
  totalElements: 2,
  totalPages: 1,
};

let activeSession: IdentitySession = EXTERNAL_SESSION;

class IdentityServiceStub implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(activeSession);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = signal(true).asReadonly();

  signIn(email: string): void {
    const session = this.sessionState();
    this.sessionState.set(
      session
        ? { ...session, user: { ...session.user, email } }
        : {
            accessToken: 'token',
            user: { id: 'signed-in-user', email, displayName: email },
            group: null,
            availableGroups: [],
          },
    );
  }

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  setGroup(group: GroupName): void {
    const session = this.sessionState();
    if (session) this.sessionState.set({ ...session, group });
  }

  updateAvailableGroups(groups: readonly GroupName[]): void {
    const session = this.sessionState();
    if (session) this.sessionState.set({ ...session, availableGroups: [...groups] });
  }
}

class ProposalApiServiceStub {
  readonly queries: ProposalListQuery[] = [];

  listProposals(query: ProposalListQuery = {}) {
    this.queries.push(query);
    const size = query.size ?? 20;

    return of<Page<ProposalSummary>>({
      content: [PROPOSAL],
      page: query.page ?? 0,
      size,
      totalElements: 1,
      totalPages: 1,
    });
  }
}

class UserManagementServiceStub {
  listUsers() {
    return of(USERS);
  }
}

describe('ProposalsMyPageComponent', () => {
  let proposalService: ProposalApiServiceStub;
  let router: Router;

  beforeEach(async () => {
    activeSession = EXTERNAL_SESSION;
    proposalService = new ProposalApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProposalsMyPageComponent],
      providers: [
        provideRouter([]),
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceStub },
        { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
        { provide: USER_MANAGEMENT_SERVICE, useClass: UserManagementServiceStub },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
  });

  it('queries proposals by requestedBy for any group', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.queries.at(-1)).toMatchObject({
      requestedBy: 'permission-external',
      page: 0,
      size: 20,
      search: '',
    });
    expect(proposalService.queries.at(-1)).not.toHaveProperty('assignedTo');
    expect(proposalService.queries.at(-1)).not.toHaveProperty('lifecyclePhase');
  });

  it('also queries by requestedBy for staff groups', async () => {
    activeSession = STAFF_SESSION;

    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.queries.at(-1)).toMatchObject({
      requestedBy: 'permission-staff',
    });
    expect(proposalService.queries.at(-1)).not.toHaveProperty('assignedTo');
  });

  it('renders the proposals list with a link to the generic detail page', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#proposals-search')).not.toBeNull();
    expect(compiled.textContent).toContain('My proposals');
    expect(compiled.textContent).toContain('Reference');
    expect(
      compiled.querySelector('a[href^="/p/collections/proposals/proposal-1"]'),
    ).not.toBeNull();
    expect(compiled.querySelector('a[href^="/p/collections/proposals/my/proposal-1"]')).toBeNull();
    expect(compiled.querySelector('[aria-label="More actions for VR-2026-001"]')).not.toBeNull();
  });

  it('navigates to the generic detail page with returnTo on view details', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="More actions for VR-2026-001"]',
    );

    actionButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    menuItemByText('View details').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledWith(['/p/collections/proposals', PROPOSAL.id], {
      queryParams: {
        returnTo: '/p/collections/proposals/my',
        returnLabel: 'my proposals',
      },
    });
  });

  it('does not show a Forward action in the row menu', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="More actions for VR-2026-001"]',
    );

    actionButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.textContent).not.toContain('Forward');
    expect(document.body.textContent).toContain('View details');
  });
});

function menuItemByText(text: string): HTMLElement {
  const item = Array.from(
    document.body.querySelectorAll<HTMLElement>('.p-menu a, .p-menu button'),
  ).find((candidate) => candidate.textContent?.trim() === text);

  if (!(item instanceof HTMLElement)) {
    throw new Error(`Menu item not found: ${text}`);
  }

  return item;
}
