# PRD: Initial Material Review Report Email

## Problem Statement

After an expert submits their application, AutoHire runs an initial AI material review (six categories: Identity, Education, Employment, Project, Patent, Honor). Results are stored and visible in the supplement workspace, but the expert must return to the site proactively to learn whether they still owe materials.

Experts who meet resume eligibility (`ELIGIBLE`) and complete the initial material review often expect asynchronous communication—especially when they submitted on one device and may continue on another. Without an email report, they may miss pending supplement requests, delay compliance, and increase operational follow-up burden.

## Solution

When the initial material review (`MaterialReviewRun` with `runNo = 1`, `triggerType = INITIAL_SUBMISSION`) reaches `COMPLETED` and the application’s resume eligibility is `ELIGIBLE`, AutoHire sends a single English report email via Nodemailer (multipart HTML + plain text).

The email confirms the expert meets program eligibility, summarizes all six category review outcomes, lists only outstanding supplement actions, and provides a deep link to the supplement workspace when an invite plaintext token is available.

Email delivery is asynchronous, idempotent, retriable, and must not block the existing review sync API used by the submission-complete and supplement pages.

## User Stories

1. As an invited expert who is resume-eligible, I want to receive an email after my initial material review completes, so that I know my application was reviewed without logging back in immediately.

2. As an invited expert, I want the email to clearly state that I meet the basic GESF application requirements, so that I understand my resume eligibility outcome.

3. As an invited expert, I want the email to include the same eligibility detail I saw on the results page when available, so that the message matches my in-product experience.

4. As an invited expert, I want a summary of all six material categories (Identity, Education, Employment, Project, Patent, Honor), so that I can see the full initial review at a glance.

5. As an invited expert, I want each category marked as Complete or Supplement required, so that I can quickly identify problem areas.

6. As an invited expert with pending supplement requests, I want a dedicated action section listing only items I still need to upload, so that I am not confused by already-satisfied historical requests.

7. As an invited expert with no pending supplement requests, I want the email to state that no additional materials are required at this time, so that I know I do not need to upload anything further.

8. As an invited expert with pending requests, I want a one-click link from the email to the supplement upload page, so that I can upload files without hunting for my original invite.

9. As an invited expert whose invite plaintext token is unavailable, I want the email to still include the review report with written guidance to use my original invitation link, so that I am not blocked from understanding the outcome.

10. As an invited expert, I want the email written in English and aligned with existing supplement AI messages, so that terminology is consistent with the supplement workspace.

11. As an invited expert, I want the email sent to the most relevant address on file (invitation email, then personal screening email, then work screening email), so that I receive it where I expect operational communication.

12. As an invited expert, I want the email sent at most once per application for the initial review, so that I am not spammed on every status refresh.

13. As an invited expert, I want a failed delivery to be retried automatically a limited number of times, so that transient SMTP issues do not permanently prevent me from receiving the report.

14. As an operations user, I want delivery attempts recorded with structured report payload and status, so that I can audit what was sent and diagnose failures.

15. As an operations user, I want a skipped send (no recipient email) logged as an application event, so that I can follow up manually.

16. As a developer, I want email sending decoupled from the review sync HTTP response, so that SMTP latency or failure never breaks supplement status polling.

17. As a developer, I want development and production to use live SMTP, so that email behavior matches real delivery during local testing.

18. As a developer, I want automated tests to use an isolated test SMTP mailbox, so that CI does not send mail to real experts.

19. As an invited expert opening the supplement deep link on a new device, I want the invite token in the URL to restore my session and show the supplement workspace, so that the email link works without an existing browser session.

20. As an invited expert with an expired or invalid token, I want a clear access error on the supplement page, so that I understand I must request a new invitation rather than seeing another expert’s data.

21. As an invited expert who is resume-ineligible (`INELIGIBLE` or `INSUFFICIENT_INFO`), I want not to receive this eligibility-positive report email, so that I am not misinformed about my application status.

22. As an invited expert whose initial material review failed, I want not to receive this report email, so that I am not told a review outcome that was not produced.

23. As an invited expert, I want pending items in the email to include title, reason, suggested materials, and AI message when present, so that I understand exactly what to upload.

24. As an invited expert with pending supplements, I want the email CTA to say Upload supplement materials (or equivalent), so that the next step is obvious.

25. As an invited expert with no pending supplements, I want the CTA to direct me to view application status rather than upload, so that the call to action matches my situation.

## Implementation Decisions

### Scope boundary

This feature applies only to the **initial** material review round (`runNo = 1`, `INITIAL_SUBMISSION`). It does not send email after per-category supplement re-reviews (`SUPPLEMENT_UPLOAD`).

