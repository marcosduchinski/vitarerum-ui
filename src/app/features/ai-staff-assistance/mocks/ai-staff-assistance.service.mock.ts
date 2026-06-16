import { inject, Injectable } from '@angular/core';
import { IDENTITY_SERVICE } from '@core/auth/identity.service';
import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { UseType } from '@shared/models/collection-use-status.model';
import { ObjectReference } from '@shared/models/object-reference.model';
import { firstValueFrom, from, Observable, of, throwError } from 'rxjs';

import {
  AddAssistanceTurnRequest,
  AssistanceSession,
  AssistanceTurn,
  DocumentSearchMatch,
  EmailTriageResult,
  ObjectSearchResult,
  ProposalAgentRun,
  SearchObjectsRequest,
  StartProposalAgentSessionRequest,
} from '../models/assistance.model';
import {
  ASSISTANCE_CATALOG_DOCUMENTS,
  ASSISTANCE_OBJECT_INDEX,
  toCatalogDocumentMatch,
} from './proposal-agent.mock-data';
import { PROPOSAL_API_SERVICE } from '../../collections/proposals/services/proposal-api.service';
import { Document, Message, ProposalDetail } from '../../collections/proposals/models/proposal.model';

interface WeightedUseType {
  readonly useType: UseType;
  readonly score: number;
  readonly evidence: readonly string[];
}

@Injectable()
export class AiStaffAssistanceServiceMock {
  private readonly identity = inject(IDENTITY_SERVICE);
  private readonly proposalService = inject(PROPOSAL_API_SERVICE);
  private readonly sessions = new Map<string, AssistanceSession>();
  private nextId = 1;

  startProposalAgentSession(
    request: StartProposalAgentSessionRequest,
  ): Observable<AssistanceSession> {
    return from(this.startProposalAgentSessionAsync(request));
  }

  addTurn(sessionId: string, request: AddAssistanceTurnRequest): Observable<AssistanceSession> {
    const session = this.sessions.get(sessionId);
    if (!session) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    if (!request.content.trim()) return of(session);

    const now = new Date().toISOString();
    const staffTurn: AssistanceTurn = {
      id: this.nextEntityId('turn'),
      role: 'STAFF',
      content: request.content.trim(),
      createdAt: now,
    };
    const agentTurn: AssistanceTurn = {
      id: this.nextEntityId('turn'),
      role: 'AGENT',
      content: this.answerStaffTurn(session, request.content),
      createdAt: now,
    };
    const updated: AssistanceSession = {
      ...session,
      turns: [...session.turns, staffTurn, agentTurn],
    };
    this.sessions.set(sessionId, updated);
    return of(updated);
  }

