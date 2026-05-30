export type UseType = 'EXHIBITION' | 'RESEARCH' | 'OTHER';

export type ProposalStatus =
  | 'SUBMITTED'
  | 'PENDING_DOCUMENTS'
  | 'UNDER_REVIEW'
  | 'PENDING_DIRECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ProposalEventType =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'FORWARDED'
  | 'DOCUMENTS_REQUESTED'
  | 'DOCUMENTS_SUBMITTED'
  | 'REVIEW_STARTED'
  | 'REFERRED_TO_DIRECTION'
  | 'DIRECTION_CLARIFIED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export type UseStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'IN_PROGRESS'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type UseResult = 'COMPLETED' | 'CANCELLED';

export type UseEventType =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'STARTED'
  | 'SUSPENDED'
  | 'RESUMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'CLOSED';

export type MediaType = 'DOCUMENT' | 'IMAGE' | 'VIDEO' | 'OTHER';

export type StatusTone = 'approved' | 'closed' | 'pending' | 'rejected' | 'review' | 'submitted';

export interface StatusPresentation {
  readonly label: string;
  readonly tone: StatusTone;
}

const PROPOSAL_STATUS_PRESENTATION = {
  SUBMITTED: { label: 'Submitted', tone: 'submitted' },
  PENDING_DOCUMENTS: { label: 'Pending documents', tone: 'pending' },
  UNDER_REVIEW: { label: 'Under review', tone: 'review' },
  PENDING_DIRECTION: { label: 'Pending direction', tone: 'pending' },
  APPROVED: { label: 'Approved', tone: 'approved' },
  REJECTED: { label: 'Rejected', tone: 'rejected' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
} as const satisfies Record<ProposalStatus, StatusPresentation>;

const USE_STATUS_PRESENTATION = {
  REQUESTED: { label: 'Requested', tone: 'submitted' },
  ACCEPTED: { label: 'Accepted', tone: 'approved' },
  REFUSED: { label: 'Refused', tone: 'rejected' },
  IN_PROGRESS: { label: 'In progress', tone: 'review' },
  SUSPENDED: { label: 'Suspended', tone: 'pending' },
  COMPLETED: { label: 'Completed', tone: 'approved' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
  CLOSED: { label: 'Closed', tone: 'closed' },
} as const satisfies Record<UseStatus, StatusPresentation>;

export function getProposalStatusPresentation(status: ProposalStatus): StatusPresentation {
  return PROPOSAL_STATUS_PRESENTATION[status];
}

export function getUseStatusPresentation(status: UseStatus): StatusPresentation {
  return USE_STATUS_PRESENTATION[status];
}
