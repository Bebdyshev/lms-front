// The numbers beside the question: how many answered, how many got it right, the answer
// spread, and — when names are on — exactly who is in each bucket, which is what turns a
// statistic into a conversation with the class.
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { ReviewOptionBars } from './ReviewOptionBars'
import type { QuestionStat } from './reviewStats'
import { EN } from './strings'

interface Props {
  stat: QuestionStat | undefined
  revealed: boolean
  showNames: boolean
}

const NameList: React.FC<{ title: string; names: string[]; className: string }> = ({
  title, names, className,
}) => {
  if (names.length === 0) return null
  return (
    <div className="space-y-1">
      <p className={`text-sm font-semibold ${className}`}>{title} · {names.length}</p>
      <div className="flex flex-wrap gap-1">
        {names.map((name) => (
          <span key={name} className="rounded bg-muted px-1.5 py-0.5 text-xs">{name}</span>
        ))}
      </div>
    </div>
  )
}

export const ReviewStatsPanel: React.FC<Props> = ({ stat, revealed, showNames }) => {
  if (!stat) {
    return (
      <Card><CardContent className="p-4 text-sm text-muted-foreground">{EN.noData}</CardContent></Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">{EN.answered}</p>
            <p className="text-2xl font-bold tabular-nums">{stat.answered}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{EN.noAnswer}</p>
            <p className="text-2xl font-bold tabular-nums">{stat.unanswered}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{EN.percentCorrect}</p>
            <p className="text-2xl font-bold tabular-nums">
              {/* Gated on `revealed` too: with per-option counts already on screen, a
                  deterministic "% correct" figure for a single/multi-choice question
                  identifies the right option before Reveal just as surely as printing it
                  outright would. */}
              {!revealed || stat.percentCorrect === null ? '—' : `${stat.percentCorrect}%`}
            </p>
          </div>
        </div>

        {!stat.graded && (
          <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{EN.notGraded}</p>
        )}

        {/* 'none' means this question type (matching, or long_text) deliberately has no
            printable answer distribution — long_text's raw value is a whole essay, which
            must not be projected verbatim with the writer's name attached, and matching's
            is a set of left→right index pairs, not a single printable answer. The
            correct/partial/incorrect split below is the real answer for both, so the
            heading and bars are omitted rather than shown above a "No data" line. */}
        {stat.distributionKind !== 'none' && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">{EN.answerDistribution}</p>
            <ReviewOptionBars stat={stat} revealed={revealed} showNames={showNames} />
          </div>
        )}

        {/* Gated on `revealed` as well as `showNames`: cross-referencing "Correct · 7 —
            <names>" against the per-option name chips identifies the correct option
            instantly, before the teacher has pressed Reveal. */}
        {revealed && showNames && stat.graded && (
          <div className="space-y-3">
            <p className="text-sm font-semibold">{EN.whoAnswered}</p>
            <NameList title={EN.correct} names={stat.names.correct} className="text-emerald-600 dark:text-emerald-400" />
            <NameList title={EN.partial} names={stat.names.partial} className="text-amber-600 dark:text-amber-400" />
            <NameList title={EN.incorrect} names={stat.names.incorrect} className="text-rose-600 dark:text-rose-400" />
            <NameList title={EN.noAnswer} names={stat.names.unanswered} className="text-muted-foreground" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReviewStatsPanel
