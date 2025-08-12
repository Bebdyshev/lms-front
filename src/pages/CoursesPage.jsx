import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton.jsx';
import apiClient from '../services/api';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let coursesData;
      if (user?.role === 'student') {
        // For students, get their enrolled courses
        coursesData = await apiClient.getMyCourses();
        // Transform the data to match Card component expectations
        coursesData = coursesData.map(course => ({
          id: course.course_id,
          title: course.course_title,
          teacher: course.teacher_name,
          image: course.cover_image_url,
          progress: course.completion_percentage,
          status: course.status,
          modules: course.total_modules,
          description: `${course.total_modules} modules`
        }));
      } else {
        // For teachers/admins, get all courses they have access to
        coursesData = await apiClient.getCourses();
        coursesData = coursesData.map(course => ({
          id: course.id,
          title: course.title,
          teacher: course.teacher_name,
          image: course.cover_image_url,
          description: course.description,
          modules: course.total_modules,
          duration: course.estimated_duration_minutes
        }));
      }
      
      setCourses(coursesData);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-6">
              <Skeleton className="h-40 mb-4" />
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-9 w-32" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Courses</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <h3 className="font-semibold text-red-800">Error loading courses</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={loadCourses}
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
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">
          {user?.role === 'student' ? 'My Courses' : 'All Courses'}
        </h2>
        {user?.role === 'teacher' && (
          <button 
            onClick={() => navigate('/teacher/courses')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Manage Courses
          </button>
        )}
      </div>
      
      {courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No courses available</p>
          {user?.role === 'student' && (
            <p className="text-sm mt-2">Contact your administrator to be enrolled in courses</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card
              key={course.id}
              image={course.image}
              title={course.title}
              description={course.description}
              teacher={course.teacher}
              duration={course.duration}
              modules={course.modules}
              progress={course.progress}
              status={course.status}
              actionText={user?.role === 'student' ? 'Continue Learning' : 'View Course'}
              onAction={() => navigate(`/course/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
