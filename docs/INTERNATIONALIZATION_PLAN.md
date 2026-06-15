# Runtime Internationalization Plan

This project should prepare for runtime language switching without committing to a translation
library too early. The goal is to make English strings replaceable while keeping the current Angular
21 signal-first architecture intact.

## Goals

- Support switching the application language inside the running app.
- Keep API/domain values unchanged, such as `APPROVED`, `RESEARCH`, and `CURATORIAL`.
- Centralize UI labels so strings are not duplicated across pages.
- Make a future library migration, such as Transloco or ngx-translate, mostly an adapter change.
- Preserve SSR/browser safety and zoneless change detection.

## Non-Goals For The First Pass

- Do not add a third-party translation library yet.
- Do not translate every page in one large change.
- Do not change backend contracts or enum values.
- Do not introduce locale-specific routes.

## Recommended Architecture

Create a small internal i18n layer under `src/app/core/i18n/`:

- `i18n.service.ts`: signal-backed locale state and translation lookup.
- `i18n.tokens.ts`: injection tokens for default locale and dictionaries.
- `i18n.model.ts`: types for locale codes, translation keys, dictionaries, and interpolation params.
- `locales/en.ts`: initial English dictionary.
- Optional later files: `locales/pt.ts`, `locales/es.ts`, etc.

The service API should be intentionally small:

```ts
readonly locale = signal<LocaleCode>('en');
t(key: TranslationKey, params?: TranslationParams): string;
setLocale(locale: LocaleCode): void;
```

When a library is introduced later, keep this service as the application-facing adapter.

## Phase 1 - Foundation

Files likely affected:

- `src/app/core/i18n/*`
- `src/app/app.config.ts`
- `src/app/shared/layout/topbar/*` only if adding a basic selector later

Tasks:

- Add `LocaleCode`, `TranslationKey`, `TranslationDictionary`, and `TranslationParams` types.
- Add an English dictionary with a small initial scope.
- Add an injectable i18n service using signals.
- Add interpolation support for strings such as `Forwarded to {name}`.
- Add fallback behavior when a key is missing.
- Persist selected locale in local storage only after browser guards are in place.

Acceptance criteria:

- Components can inject the service and call `t(key, params)`.
- Changing the locale signal can update computed labels.
- Missing keys fail visibly in development but do not crash production UI.

## Phase 2 - Domain Vocabulary

Files likely affected:

- `src/app/shared/components/status-chip/*`
- `src/app/shared/components/type-chip/*`
- `src/app/shared/models/collection-use-status.model.ts`
- Proposal/project presentation helpers
- Group label helpers

Tasks:

- Convert status/type/group presentation helpers to use translation keys.
- Keep tone/color mapping separate from label translation.
- Translate these key groups first:
  - `proposal.status.*`
  - `project.status.*`
  - `proposal.type.*`
  - `group.*`
  - `common.action.*`

Acceptance criteria:

- Status and type chips still render the same English text by default.
- Color/tone behavior remains independent from language.
- No duplicate `TYPE_LABELS` or `GROUP_LABELS` maps remain in feature pages.

## Phase 3 - Navigation And Shell

Files likely affected:

- `src/app/app.routes.ts`
- `src/app/features/**/**.routes.ts`
- `src/app/shared/layout/menu/*`
- `src/app/shared/layout/topbar/*`

Tasks:

- Replace menu labels with translation keys.
- Replace route titles with translated title handling.
- Add a small language selector in the topbar when more than one locale exists.
- Persist the selected locale.

Acceptance criteria:

- Sidebar labels can update at runtime.
- Page titles can update when language changes.
- The app defaults to English when no preference exists.

## Phase 4 - Shared Components And Messages

Files likely affected:

- `src/app/shared/components/confirm-modal/*`
- `src/app/shared/components/empty-state/*`
- `src/app/shared/components/error-message/*`
- `src/app/shared/components/loading-state/*`
- `src/app/core/http/api-error.model.ts`

Tasks:

- Move common button labels to `common.action.*`.
- Move loading, empty, success, and error messages to dictionaries.
- Update API error presentation to return translation keys plus params.

Acceptance criteria:

- Shared components can accept either translated text or translation keys, with one preferred pattern.
- Error messages remain readable in English by default.
- Interpolated messages are covered by tests.

## Phase 5 - Feature Pages

Files likely affected:

- Proposal pages
- Project pages
- Admin pages
- Auth pages
- E2E tests that assert visible text

Tasks:

- Migrate feature page headings, table headers, form labels, modal copy, placeholders, and aria labels.
- Keep migrations page-by-page to limit risk.
- Update tests to use stable roles and labels carefully.

Acceptance criteria:

- No high-traffic feature page depends on scattered hardcoded English.
- E2E tests still verify user workflows without becoming brittle across locales.

## Phase 6 - Choose Runtime Library

Evaluate a runtime library only after the internal translation boundary exists.

Decision criteria:

- Works with Angular standalone APIs.
- Plays well with signals or can be wrapped cleanly.
- Supports lazy-loaded dictionaries.
- Supports runtime language switching.
- Has acceptable license, maintenance, and security posture.

Likely options:

- Transloco
- ngx-translate
- A custom lightweight dictionary service if requirements stay simple

Acceptance criteria:

- The app-facing API does not change significantly.
- Existing dictionary keys can be reused.
- Runtime switching still works without full page reload.

## Translation Key Naming

Use stable, domain-oriented keys:

```text
common.action.save
common.action.cancel
common.state.loading
proposal.status.approved
proposal.status.underReview
proposal.type.research
project.status.inProgress
group.collectionsManagement
navigation.proposals.myAssignments
error.forbidden.title
error.forbidden.message
```

Avoid keys based on current English wording.

## Testing Strategy

- Unit test dictionary lookup and interpolation.
- Unit test presentation helpers by key, label, and tone.
- Keep a focused test for locale switching.
- Keep most E2E tests in the default English locale until multi-locale coverage is needed.
- Add one smoke E2E for switching language once a second locale exists.

## Suggested First Task

Implement `src/app/core/i18n/` with an English dictionary and migrate only:

- `StatusChipComponent`
- `TypeChipComponent`
- group labels
- app menu labels
- common actions: `Add`, `Remove`, `Cancel`, `Confirm`, `Forward`, `Accept`, `Reject`

This gives the app a runtime-switch-ready foundation without introducing a dependency yet.
