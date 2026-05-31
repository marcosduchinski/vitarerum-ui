# Identity context

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
          "group": {
            "id": "uuid",
            "name": "CURATORIAL"
          }
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
      "group": {
        "id": "uuid",
        "name": "COLLECTIONS_MANAGEMENT"
      }
    },
    {
      "permissionId": "uuid",
      "group": {
        "id": "uuid",
        "name": "CURATORIAL"
      }
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

**Response `200 OK`** — returned when assignment already exists.

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
      "group": {
        "id": "uuid",
        "name": "EXTERNAL"
      }
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
      "name": "ADMINISTRATION"
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

**IDs are UUIDs** throughout, matching the model. **Enum values are returned as strings** (`"CURATORIAL"` not `1`) for readability. **Permissions are always embedded** in user responses since they are rarely needed in isolation. **Pagination** follows a consistent envelope with `content`, `page`, `size`, `totalElements`, and `totalPages`. **Error responses** carry a machine-readable `error` code alongside a human-readable `message`.
