import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { API_BASE_URL, USE_MOCK_API } from '@core/config/app-config.model';
import { AppConfigService } from '@core/config/app-config.service';
import { authInterceptor } from '@core/identity/auth.interceptor';
import { sessionExpiredInterceptor } from '@core/identity/session-expired.interceptor';
import { provideIdentity } from '@core/providers/provide-identity';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, sessionExpiredInterceptor])),
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
  ],
};
