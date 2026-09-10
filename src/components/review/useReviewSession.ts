// The ONLY module in review mode that touches the network. Every component reads this
// state object and calls these actions; none of them imports the API client.
//
// Two invariants worth stating, both learned in a classroom:
//   * `revealed` resets on every question change — the answer must never already be on
//     screen when a new question appears;
//   * the stats / names / grid toggles persist across questions, so the teacher does not
//     press them once per question.
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../services/api'
import type {
  ReviewSessionResponse,
  ReviewUnit,
} from '../../services/api/review'
import {
  buildClassSummary,
  buildQuestionStats,
  reviewQuestions,
  type ClassSummary,
  type QuestionStat,
  type ReviewAttempt,
  type StudentRef,
} from './reviewStats'
import { createRequestGuard } from './requestGuard'
import { EN } from './strings'

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
  revealed: boolean
  statsVisible: boolean
  namesVisible: boolean
  gridOpen: boolean
}

const initialState: ReviewSessionState = {
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
  revealed: false,
  statsVisible: true,
  // Opt in, not opt out: the very first frame a class sees must not show who got the
  // question wrong. The teacher can turn names on once they choose to.
  namesVisible: false,
  gridOpen: false,
}

type Action =
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

function reducer(state: ReviewSessionState, action: Action): ReviewSessionState {
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
        revealed: false,
      }
    }

    case 'index':
      return {
        ...state,
        index: clampIndex(action.index, state.questions.length),
        revealed: false,
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
      return { ...state, phase: 'presenting', index: 0, revealed: false }

    default:
      return state
  }
}

// A 403 means this group is not the user's; anything else is a generic load failure.
function messageFor(err: any): string {
  return err?.response?.status === 403 ? EN.accessDenied : EN.loadError
}

export interface ReviewSessionActions {
  loadCourses: () => Promise<void>
  selectCourse: (courseId: number) => Promise<void>
  selectGroup: (groupId: number) => Promise<void>
  selectUnit: (lessonId: number) => void
  selectQuiz: (stepId: number) => void
  start: () => Promise<void>
  next: () => void
  prev: () => void
  jumpTo: (index: number) => void
  toggleReveal: () => void
  toggleStats: () => void
  toggleNames: () => void
  toggleGrid: () => void
  closeGrid: () => void
  finish: () => void
  restart: () => void
  exit: () => void
}

export function useReviewSession(): [ReviewSessionState, ReviewSessionActions] {
  const [state, dispatch] = useReducer(reducer, initialState)
  const navigate = useNavigate()

  // Async callbacks need the latest selection without being re-created on every change.
  const stateRef = useRef(state)
  stateRef.current = state

  // Guards against stale-response races: selectCourse -> selectGroup -> start form a
  // strictly ordered cascade, so a single shared guard is enough. Each of those three
  // actions takes a token before firing its request; when the request resolves (success
  // or failure) it only dispatches if the token is still current, i.e. no newer selection
  // has superseded it. Without this, a slow response for a selection the teacher has
  // since changed away from can land after a newer one and silently overwrite the screen
  // with data for the wrong course/group/quiz -- including flipping into 'presenting'
  // with a different group's questions and answers. Do not "simplify" this away; the fix
  // is deliberately not disabling the selects while loading.
  const guard = useRef(createRequestGuard()).current

  const loadCourses = useCallback(async () => {
    dispatch({ type: 'loading' })
    try {
      const data = await apiClient.getCourses()
      dispatch({
        type: 'courses',
        courses: (data || []).map((c: any) => ({ id: Number(c.id), title: c.title })),
      })
    } catch (err) {
      dispatch({ type: 'error', message: messageFor(err) })
    }
  }, [])

  const selectCourse = useCallback(async (courseId: number) => {
    dispatch({ type: 'selectCourse', courseId })
    if (!courseId) return
    const token = guard.start()
    dispatch({ type: 'loading' })
    try {
      const data = await apiClient.getCourseGroupsAnalytics(String(courseId))
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      // No `!g.is_archived` filter here: getCourseGroupsAnalytics already excludes archived
      // groups unless asked otherwise, so this would be a redundant (and silently
      // divergent, if that default ever changes) second copy of that rule.
      const groups = (data?.groups || [])
        .map((g: any) => ({
          id: Number(g.group_id),
          name: g.group_name,
          studentCount: Number(g.students_count || 0),
        }))
      dispatch({ type: 'groups', groups })
    } catch (err) {
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      dispatch({ type: 'error', message: messageFor(err) })
    }
  }, [])

  const selectGroup = useCallback(async (groupId: number) => {
    dispatch({ type: 'selectGroup', groupId })
    const courseId = stateRef.current.selectedCourseId
    if (!groupId || !courseId) return
    const token = guard.start()
    dispatch({ type: 'loading' })
    try {
      const data = await apiClient.getReviewQuizzes(courseId, groupId)
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      dispatch({ type: 'quizzes', units: data.units || [], rosterCount: data.roster_count || 0 })
    } catch (err) {
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      dispatch({ type: 'error', message: messageFor(err) })
    }
  }, [])

  const selectUnit = useCallback((lessonId: number) => {
    dispatch({ type: 'selectUnit', lessonId })
  }, [])

  const selectQuiz = useCallback((stepId: number) => {
    dispatch({ type: 'selectQuiz', stepId })
  }, [])

  const start = useCallback(async () => {
    const { selectedStepId, selectedGroupId } = stateRef.current
    if (!selectedStepId || !selectedGroupId) return
    const token = guard.start()
    dispatch({ type: 'loading' })
    try {
      const payload = await apiClient.getReviewSession(selectedStepId, selectedGroupId)
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      dispatch({ type: 'started', payload })
    } catch (err) {
      if (!guard.isCurrent(token)) return // superseded by a newer selection
      dispatch({ type: 'error', message: messageFor(err) })
    }
  }, [])

  const next = useCallback(() => dispatch({ type: 'index', index: stateRef.current.index + 1 }), [])
  const prev = useCallback(() => dispatch({ type: 'index', index: stateRef.current.index - 1 }), [])
  const jumpTo = useCallback((index: number) => dispatch({ type: 'index', index }), [])

  const toggleReveal = useCallback(() => dispatch({ type: 'toggleReveal' }), [])
  const toggleStats = useCallback(() => dispatch({ type: 'toggleStats' }), [])
  const toggleNames = useCallback(() => dispatch({ type: 'toggleNames' }), [])
  const toggleGrid = useCallback(() => dispatch({ type: 'toggleGrid' }), [])
  const closeGrid = useCallback(() => dispatch({ type: 'closeGrid' }), [])

  const finish = useCallback(() => dispatch({ type: 'finish' }), [])
  const restart = useCallback(() => dispatch({ type: 'restart' }), [])
  const exit = useCallback(() => navigate('/dashboard'), [navigate])

  useEffect(() => { loadCourses() }, [loadCourses])

  const actions = useMemo<ReviewSessionActions>(() => ({
    loadCourses, selectCourse, selectGroup, selectUnit, selectQuiz, start,
    next, prev, jumpTo,
    toggleReveal, toggleStats, toggleNames, toggleGrid, closeGrid,
    finish, restart, exit,
  }), [loadCourses, selectCourse, selectGroup, selectUnit, selectQuiz, start,
    next, prev, jumpTo, toggleReveal, toggleStats, toggleNames, toggleGrid,
    closeGrid, finish, restart, exit])

  return [state, actions]
}

export default useReviewSession
