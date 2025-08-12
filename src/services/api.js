import axios from 'axios';

// API Base URL - adjust for your backend
const API_BASE_URL = 'http://localhost:8000';

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

// Утилиты для работы с cookies
class CookieUtils {
  static setCookie(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure=${window.location.protocol === 'https:'}`;
  }

  static getCookie(name) {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  static deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict`;
  }
}

class TokenManager {
  constructor() {
    // Миграция из localStorage в cookies (если есть старые токены)
    this.migrateFromLocalStorage();
    
    this.accessToken = CookieUtils.getCookie('access_token');
    this.refreshToken = CookieUtils.getCookie('refresh_token');
  }

  migrateFromLocalStorage() {
    // Проверяем, есть ли старые токены в localStorage
    const oldAccessToken = localStorage.getItem('access_token');
    const oldRefreshToken = localStorage.getItem('refresh_token');
    
    if (oldAccessToken && oldRefreshToken) {
      // Перемещаем в cookies
      CookieUtils.setCookie('access_token', oldAccessToken, 1); // Access token на 1 день
      CookieUtils.setCookie('refresh_token', oldRefreshToken, 7); // Refresh token на 7 дней
      
      // Удаляем из localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('current_user');
      
      console.info('🔄 Токены перенесены из localStorage в cookies');
    }
  }

  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    // Сохраняем в cookies с разными сроками жизни
    CookieUtils.setCookie('access_token', accessToken, 1); // Access token на 1 день
    CookieUtils.setCookie('refresh_token', refreshToken, 7); // Refresh token на 7 дней
  }

  getAccessToken() {
    if (!this.accessToken) {
      this.accessToken = CookieUtils.getCookie('access_token');
    }
    return this.accessToken;
  }

  getRefreshToken() {
    if (!this.refreshToken) {
      this.refreshToken = CookieUtils.getCookie('refresh_token');
    }
    return this.refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    
    // Удаляем cookies
    CookieUtils.deleteCookie('access_token');
    CookieUtils.deleteCookie('refresh_token');
    CookieUtils.deleteCookie('current_user');
    
    // Также очищаем localStorage на всякий случай
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
  }

  isAuthenticated() {
    const token = this.getAccessToken();
    return !!token;
  }
}

// =============================================================================
// HTTP CLIENT SETUP
// =============================================================================

class LMSApiClient {
  constructor() {
    this.tokenManager = new TokenManager();
    this.setupAxios();
    this.currentUser = this.getCurrentUserFromStorage();
  }

  setupAxios() {
    // Create axios instance
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Важно для работы с cookies между доменами
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = this.tokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = this.tokenManager.getRefreshToken();
            if (refreshToken) {
              const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                refresh_token: refreshToken
              });

              const { access_token, refresh_token } = response.data;
              this.tokenManager.setTokens(access_token, refresh_token);

              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.logout();
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  getCurrentUserFromStorage() {
    try {
      // Сначала пробуем получить из cookies
      let userData = CookieUtils.getCookie('current_user');
      
      // Если нет в cookies, проверяем localStorage для миграции
      if (!userData) {
        userData = localStorage.getItem('current_user');
        if (userData) {
          // Мигрируем в cookies
          CookieUtils.setCookie('current_user', userData, 7);
          localStorage.removeItem('current_user');
          console.info('🔄 Данные пользователя перенесены в cookies');
        }
      }
      
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  setCurrentUser(user) {
    this.currentUser = user;
    const userData = JSON.stringify(user);
    CookieUtils.setCookie('current_user', userData, 7); // Данные пользователя на 7 дней
    
    // Также очищаем из localStorage, если там есть
    localStorage.removeItem('current_user');
  }

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  async login(email, password) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password
      });

      const { access_token, refresh_token } = response.data;
      this.tokenManager.setTokens(access_token, refresh_token);

      // Get user info
      const user = await this.getCurrentUser();
      this.setCurrentUser(user);

