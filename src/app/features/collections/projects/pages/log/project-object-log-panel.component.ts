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

import { ApiError, toApiError } from '@core/http/api-error.model';
import { EmptyStateComponent } from '@shared/components/empty-state/empty-state.component';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { LoadingStateComponent } from '@shared/components/loading-state/loading-state.component';

import { PROJECT_API_SERVICE } from '../../services/project-api.service';

@Component({
  selector: 'app-project-object-log-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoadingStateComponent, ErrorMessageComponent, EmptyStateComponent],
  templateUrl: './project-object-log-panel.component.html',
  styleUrl: './project-object-log-panel.component.scss',
})
export class ProjectObjectLogPanelComponent {
  private readonly projectService = inject(PROJECT_API_SERVICE);

  readonly projectId = input.required<string>();

  protected readonly logResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) =>
      firstValueFrom(this.projectService.listObjectLogEntries(params.projectId)),
  });
  protected readonly logEntries = computed(() => this.logResource.value()?.content ?? []);
  protected readonly logError = computed<ApiError | null>(() => {
    const err = this.logResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly logContent = signal('');
  protected readonly logSubmitting = signal(false);
  protected readonly logSubmitError = signal<ApiError | null>(null);

  protected readonly occurrenceResource = resource({
    params: () => ({ projectId: this.projectId() }),
    loader: ({ params }) =>
      firstValueFrom(this.projectService.listObjectOccurrenceEntries(params.projectId)),
  });
  protected readonly occurrenceEntries = computed(
    () => this.occurrenceResource.value()?.content ?? [],
  );
  protected readonly occurrenceError = computed<ApiError | null>(() => {
    const err = this.occurrenceResource.error();
    return err ? toApiError(err) : null;
  });

  protected readonly occurrenceContent = signal('');
  protected readonly occurrenceSubmitting = signal(false);
  protected readonly occurrenceSubmitError = signal<ApiError | null>(null);

  protected onLogContentInput(event: Event): void {
    this.logContent.set((event.target as HTMLTextAreaElement).value);
  }

  protected async addLogEntry(event: Event): Promise<void> {
    event.preventDefault();
    const content = this.logContent().trim();
    if (!content || this.logSubmitting()) return;
    this.logSubmitting.set(true);
    this.logSubmitError.set(null);
    try {
      await firstValueFrom(
        this.projectService.createObjectLogEntry(this.projectId(), { content }),
      );
      this.logContent.set('');
      this.logResource.reload();
    } catch (err) {
      this.logSubmitError.set(toApiError(err));
    } finally {
      this.logSubmitting.set(false);
    }
  }

  protected onOccurrenceContentInput(event: Event): void {
    this.occurrenceContent.set((event.target as HTMLTextAreaElement).value);
  }

  protected async addOccurrenceEntry(event: Event): Promise<void> {
    event.preventDefault();
    const content = this.occurrenceContent().trim();
    if (!content || this.occurrenceSubmitting()) return;
    this.occurrenceSubmitting.set(true);
    this.occurrenceSubmitError.set(null);
    try {
      await firstValueFrom(
        this.projectService.createObjectOccurrenceEntry(this.projectId(), { content }),
      );
      this.occurrenceContent.set('');
      this.occurrenceResource.reload();
    } catch (err) {
      this.occurrenceSubmitError.set(toApiError(err));
    } finally {
      this.occurrenceSubmitting.set(false);
    }
  }

  protected dateLabel(date: string): string {
    return date.slice(0, 10);
  }
}
