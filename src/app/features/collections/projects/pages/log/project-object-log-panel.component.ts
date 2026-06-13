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

import { ObjectLogEntry, UpdateObjectLogEntryRequest } from '../../models/project.model';
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
  protected readonly canEditObjectEntries = computed(
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
  protected readonly objectDraftAddedAt = signal<Record<string, string>>({});
  protected readonly objectDraftNumberOfObjects = signal<Record<string, number>>({});
  protected readonly objectDraftObservations = signal<Record<string, string>>({});
  protected readonly objectSaveSubmitting = signal(false);
  protected readonly objectSaveError = signal<ApiError | null>(null);
  protected readonly objectRowsValid = computed(() =>
    this.logEntries().every(
      (entry) =>
        this.draftAddedAt(entry).trim().length > 0 && this.draftNumberOfObjects(entry) >= 1,
    ),
  );
  protected readonly hasObjectDraftChanges = computed(() =>
    this.logEntries().some((entry) => this.isObjectEntryDirty(entry)),
  );
  protected readonly objectAttachmentFiles = signal<Record<string, File | null>>({});
  protected readonly objectAttachmentUploading = signal<Record<string, boolean>>({});
  protected readonly objectAttachmentErrors = signal<Record<string, ApiError | null>>({});
  protected readonly expandedObjectEntryId = signal<string | null>(null);

  protected draftAddedAt(entry: ObjectLogEntry): string {
    return this.objectDraftAddedAt()[entry.id] ?? this.dateTimeInputValue(entry.addedAt);
  }

  protected draftNumberOfObjects(entry: ObjectLogEntry): number {
    return this.objectDraftNumberOfObjects()[entry.id] ?? entry.numberOfObjects;
  }

  protected draftObservations(entry: ObjectLogEntry): string {
    return this.objectDraftObservations()[entry.id] ?? entry.observations ?? '';
  }

  protected onObjectAddedAtInput(entryId: string, event: Event): void {
    this.setEntryRecord(this.objectDraftAddedAt, entryId, (event.target as HTMLInputElement).value);
  }

  protected onObjectQuantityInput(entryId: string, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.setEntryRecord(
      this.objectDraftNumberOfObjects,
      entryId,
      Number.isFinite(value) ? value : 0,
    );
  }

  protected onObjectObservationsInput(entryId: string, event: Event): void {
    this.setEntryRecord(
      this.objectDraftObservations,
      entryId,
      (event.target as HTMLTextAreaElement).value,
    );
  }

  protected async saveObjectEntries(event: Event): Promise<void> {
    event.preventDefault();
    if (
      this.objectSaveSubmitting() ||
      !this.canEditObjectEntries() ||
      !this.objectRowsValid() ||
      !this.hasObjectDraftChanges()
    ) {
      return;
    }

    const dirtyEntries = this.logEntries().filter((entry) => this.isObjectEntryDirty(entry));
    this.objectSaveSubmitting.set(true);
    this.objectSaveError.set(null);
    try {
      await Promise.all(
        dirtyEntries.map((entry) =>
          firstValueFrom(
            this.projectService.updateObjectLogEntry(
              this.projectId(),
              entry.id,
              this.updateRequestFor(entry),
            ),
          ),
        ),
      );
      this.objectDraftAddedAt.set({});
      this.objectDraftNumberOfObjects.set({});
      this.objectDraftObservations.set({});
      this.logResource.reload();
    } catch (err) {
      this.objectSaveError.set(toApiError(err));
    } finally {
      this.objectSaveSubmitting.set(false);
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
    if (!file || this.objectAttachmentUploading()[entryId] || !this.canEditObjectEntries()) return;

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

  protected dateTimeInputValue(date: string): string {
    return date.slice(0, 16);
  }

  private isObjectEntryDirty(entry: ObjectLogEntry): boolean {
    return (
      this.draftAddedAt(entry) !== this.dateTimeInputValue(entry.addedAt) ||
      this.draftNumberOfObjects(entry) !== entry.numberOfObjects ||
      this.draftObservations(entry) !== (entry.observations ?? '')
    );
  }

  private updateRequestFor(entry: ObjectLogEntry): UpdateObjectLogEntryRequest {
    const addedAt = this.draftAddedAt(entry);
    const numberOfObjects = this.draftNumberOfObjects(entry);
    const observations = this.draftObservations(entry);
    return {
      ...(addedAt !== this.dateTimeInputValue(entry.addedAt)
        ? { addedAt: this.apiDateTimeValue(addedAt) }
        : {}),
      ...(numberOfObjects !== entry.numberOfObjects ? { numberOfObjects } : {}),
      ...(observations !== (entry.observations ?? '')
        ? { observations: observations.trim() ? observations : null }
        : {}),
    };
  }

  private apiDateTimeValue(value: string): string {
    return value.length === 16 ? `${value}:00` : value;
  }

  private setEntryRecord<T>(
    state: { update(updateFn: (value: Record<string, T>) => Record<string, T>): void },
    entryId: string,
    value: T,
  ): void {
    state.update((current) => ({ ...current, [entryId]: value }));
  }
}
