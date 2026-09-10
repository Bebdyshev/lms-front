// The question as the class sees it. Options are rendered here rather than through
// ChoiceQuestion because this view has no "selected" state to show — what it marks is the
// key (once revealed), and the bars beside it carry the class's answers.
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { renderTextWithLatex } from '../../utils/latex'
import { getExpectedAnswers } from '../lesson/quiz/scoring'
import { EN, questionTypeLabel } from './strings'
import { blankHeading, displayText, isCorrectOption, isGapType, LETTERS, splitPipeAnswers, type QuestionStat } from './reviewStats'

interface Props {
  question: any
  stat: QuestionStat | undefined
  revealed: boolean
  statsVisible: boolean
}

const PIPE_ANSWER_TYPES = new Set(['short_answer', 'media_open_question'])

export const ReviewQuestionView: React.FC<Props> = ({ question, stat, revealed, statsVisible }) => {
  if (!question) {
    return <Card><CardContent className="p-6 text-muted-foreground">{EN.noData}</CardContent></Card>
  }

  const isGap = isGapType(question.question_type)
  // Gap questions store their key IN the content, with the correct option inside each
  // [[…]] token marked by `*` (see gapParser.ts). That syntax isn't confined to content_text
  // — some quizzes carry it in question_text instead (scoring.ts's getExpectedAnswers and
  // QuizRenderer.tsx's student-facing renderer both check either field for exactly this
  // reason) — so BOTH the passage below and the heading further down must have their
  // tokens blanked. Neither must ever be shown raw: the answer key would be visible the
  // instant the question appears, before Reveal. The passage goes through displayText
  // (gated by isGapType, matching content_text's own gate on the student side); the heading
  // goes through blankHeading instead (unconditional, matching QuizRenderer.tsx's
  // question_text handling) — see blankHeading's doc comment for why they differ. Neither
  // helper parses the tokens for correctness — getExpectedAnswers (scoring.ts) stays the
  // only place that decides what the accepted answers are.
  const passage = question.content_text
  const options: any[] = Array.isArray(question.options) ? question.options : []

  // What Reveal shows for questions with no option list of their own.
  let revealAnswers: string[] = []
  if (isGap) {
    revealAnswers = getExpectedAnswers(question)
  } else if (PIPE_ANSWER_TYPES.has(question.question_type)) {
    // short_answer / media_open_question store several accepted answers pipe-separated;
    // gradeQuestion splits on the same character to grade. Showing that split instead of
    // the raw "paris|Paris|the capital" string is presentation only — the accepted-answer
    // set itself still comes from the same field gradeQuestion reads.
    revealAnswers = splitPipeAnswers(question)
  } else if (question.correct_answer != null) {
    revealAnswers = Array.isArray(question.correct_answer)
      ? question.correct_answer.map((a: any) => String(a))
      : [String(question.correct_answer)]
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded border px-2 py-0.5">{questionTypeLabel(question.question_type)}</span>
          {question.difficulty && (
            <span className="rounded border px-2 py-0.5">{question.difficulty}</span>
          )}
        </div>

        {/* renderTextWithLatex returns an HTML string (KaTeX + markdown), so every use of it
            goes through dangerouslySetInnerHTML — the same way ChoiceQuestion uses it. This
            content is always author-authored (the question source, or its blanked form for
            gap questions), never something a student typed — see ReviewOptionBars for the
            one place that distinction matters. */}
        {passage && (
          <div
            className="rounded border-l-4 border-muted-foreground/30 bg-muted/40 p-4 text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderTextWithLatex(displayText(question.question_type, passage)) }}
          />
        )}

        {question.media_url && (
          <img src={question.media_url} alt="" className="max-h-72 rounded object-contain" />
        )}

        {/* Same leak this component's passage above already guards against (see the comment
            on `isGap`): a gap question can carry its [[…*…]] tokens in question_text instead
            of content_text, so this heading needs blanking too — a raw question_text here is
            exactly what let the answer key reach the projector while students' own screens
            (QuizRenderer.tsx) already hid it. Unlike the passage above, this goes through
            blankHeading rather than displayText: question_text can carry gap syntax even
            when question_type ISN'T a gap type (an importer conversion, a mistyped slug, a
            short_answer authored from a cloze), and QuizRenderer.tsx's student-facing
            renderer strips question_text unconditionally, not gated by type — so this must
            match that, not displayText's isGapType gate. */}
        <h2
          className="text-2xl font-semibold leading-snug"
          dangerouslySetInnerHTML={{ __html: renderTextWithLatex(blankHeading(question.question_text)) }}
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
                  {statsVisible && (
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{count}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {revealed && options.length === 0 && revealAnswers.length > 0 && (
          <p className="rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <span className="font-semibold">{EN.correctAnswer}: </span>
            {revealAnswers.join(', ')}
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
