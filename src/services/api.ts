import axios, { AxiosInstance } from 'axios';
import type {
  User,
  Course,
  CourseModule,
  Lesson,
  DashboardStats,
  RecentActivity,
  Group,
  CourseGroupAccess,
  AdminDashboard,
  UserListResponse,
  GroupListResponse,
  CreateGroupRequest,
  UpdateGroupRequest,
  CreateUserRequest,
  UpdateUserRequest
} from '../types';

// API Base URL - adjust for your backend
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

// =============================================================================
// TOKEN MANAGEMENT
// =============================================================================

// Утилиты для работы с cookies
class CookieUtils {
  static setCookie(name: string, value: string, days: number = 7): void {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict;Secure=${window.location.protocol === 'https:'}`;
  }

  static getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  }

  static deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/;SameSite=Strict`;
  }
}

class TokenManager {
  private accessToken: string | null;
  private refreshToken: string | null;

  constructor() {
    // Миграция из localStorage в cookies (если есть старые токены)
    this.migrateFromLocalStorage();
    
    this.accessToken = CookieUtils.getCookie('access_token');
    this.refreshToken = CookieUtils.getCookie('refresh_token');
  }

  private migrateFromLocalStorage(): void {
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

  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    
    // Сохраняем в cookies с разными сроками жизни
    CookieUtils.setCookie('access_token', accessToken, 1); // Access token на 1 день
    CookieUtils.setCookie('refresh_token', refreshToken, 7); // Refresh token на 7 дней
  }

  getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = CookieUtils.getCookie('access_token');
    }
    return this.accessToken;
  }

  getRefreshToken(): string | null {
    if (!this.refreshToken) {
      this.refreshToken = CookieUtils.getCookie('refresh_token');
    }
    return this.refreshToken;
  }

  clearTokens(): void {
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
  private tokenManager: TokenManager;
  private api!: AxiosInstance;
  private currentUser: User | null = null;

  constructor() {
    this.tokenManager = new TokenManager();
    this.setupAxios();
    this.currentUser = this.getCurrentUserFromStorage();
  }

  private setupAxios(): void {
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

  setCurrentUser(user: User | null): void {
    this.currentUser = user;
    const userData = JSON.stringify(user);
    CookieUtils.setCookie('current_user', userData, 7); // Данные пользователя на 7 дней
    
    // Также очищаем из localStorage, если там есть
    localStorage.removeItem('current_user');
  }

  // =============================================================================
  // AUTHENTICATION
  // =============================================================================

  async login(email: string, password: string): Promise<{ success: boolean; user: User }> {
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
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  async logout(): Promise<void> {
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

  async getCurrentUser(): Promise<User> {
    try {
      const response = await this.api.get('/auth/me');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get current user');
    }
  }

  async updateProfile(userId: number, profileData: { name?: string; email?: string }): Promise<User> {
    try {
      const response = await this.api.put(`/users/${userId}`, profileData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to update profile');
    }
  }

  isAuthenticated(): boolean {
    return this.tokenManager.isAuthenticated();
  }

  getCurrentUserSync(): User | null {
    return this.currentUser;
  }

  // =============================================================================
  // DASHBOARD
  // =============================================================================

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await this.api.get('/dashboard/stats');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load dashboard stats');
    }
  }

  async getMyCourses(): Promise<Course[]> {
    try {
      const response = await this.api.get('/dashboard/my-courses');
      return response.data;
    } catch (error) {
      throw new Error('Failed to load courses');
    }
  }

  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      const response = await this.api.get('/dashboard/recent-activity', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load recent activity');
    }
  }

  async updateStudyTime(minutes: number): Promise<any> {
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

  async getCourses(params: Record<string, any> = {}): Promise<Course[]> {
    try {
      const response = await this.api.get('/courses/', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load courses');
    }
  }

  async getCourse(courseId: string): Promise<Course> {
    try {
      const response = await this.api.get(`/courses/${courseId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load course');
    }
  }

  async createCourse(courseData: any): Promise<Course> {
    try {
      const response = await this.api.post('/courses/', courseData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create course');
    }
  }

  async updateCourse(courseId: string, courseData: any): Promise<Course> {
    try {
      const response = await this.api.put(`/courses/${courseId}`, courseData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update course');
    }
  }

  // =============================================================================
  // MEDIA / THUMBNAILS
  // =============================================================================

  async setCourseThumbnailUrl(courseId: string, url: string): Promise<{ cover_image_url: string }> {
    try {
      const response = await this.api.put(`/media/courses/${courseId}/thumbnail-url`, { url });
      return response.data;
    } catch (error) {
      throw new Error('Failed to set course thumbnail URL');
    }
  }

  async uploadCourseThumbnail(courseId: string, file: File): Promise<{ cover_image_url: string }> {
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await this.api.post(`/media/courses/${courseId}/thumbnail`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to upload course thumbnail');
    }
  }

  async deleteCourse(courseId: string): Promise<void> {
    try {
      await this.api.delete(`/courses/${courseId}`);
    } catch (error) {
      throw new Error('Failed to delete course');
    }
  }

  async enrollInCourse(courseId: string): Promise<any> {
    try {
      const response = await this.api.post(`/courses/${courseId}/enroll`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to enroll in course');
    }
  }

  async unenrollFromCourse(courseId: string): Promise<void> {
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

  async getCourseModules(courseId: string): Promise<CourseModule[]> {
    try {
      const response = await this.api.get(`/courses/${courseId}/modules`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load modules');
    }
  }

  async createModule(courseId: string, moduleData: any): Promise<CourseModule> {
    try {
      const response = await this.api.post(`/courses/${courseId}/modules`, moduleData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create module');
    }
  }

  async updateModule(courseId: string, moduleId: number, moduleData: any): Promise<CourseModule> {
    try {
      const response = await this.api.put(`/courses/${courseId}/modules/${moduleId}`, moduleData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update module');
    }
  }

  async deleteModule(courseId: string, moduleId: number): Promise<void> {
    try {
      await this.api.delete(`/courses/${courseId}/modules/${moduleId}`);
    } catch (error) {
      throw new Error('Failed to delete module');
    }
  }

  // =============================================================================
  // LESSONS
  // =============================================================================

  async getModuleLessons(courseId: string, moduleId: number): Promise<Lesson[]> {
    try {
      const response = await this.api.get(`/courses/${courseId}/modules/${moduleId}/lessons`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load lessons');
    }
  }

  async getCourseLessons(courseId: string): Promise<Lesson[]> {
    try {
      const response = await this.api.get(`/courses/${courseId}/lessons`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load course lessons');
    }
  }

  async fixLessonOrder(courseId: string): Promise<any> {
    try {
      const response = await this.api.post(`/courses/${courseId}/fix-lesson-order`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fix lesson order');
    }
  }

  async getLesson(lessonId: string): Promise<Lesson> {
    try {
      const response = await this.api.get(`/courses/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load lesson');
    }
  }

  async createLesson(courseId: string, moduleId: number, lessonData: any): Promise<Lesson> {
    try {
      const response = await this.api.post(`/courses/${courseId}/modules/${moduleId}/lessons`, lessonData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create lesson');
    }
  }

  async updateLesson(lessonId: string, lessonData: any): Promise<Lesson> {
    try {
      const response = await this.api.put(`/courses/lessons/${lessonId}`, lessonData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update lesson');
    }
  }

  async deleteLesson(lessonId: string): Promise<void> {
    try {
      await this.api.delete(`/courses/lessons/${lessonId}`);
    } catch (error) {
      throw new Error('Failed to delete lesson');
    }
  }

  async getLessonMaterials(lessonId: string): Promise<any[]> {
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

  async getAssignment(assignmentId: string): Promise<any> {
    try {
      const response = await this.api.get(`/assignments/${assignmentId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to load assignment');
    }
  }

  async createAssignment(assignmentData: any, lessonId?: string): Promise<any> {
    try {
      const params = lessonId ? { lesson_id: lessonId } : {};
      const response = await this.api.post('/assignments/', assignmentData, { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to create assignment');
    }
  }

  async updateAssignment(assignmentId: string, assignmentData: any): Promise<any> {
    try {
      const response = await this.api.put(`/assignments/${assignmentId}`, assignmentData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update assignment');
    }
  }

  async submitAssignment(assignmentId: string, answers: any): Promise<any> {
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
  // FILE UPLOAD
  // =============================================================================

  async uploadAssignmentFile(assignmentId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('file', file);

      const response = await this.api.post('/media/assignments/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to upload assignment file');
    }
  }

  async uploadSubmissionFile(assignmentId: string, file: File): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('assignment_id', assignmentId);
      formData.append('file', file);

      const response = await this.api.post('/media/submissions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to upload submission file');
    }
  }

  async downloadFile(fileType: string, filename: string): Promise<Blob> {
    try {
      const response = await this.api.get(`/media/files/${fileType}/${filename}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to download file');
    }
  }

  getFileUrl(fileType: string, filename: string): string {
    return `${API_BASE_URL}/media/files/${fileType}/${filename}`;
  }

  // =============================================================================
  // PROGRESS
  // =============================================================================

  async markLessonComplete(lessonId: string, timeSpent: number = 0) {
    try {
      const response = await this.api.post(`/progress/lesson/${lessonId}/complete`, null, {
        params: { time_spent: timeSpent }
      });
      return response.data;
    } catch (error) {
      throw new Error('Failed to mark lesson complete');
    }
  }

  async startLesson(lessonId: string): Promise<any> {
    try {
      const response = await this.api.post(`/progress/lesson/${lessonId}/start`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to start lesson');
    }
  }

  async getMyProgress(params: Record<string, any> = {}): Promise<any> {
    try {
      const response = await this.api.get('/progress/my', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load progress');
    }
  }

  async getCourseProgress(courseId: string, studentId: string | null = null) {
    try {
      const params = studentId ? { student_id: studentId } : {};
      const response = await this.api.get(`/progress/course/${courseId}`, { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to load course progress');
    }
  }

  async isLessonCompleted(lectureId: string): Promise<boolean> {
    try {
      const progress = await this.getMyProgress({ lesson_id: lectureId });
      return progress.some((p: any) => p.lesson_id === lectureId && p.status === 'completed');
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

  fetchThreads = async () => {
    try {
      const response = await this.api.get('/messages/conversations');
      return response.data;
    } catch (error) {
      console.warn('Failed to load threads:', error);
      return [];
    }
  }

  fetchMessages = async (threadId: string): Promise<any[]> => {
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

  sendMessage = async (toUserId: string, content: string): Promise<any> => {
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

  fetchQuizzes = async () => {
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

  fetchQuizById = async (quizId: string): Promise<any> => {
    console.warn('fetchQuizById is not implemented in the backend yet');
    return {
      id: quizId,
      title: 'Sample Quiz',
      description: 'This quiz functionality needs to be implemented',
      questions: []
    };
  }

  getQuizAttemptsLeft = (_quizId: string): number => {
    console.warn('getQuizAttemptsLeft is not implemented');
    return 3; // Default attempts
  }

  submitQuiz = async (_quizId: string, _answers: any, score: number): Promise<any> => {
    console.warn('submitQuiz is not implemented in the backend yet');
    return { success: true, score: score };
  }

  // =============================================================================
  // TEACHER FUNCTIONS (Mock implementation)
  // =============================================================================

  getPendingSubmissions = async () => {
    try {
      // Get assignments and their submissions
      const assignments = await this.getAssignments();
      const submissions = [];
      
      for (const assignment of assignments) {
        const assignmentSubmissions = await this.api.get(`/assignments/${assignment.id}/submissions`);
        submissions.push(...assignmentSubmissions.data.filter((s: any) => !s.is_graded));
      }
      
      return submissions;
    } catch (error) {
      console.warn('Failed to load pending submissions:', error);
      return [];
    }
  }

  gradeSubmission = async (_submissionId: string, _score: number, _feedback: string): Promise<any> => {
    console.warn('gradeSubmission needs to be implemented in the backend');
    return { success: true };
  }

  allowResubmission = async (_submissionId: string): Promise<any> => {
    console.warn('allowResubmission needs to be implemented in the backend');
    return { success: true };
  }

  // =============================================================================
  // LEGACY SUPPORT
  // =============================================================================

  fetchModules = async () => {
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

  fetchLectures = async (_moduleId: string): Promise<any[]> => {
    console.warn('fetchLectures needs course context - use getModuleLessons(courseId, moduleId)');
    return [];
  }

  createLecture = async (moduleId: string, lectureData: any): Promise<any> => {
    console.warn('createLecture needs course context for new API');
    try {
      // Find course context first
      const courses = await this.getCourses();
      const moduleIdNum = parseInt(moduleId);
      
      for (const course of courses) {
        try {
          const modules = await this.getCourseModules(course.id);
          const targetModule = modules.find(m => m.id === moduleIdNum);
          if (targetModule) {
            return await this.createLesson(course.id, moduleIdNum, lectureData);
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

  deleteLecture = async (lectureId: string): Promise<void> => {
    try {
      return await this.deleteLesson(lectureId);
    } catch (error) {
      throw new Error('Failed to delete lecture');
    }
  }

  updateLecture = async (lectureId: string, lectureData: any): Promise<any> => {
    try {
      return await this.updateLesson(lectureId, lectureData);
    } catch (error) {
      throw new Error('Failed to update lecture');
    }
  }

  getAssignmentStatusForStudent = (_assignmentId: string): string => {
    console.warn('getAssignmentStatusForStudent needs to be properly implemented');
    return 'not-started'; // Default status
  }

  fetchAssignmentsByLecture = async (lectureId: string): Promise<any[]> => {
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
  fetchCourses = () => {
    return this.getCourses();
  }

  fetchCourseById = (courseId: string): Promise<Course> => {
    return this.getCourse(courseId);
  }

  fetchModulesByCourse = (courseId: string): Promise<CourseModule[]> => {
    return this.getCourseModules(courseId);
  }

  fetchLectureById = (lectureId: string): Promise<Lesson> => {
    return this.getLesson(lectureId);
  }

  markLectureComplete = (lectureId: string): Promise<any> => {
    return this.markLessonComplete(lectureId);
  }

  isLectureCompleted = (lectureId: string) => {
    console.warn('isLectureCompleted is deprecated - use isLessonCompleted');
    return this.isLessonCompleted(lectureId);
  }

  // Mock compatibility methods for smooth migration
  async fetchLecturesByModule(moduleId: string): Promise<Lesson[]> {
    // This needs course context in the new API
    console.warn('fetchLecturesByModule needs course context - use getModuleLessons(courseId, moduleId)');
    try {
      // Try to find the course context by getting all courses and their modules
      const courses = await this.getCourses();
      const moduleIdNum = parseInt(moduleId);
      
      for (const course of courses) {
        try {
          const modules = await this.getCourseModules(course.id);
          const targetModule = modules.find(m => m.id === moduleIdNum);
          if (targetModule) {
            return await this.getModuleLessons(course.id, moduleIdNum);
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

  async fetchLesson(lessonId: string): Promise<Lesson> {
    try {
      const response = await this.api.get(`/courses/lessons/${lessonId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch lesson');
    }
  }

  async fetchModuleById(_moduleId: string): Promise<CourseModule | null> {
    // This needs course context, for now return null
    console.warn('fetchModuleById needs course context');
    return null;
  }

  // Progress tracking compatibility
  getModuleProgress(_moduleId: string): number {
    console.warn('getModuleProgress needs course context - use getMyProgress');
    return 0;
  }

  getCourseProgressLegacy(_courseId: string): number {
    console.warn('getCourseProgressLegacy is deprecated - use getCourseProgress(courseId, studentId)');
    return 0;
  }

  getCourseStatus(_courseId: string): string {
    console.warn('getCourseStatus needs updating to use new API');
    return 'not-started';
  }

  // =============================================================================
  // GROUP MANAGEMENT
  // =============================================================================

  async getGroups(): Promise<Group[]> {
    try {
      const response = await this.api.get('/admin/groups');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch groups');
    }
  }

  async getTeacherGroups(): Promise<Group[]> {
    try {
      const response = await this.api.get('/admin/groups');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch teacher groups');
    }
  }

  async getCourseGroups(courseId: string): Promise<CourseGroupAccess[]> {
    try {
      const response = await this.api.get(`/courses/${courseId}/groups`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch course groups');
    }
  }

  async grantCourseAccessToGroup(courseId: string, groupId: number): Promise<void> {
    try {
      await this.api.post(`/courses/${courseId}/groups/${groupId}`);
    } catch (error) {
      throw new Error('Failed to grant course access to group');
    }
  }

  async revokeCourseAccessFromGroup(courseId: string, groupId: number): Promise<void> {
    try {
      await this.api.delete(`/courses/${courseId}/groups/${groupId}`);
    } catch (error) {
      throw new Error('Failed to revoke course access from group');
    }
  }

  // =============================================================================
  // ADMIN MANAGEMENT
  // =============================================================================

  async getAdminDashboard(): Promise<AdminDashboard> {
    try {
      const response = await this.api.get('/admin/dashboard');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch admin dashboard');
    }
  }

  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: string;
    group_id?: number;
    is_active?: boolean;
    search?: string;
  }): Promise<UserListResponse> {
    try {
      const response = await this.api.get('/admin/users', { params });
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch users');
    }
  }

  async updateUser(userId: number, userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await this.api.put(`/admin/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update user');
    }
  }

  async deactivateUser(userId: number): Promise<void> {
    try {
      await this.api.delete(`/admin/users/${userId}`);
    } catch (error) {
      throw new Error('Failed to deactivate user');
    }
  }

  async assignUserToGroup(userId: number, groupId: number): Promise<void> {
    try {
      await this.api.post(`/admin/users/${userId}/assign-group`, { group_id: groupId });
    } catch (error) {
      throw new Error('Failed to assign user to group');
    }
  }

  async bulkAssignUsersToGroup(userIds: number[], groupId: number): Promise<void> {
    try {
      await this.api.post('/admin/users/bulk-assign-group', {
        user_ids: userIds,
        group_id: groupId
      });
    } catch (error) {
      throw new Error('Failed to bulk assign users to group');
    }
  }

  async createGroup(groupData: CreateGroupRequest): Promise<Group> {
    try {
      const response = await this.api.post('/admin/groups', groupData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create group');
    }
  }

  async updateGroup(groupId: number, groupData: UpdateGroupRequest): Promise<Group> {
    try {
      const response = await this.api.put(`/admin/groups/${groupId}`, groupData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update group');
    }
  }

  async deleteGroup(groupId: number): Promise<void> {
    try {
      await this.api.delete(`/admin/groups/${groupId}`);
    } catch (error) {
      throw new Error('Failed to delete group');
    }
  }

  async assignTeacherToGroup(groupId: number, teacherId: number): Promise<void> {
    try {
      await this.api.post(`/admin/groups/${groupId}/assign-teacher`, { teacher_id: teacherId });
    } catch (error) {
      throw new Error('Failed to assign teacher to group');
    }
  }

  async getGroupStudents(groupId: number): Promise<User[]> {
    try {
      const response = await this.api.get(`/admin/groups/${groupId}/students`);
      return response.data || [];
    } catch (error) {
      console.error(`Failed to fetch group students for group ${groupId}:`, error);
      // Возвращаем пустой массив вместо выброса исключения
      return [];
    }
  }

  async getStudentProgress(studentId: string): Promise<any[]> {
    try {
      const response = await this.api.get(`/progress/student/${studentId}`);
      return response.data || [];
    } catch (error) {
      console.error('Failed to fetch student progress:', error);
      // Возвращаем пустой массив вместо выброса исключения
      return [];
    }
  }

  async addStudentToGroup(groupId: number, studentId: number): Promise<void> {
    try {
      await this.api.post(`/admin/groups/${groupId}/students`, { student_id: studentId });
    } catch (error) {
      throw new Error('Failed to add student to group');
    }
  }

  async removeStudentFromGroup(groupId: number, studentId: number): Promise<void> {
    try {
      await this.api.delete(`/admin/groups/${groupId}/students/${studentId}`);
    } catch (error) {
      throw new Error('Failed to remove student from group');
    }
  }

  async bulkAddStudentsToGroup(groupId: number, studentIds: number[]): Promise<void> {
    try {
      await this.api.post(`/admin/groups/${groupId}/students/bulk`, studentIds);
    } catch (error) {
      throw new Error('Failed to bulk add students to group');
    }
  }

  async createUser(userData: CreateUserRequest): Promise<{ user: User; generated_password?: string }> {
    try {
      const response = await this.api.post('/admin/users/single', userData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create user');
    }
  }

  async resetUserPassword(userId: number): Promise<{ new_password: string; user_email: string }> {
    try {
      const response = await this.api.post(`/admin/reset-password/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to reset user password');
    }
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
  updateProfile,
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
  fetchLesson,
  getAssignments,
  getAssignment,
  submitAssignment,
  getMySubmissions,
  // File upload
  uploadAssignmentFile,
  uploadSubmissionFile,
  downloadFile,
  getFileUrl,
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
  isLectureCompleted,
  // Group management
  getGroups,
  getTeacherGroups,
  getCourseGroups,
  grantCourseAccessToGroup,
  revokeCourseAccessFromGroup,
  // Admin management
  getAdminDashboard,
  getUsers,
  updateUser,
  deactivateUser,
  assignUserToGroup,
  bulkAssignUsersToGroup,
  createGroup,
  updateGroup,
  deleteGroup,
  assignTeacherToGroup,
  getGroupStudents,
  getStudentProgress,
  createUser,
  resetUserPassword
} = apiClient;
