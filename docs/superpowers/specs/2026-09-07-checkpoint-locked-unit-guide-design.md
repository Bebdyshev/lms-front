# Checkpoint-aware locked-unit guide (web)

Date: 2026-09-07
Repo: `lms-front` (web only)
Branch: `fix/checkpoint-locked-unit-guide`, based on `origin/master`

## Problem

A student in a checkpoints-enabled group opened a unit the SAT Checkpoints gate holds back and
got a bare red **Error / Failed to load lesson data / Retry** screen. Reported for Бекзат Алшын
(July 9 SAT group), seen in a mobile browser.

Three defects produce that screen:

1. **The explanation is recovered by regex-ing an error string.** `loadLessonData` collapses any
   failure into one `string` (`src/pages/LessonPage.tsx:812`), and the error branch decides
   whether the lock is a checkpoint with `/checkpoint/i.test(error)` (`:2181`). That only works
   when the backend's 403 `detail` survives the round trip. When it does not — a stale
   service-worker bundle, a differently shaped error, a 500 — the student gets the generic box.
2. **Even at its best it is one sentence.** `"Finish Checkpoint 3 before starting this unit"`,
   with no list of what the checkpoint covers, no deadline, and no route to the checkpoint.
3. **On a phone there is no escape hatch.** `LessonSidebar` is `hidden md:block`, so the only
   control on the screen is **Retry**, which re-fails forever. This is exactly the reported case.

### Where the 403 comes from

The backend gates a blocked unit in three of the endpoints `loadLessonData` calls:
`GET /lessons/{id}`, `GET /lessons/{id}/steps`, `GET /progress/lesson/{id}/steps` — all via
`assert_student_not_blocked_by_checkpoint` (`lms-backend src/checkpoints/service.py:741`).
`loadLessonData` fires them in a single `Promise.all` (`src/pages/LessonPage.tsx:719-734`), so the
first 403 rejects the whole batch and lands in the `catch`. The `checkLessonAccess` branch at
`:741` — the one path that already knows the reason — is never reached, because its own promise
is in the same rejected batch.

## Approach

Three options were weighed:

- **(A) Return a structured `checkpoint` object from the backend 403.** Rejected: it changes a
  shared error envelope that ~85 call sites read as `response.data.detail`, needs a backend
  deploy, and still leaves the client blind whenever the response shape changes.
- **(B) Add more branches to the string matching.** Rejected — it doubles down on the defect.
- **(C, chosen) Drive the guide from `/checkpoints/me`.** `LessonPage` already fetches it in an
  effect keyed on `courseId` (`:580-593`) that does not depend on the lesson load succeeding, so
  at the moment of failure the page already holds, per checkpoint: `covers[]` (each unit with a
  `completed` flag), `status`, `deadline`, `total_questions`, `locked_reason`, `late`,
  `late_minutes` and the `quiz` `{course_id, lesson_id}` link. The 403 becomes a *trigger*; the
  data supplies the explanation. This is correct even when `detail` never arrives.

## Design

### 1. Detection

`loadLessonData`'s `catch` stops collapsing every failure into one string. It records the status
and the optional `detail`, and sets an `accessDenied` flag for a 403. The `checkLessonAccess`
refusal branch at `:741` sets the same flag instead of navigating away, so both routes into "you
may not open this" render the same screen.

Anything that is not a 403 — network failure, 500, 404 — keeps today's red **Error + Retry**,
which is the right affordance for a transient failure.

The lock is then classified from `checkpointHints` and the URL's `lessonId` alone, in a new pure
function beside the existing helpers in `src/lib/checkpointHints.ts`:

```
lockKindFor(hints, lessonId) ->
  | { kind: 'unit-blocked';    blocking: StudentCheckpointItem }   // an earlier checkpoint holds this unit
  | { kind: 'checkpoint-shut'; item: StudentCheckpointItem }       // this lesson IS a checkpoint quiz, not open
  | null                                                            // nothing in /checkpoints/me explains it
```

It builds on the helpers already there: `blockingCheckpointForUnit(hints, lessonId)` and
`hints.byQuizLesson.get(lessonId)`. Keeping it pure and separate from `LessonPage` keeps it
readable and testable, and lets `CourseOverviewPage` reuse the same classification later without
duplicating the rule.

**Ordering.** If the 403 resolves before `/checkpoints/me` does, the page must render the
existing skeleton, not the error box — otherwise the student sees a red error flash that then
swaps to a guide. Gate the error branch on the checkpoints fetch having settled (resolved *or*
failed), tracked by a `checkpointsSettled` flag set in `fetchCheckpoints`'s `finally`.

### 2. The guide

New presentational component `src/components/checkpoints/CheckpointLockGuide.tsx`. It takes the
classification result plus the blocked unit's title and renders the chain. Keeping it out of
`LessonPage` matters: that file is already ~2,600 lines.

It renders inside the normal lesson shell so the sidebar survives on desktop (per the approved
layout), and it always shows **Back to course** and **My checkpoints** buttons so the mobile case
— no sidebar — is never a dead end.

Cases, each presented as a numbered chain:

