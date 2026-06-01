import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ApiError } from '@core/http/api-error.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

export interface ProposalForwardStaffOption {
  readonly label: string;
  readonly permissionId: string;
}

@Component({
  selector: 'app-proposal-forward-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorMessageComponent, LoadingStateComponent],
  templateUrl: './proposal-forward-modal.component.html',
  styleUrl: './proposal-forward-modal.component.scss',
})
export class ProposalForwardModalComponent {
  readonly open = input(false);
  readonly proposalReference = input('');
  readonly proposalTitle = input('');
  readonly staffOptions = input<readonly ProposalForwardStaffOption[]>([]);
  readonly targetPermissionId = input('');
  readonly note = input('');
  readonly pending = input(false);
  readonly loadingStaff = input(false);
  readonly error = input<ApiError | null>(null);

  readonly close = output<void>();
  readonly targetPermissionIdChange = output<string>();
  readonly noteChange = output<string>();
  readonly submitForward = output<void>();

  protected requestClose(): void {
    if (this.pending()) return;
    this.close.emit();
  }

  protected onTargetChange(event: Event): void {
    this.targetPermissionIdChange.emit((event.target as HTMLSelectElement).value);
  }

  protected onNoteChange(event: Event): void {
    this.noteChange.emit((event.target as HTMLTextAreaElement).value);
  }

  protected submit(): void {
    this.submitForward.emit();
  }
}
