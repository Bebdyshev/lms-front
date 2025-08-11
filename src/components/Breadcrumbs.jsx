import React from 'react';
import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items = [] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      {items.map((it, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span className="opacity-50">/</span>}
          {it.to ? (
            <Link to={it.to} className="hover:text-gray-900">{it.label}</Link>
          ) : (
            <span className="text-gray-900">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}


