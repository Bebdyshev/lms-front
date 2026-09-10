// The question as the class sees it. Options are rendered here rather than through
// ChoiceQuestion because this view has no "selected" state to show — what it marks is the
// key (once revealed), and the bars beside it carry the class's answers.
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { renderTextWithLatex } from '../../utils/latex'
import { EN } from './strings'
import { isCorrectOption, LETTERS, type QuestionStat } from './reviewStats'

interface Props {
  question: any
  stat: QuestionStat | undefined
  revealed: boolean
}

export const ReviewQuestionView: React.FC<Props> = ({ question, stat, revealed }) => {
  if (!question) {
    return <Card><CardContent className="p-6 text-muted-foreground">{EN.noData}</CardContent></Card>
  }

  const passage = question.passage_text || question.content_text
  const options: any[] = Array.isArray(question.options) ? question.options : []

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded border px-2 py-0.5">{question.question_type}</span>
          {question.difficulty && (
            <span className="rounded border px-2 py-0.5">{question.difficulty}</span>
          )}
        </div>

        {/* renderTextWithLatex returns an HTML string (KaTeX + markdown), so every use of it
            goes through dangerouslySetInnerHTML — the same way ChoiceQuestion uses it. */}
        {passage && (
          <div
            className="rounded border-l-4 border-muted-foreground/30 bg-muted/40 p-4 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(passage)) }}
          />
        )}

        {question.media_url && (
          <img src={question.media_url} alt="" className="max-h-72 rounded object-contain" />
        )}

        <h2
          className="text-2xl font-semibold leading-snug"
          dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(question.question_text || '')) }}
        />

        {options.length > 0 && (
          <div className="space-y-2">
            {options.map((option: any, index: number) => {
              const correct = revealed && isCorrectOption(question, index)
              const count = stat?.options.find((o) => o.key === String(index))?.count ?? 0
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded border-2 p-3 ${
                    correct
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-border'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold">
                    {option?.letter || LETTERS[index] || index + 1}
                  </span>
                  <span
                    className="flex-1"
                    dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(option?.text ?? '')) }}
                  />
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{count}</span>
                </div>
              )
            })}
          </div>
        )}

        {revealed && options.length === 0 && question.correct_answer != null && (
          <p className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <span className="font-semibold">{EN.correctAnswer}: </span>
            {String(Array.isArray(question.correct_answer)
              ? question.correct_answer.join(', ')
              : question.correct_answer)}
          </p>
        )}

        {revealed && question.explanation && (
          <div className="rounded bg-muted p-3 text-sm">
            <span className="font-semibold">{EN.explanation}: </span>
            <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(question.explanation)) }} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReviewQuestionView
