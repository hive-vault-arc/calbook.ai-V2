# CalBook.ai Product Roadmap

## Vision

CalBook.ai is the **AI-native scheduling platform** that treats meetings as relationships with context, not just time blocks. While Calendly and Cal.com offer convenience AI (reschedule via chat, auto-summarize), CalBook.ai builds **intelligence into the scheduling fabric itself** — understanding why a slot is optimal, tracking relationship health, and closing the loop from schedule to outcome.

**Target users (phased):** Solo professionals first (coaches, consultants, creators who monetize their time), then expanding to small teams and B2B.

**Two pillars of differentiation:**
1. **Monetization built in** — charge for your time, tier your availability, run a practice on one platform
2. **AI scheduling intelligence** — smart slot suggestions, meeting prep, post-meeting outcomes, relationship context

---

## Competitive Positioning

| Capability | Calendly (mid-2026) | Cal.com (mid-2026) | CalBook.ai (target) |
|---|---|---|---|
| AI scheduling via email/chat | Callie (beta) | Agents (Slack/Telegram/CLI) | **Smart slot ranking** (in the booking page itself) |
| Meeting summaries | Notetaker (beta) | Auto notes from transcripts | **Outcome tracking + follow-up loop** |
| Paid bookings | Standard | Cal Pay (Whop) | **Tiered availability + subscriptions** |
| Relationship context | None | None | **Meeting history per person, re-engagement** |
| Skills-based routing | None | Round-robin only | **AI routing by expertise/history** |
| Capacity intelligence | None | None | **Burnout prediction, no-meeting days** |
| Open source | No | Yes | Yes |

**The moat:** Both competitors bolt AI onto a dumb scheduling pipe. CalBook.ai builds intelligence into the core — the slot ranking algorithm, the relationship graph, and the outcome loop are not features you can add in a sprint.

---

## Phase 1: Solo Pro Monetization (Weeks 1-6)

**Goal:** Make CalBook.ai the best tool for a solo professional who charges for their time.

**Why first:** Leverages existing Stripe integration. Fastest path to revenue. Validates the "monetize your time" positioning before building the AI moat.

### 1.1 Enhanced Paid Bookings (Weeks 1-2)

**What exists:** Stripe payment on event types via `metadata.apps.stripe`, `PaymentService` with ON_BOOKING and HOLD options, `Payment` model with webhook handlers.

**What we add:**

- **Deposit/partial payment**: Let organizers charge a deposit (e.g., 25% to book, remainder after). Extend `PaymentOption` enum with `DEPOSIT`. New field `metadata.apps.stripe.depositAmount`.
- **Package bookings**: Sell a bundle of sessions (e.g., "5 coaching sessions for $800"). New `BookingPackage` model linking N bookings to one payment. Bookings draw down from the package balance.
- **Tip/gratitude payments**: Optional tip on top of the session price. Displayed as an optional field on the booking page. Stored as separate `Payment` record linked to the booking.

**Files to touch:**
- `packages/prisma/schema.prisma` — Add `BookingPackage` model, extend `PaymentOption` enum
- `packages/app-store/stripepayment/lib/PaymentService.ts` — Add `createDeposit()`, `chargeRemaining()`
- `packages/app-store/_utils/payments/getPaymentAppData.ts` — Parse deposit/package metadata
- `packages/features/bookings/lib/service/RegularBookingService.ts` — Handle package redemption in `handlePayment()`
- `apps/web/app/[user]/[type]/page.tsx` — UI for package selection and tip field

### 1.2 Tiered Availability (Weeks 3-4)

**What exists:** `Schedule` and `Availability` models, `UserAvailabilityService`, event-type-specific schedules.

**What we add:**

