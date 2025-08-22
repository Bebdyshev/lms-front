import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
// import SummaryCard from '../components/SummaryCard';
// import CourseCard from '../components/CourseCard';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import apiClient from "../services/api";
import Skeleton from '../components/Skeleton.tsx';
import type { DashboardStats, Course, User } from '../types';

interface DashboardData {
  user?: User;
  stats?: DashboardStats;
  recent_courses?: Course[];
  recent_activity?: any[];
}



export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
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
  if (user?.role === 'admin') {
    return <AdminDashboard />;
  }
  
  if (isTeacher()) {
    return <TeacherDashboard />;
  }

  return (
    <StudentDashboard
      firstName={firstName}
      stats={stats}
      recentCourses={recentCourses}
      recentActivity={dashboardData?.recent_activity || []}
      onContinueCourse={(id: string) => navigate(`/course/${id}`)}
      onGoToAllCourses={() => navigate('/courses')}
    />
  );
}
