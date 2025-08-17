import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import type { AdminDashboard as AdminDashboardType } from '../types';
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  UserCheck, 
  TrendingUp,
  Calendar,
  Plus,
  Settings,
  UserPlus,
  Shield,
  Activity,
  BarChart3
} from 'lucide-react';
import Loader from '../components/Loader';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<AdminDashboardType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.getAdminDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader size="xl" animation="spin" color="#2563eb" />;
  }

  if (!dashboard) {
    return <div className="text-center py-8">Failed to load dashboard</div>;
  }

  const { stats, recent_users, recent_groups, recent_courses } = dashboard;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Shield className="w-8 h-8 mr-3 text-blue-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-600 mt-1">System overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
          <button
            onClick={() => navigate('/admin/groups')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total_users}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              +{stats.recent_registrations} new this week
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Students</p>
              <p className="text-3xl font-bold text-green-600">{stats.total_students}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {stats.total_active_enrollments} active enrollments
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Teachers</p>
              <p className="text-3xl font-bold text-purple-600">{stats.total_teachers}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              Managing {stats.total_courses} courses
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Courses</p>
              <p className="text-3xl font-bold text-orange-600">{stats.total_courses}</p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {stats.total_curators} curators
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Users className="w-5 h-5 mr-2 text-blue-600" />
              Recent Users
            </h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recent_users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  user.role === 'admin' ? 'bg-red-100 text-red-700' :
                  user.role === 'teacher' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'curator' ? 'bg-blue-100 text-blue-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Groups */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-green-600" />
              Recent Groups
            </h2>
            <button
              onClick={() => navigate('/admin/users')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recent_groups.map((group) => (
              <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{group.name}</p>
                  <p className="text-xs text-gray-500">
                    {group.teacher_name} • {group.student_count} students
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  group.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {group.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-orange-600" />
              Recent Courses
            </h2>
            <button
              onClick={() => navigate('/teacher/courses')}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {recent_courses.map((course) => (
              <div key={course.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{course.title}</p>
                  <p className="text-xs text-gray-500">
                    {course.teacher_name} • {course.module_count} modules
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  course.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {course.is_active ? 'Active' : 'Draft'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/admin/users')}
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="font-medium">Manage Users</p>
              <p className="text-sm text-gray-500">Add, edit, or remove users</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/groups')}
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <GraduationCap className="w-5 h-5 text-green-600" />
            <div className="text-left">
              <p className="font-medium">Manage Groups</p>
              <p className="text-sm text-gray-500">Create and organize groups</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/teacher/courses')}
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-orange-600" />
            <div className="text-left">
              <p className="font-medium">View Courses</p>
              <p className="text-sm text-gray-500">Monitor course activity</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/admin/users?role=student')}
            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="font-medium">Student Progress</p>
              <p className="text-sm text-gray-500">Track learning analytics</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
