// gapStepHtml decides exactly what the class sees for a stepped-through cloze passage — the
// boundary C1 and C2 both broke. It had no direct tests before this file (all 15 prior tests
// in this package are aggregation tests over reviewStats.ts); every assertion here is written
// against the *rendered* span sequence, in source order, so a future regression at this
// boundary fails a test instead of shipping to a projector.
import { describe, expect, it } from 'vitest'
import { gapStepHtml } from './ReviewQuestionView'

// Three real, single-line gaps: no newline caveat here — this fixture is for the plain
// stepping behaviour. See `newlinePassage` below for the C2 misalignment case.
const passage = 'The [[cat*,dog]] sat on the [[mat*,rug]] near the [[door*,window]]'
const expected = ['cat', 'mat', 'door']

// One `<span ...>text</span>` per matched token, in document order — lets a test assert on
// exactly what prints for each gap position without caring about the surrounding markup or
// which CSS class was used for which state (that's ReviewQuestionView's concern, not this
// function's contract).
function spanTexts(html: string): string[] {
  return [...html.matchAll(/<span class="[^"]*">([^<]*)<\/span>/g)].map((m) => m[1])
}

describe('gapStepHtml', () => {
  it('blanks every later gap regardless of what has already been revealed', () => {
    // gapIndex=1, revealed=false: gap 2 (index 1) is current-but-unrevealed, gap 3 (index 2)
    // hasn't been reached yet. Neither may print 'mat' or 'door'.
    const html = gapStepHtml(passage, 1, expected, false)
    expect(spanTexts(html)).toEqual(['cat', '____', '____'])
    expect(html).not.toContain('mat')
    expect(html).not.toContain('door')
  })

  it('shows nothing for the current gap until revealed, then shows only that gap', () => {
    const unrevealed = gapStepHtml(passage, 1, expected, false)
    expect(spanTexts(unrevealed)[1]).toBe('____')

    const revealedHtml = gapStepHtml(passage, 1, expected, true)
    expect(spanTexts(revealedHtml)).toEqual(['cat', 'mat', '____'])
    // Revealing gap 2 must not also reveal gap 3 (C1's failure mode, one gap over).
    expect(revealedHtml).not.toContain('door')
  })

  it('a passed gap prints its own answer, never a neighbour\'s', () => {
    // gapIndex=2: gaps 0 and 1 are both "passed". Each of their FILLED spans must carry its
    // own expected[] value, in the same order as the source tokens — not shifted by one.
    const html = gapStepHtml(passage, 2, expected, false)
    expect(spanTexts(html)).toEqual(['cat', 'mat', '____'])
  })

  it('reveals only the current gap even as the teacher steps through every position', () => {
    for (let i = 0; i < expected.length; i += 1) {
      const html = gapStepHtml(passage, i, expected, true)
      const spans = spanTexts(html)
      // Every position up to and including the current one is visible...
      expect(spans.slice(0, i + 1)).toEqual(expected.slice(0, i + 1))
      // ...and every position after it is still blank, even though this call passed
      // revealed=true — "revealed" only ever applies to the one gap under gapIndex.
      expect(spans.slice(i + 1).every((s) => s === '____')).toBe(true)
    }
  })

  // C2 repro: a gap token whose contents span a newline. GAP_TOKEN_SOURCE (broad, used to
  // locate every token so none is left un-blanked) matches it; scoring.ts's getExpectedAnswers
  // (narrow, `.*?` with no `[\s\S]`) does not, so it never gets a slot in `expected`. Before
  // the fix, gapStepHtml counted it as a numbered gap anyway, shifting every later index out
  // of alignment with `expected[]` — the class could read a still-unrevealed gap's answer off
  // an already-"passed" slot. See reviewStats.ts's GAP_TOKEN_SOURCE doc comment for the fuller
  // story of why the two patterns are allowed to disagree at all.
  //
  // Broad tokens found here: 3 ('cat*,\ndog', 'mat*,carpet', 'door*,gate'). Narrow tokens: 2
  // ('mat*,carpet', 'door*,gate') — the first, newline-containing token is invisible to the
  // narrow pattern, exactly like scoring.ts resolves it, so `expected` below is what
  // getExpectedAnswers would actually produce for this source text.
  const newlinePassage = '[[cat*,\ndog]] on the [[mat*,carpet]] and [[door*,gate]].'
  const newlineExpected = ['mat', 'door']

  it('C2: a newline-spanning token is blanked but never assigned a gap slot', () => {
    const html = gapStepHtml(newlinePassage, 1, newlineExpected, false)
    // Position 0 is the broken token: blanked, but NOT counted as a gap, so it must never
    // print an expected[] value at all -- filled or otherwise.
    // Position 1 is the real gap 0 ('mat*,carpet'); gapIndex=1 means it has been passed.
    // Position 2 is the real gap 1 ('door*,gate'); gapIndex=1 means it is CURRENT, unrevealed.
    expect(spanTexts(html)).toEqual(['____', 'mat', '____'])
  })

  it('C2: no expected string leaks for any unrevealed index, at any gapIndex', () => {
    // Full expected span sequence at each gapIndex, unrevealed. Position 0 is always the
    // broken broad-only token (never a numbered gap, so never filled); positions 1 and 2 are
    // the two real (narrow-matched) gaps, indexed 0 and 1 respectively -- NOT 1 and 2, which
    // is exactly the off-by-one C2 exploited.
    const table: Record<number, string[]> = {
      0: ['____', '____', '____'],
      1: ['____', 'mat', '____'],
    }
    for (let i = 0; i < newlineExpected.length; i += 1) {
      const html = gapStepHtml(newlinePassage, i, newlineExpected, false)
      expect(spanTexts(html)).toEqual(table[i])
      // Belt and suspenders: the current gap's answer, and every later gap's, must never
      // appear in the HTML at all while unrevealed -- only an already-passed gap's own
      // answer (index < i) is allowed to print.
      for (let g = i; g < newlineExpected.length; g += 1) {
        expect(html).not.toContain(newlineExpected[g])
      }
    }
  })

  it('never leaves a raw [[...]] token unblanked, revealed or not', () => {
    for (const [text, exp] of [[passage, expected] as const, [newlinePassage, newlineExpected] as const]) {
      for (const revealed of [true, false]) {
        for (let i = 0; i < exp.length; i += 1) {
          expect(gapStepHtml(text, i, exp, revealed)).not.toMatch(/\[\[|\]\]/)
        }
      }
    }
  })
})
