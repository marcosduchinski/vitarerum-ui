import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

const VitarerumPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#e0f8f8',
      100: '#b3eeed',
      200: '#80e4e3',
      300: '#4dd9d8',
      400: '#2bd1d0',
      500: '#2bcfce',
      600: '#1baead',
      700: '#138a8b',
      800: '#0d6566',
      900: '#073f40',
      950: '#031f20',
    },
    colorScheme: {
      light: {
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
      },
    },
  },
});
import { API_BASE_URL, USE_MOCK_API } from '@core/config/app-config.model';
import { AppConfigService } from '@core/config/app-config.service';
import { authInterceptor } from '@core/identity/auth.interceptor';
import { sessionExpiredInterceptor } from '@core/identity/session-expired.interceptor';
import { provideCollectionUse } from '@core/providers/provide-collection-use';
import { provideIdentity } from '@core/providers/provide-identity';
import { provideUserManagement } from '@core/providers/provide-user-management';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessionExpiredInterceptor])),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: VitarerumPreset,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
    }),
    provideAppInitializer(() => inject(AppConfigService).load()),
    {
      provide: API_BASE_URL,
      useFactory: (config: AppConfigService) => config.get('api-base-url'),
      deps: [AppConfigService],
    },
    {
      provide: USE_MOCK_API,
      useFactory: (config: AppConfigService) => config.get('use-mock-api'),
      deps: [AppConfigService],
    },
    provideIdentity(),
    provideCollectionUse(),
    provideUserManagement(),
  ],
};
