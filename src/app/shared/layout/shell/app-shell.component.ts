import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Renderer2 } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';

import { AppFooterComponent } from '@layout/footer/app-footer.component';
import { AppSidebarComponent } from '@layout/sidebar/app-sidebar.component';
import { AppTopbarComponent } from '@layout/topbar/app-topbar.component';
import { LayoutService } from '@layout/layout.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, AppTopbarComponent, AppSidebarComponent, AppFooterComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  protected readonly layoutService = inject(LayoutService);
  private readonly renderer = inject(Renderer2);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private menuOutsideClickListener?: () => void;

  protected readonly containerClass = computed(() => {
    const state = this.layoutService.layoutState();
    return {
      'layout-wrapper': true,
      'layout-static': true,
      'layout-static-inactive': state.staticMenuDesktopInactive,
      'layout-mobile-active': state.staticMenuMobileActive,
    };
  });

  constructor() {
    this.layoutService.overlayOpen$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.menuOutsideClickListener ??= this.renderer.listen(
        'document',
        'click',
        (event: MouseEvent) => {
          if (this.isOutsideClicked(event)) this.hideMenu();
        },
      );
      document.body.classList.add('blocked-scroll');
    });

    this.router.events
      .pipe(
        filter(e => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.hideMenu());
  }

  private isOutsideClicked(event: MouseEvent): boolean {
    const sidebar = document.querySelector('.layout-sidebar');
    const menuBtn = document.querySelector('.layout-menu-button');
    const target = event.target as Node;
    return !(
      sidebar?.isSameNode(target) ||
      sidebar?.contains(target) ||
      menuBtn?.isSameNode(target) ||
      menuBtn?.contains(target)
    );
  }

  private hideMenu(): void {
    this.layoutService.closeMenu();
    this.menuOutsideClickListener?.();
    this.menuOutsideClickListener = undefined;
    document.body.classList.remove('blocked-scroll');
  }
}
