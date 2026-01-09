import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Play, RotateCcw, CheckCircle, Users, BookOpen, Loader2, AlertCircle } from 'lucide-react';
import { storage } from '../utils/storage';
import apiClient from '../services/api';

interface CourseItem {
  id: number;
  title: string;
}

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface Lesson {
  lesson_id: number;
  lesson_title: string;
  module_title: string;
  total_steps: number;
  completed_steps: number;
  completion_percentage: number;
}

interface ProgressSummary {
  user: { id: number; name: string; email: string };
  course: { id: number; title: string };
  overall: {
    total_steps: number;
    completed_steps: number;
    completion_percentage: number;
  };
  lessons: Lesson[];
}

export default function SettingsPage() {
  const { user } = useAuth();
  
  // Admin Progress Management State
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary | null>(null);
  const [selectedLessons, setSelectedLessons] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load courses and users for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      loadCoursesAndUsers();
    }
  }, [user]);

  // Load progress when user and course selected
  useEffect(() => {
    if (selectedUserId && selectedCourseId) {
      loadProgressSummary();
    } else {
      setProgressSummary(null);
      setSelectedLessons([]);
    }
  }, [selectedUserId, selectedCourseId]);

  const loadCoursesAndUsers = async () => {
    try {
      const [coursesData, usersData] = await Promise.all([
        apiClient.getCourses(),
        apiClient.getUsers({ role: 'student' })
      ]);
      // Map courses to have number ids
      setCourses(coursesData.map(c => ({ id: Number(c.id), title: c.title })));
      // Map users to have number ids
      setUsers((usersData.users || []).map(u => ({ 
        id: Number(u.id), 
        name: u.name || '', 
        email: u.email, 
        role: u.role 
      })));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadProgressSummary = async () => {
    if (!selectedUserId || !selectedCourseId) return;
    
    setIsLoadingProgress(true);
    try {
      const data = await apiClient.getUserProgressSummary(selectedUserId, selectedCourseId);
      setProgressSummary(data);
      setSelectedLessons([]);
    } catch (error) {
      console.error('Failed to load progress:', error);
      setProgressSummary(null);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const handleCompleteSteps = async () => {
    if (!selectedUserId || !selectedCourseId) return;
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
      const data = {
        user_id: selectedUserId,
        course_id: selectedCourseId,
        lesson_ids: selectedLessons.length > 0 ? selectedLessons : undefined
      };
      
      const result = await apiClient.completeStepsForUser(data);
      setActionResult({
        type: 'success',
        message: `✅ ${result.statistics.newly_completed} шагов завершено, ${result.statistics.updated} обновлено, ${result.statistics.already_completed} уже были завершены`
      });
      
      // Reload progress
      await loadProgressSummary();
    } catch (error: any) {
      setActionResult({
        type: 'error',
        message: error.message || 'Ошибка при завершении шагов'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetProgress = async () => {
    if (!selectedUserId || !selectedCourseId) return;
    
    if (!confirm('Вы уверены, что хотите сбросить прогресс? Это действие нельзя отменить.')) {
      return;
    }
    
    setIsLoading(true);
    setActionResult(null);
    
    try {
      const data = {
        user_id: selectedUserId,
        course_id: selectedCourseId,
        lesson_ids: selectedLessons.length > 0 ? selectedLessons : undefined
      };
      
      const result = await apiClient.resetStepsForUser(data);
      setActionResult({
        type: 'success',
        message: `✅ Удалено ${result.deleted_records} записей прогресса`
      });
      
      // Reload progress
      await loadProgressSummary();
    } catch (error: any) {
      setActionResult({
        type: 'error',
        message: error.message || 'Ошибка при сбросе прогресса'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleLessonSelection = (lessonId: number) => {
    setSelectedLessons(prev => 
      prev.includes(lessonId) 
        ? prev.filter(id => id !== lessonId)
        : [...prev, lessonId]
    );
  };

  const selectAllLessons = () => {
    if (progressSummary) {
      setSelectedLessons(progressSummary.lessons.map(l => l.lesson_id));
    }
  };

  const deselectAllLessons = () => {
    setSelectedLessons([]);
  };

  const handleRestartTour = () => {
    if (!user) return;
    
    // Сохраняем имя тура для запуска после редиректа
    const tourName = `${user.role}-onboarding`;
    storage.setItem('pending_tour', tourName);
    
    // Перенаправляем на dashboard, где тур найдет нужные элементы
    window.location.href = '/dashboard';
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      {/* Admin Progress Management Section */}
      {user?.role === 'admin' && (
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Управление прогрессом студентов</h2>
              <p className="text-sm text-gray-600">Завершить или сбросить шаги за студента</p>
            </div>
          </div>
          
          {/* Selection Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* User Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Студент
              </label>
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Выберите студента...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Course Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <BookOpen className="w-4 h-4 inline mr-1" />
                Курс
              </label>
              <select
                value={selectedCourseId || ''}
                onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Выберите курс...</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Progress Summary */}
          {isLoadingProgress && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Загрузка прогресса...</span>
            </div>
          )}
          
          {progressSummary && !isLoadingProgress && (
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">
                    {progressSummary.user.name}
                  </span>
                  <span className="text-sm text-gray-600">
                    {progressSummary.overall.completed_steps} / {progressSummary.overall.total_steps} шагов
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${progressSummary.overall.completion_percentage}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {progressSummary.overall.completion_percentage.toFixed(1)}% завершено
                </p>
              </div>
              
              {/* Lesson Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Выберите уроки (или оставьте пустым для всех)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllLessons}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Выбрать все
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAllLessons}
                      className="text-xs text-gray-600 hover:underline"
                    >
                      Снять выбор
                    </button>
                  </div>
                </div>
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                  {progressSummary.lessons.map(lesson => (
                    <label
                      key={lesson.lesson_id}
                      className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 ${
                        selectedLessons.includes(lesson.lesson_id) ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLessons.includes(lesson.lesson_id)}
                        onChange={() => toggleLessonSelection(lesson.lesson_id)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {lesson.lesson_title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {lesson.module_title} • {lesson.completed_steps}/{lesson.total_steps} шагов ({lesson.completion_percentage}%)
                        </p>
                      </div>
                      <div className="ml-2">
                        {lesson.completion_percentage === 100 ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full"
                              style={{ width: `${lesson.completion_percentage}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Action Result */}
              {actionResult && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  actionResult.type === 'success' 
                    ? 'bg-green-50 text-green-800' 
                    : 'bg-red-50 text-red-800'
                }`}>
                  {actionResult.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                  <span className="text-sm">{actionResult.message}</span>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCompleteSteps}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Завершить {selectedLessons.length > 0 ? `выбранные уроки (${selectedLessons.length})` : 'все шаги'}
                </Button>
                
                <Button
                  onClick={handleResetProgress}
                  disabled={isLoading}
                  variant="outline"
                  className="flex items-center justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  Сбросить прогресс
                </Button>
              </div>
            </div>
          )}
          
          {/* Hint when nothing selected */}
          {!selectedUserId && !selectedCourseId && (
            <p className="text-sm text-gray-500 text-center py-4">
              Выберите студента и курс, чтобы управлять прогрессом
            </p>
          )}
        </div>
      )}
      
      {/* Onboarding Section */}
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-xl space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Onboarding & Tour</h2>
        <p className="text-sm text-gray-600 mb-4">
          Restart the platform tour or reset the complete onboarding experience.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleRestartTour}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Restart Tour
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          The tour will guide you through the main features of your {user?.role || 'user'} dashboard.
          {' '}Note: Settings are stored in {storage.getItem('__storage_test__') !== null ? 'browser storage' : 'session memory'}.
        </p>
      </div>
    </div>
  );
}

