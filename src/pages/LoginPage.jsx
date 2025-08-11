import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input.jsx';
import Button from '../components/Button.jsx';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = e => {
    e.preventDefault();
    localStorage.setItem('sid', studentId || 'demo');
    localStorage.setItem('role', 'student');
    navigate('/');
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-center mb-6">
        Sign In with a Master Education Account
      </h2>
      <form onSubmit={handleSubmit}>
        <Input
          label="Student ID"
          value={studentId}
          onChange={e => setStudentId(e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        <p className="text-xs text-gray-600 mb-4">
          If you don't know your credentials, please contact your curator.
        </p>
        <Button type="submit">Sign In</Button>
      </form>
    </div>
  );
}
