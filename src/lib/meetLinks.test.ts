import { describe, expect, it } from 'vitest';
import { meetJoinUrl } from './meetLinks';

const MEET = 'https://meet.google.com/nee-tsrk-vap';

describe('meetJoinUrl', () => {
  it('points the link at the work account', () => {
    const url = new URL(meetJoinUrl(MEET, 'gulzada@mastereducation.kz'));
    expect(url.hostname).toBe('meet.google.com');
    expect(url.pathname).toBe('/nee-tsrk-vap');
    expect(url.searchParams.get('authuser')).toBe('gulzada@mastereducation.kz');
  });

  it('leaves the link untouched for someone without a work account', () => {
    // Students: no Workspace account, nothing to select.
    expect(meetJoinUrl(MEET, null)).toBe(MEET);
    expect(meetJoinUrl(MEET, undefined)).toBe(MEET);
    expect(meetJoinUrl(MEET, '   ')).toBe(MEET);
  });

  it('never rewrites links that are not Google Meet', () => {
    // Weekly tests link to the exam platforms; other events may use Zoom.
    const platform = 'https://sat.mastereducation.kz/sets/12';
    expect(meetJoinUrl(platform, 'gulzada@mastereducation.kz')).toBe(platform);
    const lookalike = 'https://meet.google.com.evil.example/abc';
    expect(meetJoinUrl(lookalike, 'gulzada@mastereducation.kz')).toBe(lookalike);
  });

  it('replaces an existing authuser instead of adding a second one', () => {
    // A link pasted from someone's browser may already carry their account index.
    const url = new URL(meetJoinUrl(`${MEET}?authuser=0`, 'gulzada@mastereducation.kz'));
    expect(url.searchParams.getAll('authuser')).toEqual(['gulzada@mastereducation.kz']);
  });

  it('keeps any other query parameters', () => {
    const url = new URL(meetJoinUrl(`${MEET}?hs=122`, 'gulzada@mastereducation.kz'));
    expect(url.searchParams.get('hs')).toBe('122');
  });

  it('normalises the address', () => {
    const url = new URL(meetJoinUrl(MEET, '  Gulzada@MasterEducation.kz '));
    expect(url.searchParams.get('authuser')).toBe('gulzada@mastereducation.kz');
  });

  it('survives junk input without throwing', () => {
    expect(meetJoinUrl('', 'gulzada@mastereducation.kz')).toBe('');
    expect(meetJoinUrl(null, 'gulzada@mastereducation.kz')).toBe('');
    expect(meetJoinUrl('not a url', 'gulzada@mastereducation.kz')).toBe('not a url');
  });
});
