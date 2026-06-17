import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  resource,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { IntendedUse } from '@shared/models/collection-use-status.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';
import { PROPOSAL_API_SERVICE } from '@features/collections/proposals/services/proposal-api.service';
import { ProposalDetail } from '@features/collections/proposals/models/proposal.model';

import { IntendedUseSuggestion } from '../../models/proposal-chat.model';
import { PROPOSAL_CHAT_SERVICE } from '../../services/proposal-chat.service';

@Component({
  selector: 'app-proposal-chat-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorMessageComponent],
  templateUrl: './proposal-chat-panel.component.html',
  styleUrl: './proposal-chat-panel.component.scss',
})
export class ProposalChatPanelComponent {
  private readonly proposalChat = inject(PROPOSAL_CHAT_SERVICE);
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);

  readonly conversationId = input.required<string>();
  readonly messageId = input.required<string>();
  readonly embedded = input(false);
  // Overridable so tests can disable the short "model is thinking" pause.
  readonly thinkingDelayMs = input(650);
  readonly applied = output<ProposalDetail>();

  protected readonly contextResource = resource({
    params: () => ({ conversationId: this.conversationId(), messageId: this.messageId() }),
    loader: ({ params }) => firstValueFrom(this.proposalChat.getContext(params)),
  });

  protected readonly context = computed(() => this.contextResource.value() ?? null);
  protected readonly contextError = computed<ApiError | null>(() => {
    const err = this.contextResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly suggesting = signal(false);
  protected readonly thinking = signal(false);
  protected readonly applying = signal(false);
  protected readonly suggestion = signal<IntendedUseSuggestion | null>(null);
  protected readonly suggestionError = signal<ApiError | null>(null);
  protected readonly applyError = signal<ApiError | null>(null);

  protected readonly suggestionMatchesCurrent = computed(() => {
    const context = this.context();
    const suggestion = this.suggestion();
    if (!context || !suggestion) return false;

    return this.sameIntendedUse(context.proposal.intendedUse, suggestion.intendedUse);
  });

  protected async runTriage(): Promise<void> {
    if (this.suggesting()) return;

    this.suggesting.set(true);
    this.thinking.set(true);
    this.suggestion.set(null);
    this.suggestionError.set(null);
    this.applyError.set(null);

    try {
      await this.delay(this.thinkingDelayMs());
      const suggestion = await firstValueFrom(
        this.proposalChat.suggestIntendedUse({
          conversationId: this.conversationId(),
          messageId: this.messageId(),
        }),
      );
      this.suggestion.set(suggestion);
    } catch (err) {
      this.suggestionError.set(toApiError(err));
    } finally {
      this.thinking.set(false);
      this.suggesting.set(false);
    }
  }

  protected retryContext(): void {
    this.suggestion.set(null);
    this.suggestionError.set(null);
    this.applyError.set(null);
    this.contextResource.reload();
  }

  protected async applySuggestion(): Promise<void> {
    const context = this.context();
    const suggestion = this.suggestion();
    if (!context || !suggestion || this.applying() || this.suggestionMatchesCurrent()) return;

    this.applying.set(true);
    this.applyError.set(null);

    try {
      const updated = await firstValueFrom(
        this.proposalService.updateIntendedUse(context.proposal.proposalId, suggestion.intendedUse),
      );
      this.applied.emit(updated);
      this.contextResource.reload();
    } catch (err) {
      this.applyError.set(toApiError(err));
    } finally {
      this.applying.set(false);
    }
  }

  protected formatUseType(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  protected confidencePercent(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 100);
  }

  protected sourceLabel(source: IntendedUseSuggestion['source']): string {
    return `${source.conversationId} / ${source.messageId}`;
  }

  private sameIntendedUse(a: IntendedUse, b: IntendedUse): boolean {
    return a.useType === b.useType && a.description.trim() === b.description.trim();
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
