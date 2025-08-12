import { useEffect, useState } from 'react';
import { fetchLecturesByModule, fetchAssignmentsByLecture, getAssignmentStatusForStudent } from "../services/api";
import type { Assignment, AssignmentStatus } from '../types';


interface AssignmentItem extends Assignment {
  lectureTitle?: string;
  status?: AssignmentStatus | string;
  deadlineISO?: string;
}

export default function AssignmentsPage() {
  const [items, setItems] = useState<AssignmentItem[]>([]);

  useEffect(() => {
    async function load() {
      const lectures = await fetchLecturesByModule('mod-1');
      const all = await Promise.all(
        lectures.map(l => fetchAssignmentsByLecture(l.id))
      );
      setItems(
        all
          .flat()
          .map(a => ({
            ...a,
            lectureTitle: lectures.find(l => l.id === a.lectureId)?.title,
            status: getAssignmentStatusForStudent(a.id),
          }))
      );
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Assignments</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-3">Title</th>
              <th className="text-left px-4 py-3">Lecture</th>
              <th className="text-left px-4 py-3">Deadline</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map(a => (
              <tr key={a.id} className="border-t">
                <td className="px-4 py-3 font-medium">{a.title}</td>
                <td className="px-4 py-3 text-gray-600">{a.lectureTitle}</td>
                <td className="px-4 py-3 text-gray-600">{a.deadlineISO ? new Date(a.deadlineISO).toLocaleDateString() : 'No deadline'}</td>
                <td className="px-4 py-3 text-gray-600">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    typeof a.status === 'object' && a.status?.status === 'graded' ? 'bg-green-100 text-green-800' : 
                    typeof a.status === 'object' && a.status?.status === 'submitted' ? 'bg-blue-100 text-blue-800' : 
                    typeof a.status === 'object' && a.status?.status === 'resubmission-allowed' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {typeof a.status === 'object' ? a.status?.status : a.status || 'not-submitted'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <a className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg" href={`#/assignment/${a.id}`}>Submit</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


