import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Enhanced ProtectedRoute component with comprehensive security features
 * 
 * Features:
 * - Authentication checking
 * - Email verification requirements
 * - Permission-based access control
 * - Profile completion requirements
 * - Password change enforcement
 * - Loading states with custom UI
 */
const ProtectedRoute = ({ 
  children, 
  requireEmailVerification = true,
  requireProfileCompletion = false,
  requiredPermissions = [],
  allowedAccountTypes = [],
  customLoadingComponent = null,
  redirectTo = '/login'
}) => {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    isEmailVerified, 
    needsPasswordChange,
    profileCompleted,
    hasPermission,
    refreshUser 
  } = useAuth();
  
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh user data on mount to ensure we have latest info
  useEffect(() => {
    const refreshUserData = async () => {
      if (isAuthenticated && !loading) {
        setIsRefreshing(true);
        await refreshUser();
        setIsRefreshing(false);
      }
    };

    refreshUserData();
  }, [isAuthenticated, loading, refreshUser]);

  // Show loading state
  if (loading || isRefreshing) {
    if (customLoadingComponent) {
      return customLoadingComponent;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="text-lg font-semibold text-secondary-900">Loading...</h2>
          <p className="text-secondary-600">Please wait while we verify your access.</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if password change is required
  if (needsPasswordChange) {
    return (
      <Navigate 
        to="/change-password" 
        state={{ 
          from: location, 
          message: 'You must change your password to continue.',
          required: true 
        }} 
        replace 
      />
    );
  }

  // Check email verification requirement
  if (requireEmailVerification && !isEmailVerified) {
    return (
      <Navigate 
        to="/verify-email" 
        state={{ 
          from: location,
          email: user?.email,
          message: 'Please verify your email address to access this page.'
        }} 
        replace 
      />
    );
  }

  // Check account type restrictions
  if (allowedAccountTypes.length > 0 && !allowedAccountTypes.includes(user?.account_type)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Access Restricted
            </h2>
            
            <p className="text-secondary-600 mb-6">
              This page is only available to {allowedAccountTypes.join(' and ')} accounts.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Current Account Type</h4>
                  <p className="text-sm text-yellow-700 mt-1 capitalize">
                    Your account is registered as: {user?.account_type?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.history.back()}
                className="w-full btn-primary"
              >
                Go Back
              </button>
              
              <Navigate to="/dashboard" className="block w-full btn-secondary text-center">
                Return to Dashboard
              </Navigate>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requiredPermissions.length > 0) {
    const hasAllPermissions = requiredPermissions.every(permission => hasPermission(permission));
    
    if (!hasAllPermissions) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
              
              <h2 className="text-3xl font-bold text-secondary-900 mb-2">
                Permission Denied
              </h2>
              
              <p className="text-secondary-600 mb-6">
                You don't have permission to access this page.
              </p>

              <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
                <h4 className="text-sm font-medium text-red-800 mb-2">Required Permissions:</h4>
                <ul className="text-sm text-red-700 list-disc list-inside">
                  {requiredPermissions.map(permission => (
                    <li key={permission} className="capitalize">
                      {permission.replace('_', ' ')}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => window.history.back()}
                  className="w-full btn-primary"
                >
                  Go Back
                </button>
                
                <Navigate to="/dashboard" className="block w-full btn-secondary text-center">
                  Return to Dashboard
                </Navigate>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Check profile completion requirement
  if (requireProfileCompletion && !profileCompleted) {
    return (
      <Navigate 
        to="/create-profile" 
        state={{ 
          from: location,
          message: 'Please complete your profile to access this page.',
          required: true
        }} 
        replace 
      />
    );
  }

  // All checks passed, render the protected content
  return children;
};

/**
 * Higher-order component for protecting routes
 * Usage: export default withProtection(MyComponent, { requireEmailVerification: true })
 */
export const withProtection = (Component, protectionOptions = {}) => {
  return (props) => (
    <ProtectedRoute {...protectionOptions}>
      <Component {...props} />
    </ProtectedRoute>
  );
};

/**
 * Hook for checking protection status without rendering
 * Useful for conditional rendering within components
 */
export const useProtectionStatus = () => {
  const { 
    user, 
    loading, 
    isAuthenticated, 
    isEmailVerified, 
    needsPasswordChange,
    profileCompleted,
    hasPermission 
  } = useAuth();

  const checkProtection = (requirements = {}) => {
    const {
      requireEmailVerification = true,
      requireProfileCompletion = false,
      requiredPermissions = [],
      allowedAccountTypes = [],
    } = requirements;

    if (loading) return { status: 'loading' };
    if (!isAuthenticated) return { status: 'unauthenticated' };
    if (needsPasswordChange) return { status: 'password_change_required' };
    if (requireEmailVerification && !isEmailVerified) return { status: 'email_verification_required' };
    if (allowedAccountTypes.length > 0 && !allowedAccountTypes.includes(user?.account_type)) {
      return { status: 'account_type_restricted' };
    }
    if (requiredPermissions.length > 0 && !requiredPermissions.every(p => hasPermission(p))) {
      return { status: 'insufficient_permissions' };
    }
    if (requireProfileCompletion && !profileCompleted) return { status: 'profile_completion_required' };

    return { status: 'authorized' };
  };

  return { checkProtection, user, loading };
};

export default ProtectedRoute;