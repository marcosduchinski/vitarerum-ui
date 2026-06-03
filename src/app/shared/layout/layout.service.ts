import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Subject } from 'rxjs';

interface LayoutState {
  staticMenuDesktopInactive: boolean;
  staticMenuMobileActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly state = signal<LayoutState>({
    staticMenuDesktopInactive: false,
    staticMenuMobileActive: false,
  });

  readonly layoutState = this.state.asReadonly();
  readonly isDarkTheme = signal(false);

  private readonly overlayOpenSubject = new Subject<void>();
  readonly overlayOpen$ = this.overlayOpenSubject.asObservable();

  readonly isSidebarVisible = computed(
    () =>
      (this.isDesktop() && !this.state().staticMenuDesktopInactive) ||
      this.state().staticMenuMobileActive,
  );

  onMenuToggle(): void {
    if (this.isDesktop()) {
      this.state.update((s) => ({
        ...s,
        staticMenuDesktopInactive: !s.staticMenuDesktopInactive,
      }));
    } else {
      this.state.update((s) => ({
        ...s,
        staticMenuMobileActive: !s.staticMenuMobileActive,
      }));
      this.overlayOpenSubject.next();
    }
  }

  closeMenu(): void {
    this.state.update((s) => ({
      ...s,
      staticMenuMobileActive: false,
    }));
  }

  toggleDarkMode(): void {
    const next = !this.isDarkTheme();
    this.isDarkTheme.set(next);
    if (!isPlatformBrowser(this.platformId)) return;
    this.document.documentElement.classList.toggle('app-dark', next);
  }

  isDesktop(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    return this.document.defaultView?.innerWidth
      ? this.document.defaultView.innerWidth > 991
      : true;
  }
}
