import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import { connectSocket } from '../services/socket';
import apiClient from '../services/api';
import logoIco from '../assets/masteredlogo-ico.ico';
import { 
  Home, 
  BookOpen, 
  ClipboardList, 
  MessageCircle, 
  UserCheck,
  Settings,
  BookMarked,
  ChevronDown,
  ChevronRight,
  LogOut,
  Users,
  GraduationCap,
  Calendar,
  BarChart3,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Course } from '../types';

// Navigation items based on user roles
type NavItemTuple = [to: string, label: string, Icon: LucideIcon, badge: number, roles: string[] | null];
function getNavigationItems(_userRole: string | undefined, unreadCount: number): NavItemTuple[] {
  const allItems: NavItemTuple[] = [
    ['/dashboard', 'Dashboard', Home, 0, null],
    ['/calendar', 'Calendar', Calendar, 0, null],
    ['/courses', 'My Courses', BookOpen, 0, ['student']],
    ['/assignments', 'My assignments', ClipboardList, 0, ['student']],
    ['/teacher/courses', 'My Courses', BookMarked, 0, ['teacher']],
    ['/teacher/class', 'My Class', GraduationCap, 0, ['teacher']],
    ['/analytics', 'Analytics', BarChart3, 0, ['teacher', 'curator', 'admin']],
    ['/admin/courses', 'Manage Courses', BookMarked, 0, ['admin']],
    ['/admin/users', 'Manage Users', Users, 0, ['admin']],
    ['/admin/events', 'Manage Events', Calendar, 0, ['admin']],
    ['/assignments', 'Assignments', ClipboardList, 0, ['teacher']],
    ['/chat', 'Chat', MessageCircle, unreadCount, null],
  ];

  return allItems;
}

type SidebarVariant = 'desktop' | 'mobile';

