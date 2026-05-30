import { firstValueFrom } from 'rxjs';

import { ProposalApiServiceMock } from './proposal-api.service.mock';

describe('ProposalApiServiceMock', () => {
  let service: ProposalApiServiceMock;

  beforeEach(() => {
    service = new ProposalApiServiceMock();
  });

  it('returns seeded proposals on list', async () => {
    const page = await firstValueFrom(service.listProposals());
    expect(page.totalElements).toBeGreaterThan(0);
    expect(page.content.length).toBeGreaterThan(0);
  });

  it('returns a proposal detail by id', async () => {
    const p = await firstValueFrom(service.getProposal('prop-1'));
    expect(p.id).toBe('prop-1');
    expect(p.status).toBe('SUBMITTED');
  });

  it('transitions to APPROVED and updates event log', async () => {
    const result = await firstValueFrom(service.approveProposal('prop-3', { note: 'Looks good' }));
    expect(result.proposal.status).toBe('APPROVED');
    expect(result.collectionUseProject.status).toBe('ACCEPTED');

    const events = await firstValueFrom(service.listEvents('prop-3'));
    const last = events.content[events.content.length - 1];
    expect(last.type).toBe('APPROVED');
  });

  it('transitions to PENDING_DOCUMENTS via requestDocuments', async () => {
    const result = await firstValueFrom(
      service.requestDocuments('prop-1', {
        requiredDocuments: [{ type: 'FORM_A', description: 'Fill in form A' }],
        note: 'Please submit',
      }),
    );
    expect(result.status).toBe('PENDING_DOCUMENTS');
    expect(result.requestedDocuments.length).toBe(1);

    const updated = await firstValueFrom(service.getProposal('prop-1'));
    expect(updated.status).toBe('PENDING_DOCUMENTS');
  });

  it('creates a new proposal and lists it', async () => {
    const created = await firstValueFrom(
      service.createProposal({ title: 'New study', type: 'RESEARCH', purpose: 'Test', beginDate: '2026-07-01', endDate: '2026-12-31' }),
    );
    expect(created.proposal.status).toBe('SUBMITTED');

    const page = await firstValueFrom(service.listProposals());
    const found = page.content.find(p => p.id === created.proposal.id);
    expect(found).toBeDefined();
  });

  it('filters proposals by status', async () => {
    const page = await firstValueFrom(service.listProposals({ status: 'SUBMITTED' }));
    expect(page.content.every(p => p.status === 'SUBMITTED')).toBe(true);
  });

  it('unassigned filter returns only proposals with no assignedTo', async () => {
    const page = await firstValueFrom(service.listProposals({ status: 'SUBMITTED', unassigned: true }));
    expect(page.content.length).toBeGreaterThan(0);
    expect(page.content.every(p => p.assignedTo === null)).toBe(true);
    expect(page.content.every(p => p.status === 'SUBMITTED')).toBe(true);
  });

  it('assume transitions proposal to UNDER_REVIEW and sets assignedTo', async () => {
    const result = await firstValueFrom(service.assignProposal('prop-1', { note: 'Assuming' }));
    expect(result.status).toBe('UNDER_REVIEW');
    expect(result.assignedTo).toBeTruthy();

    const updated = await firstValueFrom(service.getProposal('prop-1'));
    expect(updated.status).toBe('UNDER_REVIEW');
    expect(updated.assignedTo).not.toBeNull();
  });

  it('assume removes proposal from the unassigned-SUBMITTED list', async () => {
    await firstValueFrom(service.assignProposal('prop-1', { note: '' }));

    const page = await firstValueFrom(service.listProposals({ status: 'SUBMITTED', unassigned: true }));
    expect(page.content.find(p => p.id === 'prop-1')).toBeUndefined();
  });

  it('forward transitions proposal to UNDER_REVIEW with target permission', async () => {
    const result = await firstValueFrom(
      service.assignProposal('prop-1', { targetPermissionId: 'perm-carol', note: 'Forwarding to carol' }),
    );
    expect(result.status).toBe('UNDER_REVIEW');
    expect(result.assignedTo.permissionId).toBe('perm-carol');
  });
});
