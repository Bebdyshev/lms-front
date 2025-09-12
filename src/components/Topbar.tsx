import { useAuth } from '../contexts/AuthContext.tsx';
import { useEffect, useState } from 'react';
import { connectSocket } from '../services/socket';
import { Badge } from './ui/badge';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import StreakIcon from './StreakIcon';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  
  const firstName = user?.name?.split(' ')[0] || 'User';
  
  useEffect(() => {
    if (!user) return;

    // Connect to socket and load unread count
    const socket = connectSocket();
    
    const loadUnreadCount = () => {
      if (socket.connected) {
        socket.emit('unread:count', (response: { unread_count: number }) => {
          setUnreadCount(response.unread_count || 0);
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
    
    return () => {
      socket.off('unread:update', handleUnreadUpdate);
    };
  }, [user]);
  
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 flex items-center justify-between">
      <div>
        <div className="text-sm sm:text-base text-gray-500">Welcome back</div>
        <div className="text-xl sm:text-2xl font-semibold text-gray-900">{firstName}!</div>
        {user?.role && (
          <div className="text-xs sm:text-sm text-gray-400 capitalize">{user.role}</div>
        )}
      </div>
      <div className="flex items-center gap-3">
        {/* Daily Streak */}
        <StreakIcon />
        
        {/* Индикатор сообщений */}
        <Link to="/chat" className="relative">
          <button className="w-10 h-10 sm:w-10 sm:h-10 rounded-lg bg-white border flex items-center justify-center hover:bg-gray-50">
            <Bell className="w-5 h-5" />
          </button>
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Link>
        
        <button className="lg:hidden w-10 h-10 rounded-lg bg-white border text-lg" onClick={onOpenSidebar} aria-label="Open menu">☰</button>
      </div>
    </div>
  );
}


