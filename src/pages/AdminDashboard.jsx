import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import apiClient from '../services/api';
import Skeleton from '../components/Skeleton.jsx';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadAdminStats();
  }, []);

  const loadAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const adminStats = await apiClient.getAdminStats();
      setStats(adminStats);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-60" />
        <div className="grid md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">Error loading admin stats</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadAdminStats}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Total Users</div>
          <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Students</div>
          <div className="text-3xl font-bold">{stats?.total_students || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Teachers</div>
          <div className="text-3xl font-bold">{stats?.total_teachers || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Total Courses</div>
          <div className="text-3xl font-bold">{stats?.total_courses || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Active Enrollments</div>
          <div className="text-3xl font-bold">{stats?.total_active_enrollments || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Curators</div>
          <div className="text-3xl font-bold">{stats?.total_curators || 0}</div>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-4">
          <div className="text-sm text-gray-600">Recent Registrations</div>
          <div className="text-3xl font-bold">{stats?.recent_registrations || 0}</div>
          <div className="text-xs text-gray-500">Last 7 days</div>
        </div>
      </div>
      
      <div className="flex gap-4">
        <button
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
          onClick={() => {
            if (!stats) return;
            
            const rows = [
              ['Metric', 'Value'],
              ['Total Users', stats.total_users],
              ['Students', stats.total_students],
              ['Teachers', stats.total_teachers],
              ['Curators', stats.total_curators],
              ['Total Courses', stats.total_courses],
              ['Active Enrollments', stats.total_active_enrollments],
              ['Recent Registrations', stats.recent_registrations],
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'admin-stats.csv';
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export Stats CSV
        </button>
        
        <button
          onClick={loadAdminStats}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Stats
        </button>
      </div>
    </div>
  );
}


