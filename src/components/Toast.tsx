import { useEffect, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface ToastEventDetail {
  message: string;
  type?: ToastType;
}

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export function toast(message: string, type: ToastType = 'info') {
  window.dispatchEvent(new CustomEvent<ToastEventDetail>('app:toast', { detail: { message, type } }));
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    function onToast(e: Event) {
      const custom = e as CustomEvent<ToastEventDetail>;
      const id = Date.now() + Math.random();
      const item: ToastItem = { id, message: custom.detail.message, type: custom.detail.type || 'info' };
      setItems(list => [...list, item]);
      setTimeout(() => setItems(list => list.filter(x => x.id !== id)), 3000);
    }
    window.addEventListener('app:toast', onToast as EventListener);
    return () => window.removeEventListener('app:toast', onToast as EventListener);
  }, []);

  const color = (type: ToastType) => ({
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


