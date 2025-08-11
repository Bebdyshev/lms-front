import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout.jsx';
import AppLayout from '../layouts/AppLayout.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import CoursesPage from '../pages/CoursesPage.jsx';
import CourseOverviewPage from '../pages/CourseOverviewPage.jsx';
import ModulePage from '../pages/ModulePage.jsx';
import LecturePage from '../pages/LecturePage.jsx';
import AssignmentsPage from '../pages/AssignmentsPage.jsx';
import AssignmentPage from '../pages/AssignmentPage.jsx';
import ChatPage from '../pages/ChatPage.jsx';
import TeacherDashboard from '../pages/TeacherDashboard.jsx';
import AdminDashboard from '../pages/AdminDashboard.jsx';
import QuizzesPage from '../pages/QuizzesPage.jsx';
import QuizPage from '../pages/QuizPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import TeacherCoursesPage from '../pages/TeacherCoursesPage.jsx';
import CourseBuilderPage from '../pages/CourseBuilderPage.jsx';

function RequireAuth() {
  const isAuthed = Boolean(localStorage.getItem('sid'));
  if (!isAuthed) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/course/:courseId" element={<CourseOverviewPage />} />
            <Route path="/module/:moduleId" element={<ModulePage />} />
            <Route path="/lecture/:lectureId" element={<LecturePage />} />
            <Route path="/assignments" element={<AssignmentsPage />} />
            <Route path="/assignment/:id" element={<AssignmentPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/teacher" element={<TeacherDashboard />} />
            <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
            <Route path="/teacher/course/:courseId/builder" element={<CourseBuilderPage />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/quizzes" element={<QuizzesPage />} />
            <Route path="/quiz/:id" element={<QuizPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
} 