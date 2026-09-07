# Checkpoint-Aware Locked-Unit Guide — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dead-end "Error / Failed to load lesson data / Retry" screen a student hits on a checkpoint-blocked unit with a guide that names the checkpoint, lists what it covers, shows the deadline, and offers a way forward.

**Architecture:** A 403 from the lesson endpoints becomes a *trigger*, not a message. `LessonPage` already holds the student's `/checkpoints/me` rows (fetched in an effect keyed on `courseId`, independent of the lesson load), so a new pure classifier in `src/lib/checkpointHints.ts` decides *why* the lesson was refused from that data, and a new presentational component renders the explanation. No new network call, no backend change.

**Tech Stack:** React 18 + TypeScript + Vite, Tailwind, shadcn-style `components/ui/*`, `lucide-react` icons, `react-router-dom`.

## Global Constraints

- **Repo:** `lms-front`. Branch `fix/checkpoint-locked-unit-guide`, already created off `origin/master`. Do not rebase onto `feat/sat-checkpoints`.
- **Web only.** Do not touch `lms/mobile` or `lms/backend`.
- **Copy is English**, matching the existing checkpoint UI (`STATUS_LABEL`, `CheckpointsPage`, `formatDeadline`'s deliberate `en-US` formatting).
- **The checkpoint window is 24 hours**, matching the server's `DEADLINE_HOURS = 24`. Never hardcode it in a second place — use `CHECKPOINT_WINDOW_LABEL` from Task 1.
- **Reuse existing helpers**, do not re-implement: `coversLabel`, `formatDeadline`, `deadlineCountdown`, `lateLabel`, `STATUS_LABEL`, `STATUS_CLASS` (`src/services/api/checkpoints.ts`); `buildCheckpointHints`, `blockingCheckpointForUnit`, `isOpen` (`src/lib/checkpointHints.ts`).
- **No test runner exists in this repo** (no vitest/jest/@testing-library in `package.json`), and adding one is explicitly out of scope. Every task's gate is therefore:
  1. `npx tsc --noEmit 2>&1 | grep -c "error TS"` → **must print 218 or fewer**. 218 is the recorded baseline on `origin/master` as of 2026-09-07.
  2. `npm run build` → must exit 0.
  3. The task's own stated manual check.
- **A student must never be left without navigation.** Every branch of the new screen renders **Back to course** and **My checkpoints**.
- Commit after every task. Do **not** add a `Co-Authored-By` trailer.

---

### Task 1: One shared "24 hours" constant

Two screens have to tell the student how long a checkpoint stays open. `CheckpointsPage` hardcodes it today; the guide needs the same words. Put it in one place first, so Task 3 has something to import.

**Files:**
- Modify: `src/services/api/checkpoints.ts` (append after `STATUS_CLASS`, currently ends line 224)
- Modify: `src/pages/CheckpointsPage.tsx:35`

**Interfaces:**
- Consumes: nothing.
- Produces: `CHECKPOINT_WINDOW_HOURS: number` (= 24) and `CHECKPOINT_WINDOW_LABEL: string` (= `'24 hours'`), exported from `src/services/api/checkpoints.ts`.

- [ ] **Step 1: Add the constant**

Append to the end of `src/services/api/checkpoints.ts`:

```ts
/**
 * How long a checkpoint stays open once it unlocks. Mirrors the server's `DEADLINE_HOURS`
 * (lms-backend `src/checkpoints/service.py:29`). Stated once here so the screens that explain
 * the window to a student cannot drift from each other, or from the server.
 */
export const CHECKPOINT_WINDOW_HOURS = 24;
export const CHECKPOINT_WINDOW_LABEL = `${CHECKPOINT_WINDOW_HOURS} hours`;
```

- [ ] **Step 2: Use it on the checkpoints page**

In `src/pages/CheckpointsPage.tsx`, extend the existing import on line 8 to include `CHECKPOINT_WINDOW_LABEL`:

```tsx
import {
  CHECKPOINT_WINDOW_LABEL, coversLabel, deadlineCountdown, formatDeadline, getMyCheckpoints,
  lateLabel, STATUS_CLASS, STATUS_LABEL, type StudentCheckpointItem,
} from '../services/api/checkpoints';
```

Then replace line 35, which currently reads:

```tsx
        A checkpoint opens the moment you finish its Verbal and Math units, and you have 24 hours from then. After the deadline you can still submit, but the result is marked late.
```

with:

```tsx
        A checkpoint opens the moment you finish its Verbal and Math units, and you have {CHECKPOINT_WINDOW_LABEL} from then. After the deadline you can still submit, but the result is marked late.
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # expect: 218 or fewer
npm run build                                 # expect: exit 0
```

Manual check: `npm run dev`, open `/checkpoints` as a student, confirm the intro paragraph still reads "…and you have 24 hours from then."

- [ ] **Step 4: Commit**

```bash
git add src/services/api/checkpoints.ts src/pages/CheckpointsPage.tsx
git commit -m "refactor(checkpoints): state the 24-hour window in one place"
```

---

### Task 2: Classify why a lesson was refused

A pure function that turns "the server said 403 on lesson X" into "Checkpoint 3 holds this unit back" — using only data the page already has.

**Files:**
- Modify: `src/lib/checkpointHints.ts` (append after `blockingCheckpointForUnit`, currently ends line 57)

**Interfaces:**
- Consumes: `CheckpointHints`, `blockingCheckpointForUnit`, `isOpen` — all already in this file.
- Produces:
  - `type CheckpointLock = { kind: 'unit-blocked'; blocking: StudentCheckpointItem; unit: CheckpointUnit | null } | { kind: 'checkpoint-shut'; item: StudentCheckpointItem }`
  - `lockKindFor(hints: CheckpointHints, lessonId: number): CheckpointLock | null`

- [ ] **Step 1: Widen the type import**

Line 1 of `src/lib/checkpointHints.ts` currently reads:

```ts
import type { StudentCheckpointItem } from '../services/api/checkpoints';
```

Change it to:

```ts
import type { CheckpointUnit, StudentCheckpointItem } from '../services/api/checkpoints';
```

- [ ] **Step 2: Append the classifier**

Add to the end of `src/lib/checkpointHints.ts`:

```ts
/**
 * Why the server refused a lesson, as far as `/checkpoints/me` can explain it.
 *
 * `unit-blocked` — this lesson is a course unit and an earlier checkpoint in the same group
 * holds it back. `checkpoint-shut` — this lesson IS a checkpoint quiz that is not open for
 * this student. `null` from `lockKindFor` means the checkpoint data explains nothing about
 * this refusal (checkpoints disabled for the group, a plain sequential-access lock, or the
 * `/checkpoints/me` request itself failed) — the caller falls back to the server's own reason.
 */
export type CheckpointLock =
  | { kind: 'unit-blocked'; blocking: StudentCheckpointItem; unit: CheckpointUnit | null }
  | { kind: 'checkpoint-shut'; item: StudentCheckpointItem };

/**
 * Explain a refusal the server already made. This never decides access — the server stays the
 * authority — it only picks the words. Returning `null` is normal and must be handled.
 */
export function lockKindFor(hints: CheckpointHints, lessonId: number): CheckpointLock | null {
  const quizItem = hints.byQuizLesson.get(lessonId);
  if (quizItem) {
    // The quiz of a checkpoint the student may act on shouldn't have been refused; if it was,
    // checkpoint state doesn't explain it, so let the caller fall back to the server's reason.
    return isOpen(quizItem) ? null : { kind: 'checkpoint-shut', item: quizItem };
  }

  const blocking = blockingCheckpointForUnit(hints, lessonId);
  if (!blocking) return null;

  // The blocked unit's own row, so the guide can name it even though the lesson never loaded.
  const own = hints.unitToCheckpoint.get(lessonId);
  const unit = own?.covers.find((u) => u.lesson_id === lessonId) ?? null;
  return { kind: 'unit-blocked', blocking, unit };
}
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # expect: 218 or fewer
npm run build                                 # expect: exit 0
```

Nothing imports `lockKindFor` yet, so there is no runtime check in this task — the type-check is the gate.

- [ ] **Step 4: Commit**

```bash
git add src/lib/checkpointHints.ts
git commit -m "feat(checkpoints): classify why a lesson was refused, from checkpoint data"
```

---

### Task 3: The guide component

**Files:**
- Create: `src/components/checkpoints/CheckpointLockGuide.tsx`

**Interfaces:**
- Consumes: `CheckpointLock` and `isOpen` from `src/lib/checkpointHints`; `CHECKPOINT_WINDOW_LABEL`, `coversLabel`, `formatDeadline`, `deadlineCountdown`, `lateLabel`, `type CheckpointUnit` from `src/services/api/checkpoints`.
- Produces: default export `CheckpointLockGuide`, props
  `{ lock: CheckpointLock | null; unitTitle: string | null; courseId: string; detail: string | null; onNavigate: (path: string) => void }`.

`onNavigate` is passed in rather than the component calling `useNavigate` itself, so the component stays pure-presentational and the page keeps control of routing.

- [ ] **Step 1: Create the file**

Create `src/components/checkpoints/CheckpointLockGuide.tsx` with exactly this content:

```tsx
import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { isOpen } from '../../lib/checkpointHints';
import type { CheckpointLock } from '../../lib/checkpointHints';
import {
  CHECKPOINT_WINDOW_LABEL, coversLabel, deadlineCountdown, formatDeadline, lateLabel,
  type CheckpointUnit,
} from '../../services/api/checkpoints';

interface CheckpointLockGuideProps {
  /** Why the lesson was refused, or null when checkpoint data doesn't explain it. */
  lock: CheckpointLock | null;
  /** Title of the unit the student tried to open; null when we couldn't resolve it. */
  unitTitle: string | null;
  courseId: string;
  /** The server's own refusal reason, used only when `lock` is null. */
  detail: string | null;
  onNavigate: (path: string) => void;
}

/** One numbered step of the "here's how to get in" chain. */
const GuideStep = ({ n, title, children }: { n: number; title: string; children?: ReactNode }) => (
  <li className="relative pl-10">
    <span
      className="absolute left-0 top-0 flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold"
      aria-hidden="true"
    >
      {n}
    </span>
    <p className="font-medium leading-7">{title}</p>
    {children ? <div className="mt-1 space-y-1 text-sm text-muted-foreground">{children}</div> : null}
  </li>
);

/** The checkpoint's required units, ticked off. Unfinished ones link straight to the lesson. */
const UnitChecklist = ({
  units, courseId, linkUnfinished, onNavigate,
}: {
  units: CheckpointUnit[];
  courseId: string;
  linkUnfinished: boolean;
  onNavigate: (path: string) => void;
}) => (
  <ul className="space-y-1" aria-label="Required units">
    {units.map((unit) => (
      <li key={unit.lesson_id} className="flex items-start gap-2">
        {unit.completed ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        ) : (
          <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        )}
        <span className={unit.completed ? 'text-emerald-700 dark:text-emerald-400' : ''}>
          <span className="text-muted-foreground">{unit.kind === 'verbal' ? 'Verbal' : 'Math'} · </span>
          {!unit.completed && linkUnfinished ? (
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => onNavigate(`/course/${courseId}/lesson/${unit.lesson_id}`)}
            >
              {unit.title}
            </button>
          ) : (
            unit.title
          )}
        </span>
      </li>
    ))}
  </ul>
);

export default function CheckpointLockGuide({
  lock, unitTitle, courseId, detail, onNavigate,
}: CheckpointLockGuideProps) {
  const unitName = unitTitle || 'This unit';

  let heading = 'You can’t open this unit yet';
  let lede: ReactNode = detail || 'Finish the earlier material first, then come back.';
  let steps: ReactNode = null;
  let primary: ReactNode = null;

  if (lock?.kind === 'unit-blocked') {
    const cp = lock.blocking;
    const overdue = cp.status === 'overdue';
    heading = `${unitName} is locked`;

    if (isOpen(cp)) {
      // The checkpoint has opened and is waiting to be submitted: that is the whole blockage.
      lede = `Checkpoint ${cp.number} is waiting for you. The course is paused until you submit it.`;
      steps = (
        <>
          <GuideStep
            n={1}
            title={overdue
              ? `Submit Checkpoint ${cp.number} — the deadline has passed`
              : `Take Checkpoint ${cp.number} — it’s open now`}
          >
            <p>{coversLabel(cp.covers)} · {cp.total_questions} questions</p>
            <UnitChecklist units={cp.covers} courseId={courseId} linkUnfinished={false} onNavigate={onNavigate} />
            {cp.deadline ? (
              <p className={overdue ? 'text-red-600 dark:text-red-400' : ''}>
                {overdue ? 'Was due ' : 'Due '}{formatDeadline(cp.deadline)} (Almaty) · {deadlineCountdown(cp.deadline)}
              </p>
            ) : null}
            {overdue ? <p className="text-red-600 dark:text-red-400">You can still submit, but the result is marked late.</p> : null}
          </GuideStep>
          <GuideStep n={2} title={`${unitName} unlocks as soon as you submit.`} />
        </>
      );
      primary = cp.quiz ? (
        <Button onClick={() => onNavigate(`/course/${cp.quiz!.course_id}/lesson/${cp.quiz!.lesson_id}`)}>
          {overdue ? `Submit Checkpoint ${cp.number} late` : `Start Checkpoint ${cp.number}`}
        </Button>
      ) : (
        <p className="text-sm text-red-600 dark:text-red-400">
          Checkpoint {cp.number} is closed. Ask your curator to reopen it.
        </p>
      );
    } else {
      // Defensive: unreachable under the current server rule, where only an opened checkpoint
      // blocks later units. See the Risk section of the design doc.
      lede = `Checkpoint ${cp.number} comes first, and it hasn’t opened yet.`;
      steps = (
        <>
          <GuideStep n={1} title={`Finish these units to open Checkpoint ${cp.number}`}>
            <UnitChecklist units={cp.covers} courseId={courseId} linkUnfinished onNavigate={onNavigate} />
            {cp.locked_reason ? <p>{cp.locked_reason}</p> : null}
          </GuideStep>
          <GuideStep
            n={2}
            title={`Take Checkpoint ${cp.number}`}
          >
            <p>{cp.total_questions} questions · {CHECKPOINT_WINDOW_LABEL} to finish it once it opens.</p>
          </GuideStep>
          <GuideStep n={3} title={`${unitName} unlocks after you submit it.`} />
        </>
      );
    }
  } else if (lock?.kind === 'checkpoint-shut') {
    const cp = lock.item;

    if (cp.status === 'completed') {
      heading = `Checkpoint ${cp.number} is done`;
      lede = 'You have already submitted this checkpoint, so it can’t be opened again.';
      steps = (
        <GuideStep n={1} title="Your result">
          <p>
            {cp.correct_answers}/{cp.total_questions}
            {cp.percentage != null ? ` (${cp.percentage}%)` : ''}
            {cp.submitted_at ? ` · submitted ${formatDeadline(cp.submitted_at)}` : ''}
            {lateLabel(cp) ? ` · ${lateLabel(cp)}` : ''}
          </p>
        </GuideStep>
      );
    } else if (cp.skipped) {
      heading = `Checkpoint ${cp.number} isn’t required for your group`;
      lede = cp.locked_reason || 'Your group starts from a later checkpoint.';
    } else {
      heading = `Checkpoint ${cp.number} isn’t open yet`;
      lede = 'A checkpoint opens the moment you finish every unit it covers.';
      steps = (
        <>
          <GuideStep n={1} title="Finish the units it covers">
            <UnitChecklist units={cp.covers} courseId={courseId} linkUnfinished onNavigate={onNavigate} />
            {cp.locked_reason ? <p>{cp.locked_reason}</p> : null}
          </GuideStep>
          <GuideStep n={2} title={`Then Checkpoint ${cp.number} opens automatically`}>
            <p>{cp.total_questions} questions · {CHECKPOINT_WINDOW_LABEL} to finish it from the moment it opens.</p>
          </GuideStep>
        </>
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="flex items-start gap-3">
        <Lock className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{lede}</p>
        </div>
      </div>

      {steps ? <ol className="mt-6 space-y-5">{steps}</ol> : null}

      <div className="mt-8 flex flex-wrap gap-2">
        {primary}
        <Button variant="outline" onClick={() => onNavigate(`/course/${courseId}`)}>Back to course</Button>
        <Button variant="ghost" onClick={() => onNavigate('/checkpoints')}>My checkpoints</Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # expect: 218 or fewer
npm run build                                 # expect: exit 0
```

Nothing renders it yet — Task 4 wires it in. The type-check is the gate here.

- [ ] **Step 3: Commit**

```bash
git add src/components/checkpoints/CheckpointLockGuide.tsx
git commit -m "feat(checkpoints): a guide out of a locked unit instead of a dead end"
```

---

### Task 4: Wire the guide into the lesson page

Turn the 403 from a failure into a refusal, and render the guide inside the lesson shell so the sidebar survives on desktop.

**Files:**
- Modify: `src/pages/LessonPage.tsx` — imports (line 12-13), state (after line 407), `fetchCheckpoints` (506-517), `loadLessonData` access branch (740-747) and `catch` (806-813), skeleton guard (~2155), error branch (2178-2202)

**Interfaces:**
- Consumes: `lockKindFor`, `type CheckpointLock` (Task 2); `CheckpointLockGuide` (Task 3).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the imports**

Line 13 currently reads:

```tsx
import { buildCheckpointHints, blockingCheckpointForUnit, isOpen as isCheckpointOpen, type CheckpointHints } from '../lib/checkpointHints';
```

Change it to:

```tsx
import { buildCheckpointHints, blockingCheckpointForUnit, isOpen as isCheckpointOpen, lockKindFor, type CheckpointHints } from '../lib/checkpointHints';
import CheckpointLockGuide from '../components/checkpoints/CheckpointLockGuide';
```

- [ ] **Step 2: Add the two pieces of state**

Line 407 currently reads:

```tsx
  const [error, setError] = useState<string | null>(null);
```

Add immediately after it:

```tsx
  // A 403 is a refusal, not a failure: the lesson exists, the student just may not open it yet.
  // Rendered as CheckpointLockGuide rather than as an error, with `detail` (the server's own
  // reason, when it survives the envelope) kept only as a fallback for locks that checkpoint
  // data can't explain.
  const [accessDenied, setAccessDenied] = useState<{ detail: string | null } | null>(null);
  // Whether /checkpoints/me has settled (resolved OR failed). The guide waits for this so a
  // refusal can't flash the wrong explanation before the checkpoint rows arrive.
  const [checkpointsSettled, setCheckpointsSettled] = useState(false);
```

- [ ] **Step 3: Mark the checkpoints fetch as settled**

Replace `fetchCheckpoints` (lines 506-517) with:

```tsx
  const fetchCheckpoints = useCallback(async (): Promise<StudentCheckpointItem[]> => {
    try {
      const res = await getMyCheckpoints();
      const items = res?.items || [];
      setCheckpointItems(items);
      return items;
    } catch {
      // Student may be in a non-checkpoints-enabled group, or the request failed —
      // fail silently and keep whatever we last knew.
      return checkpointItemsRef.current;
    } finally {
      // Resolved or failed, this is as much as we will ever know: the guide may render.
      setCheckpointsSettled(true);
    }
  }, []);
```

- [ ] **Step 4: Route both refusal paths to the guide**

Replace the access-check branch (lines 740-747), which currently reads:

```tsx
      // Handle access check result
      if (!accessCheck.accessible) {
        const reason = accessCheck.reason || 'Please complete previous lessons first.';
        setError(reason);
        toast(reason, 'error');
        navigate(`/course/${courseId}`);
        return;
      }
```

with:

```tsx
      // Handle access check result. A refusal is explained in place rather than bounced back to
      // the course with a toast — the student clicked this unit and deserves to know why.
      if (!accessCheck.accessible) {
        setAccessDenied({ detail: accessCheck.reason || null });
        return;
      }
```

Then replace the `catch` (lines 806-813), which currently reads:

```tsx
    } catch (error) {
      console.error('Failed to load lesson data:', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      // A refusal that carries a reason (a checkpoint holding this unit back, a checkpoint that is
      // not open for this student) is shown as that reason, not as a generic failure.
      setError(status === 403 && typeof detail === 'string' ? detail : 'Failed to load lesson data');
    } finally {
```

with:

```tsx
    } catch (error) {
      console.error('Failed to load lesson data:', error);
      const status = (error as { response?: { status?: number } })?.response?.status;
      const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (status === 403) {
        // The server refused this lesson. GET /lessons, /steps and /progress all gate on the
        // checkpoint rule, and they run in one Promise.all — so any of them can land here before
        // the checkLessonAccess branch above is ever reached. /checkpoints/me explains the lock
        // far better than the refusal string can; the string is only the fallback.
        setAccessDenied({ detail: typeof detail === 'string' ? detail : null });
      } else {
        setError('Failed to load lesson data');
      }
    } finally {
```

- [ ] **Step 5: Clear the refusal when the lesson changes**

`loadLessonData` begins (line 707-709) with:

```tsx
  const loadLessonData = async () => {
    try {
      setIsLessonLoading(true);
```

Change it to:

```tsx
  const loadLessonData = async () => {
    try {
      setIsLessonLoading(true);
      // A refusal belongs to one lesson; navigating to another must not inherit it.
      setAccessDenied(null);
      setError(null);
```

- [ ] **Step 6: Never wait forever on the checkpoint rows**

A hung `/checkpoints/me` must not trap the student on a skeleton — that would be a worse dead end
than the one being fixed. Add this effect immediately after the `fetchCheckpoints` definition:

```tsx
  // Ceiling on the wait above: after 3s, explain the refusal with whatever we have (which may be
  // nothing, i.e. the server's own reason) rather than holding the skeleton indefinitely.
  useEffect(() => {
    if (!accessDenied || checkpointsSettled) return;
    const timer = setTimeout(() => setCheckpointsSettled(true), 3000);
    return () => clearTimeout(timer);
  }, [accessDenied, checkpointsSettled]);
```

- [ ] **Step 7: Hold the skeleton until the checkpoint rows land**

The skeleton guard around line 2155 currently reads:

```tsx
  if (isCourseLoading) {
```

Change it to:

```tsx
  // A refusal waits for /checkpoints/me so the guide never flashes the wrong reason first.
  if (isCourseLoading || (accessDenied && !checkpointsSettled)) {
```

- [ ] **Step 8: Render the guide**

Replace the whole error branch (lines 2178-2202), which currently reads:

```tsx
  if (error) {
    // A checkpoint is holding this unit back (or this checkpoint is not open): say so and lead
    // the student to the checkpoint instead of offering a pointless Retry.
    const lockedByCheckpoint = /checkpoint/i.test(error);
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md px-6">
          <h2 className={`text-2xl font-bold mb-2 ${lockedByCheckpoint ? 'text-foreground' : 'text-red-600 dark:text-red-400'}`}>
            {lockedByCheckpoint ? 'This unit is locked' : 'Error'}
          </h2>
          <p className="text-muted-foreground">{error}</p>
          {lockedByCheckpoint ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button onClick={() => navigate('/checkpoints')}>Go to my checkpoints</Button>
              <Button variant="outline" onClick={() => navigate(`/course/${courseId}`)}>Back to course</Button>
            </div>
          ) : (
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }
```

with:

```tsx
  if (accessDenied) {
    const lock = lockKindFor(checkpointHints, Number(lessonId));
    // The lesson itself never loaded, so its title comes from the checkpoint row that names it,
    // falling back to the course listing.
    const unitTitle =
      (lock?.kind === 'unit-blocked' ? lock.unit?.title : null)
      || modules.flatMap((m) => m.lessons || []).find((l) => String(l.id) === lessonId)?.title
      || null;
    const guide = (
      <CheckpointLockGuide
        lock={lock}
        unitTitle={unitTitle}
        courseId={courseId!}
        detail={accessDenied.detail}
        onNavigate={navigate}
      />
    );

    // The course failed to load too (rare): show the guide on its own rather than nothing.
    if (!course) {
      return <div className="h-screen overflow-y-auto bg-background p-6 md:p-10">{guide}</div>;
    }

    // Keep the course nav on desktop; the guide's own buttons carry the mobile case, where
    // LessonSidebar is hidden.
    return (
      <div className="flex h-screen overflow-hidden bg-background">
        <div className="hidden md:block">
          <LessonSidebar
            course={course}
            modules={modules}
            selectedLessonId={lessonId!}
            onLessonSelect={handleLessonSelect}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            checkpointHints={checkpointHints}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-6 md:p-10">{guide}</div>
      </div>
    );
  }

  // A genuine failure — network, 500, 404. Retry is the right affordance here.
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md px-6">
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={() => window.location.reload()}>Retry</Button>
            <Button variant="outline" onClick={() => navigate(`/course/${courseId}`)}>Back to course</Button>
          </div>
        </div>
      </div>
    );
  }
```

Note the Retry branch gains a **Back to course** button: the reported dead end must not survive in any branch of this screen.

- [ ] **Step 9: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"   # expect: 218 or fewer
npm run build                                 # expect: exit 0
```

If `tsc` reports that `toast` is now unused, check whether any other call site remains in the file (`grep -n "toast(" src/pages/LessonPage.tsx`); remove the import only if there are none.

- [ ] **Step 10: Commit**

```bash
git add src/pages/LessonPage.tsx
git commit -m "fix(checkpoints): explain a locked unit instead of failing to load it"
```

---

### Task 5: Runtime verification

Static checks cannot prove any of this renders. This task is the real gate.

**Files:** none modified.

**Interfaces:**
- Consumes: everything from Tasks 1-4.
- Produces: a filled-in QA record appended to the PR body.

- [ ] **Step 1: Start the app against a backend with checkpoint data**

```bash
npm run dev   # serves on http://localhost:5174
```

Log in as a student in a checkpoints-enabled pilot group (prod group ids 236, 243, 287, 295, 301).

- [ ] **Step 2: Walk the cases**

For each, record pass/fail and a screenshot. Check **both** a desktop width and a ≤640px width (DevTools device toolbar) — the mobile case is the reported bug.

| # | Case | How to reach it | Expected |
|---|---|---|---|
| 1 | **A** — open checkpoint blocks a unit | As a student with an `available` checkpoint, open a later block's unit by URL | "…is locked", numbered chain, covers checklist all ✓, deadline + countdown, **Start Checkpoint N** navigates to the quiz |
| 2 | **B** — overdue checkpoint blocks a unit | Same, with an `overdue` row (admin can set a past deadline via the checkpoints admin page) | Red deadline line, "still submit, but marked late", **Submit Checkpoint N late** |
| 3 | **D** — checkpoint quiz not open | Open a `locked` checkpoint's quiz lesson by URL | "Checkpoint N isn't open yet", units checklist with ○ for the unfinished, unfinished titles link to their lesson |
| 4 | **E** — non-checkpoint refusal | Open a sequentially locked lesson in a course without checkpoints | Server's reason (or the generic line), both nav buttons, no Retry |
| 5 | Genuine failure still errors | Stop the backend, reload a lesson | Red "Error", **Retry** *and* **Back to course** |
| 6 | No flash | Throttle the network (DevTools "Slow 3G") and load a blocked unit | Skeleton → guide. The red Error box must never appear in between |
| 7 | Mobile has an exit | Case 1 at ≤640px | Both **Back to course** and **My checkpoints** visible and working with no sidebar |

Case **C** (a never-opened checkpoint blocking a unit) is unreachable against the current server rule and is not expected to be exercised — see the Risk section of the design doc.

- [ ] **Step 3: Confirm the fix against the reported bug**

Reproduce Бекзат Алшын's path: the URL that produced "Failed to load lesson data" must now show the guide with a working route to the checkpoint. If a student device still shows the old screen, it is the known stale-service-worker cache — hard-reload before concluding the fix failed.

- [ ] **Step 4: Push and open the PR**

Write the PR body to a file first — it has to carry the filled-in QA table, so it is too long to
pass inline:

```bash
git push -u origin fix/checkpoint-locked-unit-guide
# Write /tmp/pr-body.md: a one-paragraph summary, the completed table from Step 2 with
# pass/fail per row, a link to docs/superpowers/specs/2026-09-07-checkpoint-locked-unit-guide-design.md,
# and the two findings from Step 5 below.
gh pr create --repo bebdyshev/lms-front --base master \
  --title "Explain a checkpoint-locked unit instead of failing to load it" \
  --body-file /tmp/pr-body.md
```

- [ ] **Step 5: Raise the two branch findings separately**

Not code changes in this PR — flag them in the PR description so they aren't lost:

1. `feat/sat-checkpoints` inverts the blocked-unit rule so that a never-opened checkpoint blocks, reintroducing the 2026-09-05 pilot incident (18 refused lesson loads in six hours) that the current rule was written to prevent.
2. That branch also sets `DEADLINE_HOURS = 72`; the confirmed window is 24.
