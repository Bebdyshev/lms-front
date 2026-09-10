// The question as the class sees it. Options are rendered here rather than through
// ChoiceQuestion because this view has no "selected" state to show — what it marks is the
// key (once revealed), and the bars beside it carry the class's answers.
import React from 'react'
import { Card, CardContent } from '../ui/card'
import { Button } from '../ui/button'
import { renderTextWithLatex } from '../../utils/latex'
import { getExpectedAnswers, getGapSourceText } from '../lesson/quiz/scoring'
import { EN, format, questionTypeLabel } from './strings'
import {
  blankHeading,
  displayText,
  GAP_TOKEN_SOURCE,
  isCorrectOption,
  isGapType,
  LETTERS,
  splitPipeAnswers,
  type QuestionStat,
} from './reviewStats'

interface Props {
  question: any
  stat: QuestionStat | undefined
  revealed: boolean
  statsVisible: boolean
  /** Which gap is under discussion right now — ignored for non-gap question types. */
  gapIndex: number
  onPrevGap: () => void
  onNextGap: () => void
}

const PIPE_ANSWER_TYPES = new Set(['short_answer', 'media_open_question'])

const BADGE = 'rounded-md border border-gray-200 dark:border-border px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400'

function escapeGapText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const GAP_FILLED_CLASS =
  'rounded px-1 py-0.5 mx-0.5 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 font-medium'
const GAP_CURRENT_CLASS =
  'rounded px-1.5 py-0.5 mx-0.5 border-2 border-dashed border-amber-500 dark:border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-100 font-semibold'
const GAP_CURRENT_REVEALED_CLASS =
  'rounded px-1.5 py-0.5 mx-0.5 border-2 border-emerald-500 dark:border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100 font-semibold'
const GAP_UPCOMING_CLASS = 'text-gray-400 dark:text-gray-500'

/**
 * Renders one gap-question passage/heading for the step-through-one-gap-at-a-time view:
 * gaps already stepped past (index < gapIndex) print their expected answer — the teacher
 * has moved on, there is nothing left to hide there; the current gap prints the blank
 * placeholder until `revealed`, then its expected answer, visually marked either way; every
 * later gap always prints the placeholder.
 *
 * Reuses reviewStats.ts's GAP_TOKEN_SOURCE — the exact pattern blankGapText uses to blank
 * every gap — to locate token boundaries. It does not parse token contents itself; the
 * expected answer for each position still comes from getExpectedAnswers (scoring.ts), the
 * only place that decides what the correct option is. `expected` values are quiz-authored
 * content already rendered elsewhere via dangerouslySetInnerHTML (same trust level as the
 * rest of the passage), but are HTML-escaped here since — unlike the old flat
 * "Correct answer: …" list — they are now spliced into the middle of an HTML string.
 */
function gapStepHtml(text: string, gapIndex: number, expected: string[], revealed: boolean): string {
  let gapPosition = 0
  return text.replace(new RegExp(GAP_TOKEN_SOURCE, 'g'), () => {
    const index = gapPosition
    gapPosition += 1
    if (index < gapIndex) {
      return `<span class="${GAP_FILLED_CLASS}">${escapeGapText(expected[index] || '____')}</span>`
    }
    if (index === gapIndex) {
      return revealed
        ? `<span class="${GAP_CURRENT_REVEALED_CLASS}">${escapeGapText(expected[index] || '____')}</span>`
        : `<span class="${GAP_CURRENT_CLASS}">____</span>`
    }
    return `<span class="${GAP_UPCOMING_CLASS}">____</span>`
  })
}

