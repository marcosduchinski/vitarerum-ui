import { PermissionPrincipal } from '@core/auth/models/permission.model';
import { UseType } from '@shared/models/collection-use-status.model';
import { ObjectReference } from '@shared/models/object-reference.model';

import { Document, Message, ProposalDetail } from '../../collections/proposals/models/proposal.model';

export type StaffAgentType = 'PROPOSAL_AGENT';

export type AssistanceTargetType = 'PROPOSAL_MESSAGE' | 'PROPOSAL';

export type AssistanceSessionStatus = 'ACTIVE' | 'ARCHIVED';

export type AssistanceTurnRole = 'STAFF' | 'AGENT' | 'SYSTEM';

export type AgentRunStatus = 'RUNNING' | 'NEEDS_STAFF_INPUT' | 'COMPLETED' | 'FAILED';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ObjectSearchStatus = 'NEEDS_MORE_INFORMATION' | 'SEARCHED' | 'NO_MATCHES';

export type ProposalAgentCapability = 'EMAIL_TRIAGE' | 'DOCUMENT_SEARCH' | 'OBJECT_SEARCH';

export interface AssistanceTarget {
  readonly type: AssistanceTargetType;
  readonly proposalId: string;
  readonly conversationId?: string;
  readonly messageId?: string;
}

export interface AssistanceTurn {
  readonly id: string;
  readonly role: AssistanceTurnRole;
  readonly content: string;
  readonly createdAt: string;
}

export interface EmailTriageResult {
  readonly probableUseType: UseType;
  readonly confidence: ConfidenceLevel;
  readonly rationale: string;
  readonly evidence: readonly string[];
}

export interface DocumentSearchMatch {
  readonly documentId: string;
  readonly fileName: string;
  readonly type: string;
  readonly source: 'PROPOSAL_ATTACHMENT' | 'ASSISTANCE_CATALOG';
  readonly reason: string;
}

export interface DocumentSearchResult {
  readonly query: string;
  readonly basedOnUseType: UseType;
  readonly matches: readonly DocumentSearchMatch[];
  readonly summary: string;
}

export interface ObjectSearchResult {
  readonly status: ObjectSearchStatus;
  readonly query: string | null;
  readonly matches: readonly ObjectReference[];
  readonly missingInformation: readonly string[];
  readonly summary: string;
}

export interface ProposalAgentRun {
  readonly id: string;
  readonly status: AgentRunStatus;
  readonly capabilities: readonly ProposalAgentCapability[];
  readonly triage: EmailTriageResult | null;
  readonly documentSearch: DocumentSearchResult | null;
  readonly objectSearch: ObjectSearchResult | null;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export interface AssistanceSession {
  readonly id: string;
  readonly agent: StaffAgentType;
  readonly title: string;
  readonly createdBy: PermissionPrincipal;
  readonly target: AssistanceTarget;
  readonly status: AssistanceSessionStatus;
  readonly selectedMessage: Message | null;
  readonly proposalSnapshot: ProposalDetail;
  readonly accessibleDocuments: readonly Document[];
  readonly turns: readonly AssistanceTurn[];
  readonly proposalAgentRuns: readonly ProposalAgentRun[];
  readonly createdAt: string;
  readonly archivedAt: string | null;
}

export interface StartProposalAgentSessionRequest {
  readonly proposalId: string;
  readonly messageId: string;
}

export interface AddAssistanceTurnRequest {
  readonly content: string;
}

export interface SearchObjectsRequest {
  readonly query: string;
}
