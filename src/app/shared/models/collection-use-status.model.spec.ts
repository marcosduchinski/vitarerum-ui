import {
  getProjectLifecyclePhase,
  getProposalLifecyclePhase,
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

  it('maps every proposal status to the proposal lifecycle phase model', () => {
    expect(getProposalLifecyclePhase('SUBMITTED')).toBe('SUBMITTED');
    expect(getProposalLifecyclePhase('PENDING_DOCUMENTS')).toBe('PENDING');
    expect(getProposalLifecyclePhase('PENDING')).toBe('PENDING');
    expect(getProposalLifecyclePhase('PENDING_DIRECTION')).toBe('PENDING');
    expect(getProposalLifecyclePhase('APPROVED')).toBe('APPROVED');
    expect(getProposalLifecyclePhase('REJECTED')).toBe('REJECTED');
    expect(getProposalLifecyclePhase('CANCELLED')).toBe('REJECTED');
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

  it('maps every project status to the project lifecycle phase model', () => {
    expect(getProjectLifecyclePhase('REQUESTED')).toBe('CREATED');
    expect(getProjectLifecyclePhase('ACCEPTED')).toBe('CREATED');
    expect(getProjectLifecyclePhase('REFUSED')).toBe('CANCELLED');
    expect(getProjectLifecyclePhase('IN_PROGRESS')).toBe('IN_PROGRESS');
    expect(getProjectLifecyclePhase('SUSPENDED')).toBe('IN_PROGRESS');
    expect(getProjectLifecyclePhase('COMPLETED')).toBe('COMPLETED');
    expect(getProjectLifecyclePhase('CANCELLED')).toBe('CANCELLED');
    expect(getProjectLifecyclePhase('CLOSED')).toBe('COMPLETED');
  });
});
