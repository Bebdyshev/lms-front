import type { AxiosRequestConfig } from 'axios';
import { api } from './client';

/**
 * Telegram announcements.
 *
 * These endpoints proxy to the Support platform, which owns the bot, the group
 * registry and the delivery queue. Errors therefore carry information the user
 * genuinely needs — "bot was kicked from the supergroup chat" tells a head
 * curator exactly what to fix — so every call surfaces the backend's `detail`
 * rather than a generic message.
 */

/** Approval state of a discovered group. Only `approved` groups can receive anything. */
export type GroupStatus = 'pending' | 'approved' | 'rejected';

export interface TelegramGroup {
  id: number;
  telegram_chat_id: number;
  title: string;
  chat_type: string;
  status: GroupStatus;
  /** Whether the bot is still a member. An approved group the bot left is not deliverable. */
  is_active: boolean;
  /** Pinning needs admin rights; without them a send still lands, unpinned. */
  bot_is_admin: boolean;
  approved_by_email: string | null;
  approved_at: string | null;
  discovered_at: string;
  last_seen_at: string | null;
}

export interface RecipientSummary {
  approved_groups: number;
  /** Students with a bound chat who have not muted announcements. */
  students_opted_in: number;
  students_bound: number;
}

export type AnnouncementStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'partially_failed'
  | 'canceled'
  | 'recalled';

export type TargetStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export interface AnnouncementTarget {
  id: number;
  kind: 'group' | 'chat';
  telegram_chat_id: number;
  label: string;
  status: TargetStatus;
  attempts: number;
  error: string | null;
  pinned: boolean;
  sent_at: string | null;
}

export interface AnnouncementImage {
  id: number;
  position: number;
  filename: string;
}

export interface Announcement {
  id: number;
  body: string;
  status: AnnouncementStatus;
  created_by_email: string;
  created_by_name: string;
  pin: boolean;
  silent: boolean;
  scheduled_for: string | null;
  total_count: number;
  sent_count: number;
  failed_count: number;
  started_at: string | null;
  finished_at: string | null;
  recalled_at: string | null;
  created_at: string;
  images: AnnouncementImage[];
}

export interface AnnouncementDetail extends Announcement {
  targets: AnnouncementTarget[];
}

export interface AnnouncementListResponse {
  announcements: Announcement[];
  total: number;
}

export interface CreateAnnouncementPayload {
  body: string;
  target_group_ids: number[];
  target_all_students: boolean;
  pin: boolean;
  silent: boolean;
  /** ISO-8601, or null to deliver on the worker's next tick. */
  scheduled_for: string | null;
}

export interface TestSendResult {
  ok: boolean;
  error: string | null;
  message_ids: number[];
  pinned: boolean;
}

/** Surface the backend's error `detail` (the Telegram failure reason) when present. */
function rethrow(error: unknown, fallback: string): never {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  throw new Error(typeof detail === 'string' ? detail : fallback);
}

/**
 * Delivery state changes while the worker drains, so these reads must never be
 * served from cache — a stale "12/40 delivered" is worse than a slow one.
 */
const NO_CACHE = { cache: false } as AxiosRequestConfig & { cache?: boolean };

export async function getGroups(status?: GroupStatus): Promise<TelegramGroup[]> {
  try {
    const response = await api.get('/announcements/groups', {
      ...NO_CACHE,
      params: status ? { status } : undefined,
    });
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to load Telegram groups');
  }
}

export async function setGroupStatus(
  groupId: number,
  status: GroupStatus,
): Promise<TelegramGroup> {
  try {
    const response = await api.patch(`/announcements/groups/${groupId}`, { status });
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to update the group');
  }
}

export async function getRecipientSummary(): Promise<RecipientSummary> {
  try {
    const response = await api.get('/announcements/recipients', NO_CACHE);
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to load recipient counts');
  }
}

export async function getAnnouncements(limit = 50, offset = 0): Promise<AnnouncementListResponse> {
  try {
    const response = await api.get('/announcements', { ...NO_CACHE, params: { limit, offset } });
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to load announcements');
  }
}

