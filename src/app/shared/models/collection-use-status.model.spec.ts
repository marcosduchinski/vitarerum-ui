import {
  getProposalStatusPresentation,
  getUseStatusPresentation,
} from './collection-use-status.model';

describe('collection-use status presentation', () => {
  it('maps proposal statuses to stable labels and tones', () => {
    expect(getProposalStatusPresentation('SUBMITTED')).toEqual({
      label: 'Submitted',
      tone: 'submitted',
    });
    expect(getProposalStatusPresentation('PENDING_DIRECTION')).toEqual({
      label: 'Pending direction',
      tone: 'pending',
    });
    expect(getProposalStatusPresentation('REJECTED')).toEqual({
      label: 'Rejected',
      tone: 'rejected',
    });
  });

  it('maps project statuses to stable labels and tones', () => {
    expect(getUseStatusPresentation('REFUSED')).toEqual({
      label: 'Refused',
      tone: 'rejected',
    });
    expect(getUseStatusPresentation('IN_PROGRESS')).toEqual({
      label: 'In progress',
      tone: 'review',
    });
    expect(getUseStatusPresentation('CLOSED')).toEqual({
      label: 'Closed',
      tone: 'closed',
    });
  });
});
