import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import { ProposalEvent } from '../../../../models/proposal.model';
import { formatProposalMyDetailDateTime } from '../../proposal-my-detail.presentation';

@Component({
  selector: 'app-proposal-my-events-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent],
  templateUrl: './proposal-my-events-section.component.html',
  styleUrl: './proposal-my-events-section.component.scss',
})
export class ProposalMyEventsSectionComponent {
  readonly events = input.required<readonly ProposalEvent[]>();
  readonly loading = input.required<boolean>();

  protected readonly formatDateTime = formatProposalMyDetailDateTime;
}