- **Priority tiers on event types**: Each event type can have tiered availability. Free tier gets weekday afternoons. Pro tier gets prime slots (weekday mornings). Premium tier gets evenings + weekends. Implemented as multiple `Schedule` references on one `EventType` with a `tier` label.
- **Tier-gated booking links**: Generate links that unlock specific tiers. `/tier/pro/jane/consultation` shows pro-tier slots. `/tier/free/jane/consultation` shows free-tier slots. The tier is encoded in the URL and validated against the event type's schedule config.
- **Waitlist for full slots**: When a premium slot is taken, offer a waitlist. New `BookingWaitlist` model. When a cancellation occurs, the next person on the waitlist gets an automated email with a one-click booking link valid for 2 hours.

**Files to touch:**
- `packages/prisma/schema.prisma` — Add `BookingWaitlist` model, add `tierSchedules` Json to `EventType`
- `packages/features/availability/lib/getUserAvailability.ts` — Filter slots by tier
- `packages/features/schedules/lib/slots.ts` — Generate tiered slot sets
- `apps/web/app/[user]/[type]/page.tsx` — Tier selection UI
- `packages/features/bookings/lib/service/RegularBookingService.ts` — Waitlist promotion on cancellation

### 1.3 Subscription Calendars (Weeks 5-6)

**What exists:** Stripe subscription billing on the platform level (our `feat/billing-stripe` branch). No per-user subscription concept.

**What we add:**

- **Subscriber-only event types**: An event type marked as `requiresSubscription` only shows available slots to users with an active subscription. Non-subscribers see a "Subscribe to book" CTA.
- **Stripe Customer Portal integration**: Subscribers manage their own subscription via Stripe portal. We store `stripeCustomerId` on the booker (not the organizer) and check subscription status before showing slots.
- **Priority booking window**: Subscribers can book 14 days out. Non-subscribers only 7 days. Configurable per event type.

**Files to touch:**
- `packages/prisma/schema.prisma` — Add `requiresSubscription` to `EventType`, add `SubscriberProfile` model for booker-side subscription tracking
- `packages/app-store/stripepayment/` — New `SubscriptionService.ts` for creating per-organizer subscription products
- `packages/features/availability/lib/getUserAvailability.ts` — Apply booking window based on subscription status
- `apps/web/app/[user]/[type]/page.tsx` — Subscription gate UI

---

## Phase 2: AI Scheduling Intelligence (Weeks 7-16)

**Goal:** Build the AI moat. Make CalBook.ai the only platform that understands *why* a meeting should happen at a certain time, not just *when* it can happen.

**Why second:** Requires the monetization foundation (paid users fund AI compute costs). The intelligence layer is what converts free users to paid.

### 2.1 AI Provider Infrastructure (Week 7)

**What exists:** `@modelcontextprotocol/sdk` in dependencies, `Agent` model for voice AI (Retell), automation system with webhook triggers.

**What we add:**

- **LLM abstraction layer**: New `packages/features/ai/` package. Abstract interface `LLMProvider` with implementations for OpenAI and Anthropic. Supports text completion, structured output (JSON mode), and embeddings.
- **AI settings model**: `UserAISettings` model storing provider preference, API key (encrypted via existing `CALENDSO_ENCRYPTION_KEY`), and feature toggles.
- **AI usage tracking**: `AIUsageLog` model tracking tokens, cost, and latency per call. Enables usage-based billing and cost monitoring.
- **App-store app**: "CalBook AI" app in the app store. Installing it enables all AI features. Uses the standard app-store architecture (`_metadata.ts`, `api/add.ts`, `components/`).

**Files to create:**
- `packages/features/ai/lib/LLMProvider.ts` — Abstract interface
- `packages/features/ai/lib/providers/OpenAIProvider.ts`
- `packages/features/ai/lib/providers/AnthropicProvider.ts`
- `packages/features/ai/lib/AIService.ts` — High-level service (completion, structured output, embeddings)
- `packages/features/ai/lib/AIUsageTracker.ts` — Usage logging and cost tracking
- `packages/prisma/schema.prisma` — `UserAISettings`, `AIUsageLog` models
- `packages/app-store/calbook-ai/` — Full app-store app scaffold

