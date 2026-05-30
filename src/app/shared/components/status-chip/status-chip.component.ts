import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type WorkflowStatusKind = 'proposal' | 'project';

export type WorkflowStatus =
  | 'SUBMITTED'
  | 'PENDING_DOCUMENTS'
  | 'UNDER_REVIEW'
  | 'PENDING_DIRECTION'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'IN_PROGRESS'
  | 'SUSPENDED'
  | 'COMPLETED'
  | 'CLOSED';

interface StatusPresentation {
  label: string;
  tone: 'approved' | 'closed' | 'pending' | 'rejected' | 'review' | 'submitted';
}

const STATUS_PRESENTATION = {
  SUBMITTED: { label: 'Submitted', tone: 'submitted' },
  PENDING_DOCUMENTS: { label: 'Pending documents', tone: 'pending' },
  UNDER_REVIEW: { label: 'Under review', tone: 'review' },
  PENDING_DIRECTION: { label: 'Pending direction', tone: 'pending' },
  APPROVED: { label: 'Approved', tone: 'approved' },
  REJECTED: { label: 'Rejected', tone: 'rejected' },
  CANCELLED: { label: 'Cancelled', tone: 'closed' },
  REQUESTED: { label: 'Requested', tone: 'submitted' },
  ACCEPTED: { label: 'Accepted', tone: 'approved' },
  REFUSED: { label: 'Refused', tone: 'rejected' },
  IN_PROGRESS: { label: 'In progress', tone: 'review' },
  SUSPENDED: { label: 'Suspended', tone: 'pending' },
  COMPLETED: { label: 'Completed', tone: 'approved' },
  CLOSED: { label: 'Closed', tone: 'closed' },
} as const satisfies Record<WorkflowStatus, StatusPresentation>;

export function getWorkflowStatusPresentation(status: WorkflowStatus): StatusPresentation {
  return STATUS_PRESENTATION[status];
}

@Component({
  selector: 'app-status-chip',
  standalone: true,
  templateUrl: './status-chip.component.html',
  styleUrl: './status-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusChipComponent {
  readonly kind = input.required<WorkflowStatusKind>();
  readonly status = input.required<WorkflowStatus>();

  protected readonly presentation = computed(() => getWorkflowStatusPresentation(this.status()));
  protected readonly chipClass = computed(() => `status-chip status-chip--${this.presentation().tone}`);
  protected readonly ariaLabel = computed(
    () => `${this.kind() === 'proposal' ? 'Proposal' : 'Project'} status: ${this.presentation().label}`,
  );
}
