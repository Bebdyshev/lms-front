import React, { useState } from 'react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState(true);
  const [dark, setDark] = useState(false);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-xl space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={notifications} onChange={e => setNotifications(e.target.checked)} />
          Enable notifications
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} />
          Dark theme (coming soon)
        </label>
      </div>
    </div>
  );
}


