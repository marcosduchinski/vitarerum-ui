import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

@Component({
  selector: 'app-project-other-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent],
  templateUrl: './project-other-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectOtherLogPageComponent {
  readonly id = input.required<string>();
}
