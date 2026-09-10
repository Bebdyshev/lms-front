// Presenter shell: toolbar, keyboard handling, and the question <-> stats layout. Holds no
// data of its own — everything comes from the session state.
import React, { useEffect } from 'react'
import { Button } from '../ui/button'
import { ReviewQuestionView } from './ReviewQuestionView'
import { ReviewQuestionGrid } from './ReviewQuestionGrid'
import { ReviewStatsPanel } from './ReviewStatsPanel'
import { EN, format } from './strings'
import type { ReviewSessionActions, ReviewSessionState } from './useReviewSession'

interface Props {
  state: ReviewSessionState
  actions: ReviewSessionActions
}

export const ReviewPresenter: React.FC<Props> = ({ state, actions }) => {
  const total = state.questions.length
  const question = total > 0 ? state.questions[state.index] : null
  const stat = question ? state.statsByQuestionId[String(question.id)] : undefined

  // Matched on `event.code`, not `event.key`: teachers here run a Russian keyboard layout,
  // where R reports key === 'к'. `code === 'KeyR'` is layout-proof.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable)) return
      if (e.ctrlKey || e.metaKey || e.altKey) return

      switch (e.code) {
        case 'ArrowRight':
        case 'PageDown':
          e.preventDefault(); actions.next(); break
        case 'ArrowLeft':
        case 'PageUp':
          e.preventDefault(); actions.prev(); break
        // Enter/NumpadEnter also toggle reveal, but ONLY when focus is not on a button: a
        // focused toolbar button's native response to Enter is to click it, which already
        // calls the right handler. Swallowing Enter here unconditionally (as before) would
        // fire the click AND toggleReveal for the reveal button, and — worse — silently kill
        // Enter-activation for every OTHER toolbar button too, since the event never reached
        // the browser's default handling.
        case 'KeyR':
        case 'Enter':
        case 'NumpadEnter':
          if (target && target.tagName === 'BUTTON') break
          e.preventDefault(); actions.toggleReveal(); break
        case 'KeyS':
          actions.toggleStats(); break
        case 'KeyN':
          actions.toggleNames(); break
        case 'KeyG':
          actions.toggleGrid(); break
        case 'Escape':
          if (state.gridOpen) actions.closeGrid()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [actions, state.gridOpen])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-bold">
          {total > 0 ? format(EN.questionOf, { n: state.index + 1, total }) : EN.noData}
        </span>
        {state.step && (
          <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
            {state.step.lesson_title} · {state.step.title}
          </span>
        )}
        <span className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
          {EN.submitted}: {state.attempts.length}/{state.roster.length}
        </span>

        <div className="flex-1" />

        <Button variant={state.revealed ? 'default' : 'outline'} size="sm" onClick={actions.toggleReveal}>
          {state.revealed ? EN.hideAnswer : EN.revealAnswer}
        </Button>
        <Button variant="outline" size="sm" onClick={actions.toggleStats}>
          {state.statsVisible ? EN.hideStats : EN.showStats}
        </Button>
        <Button variant="outline" size="sm" onClick={actions.toggleNames}>
          {state.namesVisible ? EN.hideNames : EN.showNames}
        </Button>
        <Button variant="outline" size="sm" onClick={actions.toggleGrid}>{EN.questionList}</Button>
        <Button variant="outline" size="sm" onClick={actions.finish}>{EN.finish}</Button>
        <Button variant="ghost" size="sm" onClick={actions.exit}>{EN.exit}</Button>
      </div>

      <div className={`grid gap-4 ${state.statsVisible ? 'lg:grid-cols-[1.35fr_1fr]' : 'grid-cols-1'}`}>
        <ReviewQuestionView question={question} stat={stat} revealed={state.revealed} statsVisible={state.statsVisible} />
        {state.statsVisible && (
          <ReviewStatsPanel stat={stat} revealed={state.revealed} showNames={state.namesVisible} />
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={actions.prev} disabled={state.index <= 0}>{EN.prev}</Button>
        <Button variant="outline" onClick={actions.next} disabled={state.index >= total - 1}>{EN.next}</Button>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{EN.keyboardHint}</span>
      </div>

      {state.gridOpen && (
        <div className="rounded border p-4">
          <ReviewQuestionGrid
            questions={state.questions}
            statsByQuestionId={state.statsByQuestionId}
            currentIndex={state.index}
            onJump={(index) => { actions.jumpTo(index); actions.closeGrid() }}
          />
        </div>
      )}
    </div>
  )
}

export default ReviewPresenter
