import { useState } from 'react';

export default function ProfilePage() {
  const [name, setName] = useState<string>('Fikrat Huseynov');
  const sid: string = localStorage.getItem('sid') || 'demo';
  const role: string = localStorage.getItem('role') || 'student';
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="bg-white rounded-2xl shadow-card p-6 max-w-xl space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Full name</label>
          <input className="w-full border rounded-lg px-3 py-2" value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} />
        </div>
        <div className="text-sm text-gray-600">SID: <span className="font-medium text-gray-900">{sid}</span></div>
        <div className="text-sm text-gray-600">Role: <span className="font-medium text-gray-900">{role}</span></div>
      </div>
    </div>
  );
}


