import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      if (apiClient.isAuthenticated()) {
        // Get current user info
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
        apiClient.setCurrentUser(currentUser);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      // If getting current user fails, clear tokens
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiClient.login(email, password);
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      const errorMessage = error.message || 'Login failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setError(null);
    }
  };

  const refreshUser = async () => {
    try {
      if (apiClient.isAuthenticated()) {
        const currentUser = await apiClient.getCurrentUser();
        setUser(currentUser);
        apiClient.setCurrentUser(currentUser);
        return currentUser;
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      await logout();
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    apiClient.setCurrentUser(updatedUser);
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  const isStudent = () => hasRole('student');
  const isTeacher = () => hasRole('teacher');
  const isCurator = () => hasRole('curator');
  const isAdmin = () => hasRole('admin');
  const isTeacherOrAdmin = () => hasAnyRole(['teacher', 'admin']);
  const isCuratorOrAdmin = () => hasAnyRole(['curator', 'admin']);

  const value = {
    // State
    user,
    loading,
    error,
    isAuthenticated: !!user,

    // Actions
    login,
    logout,
    refreshUser,
    updateUser,

    // Role checks
    hasRole,
    hasAnyRole,
    isStudent,
    isTeacher,
    isCurator,
    isAdmin,
    isTeacherOrAdmin,
    isCuratorOrAdmin,

    // Clear error
    clearError: () => setError(null)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
