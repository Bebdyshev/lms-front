import { io, Socket } from 'socket.io-client';
import { isAuthenticated } from './api';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

let socket: Socket | null = null;

// Access token is stored in cookies by TokenManager. We forward it via extraHeaders.
function getAccessTokenFromCookie(): string | null {
  const name = 'access_token=';
  const parts = document.cookie.split(';');
  for (let c of parts) {
    c = c.trim();
    if (c.startsWith(name)) return decodeURIComponent(c.substring(name.length));
  }
  return null;
}

export function connectSocket(): Socket {
  if (socket && socket.connected) return socket;
  const token = getAccessTokenFromCookie();
  socket = io(API_BASE_URL, {
    path: '/ws/socket.io',
    withCredentials: true,
    // Browsers cannot send custom headers over WS; use auth payload
    auth: token ? { token } : undefined,
    autoConnect: isAuthenticated(),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}


