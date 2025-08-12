import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import Card from '../components/Card';
import Skeleton from '../components/Skeleton.tsx';
import apiClient from "../services/api";
import type { Course } from '../types';

interface CourseCard {
  id: string;
  title: string;
  teacher: string;
  image?: string;
  progress?: number;
  status?: string;
  modules: number;
  description: string;
  duration?: number;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let coursesData: CourseCard[];
      if (user?.role === 'student') {
        // For students, get their enrolled courses
        const enrolledCourses = await apiClient.getMyCourses();
        // Transform the data to match Card component expectations
        coursesData = enrolledCourses.map((course: any) => ({
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
        const allCourses = await apiClient.getCourses();
        coursesData = allCourses.map((course: Course) => ({
          id: course.id,
          title: course.title,
          teacher: course.teacher?.name || 'Unknown',
          image: course.image,
          description: course.description,
          modules: 0, // This would need to come from API
          duration: 0 // This would need to come from API
        }));
      }
      
      setCourses(coursesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load courses';
      setError(errorMessage);
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
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Courses</h2>
        {user?.role === 'teacher' && (
          <button 
            onClick={() => navigate('/teacher/courses')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Manage Courses
          </button>
        )}
      </div>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No courses available</p>
          {user?.role === 'student' && (
            <p className="text-sm mt-2">Contact your teacher to get enrolled in courses</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card
              key={course.id}
              title={course.title}
              description={course.description}
              image={course.image}
              teacher={course.teacher}
              duration={course.duration}
              actionText={user?.role === 'student' ? 'Continue Learning' : 'View Course'}
              onAction={() => navigate(`/course/${course.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
