import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchQuizById, getQuizAttemptsLeft, submitQuiz } from "../services/api";
import { toast } from '../components/Toast.tsx';
import type { Quiz } from '../types';

export default function QuizPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [left, setLeft] = useState<number>(0);
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    
    fetchQuizById(id).then(q => {
      setQuiz(q);
      setLeft(getQuizAttemptsLeft(id));
      setTime(q?.timeLimitSec || 0);
    });
  }, [id]);

  useEffect(() => {
    if (time <= 0) return;
    const t = setInterval(() => setTime(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [time]);

  const score = useMemo(() => {
    if (!quiz) return 0;
    let correct = 0;
    for (const q of quiz.questions) {
      if (q.type === 'single') {
        if (q.correct && q.correct.length > 0 && Number(answers[q.id]) === q.correct[0]) correct += 1;
      } else if (q.type === 'short') {
        if ((answers[q.id]||'').trim().toLowerCase() === (q.correctText||'').trim().toLowerCase()) correct += 1;
      }
    }
    return Math.round((correct / quiz.questions.length) * 100);
  }, [answers, quiz]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    await submitQuiz(id, answers, score);
    toast(`Your score: ${score}%`, 'success');
    nav('/quizzes');
  };

  if (!quiz) return <div className="text-gray-500">Loading...</div>;
  if (left <= 0) return <div className="text-gray-600">No attempts left.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{quiz.title}</h1>
        <div className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-sm">Time: {Math.floor(time/60)}:{String(time%60).padStart(2,'0')}</div>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-2xl shadow-card p-5">
            <div className="text-sm text-gray-500">Question {idx+1}</div>
            <div className="font-medium mb-3">{q.body}</div>
            {q.type === 'single' && (
              <div className="space-y-2">
                {q.options?.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input 
                      type="radio" 
                      name={q.id} 
                      value={i} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} 
                    /> {opt}
                  </label>
                ))}
              </div>
            )}
            {q.type === 'short' && (
              <input
                className="mt-1 border rounded-lg px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your answer"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Submit</button>
      </form>
    </div>
  );
}


