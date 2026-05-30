---
name: project-plan2-progress
description: Tracks which vitarerum-ui plan-2 tasks are complete vs remaining, and key architectural decisions made during implementation
metadata:
  type: project
---

Current progress against vitarerum-ui-plan-2.md (as of 2026-05-30):

## Completed

- **P2-T1.01** — Visual language (styles, layout shell/sidebar/topbar/footer/login/dashboard)
- **P2-T1.02** — Shared UI primitives (page-header, status-chip, empty-state, confirm-action, error-message)
- **P2-T2.01** — Domain models (collection-use-status, proposal, project, proposal-actions)
- **P2-T2.02** — API client services (ProposalApiService, ProjectApiService, UserManagementService)
- **P2-T2.03** — Mock API layer (ProposalApiServiceMock, ProjectApiServiceMock, UserManagementServiceMock, mock seed data, provider functions)

## Key architectural decision from T2.03

Real services (ProposalApiService, ProjectApiService, UserManagementService) were changed from `providedIn: 'root'` to `@Injectable()`. Each now has a named InjectionToken (PROPOSAL_API_SERVICE, PROJECT_API_SERVICE, USER_MANAGEMENT_SERVICE). Provider functions (provideCollectionUse, provideUserManagement) choose real or mock based on USE_MOCK_API. Feature components should inject via the token, not the class directly.

**Why:** Consistent with the identity service pattern; avoids circular DI reference when swapping real/mock at root.
**How to apply:** In new feature components, use `inject(PROPOSAL_API_SERVICE)` etc., not `inject(ProposalApiService)`.

## Remaining (in recommended order)

6. P2-T1.03 — Upgrade shell navigation (sidebar only has Dashboard; needs role-aware groups, aria-current)
7. P2-T2.04 — API error/loading strategy (not in execution order list but exists in plan)
8. P2-T5.01 — User management feature (`features/admin/` doesn't exist)
9. P2-T5.02 — Group management feature
10. P2-T3.01 — New proposal flow (`features/proposals/` doesn't exist)
11. P2-T3.02 — My proposals + detail
12. P2-T4.01 — Staff proposal queue
13. P2-T4.02 — Staff proposal action panel
14. P2-T3.03 — Researcher project workspace
15. P2-T4.03 — Staff project oversight
16. P2-T6.01 — Expand unit tests
17. P2-T6.02 — Expand E2E by workflow
18. P2-T6.03 — Accessibility review pass
