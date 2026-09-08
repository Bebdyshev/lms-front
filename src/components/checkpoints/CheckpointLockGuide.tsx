import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { Button } from '../ui/button';
import { isOpen } from '../../lib/checkpointHints';
import type { CheckpointLock } from '../../lib/checkpointHints';
import {
  CHECKPOINT_WINDOW_LABEL, coversLabel, deadlineCountdown, formatDeadline, lateLabel,
  type CheckpointUnit,
} from '../../services/api/checkpoints';
import type { LessonLock } from '../../services/api/lessons';

interface CheckpointLockGuideProps {
  /** Why the lesson was refused, or null when checkpoint data doesn't explain it. */
  lock: CheckpointLock | null;
  /** Title of the unit the student tried to open; null when we couldn't resolve it. */
  unitTitle: string | null;
  courseId: string;
  /** The server's own refusal reason, used only when `lock` is null. */
  detail: string | null;
  /**
   * The server's structured explanation (GET .../check-access). It is the authority on the
   * unit's title and on which gate fired — it can name a unit in a course the client cannot
   * see at all — so its title always wins. Its steps are used whenever `lock` above doesn't
   * give us the richer, interactive checkpoint rendering.
   */
  serverLock?: LessonLock | null;
  onNavigate: (path: string) => void;
}

/** One numbered step of the "here's how to get in" chain. The number is a plain bold numeral
 *  rather than a chip: the emphasis carries the structure, so no extra chrome is needed. */
const GuideStep = ({ n, title, children }: { n: number; title: string; children?: ReactNode }) => (
  <li className="pl-7 -indent-7">
    <span className="font-semibold text-muted-foreground">{n}. </span>
    <span className="font-semibold text-foreground">{title}</span>
    {children ? <span className="block indent-0 space-y-1 text-muted-foreground">{children}</span> : null}
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
        <span className={unit.completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}>
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
  lock, unitTitle, courseId, detail, serverLock, onNavigate,
}: CheckpointLockGuideProps) {
  // The server's title wins: it can name a unit whose course the client can't even list.
  const resolvedTitle = serverLock?.unit_title || unitTitle || null;
  const unitName = resolvedTitle || 'This unit';

  // Fallback (no checkpoint explains the refusal). The server says which gate fired and what to
  // do about it; we only supply generic advice when it didn't answer at all.
  const serverReason = serverLock?.reason || detail;
  const serverSteps = serverLock?.steps?.length ? serverLock.steps : null;
  let heading = resolvedTitle ? `${resolvedTitle} is locked` : 'You can’t open this unit yet';
  let lede: ReactNode = 'This unit isn’t open for you yet.';
  let steps: ReactNode = (
    <>
      <GuideStep n={1} title="Why it’s locked">
        <p className="font-medium text-amber-700 dark:text-amber-400">
          {serverReason || 'The server didn’t give a reason for this one.'}
        </p>
      </GuideStep>
      <GuideStep n={2} title="What to do">
        {serverSteps ? (
          serverSteps.map((step, i) => <p key={i}>{step}</p>)
        ) : (
          <>
            <p>Go back to the course and finish the units that come before this one.</p>
            <p>If it still won’t open, ask your curator to check your access.</p>
          </>
        )}
      </GuideStep>
    </>
  );
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
              ? `Submit Checkpoint ${cp.number}, the deadline has passed`
              : `Take Checkpoint ${cp.number}, it’s open now`}
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
    // Header and actions are centred so the block reads as centred at any pane width (the
    // sidebar collapses to w-0, which would otherwise leave short left-aligned lines drifting
    // well left of the middle). The steps stay left-aligned, since a centred numbered list is
    // much harder to read, inside the same centred column.
    <div className="mx-auto w-full max-w-xl text-center">
      <Lock className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-semibold">{heading}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{lede}</p>

      {steps ? <ol className="mt-8 space-y-4 text-left text-sm">{steps}</ol> : null}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        {primary}
        <Button variant="outline" onClick={() => onNavigate(`/course/${courseId}`)}>Back to course</Button>
        <Button variant="ghost" onClick={() => onNavigate('/checkpoints')}>My checkpoints</Button>
      </div>
    </div>
  );
}
