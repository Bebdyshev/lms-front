import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarDesktop, SidebarMobile } from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import ToastContainer from '../components/Toast.jsx';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex">
      <SidebarDesktop />
      <main className="flex-1 lg:ml-64 ml-0 bg-gray-50 min-h-screen">
        <Topbar onOpenSidebar={() => setMobileOpen(true)} />
        <div className="p-8">
          <Outlet />
        </div>
        <ToastContainer />
      </main>
      <SidebarMobile open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </div>
  );
}
