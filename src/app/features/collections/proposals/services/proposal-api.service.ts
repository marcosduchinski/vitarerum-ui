import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { API_BASE_URL } from '@core/config/app-config.model';
import { buildApiUrl } from '@core/http/api-url.util';
import { buildHttpParams } from '@core/http/http-params.util';
import { Page, PageQuery } from '@shared/models/page.model';
import { Observable } from 'rxjs';

import {
  AddProposalWatcherRequest,
  AddRequestedObjectsRequest,
  ApproveProposalRequest,
  AssignProposalRequest,
  DirectionClarificationRequest,
  ForwardProposalRequest,
  ProposalAssignmentResult,
  ProposalDecisionResult,
  ProposalEventResult,
  ProposalNoteRequest,
  ProposalReasonRequest,
  ReferToDirectionRequest,
} from '../models/proposal-actions.model';
import {
  Conversation,
  CreateProposalRequest,
  CreateProposalResponse,
  Document,
  Message,
  ProposalDetail,
  ProposalDocumentsResponse,
  ProposalEventsPage,
  ProposalListQuery,
  ProposalSummary,
  SendMessageRequest,
} from '../models/proposal.model';

export const PROPOSAL_API_SERVICE = new InjectionToken<ProposalApiService>('PROPOSAL_API_SERVICE');

@Injectable()
export class ProposalApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  createProposal(request: CreateProposalRequest): Observable<CreateProposalResponse> {
    return this.http.post<CreateProposalResponse>(this.url('/proposals'), request);
  }

  listProposals(query: ProposalListQuery = {}): Observable<Page<ProposalSummary>> {
    return this.http.get<Page<ProposalSummary>>(this.url('/proposals'), {
      params: buildHttpParams(query),
    });
  }

  getProposal(proposalId: string): Observable<ProposalDetail> {
    return this.http.get<ProposalDetail>(this.url(`/proposals/${proposalId}`));
  }

  addRequestedObjects(
    proposalId: string,
    request: AddRequestedObjectsRequest,
  ): Observable<ProposalDetail> {
    return this.http.post<ProposalDetail>(
      this.url(`/proposals/${proposalId}/requested-objects`),
      request,
    );
  }

  uploadDocument(proposalId: string, file: File, documentType: string): Observable<Document> {
    const body = new FormData();
    body.append('file', file);
    body.append('documentType', documentType);

    return this.http.post<Document>(this.url(`/proposals/${proposalId}/documents`), body);
  }

  requestDocuments(proposalId: string, request: ProposalNoteRequest): Observable<void> {
    return this.http.post<void>(this.url(`/proposals/${proposalId}/request-documents`), request);
  }

  listDocuments(proposalId: string): Observable<ProposalDocumentsResponse> {
    return this.http.get<ProposalDocumentsResponse>(this.url(`/proposals/${proposalId}/documents`));
  }

  // Downloads a single document's binary content. The endpoint streams the file
  // (Content-Disposition: attachment); the Bearer token is added by the auth
  // interceptor, so it must be fetched here rather than linked directly.
  downloadDocument(proposalId: string, documentId: string): Observable<Blob> {
    return this.http.get(this.url(`/proposals/${proposalId}/documents/${documentId}`), {
      responseType: 'blob',
    });
  }

  listEvents(proposalId: string, query: PageQuery = {}): Observable<ProposalEventsPage> {
    return this.http.get<ProposalEventsPage>(this.url(`/proposals/${proposalId}/events`), {
      params: buildHttpParams(query),
    });
  }

  getConversation(proposalId: string, query: PageQuery = {}): Observable<Conversation> {
    return this.http.get<Conversation>(this.url(`/proposals/${proposalId}/conversation`), {
      params: buildHttpParams(query),
    });
  }

  sendMessage(proposalId: string, request: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(
      this.url(`/proposals/${proposalId}/conversation/messages`),
      request,
    );
  }

  assignProposal(
    proposalId: string,
    request: AssignProposalRequest,
  ): Observable<ProposalAssignmentResult> {
    return this.http.post<ProposalAssignmentResult>(
      this.url(`/proposals/${proposalId}/assign`),
      request,
    );
  }

  forwardProposal(
    proposalId: string,
    request: ForwardProposalRequest,
  ): Observable<ProposalAssignmentResult> {
    return this.http.post<ProposalAssignmentResult>(
      this.url(`/proposals/${proposalId}/forward`),
      request,
    );
  }

  referToDirection(
    proposalId: string,
    request: ReferToDirectionRequest,
  ): Observable<ProposalEventResult> {
    return this.http.post<ProposalEventResult>(
      this.url(`/proposals/${proposalId}/refer-to-direction`),
      request,
    );
  }

  directionClarification(
    proposalId: string,
    request: DirectionClarificationRequest,
  ): Observable<ProposalEventResult> {
    return this.http.post<ProposalEventResult>(
      this.url(`/proposals/${proposalId}/direction-clarification`),
      request,
    );
  }

  addWatcher(
    proposalId: string,
    request: AddProposalWatcherRequest,
  ): Observable<PermissionPrincipal> {
    return this.http.post<PermissionPrincipal>(
      this.url(`/proposals/${proposalId}/watchers`),
      request,
    );
  }

  removeWatcher(proposalId: string, permissionId: string): Observable<void> {
    return this.http.delete<void>(this.url(`/proposals/${proposalId}/watchers/${permissionId}`));
  }

  approveProposal(
    proposalId: string,
    request: ApproveProposalRequest,
  ): Observable<ProposalDecisionResult> {
    return this.http.post<ProposalDecisionResult>(
      this.url(`/proposals/${proposalId}/approve`),
      request,
    );
  }

  rejectProposal(
    proposalId: string,
    request: ProposalReasonRequest,
  ): Observable<ProposalDecisionResult> {
    return this.http.post<ProposalDecisionResult>(
      this.url(`/proposals/${proposalId}/reject`),
      request,
    );
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
