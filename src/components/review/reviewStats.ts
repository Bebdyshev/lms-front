// Review mode's aggregation layer: raw stored answers in, per-question statistics out.
//
// Correctness is decided ONLY by gradeQuestion — the same function that produced each
// student's own score when they took the quiz. Anything else here (bucketing, option
// counting, name lists) is presentation over that verdict.
import {
  gradeQuestion,
  getAnswerKey,
  getExpectedAnswers,
} from '../lesson/quiz/scoring'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

export interface ReviewAttempt {
  student_id: number
  attempt_id: number
  correct_answers: number
  total_questions: number
  score_percentage: number
  time_spent_seconds: number | null
  completed_at: string | null
  answers: string | null
}

export type AnswerBucket = 'correct' | 'partial' | 'incorrect' | 'unanswered'

export interface OptionStat {
  /** Stable identity: the option index for choice questions, the normalised text otherwise. */
  key: string
  /** 'A'..'F' for choice questions, '' for free text. */
  label: string
  /** What to print — the option's text, or the answer exactly as a student typed it. */
  text: string
  count: number
  /** Share of answered, 1 dp. */
  percent: number
  isCorrect: boolean
  names: string[]
}

export interface QuestionStat {
  questionId: string
  index: number
  questionType: string
  questionText: string
  participants: number
  answered: number
  unanswered: number
  correct: number
  partial: number
  incorrect: number
  /** Share of answered that were fully correct; null when nothing was answered or the question is ungraded. */
  percentCorrect: number | null
  /** False when the question has no resolvable answer key — show the spread, claim no verdict. */
  graded: boolean
  /**
   * 'choice' bars per option, 'text' rows of what students typed, or 'none' when the
   * question has no meaningful answer distribution to show — matching questions only
   * get a correct/partial/incorrect split (per the review-mode spec), since their raw
   * stored value is a set of left→right index pairs, not a single printable answer.
   */
  distributionKind: 'choice' | 'text' | 'none'
  options: OptionStat[]
  names: Record<AnswerBucket, string[]>
}

const CHOICE_TYPES = new Set(['single_choice', 'multiple_choice', 'media_question'])

const round1 = (value: number): number => Math.round(value * 10) / 10

const normalizeText = (value: unknown): string =>
  (value ?? '').toString().trim().toLowerCase()

/** Turn `{__type:'Map', data:[...]}` back into a real Map (see deserializeQuizAnswers). */
const rehydrate = (raw: unknown): unknown => {
  if (raw && typeof raw === 'object' && (raw as any).__type === 'Map') {
    return new Map((raw as any).data)
  }
  return raw
}

const toMatchingMap = (raw: unknown): Map<unknown, unknown> => {
  const value = rehydrate(raw)
  if (value instanceof Map) return value
  if (value && typeof value === 'object') return new Map(Object.entries(value as object))
  return new Map()
}

/** The stored blob is `[[questionId, value], …]` — both answer maps merged. */
export function parseAnswerBlob(json: string | null | undefined): Map<string, unknown> {
  if (!json) return new Map()
  try {
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) return new Map(parsed as [string, unknown][])
    if (parsed && typeof parsed === 'object') return new Map(Object.entries(parsed))
    return new Map()
  } catch {
    return new Map()
  }
}

const isGapType = (type: string): boolean =>
  type === 'fill_blank' || type === 'text_completion'

/**
 * "No answer" is its own bucket, never a wrong option. -1 is a single choice the
 * student deselected; it means they left the question blank.
 */
export function isBlankAnswer(question: any, raw: unknown): boolean {
  const type = question?.question_type
  if (raw === undefined || raw === null) return true
  if (isGapType(type)) {
    const arr = Array.isArray(raw) ? raw : []
    return arr.length === 0 || arr.every((v) => (v ?? '').toString().trim() === '')
  }
  if (type === 'matching') return toMatchingMap(raw).size === 0
  if (Array.isArray(raw)) return raw.length === 0
  if (typeof raw === 'number') return raw < 0
  return raw.toString().trim() === ''
}

/** Split a stored value into gradeQuestion's (answer, gapAnswer) pair. */
export function replayAnswer(
  question: any,
  raw: unknown,
): { answer: unknown; gapAnswer: string[] | undefined } {
  const type = question?.question_type
  if (isGapType(type)) {
    const arr = Array.isArray(raw) ? raw.map((v) => (v ?? '').toString()) : []
    return { answer: undefined, gapAnswer: arr }
  }
  return { answer: rehydrate(raw), gapAnswer: undefined }
}

/** The questions worth reviewing — image_content blocks are layout, not questions. */
export function reviewQuestions(content: any): any[] {
  const questions = content?.questions
  if (!Array.isArray(questions)) return []
  return questions.filter(
    (q: any) => q && typeof q === 'object' && q.question_type !== 'image_content',
  )
}

