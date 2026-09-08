import { Lock, AlertCircle, ClipboardCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { isCheckpointReason } from '../../services/api/apiError';

// What the player shows when a lesson will not load.
//
// Two different things used to look identical here: a lesson the student is simply not allowed
// into yet, and the server actually failing. The first is a normal state of the course — a
// checkpoint that has to be sat first, a unit further down the sequence — and it now reads as
// one, with the server's own sentence and somewhere to go next. Only a genuinely unknown
// failure keeps the red card and the Retry button, because only then can retrying help.

export interface LessonLoadError {
  /** The server's sentence, in Russian, or our own wording when the server said nothing. */
  message: string;
  /** `reason_code` from the backend. Absent means we do not know why — treat as a failure. */
  code?: string;
  /** Extra the reason carried, e.g. which checkpoint is holding the unit back. */
  details?: { checkpoint?: { number?: number; title?: string }; missing_units?: string[] };
}

interface Props {
  error: LessonLoadError;
  onRetry: () => void;
  onBackToCourse: () => void;
  onGoToCheckpoints: () => void;
}

function headingFor(code: string | undefined): string {
  switch (code) {
    case 'checkpoint_locked':
      return 'Юнит пока закрыт';
    case 'checkpoint_not_open':
      return 'Контрольная ещё не открыта';
    case 'lesson_not_found':
      return 'Урок не найден';
    case undefined:
      return 'Не удалось загрузить урок';
    default:
      // Every other named reason is a lock of some kind: not enrolled, previous lesson
      // unfinished, module not released yet, outside the trial.
      return 'Урок недоступен';
  }
}

export default function LessonLoadErrorCard({
  error,
  onRetry,
  onBackToCourse,
  onGoToCheckpoints,
}: Props) {
  const gatedByCheckpoint = isCheckpointReason(error.code);
  // The server named a reason, so it will name the same one again — retrying cannot clear a
  // lock. Retry is offered only when we genuinely do not know what went wrong.
  const canRetry = !error.code;
  const Icon = canRetry ? AlertCircle : gatedByCheckpoint ? ClipboardCheck : Lock;

  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center max-w-md px-6">
        <Icon
          className={`mx-auto mb-3 h-10 w-10 ${
            canRetry ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground'
          }`}
          aria-hidden="true"
        />
        <h2
          className={`text-2xl font-bold mb-2 ${
            canRetry ? 'text-red-600 dark:text-red-400' : 'text-foreground'
          }`}
        >
          {headingFor(error.code)}
        </h2>
        <p className="text-muted-foreground">{error.message}</p>

        {error.details?.missing_units?.length ? (
          <ul className="mt-3 text-left text-sm text-muted-foreground list-disc list-inside space-y-1">
            {error.details.missing_units.map((unit) => (
              <li key={unit}>{unit}</li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {canRetry ? (
            <Button onClick={onRetry}>Повторить</Button>
          ) : (
            <>
              {gatedByCheckpoint && (
                <Button onClick={onGoToCheckpoints}>Мои контрольные</Button>
              )}
              <Button variant={gatedByCheckpoint ? 'outline' : 'default'} onClick={onBackToCourse}>
                Вернуться к курсу
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
