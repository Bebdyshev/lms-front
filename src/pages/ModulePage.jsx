import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchModuleById, fetchLecturesByModule, getModuleProgress, getLectureStatus } from '../services/api';
import ProgressBar from '../components/ProgressBar';
import Breadcrumbs from '../components/Breadcrumbs.jsx';

export default function ModulePage() {
  const { moduleId } = useParams();
  const [module, setModule] = useState(null);
  const [lectures, setLectures] = useState([]);

  useEffect(() => {
    fetchModuleById(moduleId).then(setModule);
    fetchLecturesByModule(moduleId).then(setLectures);
  }, [moduleId]);

  const progress = useMemo(() => getModuleProgress(moduleId), [moduleId]);

  if (!module) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ to: '/', label: 'Dashboard' }, { to: `/course/${module?.courseId||''}`, label: 'Course' }, { label: module.title }]} />
      <div>
        <h1 className="text-3xl font-bold">{module.title}</h1>
        <p className="text-gray-600 mt-1">{module.description}</p>
        <div className="mt-4 card p-5">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Module Progress</span>
            <span>{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Lectures</h2>
        <div className="space-y-4">
          {lectures.map((l, idx) => (
            <div key={l.id} className="card p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-medium text-lg">{l.title}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><span className="opacity-60">▶</span> Video lecture</span>
                    <span className="inline-flex items-center gap-1"><span className="opacity-60">⏱</span> 45 minutes</span>
                  </div>
                </div>
              </div>
              <Link to={`/lecture/${l.id}`} className="btn-primary text-sm">{getLectureStatus(l.id) === 'completed' ? 'Review' : 'Start'}</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


