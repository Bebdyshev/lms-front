import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import apiClient from '../services/api';
import logoIco from '../assets/masteredlogo-ico.ico';

// Navigation items based on user roles
function getNavigationItems(userRole, unreadCount) {
  const allItems = [
    ['/dashboard', 'Dashboard', '/assets/home.svg', 0, null], // Available to all
    ['/courses', 'My Courses', '/assets/courses.svg', 0, ['student']], // Students only
    ['/assignments', 'Assignments', '/assets/courses.svg', 0, ['student']], // Students only
    ['/chat', 'Chat', '/assets/user.svg', unreadCount, null], // Available to all
    ['/profile', 'Profile', '/assets/user.svg', 0, null], // Available to all
    ['/teacher', 'Teacher Dashboard', '/assets/user.svg', 0, ['teacher', 'admin']], // Teachers and admins
    ['/teacher/courses', 'My Courses', '/assets/courses.svg', 0, ['teacher', 'admin']], // Teachers and admins
    ['/admin', 'Admin Panel', '/assets/user.svg', 0, ['admin']], // Admins only
    ['/settings', 'Settings', '/assets/user.svg', 0, null], // Available to all
  ];

  return allItems;
}

export default function Sidebar() {
  const [unread, setUnread] = useState(0);
  const { user } = useAuth();
  
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
  return (
    <aside className="hidden lg:flex w-64 h-screen fixed top-0 left-0 bg-white border-r p-6 flex-col">
      <div className="flex items-center mb-8">
        <img src={logoIco} alt="Master Education" className="w-8 h-8 rounded" />
        <div className="ml-3 leading-tight">
          <div className="text-lg font-semibold text-gray-900 -mt-1">Master Education</div>
        </div>
      </div>
      
      <nav className="flex flex-col space-y-1 text-base flex-1">
        {getNavigationItems(user?.role, unread).map(([to, label, icon, badge, roles]) => {
          // Skip items if user doesn't have required role
          if (roles && !roles.includes(user?.role)) return null;
          
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-link ${isActive ? 'nav-link-active' : ''}`
              }
            >
              <img src={icon} alt="" className="w-5 h-5 mr-3 opacity-70" />
              <span className="flex-1 text-gray-800">{label}</span>
              {badge > 0 && (
                <span className="ml-2 text-xs bg-red-600 text-white rounded-full px-2 py-0.5">{badge}</span>
              )}
            </NavLink>
          );
        }).filter(Boolean)}
      </nav>
      
      {}
      <div className="mt-auto pt-6 border-t">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
            <div className="text-xs text-gray-500 capitalize">{user?.role || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function SidebarDesktop() {
  return <Sidebar />;
}

export function SidebarMobile({ open, onClose }) {
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
