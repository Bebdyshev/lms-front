import { useState } from 'react';
import { SidebarDesktop, SidebarMobile } from '../components/Sidebar.tsx';
import Topbar from '../components/Topbar.tsx';
import ToastContainer from '../components/Toast.tsx';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex">
      <SidebarDesktop />
      <main className="flex-1 bg-gray-50 min-h-screen lg:pl-64 overflow-x-hidden">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <div className="p-8">
          {children}
        </div>
        <ToastContainer />
      </main>
      <SidebarMobile open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
