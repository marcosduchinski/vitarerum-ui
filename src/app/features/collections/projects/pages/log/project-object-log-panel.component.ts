import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { ApiError, toApiError } from '@core/http/api-error.model';
import { ConfirmModalComponent } from '@shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import { PROJECT_API_SERVICE } from '../../services/project-api.service';

@Component({
  selector: 'app-project-object-log-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './project-object-log-panel.component.html',
  styleUrl: './project-object-log-panel.component.scss',
})
export class ProjectObjectLogPanelComponent {
  private readonly projectService = inject(PROJECT_API_SERVICE);
  private readonly identity = inject(IDENTITY_SERVICE);

  readonly projectId = input.required<string>();

  protected readonly logResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) =>
      firstValueFrom(this.projectService.listObjectLogEntries(params.projectId)),
  });
  protected readonly projectResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) => firstValueFrom(this.projectService.getProject(params.projectId)),
  });
  protected readonly logEntries = computed(() => this.logResource.value()?.content ?? []);
  protected readonly accessLog = computed(() => this.logResource.value()?.accessLog ?? null);
  protected readonly accessLogConcluded = computed(() => this.accessLog()?.dateConclusion != null);
  protected readonly project = computed(() => this.projectResource.value() ?? null);
  protected readonly isExternalResearcher = computed(
    () => this.identity.session()?.group === 'EXTERNAL',
  );
  protected readonly projectInProgress = computed(() => this.project()?.status === 'IN_PROGRESS');
  protected readonly canAddObjectEntries = computed(
    () => !this.accessLogConcluded() && (!this.isExternalResearcher() || this.projectInProgress()),
  );
  protected readonly objectAccessMessage = computed(() => {
    if (this.accessLogConcluded()) return 'This access log is concluded.';
    if (this.isExternalResearcher() && this.project() && !this.projectInProgress()) {
      return 'Researcher entries are only available while the project is in progress.';
    }
    return null;
  });
  protected readonly canConcludeAccessLog = computed(() => {
    const group = this.identity.session()?.group;
    return (
      !!this.accessLog() &&
      !this.accessLogConcluded() &&
      (group === 'CURATORIAL' || group === 'COLLECTIONS_MANAGEMENT')
    );
  });
  protected readonly logError = computed<ApiError | null>(() => {
    const err = this.logResource.error();
    return err ? toApiError(err) : null;
  });
  protected readonly projectError = computed<ApiError | null>(() => {
    const err = this.projectResource.error();
    return err ? toApiError(err) : null;
  });
  protected readonly concludeConfirmOpen = signal(false);
  protected readonly concludeSubmitting = signal(false);
  protected readonly concludeError = signal<ApiError | null>(null);
  protected readonly objectInventoryNumber = signal('');
  protected readonly objectNumberOfObjects = signal(1);
  protected readonly objectObservations = signal('');
  protected readonly objectSubmitting = signal(false);
  protected readonly objectSubmitError = signal<ApiError | null>(null);
  protected readonly objectFormValid = computed(
    () => this.objectInventoryNumber().trim().length > 0 && this.objectNumberOfObjects() >= 1,
  );
  protected readonly objectAttachmentFiles = signal<Record<string, File | null>>({});
  protected readonly objectAttachmentUploading = signal<Record<string, boolean>>({});
  protected readonly objectAttachmentErrors = signal<Record<string, ApiError | null>>({});
  protected readonly expandedObjectEntryId = signal<string | null>(null);

  protected onObjectInventoryInput(event: Event): void {
    this.objectInventoryNumber.set((event.target as HTMLInputElement).value);
  }

  protected onObjectQuantityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.objectNumberOfObjects.set(Number.isFinite(value) ? value : 0);
  }

  protected onObjectObservationsInput(event: Event): void {
    this.objectObservations.set((event.target as HTMLTextAreaElement).value);
  }

  protected async addObjectEntry(event: Event): Promise<void> {
    event.preventDefault();
    const inventoryNumber = this.objectInventoryNumber().trim();
    const observations = this.objectObservations().trim();
    if (!this.objectFormValid() || this.objectSubmitting() || !this.canAddObjectEntries()) return;

    this.objectSubmitting.set(true);
    this.objectSubmitError.set(null);
    try {
      await firstValueFrom(
        this.projectService.createObjectLogEntry(this.projectId(), {
          inventoryNumber,
          numberOfObjects: this.objectNumberOfObjects(),
          ...(observations ? { observations } : {}),
        }),
      );
      this.objectInventoryNumber.set('');
      this.objectNumberOfObjects.set(1);
      this.objectObservations.set('');
      this.logResource.reload();
    } catch (err) {
      this.objectSubmitError.set(toApiError(err));
    } finally {
      this.objectSubmitting.set(false);
    }
  }

  protected onObjectAttachmentFileInput(entryId: string, event: Event): void {
    this.setEntryRecord(
      this.objectAttachmentFiles,
      entryId,
      (event.target as HTMLInputElement).files?.[0] ?? null,
    );
  }

  protected async uploadObjectAttachment(entryId: string, event: Event): Promise<void> {
    event.preventDefault();
    const file = this.objectAttachmentFiles()[entryId];
    if (!file || this.objectAttachmentUploading()[entryId] || !this.canAddObjectEntries()) return;

    this.setEntryRecord(this.objectAttachmentUploading, entryId, true);
    this.setEntryRecord(this.objectAttachmentErrors, entryId, null);
    try {
      await firstValueFrom(
        this.projectService.uploadLogEntryAttachment(this.projectId(), entryId, file, 'DOCUMENT'),
      );
      this.setEntryRecord(this.objectAttachmentFiles, entryId, null);
      this.logResource.reload();
    } catch (err) {
      this.setEntryRecord(this.objectAttachmentErrors, entryId, toApiError(err));
    } finally {
      this.setEntryRecord(this.objectAttachmentUploading, entryId, false);
    }
  }

  protected toggleObjectAttachments(entryId: string): void {
    this.expandedObjectEntryId.update((current) => (current === entryId ? null : entryId));
  }

  protected openConcludeConfirm(): void {
    this.concludeError.set(null);
    this.concludeConfirmOpen.set(true);
  }

  protected closeConcludeConfirm(): void {
    if (!this.concludeSubmitting()) {
      this.concludeConfirmOpen.set(false);
    }
  }

  protected async concludeAccessLog(): Promise<void> {
    if (this.concludeSubmitting()) return;
    this.concludeSubmitting.set(true);
    this.concludeError.set(null);
    try {
      await firstValueFrom(this.projectService.concludeObjectAccessLog(this.projectId()));
      this.concludeConfirmOpen.set(false);
      this.logResource.reload();
    } catch (err) {
      this.concludeError.set(toApiError(err));
    } finally {
      this.concludeSubmitting.set(false);
    }
  }

  protected dateLabel(date: string): string {
    return date.slice(0, 10);
  }

  protected objectLabel(entry: {
    readonly objectReference: {
      readonly displayTitle: string | null;
      readonly objectName: string | null;
    };
  }): string {
    return (
      entry.objectReference.displayTitle ??
      entry.objectReference.objectName ??
      'Uncatalogued object'
    );
  }

  private setEntryRecord<T>(
    state: { update(updateFn: (value: Record<string, T>) => Record<string, T>): void },
    entryId: string,
    value: T,
  ): void {
    state.update((current) => ({ ...current, [entryId]: value }));
  }
}
