/**
 * Which program a Telegram group belongs to, read from its name.
 *
 * Telegram groups carry no program metadata — only the title a human typed when
 * creating the group — so the SAT / IELTS / NUET / GE filters match on the name.
 *
 * Deliberately NOT `getGroupProgramType` from src/lib/groupPicker.ts. That one
 * is for LMS groups: it trusts a stored program_type and falls back to
 * general_english for anything it can't place. Applied to Telegram, that
 * fallback would file every unlabeled chat ("Отдел продукта", "IT отдел") under
 * General English, so the GE filter would quietly include staff groups. Here an
 * unrecognised name is "Other", and GE has to be named to count.
 */

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
