import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ErrorMessageComponent } from './error-message.component';

@Component({
  standalone: true,
  imports: [ErrorMessageComponent],
  template: `
    <app-error-message
      title="Could not load proposals"
      message="Try again in a moment."
      tone="warning"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ErrorMessageHostComponent {}

describe('ErrorMessageComponent', () => {
  it('renders alert content with the selected tone', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorMessageHostComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    const message = fixture.nativeElement.querySelector('.error-message') as HTMLElement | null;

    expect(message?.getAttribute('role')).toBe('alert');
    expect(message?.classList.contains('error-message--warning')).toBe(true);
    expect(message?.textContent).toContain('Could not load proposals');
    expect(message?.textContent).toContain('Try again in a moment.');
  });
});
