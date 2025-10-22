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
            
            {/* Media attachment for media questions */}
            {(q as any).media_url && (
              <div className="mb-4">
                {(q as any).media_type === 'image' ? (
                  <img 
                    src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + (q as any).media_url} 
                    alt="Question media" 
                    className="max-w-full max-h-96 object-contain rounded-lg border shadow-sm"
                  />
                ) : (q as any).media_type === 'pdf' ? (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 text-gray-700">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">PDF Document</span>
                    </div>
                    <a 
                      href={(q as any).media_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm mt-1 inline-block"
                    >
                      View PDF →
                    </a>
                  </div>
                ) : null}
              </div>
            )}
            
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