  searchObjects(sessionId: string, request: SearchObjectsRequest): Observable<AssistanceSession> {
    const session = this.sessions.get(sessionId);
    if (!session) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));

    const latestRun = session.proposalAgentRuns.at(-1);
    if (!latestRun) return throwError(() => ({ status: 409, error: 'NO_AGENT_RUN' }));

    const objectSearch = this.searchObjectsForQuery(request.query);
    const updatedRun: ProposalAgentRun = {
      ...latestRun,
      status: objectSearch.status === 'NEEDS_MORE_INFORMATION' ? 'NEEDS_STAFF_INPUT' : 'COMPLETED',
      objectSearch,
      completedAt: objectSearch.status === 'NEEDS_MORE_INFORMATION' ? null : new Date().toISOString(),
    };
    const updated: AssistanceSession = {
      ...session,
      proposalAgentRuns: [...session.proposalAgentRuns.slice(0, -1), updatedRun],
      turns: [
        ...session.turns,
        {
          id: this.nextEntityId('turn'),
          role: 'AGENT',
          content: objectSearch.summary,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    this.sessions.set(sessionId, updated);
    return of(updated);
  }

  getSession(sessionId: string): Observable<AssistanceSession> {
    const session = this.sessions.get(sessionId);
    if (!session) return throwError(() => ({ status: 404, error: 'NOT_FOUND' }));
    return of(session);
  }

  private async startProposalAgentSessionAsync(
    request: StartProposalAgentSessionRequest,
  ): Promise<AssistanceSession> {
    if (!this.identity.isStaff()) throw { status: 403, error: 'FORBIDDEN' };

    const existing = this.findExistingSession(request.proposalId, request.messageId);
    if (existing) return existing;

    const proposal = await firstValueFrom(this.proposalService.getProposal(request.proposalId));
    const conversation = await firstValueFrom(this.proposalService.getConversation(request.proposalId));
    const message = conversation.messages.find((item) => item.id === request.messageId);
    if (!message) throw { status: 404, error: 'MESSAGE_NOT_FOUND' };

    const triage = this.triageEmail(proposal, message);
    const documentSearch = this.searchDocuments(proposal, message, triage.probableUseType);
    const objectSearch = this.createMissingObjectSearchResult();
    const run: ProposalAgentRun = {
      id: this.nextEntityId('run'),
      status: 'NEEDS_STAFF_INPUT',
      capabilities: ['EMAIL_TRIAGE', 'DOCUMENT_SEARCH', 'OBJECT_SEARCH'],
      triage,
      documentSearch,
      objectSearch,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    const session: AssistanceSession = {
      id: this.nextEntityId('session'),
      agent: 'PROPOSAL_AGENT',
      title: `ProposalAgent - ${proposal.referenceNumber}`,
      createdBy: this.currentPrincipal(),
      target: {
        type: 'PROPOSAL_MESSAGE',
        proposalId: proposal.id,
        conversationId: proposal.conversationId,
        messageId: message.id,
      },
      status: 'ACTIVE',
      selectedMessage: message,
      proposalSnapshot: proposal,
      accessibleDocuments: this.documentsForMessage(proposal, message),
      turns: [
        {
          id: this.nextEntityId('turn'),
          role: 'AGENT',
          content: this.initialAgentMessage(triage, documentSearch.matches.length),
          createdAt: new Date().toISOString(),
        },
      ],
      proposalAgentRuns: [run],
      createdAt: new Date().toISOString(),
      archivedAt: null,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  private findExistingSession(proposalId: string, messageId: string): AssistanceSession | null {
    return (
      [...this.sessions.values()].find(
        (session) =>
          session.target.proposalId === proposalId &&
          session.target.messageId === messageId &&
          session.createdBy.permissionId === this.identity.getPermissionId(),
      ) ?? null
    );
  }

  private currentPrincipal(): PermissionPrincipal {
    const session = this.identity.session();
    const permissionId = this.identity.getPermissionId();
    if (!session || !permissionId || !session.group) throw { status: 401, error: 'UNAUTHENTICATED' };
    return {
      permissionId,
      user: {
        id: session.user.id,
        name: session.user.displayName,
        email: session.user.email,
      },
      group: session.group,
    };
  }

  private triageEmail(proposal: ProposalDetail, message: Message): EmailTriageResult {
    const text = [
      proposal.title,
      proposal.intendedUse?.description ?? '',
      message.subject,
      message.body,
    ]
      .join(' ')
      .toLowerCase();
    const scores: readonly WeightedUseType[] = [
      this.scoreUseType(text, 'EXHIBITION', ['exhibition', 'display', 'public', 'education', 'loan']),
      this.scoreUseType(text, 'IN_SITU_VISIT', [
        'access',
        'visit',
        'research',
        'study',
        'catalogue',
        'catalogues',
        'notebook',
        'notebooks',
        'records',
        'specimen',
      ]),
      this.scoreUseType(text, 'OTHER', ['other', 'mixed', 'unclear', 'general']),
    ];
    const fallback: WeightedUseType = {
      useType: proposal.type,
      score: 1,
      evidence: [`Existing proposal type is ${proposal.type.replace('_', ' ')}.`],
    };
    const best = [...scores, fallback].sort((a, b) => b.score - a.score)[0];
    const confidence = best.score >= 3 ? 'HIGH' : best.score >= 2 ? 'MEDIUM' : 'LOW';
    return {
      probableUseType: best.useType,
      confidence,
      rationale: `The selected message and proposal description most closely match ${best.useType.replace('_', ' ').toLowerCase()}.`,
      evidence: best.evidence,
    };
  }

  private scoreUseType(
    text: string,
    useType: UseType,
    keywords: readonly string[],
  ): WeightedUseType {
    const evidence = keywords
      .filter((keyword) => text.includes(keyword))
      .map((keyword) => `Matched "${keyword}".`);
    return { useType, score: evidence.length, evidence };
  }

  private searchDocuments(
    proposal: ProposalDetail,
    message: Message,
    useType: UseType,
  ): NonNullable<ProposalAgentRun['documentSearch']> {
    const attachmentIds = new Set((message.attachments ?? []).map((attachment) => attachment.documentId));
    const attachmentMatches: DocumentSearchMatch[] = proposal.documents
      .filter((document) => attachmentIds.has(document.id))
      .map((document) => ({
        documentId: document.id,
        fileName: document.fileName,
        type: document.type,
        source: 'PROPOSAL_ATTACHMENT',
        reason: 'Attached to the selected requester message.',
      }));
    const catalogMatches = ASSISTANCE_CATALOG_DOCUMENTS.filter((document) =>
      document.useTypes.includes(useType),
    ).map(toCatalogDocumentMatch);
    const matches = [...attachmentMatches, ...catalogMatches];
    return {
      query: `${useType} proposal assistance documents`,
      basedOnUseType: useType,
      matches,
      summary: matches.length
        ? `Found ${matches.length} document${matches.length === 1 ? '' : 's'} relevant to ${useType.replace('_', ' ').toLowerCase()}.`
        : 'No matching documents were found for the current triage.',
    };
  }

  private documentsForMessage(proposal: ProposalDetail, message: Message): Document[] {
    const attachmentIds = new Set((message.attachments ?? []).map((attachment) => attachment.documentId));
    return proposal.documents.filter((document) => attachmentIds.has(document.id));
  }

  private createMissingObjectSearchResult(): ObjectSearchResult {
    return {
      status: 'NEEDS_MORE_INFORMATION',
      query: null,
      matches: [],
      missingInformation: [
        'inventory number',
        'object name',
        'collection area',
        'short object description',
      ],
      summary:
        'Object search needs more information. Provide an inventory number, object name, collection area, or short description.',
    };
  }

  private searchObjectsForQuery(query: string): ObjectSearchResult {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return this.createMissingObjectSearchResult();

    const matches: ObjectReference[] = ASSISTANCE_OBJECT_INDEX.filter((item) =>
      [item.inventoryNumber, item.displayTitle, item.objectName, item.briefDescriptionSnapshot, ...item.keywords]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalized)),
    ).map(({ keywords: _keywords, ...reference }) => reference);
    if (!matches.length) {
      return {
        status: 'NO_MATCHES',
        query,
        matches: [],
        missingInformation: [],
        summary: `No collection objects matched "${query}".`,
      };
    }
    return {
      status: 'SEARCHED',
      query,
      matches,
      missingInformation: [],
      summary: `Found ${matches.length} object${matches.length === 1 ? '' : 's'} matching "${query}".`,
    };
  }

  private answerStaffTurn(session: AssistanceSession, content: string): string {
    const latestRun = session.proposalAgentRuns.at(-1);
    const triage = latestRun?.triage;
    const lower = content.toLowerCase();
    if (lower.includes('object') || lower.includes('inventory') || lower.includes('search')) {
      return 'Use the object search field with an inventory number, object name, collection area, or short description so I can search the mock object index.';
    }
    if (triage) {
      return `Current triage is ${triage.probableUseType.replace('_', ' ').toLowerCase()} with ${triage.confidence.toLowerCase()} confidence.`;
    }
    return 'I can help triage the email, find relevant documents, and prepare object-search questions.';
  }

  private initialAgentMessage(triage: EmailTriageResult, documentCount: number): string {
    return `I triaged this message as ${triage.probableUseType.replace('_', ' ').toLowerCase()} with ${triage.confidence.toLowerCase()} confidence and found ${documentCount} relevant document${documentCount === 1 ? '' : 's'}. I need more object information before running object search.`;
  }

  private nextEntityId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }
}