| Case | Condition | Content |
| --- | --- | --- |
| **A** | blocking checkpoint `available` / `reopened` | "Unit 7 is locked." **1.** Take Checkpoint 3 — open now; `coversLabel` + the per-unit ✓ checklist; `total_questions` questions; `formatDeadline` + `deadlineCountdown`. **2.** Unit 7 unlocks the moment you submit. Primary action **Start Checkpoint 3** → `/course/{quiz.course_id}/lesson/{quiz.lesson_id}` |
| **B** | blocking checkpoint `overdue` | Same chain in red: the deadline has passed and a submission now is marked late (the deadline is soft). Primary action **Submit late**. If `quiz` is null — the checkpoint is closed to the student — replace it with "ask your curator to reopen it". |
| **C** | blocking checkpoint `locked` (never opened) | Defensive only — unreachable under the current server rule, see *Risk* below. **1.** Finish these units to open Checkpoint 3 — the `covers` checklist with ✓ / ○, each unfinished unit a link to `/course/{courseId}/lesson/{lesson_id}`. **2.** Take Checkpoint 3 (`total_questions` questions, `CHECKPOINT_WINDOW_LABEL`). **3.** Then Unit 7 unlocks. A `locked` row has no `deadline` and no `quiz` link yet (the server withholds both until it opens), so this case states the window rather than a date and offers no Start button. |
| **D** | this lesson *is* a checkpoint quiz, not open | "Checkpoint 3 isn't open yet" + the same required-units checklist + `locked_reason`. If `status === 'completed'`, show the result (`correct_answers`/`total_questions`, `percentage`, `lateLabel`) instead of a call to action. |
| **E** | 403 but `lockKindFor` returned `null` | Fallback. Show the server's `detail` when we have one, otherwise "You can't open this unit yet." Always both navigation buttons. Covers plain sequential-access locks, a group with checkpoints disabled, and a failed `/checkpoints/me`. |

**The open window is stated once, in one place.** `CheckpointsPage.tsx:35` currently hardcodes
"you have 24 hours from then"; the guide needs the same phrase for case C, and the two must not
drift. Extract it as `CHECKPOINT_WINDOW_LABEL` in `src/services/api/checkpoints.ts` beside the
other shared copy helpers and have both screens read it. The value is **24 hours**, matching the server's
`DEADLINE_HOURS = 24` (`lms-backend src/checkpoints/service.py:29`) — confirmed as the intended
window. The unmerged branch's `72` is an outlier and is not adopted here.

Copy stays English, matching the rest of the checkpoint UI (`STATUS_LABEL`, `CheckpointsPage`,
`formatDeadline`'s deliberate `en-US` formatting). Existing helpers are reused rather than
re-implemented: `coversLabel`, `formatDeadline`, `deadlineCountdown`, `lateLabel`, `STATUS_CLASS`.

### 3. Data flow

```
courseId ──▶ fetchCheckpoints() ──▶ checkpointItems ──▶ buildCheckpointHints ──┐
                                          │                                    │
lessonId ──▶ loadLessonData() ──403──▶ accessDenied ────────────────────────────┤
                                                                               ▼
                                                              lockKindFor(hints, lessonId)
                                                                               │
                                                              CheckpointLockGuide (A–E)
```

No new network request. No backend change.

## Out of scope

- **Mobile (Expo).** Decided: web only. `lms/mobile` has no checkpoint screens or
  `/checkpoints/me` client at all, so it is a separate piece of work.
- **Backend.** Unchanged.
- **`CourseOverviewPage`.** Left alone beyond reusing `lockKindFor` if it falls out naturally;
  it already marks locked units.

## Verification

`lms-front` has no test runner (no vitest/jest/@testing-library in `package.json`), so the gate
follows the convention of previous plans in this repo:

1. `npx tsc --noEmit` — record the baseline error count before any change; it must not rise.
2. `npm run build` — must stay green.
3. Manual runtime QA as a student in a checkpoints-enabled group, covering cases A–E, at both
   desktop and mobile widths, confirming that no case leaves the student without navigation.

`lockKindFor` is written pure specifically so it can be unit-tested the moment this repo gains a
runner; adding one is deliberately not part of this change.

## Risk noted during investigation

The unmerged `feat/sat-checkpoints` branches (frontend and backend) diverge from the deployed
line on two points, and in both cases **prod is right**:

**1. Which checkpoint blocks a unit.** Prod's rule is that only a checkpoint that has *opened*
for the student — `available` / `reopened` / `overdue`, i.e. every required unit of its block is
done — locks the units of later blocks. A checkpoint that never opened locks nothing. That is not
an oversight; the comment above `PENDING_STATUSES` (`lms-backend src/checkpoints/service.py:661`)
records it as a deliberate revert:

> walling those students off behind a checkpoint they could not even take was the 2026-09-05
> pilot's first incident (18 refused lesson loads in six hours)

The stated reasons — students take units in any order, tracked completion lags the real work, and
homework is set on units ahead of the tracker — still hold. `lms-front` master's `isPending`
mirrors this exactly, so client and server agree.

The branch's `CLEARING_STATUSES` rule inverts both statuses: a never-opened checkpoint blocks
(reintroducing the incident) and an `overdue` one clears (making a 24h wait a way past the gate).
**It should not ship as-is.** That is out of scope here, but it is the reason case **C** above is
marked defensive: under the current rule the blocking checkpoint is always in a submittable
state, so C is unreachable. It is implemented anyway because it costs a few lines and is the
correct rendering if the rule is ever revisited — but it must not be read as a plan to adopt the
branch rule.

**2. The deadline window.** Prod is `DEADLINE_HOURS = 24`; the branch sets `72`. 24 hours is
confirmed as intended, and `CHECKPOINT_WINDOW_LABEL` is written to match it.

Separately: those branches have no open PRs and `master` independently gained a refined version
of parts of the same work. This spec deliberately targets `origin/master`, the deployed line the
bug was reported against.
