/**
 * Whether a Telegram group has a curator, read from its name.
 *
 * Like the program (see `programs.ts`), this lives only in the title staff
 * typed — "June 7 IELTS with curator" — because Telegram groups carry no other
 * metadata. One group says "with mentor" for the same role, so a mentor counts.
 *
 * "with" is part of every alias on purpose: a chat named after the role
 * ("Кураторы", "Curators team") is a staff chat, not a group that has one, and
 * because the alias must start at a word boundary, "without curator" never
 * matches either.
 */

import { titlePattern } from './programs';

/** Extend here — the filter reads only this list. */
const CURATOR_ALIASES = [
  'with curator',
  'with curators',
  'with mentor',
  'with mentors',
  'с куратором',
  'с кураторами',
  'с ментором',
  'с менторами',
];

const CURATOR_PATTERN = titlePattern(CURATOR_ALIASES);

export function hasCurator(title: string): boolean {
  return CURATOR_PATTERN.test(title);
}
