# ATS integration boundary

## Decision

CalBook owns scheduling. An applicant-tracking system is an optional external source of candidate and job context, and receives booking outcomes through an adapter. CalBook must not require an ATS connection to create an interview template, publish a booking link, or complete a booking.

This boundary deliberately avoids introducing an ATS, candidate, job, or application schema in V1. It preserves the existing event-type and booking models while leaving a narrow, testable seam for a future provider.

## Provider-neutral contract

An adapter must translate between CalBook's internal scheduling records and a provider's external records. The application layer should depend on these stable operations, never on Greenhouse, Lever, or another provider's SDK types.

```ts
type AtsCandidateReference = {
  externalId: string;
  email: string;
  name?: string;
};

type AtsInterviewContext = {
  candidate: AtsCandidateReference;
  jobExternalId?: string;
  applicationExternalId?: string;
  interviewExternalId?: string;
  templateExternalId?: string;
};

type AtsBookingOutcome = {
  bookingUid: string;
  status: "scheduled" | "rescheduled" | "cancelled";
  startsAt: string;
  endsAt: string;
  timezone: string;
  meetingUrl?: string;
  cancelReason?: string;
};

interface AtsSchedulingAdapter {
  getInterviewContext(reference: string): Promise<AtsInterviewContext | null>;
  syncBookingOutcome(context: AtsInterviewContext, outcome: AtsBookingOutcome): Promise<void>;
}
```

The eventual implementation stores encrypted provider credentials using the existing app credential model. It must persist only the provider identifiers required to retry or reconcile a sync; raw candidate payloads, provider access tokens, and provider SDK responses must not be copied into booking metadata.

## Lifecycle

```text
ATS interview reference (optional)
        ↓
Adapter resolves context → CalBook booking link / event type
        ↓
Candidate books, reschedules, or cancels in CalBook
        ↓
Booking outcome is queued for the adapter
        ↓
Adapter updates the originating ATS interview record
```

If an ATS lookup or sync fails, the booking remains valid in CalBook. Retries must be idempotent on `bookingUid` plus the outcome status and visible to an agency administrator; a provider outage must never block the candidate from booking.

## First-provider validation

Before implementation, validate the first provider with agency customers:

- Which system is authoritative for candidate email, job, and interview stage?
- Does the agency need a booking link inserted into the ATS, an interview created after booking, or both?
- Which outcomes must be written back: scheduled, rescheduled, cancelled, meeting URL, interviewer, and notes?
- What consent, retention, and admin permissions are required for candidate data?
- Which provider has enough active customer demand to justify the initial adapter?

Choose Greenhouse, Lever, or another provider only after this validation. The adapter contract remains unchanged regardless of the choice.
