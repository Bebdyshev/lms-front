import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCourseById, fetchModulesByCourse, getCourseProgress, getModuleStatus } from '../services/api';
import ProgressBar from '../components/ProgressBar';
import Breadcrumbs from '../components/Breadcrumbs.jsx';

export default function CourseOverviewPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);

  useEffect(() => {
    fetchCourseById(courseId).then(setCourse);
    fetchModulesByCourse(courseId).then(setModules);
  }, [courseId]);

  const progress = useMemo(() => getCourseProgress(courseId), [courseId]);

  if (!course) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ to: '/', label: 'Dashboard' }, { label: course.title }]} />
      <div className="flex items-start gap-6">
        {course.image && (
          <img src={course.image} alt="" className="w-56 h-36 object-cover rounded-xl" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-gray-600 mt-1">{course.description}</p>
          <div className="mt-4 card p-5">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Course Progress</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Course Modules</h2>
        <div className="space-y-4">
          {modules.map((m, idx) => (
            <div key={m.id} className="card p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-lg">{m.title}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><span className="opacity-60">▶</span> Video lecture</span>
                      <span className="inline-flex items-center gap-1"><span className="opacity-60">⏱</span> 60 minutes</span>
                      <span className="inline-flex items-center gap-1"><span className="opacity-60">✓</span> Completed</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getModuleStatus(m.id) === 'completed' ? 'bg-green-100 text-green-800' : getModuleStatus(m.id) === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{getModuleStatus(m.id).replace('-', ' ')}</span>
                <Link to={`/module/${m.id}`} className="btn-secondary text-sm">{getModuleStatus(m.id) === 'not-started' ? 'Start' : getModuleStatus(m.id) === 'completed' ? 'Review' : 'Continue'}</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


