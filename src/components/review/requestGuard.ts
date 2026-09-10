// Guards against stale-response races: selectCourse -> selectGroup -> start form a
// strictly ordered cascade, so a single shared counter is enough. Each of those three
// actions bumps it before firing its request and captures its own value; when the
// request resolves (success or failure) it only dispatches if the counter still matches,
// i.e. no newer selection has superseded it. Without this, a slow response for a
// selection the teacher has since changed away from can land after a newer one and
// silently overwrite the screen with data for the wrong course/group/quiz -- including
// flipping into 'presenting' with a different group's questions and answers. Do not
// "simplify" this away; the fix is deliberately not disabling the selects while loading.
export interface RequestGuard {
  /** Bump the counter and return the token this call now owns. */
  start: () => number
  /** True if `token` is still the most recently started one, i.e. not superseded. */
  isCurrent: (token: number) => boolean
}

export function createRequestGuard(): RequestGuard {
  let current = 0
  return {
    start: () => ++current,
    isCurrent: (token: number) => token === current,
  }
}
