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
