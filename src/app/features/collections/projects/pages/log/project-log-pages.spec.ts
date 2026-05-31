import { ComponentRef, Type } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ProjectExhibitionLogPageComponent } from './project-exhibition-log-page.component';
import { ProjectOtherLogPageComponent } from './project-other-log-page.component';
import { ProjectResearchLogPageComponent } from './project-research-log-page.component';

describe('project log pages', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ProjectResearchLogPageComponent,
        ProjectExhibitionLogPageComponent,
        ProjectOtherLogPageComponent,
      ],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the blank research log page', () => {
    expect(render(ProjectResearchLogPageComponent)).toContain('Research log');
  });

  it('renders the blank exhibition log page', () => {
    expect(render(ProjectExhibitionLogPageComponent)).toContain('Exhibition log');
  });

  it('renders the blank other log page', () => {
    expect(render(ProjectOtherLogPageComponent)).toContain('Project log');
  });
});

function render<T extends { readonly id: () => string }>(component: Type<T>): string {
  const fixture = TestBed.createComponent(component);
  const componentRef: ComponentRef<T> = fixture.componentRef;
  componentRef.setInput('id', 'project-1');
  fixture.detectChanges();

  const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

  expect(text).toContain('project-1');
  return text;
}