export const ReviewQuestionView: React.FC<Props> = ({
  question, stat, revealed, statsVisible, gapIndex, onPrevGap, onNextGap,
}) => {
  if (!question) {
    return <Card><CardContent className="p-6 text-sm text-gray-500 dark:text-gray-400">{EN.noData}</CardContent></Card>
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

  // The gap stepper renders one field at a time, one gap at a time — see gapStepHtml above.
  // getGapSourceText mirrors getExpectedAnswers's own content_text-then-question_text
  // resolution exactly, so the stepper and the answer key can never disagree about where
  // the gaps actually are.
  const gapExpected = isGap ? getExpectedAnswers(question) : []
  const gapSource = isGap ? getGapSourceText(question) : ''
  const gapTotal = gapExpected.length
  // The rare fallback case: no content_text at all, so the gaps live in question_text
  // itself. The heading below would then just be a second, fully-blanked copy of the exact
  // same text the stepped passage panel already renders — suppress it rather than show the
  // same cloze twice, once inert and once steppable.
  const gapInHeadingOnly = isGap && !question.content_text && !!question.question_text

  // What Reveal shows for questions with no option list of their own.
  let revealAnswers: string[] = []
  if (isGap) {
    // Gap questions no longer dump every expected answer here — Reveal now fills only the
    // current gap, inline in the passage above (gapStepHtml). Populating this too would
    // reintroduce the "Reveal shows everything at once" problem the gap stepper exists to
    // fix.
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
        <div className="flex flex-wrap gap-2">
          <span className={BADGE}>{questionTypeLabel(question.question_type)}</span>
          {question.difficulty && (
            <span className={BADGE}>{question.difficulty}</span>
          )}
        </div>

        {/* renderTextWithLatex returns an HTML string (KaTeX + markdown), so every use of it
            goes through dangerouslySetInnerHTML — the same way ChoiceQuestion uses it. This
            content is always author-authored (the question source, or its blanked/stepped
            form for gap questions), never something a student typed — see ReviewOptionBars
            for the one place that distinction matters. */}
        {isGap
          ? gapSource && (
              <div
                className="rounded-lg border-l-4 border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary p-4 text-base leading-relaxed text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{
                  __html: renderTextWithLatex(gapStepHtml(gapSource, gapIndex, gapExpected, revealed)),
                }}
              />
            )
          : passage && (
              <div
                className="rounded-lg border-l-4 border-gray-300 dark:border-border bg-gray-50 dark:bg-secondary p-4 text-base leading-relaxed text-gray-700 dark:text-gray-300"
                dangerouslySetInnerHTML={{ __html: renderTextWithLatex(displayText(question.question_type, passage)) }}
              />
            )}

        {isGap && gapTotal > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary px-3 py-2 text-sm">
            <span className="font-semibold text-gray-900 dark:text-foreground">
              {format(EN.gapOf, { n: gapIndex + 1, total: gapTotal })}
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={onPrevGap}
              disabled={gapIndex <= 0}
            >
              {EN.gapPrev}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onNextGap}
              disabled={gapIndex >= gapTotal - 1}
            >
              {EN.gapNext}
            </Button>
          </div>
        )}

        {question.media_url && (
          <img src={question.media_url} alt="" className="max-h-72 rounded-lg object-contain" />
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
        {!gapInHeadingOnly && (
          <h2
            className="text-2xl font-semibold leading-snug text-gray-900 dark:text-foreground"
            dangerouslySetInnerHTML={{ __html: renderTextWithLatex(blankHeading(question.question_text)) }}
          />
        )}

        {options.length > 0 && (
          <div className="space-y-2">
            {options.map((option: any, index: number) => {
              const correct = revealed && isCorrectOption(question, index)
              const count = stat?.options.find((o) => o.key === String(index))?.count ?? 0
              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 ${
                    correct
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-gray-200 dark:border-border'
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-gray-300 dark:border-border text-sm font-bold text-gray-700 dark:text-gray-200">
                    {option?.letter || LETTERS[index] || index + 1}
                  </span>
                  <span
                    className="flex-1 text-sm text-gray-700 dark:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(option?.text ?? '')) }}
                  />
                  {statsVisible && (
                    <span className="shrink-0 text-sm tabular-nums text-gray-500 dark:text-gray-400">{count}</span>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {revealed && options.length === 0 && revealAnswers.length > 0 && (
          <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-foreground">{EN.correctAnswer}: </span>
            {revealAnswers.join(', ')}
          </p>
        )}

        {revealed && question.explanation && (
          <div className="rounded-lg border border-gray-200 dark:border-border bg-gray-50 dark:bg-secondary p-3 text-sm text-gray-700 dark:text-gray-300">
            <span className="font-semibold text-gray-900 dark:text-foreground">{EN.explanation}: </span>
            <span dangerouslySetInnerHTML={{ __html: renderTextWithLatex(String(question.explanation)) }} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ReviewQuestionView
