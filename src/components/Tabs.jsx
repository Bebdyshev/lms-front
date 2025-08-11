import React from 'react';

export default function Tabs({ tabs = [], value, onChange }) {
  return (
    <div className="bg-gray-100 rounded-full p-1 inline-flex">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
            value === i ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}


