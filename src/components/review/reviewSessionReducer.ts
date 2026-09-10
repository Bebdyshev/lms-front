// The pure state machine behind useReviewSession, split out on purpose: this file has no
// network, router, or storage imports (not even transitively — see useReviewSession.ts's own
// header comment: it is the ONLY module in review mode that touches the network), so it can
// be unit-tested directly, in plain node, with no jsdom/localStorage shims. useReviewSession.ts
// wires this reducer into a real useReducer() and adds every async action creator around it.
//
// Two invariants worth stating, both learned in a classroom:
//   * `revealed` resets on every question change — the answer must never already be on
//     screen when a new question appears;
//   * the stats / names / grid toggles persist across questions, so the teacher does not
//     press them once per question.
import type {
  ReviewSessionResponse,
  ReviewUnit,
} from '../../services/api/review'
import { getExpectedAnswers } from '../lesson/quiz/scoring'
import {
  buildClassSummary,
  buildQuestionStats,
  reviewQuestions,
  type ClassSummary,
  type QuestionStat,
  type ReviewAttempt,
  type StudentRef,
} from './reviewStats'

export interface CourseOption { id: number; title: string }
export interface GroupOption { id: number; name: string; studentCount: number }

export interface ReviewSessionState {
  phase: 'launcher' | 'presenting' | 'summary'
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null

  courses: CourseOption[]
  groups: GroupOption[]
  units: ReviewUnit[]
  rosterCount: number

  selectedCourseId: number | null
  selectedGroupId: number | null
  selectedLessonId: number | null
  selectedStepId: number | null

  step: ReviewSessionResponse['step'] | null
  questions: any[]
  stats: QuestionStat[]
  statsByQuestionId: Record<string, QuestionStat>
  summary: ClassSummary | null
  roster: StudentRef[]
  attempts: ReviewAttempt[]
  notSubmitted: StudentRef[]

  index: number
  /**
   * Which gap of the current question is under discussion — meaningful only when that
   * question is a gap type (fill_blank / text_completion); 0 and ignored otherwise. Resets
   * to 0 on every question change, exactly like `revealed` does.
   */
  gapIndex: number
  revealed: boolean
  statsVisible: boolean
  namesVisible: boolean
  gridOpen: boolean
}

export const initialState: ReviewSessionState = {
  phase: 'launcher',
  status: 'idle',
  error: null,
  courses: [],
  groups: [],
  units: [],
  rosterCount: 0,
  selectedCourseId: null,
  selectedGroupId: null,
  selectedLessonId: null,
  selectedStepId: null,
  step: null,
  questions: [],
  stats: [],
  statsByQuestionId: {},
  summary: null,
  roster: [],
  attempts: [],
  notSubmitted: [],
  index: 0,
  gapIndex: 0,
  revealed: false,
  statsVisible: true,
  // Opt in, not opt out: the very first frame a class sees must not show who got the
  // question wrong. The teacher can turn names on once they choose to.
  namesVisible: false,
  gridOpen: false,
}

export type Action =
  | { type: 'loading' }
  | { type: 'error'; message: string }
  | { type: 'courses'; courses: CourseOption[] }
  | { type: 'selectCourse'; courseId: number | null }
  | { type: 'groups'; groups: GroupOption[] }
  | { type: 'selectGroup'; groupId: number | null }
  | { type: 'quizzes'; units: ReviewUnit[]; rosterCount: number }
  | { type: 'selectUnit'; lessonId: number | null }
  | { type: 'selectQuiz'; stepId: number | null }
  | { type: 'started'; payload: ReviewSessionResponse }
  | { type: 'index'; index: number }
  | { type: 'gapIndex'; gapIndex: number }
  | { type: 'toggleReveal' }
  | { type: 'toggleStats' }
  | { type: 'toggleNames' }
  | { type: 'toggleGrid' }
  | { type: 'closeGrid' }
  | { type: 'finish' }
  | { type: 'restart' }

