// Finish screen: how the group did overall, who is at each end, which questions cost them
// the most, and who never submitted.
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { EN, format } from './strings'
import type { ClassSummary, StudentScore } from './reviewStats'

interface Props {
  summary: ClassSummary | null
  namesVisible: boolean
  onRestart: () => void
  onExit: () => void
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums">{value}</p>
  </div>
)

const ScoreList: React.FC<{ title: string; students: StudentScore[]; showNames: boolean }> = ({
  title, students, showNames,
}) => (
  <Card>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-1">
      {students.length === 0 && <p className="text-sm text-muted-foreground">{EN.noData}</p>}
      {students.map((student) => (
        <div key={student.studentId} className="flex justify-between text-sm">
          <span>{showNames ? student.fullName : EN.anonymousStudent}</span>
          <span className="tabular-nums text-muted-foreground">
            {student.correct}/{student.total} · {student.percent}%
          </span>
        </div>
      ))}
    </CardContent>
  </Card>
)

export const ReviewSummary: React.FC<Props> = ({ summary, namesVisible, onRestart, onExit }) => {
  if (!summary) {
    return <p className="text-sm text-muted-foreground">{EN.noData}</p>
  }

  const pct = (value: number | null) => (value === null ? '—' : `${value}%`)
  const maxBucket = Math.max(1, ...summary.distribution.map((b) => b.count))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="flex-1 text-2xl font-bold">{EN.summaryTitle}</h1>
        <Button variant="outline" onClick={onRestart}>{EN.restart}</Button>
        <Button variant="ghost" onClick={onExit}>{EN.exit}</Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-5">
          <Stat label={EN.averageScore} value={pct(summary.averagePercent)} />
          <Stat label={EN.medianScore} value={pct(summary.medianPercent)} />
          <Stat label={EN.minScore} value={pct(summary.minPercent)} />
          <Stat label={EN.maxScore} value={pct(summary.maxPercent)} />
          <Stat
            label={EN.averageTime}
            value={summary.averageTimeSeconds === null
              ? '—'
              : `${Math.round(summary.averageTimeSeconds / 60)} ${EN.minutesShort}`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{EN.summaryDistribution}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.distribution.map((bucket) => (
            <div key={bucket.label} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-muted-foreground">{bucket.label}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-muted">
                <div className="h-full bg-primary/60" style={{ width: `${(bucket.count / maxBucket) * 100}%` }} />
              </div>
              <span className="w-6 shrink-0 text-right tabular-nums">{bucket.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top results is always named — praising who did well publicly is not the privacy
            concern this fix addresses. "Needs attention" singles out who struggled, which
            is exactly the kind of thing namesVisible exists to gate. */}
        <ScoreList title={EN.summaryTop} students={summary.top} showNames />
        <ScoreList title={EN.summaryBottom} students={summary.bottom} showNames={namesVisible} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{EN.summaryHardest}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {summary.hardest.length === 0 && <p className="text-sm text-muted-foreground">{EN.noData}</p>}
          {summary.hardest.map((question) => (
            <div key={question.questionId} className="flex gap-3 text-sm">
              <span className="w-8 shrink-0 font-semibold">{question.index + 1}</span>
              <span className="flex-1 line-clamp-2">{question.questionText || '—'}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {question.correct}/{question.answered} · {question.percentCorrect}%
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{EN.summaryNotSubmitted}</CardTitle></CardHeader>
        <CardContent>
          {summary.notSubmitted.length === 0
            ? <p className="text-sm text-muted-foreground">—</p>
            : namesVisible
              ? (
                <div className="flex flex-wrap gap-1">
                  {summary.notSubmitted.map((student) => (
                    <span key={student.student_id} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {student.full_name}
                    </span>
                  ))}
                </div>
              )
              : (
                <p className="text-sm text-muted-foreground">
                  {format(EN.notSubmittedCount, { count: summary.notSubmitted.length })}
                </p>
              )}
        </CardContent>
      </Card>
    </div>
  )
}

export default ReviewSummary
