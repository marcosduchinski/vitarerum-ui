import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import {
  AssistanceSession,
  DocumentSearchMatch,
  ProposalAgentCapability,
  ProposalAgentRun,
} from '../../models/assistance.model';
import { AI_STAFF_ASSISTANCE_SERVICE } from '../../services/ai-staff-assistance.service';

@Component({
  selector: 'app-proposal-agent-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoadingStateComponent, ErrorMessageComponent],
  templateUrl: './proposal-agent-page.component.html',
  styleUrl: './proposal-agent-page.component.scss',
})
export class ProposalAgentPageComponent {
  private readonly assistanceService = inject(AI_STAFF_ASSISTANCE_SERVICE);
  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');

  readonly id = input.required<string>();
  readonly messageId = input.required<string>();
  readonly embedded = input(false);

  protected readonly sessionResource = resource({
    params: () => ({ proposalId: this.id(), messageId: this.messageId() }),
    loader: ({ params }) =>
      firstValueFrom(this.assistanceService.startProposalAgentSession(params)),
  });

  protected readonly session = computed(() => this.sessionResource.value() ?? null);
  protected readonly run = computed<ProposalAgentRun | null>(
    () => this.session()?.proposalAgentRuns.at(-1) ?? null,
  );
  protected readonly error = computed<ApiError | null>(() => {
    const err = this.sessionResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly chatMessage = signal('');
  protected readonly objectQuery = signal('');
  protected readonly selectedCapability = signal<ProposalAgentCapability | null>(null);
  protected readonly actionError = signal<ApiError | null>(null);
  protected readonly sendingChat = signal(false);
  protected readonly searchingObjects = signal(false);

  protected onChatMessageInput(event: Event): void {
    this.chatMessage.set((event.target as HTMLTextAreaElement).value);
  }

  protected onObjectQueryInput(event: Event): void {
    this.objectQuery.set((event.target as HTMLInputElement).value);
  }

  protected selectCapability(capability: ProposalAgentCapability): void {
    this.selectedCapability.set(capability);
  }

  protected async sendChatMessage(): Promise<void> {
    const content = this.chatMessage().trim();
    const session = this.session();
    if (!content || !session || this.sendingChat()) return;

    this.sendingChat.set(true);
    this.actionError.set(null);
    try {
      await this.replaceSession(
        await firstValueFrom(this.assistanceService.addTurn(session.id, { content })),
      );
      this.chatMessage.set('');
      const input = this.chatInput();
      if (input) input.nativeElement.value = '';
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.sendingChat.set(false);
    }
  }

  protected async searchObjects(): Promise<void> {
    const query = this.objectQuery().trim();
    const session = this.session();
    if (!query || !session || this.searchingObjects()) return;

    this.searchingObjects.set(true);
    this.actionError.set(null);
    try {
      await this.replaceSession(
        await firstValueFrom(this.assistanceService.searchObjects(session.id, { query })),
      );
      this.selectedCapability.set('OBJECT_SEARCH');
    } catch (err) {
      this.actionError.set(toApiError(err));
    } finally {
      this.searchingObjects.set(false);
    }
  }

  protected formatUseType(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  protected documentSourceLabel(match: DocumentSearchMatch): string {
    return match.source === 'PROPOSAL_ATTACHMENT' ? 'Message attachment' : 'Assistance catalog';
  }

  protected capabilityLabel(capability: ProposalAgentCapability): string {
    switch (capability) {
      case 'EMAIL_TRIAGE':
        return 'Email triage';
      case 'DOCUMENT_SEARCH':
        return 'Document search';
      case 'OBJECT_SEARCH':
        return 'Object search';
    }
  }

  private async replaceSession(session: AssistanceSession): Promise<void> {
    this.sessionResource.set(session);
  }
}
