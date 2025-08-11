import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getUnreadThreadsCount } from '../services/api';
import logoIco from '../assets/masteredlogo-ico.ico';

export default function Sidebar() {
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    setUnread(getUnreadThreadsCount());
    const it = setInterval(() => setUnread(getUnreadThreadsCount()), 8000);
    return () => clearInterval(it);
  }, []);
  return (
    <aside className="hidden lg:flex w-64 h-screen fixed top-0 left-0 bg-white border-r p-6 flex-col">
      <div className="flex items-center mb-8">
        <img src={logoIco} alt="Master Education" className="w-8 h-8 rounded" />
        <div className="ml-3 leading-tight">
          <div className="text-lg font-semibold text-gray-900 -mt-1">Master Education</div>
        </div>
      </div>
      
      <nav className="flex flex-col space-y-1 text-base flex-1">
        {[
          ['/', 'Dashboard', '/assets/home.svg'],
          ['/courses', 'My Courses', '/assets/courses.svg'],
          ['/assignments', 'Assignments', '/assets/courses.svg'],
          ['/chat', 'Chat', '/assets/user.svg', unread],
          ['/profile', 'Profile', '/assets/profile.svg'],
          ['/teacher', 'Teacher', '/assets/user.svg'],
          ['/admin', 'Admin', '/assets/user.svg'],
          ['/settings', 'Settings', '/assets/settings.svg'],
        ].map(([to, label, icon, badge]) => (
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
        ))}
      </nav>
      
      {}
      <div className="mt-auto pt-6 border-t">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
            FH
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">Fikrat Huseynov</div>
            <div className="text-xs text-gray-500">Student</div>
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
