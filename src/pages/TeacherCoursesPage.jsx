import React, { useEffect, useState } from 'react';
import { fetchCourses } from '../services/api';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';

export default function TeacherCoursesPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { fetchCourses().then(setItems); }, []);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Courses</h1>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">New course</button>
      </div>
      {items.length === 0 ? (
        <EmptyState title="No courses yet" subtitle="Create your first course" />
      ) : (
        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Modules</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => (
                <tr key={c.id} className="border-t">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-gray-600">{c.modulesCount}</td>
                  <td className="px-4 py-3">
                    <Link className="px-3 py-1.5 bg-gray-900 text-white rounded-lg" to={`/teacher/course/${c.id}/builder`}>Open builder</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


