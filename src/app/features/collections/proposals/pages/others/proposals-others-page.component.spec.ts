import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { IDENTITY_SERVICE, IdentityService } from '@core/auth/identity.service';
import { IdentitySession } from '@core/auth/models/identity-session.model';
import { UserDetail } from '@core/auth/models/user.model';
import { USER_MANAGEMENT_SERVICE } from '@features/admin/services/user-management.service';
import { Page } from '@shared/models/page.model';

import { ProposalListQuery, ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalsOthersPageComponent } from './proposals-others-page.component';

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

const OTHER_PROPOSAL: ProposalSummary = {
  id: 'proposal-other',
  status: 'UNDER_REVIEW',
  type: 'RESEARCH',
  requestedBy: {
    permissionId: 'permission-external',
    user: { id: 'user-1', name: 'Alice Ferreira', email: 'alice@example.test' },
    group: 'EXTERNAL',
  },
  assignedTo: {
    permissionId: 'permission-other-staff',
    user: { id: 'staff-2', name: 'Carolina Silva', email: 'carol@example.test' },
    group: 'CURATORIAL',
  },
  collectionUseProject: {
    id: 'project-1',
    referenceNumber: 'VR-2026-001',
    title: 'Photographic history of Rio de Janeiro port, 1890-1930',
    status: 'REQUESTED',
  },
  submittedAt: '2026-05-01T10:00:00',
};

const MY_PROPOSAL: ProposalSummary = {
  ...OTHER_PROPOSAL,
  id: 'proposal-mine',
  assignedTo: {
    permissionId: 'permission-staff',
    user: { id: 'staff-1', name: 'Bob Santos', email: 'bob@example.test' },
    group: 'COLLECTIONS_MANAGEMENT',
  },
  collectionUseProject: {
    ...OTHER_PROPOSAL.collectionUseProject,
    id: 'project-2',
    referenceNumber: 'VR-2026-002',
    title: 'Research assigned to Bob',
  },
};

const UNASSIGNED_PROPOSAL: ProposalSummary = {
  ...OTHER_PROPOSAL,
  id: 'proposal-unassigned',
  assignedTo: null,
  collectionUseProject: {
    ...OTHER_PROPOSAL.collectionUseProject,
    id: 'project-3',
    referenceNumber: 'VR-2026-003',
    title: 'Unassigned request',
  },
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
  ],
  page: 0,
  size: 100,
  totalElements: 1,
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

  listProposals(query: ProposalListQuery = {}) {
    this.queries.push(query);
    const size = query.size ?? 20;

    return of<Page<ProposalSummary>>({
      content: [OTHER_PROPOSAL, MY_PROPOSAL, UNASSIGNED_PROPOSAL],
      page: query.page ?? 0,
      size,
      totalElements: 3,
      totalPages: 1,
    });
  }
}

class UserManagementServiceStub {
  listUsers() {
    return of(STAFF_USERS);
  }
}

describe('ProposalsOthersPageComponent', () => {
  let proposalService: ProposalApiServiceStub;

  beforeEach(async () => {
    proposalService = new ProposalApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProposalsOthersPageComponent],
      providers: [
        provideRouter([]),
        { provide: IDENTITY_SERVICE, useClass: IdentityServiceStub },
        { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
        { provide: USER_MANAGEMENT_SERVICE, useClass: UserManagementServiceStub },
      ],
    }).compileComponents();
  });

  it('fetches assignment candidates and filters out the logged user permission', async () => {
    const fixture = TestBed.createComponent(ProposalsOthersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(proposalService.queries.at(-1)).toMatchObject({
      page: 0,
      size: 500,
      search: '',
    });
    expect(compiled.textContent).toContain('Photographic history of Rio de Janeiro port');
    expect(compiled.textContent).toContain('Carolina Silva');
    expect(compiled.textContent).not.toContain('Research assigned to Bob');
    expect(compiled.textContent).not.toContain('Unassigned request');
  });

  it('keeps the search controls and detail action in the replicated list', async () => {
    const fixture = TestBed.createComponent(ProposalsOthersPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#proposals-search')).not.toBeNull();
    expect(compiled.textContent).toContain('Reference');
    expect(compiled.textContent).toContain('Requested by');
    expect(compiled.textContent).toContain('Assigned to');
    expect(compiled.textContent).toContain('View details');
    expect(compiled.querySelector('a[href="/p/collections/proposals/proposal-other"]')).not.toBeNull();
  });
});