export async function getAnnouncement(id: number): Promise<AnnouncementDetail> {
  try {
    const response = await api.get(`/announcements/${id}`, NO_CACHE);
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to load the announcement');
  }
}

/**
 * Create and send (or schedule). The recipient list is frozen at this moment
 * and never recomputed, so the count confirmed in the dialog is the count that
 * ships.
 */
export async function createAnnouncement(
  payload: CreateAnnouncementPayload,
  images: File[],
): Promise<AnnouncementDetail> {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  images.forEach((image) => form.append('images', image));
  try {
    const response = await api.post('/announcements', form);
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to send the announcement');
  }
}

/**
 * Send the composition as it currently stands to one chat — the staff test
 * group — before it is created. This is what the composer's "Test send" button
 * calls; a preview you can only run after committing to send is not a preview.
 * Nothing is persisted, so a test send cannot be recalled.
 */
export async function testSendPreview(
  payload: CreateAnnouncementPayload & { test_chat_id: number },
  images: File[],
): Promise<TestSendResult> {
  const form = new FormData();
  form.append('payload', JSON.stringify(payload));
  images.forEach((image) => form.append('images', image));
  try {
    const response = await api.post('/announcements/test-send', form);
    return response.data;
  } catch (error) {
    rethrow(error, 'Test send failed');
  }
}

export async function testSend(id: number, chatId: number): Promise<TestSendResult> {
  try {
    const response = await api.post(`/announcements/${id}/test-send`, { chat_id: chatId });
    return response.data;
  } catch (error) {
    rethrow(error, 'Test send failed');
  }
}

export async function cancelAnnouncement(id: number): Promise<AnnouncementDetail> {
  try {
    const response = await api.post(`/announcements/${id}/cancel`);
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to cancel the announcement');
  }
}

/** Deletes the delivered messages wherever Telegram still allows it (~48 hours). */
export async function recallAnnouncement(id: number): Promise<AnnouncementDetail> {
  try {
    const response = await api.post(`/announcements/${id}/recall`);
    return response.data;
  } catch (error) {
    rethrow(error, 'Failed to recall the announcement');
  }
}

/** Telegram's own limits, mirrored so the composer can enforce them live. */
export const TEXT_LIMIT = 4096;
export const CAPTION_LIMIT = 1024;
export const MAX_IMAGES = 10;

// --- Telegram rich text ----------------------------------------------------
//
// Telegram's two markup modes are MarkdownV2 and HTML. MarkdownV2 makes you
// escape eighteen characters wherever they appear in ordinary prose, which is
// hostile to text a human typed; HTML needs only &, < and > escaped. So the
// composer speaks HTML, and the server sanitises it to Telegram's allowed tag
// set before storing it.

/** Tags the toolbar can produce. Kept in step with the server's allowlist in
 *  `backend/src/announcements/formatting.py`. */
export type MarkupTag = 'b' | 'i' | 'u' | 's' | 'code' | 'blockquote' | 'tg-spoiler';

/**
 * The message as a recipient reads it — tags removed, entities decoded.
 *
 * This is what Telegram's 4096/1024 caps apply to: the limits are enforced on
 * the message AFTER entity parsing, so `<b>hi</b>` is two characters. A counter
 * that measured the raw string would refuse text that comfortably fits.
 */
export function visibleText(body: string): string {
  const withoutTags = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  const el = document.createElement('textarea');
  el.innerHTML = withoutTags;
  return el.value;
}

export function visibleLength(body: string): number {
  return visibleText(body).length;
}

/**
 * Render a body for the preview pane.
 *
 * Escapes everything first, then re-enables only the known tags. The content is
 * written by an admin in their own browser, but escape-then-allow is the only
 * version of this that stays correct when someone pastes markup from elsewhere.
 */
