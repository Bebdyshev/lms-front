import { describe, expect, it } from 'vitest'
import {
  buildQuestionStats,
  isBlankAnswer,
  parseAnswerBlob,
  replayAnswer,
  reviewQuestions,
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
  it('marks long_text ungraded and still lists what was written', () => {
    const attempts = [attempt(1, [['q5', 'Because the sky is blue.']])]
    const [stat] = buildQuestionStats([essay], attempts, names)
    expect(stat.graded).toBe(false)
    expect(stat.percentCorrect).toBeNull()
    expect(stat.options[0].text).toBe('Because the sky is blue.')
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
