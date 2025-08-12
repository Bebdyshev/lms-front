import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchAssignmentsByLecture, fetchLectureById, submitAssignment, getAssignmentStatusForStudent } from "../services/api";
import { toast } from '../components/Toast.tsx';
import type { Assignment, AssignmentStatus } from '../types';


export default function AssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [lectureTitle, setLectureTitle] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [status, setStatus] = useState<AssignmentStatus | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      
      const lectures = ['lec-1', 'lec-2'];
      for (const lecId of lectures) {
        const list = await fetchAssignmentsByLecture(lecId);
        const a = list.find(x => x.id === id);
        if (a) {
          setAssignment(a);
          const lec = await fetchLectureById(lecId);
          setLectureTitle(lec?.title || '');
          break;
        }
      }
    }
    load();
    if (id) {
      const statusResult = getAssignmentStatusForStudent(id);
      // Convert string result to proper status object for backwards compatibility
      if (typeof statusResult === 'string') {
        setStatus({ status: statusResult, attemptsLeft: 3, late: false });
      } else {
        setStatus(statusResult);
      }
    }
  }, [id]);

  if (!assignment) return <div className="text-gray-500">Loading...</div>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    try {
      await submitAssignment(id, { text });
      setSubmitted(true);
      const statusResult = getAssignmentStatusForStudent(id);
      // Convert string result to proper status object for backwards compatibility
      if (typeof statusResult === 'string') {
        setStatus({ status: statusResult, attemptsLeft: 3, late: false });
      } else {
        setStatus(statusResult);
      }
      toast('Assignment submitted', 'success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      toast(errorMessage, 'error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{assignment.title}</h1>
      <div className="text-gray-600">Lecture: {lectureTitle}</div>
      <p className="text-gray-700">{assignment.description}</p>
      <div className="bg-white p-5 rounded-xl shadow">
        {status && (
          <div className="mb-4 text-sm text-gray-700">
            Status: <span className="font-medium">{status.status}</span> · Attempts left: {status.attemptsLeft} {status.late && <span className="text-red-600">· Late</span>}
          </div>
        )}
        {submitted ? (
          <div className="text-green-700 font-medium">Submission received. You can resubmit once if needed.</div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Answer</label>
              <textarea
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={6}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your answer or paste a link"
              />
            </div>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Submit</button>
          </form>
        )}
      </div>
    </div>
  );
}


