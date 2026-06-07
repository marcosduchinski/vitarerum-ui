# Authentication context

API contract for the authentication endpoints the **Angular frontend** requires when
running against a real backend (`use-mock-api: false`, `use-mock-auth: false`).

The Angular application is the **source of truth** for these shapes. The relevant frontend
code is:

- `src/app/core/auth/auth-api.service.ts` — issues `POST /auth/login`
- `src/app/core/auth/models/login.model.ts` — `LoginRequest`, `LoginResponse`
- `src/app/core/auth/identity.service.impl.ts` — consumes the response, builds the session
- `src/app/core/auth/auth.interceptor.ts` — attaches `Authorization` + `X-Permission-Id`
- `src/app/core/auth/session-expired.interceptor.ts` — reacts to `401`
- `src/app/core/auth/models/group-name.enum.ts` — the `GroupName` enum

---

## 1. Conventions

**Base URL** — every path below is relative to the configured `api-base-url`
(`src/config/environment.json`, e.g. `http://127.0.0.1:8000`).

**Content type** — `application/json` for all request and response bodies.

**`GroupName` enum** — wherever a `group` appears in this contract it is one of these
exact strings (no other values are valid):

```
EXTERNAL | CURATORIAL | COLLECTIONS_MANAGEMENT | DIRECTION | ADMINISTRATION
```

**Error body** — the frontend reads errors in this shape (see `core/http/api-error.model.ts`):

```json
{
  "message": "Human-readable summary",
  "errors": [
    { "field": "email", "message": "must be a valid email" }
  ]
}
```

- `message` (string) — shown to the user for `409` / `422` / surfaced where relevant.
- `errors` (array, optional) — field-level validation errors. The alternative form
  `{ "fieldErrors": { "email": "message" } }` is also accepted.
- Status → meaning understood by the client: `401` session-expired (see §4), `403`
  forbidden, `404` not-found, `409` conflict, `422` validation, `>=500` server error.

---

## 2. Required endpoint

### `POST /auth/login`

**Description** — Authenticate a user by email + password and return an access token plus
the principal's identity and group permissions. This is the **only endpoint the frontend
calls to establish a session.**

**Request body**
```json
{
  "email": "alice@ext.example.com",
  "password": "string"
}
```
```
email    : String  (required)
password : String  (required)
```

**Response `200 OK`**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "alice@ext.example.com",
    "displayName": "Alice Ferreira"
  },
  "permissions": [
    { "permissionId": "uuid", "group": "COLLECTIONS_MANAGEMENT" },
    { "permissionId": "uuid", "group": "CURATORIAL" }
  ]
}
```

Field requirements (all required):

```
accessToken            : String     Bearer token; replayed on every later request (§3).
user.id                : String     Stable user identifier.
user.email             : String     The authenticated email.
user.displayName        : String    Name shown in the UI top bar.
permissions            : Array      One entry per group the user belongs to. MUST be non-empty.
permissions[].permissionId : String The principal's permission id FOR THAT GROUP.
permissions[].group    : GroupName  Plain enum string (NOT an object — see ⚠️ note below).
```

Frontend behaviour driven by this response:
- `availableGroups` = `permissions.map(p => p.group)`.
- The active `group` defaults to `permissions[0].group`; the user may switch among
  `availableGroups` in the UI.
- The **active permission id** = the `permissionId` whose `group` equals the active group.
  This value is sent as `X-Permission-Id` (§3).

> ⚠️ **Integration note — `group` is a string here, not an object.**
> `GET /users` in `01Identity context.md` returns `group` as `{ id, name }`. The login
> response is different on purpose: `permissions[].group` MUST be the bare `GroupName`
> string. The frontend assigns it directly to a `GroupName` field; an object would break
> session construction. If the backend prefers a uniform shape, align by exposing the
> string form on login specifically (the frontend ignores any group `id` at login time).

**Response `401 Unauthorized`** — invalid credentials.
```json
{ "message": "Invalid email or password" }
```
The login page shows the auth-failed message and does **not** redirect. (A `401`
specifically from `/auth/login` is exempt from the global session-expiry handling — §4.)

**Response `422 Unprocessable Entity`** — malformed request (e.g. missing email).
```json
{ "message": "Validation failed", "errors": [ { "field": "email", "message": "required" } ] }
```

---

## 3. Authenticated requests (applies to every other endpoint)

After login, the frontend attaches these headers to **all** outgoing requests
(`auth.interceptor.ts`):

```
Authorization   : Bearer <accessToken>
X-Permission-Id : <active permission id>
```

The backend MUST, on every protected endpoint:

1. **Authenticate** the `Authorization: Bearer` token. Reject with `401` if missing,
   invalid, or expired (§4).
2. **Authorize against `X-Permission-Id`** — this header names the permission (user + group)
   the request is acting as. The backend MUST verify that:
   - the permission id belongs to the authenticated user, and
   - the action is allowed for that permission's group.
   Reject mismatches with `403`.

`X-Permission-Id` changes when the user switches active group in the UI, so the same token
may arrive paired with different permission ids over a session. Treat the header as the
authoritative "acting role" for each request; do not infer the group solely from the token.

> Note: the token is persisted in the browser's `localStorage` and rehydrated on reload, so
> tokens should remain valid across page refreshes for their normal lifetime.

---

## 4. Session expiry semantics

`session-expired.interceptor.ts` watches every response:

- A `401` on **any endpoint except `/auth/login`** is treated as an expired/invalid
  session: the frontend clears the local session and redirects to `/login`.
- Therefore the backend MUST return `401` (not `403`) when a token is expired or no longer
  valid, so the user is cleanly logged out.
- `403` is reserved for "authenticated but not allowed" and does **not** log the user out.

---

## 5. Recommended / future endpoints (not yet consumed)

The current frontend does **not** call these. They are listed so the backend can plan a
complete auth surface; implementing them is optional until the frontend adopts them.

### `POST /auth/logout` *(optional)*
Server-side token/session invalidation. Today `signOut()` only clears client storage; a
real deployment should also revoke the token server-side.
```
Request  : (Authorization header only)
Response : 204 No Content
```

### `POST /auth/refresh` *(optional, recommended)*
Exchange a refresh token / sliding session for a new `accessToken`. The frontend has **no
refresh flow yet** — an expired token simply logs the user out (§4). Adding refresh later
would require a corresponding frontend change.
```json
// Request
{ "refreshToken": "string" }
// Response 200
{ "accessToken": "string" }
```

### `GET /auth/me` *(optional)*
Return the current principal (same shape as the `user` + `permissions` portion of the login
response) for token-only rehydration without re-login. Not required while the session is
persisted client-side.

---

## 6. Security checklist for the backend

- Hash passwords (e.g. bcrypt/argon2); never return them.
- Sign tokens (JWT or opaque + server store); include enough claims to validate the user,
  but the frontend treats `accessToken` as opaque.
- Enforce HTTPS in non-local environments (token rides in `Authorization`).
- Rate-limit `POST /auth/login` to slow credential stuffing.
- Validate `X-Permission-Id` against the authenticated user on **every** request — never
  trust it blindly; it is client-supplied.
- Keep `401` strictly for authentication failure and `403` for authorization failure so the
  client's logout-vs-deny logic behaves correctly.
