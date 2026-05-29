import { InjectionToken } from '@angular/core';

export interface AppConfig {
  'app-name': string;
  'app-version': string;
  'api-base-url': string;
  'use-mock-api': boolean;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const USE_MOCK_API = new InjectionToken<boolean>('USE_MOCK_API');
