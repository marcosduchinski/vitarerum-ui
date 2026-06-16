import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { API_BASE_URL } from '@core/config/app-config.model';
import { buildApiUrl } from '@core/http/api-url.util';
import { Observable } from 'rxjs';

import {
  AddAssistanceTurnRequest,
  AssistanceSession,
  SearchObjectsRequest,
  StartProposalAgentSessionRequest,
} from '../models/assistance.model';

export const AI_STAFF_ASSISTANCE_SERVICE = new InjectionToken<AiStaffAssistanceService>(
  'AI_STAFF_ASSISTANCE_SERVICE',
);

@Injectable()
export class AiStaffAssistanceService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  startProposalAgentSession(
    request: StartProposalAgentSessionRequest,
  ): Observable<AssistanceSession> {
    return this.http.post<AssistanceSession>(this.url('/ai-staff-assistance/proposal-agent'), request);
  }

  addTurn(sessionId: string, request: AddAssistanceTurnRequest): Observable<AssistanceSession> {
    return this.http.post<AssistanceSession>(
      this.url(`/ai-staff-assistance/sessions/${sessionId}/turns`),
      request,
    );
  }

  searchObjects(sessionId: string, request: SearchObjectsRequest): Observable<AssistanceSession> {
    return this.http.post<AssistanceSession>(
      this.url(`/ai-staff-assistance/sessions/${sessionId}/object-searches`),
      request,
    );
  }

  getSession(sessionId: string): Observable<AssistanceSession> {
    return this.http.get<AssistanceSession>(this.url(`/ai-staff-assistance/sessions/${sessionId}`));
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
