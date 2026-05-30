import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { API_BASE_URL } from 'src/app/core/config/app-config.model';
import { buildApiUrl } from 'src/app/core/http/api-url.util';
import { buildHttpParams } from 'src/app/core/http/http-params.util';
import { Page, PageQuery } from 'src/app/shared/models/page.model';
import { Observable } from 'rxjs';

import {
  AssignProposalRequest,
  DirectionClarificationRequest,
  ForwardProposalRequest,
  ProposalAssignmentResult,
  ProposalDecisionResult,
  ProposalNoteRequest,
  ProposalReasonRequest,
  ProposalStatusActionResult,
  ReferToDirectionRequest,
  RequestDocumentsRequest,
  RequestDocumentsResult,
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

  uploadDocument(proposalId: string, file: File, documentType: string): Observable<Document> {
    const body = new FormData();
    body.append('file', file);
    body.append('documentType', documentType);

    return this.http.post<Document>(this.url(`/proposals/${proposalId}/documents`), body);
  }

  listDocuments(proposalId: string): Observable<ProposalDocumentsResponse> {
    return this.http.get<ProposalDocumentsResponse>(this.url(`/proposals/${proposalId}/documents`));
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
    return this.http.post<ProposalAssignmentResult>(this.url(`/proposals/${proposalId}/assign`), request);
  }

  requestDocuments(
    proposalId: string,
    request: RequestDocumentsRequest,
  ): Observable<RequestDocumentsResult> {
    return this.http.post<RequestDocumentsResult>(
      this.url(`/proposals/${proposalId}/request-documents`),
      request,
    );
  }

  forwardProposal(
    proposalId: string,
    request: ForwardProposalRequest,
  ): Observable<ProposalAssignmentResult> {
    return this.http.post<ProposalAssignmentResult>(this.url(`/proposals/${proposalId}/forward`), request);
  }

  startReview(proposalId: string, request: ProposalNoteRequest): Observable<ProposalStatusActionResult> {
    return this.http.post<ProposalStatusActionResult>(
      this.url(`/proposals/${proposalId}/start-review`),
      request,
    );
  }

  referToDirection(
    proposalId: string,
    request: ReferToDirectionRequest,
  ): Observable<ProposalStatusActionResult> {
    return this.http.post<ProposalStatusActionResult>(
      this.url(`/proposals/${proposalId}/refer-to-direction`),
      request,
    );
  }

  clarifyDirection(
    proposalId: string,
    request: DirectionClarificationRequest,
  ): Observable<ProposalStatusActionResult> {
    return this.http.post<ProposalStatusActionResult>(
      this.url(`/proposals/${proposalId}/direction-clarification`),
      request,
    );
  }

  approveProposal(proposalId: string, request: ProposalNoteRequest): Observable<ProposalDecisionResult> {
    return this.http.post<ProposalDecisionResult>(this.url(`/proposals/${proposalId}/approve`), request);
  }

  rejectProposal(proposalId: string, request: ProposalReasonRequest): Observable<ProposalDecisionResult> {
    return this.http.post<ProposalDecisionResult>(this.url(`/proposals/${proposalId}/reject`), request);
  }

  cancelProposal(proposalId: string, request: ProposalReasonRequest): Observable<ProposalDecisionResult> {
    return this.http.post<ProposalDecisionResult>(this.url(`/proposals/${proposalId}/cancel`), request);
  }

  private url(path: string): string {
    return buildApiUrl(this.apiBaseUrl, path);
  }
}
