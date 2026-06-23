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
import { DatePipe } from '@angular/common';
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

type AgentTaskId = 'intended-use' | 'find-documents' | 'search-records' | 'draft-reply';

/**
 * A task the curator can delegate to the assistant. Future capabilities — locating
 * documents to return, pulling figures from spreadsheets, drafting a reply — register
 * here and flow through the same turn pipeline. Adding one means flipping `available`
 * and handling its result branch in {@link dispatch}; the thread shell is untouched.
 */
interface AgentTask {
  readonly id: AgentTaskId;
  readonly label: string;
  readonly icon: string;
  readonly hint: string;
  /** What the curator's turn reads as when this task is delegated. */
  readonly utterance: string;
  readonly available: boolean;
}

interface TurnBase {
  readonly id: string;
  readonly at: string;
}
interface UserTurn extends TurnBase {
  readonly role: 'user';
  readonly text: string;
}
interface PendingTurn extends TurnBase {
  readonly role: 'pending';
  readonly task: string;
}
interface ErrorTurn extends TurnBase {
  readonly role: 'error';
  readonly task: string;
  readonly error: ApiError;
}
interface NoteTurn extends TurnBase {
  readonly role: 'note';
  readonly text: string;
}
interface IntendedUseTurn extends TurnBase {
  readonly role: 'intended-use';
  readonly suggestion: IntendedUseSuggestion;
}

type ChatTurn = UserTurn | PendingTurn | ErrorTurn | NoteTurn | IntendedUseTurn;

