import { useEffect, useState } from 'react';
import { getPendingSubmissions, gradeSubmission, allowResubmission } from "../services/api";
import { toast } from '../components/Toast.tsx';

interface PendingSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  createdAt: string;
}

export default function TeacherDashboard() {
  const [pending, setPending] = useState<PendingSubmission[]>([]);

  useEffect(() => {
    getPendingSubmissions().then((submissions: PendingSubmission[]) => setPending(submissions));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
      <div>
        <a href="#/teacher/courses" className="px-4 py-2 bg-gray-900 text-white rounded-lg">Go to Courses</a>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-sm text-gray-600">Pending submissions</div>
          <div className="text-3xl font-bold">{pending.length}</div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Submission ID</th>
              <th className="text-left px-4 py-3">Assignment</th>
              <th className="text-left px-4 py-3">Student</th>
              <th className="text-left px-4 py-3">Created</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.map(p => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">{p.id}</td>
                <td className="px-4 py-3">{p.assignmentId}</td>
                <td className="px-4 py-3">{p.studentId}</td>
                <td className="px-4 py-3">{new Date(p.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                    onClick={async () => { await gradeSubmission(p.id, 90, 'Good job'); setPending(await getPendingSubmissions()); toast('Graded 90', 'success'); }}
                  >Grade 90</button>
                  <button
                    className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
                    onClick={async () => { await allowResubmission(p.id); setPending(await getPendingSubmissions()); toast('Resubmission allowed', 'info'); }}
                  >Allow resubmission</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


