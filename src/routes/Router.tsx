import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NextStepProvider } from 'nextstepjs';
import { AuthProvider } from '../contexts/AuthContext.tsx';
import { SettingsProvider } from '../contexts/SettingsContext';
import OnboardingManager from '../components/OnboardingManager.tsx';
import ProtectedRoute from '../components/ProtectedRoute.tsx';
import AppLayout from '../layouts/AppLayout.tsx';
import LoginPage from '../pages/LoginPage.tsx';
import DashboardPage from '../pages/DashboardPage.tsx';
import CoursesPage from '../pages/CoursesPage.tsx';
import CourseOverviewPage from '../pages/CourseOverviewPage.tsx';
import ModulePage from '../pages/ModulePage.tsx';
import LecturePage from '../pages/LecturePage.tsx';
import AssignmentsPage from '../pages/assingments/AssignmentsPage.tsx';
import AssignmentPage from '../pages/assingments/AssignmentPage.tsx';
import AssignmentBuilderPage from '../pages/assingments/AssignmentBuilderPage.tsx';
import AssignmentGradingPage from '../pages/assingments/AssignmentGradingPage.tsx';
import AssignmentStudentProgressPage from '../pages/assingments/AssignmentStudentProgressPage.tsx';
import ChatPage from '../pages/ChatPage.tsx';
import TeacherDashboard from '../pages/TeacherDashboard.tsx';

import QuizzesPage from '../pages/QuizzesPage.tsx';
import QuizPage from '../pages/QuizPage.tsx';
import ProfilePage from '../pages/ProfilePage.tsx';
import SettingsPage from '../pages/SettingsPage.tsx';
import TeacherCoursesPage from '../pages/TeacherCoursesPage.tsx';
import CourseBuilderPage from '../pages/CourseBuilderPage.tsx';
import CreateCourseWizard from '../pages/CreateCourseWizard.tsx';
// TeacherCoursePage functionality moved to CourseBuilderPage
import LessonEditPage from '../pages/LessonEditPage.tsx';
import TeacherClassPage from '../pages/TeacherClassPage.tsx';
import TeacherAttendancePage from '../pages/TeacherAttendancePage.tsx';
import AdminDashboard from '../pages/admin/AdminDashboard.tsx';
import AssignmentZeroSubmissions from '../pages/admin/AssignmentZeroSubmissions.tsx';
import QuestionReportsPage from '../pages/admin/QuestionReportsPage.tsx';
import UserManagement from '../pages/UserManagement.tsx';
import ManualUnlocksPage from '../pages/admin/ManualUnlocksPage.tsx';
import LessonPage from '../pages/LessonPage.tsx';
import CourseProgressPage from '../pages/CourseProgressPage.tsx';
import EventManagement from '../pages/EventManagement.tsx';
import CreateEvent from '../pages/CreateEvent.tsx';
import EditEvent from '../pages/EditEvent.tsx';
import Calendar from '../pages/Calendar.tsx';
import LandingPage from '../pages/LandingPage.tsx';
import AnalyticsPage from '../pages/analytics/AnalyticsPage.tsx';
import FavoriteFlashcardsPage from '../pages/FavoriteFlashcardsPage.tsx';
import CuratorHomeworksPage from '../pages/CuratorHomeworksPage.tsx';
import CuratorLeaderboardPage from '../pages/CuratorLeaderboardPage.tsx';
import AssignmentZeroPage from '../pages/AssignmentZeroPage';
import { StudentAnalyticsPage } from '../pages/analytics/StudentAnalyticsPage.tsx';

