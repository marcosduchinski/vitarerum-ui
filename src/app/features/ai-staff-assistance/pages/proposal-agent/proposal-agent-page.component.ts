import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  computed,
  inject,
  input,
  PLATFORM_ID,
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
  AssistanceTurn,
  AssistanceTurnResultKind,
  DocumentSearchMatch,
} from '../../models/assistance.model';
import { AI_STAFF_ASSISTANCE_SERVICE } from '../../services/ai-staff-assistance.service';

interface SuggestedPrompt {
  readonly label: string;
  readonly prompt: string;
}

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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly chatInput = viewChild<ElementRef<HTMLTextAreaElement>>('chatInput');
  private readonly chatLog = viewChild<ElementRef<HTMLElement>>('chatLog');

  readonly id = input.required<string>();
  readonly messageId = input.required<string>();
  readonly embedded = input(false);
  // Animation timings — overridable so tests can disable them (0 = no timers).
  readonly thinkingDelayMs = input(650);
  readonly streamWordDelayMs = input(26);

  protected readonly sessionResource = resource({
    params: () => ({ proposalId: this.id(), messageId: this.messageId() }),
    loader: ({ params }) =>
      firstValueFrom(this.assistanceService.startProposalAgentSession(params)),
  });

  protected readonly session = computed(() => this.sessionResource.value() ?? null);
  protected readonly error = computed<ApiError | null>(() => {
    const err = this.sessionResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly chatMessage = signal('');
  protected readonly objectQuery = signal('');
  protected readonly actionError = signal<ApiError | null>(null);

  // Interaction lifecycle state for the "live assistant" feel.
  protected readonly interacting = signal(false);
  protected readonly thinking = signal(false);
  protected readonly streamingText = signal<string | null>(null);
  protected readonly pendingStaffMessage = signal<string | null>(null);

  // Capabilities already revealed in the conversation; drives the suggested chips.
  private readonly revealedKinds = computed<ReadonlySet<AssistanceTurnResultKind>>(
    () =>
      new Set(
        (this.session()?.turns ?? []).flatMap((turn) => (turn.result ? [turn.result.kind] : [])),
      ),
  );
  protected readonly suggestedPrompts = computed<SuggestedPrompt[]>(() => {
    const revealed = this.revealedKinds();
    const prompts: SuggestedPrompt[] = [];
    if (!revealed.has('TRIAGE')) {
      prompts.push({ label: 'Do the email triage', prompt: 'Could you do the email triage?' });
    }
    if (!revealed.has('DOCUMENT_SEARCH')) {
      prompts.push({ label: 'Find relevant documents', prompt: 'Which documents are relevant?' });
    }
    if (!revealed.has('OBJECT_SEARCH')) {
      prompts.push({ label: 'Search for an object', prompt: 'Help me find a collection object.' });
    }
    return prompts;
  });

  constructor() {
    // Keep the newest turn / streaming text in view as the conversation grows.
    // Reading these signals registers them as effect dependencies.
    effect(() => {
      this.session();
      this.streamingText();
      this.thinking();
      this.pendingStaffMessage();
      this.scrollToLatest();
    });
  }

  protected onChatMessageInput(event: Event): void {
    this.chatMessage.set((event.target as HTMLTextAreaElement).value);
  }

  protected onObjectQueryInput(event: Event): void {
    this.objectQuery.set((event.target as HTMLInputElement).value);
  }

  protected async sendChatMessage(preset?: string): Promise<void> {
    const session = this.session();
    const content = (preset ?? this.chatMessage()).trim();
    if (!content || !session || this.interacting()) return;

    this.chatMessage.set('');
    const input = this.chatInput();
    if (input) input.nativeElement.value = '';

    await this.runInteraction(content, () =>
      firstValueFrom(this.assistanceService.addTurn(session.id, { content })),
    );
  }

  protected async searchObjects(): Promise<void> {
    const session = this.session();
    const query = this.objectQuery().trim();
    if (!query || !session || this.interacting()) return;

    this.objectQuery.set('');
    // The mock echoes the query as a STAFF turn, so don't double it here.
    await this.runInteraction(null, () =>
      firstValueFrom(this.assistanceService.searchObjects(session.id, { query })),
    );
  }

  // Shared "ask → think → stream → reveal" pipeline that makes the agent feel
  // live: an optimistic staff bubble, a typing pause, then the answer streamed
  // in word-by-word before the full session (with any result card) is committed.
  private async runInteraction(
    staffEcho: string | null,
    call: () => Promise<AssistanceSession>,
  ): Promise<void> {
    if (this.interacting()) return;

    this.interacting.set(true);
    this.actionError.set(null);
    if (staffEcho) this.pendingStaffMessage.set(staffEcho);
    this.thinking.set(true);
    try {
      await this.delay(this.thinkingDelayMs());
      const updated = await call();
      this.thinking.set(false);

      const agentTurn = this.newestAgentTurn(updated);
      if (agentTurn) await this.streamIn(agentTurn.content);

      this.pendingStaffMessage.set(null);
      this.streamingText.set(null);
      this.sessionResource.set(updated);
    } catch (err) {
      this.actionError.set(toApiError(err));
      this.pendingStaffMessage.set(null);
      this.streamingText.set(null);
    } finally {
      this.thinking.set(false);
      this.interacting.set(false);
    }
  }

  private newestAgentTurn(session: AssistanceSession): AssistanceTurn | null {
    const last = session.turns.at(-1);
    return last?.role === 'AGENT' ? last : null;
  }

  private async streamIn(text: string): Promise<void> {
    const words = text.split(' ');
    let accumulated = '';
    for (let index = 0; index < words.length; index++) {
      accumulated = index === 0 ? words[index] : `${accumulated} ${words[index]}`;
      this.streamingText.set(accumulated);
      if (index < words.length - 1) await this.delay(this.streamWordDelayMs());
    }
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }

  private scrollToLatest(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const log = this.chatLog();
    if (log) log.nativeElement.scrollTop = log.nativeElement.scrollHeight;
  }

  protected formatUseType(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  protected documentSourceLabel(match: DocumentSearchMatch): string {
    return match.source === 'PROPOSAL_ATTACHMENT' ? 'Message attachment' : 'Assistance catalog';
  }
}
