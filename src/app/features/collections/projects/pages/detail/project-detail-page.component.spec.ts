import { ComponentRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { ProjectDetailPageComponent } from './project-detail-page.component';

describe('ProjectDetailPageComponent', () => {
  let componentRef: ComponentRef<ProjectDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDetailPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders a blank detail placeholder for the project id', () => {
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(text).toContain('Project detail');
    expect(text).toContain('proj-12');
    expect(compiled(fixture).querySelector('a[href="/p/collections/projects/my"]')).not.toBeNull();
    expect(text).toContain('Back to my projects');
  });

  it('uses safe return query inputs for the back link', () => {
    const fixture = TestBed.createComponent(ProjectDetailPageComponent);
    componentRef = fixture.componentRef;
    componentRef.setInput('id', 'proj-12');
    componentRef.setInput('returnTo', '/p/collections/proposals/approved');
    componentRef.setInput('returnLabel', 'approved proposals');
    fixture.detectChanges();

    const element = compiled(fixture);

    expect(element.querySelector('a[href="/p/collections/proposals/approved"]')).not.toBeNull();
    expect(element.textContent).toContain('Back to approved proposals');
  });
});

function compiled(fixture: ReturnType<typeof TestBed.createComponent<ProjectDetailPageComponent>>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}
