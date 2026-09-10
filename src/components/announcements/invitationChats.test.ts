import { describe, expect, it } from 'vitest';
import { chatRows } from './invitationChats';
import type { InvitationLinks } from '../../services/api/announcements';

const data = {
  enabled: false,
  chats_error: null,
  chats: [
    { id: 10, title: 'SAT July 8' },
    { id: 11, title: 'IELTS June 14 2026' },
    { id: 12, title: '07.08 SAT August 6 2026' },
  ],
  groups: [
    { id: 1, name: 'July 8 SAT - Gulzada', link: { chat_id: 10, chat_title: 'SAT July 8', chat_available: true, linked_at: null }, suggestion: null, last_invitation: null },
    { id: 2, name: 'July 8 SAT (second)', link: { chat_id: 10, chat_title: 'SAT July 8', chat_available: true, linked_at: null }, suggestion: null, last_invitation: null },
    { id: 3, name: 'August 6 SAT - Исабеков', link: null, suggestion: null, last_invitation: null },
  ],
} as InvitationLinks;

describe('chats seen from Telegram', () => {
  it('lists every approved chat with the groups it serves, and the ones that serve none', () => {
    const rows = chatRows(data);
    const byTitle = Object.fromEntries(rows.map((r) => [r.chat.title, r.groups.map((g) => g.id)]));
    expect(byTitle['SAT July 8']).toEqual([1, 2]); // one chat may serve two groups
    expect(byTitle['IELTS June 14 2026']).toEqual([]);
    expect(byTitle['07.08 SAT August 6 2026']).toEqual([]);
  });

  it('sorts chats by title, numbers read as numbers', () => {
    expect(chatRows(data).map((r) => r.chat.id)).toEqual([12, 11, 10]);
  });
});
