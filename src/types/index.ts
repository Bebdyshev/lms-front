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
  daily_streak?: number; // Current daily streak count
  last_activity_date?: string; // Last date when student was active
  total_study_time_minutes?: number; // Total study time in minutes
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
// STEP TYPES
// =============================================================================

export interface StepAttachment {
  id: number;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface Step {
  id: number;
  lesson_id: number;
  title: string;
  content_type: 'text' | 'video_text' | 'quiz';
  video_url?: string;
  content_text?: string;
  attachments?: string; // JSON string of StepAttachment[]
  order_index: number;
  created_at: string;
}

export interface StepProgress {
  id: number;
  user_id: number;
  course_id: number;
  lesson_id: number;
  step_id: number;
  status: 'not_started' | 'completed';
  visited_at?: string;
  completed_at?: string;
  time_spent_minutes: number;
}

export interface StepProgressCreate {
  step_id: number;
  time_spent_minutes: number;
}

export interface StudentStepProgress {
  student_id: number;
  student_name: string;
  completed_steps: number;
  total_steps: number;
  completion_percentage: number;
  time_spent_minutes: number;
}

export interface LessonStepsProgress {
  lesson_id: number;
  lesson_title: string;
  total_steps: number;
  students_progress: StudentStepProgress[];
}

export interface ModuleStepsProgress {
  module_id: number;
  module_title: string;
  lessons: LessonStepsProgress[];
}

export interface CourseStepsProgress {
  course_id: number;
  course_title: string;
  total_students: number;
  modules: ModuleStepsProgress[];
}

export interface StudentProgressOverview {
  student_id: number;
  student_name: string;
  total_courses: number;
  total_lessons: number;
  total_steps: number;
  completed_lessons: number;
  completed_steps: number;
  overall_completion_percentage: number;
  total_time_spent_minutes: number;
  daily_streak?: number; // Current daily streak count
  last_activity_date?: string; // Last date when student was active
  courses: StudentCourseProgress[];
}

export interface StudentCourseProgress {
  course_id: number;
  course_title: string;
  teacher_name: string;
  cover_image_url?: string;
  total_lessons: number;
  total_steps: number;
  completed_lessons: number;
  completed_steps: number;
  completion_percentage: number;
  time_spent_minutes: number;
  last_accessed?: string;
}

export interface DailyStreakInfo {
  student_id: number;
  student_name: string;
  daily_streak: number;
  last_activity_date?: string;
  streak_status: 'not_started' | 'active' | 'at_risk' | 'broken';
  is_active_today: boolean;
  total_study_time_minutes: number;
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
  teacher_name?: string; // Added to match backend response
  image?: string;
  coverImageUrl?: string;
  estimatedDurationMinutes?: number;
  isActive?: boolean;
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
  total_lessons?: number;
  lessons?: Lesson[];
  created_at: string;
  updated_at: string;
}

// Updated lesson interface without content fields
export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string;
  order_index: number;
  duration_minutes?: number;
  created_at: string;
  updated_at: string;
  is_completed?: boolean; // For student view
  steps?: Step[];
  total_steps?: number;
  next_lesson_id?: number | null;
}

// Legacy lesson interface for backward compatibility (will be removed)
export interface LegacyLesson {
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
  letter?: string; // For SAT format: A, B, C, D
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
  // SAT-specific fields
  explanation?: string; // Explanation for the correct answer
  original_image_url?: string; // URL of the original SAT image
  is_sat_question?: boolean; // Flag to identify SAT questions
  content_text?: string; // The full content/passage that the question is based on
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
  group_id?: number;
  title: string;
  description: string;
  assignment_type: AssignmentType;
  content: any; // JSON content with questions and options
  max_score: number;
  time_limit_minutes?: number;
  due_date?: string; // Deadline for assignment
  file_url?: string; // File attachment for assignment
  allowed_file_types?: string[]; // Allowed file types for submissions
  max_file_size_mb?: number; // Max file size in MB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AssignmentType = 
  | 'single_choice' 
  | 'multiple_choice' 
  | 'picture_choice'
  | 'fill_in_blanks'
  | 'matching'
  | 'matching_text'
  | 'free_text'
  | 'file_upload'
  | 'quiz' 
  | 'essay' 
  | 'coding' 
  | 'mixed';

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
  user_id: string;
  answers: any; // JSON with student answers
  file_url?: string; // File attachment for submission
  submitted_file_name?: string; // Original filename
  score?: number;
  max_score: number;
  is_graded: boolean;
  submitted_at: string;
  graded_at?: string;
  status: SubmissionStatus;
}

export type SubmissionStatus = 'draft' | 'submitted' | 'graded' | 'needs_revision' | 'overdue';

export interface SubmissionAnswer {
  question_id: string;
  answer: string | string[] | File;
  points_earned?: number;
}

export interface SubmitAssignmentRequest {
  answers: any;
  file_url?: string;
  submitted_file_name?: string;
}

// =============================================================================
// ASSIGNMENT STATUS TYPES
// =============================================================================

export interface AssignmentStatus {
  status: string;
  attemptsLeft: number;
  late?: boolean;
  score?: number;
  feedback?: string;
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
  partner_id: number;
  partner_name: string;
  partner_role: string;
  partner_avatar?: string;
  last_message: {
    content: string;
    created_at: string | null;
    from_me: boolean;
  };
  unread_count: number;
}

export interface Message {
  id: number;
  from_user_id: number;
  to_user_id: number;
  sender_name?: string;
  recipient_name?: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface SendMessageRequest {
  to_user_id: number;
  content: string;
}

export interface AvailableContact {
  user_id: number;
  name: string;
  role: string;
  avatar_url?: string;
  student_id?: string;
}

export interface Conversation {
  partner_id: number;
  partner_name: string;
  partner_role: string;
  partner_avatar?: string;
  last_message: {
    content: string;
    created_at: string | null;
    from_me: boolean;
  };
  unread_count: number;
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
