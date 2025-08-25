import { useAuth } from '../contexts/AuthContext.tsx';
import { useEffect, useState } from 'react';
import { getUnreadMessageCount } from '../services/api';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const firstName = user?.name?.split(' ')[0] || 'User';
  
  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const data = await getUnreadMessageCount();
        setUnreadCount(data.unread_count || 0);
      } catch (error) {
        console.warn('Failed to load unread count:', error);
      }
    };

    loadUnreadCount();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b px-4 md:px-6 py-3 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">Welcome back</div>
        <div className="text-xl font-semibold text-gray-900">{firstName}!</div>
        {user?.role && (
          <div className="text-xs text-gray-400 capitalize">{user.role}</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Индикатор сообщений */}
        <Link to="/chat" className="relative">
          <button className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center hover:bg-gray-50">
            <Bell className="w-4 h-4" />
          </button>
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Link>
        
        <button className="lg:hidden w-9 h-9 rounded-lg bg-white border" onClick={onOpenSidebar}>☰</button>
      </div>
    </div>
  );
}


