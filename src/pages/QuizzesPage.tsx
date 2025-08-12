import { useEffect, useState } from 'react';
import { fetchQuizzes, getQuizAttemptsLeft } from "../services/api";
import type { Quiz } from '../types';

interface QuizItem extends Quiz {
  attemptsLeft: number;
}

export default function QuizzesPage() {
  const [items, setItems] = useState<QuizItem[]>([]);
  useEffect(() => {
    fetchQuizzes().then((qs: any[]) => setItems(qs.map(q => ({ 
      ...q, 
      id: String(q.id), 
      attemptsLeft: getQuizAttemptsLeft(String(q.id)) 
    }))));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Quizzes</h1>
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Time limit</th>
              <th className="text-left px-4 py-3">Attempts left</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(q => (
              <tr key={q.id} className="border-t">
                <td className="px-4 py-3 font-medium">{q.title}</td>
                <td className="px-4 py-3 text-gray-600">{Math.round((q.timeLimitSec || 0)/60)} min</td>
                <td className="px-4 py-3 text-gray-600">{q.attemptsLeft}</td>
                <td className="px-4 py-3">
                  <a className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" href={`#/quiz/${q.id}`}>Start</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


