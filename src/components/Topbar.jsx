import React from 'react';

export default function Topbar({ onOpenSidebar }) {
  const name = 'Fikrat';
  return (
    <div className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur border-b px-4 md:px-6 py-3 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-500">Welcome back</div>
        <div className="text-xl font-semibold text-gray-900">{name}!</div>
      </div>
      <div className="flex items-center gap-3">
        <button className="lg:hidden w-9 h-9 rounded-lg bg-white border" onClick={onOpenSidebar}>☰</button>
        
      </div>
    </div>
  );
}


