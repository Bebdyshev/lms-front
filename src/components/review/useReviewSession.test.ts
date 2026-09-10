// The reducer's reveal-adjacent resets are the other half of the reveal boundary (see
// ReviewQuestionView.test.ts for gapStepHtml): moving anywhere -- a new question, a new gap --
// must never leave a previous answer on screen, and a no-op move (already at the first/last
// gap) must never erase the answer already on screen either (#4). Tested directly against the
// reducer, no rendering needed -- it's a pure function of (state, action).
//
// Imported from reviewSessionReducer.ts, not useReviewSession.ts: the latter also pulls in
// apiClient (services/api/client.ts constructs a TokenManager at import time that touches
// `localStorage`), which doesn't exist in this project's node-environment test runner and
// isn't needed to exercise a pure reducer anyway.
import { describe, expect, it } from 'vitest'
import { initialState, reducer, type Action, type ReviewSessionState } from './reviewSessionReducer'

// Three real gaps, same shape getExpectedAnswers (scoring.ts) parses for any fill_blank —
// the reducer's 'gapIndex' case calls that directly to know how many gaps there are.
const threeGapQuestion = {
  id: 'q1',
  question_type: 'fill_blank',
  content_text: 'The [[cat*,dog]] sat on the [[mat*,rug]] near the [[door*,window]]',
}
const otherQuestion = { id: 'q2', question_type: 'short_answer', correct_answer: 'x' }

function stateWith(overrides: Partial<ReviewSessionState>): ReviewSessionState {
  return {
    ...initialState,
    phase: 'presenting',
    questions: [threeGapQuestion, otherQuestion],
    ...overrides,
  }
}

describe('useReviewSession reducer', () => {
  it('resets gapIndex to 0 and revealed to false on a question change', () => {
    const state = stateWith({ index: 0, gapIndex: 2, revealed: true })
    const next = reducer(state, { type: 'index', index: 1 } as Action)
    expect(next.index).toBe(1)
    expect(next.gapIndex).toBe(0)
    expect(next.revealed).toBe(false)
  })

  it('resets revealed to false on an actual gap change', () => {
    const state = stateWith({ index: 0, gapIndex: 0, revealed: true })
    const next = reducer(state, { type: 'gapIndex', gapIndex: 1 } as Action)
    expect(next.gapIndex).toBe(1)
    expect(next.revealed).toBe(false)
  })

  // #4: clampIndex leaves gapIndex unchanged when the move goes past either end (prev at gap
  // 1, or next at the last gap). The buttons disable at the ends, but the `[`/`]` keyboard
  // shortcuts in ReviewPresenter are not gated the same way, so this no-op case is reachable
  // in the running app, not just a theoretical clamp.
  it('is a true no-op at the lower bound: revealed and gapIndex are untouched', () => {
    const state = stateWith({ index: 0, gapIndex: 0, revealed: true })
    const next = reducer(state, { type: 'gapIndex', gapIndex: -1 } as Action)
    expect(next).toBe(state) // same reference: the reducer bailed out before spreading
    expect(next.gapIndex).toBe(0)
    expect(next.revealed).toBe(true)
  })

  it('is a true no-op at the upper bound: revealed and gapIndex are untouched', () => {
    // threeGapQuestion has gaps at index 0, 1, 2 -- 2 is the last.
    const state = stateWith({ index: 0, gapIndex: 2, revealed: true })
    const next = reducer(state, { type: 'gapIndex', gapIndex: 5 } as Action)
    expect(next).toBe(state)
    expect(next.gapIndex).toBe(2)
    expect(next.revealed).toBe(true)
  })

  it('a real move at the boundary still resets revealed (sanity check on the guard)', () => {
    // Moving from gap 1 to gap 2 (still in range, not a no-op) must still reset revealed --
    // the #4 guard must only skip the reset when the index truly did not change.
    const state = stateWith({ index: 0, gapIndex: 1, revealed: true })
    const next = reducer(state, { type: 'gapIndex', gapIndex: 2 } as Action)
    expect(next.gapIndex).toBe(2)
    expect(next.revealed).toBe(false)
  })
})