### 2.2 Smart Slot Ranking (Weeks 8-10)

**What exists:** `UserAvailabilityService` returns flat list of available slots. `AvailableSlotsService` aggregates across users. Slots are ordered chronologically.

**What we add:**

- **Slot scoring algorithm**: Instead of returning slots chronologically, score and rank them. Each slot gets a 0-100 score based on:
  - **Time-of-day preference**: Learns from the organizer's booking history. If they consistently accept morning meetings and decline afternoon ones, morning slots score higher.
  - **Calendar context**: Slots adjacent to similar meeting types score higher (context switching cost). A slot right after another client call scores higher than one after a deep-work block.
  - **Buffer optimization**: Slots with natural breaks before/after score higher. Respects existing `bufferTime` but also considers meeting density.
  - **Historical acceptance rate**: Time slots that historically lead to completed meetings (not cancelled/no-showed) score higher.
  - **Timezone fairness**: For cross-timezone bookings, slots that are reasonable for both parties score higher.
- **"Recommended" badge**: Top 3 slots get a "Best time" badge on the booking page. Remaining slots shown below in chronological order.
- **AI explanation**: Hover on a recommended slot shows why: "Recommended because you're most productive in mornings and this follows your existing 10am call with a natural 15-min buffer."
- **Learning loop**: Track which slots the organizer accepts vs reschedules vs cancels. Feed back into the scoring model weekly.

**Files to touch:**
- `packages/features/ai/lib/scheduling/SlotScorer.ts` — New scoring engine
- `packages/features/ai/lib/scheduling/features/` — Individual scoring features (time-of-day, context, buffer, history, timezone)
- `packages/features/availability/lib/getUserAvailability.ts` — Return raw slots to scorer
- `packages/trpc/server/routers/viewer/slots/util.ts` — Apply scoring before returning to client
- `apps/web/app/[user]/[type]/page.tsx` — "Best time" badge UI, hover explanation
- `packages/prisma/schema.prisma` — `SlotScoreCache` model (cache scores to avoid recompute), `BookingOutcome` enum on Booking (COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED)

### 2.3 Meeting Prep Agent (Weeks 11-13)

**What exists:** `WebhookTriggerEvents.BOOKING_CREATED`, automation workflows, `BookingInternalNote` model, `CalendarCacheEvent` with meeting metadata.

**What we add:**

- **Auto-generated prep brief**: When a booking is created (or 24h before the meeting), AI generates a prep brief that includes:
  - **Attendee context**: If the booker has met the organizer before, summarize past meetings. If new, infer context from the booking form responses and the booker's public profile (LinkedIn, if provided).
  - **Agenda draft**: Based on the event type title/description and the booker's stated purpose (from booking form). Suggests 3-5 talking points.
  - **Relevant documents**: Surfaces emails/docs from the organizer's calendar that mention the booker or the meeting topic. (Requires calendar integration — uses existing `CalendarCacheEvent` data.)
  - **Pre-meeting checklist**: AI-generated list of things to prepare (e.g., "Review the Q3 deck they mentioned in the booking form").
- **Delivery**: Prep brief stored as a `BookingInternalNote` with `type: AI_PREP_BRIEF`. Delivered via email 24h before (configurable) and visible in the booking dashboard.
- **Automation trigger**: New automation trigger `BEFORE_MEETING` (fires X hours before). New automation action `GENERATE_AI_PREP_BRIEF`.

**Files to touch:**
- `packages/features/ai/lib/prep/PrepBriefGenerator.ts` — Core generation logic
- `packages/features/ai/lib/prep/AttendeeContextBuilder.ts` — Gather attendee history
- `packages/features/ai/lib/prep/AgendaDraftGenerator.ts` — LLM-powered agenda
- `packages/features/webhooks/lib/constants.ts` — Add `BEFORE_MEETING` trigger
- `packages/features/automation/lib/actions.ts` — Add `GENERATE_AI_PREP_BRIEF` action
- `packages/prisma/schema.prisma` — Add `noteType` to `BookingInternalNote` (HUMAN, AI_PREP_BRIEF, AI_SUMMARY)
- `apps/web/modules/booking/` — Prep brief display in booking detail view