export function renderPreviewHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const simple = ['b', 'i', 'u', 's', 'code', 'blockquote'];
  let out = escaped;
  for (const tag of simple) {
    out = out
      .replace(new RegExp(`&lt;${tag}&gt;`, 'gi'), `<${tag}>`)
      .replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag}>`);
  }
  // Spoilers have no browser equivalent; show them blurred so the sender can
  // see the extent of what will be hidden.
  out = out
    .replace(/&lt;tg-spoiler&gt;/gi, '<span class="rounded bg-muted-foreground/30 text-transparent">')
    .replace(/&lt;\/tg-spoiler&gt;/gi, '</span>');
  // Links: only http(s), matching the server's scheme allowlist.
  out = out.replace(
    /&lt;a href=&quot;(https?:\/\/[^&"]+)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline">$2</a>',
  );
  out = out.replace(
    /&lt;a href="(https?:\/\/[^&"]+)"&gt;([\s\S]*?)&lt;\/a&gt;/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline">$2</a>',
  );
  return out.replace(/\n/g, '<br />');
}

// --- Program detection for Telegram groups ---------------------------------
//
// Telegram groups carry no program metadata — only the title a human typed when
// creating the group — so the composer's SAT / IELTS / NUET / GE filters match
// on the name.
//
// Deliberately NOT `getGroupProgramType` from src/lib/groupPicker.ts. That one
// is for LMS groups: it trusts a stored program_type and falls back to
// general_english for anything it can't place. Applied to Telegram, that
// fallback would file every unlabeled chat ("Отдел продукта", "IT отдел") under
// General English, so the GE filter would quietly include staff groups. Here an
// unrecognised name is "Other", and GE has to be named to count.

export type ProgramKey = 'sat' | 'ielts' | 'nuet' | 'general_english';

/**
 * Words that mark a group as belonging to a program. Latin and Cyrillic
 * spellings both appear in real chat titles. Extend here — every filter and
 * badge reads this list.
 */
const PROGRAM_ALIASES: Record<ProgramKey, string[]> = {
  sat: ['sat', 'сат'],
  ielts: ['ielts', 'айелтс', 'айлтс'],
  nuet: ['nuet', 'нуэт', 'нует'],
  general_english: ['ge', 'general english', 'general-english', 'общий английский'],
};

/**
 * Match an alias as a whole word. JavaScript's `\b` only understands ASCII, so
 * it can't bound a Cyrillic alias at all — hence the explicit Unicode letter
 * class. Digits may follow ("GE12", "SAT2026" are real naming habits) but
 * letters may not, so "ge" never fires inside "Georgia" or "general", and "sat"
 * never fires inside "Saturday".
 */
const PROGRAM_PATTERNS: Record<ProgramKey, RegExp> = Object.fromEntries(
  (Object.entries(PROGRAM_ALIASES) as [ProgramKey, string[]][]).map(([key, aliases]) => {
    // Note the escape set has no `-`: under the `u` flag, `\-` outside a
    // character class is a SyntaxError, and since these patterns are built at
    // import time that would take down the whole page on load.
    const escaped = aliases.map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return [key, new RegExp(`(?:^|[^\\p{L}])(?:${escaped.join('|')})(?![\\p{L}])`, 'iu')];
  }),
) as Record<ProgramKey, RegExp>;

export const PROGRAM_ORDER: ProgramKey[] = ['sat', 'ielts', 'nuet', 'general_english'];

/** Short chip labels. "GE" rather than "General English" keeps the row on one line. */
export const PROGRAM_CHIP_LABELS: Record<ProgramKey, string> = {
  sat: 'SAT',
  ielts: 'IELTS',
  nuet: 'NUET',
  general_english: 'GE',
};

/**
 * Every program a title names. Usually one, occasionally more ("SAT + IELTS
 * intensive"); an empty list means Other. Returning a list rather than a single
 * best guess means a combined group shows up under both filters instead of
 * being silently assigned to whichever keyword happened to be checked first.
 */
export function detectPrograms(title: string): ProgramKey[] {
  return PROGRAM_ORDER.filter((key) => PROGRAM_PATTERNS[key].test(title));
}
