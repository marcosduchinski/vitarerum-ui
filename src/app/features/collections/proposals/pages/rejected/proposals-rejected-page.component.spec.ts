import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import { ProposalListQuery, ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalsRejectedPageComponent } from './proposals-rejected-page.component';

const REJECTED_PROPOSAL: ProposalSummary = {
  id: 'proposal-rejected',
  status: 'REJECTED',
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
    title: 'Rejected research request',
    status: 'REFUSED',
  },
  submittedAt: '2026-05-01T10:00:00',
};

const CANCELLED_PROPOSAL: ProposalSummary = {
  ...REJECTED_PROPOSAL,
  id: 'proposal-cancelled',
  status: 'CANCELLED',
  collectionUseProject: {
    ...REJECTED_PROPOSAL.collectionUseProject,
    id: 'project-2',
    referenceNumber: 'VR-2026-002',
    title: 'Cancelled exhibition request',
    status: 'CANCELLED',
  },
  submittedAt: '2026-05-03T10:00:00',
};

class ProposalApiServiceStub {
  readonly queries: ProposalListQuery[] = [];

  listProposals(query: ProposalListQuery = {}) {
    this.queries.push(query);
    const size = query.size ?? 20;
    const content =
      query.status === 'REJECTED'
        ? [REJECTED_PROPOSAL]
        : query.status === 'CANCELLED'
          ? [CANCELLED_PROPOSAL]
          : [];

    return of<Page<ProposalSummary>>({
      content,
      page: query.page ?? 0,
      size,
      totalElements: content.length,
      totalPages: content.length ? 1 : 0,
    });
  }
}

describe('ProposalsRejectedPageComponent', () => {
  let proposalService: ProposalApiServiceStub;

  beforeEach(async () => {
    proposalService = new ProposalApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProposalsRejectedPageComponent],
      providers: [
        provideRouter([]),
        { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
      ],
    }).compileComponents();
  });

  it('fetches rejected and cancelled proposals separately', async () => {
    const fixture = TestBed.createComponent(ProposalsRejectedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.queries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'REJECTED', page: 0, size: 500, search: '' }),
        expect.objectContaining({ status: 'CANCELLED', page: 0, size: 500, search: '' }),
      ]),
    );
  });

  it('renders merged terminal proposals with status chips and detail actions', async () => {
    const fixture = TestBed.createComponent(ProposalsRejectedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#proposals-search')).not.toBeNull();
    expect(compiled.textContent).toContain('Rejected research request');
    expect(compiled.textContent).toContain('Cancelled exhibition request');
    expect(compiled.textContent).toContain('Rejected');
    expect(compiled.textContent).toContain('Cancelled');
    expect(compiled.textContent).toContain('View details');
    expect(
      compiled.querySelector('a[href^="/p/collections/proposals/proposal-rejected"]'),
    ).not.toBeNull();
    expect(
      compiled.querySelector('a[href^="/p/collections/proposals/proposal-cancelled"]'),
    ).not.toBeNull();
  });
});
