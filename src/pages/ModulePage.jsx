import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import apiClient from '../services/api';
import ProgressBar from '../components/ProgressBar';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Skeleton from '../components/Skeleton.jsx';

export default function ModulePage() {
  const { moduleId } = useParams();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadModuleData();
  }, [moduleId]);

  const loadModuleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: We need course context for the new API, this is a limitation
      // For now, we'll show a message that this page needs course context
      console.warn('ModulePage needs course context to work with new API');
      
      // Mock module data for now
      setModule({
        id: moduleId,
        title: 'Module ' + moduleId,
        description: 'This module page needs course context to work with the new API',
        courseId: 'unknown'
      });
      setLessons([]);
      setProgress(0);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to load module data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLessonStatus = (lessonId) => {
    // Default status for now
    return 'not-started';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-80" />
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-4" />
          <div className="card p-5">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-2 w-full" />
          </div>
        </div>
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-5">
                <Skeleton className="h-16 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">Error loading module</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadModuleData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ to: '/dashboard', label: 'Dashboard' }, { to: `/courses`, label: 'Courses' }, { label: module.title }]} />
      
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <h3 className="font-semibold text-yellow-800">⚠️ Module page needs updating</h3>
        <p className="text-yellow-700 text-sm">
          This page needs course context to work with the new API. Please navigate to modules through the course overview page.
        </p>
        <Link 
          to="/courses" 
          className="mt-2 inline-block px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
        >
          Go to Courses
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{module.title}</h1>
        <p className="text-gray-600 mt-1">{module.description}</p>
        {user?.role === 'student' && (
          <div className="mt-4 card p-5">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Module Progress</span>
              <span>{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Lessons</h2>
        {lessons.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No lessons available</p>
            <p className="text-sm mt-2">Navigate through the course overview to access lessons</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lessons.map((lesson, idx) => (
              <div key={lesson.id} className="card p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-lg">{lesson.title}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="opacity-60">▶</span> 
                        {lesson.content_type || 'Video lesson'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="opacity-60">⏱</span> 
                        {lesson.duration_minutes || 0} minutes
                      </span>
                    </div>
                  </div>
                </div>
                <Link 
                  to={`/lecture/${lesson.id}`} 
                  className="btn-primary text-sm"
                >
                  {getLessonStatus(lesson.id) === 'completed' ? 'Review' : 'Start'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


