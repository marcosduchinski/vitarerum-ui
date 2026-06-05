import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectObjectLogPanelComponent } from './project-object-log-panel.component';

@Component({
  selector: 'app-project-exhibition-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectObjectLogPanelComponent],
  templateUrl: './project-exhibition-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectExhibitionLogPageComponent {
  readonly id = input.required<string>();
}
