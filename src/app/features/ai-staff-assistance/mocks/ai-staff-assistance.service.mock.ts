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
  AssistanceTurnResult,
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
import {
  Document,
  Message,
  ProposalDetail,
} from '../../collections/proposals/models/proposal.model';

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
    const answer = this.routeStaffIntent(session, request.content);
    const agentTurn: AssistanceTurn = {
      id: this.nextEntityId('turn'),
      role: 'AGENT',
      content: answer.content,
      result: answer.result ?? null,
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
      completedAt:
        objectSearch.status === 'NEEDS_MORE_INFORMATION' ? null : new Date().toISOString(),
    };
    const now = new Date().toISOString();
    const updated: AssistanceSession = {
      ...session,
      proposalAgentRuns: [...session.proposalAgentRuns.slice(0, -1), updatedRun],
      turns: [
        ...session.turns,
        {
          id: this.nextEntityId('turn'),
          role: 'STAFF',
          content: `Search the collection for "${request.query.trim()}".`,
          createdAt: now,
        },
        {
          id: this.nextEntityId('turn'),
          role: 'AGENT',
          content: objectSearch.summary,
          result: { kind: 'OBJECT_SEARCH', objectSearch },
          createdAt: now,
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
    const conversation = await firstValueFrom(
      this.proposalService.getConversation(request.proposalId),
    );
    const message = conversation.messages.find((item) => item.id === request.messageId);
    if (!message) throw { status: 404, error: 'MESSAGE_NOT_FOUND' };

    const triage = this.triageEmail(proposal, message);
    const documentSearch = this.searchDocuments(proposal, message, triage.probableUseType);
    const objectSearch = this.createMissingObjectSearchResult();
    const accessibleDocuments = this.documentsForMessage(proposal, message);
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
      accessibleDocuments,
      turns: [
        {
          id: this.nextEntityId('turn'),
          role: 'AGENT',
          content: this.initialAgentMessage(accessibleDocuments.length),
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
    if (!session || !permissionId || !session.group)
      throw { status: 401, error: 'UNAUTHENTICATED' };
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
      this.scoreUseType(text, 'EXHIBITION', [
        'exhibition',
        'display',
        'public',
        'education',
        'loan',
      ]),
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
    const attachmentIds = new Set(
      (message.attachments ?? []).map((attachment) => attachment.documentId),
    );
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
    const attachmentIds = new Set(
      (message.attachments ?? []).map((attachment) => attachment.documentId),
    );
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
      [
        item.inventoryNumber,
        item.displayTitle,
        item.objectName,
        item.briefDescriptionSnapshot,
        ...item.keywords,
      ]
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

  // Maps a free-text staff message to one capability and answers conversationally,
  // attaching that capability's result so it is revealed only when asked. The
  // pre-computed conclusions stay "behind the veil" until this routes to them.
  private routeStaffIntent(
    session: AssistanceSession,
    content: string,
  ): { content: string; result?: AssistanceTurnResult } {
    const run = session.proposalAgentRuns.at(-1);
    const lower = content.toLowerCase();

    if (
      this.matches(lower, ['triage', 'classif', 'categor', 'use type', 'what kind', 'what type'])
    ) {
      const triage = run?.triage;
      if (triage) {
        return {
          content: `I read this as a ${triage.probableUseType.replace('_', ' ').toLowerCase()} request — ${triage.confidence.toLowerCase()} confidence. ${triage.rationale}`,
          result: { kind: 'TRIAGE', triage },
        };
      }
    }

    if (
      this.matches(lower, [
        'document',
        'file',
        'form',
        'template',
        'paperwork',
        'attachment',
        'guide',
      ])
    ) {
      const documentSearch = run?.documentSearch;
      if (documentSearch) {
        return {
          content: `${documentSearch.summary} Here is what I would pull together.`,
          result: { kind: 'DOCUMENT_SEARCH', documentSearch },
        };
      }
    }

    if (
      this.matches(lower, [
        'object',
        'inventory',
        'item',
        'artwork',
        'artefact',
        'artifact',
        'specimen',
        'search',
      ])
    ) {
      const objectSearch = run?.objectSearch;
      if (objectSearch) {
        return {
          content:
            objectSearch.status === 'NEEDS_MORE_INFORMATION'
              ? 'I can search the collection — give me an inventory number, object name, collection area, or a short description and I will look it up.'
              : objectSearch.summary,
          result: { kind: 'OBJECT_SEARCH', objectSearch },
        };
      }
    }

    if (this.matches(lower, ['help', 'what can you', 'capab', 'how can you', 'options'])) {
      return {
        content:
          'I can triage this request, find relevant documents, or search the collection for objects. Which would you like to start with?',
      };
    }

    return {
      content:
        'I can help with three things here: email triage, document search, and object search. Ask me for any of them to begin.',
    };
  }

  private matches(text: string, needles: readonly string[]): boolean {
    return needles.some((needle) => text.includes(needle));
  }

  private initialAgentMessage(attachmentCount: number): string {
    const attachments =
      attachmentCount > 0
        ? ` and pulled in ${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`
        : '';
    return `I've reviewed the requester's message${attachments}. I can triage the request, find relevant documents, or search the collection for objects. Where would you like to start?`;
  }

  private nextEntityId(prefix: string): string {
    return `${prefix}-${this.nextId++}`;
  }
}
