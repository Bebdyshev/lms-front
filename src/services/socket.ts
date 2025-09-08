import { io, Socket } from 'socket.io-client';
import { isAuthenticated } from './api';

const RAW_API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const API_BASE_URL = (typeof window !== 'undefined' && window.location.protocol === 'https:' && RAW_API_BASE_URL.startsWith('http://'))
  ? RAW_API_BASE_URL.replace('http://', 'https://')
  : RAW_API_BASE_URL;

let socket: Socket | null = null;
let lastToken: string | null = null;

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
  const token = getAccessTokenFromCookie();

  // If an existing socket has a different token, rebuild the connection
  if (socket) {
    const currentAuthToken = (socket as any)?.auth?.token ?? null;
    if (currentAuthToken !== token) {
      try { socket.disconnect(); } catch {}
      socket = null;
    } else if (socket.connected) {
      return socket;
    }
  }

  socket = io(API_BASE_URL, {
    path: '/ws/socket.io',
    withCredentials: true,
    // Browsers cannot send custom headers over WS; use auth payload
    auth: token ? { token } : undefined,
    autoConnect: isAuthenticated(),
    // Optimized reconnection settings for better stability
    reconnection: true,
    reconnectionAttempts: 5,  // Limited attempts instead of Infinity
    reconnectionDelay: 1000,  // Start with 1s delay
    reconnectionDelayMax: 10000,  // Max 10s delay
    timeout: 20000,  // 20s connection timeout
    // Prefer direct WebSocket; fall back only if it fails
    transports: ['websocket'],
    upgrade: true,
    rememberUpgrade: true,
    forceNew: true,
  });

  lastToken = token;

  // Add connection event listeners for debugging
  socket.on('connect', () => {
    console.log('🔗 Socket.IO connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket.IO disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket.IO connection error:', error);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket.IO reconnected after', attemptNumber, 'attempts');
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    // Refresh auth token before each reconnect attempt
    const freshToken = getAccessTokenFromCookie();
    (socket as any).auth = freshToken ? { token: freshToken } : undefined;
    lastToken = freshToken;
    console.log('🔄 Socket.IO reconnection attempt:', attemptNumber);
  });

  socket.on('reconnect_error', (error) => {
    console.error('❌ Socket.IO reconnection error:', error);
  });

  socket.on('reconnect_failed', () => {
    console.error('❌ Socket.IO reconnection failed');
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

// Call this after login/logout to force the socket to pick up a new token
export function refreshSocketAuth(): void {
  const current = getAccessTokenFromCookie();
  if (!socket) {
    if (isAuthenticated()) connectSocket();
    return;
  }
  if (current !== lastToken) {
    try { socket.disconnect(); } catch {}
    socket = null;
    connectSocket();
  }
}


