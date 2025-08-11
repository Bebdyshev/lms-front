import React from 'react';

export default function Button({ children, onClick, type = 'button', variant = 'primary', className = '' }) {
  const base = 'px-4 py-2 rounded-lg transition';
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-900 hover:bg-black text-white',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-800',
  };
  return (
    <button type={type} onClick={onClick} className={`${base} ${variants[variant] || variants.primary} ${className}`}>
      {children}
    </button>
  );
}
