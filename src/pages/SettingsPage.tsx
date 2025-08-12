import { useState } from 'react';

export default function SettingsPage() {
  const [notifications, setNotifications] = useState<boolean>(true);
  const [theme, setTheme] = useState<string>('light');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Notifications</label>
          <input 
            type="checkbox" 
            checked={notifications} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotifications(e.target.checked)} 
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Theme</label>
          <select 
            value={theme} 
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTheme(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}


