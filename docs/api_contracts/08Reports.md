# Reports

---

### `GET /reports/collection-use/visits-in-situ`

**Description** — Staff report listing completed and cancelled collection-use projects whose intended use is `IN_SITU_VISIT`. This endpoint is read-only and optimized for reporting screens rather than operational queues. It does not change project state and does not emit events.

Access is restricted to use-of-collections staff groups: `COLLECTIONS_MANAGEMENT`, `CURATORIAL`, and `DIRECTION`. `SYS_ADMIN` does not receive this report through the application menu unless explicitly assigned one of those staff groups.

**Query parameters**

```
status  : UseStatus  (optional, repeatable) COMPLETED | CANCELLED
dateFrom: LocalDate  (optional) filters project beginDate >= dateFrom
dateTo  : LocalDate  (optional) filters project endDate <= dateTo
search  : String     (optional) searches project reference number, title, requester, or assigned staff
page    : Integer    (default 0)
size    : Integer    (default 20)
```

When `status` is omitted, the report includes both `COMPLETED` and `CANCELLED`. Values outside `COMPLETED` and `CANCELLED` are rejected with `422`.

The report always filters `intendedUse.useType = IN_SITU_VISIT`; callers do not pass a `type` parameter.

**Response `200 OK`**

```json
{
  "content": [
    {
      "projectId": "uuid",
      "referenceNumber": "CUP-20250115-0001",
      "title": "string",
      "status": "COMPLETED",
      "result": "COMPLETED",
      "beginDate": "2025-06-01",
      "endDate": "2025-06-30",
      "requestedBy": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "EXTERNAL"
      },
      "assignedTo": {
        "permissionId": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        },
        "group": "COLLECTIONS_MANAGEMENT"
      },
      "submittedAt": "2025-01-15T10:30:00",
      "closedAt": "2025-07-01T16:45:00"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 38,
  "totalPages": 2
}
```

`closedAt` is the timestamp of the terminal project event (`COMPLETED` or `CANCELLED`) when available. It may be `null` for historical data that predates event materialisation.

**Response `403 Forbidden`**

```json
{
  "error": "ACCESS_DENIED",
  "message": "Reports are restricted to use-of-collections staff"
}
```

**Response `422 Unprocessable Entity`**

```json
{
  "error": "INVALID_REPORT_FILTER",
  "message": "status must be COMPLETED or CANCELLED"
}
```

---

### Notes

Report endpoints are intentionally separate from operational project list endpoints (`GET /collection-use-projects`). Operational lists expose workflow queues and action surfaces; report endpoints expose read-only, role-scoped, denormalized rows shaped for reporting pages.
