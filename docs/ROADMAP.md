# Kickfix — prototype → production roadmap

Reference document for the issue backlog on
[project board #3](https://github.com/orgs/goodtribes-org/projects/3).
Issues link here instead of restating the schema.

## Where Kickfix is going

Kickfix today is a "post a job / accept a job" prototype. It becomes a **community exchange**:

- People sign up and get a **public profile** at `/u/:handle`.
- They list the **skills** they have — anything from "fix a bike" to "dig a well".
- They can **request help**, and **search for people who have a skill**.
- A **map** shows what is available nearby.
- Anyone can **open a small store** and sell goods (eggs, sourdough, groceries).
- The transaction primitive is a **purpose**: two people agree on a thing, add items to it,
  and *both* approve that it is complete.
- **There are no ratings.** A profile shows completed purposes plus an AI-generated
  **trust status** (`STARTER | MEDIUM | TRUSTED`).
- **Money is optional.** Prices can be absent; tipping is allowed.
- Payment is **non-custodial crypto**. Kickfix never holds keys or funds — it issues payment
  requests and verifies on-chain that a transfer happened.

## Design decisions

**Skills use a hybrid taxonomy, not free text and not a closed list.**
The user types free text; the server slugifies it and matches `Skill.slug`, then
`Skill.aliases`. On a miss it creates a `Skill` with `status: PENDING`, immediately usable
and searchable but flagged for a moderator to merge. `UserSkill.label` keeps the user's own
wording so the profile reads naturally, while search keys off `skillId`. Pure free text would
reduce "search for people who have a skill" to substring matching where `cykelreparation`,
`laga cykel` and `bike repair` are three different skills; a closed taxonomy could never
express "dig a well".

**Approvals are rows, not booleans.** `PurposeApproval` carries an `itemsHash`. If either
party mutates the item list after approving, the stale approval is invalidated. Two booleans
on `Purpose` would let one party approve an empty purpose and the other silently add a
500 kr item afterwards.

**Money is integer minor units, never `Float`.** The existing `Job.price Float` is a latent
rounding bug. On-chain amounts are decimal **strings** (`amountRaw`), because token base units
overflow `Number`.

**`Transaction` is not migrated.** It recorded imaginary fiat — two rows written on completion
for money that never moved. It has no meaning in a non-custodial world. `Payment` replaces it.

## Target Prisma schema

```prisma
datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ---------------------------------------------------------------- enums

enum UserRole          { USER MODERATOR ADMIN }
enum UserStatus        { ACTIVE SUSPENDED DELETED }
enum TrustStatus       { STARTER MEDIUM TRUSTED }
enum SkillStatus       { PENDING APPROVED MERGED REJECTED }
enum EngagementMode    { ONLINE IRL EITHER }
enum HelpRequestStatus { OPEN IN_PURPOSE FULFILLED CANCELLED EXPIRED }
enum StoreStatus       { DRAFT OPEN PAUSED CLOSED }
enum ProductStatus     { DRAFT AVAILABLE OUT_OF_STOCK ARCHIVED }
enum PurposeKind       { HELP GOODS }
enum PurposeStatus     { PROPOSED ACTIVE PENDING_APPROVAL COMPLETED CANCELLED DISPUTED }
enum PurposeItemKind   { TASK PRODUCT CUSTOM }
enum PaymentKind       { PURCHASE TIP }
enum PaymentStatus     { REQUESTED SUBMITTED CONFIRMED FAILED EXPIRED CANCELLED }
enum ReportStatus      { OPEN REVIEWING ACTIONED DISMISSED }
enum NotificationKind {
  PURPOSE_PROPOSED PURPOSE_ITEM_ADDED PURPOSE_APPROVED PURPOSE_COMPLETED
  PURPOSE_CANCELLED MESSAGE_RECEIVED PAYMENT_CONFIRMED TIP_RECEIVED
  TRUST_STATUS_CHANGED
}

// ------------------------------------------------------- composite types

type Money {
  amountMinor Int
  currency    String @default("SEK")
}

type Location {
  country      String?
  municipality String?
  city         String?
  postalCode   String?
  lat          Float?
  lng          Float?
  precision    String? @default("city") // "exact" | "city" | "municipality"
}

type MediaRef {
  url    String
  width  Int?
  height Int?
  alt    String?
}

// -------------------------------------------------------------- identity

model User {
  id       String @id @default(auto()) @map("_id") @db.ObjectId
  email    String @unique
  password String

  handle      String   @unique          // URL slug for the public profile
  displayName String
  headline    String?                   // one-liner under the name
  bio         String?
  avatar      MediaRef?
  languages   String[] @default([])

  location  Location?
  geo       Json?                       // GeoJSON Point, 2dsphere-indexed
  showOnMap Boolean @default(true)

  role   UserRole   @default(USER)
  status UserStatus @default(ACTIVE)

  emailVerifiedAt DateTime?

  // non-custodial wallet — kickfix never holds keys or funds
  walletAddress    String?  @unique
  walletChainId    Int?
  walletVerifiedAt DateTime?

  // denormalized trust, recomputed by the trust service
  trustStatus           TrustStatus @default(STARTER)
  trustComputedAt       DateTime?
  trustRationale        String?
  completedPurposeCount Int         @default(0)

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  skills            UserSkill[]
  helpRequests      HelpRequest[]     @relation("HelpRequestAuthor")
  stores            Store[]
  purposesInitiated Purpose[]         @relation("PurposeInitiator")
  purposesReceived  Purpose[]         @relation("PurposeCounterparty")
  purposeItems      PurposeItem[]
  approvals         PurposeApproval[]
  messages          Message[]
  paymentsSent      Payment[]         @relation("PaymentFrom")
  paymentsReceived  Payment[]         @relation("PaymentTo")
  trustSnapshots    TrustSnapshot[]
  authTokens        AuthToken[]
  notifications     Notification[]
  reportsFiled      Report[]          @relation("ReportReporter")
  blocksMade        UserBlock[]       @relation("BlockBlocker")
  blocksReceived    UserBlock[]       @relation("BlockBlocked")

  @@index([status, trustStatus])
  @@index([createdAt])
}

// Refresh tokens, email verification and password reset in one collection,
// discriminated by `purpose`. Tokens are stored hashed, never raw.
model AuthToken {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  user      User      @relation(fields: [userId], references: [id])
  userId    String    @db.ObjectId
  purpose   String    // "refresh" | "email_verify" | "password_reset"
  tokenHash String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId, purpose])
  @@index([expiresAt])
}

// ---------------------------------------------------------------- skills

model Skill {
  id           String      @id @default(auto()) @map("_id") @db.ObjectId
  slug         String      @unique
  name         String
  nameSv       String?
  category     String?
  aliases      String[]    @default([])
  status       SkillStatus @default(PENDING)
  mergedIntoId String?     @db.ObjectId   // set when status = MERGED
  usageCount   Int         @default(0)
  createdAt    DateTime    @default(now())

  userSkills     UserSkill[]
  helpRequestIds String[]      @db.ObjectId
  helpRequests   HelpRequest[] @relation(fields: [helpRequestIds], references: [id])

  @@index([status, usageCount])
  @@index([aliases])
}

model UserSkill {
  id      String @id @default(auto()) @map("_id") @db.ObjectId
  user    User   @relation(fields: [userId], references: [id])
  userId  String @db.ObjectId
  skill   Skill  @relation(fields: [skillId], references: [id])
  skillId String @db.ObjectId

  label       String            // the user's own wording, shown on the profile
  description String?
  level       String?           // "beginner" | "confident" | "professional"
  offered     Boolean  @default(true)   // false = "want to learn"
  createdAt   DateTime @default(now())

  @@unique([userId, skillId])
  @@index([skillId, offered])
}

// --------------------------------------------------------- help requests

model HelpRequest {
  id          String            @id @default(auto()) @map("_id") @db.ObjectId
  title       String
  description String
  category    String?
  mode        EngagementMode    @default(IRL)
  status      HelpRequestStatus @default(OPEN)

  budget    Money?                        // null == "no price, tip if you like"
  priceless Boolean @default(false)

  location Location?
  geo      Json?
  images   MediaRef[]

  author   User   @relation("HelpRequestAuthor", fields: [authorId], references: [id])
  authorId String @db.ObjectId

  skillIds String[] @db.ObjectId
  skills   Skill[]  @relation(fields: [skillIds], references: [id])

  purposes Purpose[]
  items    PurposeItem[]

  expiresAt DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([status, createdAt])
  @@index([authorId, status])
  @@index([category, status])
}

// --------------------------------------------------------------- stores

model Store {
  id          String      @id @default(auto()) @map("_id") @db.ObjectId
  slug        String      @unique
  name        String
  description String?
  logo        MediaRef?
  cover       MediaRef?
  status      StoreStatus @default(DRAFT)

  location Location?
  geo      Json?

  fulfillment String[] @default(["pickup"])  // "pickup" | "delivery" | "shipping"
  currency    String   @default("SEK")

  owner   User   @relation(fields: [ownerId], references: [id])
  ownerId String @db.ObjectId

  products Product[]
  purposes Purpose[]

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([status])
  @@index([ownerId])
}

model Product {
  id          String        @id @default(auto()) @map("_id") @db.ObjectId
  store       Store         @relation(fields: [storeId], references: [id])
  storeId     String        @db.ObjectId
  title       String
  description String?
  price       Money
  unit        String?       // "kg", "st", "portion"
  images      MediaRef[]
  status      ProductStatus @default(DRAFT)

  trackStock Boolean @default(false)
  stockQty   Int?

  items     PurposeItem[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  @@index([storeId, status])
}

// ------------------------------------------------ purposes (the primitive)

model Purpose {
  id     String        @id @default(auto()) @map("_id") @db.ObjectId
  kind   PurposeKind
  status PurposeStatus @default(PROPOSED)
  title  String
  note   String?

  initiator      User   @relation("PurposeInitiator", fields: [initiatorId], references: [id])
  initiatorId    String @db.ObjectId
  counterparty   User   @relation("PurposeCounterparty", fields: [counterpartyId], references: [id])
  counterpartyId String @db.ObjectId

  helpRequest   HelpRequest? @relation(fields: [helpRequestId], references: [id])
  helpRequestId String?      @db.ObjectId
  store         Store?       @relation(fields: [storeId], references: [id])
  storeId       String?      @db.ObjectId

  currency   String @default("SEK")
  totalMinor Int    @default(0)   // recomputed server-side from items
  itemsHash  String @default("")  // sha256 over the canonical item list

  items        PurposeItem[]
  approvals    PurposeApproval[]
  payments     Payment[]
  conversation Conversation?

  completedAt   DateTime?
  cancelledAt   DateTime?
  cancelledById String?   @db.ObjectId
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([initiatorId, status])
  @@index([counterpartyId, status])
  @@index([status, completedAt])
}

model PurposeItem {
  id        String          @id @default(auto()) @map("_id") @db.ObjectId
  purpose   Purpose         @relation(fields: [purposeId], references: [id])
  purposeId String          @db.ObjectId
  kind      PurposeItemKind

  product       Product?     @relation(fields: [productId], references: [id])
  productId     String?      @db.ObjectId
  helpRequest   HelpRequest? @relation(fields: [helpRequestId], references: [id])
  helpRequestId String?      @db.ObjectId

  title          String
  description    String?
  quantity       Int     @default(1)
  unitPriceMinor Int     @default(0)   // 0 == no price / tip-only

  addedBy   User     @relation(fields: [addedById], references: [id])
  addedById String   @db.ObjectId
  createdAt DateTime @default(now())

  @@index([purposeId])
}

model PurposeApproval {
  id         String    @id @default(auto()) @map("_id") @db.ObjectId
  purpose    Purpose   @relation(fields: [purposeId], references: [id])
  purposeId  String    @db.ObjectId
  user       User      @relation(fields: [userId], references: [id])
  userId     String    @db.ObjectId
  itemsHash  String              // invalidates if the item list changed
  approvedAt DateTime  @default(now())
  revokedAt  DateTime?

  @@unique([purposeId, userId])
  @@index([purposeId])
}

// ------------------------------------------------------------- messaging

model Conversation {
  id             String   @id @default(auto()) @map("_id") @db.ObjectId
  participantIds String[] @db.ObjectId    // plain indexed array, no Prisma relation
  purpose        Purpose? @relation(fields: [purposeId], references: [id])
  purposeId      String?  @unique @db.ObjectId
  helpRequestId  String?  @db.ObjectId
  lastMessageAt  DateTime @default(now())
  createdAt      DateTime @default(now())

  messages Message[]

  @@index([participantIds])
  @@index([lastMessageAt])
}

model Message {
  id             String       @id @default(auto()) @map("_id") @db.ObjectId
  conversation   Conversation @relation(fields: [conversationId], references: [id])
  conversationId String       @db.ObjectId
  sender         User         @relation(fields: [senderId], references: [id])
  senderId       String       @db.ObjectId
  body           String
  attachments    MediaRef[]
  readByIds      String[]     @default([]) @db.ObjectId
  createdAt      DateTime     @default(now())
  deletedAt      DateTime?

  @@index([conversationId, createdAt])
}

// --------------------------------------------------------------- payments

// A Payment is a *request plus an on-chain observation*. Kickfix never holds
// funds; it records what it asked for and what it verified on chain.
model Payment {
  id     String        @id @default(auto()) @map("_id") @db.ObjectId
  kind   PaymentKind
  status PaymentStatus @default(REQUESTED)

  purpose   Purpose? @relation(fields: [purposeId], references: [id])
  purposeId String?  @db.ObjectId

  fromUser   User   @relation("PaymentFrom", fields: [fromUserId], references: [id])
  fromUserId String @db.ObjectId
  toUser     User   @relation("PaymentTo", fields: [toUserId], references: [id])
  toUserId   String @db.ObjectId

  chainId       Int
  tokenAddress  String?           // null == native coin
  tokenSymbol   String
  tokenDecimals Int
  amountRaw     String            // base units as a decimal string; never Float
  amountMinor   Int?              // fiat-equivalent snapshot, display only
  fiatCurrency  String?
  fiatRateAt    DateTime?

  toAddress     String
  fromAddress   String?
  reference     String  @unique   // random nonce echoed in calldata / memo
  txHash        String? @unique
  blockNumber   Int?
  confirmations Int     @default(0)

  requestedAt   DateTime  @default(now())
  expiresAt     DateTime
  confirmedAt   DateTime?
  lastCheckedAt DateTime?
  failureReason String?

  @@index([status, expiresAt])
  @@index([toUserId, status])
  @@index([purposeId])
}

// ------------------------------------------------------------------ trust

model TrustSnapshot {
  id            String      @id @default(auto()) @map("_id") @db.ObjectId
  user          User        @relation(fields: [userId], references: [id])
  userId        String      @db.ObjectId
  status        TrustStatus
  score         Float
  signals       Json                  // the exact inputs, for auditability
  rationale     String
  evaluator     String                // "rules-v1" | "claude-sonnet-4-5"
  promptVersion String?
  computedAt    DateTime    @default(now())

  @@index([userId, computedAt])
}

// --------------------------------------------------- safety & operations

model Report {
  id           String       @id @default(auto()) @map("_id") @db.ObjectId
  reporter     User         @relation("ReportReporter", fields: [reporterId], references: [id])
  reporterId   String       @db.ObjectId
  targetType   String       // "user" | "help_request" | "store" | "product" | "message"
  targetId     String       @db.ObjectId
  reason       String
  detail       String?
  status       ReportStatus @default(OPEN)
  resolvedById String?      @db.ObjectId
  resolvedAt   DateTime?
  createdAt    DateTime     @default(now())

  @@index([status, createdAt])
  @@index([targetType, targetId])
}

model UserBlock {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  blocker   User     @relation("BlockBlocker", fields: [blockerId], references: [id])
  blockerId String   @db.ObjectId
  blocked   User     @relation("BlockBlocked", fields: [blockedId], references: [id])
  blockedId String   @db.ObjectId
  createdAt DateTime @default(now())

  @@unique([blockerId, blockedId])
}

model Notification {
  id        String           @id @default(auto()) @map("_id") @db.ObjectId
  user      User             @relation(fields: [userId], references: [id])
  userId    String           @db.ObjectId
  kind      NotificationKind
  payload   Json
  readAt    DateTime?
  createdAt DateTime         @default(now())

  @@index([userId, readAt, createdAt])
}

model AuditLog {
  id         String   @id @default(auto()) @map("_id") @db.ObjectId
  actorId    String?  @db.ObjectId
  action     String
  targetType String?
  targetId   String?  @db.ObjectId
  metadata   Json?
  ip         String?
  createdAt  DateTime @default(now())

  @@index([actorId, createdAt])
  @@index([action, createdAt])
}
```

## Cross-document atomicity

The deployment already runs a MongoDB replica set — `--replSet rs0` in both
`docker-compose.yml` and `chart/kickfix/templates/mongodb-statefulset.yaml`, and
`DATABASE_URL` carries `?replicaSet=rs0&directConnection=true`. Prisma **interactive
transactions** (`prisma.$transaction(async (tx) => …)`) are therefore available.

They must wrap exactly these operations:

- **`approvePurpose`** — write the `PurposeApproval`; if both sides now approve with a
  matching `itemsHash`, flip `Purpose.status → COMPLETED`, set `completedAt`, increment
  `User.completedPurposeCount` on both sides, and trigger trust recomputation.
- **`createPurposeFromHelpRequest`** — create the `Purpose`, its initial `PurposeItem`s and
  the `Conversation`, and flip `HelpRequest.status → IN_PURPOSE`.
- **`confirmPayment`** — flip `Payment.status → CONFIRMED` and write the `Notification`.

**A transaction does not fix a lost-update race.** Accepting a help request is a
read-then-write TOCTOU; the fix is an atomic compare-and-set *inside* the transaction:

```js
const { count } = await tx.helpRequest.updateMany({
  where: { id, status: 'OPEN' },
  data:  { status: 'IN_PURPOSE' },
})
if (count === 0) throw new ConflictError()   // someone else won
```

## Geo and the map

Prisma's mongodb connector cannot declare a `2dsphere` index and cannot express `$near` or
`$geoWithin` in `where`. So:

**Index creation** — `backend/lib/ensureIndexes.js`, called once at boot, idempotent
(`createIndexes` is a no-op when the index exists):

```js
await prisma.$runCommandRaw({
  createIndexes: 'User',
  indexes: [{ key: { geo: '2dsphere' }, name: 'user_geo_2dsphere' }],
})
```

…repeated for `HelpRequest` and `Store`. The same function creates the text indexes
(`title`/`description` on `HelpRequest`, `name`/`aliases` on `Skill`), since Prisma's
`fullTextSearch` is unsupported on mongodb.

**Querying** — a two-step pattern in `backend/lib/geo.js`:

1. `aggregateRaw` with `$geoNear` as the **first** stage (it must be first, which is why the
   filter goes in its `query` option rather than a later `$match`), projecting `_id` and
   `distanceMeters`.
2. A typed `findMany({ where: { id: { in: ids } }, include: … })`, re-sorted by the distance
   map from step 1.

This keeps typed Prisma includes instead of hand-mapping raw BSON.

**Privacy.** `Location.precision` controls what is written into `geo`. The default is `city`:
the point is snapped to the city centroid plus a deterministic jitter of up to ~500 m derived
from the record id, so a person's home address never reaches the map. Only stores may opt
into `exact`.

## Migrating off the `Job` model

Near-zero real data, so the strategy is deliberately cheap. No `prisma migrate` is involved —
the mongodb connector has no migration engine, only `db push` / `generate`.

1. **Additive.** `HelpRequest`, `Purpose` etc. are added while `Job`, `Transaction` and the
   current `Message` shape remain. Nothing breaks.
2. **One-shot backfill**, `backend/scripts/backfill-jobs-to-help-requests.js`, run manually
   with `--dry-run` support. Idempotent via a temporary `legacyJobId` field.

   | `Job` field | `HelpRequest` |
   |---|---|
   | `title`, `description`, `category` | as-is |
   | `price` (Float) | `budget = { amountMinor: Math.round(price * 100), currency: "SEK" }`; `priceless = price === 0` |
   | `type: "irl" \| "online"` | `mode = IRL \| ONLINE` |
   | `status: "open"` | `OPEN` |
   | `status: "accepted"` | `IN_PURPOSE` |
   | `status: "completed"` | `FULFILLED` |
   | `location*` | `Location` composite + derived `geo` point when lat/lng exist |
   | `image` | `images: [{ url }]` |
   | `createdById` | `authorId` |
   | `acceptedById` | **not a field** — becomes a `Purpose` |

   Every job with an `acceptedById` yields
   `Purpose { kind: HELP, initiatorId: createdById, counterpartyId: acceptedById, helpRequestId, status: ACTIVE }`.
   For `status === "completed"`, set `COMPLETED` + `completedAt: job.updatedAt` and synthesize
   two `PurposeApproval` rows so historical profiles show completed purposes. One
   `Conversation` is created per job that had messages, and `Message.conversationId` is
   repointed. `Transaction` rows are exported to a gitignored JSON file and otherwise ignored.
3. **Aliasing.** `/api/help-requests` is the new surface. `backend/routes/jobs.js` becomes a
   thin shim delegating to the new controller, translating the response back to the legacy
   field names and emitting `Deprecation: true` + `Sunset: <date>`. It survives two releases.
4. **Frontend cutover** in one PR, then **step 5** deletes the shim, the `Job` and
   `Transaction` models, and `legacyJobId`.

Removing a Prisma model does **not** drop the MongoDB collection, so the old data stays on
disk as a free rollback window.

## Phases

| Phase | Label | Goal |
|---|---|---|
| 0 | `phase-0-hygiene` | Repo hygiene and a CI safety net — today a PR can break every endpoint and CI goes green |
| 1 | `phase-1-security` | Close the auth forgery, the open chat and the unvalidated write paths |
| 2 | `phase-2-backend` | The process behaves correctly under a scheduler and under load |
| 3 | `phase-3-frontend` | The SPA stops lying about auth state and stops crashing on non-JSON |
| 4 | `phase-4-infra` | Stop shipping a dev server to production; make rollouts observable |
| 5 | `phase-5-profiles` | A person is a first-class entity with a URL |
| 6 | `phase-6-skills` | "Search for people who have a skill" works |
| 7 | `phase-7-help-requests` | Retire the marketplace-job vocabulary |
| 8 | `phase-8-purposes` | Two people agree on a thing, both approve, it counts |
| 9 | `phase-9-map` | "What's around here, what can I get" |
| 10 | `phase-10-stores` | A person can open a small shop and sell through a purpose |
| 11 | `phase-11-wallet` | Money can move between two people; kickfix only observes |
| 12 | `phase-12-trust` | An explainable trust badge, not gameable by volume alone |
| 13 | `phase-13-safety` | The minimum a real community platform owes its users |

Issues labelled **`infra`** must not be implemented autonomously — see the working guidelines
in the monorepo `CLAUDE.md`. They require explicit human approval first.

## Non-goals

Escrow · KYC/AML · ratings, reviews, stars or thumbs (must not creep back in as
"endorsements") · fiat payments and Stripe · dispute arbitration (`DISPUTED` exists as a
status so the model need not change later, but no workflow is built) · real-time websocket
messaging · background job queues, workers or CronJobs · native mobile apps · multi-tenant
communities · Elasticsearch/Meilisearch/vector search · horizontal backend scaling (blocked
by the `ReadWriteOnce` uploads PVC and in-process rate limiting) · **any ingress, DNS or
hostname change whatsoever**.
