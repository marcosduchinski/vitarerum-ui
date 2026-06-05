import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '@shared/components/page-header/page-header.component';

import { ProjectObjectLogPanelComponent } from './project-object-log-panel.component';

@Component({
  selector: 'app-project-other-log-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, PageHeaderComponent, ProjectObjectLogPanelComponent],
  templateUrl: './project-other-log-page.component.html',
  styleUrl: './project-log-page.scss',
})
export class ProjectOtherLogPageComponent {
  readonly id = input.required<string>();
}
