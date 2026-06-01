import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Page } from '@shared/models/page.model';

import { ProposalListQuery, ProposalSummary } from '../../models/proposal.model';
import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';
import { ProposalsApprovedPageComponent } from './proposals-approved-page.component';

const APPROVED_PROPOSAL: ProposalSummary = {
  id: 'proposal-approved',
  status: 'APPROVED',
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
    title: 'Approved research request',
    status: 'ACCEPTED',
  },
  submittedAt: '2026-05-01T10:00:00',
};

class ProposalApiServiceStub {
  readonly queries: ProposalListQuery[] = [];

  listProposals(query: ProposalListQuery = {}) {
    this.queries.push(query);
    const size = query.size ?? 20;

    return of<Page<ProposalSummary>>({
      content: [APPROVED_PROPOSAL],
      page: query.page ?? 0,
      size,
      totalElements: 1,
      totalPages: 1,
    });
  }
}

describe('ProposalsApprovedPageComponent', () => {
  let proposalService: ProposalApiServiceStub;

  beforeEach(async () => {
    proposalService = new ProposalApiServiceStub();

    await TestBed.configureTestingModule({
      imports: [ProposalsApprovedPageComponent],
      providers: [
        provideRouter([]),
        { provide: PROPOSAL_API_SERVICE, useValue: proposalService },
      ],
    }).compileComponents();
  });

  it('lists approved proposals with the approved status filter', async () => {
    const fixture = TestBed.createComponent(ProposalsApprovedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(proposalService.queries.at(-1)).toMatchObject({
      status: 'APPROVED',
      page: 0,
      size: 20,
      search: '',
    });
  });

  it('renders the terminal proposal table, status, and detail action', async () => {
    const fixture = TestBed.createComponent(ProposalsApprovedPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#proposals-search')).not.toBeNull();
    expect(compiled.textContent).toContain('Reference');
    expect(compiled.textContent).toContain('Assigned to');
    expect(compiled.textContent).toContain('Approved');
    expect(compiled.textContent).toContain('Approved research request');
    expect(compiled.textContent).toContain('View details');
    expect(compiled.querySelector('a[href="/p/collections/proposals/proposal-approved"]')).not.toBeNull();
  });
});