### 2.4 Post-Meeting Intelligence (Weeks 14-16)

**What exists:** `RECORDING_TRANSCRIPTION_GENERATED` webhook, `CalVideoSettings` with transcription toggle, `BookingInternalNote` model.

**What we add:**

- **Auto-summary on transcription**: When `RECORDING_TRANSCRIPTION_GENERATED` fires, AI generates a structured summary:
  - **Key decisions**: What was agreed upon
  - **Action items**: Who does what by when
  - **Open questions**: Unresolved items
  - **Sentiment**: Positive/neutral/negative with brief reasoning
- **Action item extraction**: Parse action items into structured `ActionItem` records linked to the booking. Each has an assignee, due date, and status. Assignees get an email notification.
- **Follow-up scheduling**: If action items have due dates, AI suggests a follow-up meeting. One-click "Schedule follow-up" button creates a new booking pre-filled with context from the original meeting.
- **Relationship update**: Update the organizer's relationship score with this booker. Track meeting outcomes over time. "This relationship has 8 completed meetings, 2 cancellations, 0 no-shows. Health: Strong."
- **Meeting outcome tracking**: New `BookingOutcome` field on `Booking` (COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED). Populated automatically from calendar events (if the meeting was attended) or manually.

**Files to touch:**
- `packages/features/ai/lib/postmeeting/SummaryGenerator.ts` — Transcript to structured summary
- `packages/features/ai/lib/postmeeting/ActionItemExtractor.ts` — Parse action items
- `packages/features/ai/lib/postmeeting/RelationshipTracker.ts` — Update relationship metrics
- `packages/features/webhooks/lib/service/RecordingWebhookService.ts` — Trigger AI summary on transcription
- `packages/prisma/schema.prisma` — `ActionItem` model, `MeetingRelationship` model, `BookingOutcome` enum
- `apps/web/modules/booking/` — Summary display, action item checklist, follow-up scheduler

---

## Phase 3: Team & Scale (Weeks 17-26)

**Goal:** Expand from solo professionals to small teams. Add the intelligence layer to team scheduling that Calendly and Cal.com lack.

