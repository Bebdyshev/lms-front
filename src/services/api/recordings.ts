import { api } from './client';

/**
 * What the backend says about a lesson's recording.
 *
 * `missing` covers both "this lesson was never recorded" and "you may not see it" — the
 * endpoint returns 404 to anyone outside the group rather than 403, so that the existence
 * of a recording is not confirmed to someone who cannot watch it. The UI must therefore
 * treat "missing" as "show nothing", never as an error.
 */
export type LessonRecordingStatus = 'ready' | 'pending' | 'failed' | 'missing';

export interface LessonRecording {
  status: LessonRecordingStatus;
  /** Signed HLS URL, scoped to the current viewer and short-lived. Only when ready. */
  url: string | null;
  duration_seconds?: number | null;
}

/**
 * Fetch a lesson's recording.
 *
 * **Never cached.** The URL carries a signed token minted for this viewer and expires, so
 * a cached response would either hand one viewer's token to another or replay an expired
 * one. The backend deliberately excludes this route from its cache rules for the same
 * reason; `{ cache: false }` is the client half of that contract.
 */
export async function getLessonRecording(eventId: number): Promise<LessonRecording> {
  try {
    const response = await api.get(`/events/${eventId}/recording`, { cache: false } as never);
    return response.data as LessonRecording;
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 404 || status === 403) {
      // Not visible to this viewer, or no such lesson. Indistinguishable by design.
      return { status: 'missing', url: null };
    }
    throw new Error('Failed to load the recording');
  }
}
