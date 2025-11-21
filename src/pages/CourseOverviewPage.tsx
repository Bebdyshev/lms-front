import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ChevronRight, Play, FileText, HelpCircle, Clock, Users } from 'lucide-react';
import apiClient from '../services/api';
import type { Course, Lesson } from '../types';

export default function CourseOverviewPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${remainingMinutes} minutes`;
  };

  useEffect(() => {
    if (courseId) {
      loadCourseData();
    }
  }, [courseId]);

  const loadCourseData = async () => {
    try {
      setIsLoading(true);
      
      // Load course details
      const courseData = await apiClient.getCourse(courseId!);
      setCourse(courseData);
      
      // Load modules with lessons
      const modulesData = await apiClient.getCourseModules(courseId!, true);
      setModules(modulesData);
      
    } catch (error) {
      console.error('Failed to load course data:', error);
      setError('Failed to load course data');
    } finally {
      setIsLoading(false);
    }
  };

  const getLessonIcon = (lesson: Lesson) => {
    // Check if lesson has steps and get the first step's content type
    if (lesson.steps && lesson.steps.length > 0) {
      const firstStep = lesson.steps[0];
      switch (firstStep.content_type) {
        case 'video_text':
          return <Play className="w-4 h-4" />;
        case 'quiz':
          return <HelpCircle className="w-4 h-4" />;
        case 'text':
        default:
          return <FileText className="w-4 h-4" />;
      }
    }
    return <FileText className="w-4 h-4" />;
  };

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/course/${courseId}/lesson/${lesson.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error || 'Course not found'}</p>
          <Button onClick={() => navigate('/courses')} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{course.title}</h1>
              <p className="mt-2 text-lg text-gray-600">{course.description}</p>
              
              <div className="mt-4 flex items-center space-x-6">
                {course.estimated_duration_minutes && course.estimated_duration_minutes > 0 && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {formatDuration(course.estimated_duration_minutes)}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {modules.length} modules
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                course.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {course.isActive ? "Active" : "Draft"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {modules.map((module) => (
            <Card key={module.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold">{module.title}</h2>
                    {module.description && (
                      <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {module.total_lessons} lessons
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {module.lessons && module.lessons.length > 0 ? (
                  <div className="space-y-3">
                    {module.lessons.map((lesson: any) => (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(lesson)}
                        className="w-full flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getLessonIcon(lesson)}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{lesson.title}</h3>
                            {lesson.description && (
                              <p className="text-sm text-gray-500 mt-1">{lesson.description}</p>
                            )}
                            {lesson.steps && lesson.steps.length > 0 && (
                              <p className="text-xs text-gray-400 mt-1">
                                {lesson.steps.length} steps
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No lessons in this module yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