**Why third:** Teams need the solo features working first (they're power users of paid bookings and prep briefs). Team features are higher ACV but require more complex routing logic.

### 3.1 Skills-Based Routing (Weeks 17-19)

**What exists:** `SchedulingType` enum (ROUND_ROBIN, COLLECTIVE, MANAGED), `Host` model with `weight` and `priority`, `HostGroup` model, `LuckyUserService`.

**What we add:**

- **New scheduling type: `SKILLS_BASED`**. Extends the enum.
- **Host skills/tags**: `Host.skills` Json field (e.g., `["enterprise-sales", "technical", "spanish"]`). Bookers select their needs via the booking form. AI matches booker needs to host skills.
- **AI routing decision**: Instead of pure round-robin, AI scores each available host based on:
  - Skills match (does the host have the right expertise?)
  - Relationship history (has this host met this booker before? past outcomes?)
  - Current load (how many meetings does this host have today/this week?)
  - Language match (if booker's locale is known)
- **Routing explanation**: Admins can see why a specific host was chosen: "Routed to Sarah because she has enterprise-sales expertise, has met this client twice before with positive outcomes, and has capacity today."
- **Fallback to round-robin**: If AI routing is disabled or no skills are specified, falls back to existing round-robin logic.

**Files to touch:**
- `packages/prisma/schema.prisma` — Add `SKILLS_BASED` to `SchedulingType`, add `skills` Json to `Host`
- `packages/features/ai/lib/routing/RoutingScorer.ts` — Host scoring engine
- `packages/features/bookings/lib/getLuckyUser.ts` — Integrate AI routing into `LuckyUserService`
- `packages/features/bookings/lib/service/RegularBookingService.ts` — Pass booking form responses to router
- `apps/web/modules/event-types/` — Skills configuration UI for admins

### 3.2 Capacity Intelligence (Weeks 20-22)

**What exists:** `Booking` model with timestamps, `User` with `bufferTime`, no meeting load analysis.

**What we add:**

- **Meeting load dashboard**: Per-user and per-team view showing meeting density by day/week. Visual heatmap. Identifies overload days.
- **Burnout prediction**: AI analyzes meeting patterns (back-to-back density, after-hours meetings, weekend meetings, meeting-to-free ratio) and flags at-risk users. "Sarah has had 6+ hours of meetings daily for 8 days. Recommend a no-meeting day."
- **Smart no-meeting days**: AI suggests optimal no-meeting days based on historical patterns. Admin can approve, which blocks all bookings on that day for the team.
- **Capacity-aware slot ranking**: When a host is near their daily meeting limit, their slots score lower in round-robin routing. Prevents one person from getting all the meetings.
- **Meeting load limits**: Per-user configurable max meetings per day / per week. Existing `bookingLimits` Json on `EventType` can be extended, but we add user-level limits that apply across all event types.

**Files to touch:**
- `packages/features/ai/lib/capacity/LoadAnalyzer.ts` — Meeting density analysis
- `packages/features/ai/lib/capacity/BurnoutPredictor.ts` — Risk scoring
- `packages/prisma/schema.prisma` — Add `userMeetingLimits` Json to `User`, `NoMeetingDay` model
- `packages/trpc/server/routers/viewer/` — New tRPC routes for load dashboard
- `apps/web/app/(use-page-wrapper)/(main-nav)/insights/` — New insights dashboard page
- `packages/features/bookings/lib/getLuckyUser.ts` — Factor load into routing

### 3.3 Collective Scheduling with AI Mediation (Weeks 23-26)

**What exists:** `COLLECTIVE` scheduling type (all hosts must be available), `getAggregatedAvailability` intersects availability.

**What we add:**

- **Friction-aware slot selection**: For collective meetings with many participants, AI identifies the slot with least total friction:
  - Minimizes reschedules (which participants are most likely to accept?)
  - Minimizes context-switching cost (which slot is least disruptive to all participants' calendars?)
  - Prioritizes participants by role (a slot that works for the decision-maker but not the observer scores higher than the reverse)
- **AI negotiation for hard cases**: When no perfect slot exists, AI proposes the best compromise and generates a message: "No slot works perfectly for all 5 participants. Tuesday 2pm works for 4 of 5. Sarah has a conflict but could move her 3pm if this is priority. Shall I ask her?"
- **Participant priority weighting**: `Host.priority` already exists. AI uses it to weight slot selection. High-priority participants' availability matters more.
- **Timezone-optimized suggestions**: For global teams, AI finds slots that are in reasonable working hours for all timezones. Visualizes the "timezone fairness" of each option.

**Files to touch:**
- `packages/features/ai/lib/collective/FrictionScorer.ts` — Fracture-aware scoring
- `packages/features/ai/lib/collective/NegotiationGenerator.ts` — LLM-powered compromise messages
- `packages/features/availability/lib/getAggregatedAvailability/getAggregatedAvailability.ts` — Apply friction scoring to collective slots
- `packages/trpc/server/routers/viewer/slots/util.ts` — Return friction scores with slots
- `apps/web/app/[user]/[type]/page.tsx` — Friction visualization for collective bookings

---

## Technical Architecture

### New Packages

```
packages/features/ai/                    # AI/LLM integration layer
├── lib/
│   ├── LLMProvider.ts                   # Abstract provider interface
│   ├── AIService.ts                     # High-level service
│   ├── AIUsageTracker.ts                # Usage/cost tracking
│   ├── providers/
│   │   ├── OpenAIProvider.ts
│   │   └── AnthropicProvider.ts
│   ├── scheduling/
│   │   ├── SlotScorer.ts                # Phase 2.2
│   │   └── features/                    # Individual scoring features
│   ├── prep/
│   │   ├── PrepBriefGenerator.ts        # Phase 2.3
│   │   ├── AttendeeContextBuilder.ts
│   │   └── AgendaDraftGenerator.ts
│   ├── postmeeting/
│   │   ├── SummaryGenerator.ts          # Phase 2.4
│   │   ├── ActionItemExtractor.ts
│   │   └── RelationshipTracker.ts
│   ├── routing/
│   │   └── RoutingScorer.ts             # Phase 3.1
│   ├── capacity/
│   │   ├── LoadAnalyzer.ts              # Phase 3.2
│   │   └── BurnoutPredictor.ts
│   └── collective/
│       ├── FrictionScorer.ts            # Phase 3.3
│       └── NegotiationGenerator.ts
└── index.ts

packages/app-store/calbook-ai/           # App-store entry for AI features
├── _metadata.ts
├── api/
│   ├── add.ts
│   └── delete.ts
├── components/
│   └── AppSettingsInterface.tsx
└── lib/
    └── index.ts
```

### New Prisma Models

```prisma
// Phase 1
model BookingPackage {
  id            Int      @id @default(autoincrement())
  uid           String   @unique
  organizerId   Int
  attendeeEmail String
  stripePaymentId Int?
  totalSessions Int
  usedSessions  Int      @default(0)
  eventTypeId   Int
  createdAt     DateTime @default(now())
  bookings      Booking[]
}

model BookingWaitlist {
  id          Int      @id @default(autoincrement())
  eventTypeId Int
  slotTime    DateTime
  email       String
  name        String?
  createdAt   DateTime @default(now())
  notifiedAt  DateTime?
}

model SubscriberProfile {
  id              Int      @id @default(autoincrement())
  email           String   @unique
  organizerId     Int
  stripeCustomerId String?
  subscriptionStatus String?
  createdAt       DateTime @default(now())
}

// Phase 2
model UserAISettings {
  id              Int     @id @default(autoincrement())
  userId          Int     @unique
  provider        String  @default("openai")
  apiKey          String? // encrypted
  features        Json    // { slotScoring: true, prepBrief: true, ... }
  monthlyTokenLimit Int?
}

model AIUsageLog {
  id          Int      @id @default(autoincrement())
  userId      Int
  feature     String   // "slot_scoring", "prep_brief", "summary"
  provider    String
  tokensIn    Int
  tokensOut   Int
  costCents   Int
  latencyMs   Int
  createdAt   DateTime @default(now())
}

model ActionItem {
  id          Int      @id @default(autoincrement())
  bookingId   Int
  text        String
  assigneeEmail String?
  dueDate     DateTime?
  status      String   @default("open") // open, done, skipped
  createdAt   DateTime @default(now())
}

model MeetingRelationship {
  id              Int      @id @default(autoincrement())
  organizerId     Int
  attendeeEmail   String
  totalMeetings   Int      @default(0)
  completedMeetings Int    @default(0)
  cancelledMeetings Int    @default(0)
  noShowMeetings  Int      @default(0)
  lastMeetingAt   DateTime?
  healthScore     Float    @default(1.0) // 0-1
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// Phase 3
model NoMeetingDay {
  id          Int      @id @default(autoincrement())
  teamId      Int?
  userId      Int?
  date        DateTime @db.Date
  reason      String?
  createdAt   DateTime @default(now())
}
```

### Schema Extensions to Existing Models

```prisma
// EventType
// Add: tierSchedules Json?        // Phase 1.2
// Add: requiresSubscription Boolean @default(false)  // Phase 1.3

// Booking
// Add: outcome BookingOutcome?    // COMPLETED, CANCELLED, NO_SHOW, RESCHEDULED
// Add: packageId Int?             // Link to BookingPackage

// BookingInternalNote
// Add: noteType String @default("HUMAN")  // HUMAN, AI_PREP_BRIEF, AI_SUMMARY

// Host
// Add: skills Json?               // Phase 3.1

// SchedulingType enum
// Add: SKILLS_BASED               // Phase 3.1

// PaymentOption enum
// Add: DEPOSIT                    // Phase 1.1

// User
// Add: userMeetingLimits Json?    // Phase 3.2

// WebhookTriggerEvents enum
// Add: BEFORE_MEETING             // Phase 2.3
// Add: AI_PREP_BRIEF_GENERATED    // Phase 2.3
// Add: AI_SUMMARY_GENERATED       // Phase 2.4
```

### Dependencies to Add

- `openai` — OpenAI API client (Phase 2.1)
- `@anthropic-ai/sdk` — Anthropic API client (Phase 2.1)
- `tiktoken` — Token counting for usage tracking (Phase 2.1)

---

## Implementation Principles

1. **AI is opt-in**: Every AI feature can be disabled. The app-store "CalBook AI" app must be installed to enable any AI features. Users without AI settings get the existing chronological slot ordering.
2. **AI is explainable**: Every AI decision (slot ranking, routing, prep brief) includes a human-readable explanation. No black boxes.
3. **Cost transparency**: AI usage is tracked per user. Admins can see token costs. Usage limits prevent runaway costs.
4. **Privacy first**: AI providers receive only the minimum data needed. Meeting transcripts are processed but not stored by the LLM provider (use OpenAI's zero-retention API or Anthropic's privacy mode). Booker PII is minimized before sending to LLMs.
5. **Graceful degradation**: If AI is unavailable (API down, quota exceeded, user hasn't configured it), all features fall back to existing non-AI behavior. No booking should fail because AI failed.
6. **Incremental rollout**: Each AI feature ships behind a feature flag. Start with opt-in beta, expand to default-on for paid plans, then free plans.
7. **Small PRs**: Each sub-feature is a separate PR under 500 lines. Schema changes, backend logic, and frontend UI are separate PRs per the AGENTS.md guidelines.

---

## Success Metrics

### Phase 1 (Monetization)
- 10% of new organizers enable paid bookings within first week
- Average revenue per paid organizer > $50/month
- Package booking adoption: 15% of paid organizers offer packages
- Waitlist conversion: 20% of waitlisted slots get filled

### Phase 2 (AI Intelligence)
- Slot ranking adoption: 60% of organizers with AI enabled see "Best time" slots
- Prep brief open rate: 40% of prep briefs are opened by organizers
- Action item completion: 50% of AI-extracted action items are marked done within 7 days
- Follow-up scheduling: 20% of meetings with action items lead to a follow-up booking via the one-click button

### Phase 3 (Team & Scale)
- Skills-based routing adoption: 30% of team event types use SKILLS_BASED
- Burnout alerts: 80% of admin-reviewed burnout alerts lead to action (no-meeting day, load rebalancing)
- Collective friction reduction: 25% reduction in time-to-schedule for 5+ participant meetings

---

## Branch Strategy

Each phase is a feature branch off `main`:

- `feat/monetization-paid-bookings` — Phase 1.1
- `feat/monetization-tiered-availability` — Phase 1.2
- `feat/monetization-subscriptions` — Phase 1.3
- `feat/ai-infrastructure` — Phase 2.1
- `feat/ai-slot-ranking` — Phase 2.2
- `feat/ai-meeting-prep` — Phase 2.3
- `feat/ai-post-meeting` — Phase 2.4
- `feat/team-skills-routing` — Phase 3.1
- `feat/team-capacity` — Phase 3.2
- `feat/team-collective-ai` — Phase 3.3

Each branch merges into `main` via draft PR. Dependencies flow top-to-bottom (Phase 1 before Phase 2, etc.).
