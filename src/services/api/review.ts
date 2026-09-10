import { api } from './client'
import type { ReviewAttempt, StudentRef } from '../../components/review/reviewStats'

export interface ReviewQuizStep {
  step_id: number
  title: string
  question_count: number
  submitted_count: number
}

export interface ReviewUnit {
  lesson_id: number
  title: string
  order: number
  quizzes: ReviewQuizStep[]
}

export interface ReviewQuizzesResponse {
  course_id: number
  group_id: number
  roster_count: number
  units: ReviewUnit[]
}

export interface ReviewStepInfo {
  step_id: number
  title: string
  lesson_id: number
  lesson_title: string
  course_id: number
  /** The step's quiz JSON, verbatim. */
  content: any
}

export interface ReviewSessionResponse {
  step: ReviewStepInfo
  roster: StudentRef[]
  attempts: ReviewAttempt[]
  not_submitted: StudentRef[]
}

export async function getReviewQuizzes(
  courseId: number,
  groupId: number,
): Promise<ReviewQuizzesResponse> {
  const response = await api.get('/review/quizzes', {
    params: { course_id: courseId, group_id: groupId },
  })
  return response.data
}

export async function getReviewSession(
  stepId: number,
  groupId: number,
): Promise<ReviewSessionResponse> {
  const response = await api.get('/review/session', {
    params: { step_id: stepId, group_id: groupId },
  })
  return response.data
}
