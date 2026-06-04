export type UseType = 'EXHIBITION' | 'RESEARCH' | 'OTHER';

export type ProposalStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ProposalLifecyclePhase = 'SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ProposalEventType =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'FORWARDED'
  | 'DOCUMENTS_REQUESTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'REFERRED_TO_DIRECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type UseStatus = 'CREATED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type UseEventType =
  | 'CREATED'
  | 'STARTED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'LOGGED_UPDATE'
  | 'LOGGED_INCIDENT';

export type MediaType = 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'OTHER';

export type StatusTone = 'approved' | 'closed' | 'pending' | 'rejected' | 'review' | 'submitted';

export interface StatusPresentation {
  readonly label: string;
  readonly tone: StatusTone;
}

const PROPOSAL_STATUS_PRESENTATION = {
  SUBMITTED: { label: 'Submitted', tone: 'submitted' },
  UNDER_REVIEW: { label: 'Under review', tone: 'review' },
  APPROVED: { label: 'Approved', tone: 'approved' },
  REJECTED: { label: 'Rejected', tone: 'rejected' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
} as const satisfies Record<ProposalStatus, StatusPresentation>;

const PROPOSAL_LIFECYCLE_PHASES = {
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'REJECTED',
} as const satisfies Record<ProposalStatus, ProposalLifecyclePhase>;

const USE_STATUS_PRESENTATION = {
  CREATED: { label: 'Created', tone: 'submitted' },
  IN_PROGRESS: { label: 'In progress', tone: 'review' },
  COMPLETED: { label: 'Completed', tone: 'approved' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
} as const satisfies Record<UseStatus, StatusPresentation>;

export function getProposalStatusPresentation(status: ProposalStatus): StatusPresentation {
  return PROPOSAL_STATUS_PRESENTATION[status];
}

export function getProposalLifecyclePhase(status: ProposalStatus): ProposalLifecyclePhase {
  return PROPOSAL_LIFECYCLE_PHASES[status];
}

export function getUseStatusPresentation(status: UseStatus): StatusPresentation {
  return USE_STATUS_PRESENTATION[status];
}
