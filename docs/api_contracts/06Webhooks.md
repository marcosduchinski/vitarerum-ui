# Webhooks

---

### `POST /webhooks/email-inbound`

**Description** — Inbound email ingestion. Accepts a parsed inbound email (e.g. from a mail provider's inbound-parse webhook) and opens a proposal from it, mirroring `POST /proposals` but for the email-first channel. Resolves or creates the sender's `User` and their `EXTERNAL` `Permission`, then creates a `Proposal` (`SUBMITTED`, `type = OTHER`) and a `Conversation` seeded with the email as its first message. As in the portal channel, **no `CollectionUseProject` is created here** — the project is materialised only when a curator approves the proposal.

Idempotent on `message_id` — if an email with the same `message_id` was already ingested, the existing proposal/conversation is returned and `senderCreated` is `false`.

**Authentication** — bearer secret in the `Authorization` header: `Authorization: Bearer <webhook_secret>`. A mismatch returns `401`.

**Request body**
```json
{
  "sender": "Researcher Name <researcher@university.pt>",
  "sender_name": "Researcher Name",
  "recipient": "collections@museum.pt",
  "subject": "string",
  "body_plain": "string",
  "message_id": "string"
}
```

`sender` may be a bare address or `Name <email>` form; `sender_name` and `message_id` are optional. The proposal's `beginDate` / `endDate` default to the ingestion date.

**Response `201 Created`**
```json
{
  "proposalId": "uuid",
  "conversationId": "uuid",
  "senderCreated": true
}
```

**Response `401 Unauthorized`**
```json
{
  "error": "INVALID_SECRET",
  "message": "Invalid webhook secret"
}
```

**Response `422 Unprocessable Entity`**
```json
{
  "error": "INVALID_PAYLOAD",
  "message": "Invalid email address."
}
```

**Response `500 Internal Server Error`**
```json
{
  "error": "CONFIGURATION_ERROR",
  "message": "EXTERNAL group not found — run seed_groups first"
}
```

---

A few conventions worth noting:

**Email is a first-class intake channel** — this endpoint and `POST /proposals` converge on the same `SubmitProposal` use case, so an email-originated request and a portal-originated request produce identical aggregates.

**Idempotency is keyed on `message_id`** — the inbound `message_id` is stored on the `Conversation` (`externalMessageId`) and re-delivery of the same message is a no-op that returns the original result.

**Secret-based auth, not session auth** — unlike every other endpoint (which resolves a caller permission), this endpoint authenticates the *sender system* via a shared bearer secret and resolves the human sender from the email payload.
