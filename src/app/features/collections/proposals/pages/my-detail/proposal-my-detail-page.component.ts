import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-proposal-my-detail-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './proposal-my-detail-page.component.html',
  styleUrl: './proposal-my-detail-page.component.scss',
})
export class ProposalMyDetailPageComponent {
  readonly id = input.required<string>();
}
