import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

/**
 * Custom hook to access AuthContext
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * AuthProvider component that manages authentication state
 * Handles login, logout, registration, and token management
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('access_token'));

  // Initialize authentication on app start
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('access_token');
      
      if (storedToken) {
        try {
          // Fixed: Remove duplicate /api/v1
          const response = await api.get('/profiles/');
          if (response.data) {
            setUser({ 
              id: response.data.id,
              username: response.data.user?.username || response.data.username
            });
            setToken(storedToken);
          }
        } catch (error) {
          console.error('Token validation failed:', error.response?.data || error.message);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user with username and password
   */
  const login = async (username, password) => {
    try {
      const response = await api.post('/token/', {
        username,
        password,
      });

      const { access, refresh } = response.data;
      
      // Store tokens
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      
      setToken(access);
      setUser({ username });

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed. Please try again.' 
      };
    }
  };

  /**
   * Register new user
   */
  const register = async (userData) => {
    try {
      // Fixed: Remove duplicate /api/v1
      const response = await api.post('/register/', userData);
      
      // If registration returns tokens, store them
      if (response.data.tokens) {
        const { access, refresh } = response.data.tokens;
        localStorage.setItem('access_token', access);
        localStorage.setItem('refresh_token', refresh);
        setToken(access);
        setUser({ username: userData.username });
      }
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      const errorData = error.response?.data || { error: 'Registration failed' };
      return { success: false, error: errorData };
    }
  };

  /**
   * Logout user and clear tokens
   */
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};