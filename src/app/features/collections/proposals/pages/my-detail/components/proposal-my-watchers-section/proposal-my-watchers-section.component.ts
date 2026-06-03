import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';

import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import { PROPOSAL_MY_DETAIL_GROUP_LABELS } from '../../proposal-my-detail.presentation';

export interface StaffWatcherOption {
  readonly label: string;
  readonly permissionId: string;
}

@Component({
  selector: 'app-proposal-my-watchers-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent],
  templateUrl: './proposal-my-watchers-section.component.html',
  styleUrl: './proposal-my-watchers-section.component.scss',
})
export class ProposalMyWatchersSectionComponent {
  readonly watchers = input.required<readonly PermissionPrincipal[]>();
  readonly watcherOptions = input.required<readonly StaffWatcherOption[]>();
  readonly staffLoading = input.required<boolean>();
  readonly addingWatcher = input.required<boolean>();
  readonly removingWatcherId = input.required<string | null>();
  readonly resetVersion = input.required<number>();
  readonly watcherAdded = output<string>();
  readonly watcherRemoved = output<string>();

  protected readonly watcherPermissionId = signal('');
  protected readonly groupLabels = PROPOSAL_MY_DETAIL_GROUP_LABELS;

  constructor() {
    effect(() => {
      if (this.resetVersion() > 0) this.watcherPermissionId.set('');
    });
  }

  protected onWatcherPermissionChange(event: Event): void {
    this.watcherPermissionId.set((event.target as HTMLSelectElement).value);
  }

  protected addWatcher(): void {
    const permissionId = this.watcherPermissionId();
    if (!permissionId || this.addingWatcher()) return;
    this.watcherAdded.emit(permissionId);
  }
}
