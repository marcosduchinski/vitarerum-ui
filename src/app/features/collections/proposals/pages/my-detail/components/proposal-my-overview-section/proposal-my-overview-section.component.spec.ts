import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProposalDetail } from '../../../../models/proposal.model';
import { ProposalMyOverviewSectionComponent } from './proposal-my-overview-section.component';

const PROPOSAL: ProposalDetail = {
  id: 'proposal-1',
  status: 'PENDING',
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
  watchers: [],
  conversationId: 'conversation-1',
  documents: [],
  requestedDocuments: [],
};

describe('ProposalMyOverviewSectionComponent', () => {
  it('renders proposal requester, assignee, submitted date, and project status', async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalMyOverviewSectionComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ProposalMyOverviewSectionComponent);
    const componentRef: ComponentRef<ProposalMyOverviewSectionComponent> = fixture.componentRef;

    componentRef.setInput('proposal', PROPOSAL);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Overview');
    expect(compiled.textContent).toContain('Alice Ferreira');
    expect(compiled.textContent).toContain('alice@example.test');
    expect(compiled.textContent).toContain('Bob Santos');
    expect(compiled.textContent).toContain('01 May 2026');
    expect(compiled.textContent).toContain('Requested');
  });
});
