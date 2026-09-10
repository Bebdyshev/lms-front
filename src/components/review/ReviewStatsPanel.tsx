// The numbers beside the question: how many answered, how many got it right, the answer
// spread, and — when names are on — exactly who is in each bucket, which is what turns a
// statistic into a conversation with the class.
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { ReviewOptionBars } from './ReviewOptionBars'
import { ReviewGapBars } from './ReviewGapBars'
import { isGapType, type QuestionStat } from './reviewStats'
import { EN, format } from './strings'

interface Props {
  stat: QuestionStat | undefined
  revealed: boolean
  showNames: boolean
  /** Which gap of `stat` is under discussion — ignored when the question isn't a gap type. */
  gapIndex: number
}

const STAT_LABEL = 'text-sm font-medium text-gray-500 dark:text-gray-400'
const STAT_VALUE = 'text-3xl font-bold text-gray-900 dark:text-foreground tabular-nums'
const SECTION_HEADING = 'text-sm font-semibold text-gray-700 dark:text-gray-200'
const CHIP = 'rounded-full border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300'

const NameList: React.FC<{ title: string; names: string[]; className: string }> = ({
  title, names, className,
}) => {
  if (names.length === 0) return null
  return (
    <div className="space-y-1.5">
      <p className={`text-xs font-semibold ${className}`}>{title} · {names.length}</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <span key={name} className={CHIP}>{name}</span>
        ))}
      </div>
    </div>
  )
}

export const ReviewStatsPanel: React.FC<Props> = ({ stat, revealed, showNames, gapIndex }) => {
  if (!stat) {
    return (
      <Card><CardContent className="p-4 text-sm text-gray-500 dark:text-gray-400">{EN.noData}</CardContent></Card>
    )
  }

  // The boxes and name lists below still describe the WHOLE cloze question (a 9-of-10-gap
  // submission is still one "partial" student there) — additive, unchanged by the gap
  // stepper. Only the "Answer distribution" section below switches, per gap, to what that
  // one gap's own answers looked like.
  const isGap = isGapType(stat.questionType)
  const gapStat = isGap ? stat.gaps[gapIndex] : undefined

  return (
    <Card>
      <CardContent className="space-y-5 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={STAT_LABEL}>{EN.answered}</p>
            <p className={STAT_VALUE}>{stat.answered}</p>
          </div>
          <div>
            <p className={STAT_LABEL}>{EN.noAnswer}</p>
            <p className={STAT_VALUE}>{stat.unanswered}</p>
          </div>
          <div>
            <p className={STAT_LABEL}>{EN.percentCorrect}</p>
            <p className={STAT_VALUE}>
              {/* Gated on `revealed` too: with per-option counts already on screen, a
                  deterministic "% correct" figure for a single/multi-choice question
                  identifies the right option before Reveal just as surely as printing it
                  outright would. */}
              {!revealed || stat.percentCorrect === null ? '—' : `${stat.percentCorrect}%`}
            </p>
          </div>
        </div>

        {!stat.graded && (
          <p className="rounded-md border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400">
            {EN.notGraded}
          </p>
        )}

        {/* Gap questions get a per-gap breakdown instead of the whole-question answer
            distribution below — "the class's answers to this cloze" isn't one distribution,
            it's one per gap, and only the gap currently under discussion is relevant here.
            But `gapStat` is only there when getExpectedAnswers actually located gaps
            (reviewStats.ts's gapCount); a fill_blank/text_completion with no locatable gap
            but real submitted text (e.g. the correct_answer fallback — see ReviewQuestionView's
            #3) has `stat.gaps` empty, so fall through to the same whole-question bars the
            non-gap branch below uses rather than showing nothing — `stat.options` is still
            computed for every question type regardless of isGap (#6). */}
        {isGap && gapStat ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className={SECTION_HEADING}>{EN.gapBreakdown}</p>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(EN.gapAnsweredOf, { answered: gapStat.answered, participants: gapStat.participants })}
              </span>
            </div>
            <ReviewGapBars gap={gapStat} revealed={revealed} showNames={showNames} />
          </div>
        ) : (
          /* 'none' means this question type (matching, or long_text) deliberately has no
             printable answer distribution — long_text's raw value is a whole essay, which
             must not be projected verbatim with the writer's name attached, and matching's
             is a set of left→right index pairs, not a single printable answer. The
             correct/partial/incorrect split below is the real answer for both, so the
             heading and bars are omitted rather than shown above a "No data" line. */
          stat.distributionKind !== 'none' && (
            <div className="space-y-2">
              <p className={SECTION_HEADING}>{EN.answerDistribution}</p>
              <ReviewOptionBars stat={stat} revealed={revealed} showNames={showNames} />
            </div>
          )
        )}

        {/* Gated on `revealed` as well as `showNames`: cross-referencing "Correct · 7 —
            <names>" against the per-option name chips identifies the correct option
            instantly, before the teacher has pressed Reveal. */}
        {revealed && showNames && stat.graded && (
          <div className="space-y-3 border-t border-gray-200 dark:border-border pt-4">
            <p className={SECTION_HEADING}>{EN.whoAnswered}</p>
            <NameList title={EN.correct} names={stat.names.correct} className="text-emerald-600 dark:text-emerald-400" />
            <NameList title={EN.partial} names={stat.names.partial} className="text-amber-600 dark:text-amber-400" />
            <NameList title={EN.incorrect} names={stat.names.incorrect} className="text-rose-600 dark:text-rose-400" />
            <NameList title={EN.noAnswer} names={stat.names.unanswered} className="text-gray-500 dark:text-gray-400" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReviewStatsPanel
