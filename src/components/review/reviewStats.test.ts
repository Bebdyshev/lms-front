import { describe, expect, it } from 'vitest'
import {
  accuracyBand,
  blankGapText,
  buildClassSummary,
  buildQuestionStats,
  isBlankAnswer,
  isCorrectOption,
  parseAnswerBlob,
  replayAnswer,
  reviewQuestions,
  splitPipeAnswers,
  type ReviewAttempt,
} from './reviewStats'

const single = {
  id: 'q1',
  question_type: 'single_choice',
  question_text: 'Pick B',
  correct_answer: 1,
  options: [{ text: 'alpha' }, { text: 'beta' }, { text: 'gamma' }],
}

const multi = {
  id: 'q2',
  question_type: 'multiple_choice',
  question_text: 'Pick A and C',
  correct_answer: [0, 2],
  options: [{ text: 'alpha' }, { text: 'beta' }, { text: 'gamma' }],
}

const short = { id: 'q3', question_type: 'short_answer', correct_answer: 'cat' }

const gaps = {
  id: 'q4',
  question_type: 'fill_blank',
  content_text: 'A [[cat*,dog]] and a [[hat*,bat]]',
}

const essay = { id: 'q5', question_type: 'long_text' }

const matching = {
  id: 'q6',
  question_type: 'matching',
  question_text: 'Match the pairs',
  matching_pairs: [
    { left: 'cat', right: 'meow' },
    { left: 'dog', right: 'woof' },
  ],
}

const names = new Map([[1, 'Abenov'], [2, 'Borisov'], [3, 'Vlasov']])

function attempt(studentId: number, answers: unknown): ReviewAttempt {
  return {
    student_id: studentId,
    attempt_id: studentId * 10,
    correct_answers: 0,
    total_questions: 0,
    score_percentage: 0,
    time_spent_seconds: 60,
    completed_at: '2026-09-01T10:00:00Z',
    answers: JSON.stringify(answers),
  }
}

describe('parseAnswerBlob', () => {
  it('reads the stored entry-array form', () => {
    const map = parseAnswerBlob('[["q1", 2], ["q3", "cat"]]')
    expect(map.get('q1')).toBe(2)
    expect(map.get('q3')).toBe('cat')
  })

  it('returns an empty map for null, empty and malformed blobs', () => {
    expect(parseAnswerBlob(null).size).toBe(0)
    expect(parseAnswerBlob('').size).toBe(0)
    expect(parseAnswerBlob('{oops').size).toBe(0)
  })
})

describe('isBlankAnswer', () => {
  it('treats a deselected single choice (-1) as unanswered, not as a wrong option', () => {
    expect(isBlankAnswer(single, -1)).toBe(true)
  })

  it('treats missing, empty string and empty array as unanswered', () => {
    expect(isBlankAnswer(single, undefined)).toBe(true)
    expect(isBlankAnswer(short, '')).toBe(true)
    expect(isBlankAnswer(multi, [])).toBe(true)
  })

  it('treats all-empty gap arrays as unanswered', () => {
    expect(isBlankAnswer(gaps, ['', '  '])).toBe(true)
    expect(isBlankAnswer(gaps, ['cat', ''])).toBe(false)
  })

  it('treats index 0 as a real answer', () => {
    expect(isBlankAnswer(single, 0)).toBe(false)
  })
})

describe('replayAnswer', () => {
  it('routes gap arrays to gapAnswer', () => {
    expect(replayAnswer(gaps, ['cat', 'hat'])).toEqual({
      answer: undefined,
      gapAnswer: ['cat', 'hat'],
    })
  })

  it('rehydrates a serialised Map for matching questions', () => {
    const raw = { __type: 'Map', data: [[0, 0], [1, 2]] }
    const { answer } = replayAnswer({ id: 'q6', question_type: 'matching' }, raw)
    expect(answer).toBeInstanceOf(Map)
    expect((answer as Map<number, number>).get(1)).toBe(2)
  })

  it('passes choice values straight through', () => {
    expect(replayAnswer(single, 2)).toEqual({ answer: 2, gapAnswer: undefined })
  })
})

