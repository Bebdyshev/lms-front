import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import apiClient from '../services/api';
import ProgressBar from '../components/ProgressBar';
import Breadcrumbs from '../components/Breadcrumbs.jsx';
import Skeleton from '../components/Skeleton.jsx';

export default function CourseOverviewPage() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load course details and modules in parallel
      const [courseData, modulesData] = await Promise.all([
        apiClient.getCourse(courseId),
        apiClient.getCourseModules(courseId)
      ]);

      setCourse(courseData);
      setModules(modulesData);

      // Calculate progress based on user role
      if (user?.role === 'student') {
        try {
          const progressData = await apiClient.getCourseProgress(courseId);
          setProgress(progressData.completion_percentage || 0);
        } catch (err) {
          console.warn('Failed to load progress:', err);
          setProgress(0);
        }
      }
    } catch (err) {
      setError(err.message);
      console.error('Failed to load course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getModuleStatus = (moduleId) => {
    // For now, return a default status. This can be enhanced with actual progress data
    return 'not-started';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-6 w-80" />
        <div className="flex items-start gap-6">
          <Skeleton className="w-56 h-36 rounded-xl" />
          <div className="flex-1">
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-5 w-96 mb-4" />
            <div className="card p-5">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
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
          <h3 className="font-semibold text-red-800">Error loading course</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadCourseData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return <div className="text-gray-500">Course not found</div>;
  }

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ to: '/dashboard', label: 'Dashboard' }, { label: course.title }]} />
      <div className="flex items-start gap-6">
        {course.cover_image_url && (
          <img src={course.cover_image_url} alt="" className="w-56 h-36 object-cover rounded-xl" />
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-gray-600 mt-1">{course.description}</p>
          <div className="text-sm text-gray-500 mt-2">
            Teacher: {course.teacher_name}
          </div>
          {user?.role === 'student' && (
            <div className="mt-4 card p-5">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Course Progress</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Course Modules</h2>
        {modules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No modules available for this course</p>
            {user?.role === 'teacher' && (
              <p className="text-sm mt-2">Use the course builder to add modules and lessons</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module, idx) => {
              const status = getModuleStatus(module.id);
              return (
                <div key={module.id} className="card p-5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-semibold">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-lg">{module.title}</div>
                        <div className="text-sm text-gray-600">
                          {module.description}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-3 mt-1">
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-60">📚</span> 
                            {module.total_lessons || 0} lessons
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <span className="opacity-60">🎯</span> 
                            Module {idx + 1}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      status === 'completed' ? 'bg-green-100 text-green-800' : 
                      status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {status.replace('-', ' ')}
                    </span>
                    <Link 
                      to={`/module/${module.id}`} 
                      className="btn-secondary text-sm"
                    >
                      {status === 'not-started' ? 'Start' : 
                       status === 'completed' ? 'Review' : 'Continue'}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}


