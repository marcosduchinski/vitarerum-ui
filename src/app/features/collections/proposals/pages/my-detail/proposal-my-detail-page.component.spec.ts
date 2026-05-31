import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';

import { ProposalMyDetailPageComponent } from './proposal-my-detail-page.component';

describe('ProposalMyDetailPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProposalMyDetailPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the blank assignment detail placeholder', () => {
    const fixture = TestBed.createComponent(ProposalMyDetailPageComponent);
    const componentRef: ComponentRef<ProposalMyDetailPageComponent> = fixture.componentRef;

    componentRef.setInput('id', 'proposal-1');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('My assignment');
    expect(compiled.querySelector('a[href="/p/collections/proposals/my"]')).not.toBeNull();
  });
});
