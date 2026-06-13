import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectOccurrenceLogPanelComponent } from './project-occurrence-log-panel.component';

@Component({
  selector: 'app-project-research-occurrence-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectOccurrenceLogPanelComponent],
  templateUrl: './project-research-occurrence-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectResearchOccurrenceLogPageComponent {
  readonly id = input.required<string>();
}
