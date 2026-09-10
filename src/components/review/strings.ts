// Every user-facing string in review mode. Components import from here — no inline copy,
// so the wording stays consistent across the launcher, presenter, grid and summary.
export const EN = {
  pageTitle: 'Quiz Review',
  subtitle: 'Pick a quiz your group has taken and go through it together',

  courseLabel: 'Course',
  groupLabel: 'Group',
  unitLabel: 'Unit',
  quizLabel: 'Quiz',
  selectCourse: 'Select a course',
  selectGroup: 'Select a group',
  selectUnit: 'Select a unit',
  selectQuiz: 'Select a quiz',
  start: 'Start review',

  questions: 'Questions',
  submitted: 'Submitted',
  students: 'Students',
  completed: 'Completed',

  questionOf: 'Question {n} of {total}',
  revealAnswer: 'Reveal answer',
  hideAnswer: 'Hide answer',
  showStats: 'Show stats',
  hideStats: 'Hide stats',
  showNames: 'Show names',
  hideNames: 'Hide names',
  namesAfterReveal: 'Names appear once you reveal the answer',
  questionList: 'Question list',
  next: 'Next',
  prev: 'Back',
  finish: 'Finish review',
  exit: 'Exit',
  restart: 'Start over',

  correctAnswer: 'Correct answer',
  explanation: 'Explanation',
  answered: 'Answered',
  noAnswer: 'No answer',
  correct: 'Correct',
  partial: 'Partly correct',
  incorrect: 'Incorrect',
  percentCorrect: '% correct',
  answerDistribution: 'Answer distribution',
  whoAnswered: 'Who answered',
  notGraded: 'This question has no answer key — showing the spread only',
  otherAnswers: 'Other answers',

  summaryTitle: 'Review summary',
  summaryDistribution: 'Score distribution',
  summaryTop: 'Top results',
  summaryBottom: 'Needs attention',
  summaryHardest: 'Hardest questions',
  summaryNotSubmitted: 'Did not submit',
  notSubmittedCount: '{count} did not submit',
  anonymousStudent: 'Student',
  averageScore: 'Average',
  medianScore: 'Median',
  minScore: 'Lowest',
  maxScore: 'Highest',
  averageTime: 'Average time',
  minutesShort: 'min',

  noData: 'No data',
  noQuizzes: 'This course has no unit quizzes yet',
  noSubmissions: 'Nobody in this group has taken this quiz yet',
  loading: 'Loading…',
  loadError: 'Could not load the data. Please try again.',
  accessDenied: "You don't have access to this group",
  retry: 'Retry',
  keyboardHint: '← → navigate · R reveal · S stats · N names · G question list',
} as const

/** format(EN.questionOf, { n: 3, total: 22 }) -> 'Question 3 of 22' */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  )
}

// Readable labels for the question-type badge on the presenter — the raw slug
// (`media_open_question`) is an implementation detail, not something to project on screen.
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
  short_answer: 'Short answer',
  fill_blank: 'Fill in the blank',
  text_completion: 'Text completion',
  long_text: 'Long answer',
  media_question: 'Media question',
  media_open_question: 'Media open question',
  matching: 'Matching',
  image_content: 'Image',
}

export function questionTypeLabel(type: string | undefined): string {
  if (!type) return ''
  return QUESTION_TYPE_LABELS[type] || type
}
