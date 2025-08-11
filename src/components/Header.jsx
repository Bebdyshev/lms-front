import React from 'react';

export default function Header({ title }) {
  return (
    <header className="w-full bg-white shadow px-6 py-4 flex items-center">
      <h1 className="text-2xl font-semibold">{title}</h1>
    </header>
  );
}
