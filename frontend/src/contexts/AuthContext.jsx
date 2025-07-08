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
 * Enhanced AuthProvider component with comprehensive authentication features
 * Handles login, logout, registration, password reset, email verification, and more
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
          // Check auth status with new endpoint
          const response = await api.get('/auth/status/');
          if (response.data && response.data.authenticated) {
            setUser(response.data.user);
            setToken(storedToken);
          }
        } catch (error) {
          console.error('Token validation failed:', error.response?.data || error.message);
          // Clear invalid tokens
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setToken(null);
          setUser(null);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * Login user with email and password
   */
  const login = async (email, password, rememberMe = false) => {
    try {
      const response = await api.post('/login/', {
        email,
        password,
        remember_me: rememberMe,
      });

      if (response.data.success) {
        const { user, tokens } = response.data;
        
        // Store tokens
        localStorage.setItem('access_token', tokens.access);
        localStorage.setItem('refresh_token', tokens.refresh);
        
        setToken(tokens.access);
        setUser(user);

        return { 
          success: true, 
          user,
          requiresVerification: !user.email_verified,
          needsPasswordChange: user.needs_password_change
        };
      }
      
      return { success: false, error: response.data.error || 'Login failed' };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.details || error.response?.data?.error || 'Login failed. Please try again.' 
      };
    }
  };

  /**
   * Register new user with enhanced features
   */
  const register = async (userData) => {
    try {
      const response = await api.post('/register/', userData);
      
      if (response.data.success) {
        const { user, tokens, requires_verification } = response.data;
        
        // Store tokens if provided (auto-login after registration)
        if (tokens) {
          localStorage.setItem('access_token', tokens.access);
          localStorage.setItem('refresh_token', tokens.refresh);
          setToken(tokens.access);
          setUser(user);
        }
        
        return { 
          success: true, 
          user,
          requiresVerification: requires_verification,
          message: response.data.message
        };
      }
      
      return { success: false, error: response.data.error };
    } catch (error) {
      console.error('Registration failed:', error.response?.data || error.message);
      const errorData = error.response?.data || { error: 'Registration failed' };
      return { success: false, error: errorData };
    }
  };

  /**
   * Logout user and clear tokens
   */
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      
      // Call logout endpoint to blacklist token
      await api.post('/logout/', {
        refresh_token: refreshToken
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage and state
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setUser(null);
    }
  };

  /**
   * Request password reset
   */
  const requestPasswordReset = async (email) => {
    try {
      const response = await api.post('/password-reset/', { email });
      return { 
        success: true, 
        message: response.data.message || 'Password reset instructions sent to your email.'
      };
    } catch (error) {
      console.error('Password reset request failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Failed to send password reset email.'
      };
    }
  };

  /**
   * Confirm password reset with token
   */
  const confirmPasswordReset = async (token, password, confirmPassword) => {
    try {
      const response = await api.post('/password-reset/confirm/', {
        token,
        password,
        confirmPassword
      });
      
      return { 
        success: true, 
        message: response.data.message || 'Password reset successfully.'
      };
    } catch (error) {
      console.error('Password reset confirmation failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.details || error.response?.data?.error || 'Failed to reset password.'
      };
    }
  };

  /**
   * Verify email address
   */
  const verifyEmail = async (token) => {
    try {
      const response = await api.post('/verify-email/', { token });
      
      // Update user state to reflect verified email
      if (user) {
        setUser({ ...user, email_verified: true });
      }
      
      return { 
        success: true, 
        message: response.data.message || 'Email verified successfully.'
      };
    } catch (error) {
      console.error('Email verification failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.details || error.response?.data?.error || 'Failed to verify email.'
      };
    }
  };

  /**
   * Change password for authenticated users
   */
  const changePassword = async (currentPassword, newPassword, confirmPassword) => {
    try {
      const response = await api.post('/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      
      return { 
        success: true, 
        message: response.data.message || 'Password changed successfully.'
      };
    } catch (error) {
      console.error('Password change failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.details || error.response?.data?.error || 'Failed to change password.'
      };
    }
  };

  /**
   * Update user profile
   */
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/profile/', profileData);
      
      // Update user state with new data
      setUser(response.data);
      
      return { 
        success: true, 
        user: response.data,
        message: 'Profile updated successfully.'
      };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { 
        success: false, 
        error: error.response?.data?.details || error.response?.data?.error || 'Failed to update profile.'
      };
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/status/');
      if (response.data && response.data.authenticated) {
        setUser(response.data.user);
        return response.data.user;
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // Don't logout on refresh failure, token might still be valid
    }
    return user;
  };

  /**
   * Check if user has specific permissions
   */
  const hasPermission = (permission) => {
    if (!user) return false;
    
    // Admin users have all permissions
    if (user.account_type === 'admin') return true;
    
    // Add permission logic based on your needs
    switch (permission) {
      case 'create_profile':
        return user.account_type === 'individual' || user.account_type === 'business';
      case 'manage_business':
        return user.account_type === 'business';
      default:
        return false;
    }
  };

  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    
    // Basic auth functions (backward compatibility)
    login,
    logout,
    register,
    
    // Enhanced auth functions
    requestPasswordReset,
    confirmPasswordReset,
    verifyEmail,
    changePassword,
    updateProfile,
    refreshUser,
    hasPermission,
    
    // User status checks
    isEmailVerified: user?.email_verified || false,
    needsPasswordChange: user?.needs_password_change || false,
    profileCompleted: user?.profile_completed || false,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};