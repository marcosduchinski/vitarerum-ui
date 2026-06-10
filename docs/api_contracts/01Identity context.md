# Identity context

All paths are relative to the configured API base URL and the `/api/v1` prefix
(e.g. `http://127.0.0.1:8000/api/v1`). Content type is `application/json` unless noted.

---

## Authentication

`POST /auth/login` is the **only endpoint that establishes a session**. Every other
endpoint in this and every other context is protected and requires the headers described
in [Authenticated requests](#authenticated-requests).

### `POST /auth/login`

**Description** — Authenticate a user by email + password and return an access token plus
the principal's identity and group permissions.

**Request body**
```json
{
  "email": "alice@ext.example.com",
  "password": "string"
}
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

All fields are required and `permissions` is **non-empty** — a user with no group
membership cannot log in (treated as invalid credentials).

> ⚠️ **`group` is a flat enum string here, not an object.** This differs on purpose from
> the other identity endpoints (`GET /users`, etc.) where the embedded permission carries
> `group` as `{ id, name }`. At login the client assigns `permissions[].group` directly to
> a `GroupName` field and ignores any group id, so login returns the bare string form.

Client behaviour driven by this response:
- `availableGroups` = `permissions.map(p => p.group)`.
- The active group defaults to `permissions[0].group`; the user may switch among
  `availableGroups`.
- The **active permission id** is the `permissionId` whose `group` equals the active group;
  it is sent as `X-Permission-Id` on every subsequent request.

**Response `401 Unauthorized`** — invalid credentials. The login page shows the failure
and does **not** redirect (a `401` from `/auth/login` is exempt from the session-expiry
handling below).
```json
{ "message": "Invalid email or password" }
```

**Response `422 Unprocessable Entity`** — malformed request.
```json
{ "message": "Validation failed", "errors": [ { "field": "email", "message": "required" } ] }
```

---

## Authenticated requests

After login the client attaches these headers to **all** requests to every other endpoint:

```
Authorization   : Bearer <accessToken>
X-Permission-Id : <active permission id>
```

The backend, on every protected endpoint:

1. **Authenticates** the `Authorization: Bearer` token (a signed JWT). A missing,
   malformed, or expired token is rejected with **`401`**.
2. **Authorizes against `X-Permission-Id`** — the permission (user + group) the request
   acts as. The backend verifies the permission id **belongs to the authenticated user**;
   a mismatch (or unknown/missing permission id) is rejected with **`403`**.

`X-Permission-Id` changes when the user switches active group, so the same token may arrive
paired with different permission ids over a session. It is the authoritative "acting role"
for each request; the group is never inferred from the token alone.

### Session expiry semantics

- A `401` on **any endpoint except `/auth/login`** means the session is expired/invalid:
  the client clears the local session and redirects to `/login`.
- The backend therefore returns **`401` only for authentication failure** (bad/expired
  token) and **`403` for authorization failure** ("authenticated but not allowed"), which
  does **not** log the user out.

---

### `POST /users`

**Description** — Create a new user. Returns the created user with an empty `permissions` list (groups are assigned separately via `POST /users/{userId}/groups/{groupId}`).

**Request body**
```json
{
  "name": "string",
  "email": "string",
  "password": "string"
}
```

`password` is optional. When provided it is hashed (bcrypt) and lets the user authenticate
via `POST /auth/login`; a user created without one has no usable password until set. The
password is never returned in any response.

**Response `201 Created`**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "permissions": []
}
```

---

### `GET /users`

**Description** — List all users, optionally filtered by group.

**Query parameters**
```
groupId    : UUID     (optional) filter by group
search     : String   (optional) filter by name or email
page       : Integer  (default 0)
size       : Integer  (default 20)
```

**Response `200 OK`**
```json
{
  "content": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "permissions": [
        {
          "permissionId": "uuid",
          "user": {
            "id": "uuid",
            "name": "string",
            "email": "string"
          },
          "group": "CURATORIAL"
        }
      ]
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 45,
  "totalPages": 3
}
```

---

### `GET /users/{userId}`

**Description** — Get full detail of a specific user including all their group permissions.

**Path parameters**
```
userId : UUID (required)
```

**Response `200 OK`**
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "permissions": [
    {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "COLLECTIONS_MANAGEMENT"
    },
    {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "CURATORIAL"
    }
  ]
}
```

**Response `404 Not Found`**
```json
{
  "error": "USER_NOT_FOUND",
  "message": "No user found with id uuid"
}
```

---

### `POST /users/{userId}/groups/{groupId}`

**Description** — Assign a user to a group, creating a new `Permission`. Idempotent — if the assignment already exists, returns the existing permission.

**Path parameters**
```
userId  : UUID (required)
groupId : UUID (required)
```

**Request body** — none required.

**Response `201 Created`**
```json
{
  "permissionId": "uuid",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string"
  },
  "group": {
    "id": "uuid",
    "name": "DIRECTION"
  }
}
```

Idempotent — if the assignment already exists the existing permission is returned (also with `201 Created`).

**Response `404 Not Found`**
```json
{
  "error": "USER_NOT_FOUND | GROUP_NOT_FOUND",
  "message": "string"
}
```

---

### `DELETE /users/{userId}/groups/{groupId}`

**Description** — Remove a user from a group, revoking the corresponding `Permission`.

**Path parameters**
```
userId  : UUID (required)
groupId : UUID (required)
```

**Response `204 No Content`**

**Response `404 Not Found`**
```json
{
  "error": "PERMISSION_NOT_FOUND",
  "message": "User uuid is not a member of group uuid"
}
```

---

### `GET /users/{userId}/permissions`

**Description** — List all permissions for a specific user — every group they belong to and the corresponding permission identity.

**Path parameters**
```
userId : UUID (required)
```

**Response `200 OK`**
```json
{
  "userId": "uuid",
  "permissions": [
    {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "group": "EXTERNAL"
    }
  ]
}
```

---

### `GET /groups`

**Description** — List all groups. Since groups are defined by the `GroupName` enum they are fixed — this endpoint returns the institutional groups and their IDs.

**Response `200 OK`**
```json
{
  "groups": [
    {
      "id": "uuid",
      "name": "EXTERNAL"
    },
    {
      "id": "uuid",
      "name": "CURATORIAL"
    },
    {
      "id": "uuid",
      "name": "COLLECTIONS_MANAGEMENT"
    },
    {
      "id": "uuid",
      "name": "DIRECTION"
    },
    {
      "id": "uuid",
      "name": "SYS_ADMIN"
    }
  ]
}
```

---

### `GET /groups/{groupId}/users`

**Description** — List all users belonging to a specific group, with their permission for that group.

**Path parameters**
```
groupId : UUID (required)
```

**Query parameters**
```
page : Integer (default 0)
size : Integer (default 20)
```

**Response `200 OK`**
```json
{
  "group": {
    "id": "uuid",
    "name": "CURATORIAL"
  },
  "content": [
    {
      "permissionId": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 5,
  "totalPages": 1
}
```

**Response `404 Not Found`**
```json
{
  "error": "GROUP_NOT_FOUND",
  "message": "No group found with id uuid"
}
```

---

A few conventions applied consistently across all contracts:

**IDs are UUIDs** throughout, matching the model. **Enum values are returned as strings** (`"CURATORIAL"` not `1`) for readability. **The embedded permission shape (`PermissionDetail`)** used across all contexts is `{ "permissionId", "user": { "id", "name", "email" }, "group": "<GROUP_NAME>" }` — the group is a flat enum string, not a nested object. The one exception is the `POST /users/{userId}/groups/{groupId}` response, which returns the group as a nested `{ "id", "name" }` object. **Pagination** follows a consistent envelope with `content`, `page`, `size`, `totalElements`, and `totalPages`.

**Authentication** — except for `POST /auth/login`, every endpoint here and in the other contexts requires `Authorization: Bearer <accessToken>` and `X-Permission-Id: <permission id>` headers; see [Authenticated requests](#authenticated-requests). `401` is reserved for authentication failure (and logs the client out); `403` for authorization failure.

**Error responses** always carry a human-readable `message`. Where applicable they also include a machine-readable `error` code (e.g. `USER_NOT_FOUND`) and, for `422` validation failures, an `errors` array of `{ field, message }` (the alternative `fieldErrors` object map is also accepted by the client). The `error` code is a backend convenience the frontend ignores.
