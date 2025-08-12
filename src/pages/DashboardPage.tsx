import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import SummaryCard from '../components/SummaryCard';
import CourseCard from '../components/CourseCard';
import TeacherDashboard from './TeacherDashboard.tsx';
import apiClient from "../services/api";
import Skeleton from '../components/Skeleton.tsx';
import { Users, BookOpen, GraduationCap, Shield, UserPlus } from 'lucide-react';
import type { DashboardStats, Course, User } from '../types';

interface DashboardData {
  user?: User;
  stats?: DashboardStats;
  recent_courses?: Course[];
  recent_activity?: any[];
}

interface AdminStats {
  total_users: number;
  total_courses: number;
  total_enrollments: number;
  active_users: number;
  total_students: number;
  total_teachers: number;
  recent_registrations: number;
  total_curators: number;
  total_active_enrollments: number;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isTeacher } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, [user?.role]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Загружаем основные данные дашборда
      const data = await apiClient.getDashboardStats();
      setDashboardData(data as DashboardData);

      // Если пользователь админ, загружаем дополнительную статистику
      if (user?.role === 'admin') {
        try {
          const adminData = await apiClient.getAdminStats();
          setAdminStats(adminData);
        } catch (adminErr) {
          console.warn('Failed to load admin stats:', adminErr);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(errorMessage);
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="pl-32 pr-8 pt-4 space-y-8">
        <div>
          <Skeleton className="h-8 w-80 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6">
              <Skeleton className="h-16 w-16 mb-4" />
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-40 mb-4" />
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-3 w-full mb-4" />
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pl-32 pr-8 pt-4">
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">Error loading dashboard</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadDashboardData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstName = dashboardData?.user?.name || user?.name?.split(' ')[0] || 'User';
  const stats = dashboardData?.stats || {} as DashboardStats;
  const recentCourses = dashboardData?.recent_courses || [];

  // Role-based dashboards
  if (isTeacher()) {
    return <TeacherDashboard />;
  }

  return (
    <div className="pl-32 pr-8 pt-4 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Welcome back, {firstName}!</h2>
        <p className="text-gray-600 text-base">Continue your learning journey with Master Education</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <SummaryCard
          icon="/assets/book.svg"
          value={user?.role === 'student' ? stats.courses_count || 0 : stats.courses_count || 0}
          label={user?.role === 'student' ? "Enrolled Courses" : "Total Courses"}
        />
        <SummaryCard
          icon="/assets/clock.svg"
          value={user?.role === 'student' ? `${Math.round((stats.total_study_time || 0) / 60)}h` : `${stats.courses_count || 0}`}
          label={user?.role === 'student' ? "Total Study Time" : "Total Students"}
        />
        <SummaryCard
          icon="/assets/chart.svg"
          value={user?.role === 'student' ? `${stats.overall_progress || 0}%` : `${stats.assignments_pending || 0}`}
          label={user?.role === 'student' ? "Avg. Progress" : "Active Enrollments"}
        />
      </div>

      {/* Admin Statistics Section */}
      {user?.role === 'admin' && adminStats && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-blue-600" />
                Platform Administration
              </h3>
              <p className="text-sm text-gray-600 mt-1">System overview and management tools</p>
            </div>
            <button
              onClick={loadDashboardData}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{adminStats.total_users}</div>
                  <div className="text-xs text-gray-600">Total Users</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center">
                <GraduationCap className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{adminStats.total_students}</div>
                  <div className="text-xs text-gray-600">Students</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center">
                <BookOpen className="w-8 h-8 text-purple-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{adminStats.total_teachers}</div>
                  <div className="text-xs text-gray-600">Teachers</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center">
                <UserPlus className="w-8 h-8 text-orange-600 mr-3" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">{adminStats.recent_registrations}</div>
                  <div className="text-xs text-gray-600">New (7d)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Manage Users
            </button>
            <button
              onClick={() => {
                if (!adminStats) return;
                
                const rows = [
                  ['Metric', 'Value'],
                  ['Total Users', adminStats.total_users],
                  ['Students', adminStats.total_students],
                  ['Teachers', adminStats.total_teachers],
                  ['Curators', adminStats.total_curators],
                  ['Total Courses', adminStats.total_courses],
                  ['Active Enrollments', adminStats.total_active_enrollments],
                  ['Recent Registrations', adminStats.recent_registrations],
                ];
                const csv = rows.map(r => r.join(',')).join('\\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'admin-stats.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Export Data
            </button>
          </div>
        </div>
      )}

      <div className="mt-12">
        <h3 className="text-2xl font-semibold mb-4">
          {user?.role === 'student' ? 'My Courses' : 'Recent Courses'}
        </h3>
        {recentCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No courses available</p>
            {isTeacher() && (
              <button 
                onClick={() => navigate('/teacher/courses')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Create Your First Course
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCourses.map(course => (
              <CourseCard
                key={course.id}
                course={{
                  id: course.id,
                  title: course.title,
                  teacher: course.teacher?.name || 'Unknown',
                  progress: 0,
                  status: 'active',
                  image: course.image,
                  modulesCount: 0
                }}
                onContinue={(id: string) => navigate(`/course/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
