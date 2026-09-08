// Reading and forwarding the server's own explanation of a refusal.
//
// Most wrappers in this folder used to `catch { throw new Error('Failed to load X') }`, which
// discards the axios error — status, body and all. The backend takes care to say *why* a lesson
// is refused (a checkpoint still pending, no access to the course, the lesson deleted), and that
// reason died one layer below the screen that wanted it. `rethrowPreservingResponse` keeps the
// original error when there is a server response to read, and `readApiError` reads it.

/** The named reasons the backend attaches to a refused lesson read.
 *  Mirrors `src/utils/lesson_access_errors.py`; unknown codes are handled as unknown. */
export type LessonReasonCode =
  | 'lesson_not_found'
  | 'course_access_denied'
  | 'checkpoint_locked'
  | 'checkpoint_not_open'
  | 'trial_locked'
  | 'role_denied'
  | 'module_not_released'
  | 'group_cap'
  | 'previous_lesson_incomplete'
  | 'previous_module_incomplete'
  | 'not_in_sequence';

export interface ApiErrorInfo {
  status?: number;
  /** The server's human sentence, already in Russian for the lesson gates. */
  detail?: string;
  reasonCode?: string;
  reasonDetails?: {
    checkpoint?: { number?: number; title?: string };
    missing_units?: string[];
    module_week?: number;
    current_week?: number;
  };
}

interface ErrorShape {
  response?: {
    status?: number;
    data?: {
      detail?: unknown;
      reason_code?: unknown;
      reason_details?: ApiErrorInfo['reasonDetails'];
    };
  };
}

/**
 * Rethrow so the caller can still read `response.status` and the reason in `response.data`.
 * A failure with no response at all (offline, DNS, a timeout) has nothing worth forwarding, so
 * it becomes `fallbackMessage` — the caller's own wording for "the request did not happen".
 */
export function rethrowPreservingResponse(error: unknown, fallbackMessage: string): never {
  if (error && typeof error === 'object' && 'response' in error && (error as ErrorShape).response) {
    throw error;
  }
  throw new Error(fallbackMessage);
}

/** What the server said, or an empty object when it said nothing readable. */
export function readApiError(error: unknown): ApiErrorInfo {
  const response = (error as ErrorShape | null)?.response;
  if (!response) return {};
  const data = response.data;
  const detail = typeof data?.detail === 'string' ? data.detail : undefined;
  const reasonCode = typeof data?.reason_code === 'string' ? data.reason_code : undefined;
  return { status: response.status, detail, reasonCode, reasonDetails: data?.reason_details };
}

/** True for the reasons a checkpoint is holding back — a gated state, not a failure. */
export function isCheckpointReason(code: string | undefined): boolean {
  return code === 'checkpoint_locked' || code === 'checkpoint_not_open';
}