export default function Router() {
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          <NextStepProvider>
            <OnboardingManager>
              <Routes>
                <Route path="/" element={
                  <ProtectedRoute requireAuth={false}>
                    <LandingPage />
                  </ProtectedRoute>
                } />
                {/* Auth Routes */}
                <Route path="/login" element={
                  <ProtectedRoute requireAuth={false}>
                      <LoginPage />
                  </ProtectedRoute>
                } />

          {/* Assignment Zero - Self-Assessment for new students */}
          <Route path="/assignment-zero" element={
            <ProtectedRoute allowedRoles={['student']} skipAssignmentZeroCheck={true}>
              <AssignmentZeroPage />
            </ProtectedRoute>
          } />

          {/* Protected App Routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout>
                <Navigate to="/dashboard" replace />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/courses" element={
            <ProtectedRoute>
              <AppLayout>
                <CoursesPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/course/:courseId" element={
            <ProtectedRoute>
              <AppLayout>
                <CourseOverviewPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Updated module route with course context */}
          <Route path="/course/:courseId/module/:moduleId" element={
            <ProtectedRoute>
              <AppLayout>
                <ModulePage />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Legacy module route - redirect to courses page */}
          <Route path="/module/:moduleId" element={
            <Navigate to="/courses" replace />
          } />

          <Route path="/lecture/:lectureId" element={
            <ProtectedRoute>
              <AppLayout>
                <LecturePage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework" element={
            <ProtectedRoute>
              <AppLayout>
                <AssignmentsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/favorites" element={
            <ProtectedRoute allowedRoles={['student']}>
              <AppLayout>
                <FavoriteFlashcardsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <AssignmentPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/:id/grade" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <AssignmentGradingPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/:id/progress" element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <AppLayout>
                <AssignmentStudentProgressPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/new" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <AssignmentBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/new/lesson/:lessonId" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <AssignmentBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/new/group/:groupId" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <AssignmentBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/homework/:assignmentId/edit" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <AssignmentBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/chat" element={
            <ProtectedRoute>
              <AppLayout>
                <ChatPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/quizzes" element={
            <ProtectedRoute>
              <AppLayout>
                <QuizzesPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/quiz/:id" element={
            <ProtectedRoute>
              <AppLayout>
                <QuizPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/settings" element={
            <ProtectedRoute>
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Teacher Routes */}
          <Route path="/teacher" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <TeacherDashboard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/courses" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <TeacherCoursesPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/course/new" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <CreateCourseWizard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/course/:courseId" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <CourseBuilderPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/course/:courseId/progress" element={
            <ProtectedRoute>
              <AppLayout>
                <CourseProgressPage />
              </AppLayout>
            </ProtectedRoute>
          } />


          <Route path="/teacher/class" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <TeacherClassPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/course/:courseId/lesson/:lessonId/edit" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher', 'curator']}>
              <LessonEditPage />
            </ProtectedRoute>
          } />

          <Route path="/course/:courseId/lesson/:lessonId" element={
            <ProtectedRoute>
              <LessonPage />
            </ProtectedRoute>
          } />

          <Route path="/teacher/class/:classId" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <TeacherClassPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/teacher/attendance" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AppLayout>
                <TeacherAttendancePage />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
              <AdminDashboard />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <UserManagement />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/courses" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <TeacherCoursesPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/events" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <EventManagement />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/assignment-zero" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppLayout>
                <AssignmentZeroSubmissions />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/question-reports" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <AppLayout>
                <QuestionReportsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/manual-unlocks" element={
            <ProtectedRoute allowedRoles={['admin', 'teacher']}>
              <AppLayout>
                <ManualUnlocksPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/admin/events/create" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <CreateEvent />
            </ProtectedRoute>
          } />

          <Route path="/admin/events/:eventId/edit" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <EditEvent />
            </ProtectedRoute>
          } />

          <Route path="/calendar" element={
            <ProtectedRoute>
              <AppLayout>
                <Calendar />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute allowedRoles={['teacher', 'curator', 'admin']}>
              <AppLayout>
                <AnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/analytics/student/:studentId" element={
            <ProtectedRoute allowedRoles={['teacher', 'curator', 'admin']}>
              <AppLayout>
                <StudentAnalyticsPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/curator/homeworks" element={
            <ProtectedRoute allowedRoles={['curator', 'admin']}>
              <AppLayout>
                <CuratorHomeworksPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/curator/leaderboard" element={
            <ProtectedRoute allowedRoles={['curator', 'admin']}>
              <AppLayout>
                <CuratorLeaderboardPage />
              </AppLayout>
            </ProtectedRoute>
          } />

          <Route path="/curator/events/create" element={
            <ProtectedRoute allowedRoles={['curator', 'admin']}>
              <AppLayout>
                <CreateEvent />
              </AppLayout>
            </ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
            </OnboardingManager>
          </NextStepProvider>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
} 