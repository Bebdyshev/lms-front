import { useAuth } from '../contexts/AuthContext.tsx';

interface TopbarProps {
  onOpenSidebar: () => void;
}

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const { user, logout } = useAuth();
  
  const firstName = user?.name?.split(' ')[0] || 'User';
  
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

        
        <button className="lg:hidden w-9 h-9 rounded-lg bg-white border" onClick={onOpenSidebar}>☰</button>
      </div>
    </div>
  );
}


