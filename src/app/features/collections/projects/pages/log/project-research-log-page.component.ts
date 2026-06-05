import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectObjectLogPanelComponent } from './project-object-log-panel.component';

@Component({
  selector: 'app-project-research-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectObjectLogPanelComponent],
  templateUrl: './project-research-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectResearchLogPageComponent {
  readonly id = input.required<string>();
}
