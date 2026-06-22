import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { InSituVisitReportNarrative } from '../../models/report.model';

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

@Component({
  selector: 'app-in-situ-visit-report-narrative',
  standalone: true,
  templateUrl: './in-situ-visit-report-narrative.component.html',
  styleUrl: './in-situ-visit-report-narrative.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InSituVisitReportNarrativeComponent {
  readonly narrative = input<InSituVisitReportNarrative | null>(null);

  protected readonly formatDateTime = formatDateTime;
}
