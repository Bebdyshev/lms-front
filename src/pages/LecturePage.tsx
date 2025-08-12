import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import apiClient from "../services/api";
import Tabs from '../components/Tabs.tsx';
import Breadcrumbs from '../components/Breadcrumbs.tsx';
import Skeleton from '../components/Skeleton.tsx';
import type { Lesson, Assignment, LessonMaterial } from '../types';

export default function LecturePage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [completed, setCompleted] = useState<boolean>(false);
  const [materials, setMaterials] = useState<LessonMaterial[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [tab, setTab] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLessonData();
  }, [lectureId]);

  const loadLessonData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!lectureId) return;

      // Load lesson data
      const lessonData = await apiClient.getLesson(lectureId);
      setLesson(lessonData);

      // Load materials and assignments in parallel
      const [materialsData, assignmentsData] = await Promise.all([
        apiClient.getLessonMaterials(lectureId),
        apiClient.getAssignments({ lesson_id: lectureId })
      ]);

      setMaterials(materialsData);
      setAssignments(assignmentsData);

      // Check if lesson is completed (for students)
      if (user?.role === 'student') {
        try {
          const progressData = await apiClient.getMyProgress({ lesson_id: lectureId });
          const lessonProgress = progressData.find((p: any) => p.lesson_id === parseInt(lectureId));
          setCompleted(lessonProgress?.status === 'completed');
        } catch (err) {
          console.warn('Failed to load progress:', err);
          setCompleted(false);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lesson data';
      setError(errorMessage);
      console.error('Failed to load lesson data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onComplete = async () => {
    if (!lectureId) return;
    
    try {
      await apiClient.markLessonComplete(lectureId);
      setCompleted(true);
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-80" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="bg-gray-100 rounded-2xl aspect-video">
          <Skeleton className="w-full h-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">Error loading lesson</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadLessonData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return <div className="text-gray-500">Lesson not found</div>;
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { to: '/dashboard', label: 'Dashboard' }, 
        { to: '/courses', label: 'Courses' }, 
        { label: lesson.title }
      ]} />
      
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        {user?.role === 'student' && (
          <button
            onClick={onComplete}
            disabled={completed}
            className={`px-4 py-2 rounded-lg text-white ${
              completed ? 'bg-gray-400 cursor-default' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {completed ? 'Completed' : 'Mark as Complete'}
          </button>
        )}
      </div>

      {lesson.description && (
        <p className="text-gray-600">{lesson.description}</p>
      )}

      <div className="flex items-center justify-between">
        <Tabs tabs={["Content", "Materials", "Assignments"]} value={tab} onChange={setTab} />
      </div>

      {tab === 0 && (
        <div className="space-y-4">
          {lesson.content_type === 'video' && lesson.video_url ? (
            <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video">
              {lesson.video_url.includes('youtube.com') || lesson.video_url.includes('youtu.be') ? (
                <iframe
                  src={lesson.video_url.replace('watch?v=', 'embed/')}
                  className="w-full h-full"
                  allowFullScreen
                  title={lesson.title}
                />
              ) : (
                <video controls src={lesson.video_url} className="w-full h-full" />
              )}
            </div>
          ) : (
            <div className="card p-6">
              <div className="prose max-w-none">
                {lesson.content_text ? (
                  <div dangerouslySetInnerHTML={{ __html: lesson.content_text }} />
                ) : (
                  <p className="text-gray-500">No content available for this lesson</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 1 && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Materials</div>
          {materials.length === 0 ? (
            <div className="text-gray-500 text-sm">No materials available</div>
          ) : (
            <ul className="space-y-2">
              {materials.map(material => (
                <li key={material.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{material.title}</div>
                    <div className="text-sm text-gray-500">
                      {material.file_type} • {material.file_size_bytes ? 
                        `${Math.round(material.file_size_bytes / 1024)} KB` : 
                        'Unknown size'
                      }
                    </div>
                  </div>
                  <a 
                    href={material.file_url} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="btn-secondary text-sm"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 2 && (
        <div className="card p-5">
          <div className="font-semibold mb-3">Assignments</div>
          {assignments.length === 0 ? (
            <div className="text-gray-500 text-sm">No assignments for this lesson</div>
          ) : (
            <ul className="space-y-3">
              {assignments.map(assignment => (
                <li key={assignment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{assignment.title}</div>
                    <div className="text-sm text-gray-600">{assignment.description}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      Type: {assignment.assignment_type} • Max Score: {assignment.max_score}
                      {assignment.time_limit_minutes && (
                        <span> • Time Limit: {assignment.time_limit_minutes} minutes</span>
                      )}
                    </div>
                  </div>
                  <a 
                    href={`/assignment/${assignment.id}`} 
                    className="btn-primary text-sm"
                  >
                    {user?.role === 'student' ? 'Start Assignment' : 'View Assignment'}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}


