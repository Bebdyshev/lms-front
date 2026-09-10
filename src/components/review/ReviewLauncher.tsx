// Setup screen: the teacher picks course -> group -> unit -> quiz before anything reaches
// the class. Each select only appears once its parent has a value, so the path is obvious.
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { EN } from './strings'
import type { ReviewSessionActions, ReviewSessionState } from './useReviewSession'

interface Props {
  state: ReviewSessionState
  actions: ReviewSessionActions
}

export const ReviewLauncher: React.FC<Props> = ({ state, actions }) => {
  const unit = state.units.find((u) => u.lesson_id === state.selectedLessonId) || null
  const quiz = unit?.quizzes.find((q) => q.step_id === state.selectedStepId) || null
  const busy = state.status === 'loading'

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{EN.pageTitle}</CardTitle>
        <p className="text-sm text-muted-foreground">{EN.subtitle}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">{EN.courseLabel}</label>
          <Select
            value={state.selectedCourseId ? String(state.selectedCourseId) : undefined}
            onValueChange={(value) => actions.selectCourse(Number(value))}
          >
            <SelectTrigger><SelectValue placeholder={EN.selectCourse} /></SelectTrigger>
            <SelectContent>
              {state.courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>{course.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {state.selectedCourseId && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{EN.groupLabel}</label>
            <Select
              value={state.selectedGroupId ? String(state.selectedGroupId) : undefined}
              onValueChange={(value) => actions.selectGroup(Number(value))}
            >
              <SelectTrigger><SelectValue placeholder={EN.selectGroup} /></SelectTrigger>
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

        {state.selectedGroupId && state.units.length === 0 && !busy && (
          <p className="text-sm text-muted-foreground">{EN.noQuizzes}</p>
        )}

        {state.units.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{EN.unitLabel}</label>
            <Select
              value={state.selectedLessonId ? String(state.selectedLessonId) : undefined}
              onValueChange={(value) => actions.selectUnit(Number(value))}
            >
              <SelectTrigger><SelectValue placeholder={EN.selectUnit} /></SelectTrigger>
              <SelectContent>
                {state.units.map((u) => (
                  <SelectItem key={u.lesson_id} value={String(u.lesson_id)}>{u.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {unit && (
          <div className="space-y-2">
            <label className="text-sm font-medium">{EN.quizLabel}</label>
            <Select
              value={state.selectedStepId ? String(state.selectedStepId) : undefined}
              onValueChange={(value) => actions.selectQuiz(Number(value))}
            >
              <SelectTrigger><SelectValue placeholder={EN.selectQuiz} /></SelectTrigger>
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

        {quiz && (
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span className="rounded border px-2 py-1">{EN.questions}: {quiz.question_count}</span>
            <span className="rounded border px-2 py-1">
              {EN.submitted}: {quiz.submitted_count}/{state.rosterCount}
            </span>
          </div>
        )}

        {quiz && quiz.submitted_count === 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">{EN.noSubmissions}</p>
        )}

        <Button onClick={actions.start} disabled={!state.selectedStepId || busy}>
          {busy ? EN.loading : EN.start}
        </Button>
      </CardContent>
    </Card>
  )
}

export default ReviewLauncher
