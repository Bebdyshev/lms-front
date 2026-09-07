import type { CheckpointUnit, StudentCheckpointItem } from '../services/api/checkpoints';

// Small pure helpers shared by LessonPage and CourseOverviewPage to render
// "this unit feeds Checkpoint N" cues from a /checkpoints/me response.

export interface CheckpointHints {
  /** unit lesson_id -> the checkpoint it is required by */
  unitToCheckpoint: Map<number, StudentCheckpointItem>;
  /** checkpoint quiz lesson_id -> the checkpoint itself */
  byQuizLesson: Map<number, StudentCheckpointItem>;
  /** every item, in number order, for the ordinal gate below */
  items: StudentCheckpointItem[];
}

export function buildCheckpointHints(items: StudentCheckpointItem[] | undefined | null): CheckpointHints {
  const unitToCheckpoint = new Map<number, StudentCheckpointItem>();
  const byQuizLesson = new Map<number, StudentCheckpointItem>();

  for (const item of items || []) {
    for (const unit of item.covers || []) {
      unitToCheckpoint.set(unit.lesson_id, item);
    }
    if (item.quiz) {
      byQuizLesson.set(item.quiz.lesson_id, item);
    }
  }

  const sorted = [...(items || [])].sort((a, b) => a.number - b.number);
  return { unitToCheckpoint, byQuizLesson, items: sorted };
}

/** A checkpoint the student can act on right now. The deadline is soft, so an overdue
 *  checkpoint is still answerable (the submission is marked late). */
export function isOpen(item: Pick<StudentCheckpointItem, 'status'>): boolean {
  return item.status === 'available' || item.status === 'reopened' || item.status === 'overdue';
}

/**
 * Mirrors the backend gate (blocked_unit_lesson_ids_for_student): only a checkpoint that has
 * opened and is not yet submitted — available, reopened or overdue — pauses the course; the
 * units of every later block wait for it. Completed, skipped and never-opened checkpoints hold
 * nothing back.
 */
export function isPending(item: Pick<StudentCheckpointItem, 'status'>): boolean {
  return isOpen(item);
}

/**
 * The earlier checkpoint (same group) that holds this unit back, or null when the unit is not
 * bound to a checkpoint or no earlier checkpoint is pending. Used only to explain a lock the
 * server already imposed — the server stays the authority.
 */
export function blockingCheckpointForUnit(hints: CheckpointHints, unitLessonId: number): StudentCheckpointItem | null {
  const own = hints.unitToCheckpoint.get(unitLessonId);
  if (!own) return null;
  return hints.items.find((i) => i.group_id === own.group_id && i.number < own.number && isPending(i)) || null;
}

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
    //
    // `checkpoint-shut` is DEFENSIVE and unreachable against the current server: the quiz gate
    // refuses exactly the `locked` rows (open_checkpoint_lesson_ids_for_student filters
    // `status != locked`), and the serializer nulls `quiz` for exactly those same rows — so a
    // refused quiz lesson is never in `byQuizLesson`, and one that is in the map is never
    // refused. A student who opens a locked checkpoint's quiz URL therefore lands on the
    // `null` fallback with the server's own reason, not on this branch. It is kept because it
    // costs a few lines and is the correct rendering should the server ever expose the quiz
    // link before a checkpoint opens.
    return isOpen(quizItem) ? null : { kind: 'checkpoint-shut', item: quizItem };
  }

  const blocking = blockingCheckpointForUnit(hints, lessonId);
  if (!blocking) return null;

  // The blocked unit's own row, so the guide can name it even though the lesson never loaded.
  const own = hints.unitToCheckpoint.get(lessonId);
  const unit = own?.covers.find((u) => u.lesson_id === lessonId) ?? null;
  return { kind: 'unit-blocked', blocking, unit };
}
