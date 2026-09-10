import type { InvitationChat, InvitationGroupRow, InvitationLinks } from '../../services/api/announcements';

export interface ChatRow {
  chat: InvitationChat;
  groups: InvitationGroupRow[];
}

/** Every approved chat with the LMS group(s) it serves: the group list, read from Telegram's side. */
export function chatRows(data: InvitationLinks): ChatRow[] {
  return data.chats
    .map((chat) => ({ chat, groups: data.groups.filter((g) => g.link?.chat_id === chat.id) }))
    .sort((a, b) => a.chat.title.localeCompare(b.chat.title, undefined, { numeric: true, sensitivity: 'base' }));
}
