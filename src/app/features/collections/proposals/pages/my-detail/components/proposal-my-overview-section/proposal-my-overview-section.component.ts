import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import {
  StatusChipComponent,
  WorkflowStatus,
} from '@shared/components/status-chip/status-chip.component';

import { ProposalDetail } from '../../../../models/proposal.model';
import { formatProposalMyDetailDateTime } from '../../proposal-my-detail.presentation';

@Component({
  selector: 'app-proposal-my-overview-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusChipComponent],
  templateUrl: './proposal-my-overview-section.component.html',
  styleUrl: './proposal-my-overview-section.component.scss',
})
export class ProposalMyOverviewSectionComponent {
  readonly proposal = input.required<ProposalDetail>();

  protected readonly formatDateTime = formatProposalMyDetailDateTime;

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }
}
