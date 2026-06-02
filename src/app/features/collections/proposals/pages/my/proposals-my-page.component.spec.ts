import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import { UserDetail } from '@core/auth/models/user.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { Page } from '@shared/models/page.model';

import { ProposalListQuery, ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalsMyPageComponent } from './proposals-my-page.component';

const SESSION: IdentitySession = {
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
  status: 'UNDER_REVIEW',
  type: 'RESEARCH',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  assignedTo: {
    permissionId: 'permission-staff',
    user: { id: 'staff-1', name: 'Bob Santos', email: 'bob@example.test' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  collectionUseProject: {
    id: 'project-1',
    referenceNumber: 'VR-2026-001',
    title: 'Photographic history of Rio de Janeiro port, 1890-1930',
    status: 'REQUESTED',
  },
  submittedAt: '2026-05-01T10:00:00',
};

const STAFF_USERS: Page<UserDetail> = {
  content: [
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
    {
      id: 'staff-2',
      name: 'Carol Lima',
      email: 'carol@example.test',
      permissions: [
        {
          permissionId: 'permission-curatorial',
          group: { id: 'group-curatorial', name: 'CURATORIAL' },
        },
      ],
    },
  ],
  page: 0,
  size: 100,
  totalElements: 2,
  totalPages: 1,
};

class IdentityServiceStub implements IdentityService {
  private readonly sessionState = signal<IdentitySession | null>(SESSION);

  readonly session = this.sessionState.asReadonly();
  readonly isAuthenticated = signal(true).asReadonly();

  signIn(): void {}

  signOut(): void {
    this.sessionState.set(null);
  }

  getAccessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  setGroup(): void {}

  updateAvailableGroups(): void {}
}

class ProposalApiServiceStub {
  readonly queries: ProposalListQuery[] = [];
  readonly forwardCalls: Array<{
    readonly proposalId: string;
    readonly payload: { readonly targetPermissionId: string; readonly note: string };
  }> = [];

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

  forwardProposal(
    proposalId: string,
    payload: { readonly targetPermissionId: string; readonly note: string },
  ) {
    this.forwardCalls.push({ proposalId, payload });
    return of(PROPOSAL);
  }
}

class UserManagementServiceStub {
  listUsers() {
    return of(STAFF_USERS);
  }
}

describe('ProposalsMyPageComponent', () => {
  let proposalService: ProposalApiServiceStub;

  beforeEach(async () => {
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
  });

  it('lists only proposals assigned to the logged user permission', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.queries.at(-1)).toMatchObject({
      assignedTo: 'permission-staff',
      lifecyclePhase: 'PENDING',
      page: 0,
      size: 20,
      search: '',
    });
  });

  it('keeps the search controls and detail navigation in the replicated list', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#proposals-search')).not.toBeNull();
    expect(compiled.textContent).toContain('Reference');
    expect(compiled.textContent).toContain('Requested by');
    expect(
      compiled.querySelector('a[href^="/p/collections/proposals/my/proposal-1"]'),
    ).not.toBeNull();
    expect(compiled.querySelector('[aria-label="More actions for VR-2026-001"]')).not.toBeNull();
  });

  it('shows forward and view details in the row menu', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const actionButton = compiled.querySelector<HTMLButtonElement>(
      '[aria-label="More actions for VR-2026-001"]',
    );

    expect(actionButton).not.toBeNull();

    actionButton!.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.body.textContent).toContain('Forward');
    expect(document.body.textContent).toContain('View details');
  });

  it('confirms and forwards an assignment from the modal screen', async () => {
    const fixture = TestBed.createComponent(ProposalsMyPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      openForwardModal(proposalId: string): void;
    };
    const compiled = fixture.nativeElement as HTMLElement;

    component.openForwardModal('proposal-1');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const dialog = compiled.querySelector<HTMLElement>('[role="dialog"]');
    const select = compiled.querySelector<HTMLSelectElement>('#forward-modal-target');
    const note = compiled.querySelector<HTMLTextAreaElement>('#forward-modal-note');
    const submit = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Forward',
    );

    expect(compiled.querySelector('.forward-panel-row')).toBeNull();
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('VR-2026-001');
    expect(select).not.toBeNull();
    expect(note).not.toBeNull();
    expect(submit).not.toBeNull();
    expect(submit!.disabled).toBe(true);

    select!.value = 'permission-curatorial';
    select!.dispatchEvent(new Event('change'));
    note!.value = 'Please review the curatorial aspects.';
    note!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(submit!.disabled).toBe(false);

    submit!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.forwardCalls).toEqual([]);
    expect(compiled.textContent).toContain('Forward assignment?');
    expect(compiled.textContent).toContain('This will move VR-2026-001 to Carol Lima');

    const confirm = Array.from(compiled.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Forward assignment',
    );

    expect(confirm).not.toBeNull();

    confirm!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise<void>((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(proposalService.forwardCalls).toEqual([
      {
        proposalId: 'proposal-1',
        payload: {
          targetPermissionId: 'permission-curatorial',
          note: 'Please review the curatorial aspects.',
        },
      },
    ]);
    expect(compiled.textContent).toContain('Assignment forwarded');
    expect(compiled.textContent).toContain('VR-2026-001 was forwarded to Carol Lima');
  });
});
