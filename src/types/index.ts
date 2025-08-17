// =============================================================================
// CORE TYPES
// =============================================================================

export interface User {
  id: string;
  email: string;
  full_name: string;
  name?: string; // Для обратной совместимости
  role: UserRole;
  student_id?: string;
  teacher_name?: string;
  curator_name?: string;
  group_id?: number; // ID группы, в которой состоит студент
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'student' | 'teacher' | 'curator' | 'admin';

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

// =============================================================================
// COURSE TYPES
// =============================================================================

export interface Course {
  id: string;
  title: string;
  description: string;
  teacher_id: string;
  teacher?: User;
  image?: string;
  created_at: string;
  updated_at: string;
  progress?: number; // For student view
}

export interface Group {
  id: number;
  name: string;
  description?: string;
  teacher_id: number;
  teacher_name?: string;
  curator_id?: number;
  curator_name?: string;
  student_count: number;
  students?: User[];
  created_at: string;
  is_active: boolean;
}

export interface CourseGroupAccess {
  id: number;
  course_id: number;
  group_id: number;
  group_name?: string;
  student_count: number;
  granted_by: number;
  granted_by_name?: string;
  granted_at: string;
  is_active: boolean;
}

export interface AdminStats {
  total_users: number;
  total_students: number;
  total_teachers: number;
  total_curators: number;
  total_courses: number;
  total_active_enrollments: number;
  recent_registrations: number;
}

export interface AdminDashboard {
  stats: AdminStats;
  recent_users: User[];
  recent_groups: Group[];
  recent_courses: Array<{
    id: number;
    title: string;
    teacher_name: string;
    module_count: number;
    is_active: boolean;
    created_at: string;
  }>;
}

export interface UserListResponse {
  users: User[];
  total: number;
  skip: number;
  limit: number;
}

export interface GroupListResponse {
  groups: Group[];
  total: number;
  skip: number;
  limit: number;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  teacher_id: number;
  is_active?: boolean;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  teacher_id?: number;
  is_active?: boolean;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  student_id?: string;
  group_id?: number;
  is_active?: boolean;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  student_id?: string;
  group_id?: number;
  is_active?: boolean;
  password?: string;
}

export interface CourseModule {
  id: number;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  content_type: LessonContentType;
  video_url?: string;
  content_text?: string;
  order_index: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
  is_completed?: boolean; // For student view
  quiz_data?: QuizData;
}

export type LessonContentType = 'video' | 'text' | 'quiz' | 'materials' | 'mixed';

// =============================================================================
// QUIZ TYPES
// =============================================================================

export interface QuestionOption {
  id: string;
  text: string;
  is_correct: boolean;
  image_url?: string;
}

export interface Question {
  id: string;
  assignment_id: string;
  question_text: string;
  question_type: 'single_choice' | 'multiple_choice' | 'fill_blank';
  options?: QuestionOption[];
  correct_answer: any; // Use any to avoid complex type issues
  points: number;
  order_index: number;
}

export interface QuizData {
  title: string;
  questions: Question[];
  time_limit_minutes?: number;
  max_score?: number;
}

export interface LessonMaterial {
  id: string;
  lesson_id: string;
  title: string;
  file_path: string;
  file_type: string;
  file_size: number;
  file_url: string;
  file_size_bytes?: number;
  uploaded_at: string;
}

// =============================================================================
// ASSIGNMENT TYPES
// =============================================================================

export interface Assignment {
  id: string;
  lesson_id?: string;
  title: string;
  description: string;
  assignment_type: AssignmentType;
  questions: Question[];
  max_score: number;
  time_limit_minutes?: number;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export type AssignmentType = 'quiz' | 'essay' | 'coding' | 'file_upload' | 'mixed';

export type QuestionType = 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'fill_blank' 
  | 'matching' 
  | 'free_text' 
  | 'picture_choice'
  | 'file_upload';

// QuestionOption is already defined in QUIZ TYPES section above

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  answers: SubmissionAnswer[];
  score?: number;
  feedback?: string;
  submitted_at: string;
  graded_at?: string;
  status: SubmissionStatus;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'needs_revision';

export interface SubmissionAnswer {
  question_id: string;
  answer: string | string[] | File;
  points_earned?: number;
}

// =============================================================================
// ASSIGNMENT STATUS TYPES
// =============================================================================

export interface AssignmentStatus {
  status: string;
  attemptsLeft: number;
  late?: boolean;
}

// =============================================================================
// QUIZ TYPES  
// =============================================================================

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimitSec?: number;
}

export interface QuizQuestion {
  id: string;
  body: string;
  type: 'single' | 'short' | 'multiple';
  options?: string[];
  correct?: number[];
  correctText?: string;
}

// =============================================================================
// PROGRESS TYPES
// =============================================================================

export interface StudentProgress {
  id: string;
  student_id: string;
  course_id: string;
  lessons_completed: number;
  total_lessons: number;
  assignments_completed: number;
  total_assignments: number;
  total_score: number;
  max_possible_score: number;
  time_spent_minutes: number;
  last_activity: string;
  progress_percentage: number;
}

export interface LessonCompletion {
  lesson_id: string;
  student_id: string;
  completed_at: string;
  time_spent_minutes: number;
}

// =============================================================================
// DASHBOARD TYPES
// =============================================================================

export interface DashboardStats {
  courses_count: number;
  total_study_time: number;
  overall_progress: number;
  assignments_pending: number;
  messages_unread: number;
}

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  course_id?: string;
  created_at: string;
}

export type ActivityType = 'lesson_completed' | 'assignment_submitted' | 'course_enrolled' | 'message_received';

// =============================================================================
// MESSAGE TYPES
// =============================================================================

export interface MessageThread {
  id: string;
  title: string;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  sender?: User;
  content: string;
  attachments?: MessageAttachment[];
  created_at: string;
  is_read: boolean;
}

export interface MessageAttachment {
  id: string;
  message_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
}

// =============================================================================
// GROUP TYPES
// =============================================================================

export interface Group {
  id: number;
  name: string;
  description?: string;
  teacher_id: number;
  teacher_name?: string;
  curator_id?: number;
  curator_name?: string;
  student_count: number;
  students?: User[];
  created_at: string;
  is_active: boolean;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
}

export type EnrollmentStatus = 'active' | 'completed' | 'dropped' | 'suspended';

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// FORM TYPES
// =============================================================================

export interface CourseCreateData {
  title: string;
  description: string;
  teacher_id?: string;
}

export interface ModuleCreateData {
  title: string;
  description: string;
  course_id: string;
}

export interface LessonCreateData {
  title: string;
  description: string;
  module_id: string;
  content_type: LessonContentType;
  content_url?: string;
  content_text?: string;
  duration_minutes?: number;
}

export interface UserCreateData {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
  group_id?: string;
}

// =============================================================================
// COMPONENT PROP TYPES
// =============================================================================

export interface ComponentWithChildren {
  children: React.ReactNode;
}

export interface ComponentWithClassName {
  className?: string;
}

export interface LoadingState {
  loading: boolean;
  error?: string | null;
}

// =============================================================================
// ROUTE TYPES
// =============================================================================

export interface RouteParams {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  assignmentId?: string;
  userId?: string;
}

export interface NavigationItem {
  path: string;
  label: string;
  icon?: React.ComponentType;
  roles?: UserRole[];
  children?: NavigationItem[];
}