### Trigger and orchestration

- Hook after successful persistence of initial review sync results: when `syncSupplementReviewRun` completes `saveMaterialReviewResult` with run `runNo = 1` and external/job status `COMPLETED`.
- Gate before enqueueing send:
  - `Application.eligibilityResult === ELIGIBLE`
  - Initial review run status `COMPLETED`
- Invoke report email orchestration **asynchronously**; failures must not alter sync response or review persistence.

### Primary implementation seam (single test boundary)

Use one orchestration entry point—conceptually `trySendInitialMaterialReviewReportEmail({ applicationId, reviewRunId })`—called from the initial-review sync success path only.

All unit and integration tests should inject a fake email transport / sender at this seam rather than scattering Nodemailer mocks across route handlers or sync callers. Route-level tests may assert the seam was invoked; transport tests assert message content and idempotency.

### Recipient resolution

Resolve recipient in order; stop at first non-empty normalized email:

1. `ExpertInvitation.email`
2. `Application.screeningContactEmail`
3. `Application.screeningWorkEmail`

If none available: do not send; record `ApplicationEventLog` (e.g. skipped-no-recipient).

### Idempotency and retry

Introduce persistence model `InitialMaterialReviewReportEmail` (name may vary) with **unique** `applicationId` (one initial report per application).

Suggested fields:

- `applicationId` (unique)
- `reviewRunId`
- `recipientEmail`
- `subject`
- `reportPayload` (JSON)
- `status`: `PENDING` | `SENT` | `FAILED`
- `attemptCount`
- `lastAttemptAt`
- `nextRetryAt`
- `errorMessage`
- `providerMessageId`
- `sentAt`
- `inviteTokenAvailable` (boolean)

Retry policy (方案 C):

- On SMTP failure: increment `attemptCount`, set `FAILED`, schedule `nextRetryAt` with backoff.
- Retry on subsequent sync success paths or lightweight scheduler tick while `attemptCount < 3`.
- After max attempts: permanent `FAILED` + application event for ops follow-up.
- Never resend when `status = SENT`.

### Report payload and email content

Store structured `reportPayload` for audit (方案 C); do **not** store rendered HTML long-term.

`reportPayload` shape (conceptual):

```json
{
  "eligibility": {
    "headline": "Your qualifications meet the basic requirements for this GESF application.",
    "displaySummary": "<optional latest ResumeAnalysisResult.displaySummary>"
  },
  "categorySummary": [
    { "category": "IDENTITY", "outcome": "COMPLETE" },
    { "category": "EDUCATION", "outcome": "SUPPLEMENT_REQUIRED" }
  ],
  "pendingRequests": [
    {
      "category": "EDUCATION",
      "title": "...",
      "reason": "...",
      "suggestedMaterials": ["..."],
      "aiMessage": "..."
    }
  ],
  "inviteTokenAvailable": true,
  "supplementDeepLink": "https://.../apply/supplement?t=..."
}
```

Email format:

- Language: English only
- Subject: `Your GESF Application — Initial Material Review Report`
- Multipart: HTML + plain text via Nodemailer
- Greeting uses `screeningPassportFullName` when present, else generic salutation

Content sections:

1. **Eligibility (方案 C):** fixed headline + optional second paragraph from latest eligible `displaySummary`
2. **Review summary (方案 A):** all six supported supplement categories with Complete vs Supplement required derived from latest category review / supplement state
3. **Action required (方案 A):** only requests where `isLatest`, `!isSatisfied`, `status = PENDING`; if empty, state no additional materials required
4. **CTA (方案 C + B):**
   - If `InvitationGenerationItem.plaintextToken` exists: button/link to `{APP_BASE_URL}/apply/supplement?t={token}`
   - Else: textual instruction to use original invitation link (no broken deep link)
5. **Footer:** support/contact reference consistent with submission-complete contact constants

Data sources:

- Eligibility summary: latest `ResumeAnalysisResult.displaySummary`
- Category outcomes: latest `MaterialCategoryReview` per category from initial run sync results
- Pending list: latest `SupplementRequest` rows matching pending filter

Do **not** include raw LLM payloads (`rawResultPayload`) in email or audit JSON.

### Supplement deep link (方案 C)

Extend public supplement entry to accept invite query token (`t`) and perform the same session bootstrap used by expert session / apply entry before loading supplement snapshot.

Remove token from URL after successful session establishment (consistent with existing invite URL hygiene).

If token invalid/expired/disabled: show existing supplement access error patterns (`TOKEN_EXPIRED_FROM_EMAIL` semantics).

Plaintext token lookup via `Application.invitationId` → `InvitationGenerationItem.plaintextToken`. Absence of generation item must not block email send (CTA degrades to text guidance).

