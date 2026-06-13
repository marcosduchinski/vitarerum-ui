import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectOccurrenceLogPanelComponent } from './project-occurrence-log-panel.component';

@Component({
  selector: 'app-project-other-occurrence-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectOccurrenceLogPanelComponent],
  templateUrl: './project-other-occurrence-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectOtherOccurrenceLogPageComponent {
  readonly id = input.required<string>();
}