describe('reviewQuestions', () => {
  it('drops image_content blocks', () => {
    const content = {
      questions: [single, { id: 'x', question_type: 'image_content' }, short],
    }
    expect(reviewQuestions(content).map((q) => q.id)).toEqual(['q1', 'q3'])
  })

  it('survives missing content', () => {
    expect(reviewQuestions(null)).toEqual([])
    expect(reviewQuestions({})).toEqual([])
  })
})

describe('buildQuestionStats — single choice', () => {
  const attempts = [
    attempt(1, [['q1', 1]]),   // correct
    attempt(2, [['q1', 2]]),   // wrong
    attempt(3, [['q1', -1]]),  // deselected -> unanswered
  ]
  const [stat] = buildQuestionStats([single], attempts, names)

  it('counts answered, unanswered, correct and incorrect', () => {
    expect(stat.participants).toBe(3)
    expect(stat.answered).toBe(2)
    expect(stat.unanswered).toBe(1)
    expect(stat.correct).toBe(1)
    expect(stat.incorrect).toBe(1)
  })

  it('takes percentCorrect over answered, not over participants', () => {
    expect(stat.percentCorrect).toBe(50)
  })

  it('builds a bar per option, lettered, with the key flagged', () => {
    expect(stat.distributionKind).toBe('choice')
    expect(stat.options.map((o) => o.label)).toEqual(['A', 'B', 'C'])
    expect(stat.options.map((o) => o.count)).toEqual([0, 1, 1])
    expect(stat.options[1].isCorrect).toBe(true)
    expect(stat.options[2].isCorrect).toBe(false)
    expect(stat.options[1].percent).toBe(50)
  })

  it('names who is in each bucket', () => {
    expect(stat.names.correct).toEqual(['Abenov'])
    expect(stat.names.incorrect).toEqual(['Borisov'])
    expect(stat.names.unanswered).toEqual(['Vlasov'])
    expect(stat.options[1].names).toEqual(['Abenov'])
  })
})

describe('buildQuestionStats — multiple choice', () => {
  it('counts every option a student picked', () => {
    const attempts = [
      attempt(1, [['q2', [0, 2]]]),  // exactly right
      attempt(2, [['q2', [0]]]),     // partial pick, graded incorrect
    ]
    const [stat] = buildQuestionStats([multi], attempts, names)
    expect(stat.options.map((o) => o.count)).toEqual([2, 0, 1])
    expect(stat.correct).toBe(1)
    expect(stat.incorrect).toBe(1)
  })
})

describe('buildQuestionStats — text answers', () => {
  it('groups case- and space-insensitively but shows the text as typed', () => {
    const attempts = [
      attempt(1, [['q3', 'Cat']]),
      attempt(2, [['q3', ' cat ']]),
      attempt(3, [['q3', 'dog']]),
    ]
    const [stat] = buildQuestionStats([short], attempts, names)
    expect(stat.distributionKind).toBe('text')
    expect(stat.options[0].text).toBe('Cat')
    expect(stat.options[0].count).toBe(2)
    expect(stat.options[0].isCorrect).toBe(true)
    expect(stat.options[0].names).toEqual(['Abenov', 'Borisov'])
    expect(stat.options[1].text).toBe('dog')
    expect(stat.options[1].count).toBe(1)
  })

  it('joins gap answers into one readable row', () => {
    const attempts = [attempt(1, [['q4', ['cat', 'hat']]])]
    const [stat] = buildQuestionStats([gaps], attempts, names)
    expect(stat.options[0].text).toBe('cat / hat')
    expect(stat.correct).toBe(1)
  })

  it('counts a half-right gap answer as partial', () => {
    const attempts = [attempt(1, [['q4', ['cat', 'bat']]])]
    const [stat] = buildQuestionStats([gaps], attempts, names)
    expect(stat.partial).toBe(1)
    expect(stat.correct).toBe(0)
    expect(stat.names.partial).toEqual(['Abenov'])
  })
})

