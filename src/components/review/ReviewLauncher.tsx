// Setup screen: the teacher picks course -> group -> unit -> quiz before anything reaches
// the class. Each select only appears once its parent has a value, so the path is obvious.
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { EN } from './strings'
import type { ReviewSessionActions, ReviewSessionState } from './useReviewSession'

interface Props {
  state: ReviewSessionState
  actions: ReviewSessionActions
}

const FIELD_LABEL = 'text-sm font-medium text-gray-500 dark:text-gray-400'
const STAT_LABEL = 'text-sm font-medium text-gray-500 dark:text-gray-400'
const STAT_VALUE = 'text-3xl font-bold text-gray-900 dark:text-foreground tabular-nums'

export const ReviewLauncher: React.FC<Props> = ({ state, actions }) => {
  const unit = state.units.find((u) => u.lesson_id === state.selectedLessonId) || null
  const quiz = unit?.quizzes.find((q) => q.step_id === state.selectedStepId) || null
  const busy = state.status === 'loading'

  return (
    <div className="mx-auto max-w-4xl">
      <Card className="shadow-sm border border-gray-200 dark:border-border">
        <CardHeader className="px-6 py-4 border-b border-gray-100 dark:border-border bg-white dark:bg-card rounded-t-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-foreground">{EN.pageTitle}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400">{EN.subtitle}</p>
            </div>

            {quiz && (
              <div className="flex items-center gap-6">
                <div>
                  <p className={STAT_LABEL}>{EN.questions}</p>
                  <p className={STAT_VALUE}>{quiz.question_count}</p>
                </div>
                <div>
                  <p className={STAT_LABEL}>{EN.submitted}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={STAT_VALUE}>{quiz.submitted_count}</span>
                    <span className="text-sm text-gray-400 dark:text-gray-500">/{state.rosterCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="review-course" className={FIELD_LABEL}>{EN.courseLabel}</Label>
              <Select
                value={state.selectedCourseId ? String(state.selectedCourseId) : undefined}
                onValueChange={(value) => actions.selectCourse(Number(value))}
              >
                <SelectTrigger id="review-course"><SelectValue placeholder={EN.selectCourse} /></SelectTrigger>
                <SelectContent>
                  {state.courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {state.selectedCourseId && (
              <div className="space-y-1.5">
                <Label htmlFor="review-group" className={FIELD_LABEL}>{EN.groupLabel}</Label>
                <Select
                  value={state.selectedGroupId ? String(state.selectedGroupId) : undefined}
                  onValueChange={(value) => actions.selectGroup(Number(value))}
                >
                  <SelectTrigger id="review-group"><SelectValue placeholder={EN.selectGroup} /></SelectTrigger>
                  <SelectContent>
                    {state.groups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name} · {EN.students}: {group.studentCount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {state.units.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="review-unit" className={FIELD_LABEL}>{EN.unitLabel}</Label>
                <Select
                  value={state.selectedLessonId ? String(state.selectedLessonId) : undefined}
                  onValueChange={(value) => actions.selectUnit(Number(value))}
                >
                  <SelectTrigger id="review-unit"><SelectValue placeholder={EN.selectUnit} /></SelectTrigger>
                  <SelectContent>
                    {state.units.map((u) => (
                      <SelectItem key={u.lesson_id} value={String(u.lesson_id)}>
                        {/* completed_count is optional so a launcher pointed at an older
                            backend (no completed_count in the response) still renders the
                            title alone, with no dangling " · " separator. */}
                        {typeof u.completed_count === 'number'
                          ? `${u.title} · ${EN.completed}: ${u.completed_count}/${state.rosterCount}`
                          : u.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {unit && (
              <div className="space-y-1.5">
                <Label htmlFor="review-quiz" className={FIELD_LABEL}>{EN.quizLabel}</Label>
                <Select
                  value={state.selectedStepId ? String(state.selectedStepId) : undefined}
                  onValueChange={(value) => actions.selectQuiz(Number(value))}
                >
                  <SelectTrigger id="review-quiz"><SelectValue placeholder={EN.selectQuiz} /></SelectTrigger>
                  <SelectContent>
                    {unit.quizzes.map((q) => (
                      <SelectItem key={q.step_id} value={String(q.step_id)}>
                        {q.title} · {EN.submitted}: {q.submitted_count}/{state.rosterCount}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Only claim the course has no quizzes when the load actually SUCCEEDED. Keyed on
              status === 'ready' rather than !busy: on a failed load `units` is empty too, and
              the old condition printed "no unit quizzes yet" beside the error banner — telling
              the teacher something false about their course at the moment we in fact know nothing. */}
          {state.selectedGroupId && state.units.length === 0 && state.status === 'ready' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{EN.noQuizzes}</p>
          )}

          {quiz && quiz.submitted_count === 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{EN.noSubmissions}</p>
          )}

          <Button
            size="lg"
            className="w-full sm:w-auto"
            onClick={actions.start}
            disabled={!state.selectedStepId || busy}
          >
            {busy ? EN.loading : EN.start}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewLauncher
