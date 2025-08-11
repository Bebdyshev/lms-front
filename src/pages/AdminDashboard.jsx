import React from 'react';
import { countOverdueAssignments, countUnwatchedLectures, countUnansweredThreadsForCurators } from '../services/api';

export default function AdminDashboard() {
  const overdue = countOverdueAssignments();
  const unwatched = countUnwatchedLectures();
  const unanswered = countUnansweredThreadsForCurators();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Overdue assignments</div>
          <div className="text-3xl font-bold">{overdue}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Unwatched lectures</div>
          <div className="text-3xl font-bold">{unwatched}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Curator threads needing reply</div>
          <div className="text-3xl font-bold">{unanswered}</div>
        </div>
      </div>
      <button
        className="px-4 py-2 bg-gray-900 text-white rounded-lg"
        onClick={() => {
          const rows = [
            ['Overdue assignments', overdue],
            ['Unwatched lectures', unwatched],
            ['Curator threads needing reply', unanswered],
          ];
          const csv = rows.map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'admin-report.csv';
          a.click();
          URL.revokeObjectURL(url);
        }}
      >Export CSV</button>
    </div>
  );
}