describe('buildQuestionStats — matching', () => {
  const fullyCorrect = { __type: 'Map', data: [[0, 0], [1, 1]] }
  const halfCorrect = { __type: 'Map', data: [[0, 0], [1, 2]] }
  const empty = { __type: 'Map', data: [] }

  const attempts = [
    attempt(1, [['q6', fullyCorrect]]),
    attempt(2, [['q6', halfCorrect]]),
    attempt(3, [['q6', empty]]),
  ]
  const [stat] = buildQuestionStats([matching], attempts, names)

  it('buckets a fully-correct submission as correct and a partly-right one as partial', () => {
    expect(stat.correct).toBe(1)
    expect(stat.partial).toBe(1)
    expect(stat.names.correct).toEqual(['Abenov'])
    expect(stat.names.partial).toEqual(['Borisov'])
  })

  it('treats an empty matching map as unanswered', () => {
    expect(stat.unanswered).toBe(1)
    expect(stat.names.unanswered).toEqual(['Vlasov'])
  })

  it('has no answer distribution — a correct/partial/incorrect split only', () => {
    expect(stat.distributionKind).toBe('none')
    expect(stat.options).toEqual([])
  })

  it('treats a missing matching answer as unanswered too', () => {
    const [missingStat] = buildQuestionStats([matching], [attempt(4, [])], names)
    expect(missingStat.unanswered).toBe(1)
    expect(missingStat.options).toEqual([])
  })
})

describe('buildQuestionStats — ungradable questions', () => {
  it('marks long_text ungraded and gives it no answer distribution — essays must not be projected verbatim with names attached', () => {
    const attempts = [attempt(1, [['q5', 'Because the sky is blue.']])]
    const [stat] = buildQuestionStats([essay], attempts, names)
    expect(stat.graded).toBe(false)
    expect(stat.percentCorrect).toBeNull()
    expect(stat.distributionKind).toBe('none')
    expect(stat.options).toEqual([])
  })

  it('marks a choice question with no resolvable key ungraded rather than all-wrong', () => {
    const broken = { ...single, correct_answer: null }
    const attempts = [attempt(1, [['q1', 1]])]
    const [stat] = buildQuestionStats([broken], attempts, names)
    expect(stat.graded).toBe(false)
    expect(stat.correct).toBe(0)
    expect(stat.incorrect).toBe(0)
    expect(stat.answered).toBe(1)
  })
})

describe('buildQuestionStats — empty case', () => {
  it('reports no data instead of dividing by zero', () => {
    const [stat] = buildQuestionStats([single], [], names)
    expect(stat.participants).toBe(0)
    expect(stat.answered).toBe(0)
    expect(stat.percentCorrect).toBeNull()
    expect(stat.options.every((o) => o.count === 0 && o.percent === 0)).toBe(true)
  })
})

