import React from 'react';

export default function EmptyState({ title = 'Nothing here yet', subtitle = 'Come back later or create something new.' }) {
  return (
    <div className="text-center py-16 text-gray-600">
      <div className="text-2xl font-semibold mb-1">{title}</div>
      <div className="text-sm">{subtitle}</div>
    </div>
  );
}


