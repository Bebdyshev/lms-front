import { useEffect, useState } from 'react';
import { Loader2, PlayCircle, Video } from 'lucide-react';
import HlsVideoPlayer from '../HlsVideoPlayer';
import { getLessonRecording, type LessonRecording } from '../../services/api/recordings';
import type { Event } from '../../types';

interface Props {
  event: Event;
}

/** Only lessons that have actually finished can have a recording. */
function hasFinished(event: Event): boolean {
  const end = new Date(event.end_datetime ?? event.start_datetime);
  return Number.isFinite(end.getTime()) && end.getTime() < Date.now();
}

function formatDuration(seconds?: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

/**
 * The recording of a finished lesson, inside the lesson dialog.
 *
 * Three deliberate choices:
 *
 * **Nothing is requested for a lesson that has not ended.** Opening any future lesson
 * would otherwise fire a request that can only ever answer "missing", on a calendar where
 * most lessons are in the future.
 *
 * **"missing" renders nothing at all.** The backend answers 404 to viewers outside the
 * group and the client maps that to `missing`, so this state means both "never recorded"
 * and "not yours to see". Rendering an empty state would tell a student in another group
 * that a recording exists — the exact thing the 404 exists to prevent.
 *
 * **The video only loads once the student asks for it.** The signed URL is already in
 * hand, but mounting a player per dialog open would start fetching HLS segments for
 * anyone who merely clicked a lesson to check its time.
 */
export default function LessonRecordingSection({ event }: Props) {
  const [recording, setRecording] = useState<LessonRecording | null>(null);
  const [loading, setLoading] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    setRecording(null);
    setWatching(false);
    if (!hasFinished(event)) return;

    let cancelled = false;
    setLoading(true);
    getLessonRecording(event.id)
      .then((data) => {
        if (!cancelled) setRecording(data);
      })
      .catch(() => {
        // A failed lookup is not something a student can act on, and the lesson dialog
        // still has to work. Stay silent rather than showing an error for a feature
        // they may not even have.
        if (!cancelled) setRecording({ status: 'missing', url: null });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [event.id, event.end_datetime]);

  if (!hasFinished(event)) return null;

  if (loading) {
    return (
      <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 flex-none animate-spin" />
        <span>Checking for a recording…</span>
      </div>
    );
  }

  if (!recording || recording.status === 'missing') return null;

  if (recording.status === 'pending') {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 flex-none animate-spin" />
          <span>The recording is still being processed. Check back a little later.</span>
        </div>
      </div>
    );
  }

  if (recording.status === 'failed') {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <Video className="h-4 w-4 flex-none text-muted-foreground/70" />
          <span>The recording of this lesson is not available.</span>
        </div>
      </div>
    );
  }

  const duration = formatDuration(recording.duration_seconds);

  return (
    <div className="mt-4 border-t border-border pt-4">
      {watching && recording.url ? (
        <HlsVideoPlayer url={recording.url} title={event.title} className="w-full" />
      ) : (
        <button
          type="button"
          onClick={() => setWatching(true)}
          className="flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition hover:bg-muted"
        >
          <PlayCircle className="h-5 w-5 flex-none text-primary" />
          <span className="text-sm font-semibold text-foreground">Watch the recording</span>
          {duration && (
            <span className="ml-auto text-xs text-muted-foreground">{duration}</span>
          )}
        </button>
      )}
    </div>
  );
}
