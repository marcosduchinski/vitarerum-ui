import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type ErrorMessageTone = 'danger' | 'info' | 'warning';

@Component({
  selector: 'app-error-message',
  standalone: true,
  templateUrl: './error-message.component.html',
  styleUrl: './error-message.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorMessageComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly tone = input<ErrorMessageTone>('danger');

  protected readonly role = 'alert';
}
