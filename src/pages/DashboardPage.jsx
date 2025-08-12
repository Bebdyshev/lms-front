import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import SummaryCard from '../components/SummaryCard';
import CourseCard from '../components/CourseCard';
import apiClient from '../services/api';
import Skeleton from '../components/Skeleton.jsx';

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await apiClient.getDashboardStats();
      setDashboardData(data);
    } catch (err) {
      setError(err.message);
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
  const stats = dashboardData?.stats || {};
  const recentCourses = dashboardData?.recent_courses || [];

  return (
    <div className="pl-32 pr-8 pt-4 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Welcome back, {firstName}!</h2>
        <p className="text-gray-600 text-base">Continue your learning journey with Master Education</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <SummaryCard
          icon="/assets/book.svg"
          value={user?.role === 'student' ? stats.enrolled_courses || 0 : stats.total_courses || 0}
          label={user?.role === 'student' ? "Enrolled Courses" : "Total Courses"}
        />
        <SummaryCard
          icon="/assets/clock.svg"
          value={user?.role === 'student' ? `${stats.total_study_time_hours || 0}h` : `${stats.total_students || 0}`}
          label={user?.role === 'student' ? "Total Study Time" : "Total Students"}
        />
        <SummaryCard
          icon="/assets/chart.svg"
          value={user?.role === 'student' ? `${stats.average_progress || 0}%` : `${stats.total_enrollments || 0}`}
          label={user?.role === 'student' ? "Avg. Progress" : "Active Enrollments"}
        />
      </div>

      <div className="mt-12">
        <h3 className="text-2xl font-semibold mb-4">
          {user?.role === 'student' ? 'My Courses' : 'Recent Courses'}
        </h3>
        {recentCourses.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No courses available</p>
            {user?.role === 'teacher' && (
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
                key={course.id || course.course_id}
                course={{
                  id: course.id || course.course_id,
                  title: course.title || course.course_title,
                  teacher: course.teacher || course.teacher_name,
                  progress: course.progress || course.completion_percentage || 0,
                  status: course.status,
                  image: course.cover_image || course.cover_image_url,
                  modulesCount: course.total_modules || course.modulesCount || 0
                }}
                onContinue={id => navigate(`/course/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
