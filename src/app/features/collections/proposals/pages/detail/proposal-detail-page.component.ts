import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { toApiError } from '@core/http/api-error.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { StatusChipComponent, WorkflowStatus } from '@shared/components/status-chip/status-chip.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const TYPE_LABELS: Record<UseType, string> = {
  EXHIBITION: 'Exhibition',
  RESEARCH: 'Research',
  OTHER: 'Other',
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

@Component({
  selector: 'app-proposal-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorMessageComponent, StatusChipComponent],
  templateUrl: './proposal-detail-page.component.html',
  styleUrl: './proposal-detail-page.component.scss',
})
export class ProposalDetailPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);

  readonly id = input.required<string>();

  protected readonly proposalResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.getProposal(params)),
  });

  protected readonly conversationResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.getConversation(params)),
  });

  protected readonly eventsResource = resource({
    params: () => this.id(),
    loader: ({ params }) => firstValueFrom(this.proposalService.listEvents(params)),
  });

  protected readonly proposal = computed(() => this.proposalResource.value() ?? null);
  protected readonly messages = computed(() => this.conversationResource.value()?.messages ?? []);
  protected readonly events = computed(() => this.eventsResource.value()?.content ?? []);

  protected readonly proposalError = computed(() => {
    const err = this.proposalResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly typeLabels = TYPE_LABELS;
  protected readonly formatDate = formatDate;
  protected readonly formatDateTime = formatDateTime;

  protected asWorkflowStatus(value: string): WorkflowStatus {
    return value as WorkflowStatus;
  }
}
