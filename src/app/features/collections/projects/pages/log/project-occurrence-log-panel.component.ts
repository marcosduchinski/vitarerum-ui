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
  selector: 'app-project-occurrence-log-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LoadingStateComponent,
    ErrorMessageComponent,
    EmptyStateComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './project-occurrence-log-panel.component.html',
  styleUrl: './project-occurrence-log-panel.component.scss',
})
export class ProjectOccurrenceLogPanelComponent {
  private readonly projectService = inject(PROJECT_API_SERVICE);
  private readonly identity = inject(IDENTITY_SERVICE);

  readonly projectId = input.required<string>();

  protected readonly occurrenceResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) =>
      firstValueFrom(this.projectService.listObjectOccurrenceEntries(params.projectId)),
  });
  protected readonly projectResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) => firstValueFrom(this.projectService.getProject(params.projectId)),
  });
  protected readonly occurrenceEntries = computed(
    () => this.occurrenceResource.value()?.content ?? [],
  );
  protected readonly occurrenceLog = computed(
    () => this.occurrenceResource.value()?.occurrenceLog ?? null,
  );
  protected readonly occurrenceLogConcluded = computed(
    () => this.occurrenceLog()?.dateConclusion != null,
  );
  protected readonly project = computed(() => this.projectResource.value() ?? null);
  protected readonly isExternalResearcher = computed(
    () => this.identity.session()?.group === 'EXTERNAL',
  );
  protected readonly projectInProgress = computed(() => this.project()?.status === 'IN_PROGRESS');
  protected readonly canAddOccurrenceEntries = computed(
    () =>
      !this.occurrenceLogConcluded() && (!this.isExternalResearcher() || this.projectInProgress()),
  );
  protected readonly occurrenceAccessMessage = computed(() => {
    if (this.occurrenceLogConcluded()) return 'This occurrence log is concluded.';
    if (this.isExternalResearcher() && this.project() && !this.projectInProgress()) {
      return 'Researcher occurrence reports are only available while the project is in progress.';
    }
    return null;
  });
  protected readonly canConcludeOccurrenceLog = computed(() => {
    const group = this.identity.session()?.group;
    return (
      !!this.occurrenceLog() &&
      !this.occurrenceLogConcluded() &&
      (group === 'CURATORIAL' || group === 'COLLECTIONS_MANAGEMENT')
    );
  });
  protected readonly occurrenceError = computed<ApiError | null>(() => {
    const err = this.occurrenceResource.error();
    return err ? toApiError(err) : null;
  });
  protected readonly projectError = computed<ApiError | null>(() => {
    const err = this.projectResource.error();
    return err ? toApiError(err) : null;
  });
  protected readonly occurrenceConcludeConfirmOpen = signal(false);
  protected readonly occurrenceConcludeSubmitting = signal(false);
  protected readonly occurrenceConcludeError = signal<ApiError | null>(null);
  protected readonly occurrenceInventoryNumber = signal('');
  protected readonly occurrenceNumberOfObjects = signal(1);
  protected readonly occurrenceDate = signal('');
  protected readonly occurrenceLocation = signal('');
  protected readonly occurrenceDescription = signal('');
  protected readonly occurrenceTestimonial = signal('');
  protected readonly occurrenceSubmitting = signal(false);
  protected readonly occurrenceSubmitError = signal<ApiError | null>(null);
  protected readonly occurrenceFormValid = computed(
    () =>
      this.occurrenceInventoryNumber().trim().length > 0 &&
      this.occurrenceNumberOfObjects() >= 1 &&
      this.occurrenceDate().trim().length > 0 &&
      this.occurrenceLocation().trim().length > 0 &&
      this.occurrenceDescription().trim().length > 0,
  );
  protected readonly occurrenceAttachmentFiles = signal<Record<string, File | null>>({});
  protected readonly occurrenceAttachmentUploading = signal<Record<string, boolean>>({});
  protected readonly occurrenceAttachmentErrors = signal<Record<string, ApiError | null>>({});
  protected readonly expandedOccurrenceEntryId = signal<string | null>(null);

  protected onOccurrenceInventoryInput(event: Event): void {
    this.occurrenceInventoryNumber.set((event.target as HTMLInputElement).value);
  }

  protected onOccurrenceQuantityInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.occurrenceNumberOfObjects.set(Number.isFinite(value) ? value : 0);
  }

  protected onOccurrenceDateInput(event: Event): void {
    this.occurrenceDate.set((event.target as HTMLInputElement).value);
  }

  protected onOccurrenceLocationInput(event: Event): void {
    this.occurrenceLocation.set((event.target as HTMLInputElement).value);
  }

  protected onOccurrenceDescriptionInput(event: Event): void {
    this.occurrenceDescription.set((event.target as HTMLTextAreaElement).value);
  }

  protected onOccurrenceTestimonialInput(event: Event): void {
    this.occurrenceTestimonial.set((event.target as HTMLTextAreaElement).value);
  }

  protected async addOccurrenceEntry(event: Event): Promise<void> {
    event.preventDefault();
    const inventoryNumber = this.occurrenceInventoryNumber().trim();
    const occurrenceDate = this.occurrenceDate().trim();
    const location = this.occurrenceLocation().trim();
    const detailedDescription = this.occurrenceDescription().trim();
    const testimonial = this.occurrenceTestimonial().trim();
    if (
      !this.occurrenceFormValid() ||
      this.occurrenceSubmitting() ||
      !this.canAddOccurrenceEntries()
    ) {
      return;
    }

    this.occurrenceSubmitting.set(true);
    this.occurrenceSubmitError.set(null);
    try {
      await firstValueFrom(
        this.projectService.createObjectOccurrenceEntry(this.projectId(), {
          inventoryNumber,
          numberOfObjects: this.occurrenceNumberOfObjects(),
          occurrenceDate,
          location,
          detailedDescription,
          ...(testimonial ? { testimonial } : {}),
        }),
      );
      this.occurrenceInventoryNumber.set('');
      this.occurrenceNumberOfObjects.set(1);
      this.occurrenceDate.set('');
      this.occurrenceLocation.set('');
      this.occurrenceDescription.set('');
      this.occurrenceTestimonial.set('');
      this.occurrenceResource.reload();
    } catch (err) {
      this.occurrenceSubmitError.set(toApiError(err));
    } finally {
      this.occurrenceSubmitting.set(false);
    }
  }

  protected onOccurrenceAttachmentFileInput(entryId: string, event: Event): void {
    this.setEntryRecord(
      this.occurrenceAttachmentFiles,
      entryId,
      (event.target as HTMLInputElement).files?.[0] ?? null,
    );
  }

  protected async uploadOccurrenceAttachment(entryId: string, event: Event): Promise<void> {
    event.preventDefault();
    const file = this.occurrenceAttachmentFiles()[entryId];
    if (!file || this.occurrenceAttachmentUploading()[entryId] || !this.canAddOccurrenceEntries()) {
      return;
    }

    this.setEntryRecord(this.occurrenceAttachmentUploading, entryId, true);
    this.setEntryRecord(this.occurrenceAttachmentErrors, entryId, null);
    try {
      await firstValueFrom(
        this.projectService.uploadOccurrenceEntryAttachment(
          this.projectId(),
          entryId,
          file,
          'DOCUMENT',
        ),
      );
      this.setEntryRecord(this.occurrenceAttachmentFiles, entryId, null);
      this.occurrenceResource.reload();
    } catch (err) {
      this.setEntryRecord(this.occurrenceAttachmentErrors, entryId, toApiError(err));
    } finally {
      this.setEntryRecord(this.occurrenceAttachmentUploading, entryId, false);
    }
  }

  protected toggleOccurrenceAttachments(entryId: string): void {
    this.expandedOccurrenceEntryId.update((current) => (current === entryId ? null : entryId));
  }

  protected openOccurrenceConcludeConfirm(): void {
    this.occurrenceConcludeError.set(null);
    this.occurrenceConcludeConfirmOpen.set(true);
  }

  protected closeOccurrenceConcludeConfirm(): void {
    if (!this.occurrenceConcludeSubmitting()) {
      this.occurrenceConcludeConfirmOpen.set(false);
    }
  }

  protected async concludeOccurrenceLog(): Promise<void> {
    if (this.occurrenceConcludeSubmitting()) return;
    this.occurrenceConcludeSubmitting.set(true);
    this.occurrenceConcludeError.set(null);
    try {
      await firstValueFrom(this.projectService.concludeObjectOccurrenceLog(this.projectId()));
      this.occurrenceConcludeConfirmOpen.set(false);
      this.occurrenceResource.reload();
    } catch (err) {
      this.occurrenceConcludeError.set(toApiError(err));
    } finally {
      this.occurrenceConcludeSubmitting.set(false);
    }
  }

  protected dateLabel(date: string): string {
    return date.slice(0, 10);
  }

  private setEntryRecord<T>(
    state: { update(updateFn: (value: Record<string, T>) => Record<string, T>): void },
    entryId: string,
    value: T,
  ): void {
    state.update((current) => ({ ...current, [entryId]: value }));
  }
}
