import React, { useEffect, useState } from 'react';

export function toast(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: { message, type } }));
}

export default function ToastContainer() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const id = Date.now() + Math.random();
      const item = { id, ...e.detail };
      setItems(list => [...list, item]);
      setTimeout(() => setItems(list => list.filter(x => x.id !== id)), 3000);
    }
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  const color = type => ({
    info: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
  }[type] || 'bg-gray-900 text-white');

  return (
    <div className="fixed bottom-6 right-6 space-y-2 z-50">
      {items.map(t => (
        <div key={t.id} className={`px-4 py-2 rounded-lg shadow-card ${color(t.type)}`}>{t.message}</div>
      ))}
    </div>
  );
}


