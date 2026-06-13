import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectOccurrenceLogPanelComponent } from './project-occurrence-log-panel.component';

@Component({
  selector: 'app-project-exhibition-occurrence-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectOccurrenceLogPanelComponent],
  templateUrl: './project-exhibition-occurrence-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectExhibitionOccurrenceLogPageComponent {
  readonly id = input.required<string>();
}
