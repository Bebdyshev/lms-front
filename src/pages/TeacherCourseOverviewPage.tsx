import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import CourseSidebar from '../components/CourseSidebar';
import type { Course } from '../types';
import { Users, BookOpen, Clock, TrendingUp, Calendar } from 'lucide-react';

export default function TeacherCourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalModules: 0,
    totalLessons: 0,
    averageProgress: 0,
    completionRate: 0
  });

  useEffect(() => {
    if (!courseId) return;
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId) return;
    
    try {
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      
      // TODO: Fetch actual stats from API
      // For now, using mock data
      setStats({
        totalStudents: 24,
        activeStudents: 18,
        totalModules: 5,
        totalLessons: 23,
        averageProgress: 67,
        completionRate: 75
      });
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  if (!course) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Course Navigation Panel */}
      <div className="w-64 bg-white rounded-lg border flex-shrink-0 h-full">
        <CourseSidebar 
          courseTitle={course.title}
          courseId={courseId}
          coverImageUrl={course.image}
          isActive={course.is_active}
          onSave={() => {}}
          hasUnsavedChanges={false}
          pendingChangesCount={0}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Course Overview</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Last updated</span>
                <span className="text-sm font-medium">2 hours ago</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-green-600">+12% from last month</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Students</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-600">{Math.round((stats.activeStudents / stats.totalStudents) * 100)}% of total</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Course Content</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalModules} modules</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-600">{stats.totalLessons} lessons total</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm">
                  <span className="text-gray-600">Avg. progress: {stats.averageProgress}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Course Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Course Information</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-sm text-gray-600">December 15, 2024</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Duration</p>
                    <p className="text-sm text-gray-600">{course.estimated_duration_minutes || 0} minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Status</p>
                    <p className="text-sm text-gray-600">{course.is_active ? 'Active' : 'Draft'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">New student enrolled</p>
                    <p className="text-sm text-gray-600">2 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Module completed</p>
                    <p className="text-sm text-gray-600">4 hours ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Course updated</p>
                    <p className="text-sm text-gray-600">1 day ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