      return { success: true, user };
    } catch (error) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  async logout() {
    try {
      if (this.tokenManager.isAuthenticated()) {
        await this.api.post('/auth/logout');
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.tokenManager.clearTokens();
      this.currentUser = null;
    }
  }

  async getCurrentUser() {
    try {
      const response = await this.api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get current user');
    }
  }

  isAuthenticated() {
    return this.tokenManager.isAuthenticated();
  }

  getCurrentUserSync() {
    return this.currentUser;
  }

  // =============================================================================
  // DASHBOARD
  // =============================================================================

  async getDashboardStats() {
    try {
      const response = await this.api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load dashboard stats');
    }
  }

  async getMyCourses() {
    try {
      const response = await this.api.get('/dashboard/my-courses');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load courses');
    }
  }

  async getRecentActivity(limit = 10) {
    try {
      const response = await this.api.get('/dashboard/recent-activity', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load recent activity');
    }
  }

  async updateStudyTime(minutes) {
    try {
      const response = await this.api.post('/dashboard/update-study-time', null, {
        params: { minutes_studied: minutes }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update study time');
    }
  }

  // =============================================================================
  // COURSES
  // =============================================================================

  async getCourses(params = {}) {
    try {
      const response = await this.api.get('/courses/', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load courses');
    }
  }

  async getCourse(courseId) {
    try {
      const response = await this.api.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load course');
    }
  }

  async createCourse(courseData) {
    try {
      const response = await this.api.post('/courses/', courseData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create course');
    }
  }

  async updateCourse(courseId, courseData) {
    try {
      const response = await this.api.put(`/courses/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update course');
    }
  }

  async deleteCourse(courseId) {
    try {
      await this.api.delete(`/courses/${courseId}`);
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete course');
    }
  }

  async enrollInCourse(courseId) {
    try {
      const response = await this.api.post(`/courses/${courseId}/enroll`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to enroll in course');
    }
  }

  async unenrollFromCourse(courseId) {
    try {
      const response = await this.api.delete(`/courses/${courseId}/enroll`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to unenroll from course');
    }
  }

  // =============================================================================
  // MODULES
  // =============================================================================

  async getCourseModules(courseId) {
    try {
      const response = await this.api.get(`/courses/${courseId}/modules`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load modules');
    }
  }

  async createModule(courseId, moduleData) {
    try {
      const response = await this.api.post(`/courses/${courseId}/modules`, moduleData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create module');
    }
  }

  async updateModule(courseId, moduleId, moduleData) {
    try {
      const response = await this.api.put(`/courses/${courseId}/modules/${moduleId}`, moduleData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update module');
    }
  }

  async deleteModule(courseId, moduleId) {
    try {
      await this.api.delete(`/courses/${courseId}/modules/${moduleId}`);
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete module');
    }
  }

  // =============================================================================
  // LESSONS
  // =============================================================================

  async getModuleLessons(courseId, moduleId) {
    try {
      const response = await this.api.get(`/courses/${courseId}/modules/${moduleId}/lessons`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load lessons');
    }
  }

  async getLesson(lessonId) {
    try {
      const response = await this.api.get(`/courses/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load lesson');
    }
  }

  async createLesson(courseId, moduleId, lessonData) {
    try {
      const response = await this.api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, lessonData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create lesson');
    }
  }

  async updateLesson(lessonId, lessonData) {
    try {
      const response = await this.api.put(`/courses/lessons/${lessonId}`, lessonData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update lesson');
    }
  }

  async deleteLesson(lessonId) {
    try {
      await this.api.delete(`/courses/lessons/${lessonId}`);
      return { success: true };
    } catch (error) {
      throw new Error('Failed to delete lesson');
    }
  }

  async getLessonMaterials(lessonId) {
    try {
      const response = await this.api.get(`/courses/lessons/${lessonId}/materials`);
      return response.data;
    } catch (error) {
      console.warn('Failed to load lesson materials:', error);
      return [];
    }
  }

  // =============================================================================
  // ASSIGNMENTS
  // =============================================================================

  async getAssignments(params = {}) {
    try {
      const response = await this.api.get('/assignments/', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load assignments');
    }
  }

  async getAssignment(assignmentId) {
    try {
      const response = await this.api.get(`/assignments/${assignmentId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load assignment');
    }
  }

  async submitAssignment(assignmentId, answers) {
    try {
      const response = await this.api.post(`/assignments/${assignmentId}/submit`, { answers });
      return response.data;
    } catch (error) {
      throw new Error('Failed to submit assignment');
    }
  }

  async getMySubmissions(courseId = null) {
    try {
      const params = courseId ? { course_id: courseId } : {};
      const response = await this.api.get('/assignments/submissions/my', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load my submissions');
    }
  }

  // =============================================================================
  // PROGRESS
  // =============================================================================

  async markLessonComplete(lessonId, timeSpent = 0) {
    try {
      const response = await this.api.post(`/progress/lesson/${lessonId}/complete`, null, {
        params: { time_spent: timeSpent }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to mark lesson complete');
    }
  }

  async startLesson(lessonId) {
    try {
      const response = await this.api.post(`/progress/lesson/${lessonId}/start`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to start lesson');
    }
  }

  async markLessonComplete(lessonId, timeSpent = 0) {
    try {
      const response = await this.api.post(`/progress/lesson/${lessonId}/complete`, null, {
        params: { time_spent: timeSpent }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to mark lesson complete');
    }
  }

  async getMyProgress(params = {}) {
    try {
      const response = await this.api.get('/progress/my', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load progress');
    }
  }

  async getCourseProgress(courseId, studentId = null) {
    try {
      const params = studentId ? { student_id: studentId } : {};
      const response = await this.api.get(`/progress/course/${courseId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load course progress');
    }
  }

  async isLectureCompleted(lectureId) {
    try {
      const progress = await this.getMyProgress({ lesson_id: lectureId });
      return progress.some(p => p.lesson_id === lectureId && p.status === 'completed');
  } catch {
      return false;
    }
  }

  // =============================================================================
  // MESSAGES
  // =============================================================================

  async getUnreadMessageCount() {
    try {
      const response = await this.api.get('/messages/unread-count');
      return response.data;
    } catch (error) {
      console.warn('Failed to load unread count:', error);
      return { unread_count: 0 };
    }
  }

  async fetchThreads() {
    try {
      const response = await this.api.get('/messages/conversations');
      return response.data;
    } catch (error) {
      console.warn('Failed to load threads:', error);
    return [];
  }
}

  async fetchMessages(threadId) {
    try {
      const response = await this.api.get('/messages', {
        params: { with_user_id: threadId }
      });
      return response.data;
    } catch (error) {
      console.warn('Failed to load messages:', error);
      return [];
    }
  }

  async sendMessage(toUserId, content) {
    try {
      const response = await this.api.post('/messages', {
        to_user_id: toUserId,
        content: content
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to send message');
    }
  }

  // =============================================================================
  // QUIZZES (Mock implementation)
  // =============================================================================

  async fetchQuizzes() {
    console.warn('fetchQuizzes is not implemented in the backend yet');
    return [
      {
        id: 1,
        title: 'Sample Quiz',
        description: 'This is a sample quiz',
        questions: []
      }
    ];
  }

  async fetchQuizById(quizId) {
    console.warn('fetchQuizById is not implemented in the backend yet');
    return {
      id: quizId,
      title: 'Sample Quiz',
      description: 'This quiz functionality needs to be implemented',
      questions: []
    };
  }

  getQuizAttemptsLeft(quizId) {
    console.warn('getQuizAttemptsLeft is not implemented');
    return 3; // Default attempts
  }

  async submitQuiz(quizId, answers, score) {
    console.warn('submitQuiz is not implemented in the backend yet');
    return { success: true, score: score };
  }

  // =============================================================================
  // TEACHER FUNCTIONS (Mock implementation)
  // =============================================================================

  async getPendingSubmissions() {
    try {
      // Get assignments and their submissions
      const assignments = await this.getAssignments();
      const submissions = [];
      
      for (const assignment of assignments) {
        const assignmentSubmissions = await this.api.get(`/assignments/${assignment.id}/submissions`);
        submissions.push(...assignmentSubmissions.data.filter(s => !s.is_graded));
      }
      
      return submissions;
    } catch (error) {
      console.warn('Failed to load pending submissions:', error);
      return [];
    }
  }

  async gradeSubmission(submissionId, score, feedback) {
    console.warn('gradeSubmission needs to be implemented in the backend');
    return { success: true };
  }

  async allowResubmission(submissionId) {
    console.warn('allowResubmission needs to be implemented in the backend');
    return { success: true };
  }

  // =============================================================================
  // LEGACY SUPPORT
  // =============================================================================

  async fetchModules() {
    console.warn('fetchModules needs course context - use getCourses() instead');
    try {
      const courses = await this.getCourses();
      if (courses.length > 0) {
        return await this.getCourseModules(courses[0].id);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  async fetchLectures(moduleId) {
    console.warn('fetchLectures needs course context - use getModuleLessons(courseId, moduleId)');
    return [];
  }

  async createLecture(moduleId, lectureData) {
    console.warn('createLecture needs course context for new API');
    try {
      // Find course context first
      const courses = await this.getCourses();
      for (const course of courses) {
        try {
          const modules = await this.getCourseModules(course.id);
          const targetModule = modules.find(m => m.id === parseInt(moduleId));
          if (targetModule) {
            return await this.createLesson(course.id, moduleId, lectureData);
          }
        } catch (err) {
          continue;
        }
      }
      throw new Error('Could not find course context for module');
    } catch (error) {
      throw new Error('Failed to create lecture');
    }
  }

  async deleteLecture(lectureId) {
    try {
      return await this.deleteLesson(lectureId);
    } catch (error) {
      throw new Error('Failed to delete lecture');
    }
  }

  async updateLecture(lectureId, lectureData) {
    try {
      return await this.updateLesson(lectureId, lectureData);
    } catch (error) {
      throw new Error('Failed to update lecture');
    }
  }

  getAssignmentStatusForStudent(assignmentId) {
    console.warn('getAssignmentStatusForStudent needs to be properly implemented');
    return 'not-started'; // Default status
  }

  async fetchAssignmentsByLecture(lectureId) {
    try {
      return await this.getAssignments({ lesson_id: lectureId });
    } catch (error) {
      console.warn('Failed to load assignments by lecture:', error);
      return [];
    }
  }

  // =============================================================================
  // ADMIN
  // =============================================================================

  async createUser(userData) {
    try {
      const response = await this.api.post('/admin/users/single', userData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create user');
    }
  }

  async getUsers(params = {}) {
    try {
      const response = await this.api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load users');
    }
  }

  async getAdminStats() {
    try {
      const response = await this.api.get('/admin/stats');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load admin stats');
    }
  }

  // =============================================================================
  // BACKWARD COMPATIBILITY (for existing components)
  // =============================================================================

  // Legacy methods to support existing components during migration
  fetchCourses() {
    return this.getCourses();
  }

  fetchCourseById(courseId) {
    return this.getCourse(courseId);
  }

  fetchModulesByCourse(courseId) {
    return this.getCourseModules(courseId);
  }

  fetchLectureById(lectureId) {
    return this.getLesson(lectureId);
  }

  markLectureComplete(lectureId) {
    return this.markLessonComplete(lectureId);
  }

  isLectureCompleted(lectureId) {
    return this.isLectureCompleted(lectureId);
  }

  // Mock compatibility methods for smooth migration
  async fetchLecturesByModule(moduleId) {
    // This needs course context in the new API
    console.warn('fetchLecturesByModule needs course context - use getModuleLessons(courseId, moduleId)');
    try {
      // Try to find the course context by getting all courses and their modules
      const courses = await this.getCourses();
      for (const course of courses) {
        try {
          const modules = await this.getCourseModules(course.id);
          const targetModule = modules.find(m => m.id === parseInt(moduleId));
          if (targetModule) {
            return await this.getModuleLessons(course.id, moduleId);
          }
        } catch (err) {
          continue;
        }
      }
      return [];
    } catch (error) {
      console.warn('Failed to fetch lectures by module:', error);
      return [];
    }
  }

  async fetchModuleById(moduleId) {
    // This needs course context, for now return null
    console.warn('fetchModuleById needs course context');
    return null;
  }

  // Progress tracking compatibility
  getModuleProgress(moduleId) {
    console.warn('getModuleProgress needs course context - use getMyProgress');
    return 0;
  }

  getCourseProgress(courseId) {
    console.warn('getCourseProgress needs updating to use new API');
    return 0;
  }

  getCourseStatus(courseId) {
    console.warn('getCourseStatus needs updating to use new API');
    return 'not-started';
  }
}

// =============================================================================
// EXPORT SINGLETON INSTANCE
// =============================================================================

const apiClient = new LMSApiClient();
export default apiClient;

// Also export individual methods for easier migration
export const {
  login,
  logout,
  getCurrentUser,
  isAuthenticated,
  getCurrentUserSync,
  getDashboardStats,
  getMyCourses,
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  getModuleLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  getAssignments,
  getAssignment,
  submitAssignment,
  getMySubmissions,
  getCourseProgress,
  getMyProgress,
  markLessonComplete,
  getLessonMaterials,
  // Messages
  getUnreadMessageCount,
  fetchThreads,
  fetchMessages,
  sendMessage,
  // Quizzes (mock)
  fetchQuizzes,
  fetchQuizById,
  getQuizAttemptsLeft,
  submitQuiz,
  // Teacher functions (mock)
  getPendingSubmissions,
  gradeSubmission,
  allowResubmission,
  // Legacy support
  fetchModules,
  fetchLectures,
  fetchLecturesByModule,
  createLecture,
  deleteLecture,
  updateLecture,
  getAssignmentStatusForStudent,
  fetchAssignmentsByLecture,
  // Legacy exports
  fetchCourses,
  fetchCourseById,
  fetchModulesByCourse,
  fetchLectureById,
  markLectureComplete,
  isLectureCompleted
} = apiClient;
