/**
 * Point a Google Meet link at the viewer's work account.
 *
 * A browser signed into several Google accounts opens Meet on whichever one it treats as
 * the default — usually a personal account, because it was added first. Both may show the
 * same name, so the teacher has no reason to think anything is wrong. But Meet then counts
 * her as outside the organisation: she cannot record, cannot remove participants, and the
 * lesson's auto-recording does not start until someone from the organisation joins. On
 * 2026-09-10 a lesson only recorded because an admin happened to join at 18:59:59.
 *
 * `authuser` tells Google which signed-in account to use. With an email rather than an
 * index it survives the browser's account order changing, and if that account is not
 * signed in, Google asks for it instead of silently falling back to another.
 *
 * Only Meet links are touched, and only for viewers who have a work account. Students
 * have none, so their links are returned unchanged.
 */
export function meetJoinUrl(url: string | null | undefined, workspaceEmail?: string | null): string {
  if (!url) return '';
  const account = workspaceEmail?.trim().toLowerCase();
  if (!account) return url;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'meet.google.com') return url;

  parsed.searchParams.set('authuser', account);
  return parsed.toString();
}
