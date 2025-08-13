import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import apiClient from '../services/api';
import EmptyState from '../components/EmptyState';
import { BookOpen, Plus, Users, Settings, AlertCircle } from 'lucide-react';
import CreateCourseModal from '../components/CreateCourseModal.tsx';

interface CourseWithStats {
  id: number;
  title: string;
  description?: string;
  teacher_id: number;
  teacher_name?: string;
  created_at: string;
  cover_image_url?: string;
  modules_count?: number;
  students_count?: number;
  completed_count?: number;
  avg_progress?: number;
  last_activity?: string;
  status?: 'active' | 'draft' | 'archived';
}

export default function TeacherCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError('');

      // Get courses for this teacher
      const coursesData = await apiClient.getCourses();
      
      // Filter courses for current teacher if needed
      const teacherCourses = user?.role === 'admin' 
        ? coursesData 
        : coursesData.filter((course: any) => course.teacher_id === user?.id);

      // Enhance with additional stats if available
      const coursesWithStats = await Promise.all(
        teacherCourses.map(async (course: any) => {
          try {
            // Try to get modules count
            const modules = await apiClient.getCourseModules(course.id);
            const modulesCount = modules?.length || 0;

            // Try to get course progress aggregate
            let studentsCount = 0;
            let completedCount = 0;
            let avgProgress = 0;
            let lastActivity: string | undefined = undefined;
            try {
              const progressResp: any = await apiClient.getCourseProgress(String(course.id));
              const records: any[] = Array.isArray(progressResp)
                ? progressResp
                : (progressResp?.records || progressResp?.data || progressResp?.students || []);
              studentsCount = records.length;
              if (studentsCount > 0) {
                let total = 0;
                let latest = 0;
                for (const r of records) {
                  const pct = Number(r.completion_percentage ?? r.progress ?? r.overall_progress ?? 0);
                  total += isNaN(pct) ? 0 : pct;
                  if (pct >= 100) completedCount += 1;
                  const ts = new Date(r.last_accessed || r.updated_at || r.completed_at || r.created_at || Date.now()).getTime();
                  if (ts > latest) latest = ts;
                }
                avgProgress = Math.round(total / studentsCount);
                if (latest) lastActivity = new Date(latest).toISOString();
              }
            } catch (err) {
              // Fallbacks if progress API not available
              studentsCount = 0;
              completedCount = 0;
              avgProgress = 0;
            }

            return {
              ...course,
              modules_count: modulesCount,
              students_count: studentsCount,
              completed_count: completedCount,
              avg_progress: avgProgress,
              last_activity: lastActivity,
              status: ((course as any).status || ((course as any).is_active ? 'active' : 'draft')) as 'active' | 'draft' | 'archived'
            };
          } catch (err) {
            console.warn('Could not load additional stats for course', course.id);
            return {
              ...course,
              modules_count: 0,
              students_count: 0,
              completed_count: 0,
              avg_progress: 0,
              status: ((course as any).status || ((course as any).is_active ? 'active' : 'draft')) as 'active' | 'draft' | 'archived'
            };
          }
        })
      );

      setCourses(coursesWithStats);
    } catch (err) {
      setError('Failed to load courses');
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="bg-white rounded-2xl shadow-card p-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={loadCourses}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <BookOpen className="w-8 h-8 mr-3 text-blue-600" />
          My Courses
        </h1>
        <div className="flex gap-3">
          <button 
            onClick={() => setCreateOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Course
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <BookOpen className="w-6 h-6 text-blue-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Total Courses</div>
              <div className="text-xl font-bold">{courses.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-green-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Total Students</div>
              <div className="text-xl font-bold">
                {courses.reduce((sum, course) => sum + (course.students_count || 0), 0)}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Settings className="w-6 h-6 text-purple-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Total Modules</div>
              <div className="text-xl font-bold">
                {courses.reduce((sum, course) => sum + (course.modules_count || 0), 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyState 
          title="No courses yet" 
          subtitle="Create your first course to start teaching"
        />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Course Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage your courses and track progress</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Course</th>
                  <th className="text-left px-6 py-3 font-medium">Modules</th>
                  <th className="text-left px-6 py-3 font-medium">Students</th>
                  <th className="text-left px-6 py-3 font-medium">Completed</th>
                  <th className="text-left px-6 py-3 font-medium">Avg Progress</th>
                  <th className="text-left px-6 py-3 font-medium">Last Activity</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-md bg-gray-100 overflow-hidden flex items-center justify-center text-gray-500 text-xs">
                          {course.cover_image_url ? (
                            <img src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-medium">{course.title?.slice(0,1)?.toUpperCase() || 'C'}</span>
                          )}
                        </div>
                        <div className="font-medium text-gray-900">{course.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{course.modules_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{course.students_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{course.completed_count || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{course.avg_progress ?? 0}%</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <span className="font-medium">{course.last_activity ? new Date(course.last_activity).toLocaleDateString() : '-'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        course.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : course.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {course.status || 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <Link 
                          to={`/course/${course.id}`}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          View
                        </Link>
                        <Link 
                          to={`/teacher/course/${course.id}/builder`}
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs"
                        >
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CreateCourseModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => loadCourses()}
      />
    </div>
  );
}