function clampIndex(i: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.max(i, 0), total - 1)
}

export function reducer(state: ReviewSessionState, action: Action): ReviewSessionState {
  switch (action.type) {
    case 'loading':
      return { ...state, status: 'loading', error: null }
    case 'error':
      return { ...state, status: 'error', error: action.message }

    case 'courses':
      return { ...state, status: 'ready', error: null, courses: action.courses }
    case 'selectCourse':
      return {
        ...state,
        selectedCourseId: action.courseId,
        selectedGroupId: null,
        selectedLessonId: null,
        selectedStepId: null,
        groups: [],
        units: [],
      }
    case 'groups':
      return { ...state, status: 'ready', error: null, groups: action.groups }
    case 'selectGroup':
      return {
        ...state,
        selectedGroupId: action.groupId,
        selectedLessonId: null,
        selectedStepId: null,
        units: [],
      }
    case 'quizzes':
      return {
        ...state,
        status: 'ready',
        error: null,
        units: action.units,
        rosterCount: action.rosterCount,
      }
    case 'selectUnit':
      return { ...state, selectedLessonId: action.lessonId, selectedStepId: null }
    case 'selectQuiz':
      return { ...state, selectedStepId: action.stepId }

    case 'started': {
      const { step, attempts, roster, not_submitted: notSubmitted } = action.payload
      const questions = reviewQuestions(step.content)
      const nameById = new Map(roster.map((s) => [s.student_id, s.full_name]))
      const stats = buildQuestionStats(questions, attempts, nameById)
      const statsByQuestionId: Record<string, QuestionStat> = {}
      // Keyed by question id, never by index: a question removed from the quiz after the
      // attempts were stored would silently shift every stat if we keyed by position.
      stats.forEach((stat) => { statsByQuestionId[stat.questionId] = stat })
      return {
        ...state,
        status: 'ready',
        error: null,
        phase: 'presenting',
        step,
        questions,
        stats,
        statsByQuestionId,
        summary: buildClassSummary(stats, questions, attempts, nameById, notSubmitted),
        roster,
        attempts,
        notSubmitted,
        index: 0,
        gapIndex: 0,
        revealed: false,
      }
    }

    case 'index':
      return {
        ...state,
        index: clampIndex(action.index, state.questions.length),
        // A new question means a new gap 1, not wherever the previous question's stepper
        // happened to be left — same reset `revealed` already gets on question change.
        gapIndex: 0,
        revealed: false,
      }

    case 'gapIndex': {
      const question = state.questions[state.index]
      const gapCount = question ? getExpectedAnswers(question).length : 0
      const nextGapIndex = clampIndex(action.gapIndex, gapCount)
      // The prev/next buttons disable at the ends, but the `[`/`]` keyboard shortcuts
      // (ReviewPresenter) are not gated the same way — pressing `[` already on gap 1, or `]`
      // already on the last gap, still dispatches this action. clampIndex then returns the
      // same index the teacher was already on, and without this check the fallthrough below
      // would still reset `revealed`, silently erasing the answer the class is looking at for
      // a keypress that didn't actually move anywhere (#4).
      if (nextGapIndex === state.gapIndex) return state
      return {
        ...state,
        gapIndex: nextGapIndex,
        // Moving to another gap must not leave the previous gap's answer on screen —
        // mirrors how moving to another question already resets this.
        revealed: false,
      }
    }

    case 'toggleReveal':
      return { ...state, revealed: !state.revealed }
    case 'toggleStats':
      return { ...state, statsVisible: !state.statsVisible }
    case 'toggleNames':
      return { ...state, namesVisible: !state.namesVisible }
    case 'toggleGrid':
      return { ...state, gridOpen: !state.gridOpen }
    case 'closeGrid':
      return { ...state, gridOpen: false }

    case 'finish':
      return { ...state, phase: 'summary', gridOpen: false }
    case 'restart':
      return { ...state, phase: 'presenting', index: 0, gapIndex: 0, revealed: false }

    default:
      return state
  }
}
