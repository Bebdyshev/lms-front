// Question overview: one cell per question, filled red -> amber -> green by how much of
// the class got it right, so the teacher can see at a glance which questions are worth the
// class time and jump straight to them. Grey means nobody answered it.
import React from 'react'
import { accuracyBand, type QuestionStat } from './reviewStats'
import { EN } from './strings'

const BAND_CLASS: Record<string, string> = {
  low: 'bg-rose-500 text-white',
  medium: 'bg-amber-500 text-white',
  high: 'bg-emerald-500 text-white',
  none: 'bg-muted text-muted-foreground',
}

const LEGEND: { band: keyof typeof BAND_CLASS; label: string }[] = [
  { band: 'low', label: '0–49%' },
  { band: 'medium', label: '50–79%' },
  { band: 'high', label: '80–100%' },
  { band: 'none', label: EN.noData },
]

interface Props {
  questions: any[]
  statsByQuestionId: Record<string, QuestionStat>
  currentIndex: number
  onJump: (index: number) => void
}

export const ReviewQuestionGrid: React.FC<Props> = ({
  questions, statsByQuestionId, currentIndex, onJump,
}) => {
  if (questions.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">{EN.noData}</p>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{EN.questionList}</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-2">
        {questions.map((question, index) => {
          const stat = statsByQuestionId[String(question.id)]
          const band = accuracyBand(stat)
          return (
            <button
              key={String(question.id)}
              type="button"
              onClick={() => onJump(index)}
              aria-current={index === currentIndex ? 'true' : undefined}
              className={`aspect-square rounded-md text-sm font-bold transition-colors ${BAND_CLASS[band]} ${
                index === currentIndex ? 'ring-2 ring-offset-2 ring-primary' : ''
              }`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-3 border-t border-gray-200 dark:border-border pt-3">
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <span className={`h-3 w-3 rounded ${BAND_CLASS[item.band]}`} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export default ReviewQuestionGrid
