import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.tsx';
import apiClient from "../services/api";
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
  LogOut,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Navigation items based on user roles
type NavItemTuple = [to: string, label: string, Icon: LucideIcon, badge: number, roles: string[] | null];
function getNavigationItems(_userRole: string | undefined, unreadCount: number): NavItemTuple[] {
  const allItems: NavItemTuple[] = [
    ['/dashboard', 'Dashboard', Home, 0, null],
    ['/courses', 'My Courses', BookOpen, 0, ['student']],
    ['/assignments', 'My assignments', ClipboardList, 0, ['student']],
    ['/teacher/courses', 'My Courses', BookMarked, 0, ['teacher']],
    ['/admin/courses', 'Manage Courses', BookMarked, 0, ['admin']],
    ['/admin/users', 'Manage Users', Users, 0, ['admin']],
    ['/assignments', 'Assignments', ClipboardList, 0, ['teacher']],
    ['/chat', 'Chat', MessageCircle, unreadCount, null],
  ];

  return allItems;
}

export default function Sidebar() {
  const [unread, setUnread] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  
  useEffect(() => {
    // Load unread messages count
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const response = await apiClient.getUnreadMessageCount();
      setUnread(response.unread_count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <aside className="hidden lg:flex w-64 h-screen fixed top-0 left-0 bg-white border-r p-6 flex-col">
      <div className="flex items-center mb-8">
        <img src={logoIco} alt="Master Education" className="w-8 h-8 rounded" />
        <div className="ml-3 leading-tight">
          <div className="text-lg font-semibold text-gray-900 -mt-1">Master Education</div>
        </div>
      </div>
      
      <nav className="flex flex-col space-y-1 text-base flex-1">
        {getNavigationItems(user?.role, unread).map(([to, label, Icon, badge, roles]) => {
          // Skip items if user doesn't have required role
          if (roles && (!user?.role || !roles.includes(user.role))) return null;
          
          return (
            <NavLink
              key={to}
              to={to}
              end={to === '/courses' || to === '/teacher/courses'}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <Icon className="w-5 h-5 mr-3 opacity-70" />
              <span className="flex-1 text-gray-800">{label}</span>
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
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </div>
              <div className="ml-3 text-left">
                <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
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
  return <Sidebar />;
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
      <div className="absolute top-0 left-0 w-64 h-full bg-white border-r p-6">
        <Sidebar />
      </div>
    </div>
  );
}
