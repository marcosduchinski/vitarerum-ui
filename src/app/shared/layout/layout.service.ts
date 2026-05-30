import { computed, Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

interface LayoutState {
  staticMenuDesktopInactive: boolean;
  staticMenuMobileActive: boolean;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
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
      this.state.update(s => ({
        ...s,
        staticMenuDesktopInactive: !s.staticMenuDesktopInactive,
      }));
    } else {
      this.state.update(s => ({
        ...s,
        staticMenuMobileActive: !s.staticMenuMobileActive,
      }));
      this.overlayOpenSubject.next();
    }
  }

  closeMenu(): void {
    this.state.update(s => ({
      ...s,
      staticMenuMobileActive: false,
    }));
  }

  toggleDarkMode(): void {
    const next = !this.isDarkTheme();
    this.isDarkTheme.set(next);
    document.documentElement.classList.toggle('app-dark', next);
  }

  isDesktop(): boolean {
    return window.innerWidth > 991;
  }
}
