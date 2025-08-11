import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchLectureById, markLectureComplete, isLectureCompleted, fetchMaterialsByLecture, fetchAssignmentsByLecture } from '../services/api';
import Tabs from '../components/Tabs.jsx';
import Breadcrumbs from '../components/Breadcrumbs.jsx';

export default function LecturePage() {
  const { lectureId } = useParams();
  const [lecture, setLecture] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    fetchLectureById(lectureId).then(setLecture);
    setCompleted(isLectureCompleted(lectureId));
    fetchMaterialsByLecture(lectureId).then(setMaterials);
    fetchAssignmentsByLecture(lectureId).then(setAssignments);
  }, [lectureId]);

  if (!lecture) return <div className="text-gray-500">Loading...</div>;

  const onComplete = () => {
    markLectureComplete(lectureId);
    setCompleted(true);
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ to: '/', label: 'Dashboard' }, { to: `/module/${lecture.moduleId}`, label: 'Module' }, { label: lecture.title }]} />
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{lecture.title}</h1>
        <button
          onClick={onComplete}
          disabled={completed}
          className={`px-4 py-2 rounded-lg text-white ${completed ? 'bg-gray-400 cursor-default' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {completed ? 'Completed' : 'Mark as Complete'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <Tabs tabs={["Video Lecture", "Materials", "Tasks"]} value={tab} onChange={setTab} />
      </div>

      {tab === 0 && (
        <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video">
          <video controls src={lecture.videoUrl} className="w-full h-full" />
        </div>
      )}
      {tab === 1 && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Materials</div>
          {materials.length === 0 ? (
            <div className="text-gray-500 text-sm">No materials</div>
          ) : (
            <ul className="list-disc list-inside text-sm text-blue-700">
              {materials.map(m => (
                <li key={m.id}>
                  {m.type === 'link' ? (
                    <a href={m.url} target="_blank" rel="noreferrer" className="underline">{m.title}</a>
                  ) : (
                    <a href={m.url} className="underline">{m.title}</a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {tab === 2 && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Tasks</div>
          {assignments.length === 0 ? (
            <div className="text-gray-500 text-sm">No tasks</div>
          ) : (
            <ul className="space-y-3">
              {assignments.map(a => (
                <li key={a.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    <div className="text-xs text-gray-500">Deadline: {new Date(a.deadlineISO).toLocaleDateString()}</div>
                  </div>
                  <a href={`#/assignment/${a.id}`} className="btn-primary text-sm">Submit</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


