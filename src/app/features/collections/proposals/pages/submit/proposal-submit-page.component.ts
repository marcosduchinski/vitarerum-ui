import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiError, toApiError } from '@core/http/api-error.model';
import { ErrorMessageComponent } from '@shared/components/error-message/error-message.component';
import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';
import { UseType } from '@shared/models/collection-use-status.model';

import { PROPOSAL_API_SERVICE } from '../../services/proposal-api.service';

const USE_TYPES: { value: UseType; label: string }[] = [
  { value: 'RESEARCH', label: 'Research' },
  { value: 'EXHIBITION', label: 'Exhibition' },
  { value: 'OTHER', label: 'Other' },
];

@Component({
  selector: 'app-proposal-submit-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PageHeaderComponent, ErrorMessageComponent],
  templateUrl: './proposal-submit-page.component.html',
  styleUrl: './proposal-submit-page.component.scss',
})
export class ProposalSubmitPageComponent {
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly router = inject(Router);

  protected readonly useTypes = USE_TYPES;

  protected readonly title = signal('');
  protected readonly type = signal<UseType | ''>('');
  protected readonly purpose = signal('');
  protected readonly beginDate = signal('');
  protected readonly endDate = signal('');
  protected readonly recipient = signal('');
  protected readonly subject = signal('');
  protected readonly body = signal('');

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<ApiError | null>(null);

  protected readonly titleError = computed(() => this.submitted() && !this.title().trim());
  protected readonly typeError = computed(() => this.submitted() && !this.type());
  protected readonly purposeError = computed(() => this.submitted() && !this.purpose().trim());
  protected readonly beginDateError = computed(() => this.submitted() && !this.beginDate());
  protected readonly endDateError = computed(
    () =>
      this.submitted() &&
      (!this.endDate() || (!!this.beginDate() && this.endDate() <= this.beginDate())),
  );
  protected readonly recipientError = computed(
    () => this.submitted() && (!this.recipient().trim() || !this.recipient().includes('@')),
  );
  protected readonly subjectError = computed(() => this.submitted() && !this.subject().trim());
  protected readonly bodyError = computed(() => this.submitted() && !this.body().trim());

  private readonly isValid = computed(
    () =>
      !!this.title().trim() &&
      !!this.type() &&
      !!this.purpose().trim() &&
      !!this.beginDate() &&
      !!this.endDate() &&
      this.endDate() > this.beginDate() &&
      this.recipient().includes('@') &&
      !!this.subject().trim() &&
      !!this.body().trim(),
  );

  protected onInput(field: string, event: Event): void {
    const value = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
    switch (field) {
      case 'title': this.title.set(value); break;
      case 'type': this.type.set(value as UseType); break;
      case 'purpose': this.purpose.set(value); break;
      case 'beginDate': this.beginDate.set(value); break;
      case 'endDate': this.endDate.set(value); break;
      case 'recipient': this.recipient.set(value); break;
      case 'subject': this.subject.set(value); break;
      case 'body': this.body.set(value); break;
    }
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    this.submitted.set(true);
    if (!this.isValid()) return;

    this.submitting.set(true);
    this.submitError.set(null);

    try {
      const response = await firstValueFrom(
        this.proposalService.createProposal({
          title: this.title().trim(),
          type: this.type() as UseType,
          purpose: this.purpose().trim(),
          beginDate: this.beginDate(),
          endDate: this.endDate(),
        }),
      );

      await firstValueFrom(
        this.proposalService.sendMessage(response.proposal.id, {
          recipient: this.recipient().trim(),
          subject: this.subject().trim(),
          body: this.body().trim(),
        }),
      );

      void this.router.navigateByUrl(`/p/collections/proposals/${response.proposal.id}`);
    } catch (err) {
      this.submitError.set(toApiError(err));
      this.submitting.set(false);
    }
  }
}
