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
import { API_BASE_URL, USE_MOCK_API } from '@core/config/app-config.model';
import { AppConfigService } from '@core/config/app-config.service';
import { authInterceptor } from '@core/auth/auth.interceptor';
import { sessionExpiredInterceptor } from '@core/auth/session-expired.interceptor';
import { provideCollectionUse } from '@core/providers/provide-collection-use';
import { provideIdentity } from '@core/providers/provide-identity';
import { provideUserManagement } from '@core/providers/provide-user-management';
import { providePrimeNG } from 'primeng/config';

import { routes } from './app.routes';

const VitarerumPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef2ff',
      100: '#dce3fd',
      200: '#b9c7fb',
      300: '#8fa5f8',
      400: '#6583f4',
      500: '#4361ee',
      600: '#3451d1',
      700: '#2a41b0',
      800: '#20318a',
      900: '#152065',
      950: '#0a1040',
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
