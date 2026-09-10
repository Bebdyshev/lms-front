import type { Event } from '../../types';
import { eventStyle, eventTitle, layoutDayColumns, minutesInAlmaty, type LaidEvent } from './calendarUtils';

/**
 * How a week-view day column is drawn.
 *
 * Side-by-side columns work while a handful of events overlap. An admin sees every
 * group, and on a weekday 20+ lessons run at 19:00: each got 1/20th of a ~150px
 * column and the week turned into slivers nobody could read. Past the point where
 * cards stop being legible, a day switches to one tile per start hour that says how
 * many events there are, and the day list does the reading.
 */
export type DayPlan =
  | { mode: 'detail'; laid: LaidEvent[] }
  | { mode: 'summary'; tiles: HourTile[] };

export interface HourTile {
  hour: number;       // start hour in Almaty time, 0–23
  events: Event[];    // sorted by start time
  classCount: number; // how many of them are class lessons
}

/** Narrowest width (px) at which an event card still shows its time and a few letters of title. */
const MIN_LANE_PX = 76;
const MAX_LANES = 4;

function span(e: Event): { start: number; end: number } {
  const start = minutesInAlmaty(e.start_datetime);
  // Same floor as layoutDayColumns: very short events still occupy half an hour.
  const end = Math.max(minutesInAlmaty(e.end_datetime), start + 30);
  return { start, end };
}

/** Peak number of events running at the same moment. Back-to-back events do not overlap. */
export function maxConcurrency(dayEvents: Event[]): number {
  const points: Array<[number, number]> = [];
  dayEvents.forEach((e) => {
    const { start, end } = span(e);
    points.push([start, 1], [end, -1]);
  });
  // Ends before starts at the same minute: an event ending at 19:00 frees its lane
  // for one starting at 19:00, exactly as layoutDayColumns treats them.
  points.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let running = 0;
  let peak = 0;
  points.forEach(([, delta]) => {
    running += delta;
    peak = Math.max(peak, running);
  });
  return peak;
}

/** How many side-by-side cards a day column of this width can hold legibly (1–4). */
export function lanesForWidth(px: number): number {
  if (!Number.isFinite(px) || px <= 0) return 1;
  return Math.min(MAX_LANES, Math.max(1, Math.floor(px / MIN_LANE_PX)));
}

export function planDay(dayEvents: Event[], maxLanes: number): DayPlan {
  if (maxConcurrency(dayEvents) <= maxLanes) {
    return { mode: 'detail', laid: layoutDayColumns(dayEvents) };
  }

  const byHour = new Map<number, Event[]>();
  dayEvents.forEach((e) => {
    const hour = Math.floor(minutesInAlmaty(e.start_datetime) / 60);
    const bucket = byHour.get(hour);
    if (bucket) bucket.push(e);
    else byHour.set(hour, [e]);
  });

  const tiles: HourTile[] = [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hour, events]) => {
      const sorted = [...events].sort(
        (a, b) => minutesInAlmaty(a.start_datetime) - minutesInAlmaty(b.start_datetime),
      );
      return { hour, events: sorted, classCount: sorted.filter((e) => e.event_type === 'class').length };
    });
  return { mode: 'summary', tiles };
}

/** "23 lessons" when every event is a class, otherwise "23 events". */
export function countLabel(events: Event[]): string {
  const n = events.length;
  const allClasses = n > 0 && events.every((e) => e.event_type === 'class');
  const noun = allClasses ? 'lesson' : 'event';
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

export function tileLabel(tile: HourTile): string {
  return countLabel(tile.events);
}

/** The name an event card shows: the group for a class, the title without "Deadline:" for an assignment. */
export function cardTitle(e: Event): string {
  return e.event_type === 'assignment' ? e.title.replace(/^Deadline:\s*/i, '') : eventTitle(e);
}

/** One colour dot per distinct group/type in the tile, capped, with how many were left out. */
export function tileDots(tile: HourTile, max = 8): { dots: string[]; extra: number } {
  const distinct: string[] = [];
  tile.events.forEach((e) => {
    const dot = eventStyle(e).dot;
    if (!distinct.includes(dot)) distinct.push(dot);
  });
  return { dots: distinct.slice(0, max), extra: Math.max(0, distinct.length - max) };
}

/** Hover text for a tile: the first few names, then how many more. */
export function tileTooltip(tile: HourTile, limit = 12): string {
  const names = tile.events.slice(0, limit).map(cardTitle);
  const rest = tile.events.length - names.length;
  return rest > 0 ? [...names, `…and ${rest} more`].join('\n') : names.join('\n');
}
