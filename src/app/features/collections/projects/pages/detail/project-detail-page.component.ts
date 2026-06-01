import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

function safeReturnTo(value: string | undefined): string {
  return value?.startsWith('/p/collections') ? value : '/p/collections/projects/my';
}

function safeReturnLabel(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'my projects';
}

@Component({
  selector: 'app-project-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './project-detail-page.component.html',
  styleUrl: './project-detail-page.component.scss',
})
export class ProjectDetailPageComponent {
  readonly id = input.required<string>();
  readonly returnTo = input<string>();
  readonly returnLabel = input<string>();

  protected readonly backLink = () => safeReturnTo(this.returnTo());
  protected readonly backLabel = () => `Back to ${safeReturnLabel(this.returnLabel())}`;
}
