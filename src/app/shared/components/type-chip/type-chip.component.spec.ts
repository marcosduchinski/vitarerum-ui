import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { UseType } from '@shared/models/collection-use-status.model';

import { getUseTypePresentation, TypeChipComponent } from './type-chip.component';

@Component({
  standalone: true,
  imports: [TypeChipComponent],
  template: `<app-type-chip [type]="type" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class TypeChipHostComponent {
  type: UseType = 'RESEARCH';
}

describe('TypeChipComponent', () => {
  it('maps use types to labels and tones', () => {
    expect(getUseTypePresentation('RESEARCH')).toEqual({ label: 'Research', tone: 'research' });
    expect(getUseTypePresentation('EXHIBITION')).toEqual({
      label: 'Exhibition',
      tone: 'exhibition',
    });
    expect(getUseTypePresentation('OTHER')).toEqual({ label: 'Other', tone: 'other' });
  });

  it('renders an accessible type chip', async () => {
    await TestBed.configureTestingModule({
      imports: [TypeChipHostComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(TypeChipHostComponent);

    fixture.detectChanges();
    await fixture.whenStable();

    const chip = fixture.nativeElement.querySelector('.type-chip') as HTMLElement | null;

    expect(chip?.textContent?.trim()).toBe('Research');
    expect(chip?.classList.contains('type-chip--research')).toBe(true);
    expect(chip?.getAttribute('aria-label')).toBe('Proposal type: Research');
  });
});