/** Does this question have a usable answer key? If not we show the spread, not a verdict. */
function isGradable(question: any): boolean {
  const type = question?.question_type
  if (type === 'long_text') return false
  if (type === 'matching') {
    return Array.isArray(question.matching_pairs) && question.matching_pairs.length > 0
  }
  return getExpectedAnswers(question).length > 0
}

function isCorrectOption(question: any, index: number): boolean {
  const key = question?.correct_answer
  if (Array.isArray(key)) return key.map(Number).includes(index)
  return Number(key) === index
}

/** The printable form of a stored answer: gap arrays read best joined. */
function answerText(question: any, raw: unknown): string {
  if (isGapType(question?.question_type) && Array.isArray(raw)) {
    return raw.map((v) => (v ?? '').toString().trim()).join(' / ')
  }
  if (Array.isArray(raw)) return raw.join(', ')
  return (raw ?? '').toString().trim()
}

export function buildQuestionStats(
  questions: any[],
  attempts: ReviewAttempt[],
  nameById: Map<number, string>,
): QuestionStat[] {
  const parsed = attempts.map((a) => ({
    studentId: a.student_id,
    name: nameById.get(a.student_id) ?? `#${a.student_id}`,
    values: parseAnswerBlob(a.answers),
  }))

  return questions.map((question, index) => {
    const key = getAnswerKey(question)
    const type = question?.question_type ?? 'unknown'
    const graded = isGradable(question)
    const isChoice = CHOICE_TYPES.has(type) && Array.isArray(question?.options)
    const isMatching = type === 'matching'

    const names: Record<AnswerBucket, string[]> = {
      correct: [], partial: [], incorrect: [], unanswered: [],
    }

    // Choice questions keep a fixed bar per option; free text accumulates as it appears.
    const choiceCounts: { count: number; names: string[] }[] = isChoice
      ? question.options.map(() => ({ count: 0, names: [] as string[] }))
      : []
    const textRows = new Map<string, { text: string; count: number; names: string[]; isCorrect: boolean }>()

    let answered = 0
    let correct = 0
    let partial = 0
    let incorrect = 0

    for (const entry of parsed) {
      const raw = entry.values.get(key)

      if (isBlankAnswer(question, raw)) {
        names.unanswered.push(entry.name)
        continue
      }
      answered += 1

      if (graded) {
        const { answer, gapAnswer } = replayAnswer(question, raw)
        const result = gradeQuestion(question, answer, gapAnswer)
        if (result.isCorrect) {
          correct += 1
          names.correct.push(entry.name)
        } else if (result.correctParts > 0) {
          partial += 1
          names.partial.push(entry.name)
        } else {
          incorrect += 1
          names.incorrect.push(entry.name)
        }
      }

      if (isChoice) {
        const picked = Array.isArray(raw) ? raw.map(Number) : [Number(raw)]
        for (const optionIndex of picked) {
          const slot = choiceCounts[optionIndex]
          if (slot) {
            slot.count += 1
            slot.names.push(entry.name)
          }
        }
      } else if (!isMatching) {
        const text = answerText(question, raw)
        const rowKey = normalizeText(text)
        const existing = textRows.get(rowKey)
        if (existing) {
          existing.count += 1
          existing.names.push(entry.name)
        } else {
          const { answer, gapAnswer } = replayAnswer(question, raw)
          textRows.set(rowKey, {
            text,
            count: 1,
            names: [entry.name],
            isCorrect: graded && gradeQuestion(question, answer, gapAnswer).isCorrect,
          })
        }
      }
    }

    const options: OptionStat[] = isChoice
      ? question.options.map((option: any, optionIndex: number) => ({
          key: String(optionIndex),
          label: option?.letter || LETTERS[optionIndex] || String(optionIndex + 1),
          text: (option?.text ?? '').toString(),
          count: choiceCounts[optionIndex].count,
          percent: answered > 0 ? round1((choiceCounts[optionIndex].count / answered) * 100) : 0,
          isCorrect: graded && isCorrectOption(question, optionIndex),
          names: choiceCounts[optionIndex].names,
        }))
      : isMatching
        ? []
        : [...textRows.entries()]
            .map(([rowKey, row]) => ({
              key: rowKey,
              label: '',
              text: row.text,
              count: row.count,
              percent: answered > 0 ? round1((row.count / answered) * 100) : 0,
              isCorrect: row.isCorrect,
              names: row.names,
            }))
            .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text))

    return {
      questionId: key,
      index,
      questionType: type,
      questionText: (question?.question_text ?? question?.content_text ?? '').toString(),
      participants: parsed.length,
      answered,
      unanswered: names.unanswered.length,
      correct,
      partial,
      incorrect,
      percentCorrect: graded && answered > 0 ? round1((correct / answered) * 100) : null,
      graded,
      distributionKind: isChoice ? 'choice' : isMatching ? 'none' : 'text',
      options,
      names,
    }
  })
}