export default function Sidebar({ variant = 'desktop' }: { variant?: SidebarVariant } = {}) {
  const [unread, setUnread] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);
  const { user, logout } = useAuth();
  
  useEffect(() => {
    if (!user) return;

    // Connect to socket and load unread count
    const socket = connectSocket();
    
    const loadUnreadCount = () => {
      if (socket.connected) {
        socket.emit('unread:count', (response: { unread_count: number }) => {
          setUnread(response.unread_count || 0);
        });
      }
    };

    // Load initial count
    loadUnreadCount();

    // Listen for unread count updates
    const handleUnreadUpdate = () => {
      loadUnreadCount();
    };

    socket.on('unread:update', handleUnreadUpdate);
    
    // Слушаем событие обновления счетчика (для совместимости)
    const handleUpdateUnreadCount = () => {
      loadUnreadCount();
    };
    window.addEventListener('updateUnreadCount', handleUpdateUnreadCount);
    
    return () => {
      socket.off('unread:update', handleUnreadUpdate);
      window.removeEventListener('updateUnreadCount', handleUpdateUnreadCount);
    };
  }, [user]);

  // Load courses when expanding
  const loadCourses = async () => {
    if (courses.length > 0) return; // Already loaded
    
    setIsLoadingCourses(true);
    try {
      // Use dedicated my-courses endpoint for students, general endpoint for others
      const coursesData = user?.role === 'student' 
        ? await apiClient.getMyCourses()
        : await apiClient.getCourses();
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const handleCoursesToggle = () => {
    setIsCoursesExpanded(!isCoursesExpanded);
    if (!isCoursesExpanded) {
      loadCourses();
    }
  };

  const handleLogout = () => {
    logout();
  };

  const wrapperClass = variant === 'desktop'
    ? 'hidden lg:flex w-64 h-screen fixed top-0 left-0 bg-white border-r p-4 sm:p-6 flex-col'
    : 'flex w-64 h-full bg-white border-r p-4 sm:p-6 flex-col';

  return (
    <aside className={wrapperClass}>
      <div className="flex items-center mb-6 sm:mb-8">
        <img src={logoIco} alt="Master Education" className="w-7 h-7 sm:w-8 sm:h-8 rounded" />
        <div className="ml-3 leading-tight">
          <div className="text-base sm:text-lg font-semibold text-gray-900 -mt-1">Master Education</div>
        </div>
      </div>
      
      <nav className="flex flex-col space-y-1 flex-1">
        {getNavigationItems(user?.role, unread).map(([to, label, Icon, badge, roles]) => {
          // Skip items if user doesn't have required role
          if (roles && (!user?.role || !roles.includes(user.role))) return null;
          
          // Handle expandable My Courses
          if ((to === '/courses' && user?.role === 'student') || (to === '/teacher/courses' && user?.role === 'teacher')) {
            return (
              <div key={to}>
                {/* Main Courses Button */}
                <button
                  onClick={handleCoursesToggle}
                  className="w-full flex items-center rounded-xl text-gray-700 hover:bg-gray-100 transition-colors px-5 py-3 text-base lg:px-4 lg:py-2 lg:text-sm"
                >
                  <Icon className="w-6 h-6 lg:w-5 lg:h-5 mr-3 opacity-70" />
                  <span className="flex-1 text-gray-800 text-base lg:text-sm text-left">{label}</span>
                  {badge > 0 && (
                    <span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{badge}</span>
                  )}
                  <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${isCoursesExpanded ? 'rotate-90' : ''}`} />
                </button>
                
                {/* Expanded Courses List */}
                {isCoursesExpanded && (
                  <div className="ml-6 mt-1 space-y-1">
                    {isLoadingCourses ? (
                      <div className="px-4 py-2 text-sm text-gray-500">Loading courses...</div>
                    ) : courses.length === 0 ? (
                      <div className="px-4 py-2 text-sm text-gray-500">No courses found</div>
                    ) : (
                      courses.slice(0, 5).map((course) => (
                        <NavLink
                          key={course.id}
                          to={user?.role === 'teacher' ? `/teacher/course/${course.id}` : `/course/${course.id}`}
                          className={({ isActive }) =>
                            `flex items-center rounded-lg text-gray-600 hover:bg-gray-100 transition-colors px-3 py-2 text-sm ${isActive ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500' : ''}`
                          }
                        >
                          <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></div>
                          <span className="truncate">{course.title}</span>
                        </NavLink>
                      ))
                    )}
                    {courses.length > 5 && (
                      <NavLink
                        to={user?.role === 'teacher' ? '/teacher/courses' : '/courses'}
                        className="flex items-center rounded-lg text-blue-600 hover:bg-blue-50 transition-colors px-3 py-2 text-sm font-medium"
                      >
                        <span>View all courses ({courses.length})</span>
                      </NavLink>
                    )}
                  </div>
                )}
              </div>
            );
          }
          
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/courses' || to === '/teacher/courses'}
              className={({ isActive }) =>
                `flex items-center rounded-xl text-gray-700 hover:bg-gray-100 transition-colors 
                 px-5 py-3 text-base lg:px-4 lg:py-2 lg:text-sm ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="w-6 h-6 lg:w-5 lg:h-5 mr-3 opacity-70" />
              <span className="flex-1 text-gray-800 text-base lg:text-sm">{label}</span>
              {badge > 0 && (
                <span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{badge}</span>
              )}
            </NavLink>
          );
        }).filter(Boolean)}
      </nav>
      
      <div className="mt-auto pt-6 border-t">
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div className="ml-3 text-left">
                <div className="text-sm font-medium text-gray-900 line-clamp-1">{user?.name || 'User'}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role || 'Unknown'}</div>
              </div>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-lg shadow-lg py-2 z-10">
              <NavLink
                to="/profile"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <UserCheck className="w-4 h-4 mr-3" />
                Profile
              </NavLink>
              <NavLink
                to="/settings"
                onClick={() => setIsDropdownOpen(false)}
                className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Settings className="w-4 h-4 mr-3" />
                Settings
              </NavLink>
              <div className="border-t my-1"></div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function SidebarDesktop() {
  return <Sidebar variant="desktop" />;
}

interface SidebarMobileProps {
  open: boolean;
  onClose: () => void;
}

export function SidebarMobile({ open, onClose }: SidebarMobileProps) {
  if (!open) return null;
  return (
    <div className="lg:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="absolute top-0 left-0 w-64 h-full bg-white border-r p-0">
        <Sidebar variant="mobile" />
      </div>
    </div>
  );
}