describe('buildClassSummary', () => {
  const questions = [single, multi]
  const attempts = [
    attempt(1, [['q1', 1], ['q2', [0, 2]]]),   // 2/2
    attempt(2, [['q1', 1], ['q2', [1]]]),      // 1/2
    attempt(3, [['q1', 0], ['q2', [1]]]),      // 0/2
  ]
  const stats = buildQuestionStats(questions, attempts, names)
  const summary = buildClassSummary(stats, questions, attempts, names, [
    { student_id: 4, full_name: 'Gagarin' },
  ])

  it('scores each student over the graded questions', () => {
    expect(summary.participants).toBe(3)
    expect(summary.top[0]).toMatchObject({ fullName: 'Abenov', correct: 2, percent: 100 })
    expect(summary.bottom[0]).toMatchObject({ fullName: 'Vlasov', correct: 0, percent: 0 })
  })

  it('reports average, median, min and max', () => {
    expect(summary.averagePercent).toBe(50)
    expect(summary.medianPercent).toBe(50)
    expect(summary.minPercent).toBe(0)
    expect(summary.maxPercent).toBe(100)
  })

  it('averages the attempt time', () => {
    expect(summary.averageTimeSeconds).toBe(60)
  })

  it('always returns five score buckets that sum to the participants', () => {
    expect(summary.distribution).toHaveLength(5)
    expect(summary.distribution.map((b) => b.label)).toEqual([
      '0–19%', '20–39%', '40–59%', '60–79%', '80–100%',
    ])
    expect(summary.distribution.reduce((n, b) => n + b.count, 0)).toBe(3)
  })

  it('ranks the hardest questions first', () => {
    expect(summary.hardest[0].questionId).toBe('q2')
    expect(summary.hardest[0].percentCorrect).toBeLessThan(
      summary.hardest[1].percentCorrect,
    )
  })

  it('passes the not-submitted list through', () => {
    expect(summary.notSubmitted.map((s) => s.full_name)).toEqual(['Gagarin'])
  })

  it('averages differing times rather than echoing a shared constant', () => {
    const asymmetric = [
      { ...attempts[0], time_spent_seconds: 10 },
      { ...attempts[1], time_spent_seconds: 20 },
      { ...attempts[2], time_spent_seconds: 90 },
    ]
    const asymmetricSummary = buildClassSummary(stats, questions, asymmetric, names, [])
    // Mean = 40; times[0] = 10, min = 10, max = 90 — a broken "average" landing on any
    // of those (or on the shared attempt() default of 60) would fail this.
    expect(asymmetricSummary.averageTimeSeconds).toBe(40)
  })

  it('excludes a null time_spent_seconds from the average instead of coercing it to 0', () => {
    const withNull = [
      { ...attempts[0], time_spent_seconds: 100 },
      { ...attempts[1], time_spent_seconds: null },
      { ...attempts[2], time_spent_seconds: 20 },
    ]
    const summaryWithNull = buildClassSummary(stats, questions, withNull, names, [])
    // Correct: mean of [100, 20] = 60. A null-coerced-to-0 average would give (100+0+20)/3 = 40.
    expect(summaryWithNull.averageTimeSeconds).toBe(60)
  })
})

describe('buildClassSummary — score distribution buckets a gap percentage', () => {
  it('counts a 79.3% score in the 60–79% bucket, not nowhere', () => {
    // 29 gradable short-answer questions, 23 answered correctly: 23/29 = 79.3103...%,
    // which round1's to 79.3 — a value the old `>= min && <= max` comparison put in
    // neither the 60–79 nor the 80–100 bucket.
    const total = 29
    const correctCount = 23
    const gapQuestions = Array.from({ length: total }, (_, i) => ({
      id: `gq${i}`,
      question_type: 'short_answer',
      correct_answer: 'yes',
    }))
    const answers = gapQuestions.map((q, i) => [q.id, i < correctCount ? 'yes' : 'no'])
    const gapAttempts = [attempt(1, answers)]
    const gapStats = buildQuestionStats(gapQuestions, gapAttempts, names)
    const gapSummary = buildClassSummary(gapStats, gapQuestions, gapAttempts, names, [])

    expect(gapSummary.top[0].percent).toBeCloseTo(79.3, 5)
    expect(gapSummary.distribution.reduce((n, b) => n + b.count, 0)).toBe(
      gapSummary.participants,
    )
    const bucket = gapSummary.distribution.find((b) => b.label === '60–79%')
    expect(bucket?.count).toBe(1)
  })
})

describe('buildClassSummary — empty case', () => {
  it('nulls the averages rather than dividing by zero', () => {
    const stats = buildQuestionStats([single], [], names)
    const summary = buildClassSummary(stats, [single], [], names, [])
    expect(summary.participants).toBe(0)
    expect(summary.averagePercent).toBeNull()
    expect(summary.medianPercent).toBeNull()
    expect(summary.averageTimeSeconds).toBeNull()
    expect(summary.top).toEqual([])
    expect(summary.distribution).toHaveLength(5)
  })
})

