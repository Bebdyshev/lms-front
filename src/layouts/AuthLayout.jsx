import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-500">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          {children}
      </div>
    </div>
  );
}