### Email infrastructure

- Add Nodemailer-based email module with SMTP configuration validated in environment schema.
- **Dev and production:** live SMTP (real send).
- Environment variables (conceptual): `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, plus existing `APP_BASE_URL`.

No `EMAIL_MODE=mock` default for dev per product decision; tests use dedicated test SMTP credentials isolated from production.

### Modules to add or extend

- **New:** email transport + initial review report template renderer (HTML/text from `reportPayload`)
- **New:** initial review report orchestrator (recipient resolve, payload build, idempotent send, retry)
- **New:** Prisma model + migration for `InitialMaterialReviewReportEmail`
- **Extend:** material supplement sync service (post-save async hook for runNo 1)
- **Extend:** supplement public page / shared invite bootstrap for `?t=` deep link
- **Extend:** environment configuration and `.env.example`
- **Extend:** application event logging for skip/failure cases

### Non-goals for coupling

- Do not send email from frontend.
- Do not block `POST .../material-supplement/reviews/{reviewRunId}/sync` on SMTP.
- Do not change initial or category review external backend contracts.

## Testing Decisions

### What makes a good test

Test **observable behavior** at boundaries:

- Given ELIGIBLE + initial review COMPLETED sync, orchestrator runs once and records `SENT` with expected `reportPayload` and recipient.
- Given duplicate sync, no second send (`applicationId` unique).
- Given non-ELIGIBLE or runNo > 1, orchestrator not invoked.
- Given no recipient email, skip logged, no SMTP call.
- Given SMTP failure, `FAILED` with incremented attempts; success on retry within limit.
- Given missing plaintext token, email still sent with `inviteTokenAvailable: false` and no deep link URL in payload.
- Given pending requests, action section populated; given none, copy reflects no action required.
- Deep link: token in supplement URL establishes session and renders workspace for SUBMITTED application.

Avoid asserting internal template string fragments unless they encode user-visible commitments (subject line, headline). Prefer asserting structured `reportPayload` and transport call arguments.

### Modules under test

- Initial review report orchestrator (primary)
- Report payload builder from application + review + supplement data
- Template renderer (HTML + text parity for key sections)
- Idempotency store operations
- Supplement deep-link session bootstrap (route/page integration)
- Sync service integration: seam invoked only under correct gates (mock transport)

### Prior art

- `src/lib/material-supplement/service.test.ts` — sync, initial review, eligibility gates
- `src/app/api/applications/.../material-supplement/route.test.ts` — supplement API integration patterns
- `tests/e2e/application-flow.spec.ts` — submitted flow, initial review trigger/sync, supplement navigation
- `src/lib/invitations/generation.test.ts` — invite token / link construction
- `src/app/api/expert-session/route.test.ts` — token session bootstrap

### Test environment

- Unit tests: inject fake email sender at orchestration seam.
- Integration tests: use isolated test SMTP mailbox (方案 C); never production credentials.
- E2E (optional stretch): assert email record row exists after initial review sync in test harness; avoid depending on real inbox in Playwright unless test SMTP API verification is available.

## Out of Scope

- Email after per-category supplement re-reviews (`SUPPLEMENT_UPLOAD` runs)
- Chinese or multilingual email templates
- Email open/click tracking and marketing analytics
- Ops UI for manual resend (may follow as separate work; permanent FAILED only logs for now)
- Backfilling `ExpertInvitation.email` at invitation generation time (separate improvement)
- Changing AI material review external API contracts
- Replacing or sending invitation emails at batch generation time
- SMS or WeChat notification channels
- Attaching files or embedding uploaded document previews in email
- Storing rendered HTML email bodies in the database (only structured `reportPayload`)
- Sending report email when initial review status is `FAILED` or still `PROCESSING`
- Sending report email when resume eligibility is not `ELIGIBLE`

## Further Notes

- This feature expands scope beyond original PRD §3.2 (“邮件/短信通知” out of scope). It is intentional post-submission operational communication tied to the material supplement loop.
- Align terminology with existing domain models: `Application`, `MaterialReviewRun`, `MaterialCategoryReview`, `SupplementRequest`, `ExpertInvitation`, `InvitationGenerationItem`, `SupplementCategory`.
- Product docs previously deferred supplement email to a later phase; this PRD covers **initial review report only**, not generic supplement campaign mail.
- Consider future ops endpoint to re-render from `reportPayload` and resend for permanent `FAILED` rows; not required for v1.
- Security: deep link carries invite token equivalent to existing invitation emails; do not embed internal IDs in email body.
- Performance: async dispatch (e.g. fire-and-forget promise or job queue pattern consistent with codebase conventions); must not increase sync latency materially.