describe('accuracyBand', () => {
  it('maps percentCorrect onto the grid colours', () => {
    const at = (percentCorrect: number | null, answered = 3) =>
      ({ percentCorrect, answered } as any)
    expect(accuracyBand(at(null, 0))).toBe('none')
    expect(accuracyBand(undefined)).toBe('none')
    expect(accuracyBand(at(0))).toBe('low')
    expect(accuracyBand(at(49.9))).toBe('low')
    expect(accuracyBand(at(50))).toBe('medium')
    expect(accuracyBand(at(79.9))).toBe('medium')
    expect(accuracyBand(at(80))).toBe('high')
    expect(accuracyBand(at(100))).toBe('high')
  })
})

describe('blankGapText', () => {
  it('replaces every [[…]] gap token with a blank placeholder, never the marked answer', () => {
    expect(blankGapText('A [[cat*,dog]] and a [[hat*,bat]]')).toBe('A ____ and a ____')
  })

  it('leaves ordinary text untouched', () => {
    expect(blankGapText('No gaps here')).toBe('No gaps here')
  })
})

describe('buildQuestionStats — gap question text falls back to the blanked source, never the answer key', () => {
  it('never leaks the [[…*…]] gap syntax into questionText', () => {
    const [stat] = buildQuestionStats([gaps], [], names)
    expect(stat.questionText).toBe('A ____ and a ____')
    expect(stat.questionText).not.toContain('*')
    expect(stat.questionText).not.toContain('[[')
  })
})

describe('splitPipeAnswers', () => {
  it('splits a pipe-delimited correct_answer into a readable, trimmed list', () => {
    expect(splitPipeAnswers({ correct_answer: 'paris | Paris|the capital ' })).toEqual([
      'paris', 'Paris', 'the capital',
    ])
  })

  it('returns an empty list when there is nothing to split', () => {
    expect(splitPipeAnswers({ correct_answer: null })).toEqual([])
    expect(splitPipeAnswers({})).toEqual([])
  })
})

describe('isCorrectOption', () => {
  it('agrees with gradeQuestion for single_choice, including its strict equality', () => {
    expect(isCorrectOption(single, 1)).toBe(true)
    expect(isCorrectOption(single, 2)).toBe(false)
  })

  it('does not disagree with gradeQuestion when correct_answer is authored as a numeric string', () => {
    // gradeQuestion's fallback path is a strict `===`, so a stored option index (a number)
    // never matches a correct_answer authored as the string "1" -- every student is graded
    // incorrect. The old coercing `Number(key) === index` would paint option B green here,
    // contradicting the score the whole class actually received.
    const stringKeyed = { ...single, correct_answer: '1' }
    expect(isCorrectOption(stringKeyed, 1)).toBe(false)
  })

  it('agrees with gradeQuestion for multiple_choice by reusing its own membership test', () => {
    expect(isCorrectOption(multi, 0)).toBe(true)
    expect(isCorrectOption(multi, 1)).toBe(false)
    expect(isCorrectOption(multi, 2)).toBe(true)
  })
})

describe('buildClassSummary — partial credit on multi-gap questions (I6)', () => {
  it('credits a half-right gap answer with partial credit, matching the score the student saw on submission', () => {
    const questions = [gaps]
    const attempts = [attempt(1, [['q4', ['cat', 'bat']]])] // 1 of 2 gaps correct
    const stats = buildQuestionStats(questions, attempts, names)
    const summary = buildClassSummary(stats, questions, attempts, names, [])
    // An all-or-nothing scoring (gradeQuestion(...).isCorrect per question) would count
    // this as 0/1 = 0%. Scored gap-by-gap, like the student's own result screen, it is
    // 1/2 = 50%.
    expect(summary.top[0]).toMatchObject({ correct: 1, total: 2, percent: 50 })
  })

  it('still scores non-gap questions all-or-nothing, one part per question', () => {
    const questions = [single, multi]
    const attempts = [
      attempt(1, [['q1', 1], ['q2', [0, 2]]]),
      attempt(2, [['q1', 1], ['q2', [1]]]),
    ]
    const stats = buildQuestionStats(questions, attempts, names)
    const summary = buildClassSummary(stats, questions, attempts, names, [])
    expect(summary.top[0]).toMatchObject({ correct: 2, total: 2, percent: 100 })
  })
})