@Component({
  selector: 'app-proposal-chat-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, RouterLink, LoadingStateComponent, ErrorMessageComponent],
  templateUrl: './proposal-chat-panel.component.html',
  styleUrl: './proposal-chat-panel.component.scss',
})
export class ProposalChatPanelComponent {
  private readonly proposalChat = inject(PROPOSAL_CHAT_SERVICE);
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);

  readonly conversationId = input.required<string>();
  readonly messageId = input.required<string>();
  readonly embedded = input(false);
  // Overridable so tests can disable the short "assistant is working" pause.
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

  /** The delegated conversation, oldest first. Mixed turn kinds; render via @switch. */
  protected readonly turns = signal<readonly ChatTurn[]>([]);
  protected readonly busy = computed(() => this.turns().some((turn) => turn.role === 'pending'));

  private readonly applyingId = signal<string | null>(null);
  private readonly appliedIds = signal<ReadonlySet<string>>(new Set());
  protected readonly applyError = signal<ApiError | null>(null);

  /** Announced to assistive tech as turns resolve (the visual thread is the rest). */
  protected readonly liveMessage = signal('');

  protected readonly tasks: readonly AgentTask[] = [
    {
      id: 'intended-use',
      label: 'Analyse intended use',
      icon: 'pi-compass',
      hint: 'Read the request and suggest a use classification',
      utterance: 'Analyse this message for its intended use.',
      available: true,
    },
    {
      id: 'find-documents',
      label: 'Find documents to send',
      icon: 'pi-folder-open',
      hint: 'Locate files to return to the requester',
      utterance: 'Find documents I can send back to the requester.',
      available: false,
    },
    {
      id: 'search-records',
      label: 'Search records',
      icon: 'pi-database',
      hint: 'Pull figures from spreadsheets to quote back',
      utterance: 'Search the records for details to include in my reply.',
      available: false,
    },
    {
      id: 'draft-reply',
      label: 'Draft a reply',
      icon: 'pi-pencil',
      hint: 'Compose a message back to the requester',
      utterance: 'Draft a reply to the requester.',
      available: false,
    },
  ];

  private seq = 0;

  protected async dispatch(task: AgentTask): Promise<void> {
    if (!task.available || this.busy()) return;

    this.appendTurn({ id: this.nextId(), at: this.now(), role: 'user', text: task.utterance });
    const pendingId = this.nextId();
    this.appendTurn({ id: pendingId, at: this.now(), role: 'pending', task: task.label });
    this.applyError.set(null);
    this.liveMessage.set(`${task.label}: the assistant is working.`);

    try {
      switch (task.id) {
        case 'intended-use': {
          await this.delay(this.thinkingDelayMs());
          const suggestion = await firstValueFrom(
            this.proposalChat.suggestIntendedUse({
              conversationId: this.conversationId(),
              messageId: this.messageId(),
            }),
          );
          this.replaceTurn(pendingId, {
            id: pendingId,
            at: this.now(),
            role: 'intended-use',
            suggestion,
          });
          this.liveMessage.set(
            `Suggested ${this.formatUseType(suggestion.intendedUse.useType)} at ` +
              `${this.confidencePercent(suggestion.confidence)}% confidence.`,
          );
          break;
        }
        default:
          // Unavailable tasks never dispatch; this guards future ids without a branch.
          this.replaceTurns((turns) => turns.filter((turn) => turn.id !== pendingId));
          break;
      }
    } catch (err) {
      this.replaceTurn(pendingId, {
        id: pendingId,
        at: this.now(),
        role: 'error',
        task: task.label,
        error: toApiError(err),
      });
      this.liveMessage.set(`${task.label} could not be completed.`);
    }
  }

  protected async apply(turn: IntendedUseTurn): Promise<void> {
    const context = this.context();
    if (!context || this.applyingId() || this.isApplied(turn) || this.matchesCurrent(turn)) return;

    this.applyingId.set(turn.id);
    this.applyError.set(null);

    try {
      const updated = await firstValueFrom(
        this.proposalService.updateIntendedUse(
          context.proposal.proposalId,
          turn.suggestion.intendedUse,
        ),
      );
      this.appliedIds.update((ids) => new Set(ids).add(turn.id));
      this.appendTurn({
        id: this.nextId(),
        at: this.now(),
        role: 'note',
        text: `Applied “${this.formatUseType(turn.suggestion.intendedUse.useType)}” to the proposal.`,
      });
      this.liveMessage.set('Suggestion applied to the proposal.');
      this.applied.emit(updated);
      this.contextResource.reload();
    } catch (err) {
      this.applyError.set(toApiError(err));
    } finally {
      this.applyingId.set(null);
    }
  }

  protected retryContext(): void {
    this.turns.set([]);
    this.appliedIds.set(new Set());
    this.applyError.set(null);
    this.liveMessage.set('');
    this.contextResource.reload();
  }

  protected matchesCurrent(turn: IntendedUseTurn): boolean {
    const context = this.context();
    if (!context) return false;
    return this.sameIntendedUse(context.proposal.intendedUse, turn.suggestion.intendedUse);
  }

  protected isApplied(turn: IntendedUseTurn): boolean {
    return this.appliedIds().has(turn.id);
  }

  protected isApplying(turn: IntendedUseTurn): boolean {
    return this.applyingId() === turn.id;
  }

  protected formatUseType(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  protected formatStatus(value: string): string {
    return value.replaceAll('_', ' ').toLowerCase();
  }

  protected confidencePercent(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 100);
  }

  protected sourceLabel(source: IntendedUseSuggestion['source']): string {
    return `${source.conversationId} / ${source.messageId}`;
  }

  // Narrowing helpers for the template's @switch (keeps the markup free of casts).
  protected asIntendedUse(turn: ChatTurn): IntendedUseTurn {
    return turn as IntendedUseTurn;
  }
  protected asError(turn: ChatTurn): ErrorTurn {
    return turn as ErrorTurn;
  }

  private appendTurn(turn: ChatTurn): void {
    this.turns.update((turns) => [...turns, turn]);
  }

  private replaceTurn(id: string, turn: ChatTurn): void {
    this.turns.update((turns) => turns.map((existing) => (existing.id === id ? turn : existing)));
  }

  private replaceTurns(project: (turns: readonly ChatTurn[]) => readonly ChatTurn[]): void {
    this.turns.update((turns) => project(turns));
  }

  private sameIntendedUse(a: IntendedUse, b: IntendedUse): boolean {
    return a.useType === b.useType && a.description.trim() === b.description.trim();
  }

  private nextId(): string {
    return `turn-${++this.seq}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private delay(ms: number): Promise<void> {
    return ms > 0 ? new Promise<void>((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
  }
}
