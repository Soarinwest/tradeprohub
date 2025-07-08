import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import * as yup from 'yup';

// Password change schema
const passwordChangeSchema = yup.object({
  current_password: yup.string().required('Current password is required'),
  new_password: yup
    .string()
    .required('New password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirm_password: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('new_password')], 'Passwords must match'),
});

// Profile update schema
const profileUpdateSchema = yup.object({
  first_name: yup.string().required('First name is required').min(2, 'Too short'),
  last_name: yup.string().required('Last name is required').min(2, 'Too short'),
  phone_number: yup
    .string()
    .matches(
      /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/,
      'Please enter a valid phone number'
    ),
  marketing_emails: yup.boolean(),
  notifications_enabled: yup.boolean(),
});

/**
 * Account Settings Page - Comprehensive user account management
 */
const AccountSettings = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    refreshUser, 
    requestPasswordReset 
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    setError: setPasswordError,
    clearErrors: clearPasswordErrors,
    reset: resetPasswordForm,
    watch: watchPassword,
  } = useForm({
    resolver: yupResolver(passwordChangeSchema),
  });

  // Profile update form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    setError: setProfileError,
    clearErrors: clearProfileErrors,
    reset: resetProfileForm,
  } = useForm({
    resolver: yupResolver(profileUpdateSchema),
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.phone_number || '',
      marketing_emails: user?.marketing_emails || false,
      notifications_enabled: user?.notifications_enabled || true,
    }
  });

  const watchedNewPassword = watchPassword('new_password', '');

  // Update form when user data changes
  useEffect(() => {
    if (user) {
      resetProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone_number: user.phone_number || '',
        marketing_emails: user.marketing_emails || false,
        notifications_enabled: user.notifications_enabled || true,
      });
    }
  }, [user, resetProfileForm]);

  // Password strength calculation
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(watchedNewPassword);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  // Handle password change
  const onPasswordSubmit = async (data) => {
    setIsLoading(true);
    clearPasswordErrors();
    setMessage('');
    
    try {
      const result = await changePassword(
        data.current_password,
        data.new_password,
        data.confirm_password
      );
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        resetPasswordForm();
      } else {
        if (typeof result.error === 'object' && result.error.details) {
          Object.keys(result.error.details).forEach(field => {
            setPasswordError(field, { message: result.error.details[field] });
          });
        } else {
          setPasswordError('root', { message: result.error });
        }
      }
    } catch (error) {
      setPasswordError('root', { message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle profile update
  const onProfileSubmit = async (data) => {
    setIsLoading(true);
    clearProfileErrors();
    setMessage('');
    
    try {
      const result = await updateProfile(data);
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        await refreshUser(); // Refresh user data
      } else {
        if (typeof result.error === 'object' && result.error.details) {
          Object.keys(result.error.details).forEach(field => {
            setProfileError(field, { message: result.error.details[field] });
          });
        } else {
          setProfileError('root', { message: result.error });
        }
      }
    } catch (error) {
      setProfileError('root', { message: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle password reset email
  const handlePasswordResetEmail = async () => {
    setIsLoading(true);
    setMessage('');
    
    try {
      const result = await requestPasswordReset(user.email);
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: 'Password reset instructions sent to your email.' 
        });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send password reset email.' });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Information', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'account', label: 'Account Info', icon: 'ℹ️' },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-secondary-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-secondary-900">Account Settings</h1>
            <p className="text-secondary-600 mt-2">
              Manage your account information, security settings, and preferences.
            </p>
          </div>

          {/* Global Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            {/* Tab Navigation */}
            <div className="border-b border-secondary-200">
              <nav className="flex space-x-8 px-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Profile Information Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">
                      Personal Information
                    </h3>
                    
                    <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            First Name
                          </label>
                          <input
                            {...registerProfile('first_name')}
                            type="text"
                            className={`input-field ${profileErrors.first_name ? 'border-red-500' : ''}`}
                          />
                          {profileErrors.first_name && (
                            <p className="mt-1 text-sm text-red-600">{profileErrors.first_name.message}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-secondary-700 mb-2">
                            Last Name
                          </label>
                          <input
                            {...registerProfile('last_name')}
                            type="text"
                            className={`input-field ${profileErrors.last_name ? 'border-red-500' : ''}`}
                          />
                          {profileErrors.last_name && (
                            <p className="mt-1 text-sm text-red-600">{profileErrors.last_name.message}</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Email Address
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="email"
                            value={user?.email || ''}
                            disabled
                            className="input-field bg-secondary-50 text-secondary-500 cursor-not-allowed"
                          />
                          {user?.email_verified ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              ⚠ Unverified
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-secondary-500">
                          Email addresses cannot be changed. Contact support if needed.
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          {...registerProfile('phone_number')}
                          type="tel"
                          className={`input-field ${profileErrors.phone_number ? 'border-red-500' : ''}`}
                          placeholder="(555) 123-4567"
                        />
                        {profileErrors.phone_number && (
                          <p className="mt-1 text-sm text-red-600">{profileErrors.phone_number.message}</p>
                        )}
                      </div>

                      {profileErrors.root && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-800">{profileErrors.root.message}</p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary"
                      >
                        {isLoading ? 'Updating...' : 'Update Profile'}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-8">
                  {/* Password Change */}
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">
                      Change Password
                    </h3>
                    
                    <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <input
                            {...registerPassword('current_password')}
                            type={showCurrentPassword ? 'text' : 'password'}
                            className={`input-field pr-10 ${passwordErrors.current_password ? 'border-red-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showCurrentPassword ? '🙈' : '👁️'}
                          </button>
                        </div>
                        {passwordErrors.current_password && (
                          <p className="mt-1 text-sm text-red-600">{passwordErrors.current_password.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            {...registerPassword('new_password')}
                            type={showNewPassword ? 'text' : 'password'}
                            className={`input-field pr-10 ${passwordErrors.new_password ? 'border-red-500' : ''}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          >
                            {showNewPassword ? '🙈' : '👁️'}
                          </button>
                        </div>
                        
                        {/* Password Strength Indicator */}
                        {watchedNewPassword && (
                          <div className="mt-2">
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-secondary-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-300 ${strengthColors[passwordStrength - 1] || 'bg-red-500'}`}
                                  style={{ width: `${(passwordStrength / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-secondary-600">
                                {strengthLabels[passwordStrength - 1] || 'Very Weak'}
                              </span>
                            </div>
                          </div>
                        )}
                        
                        {passwordErrors.new_password && (
                          <p className="mt-1 text-sm text-red-600">{passwordErrors.new_password.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          {...registerPassword('confirm_password')}
                          type="password"
                          className={`input-field ${passwordErrors.confirm_password ? 'border-red-500' : ''}`}
                        />
                        {passwordErrors.confirm_password && (
                          <p className="mt-1 text-sm text-red-600">{passwordErrors.confirm_password.message}</p>
                        )}
                      </div>

                      {passwordErrors.root && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm text-red-800">{passwordErrors.root.message}</p>
                        </div>
                      )}

                      <div className="flex space-x-3">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="btn-primary"
                        >
                          {isLoading ? 'Changing...' : 'Change Password'}
                        </button>
                        
                        <button
                          type="button"
                          onClick={handlePasswordResetEmail}
                          disabled={isLoading}
                          className="btn-secondary"
                        >
                          Email Reset Link
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Security Status */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">
                      Security Status
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-md">
                        <div>
                          <p className="font-medium text-secondary-900">Email Verification</p>
                          <p className="text-sm text-secondary-600">
                            {user?.email_verified ? 'Your email is verified' : 'Please verify your email'}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          user?.email_verified 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user?.email_verified ? 'Verified' : 'Unverified'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-md">
                        <div>
                          <p className="font-medium text-secondary-900">Account Type</p>
                          <p className="text-sm text-secondary-600 capitalize">
                            {user?.account_type?.replace('_', ' ')} account
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
                          {user?.account_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences Tab */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-secondary-900">
                    Communication Preferences
                  </h3>
                  
                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                    <div className="space-y-4">
                      <label className="flex items-center">
                        <input
                          {...registerProfile('marketing_emails')}
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-secondary-900">Marketing Emails</p>
                          <p className="text-sm text-secondary-600">
                            Receive updates about new features, tips, and special offers
                          </p>
                        </div>
                      </label>

                      <label className="flex items-center">
                        <input
                          {...registerProfile('notifications_enabled')}
                          type="checkbox"
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <div className="ml-3">
                          <p className="font-medium text-secondary-900">System Notifications</p>
                          <p className="text-sm text-secondary-600">
                            Receive important notifications about your account and profile
                          </p>
                        </div>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary"
                    >
                      {isLoading ? 'Saving...' : 'Save Preferences'}
                    </button>
                  </form>
                </div>
              )}

              {/* Account Info Tab */}
              {activeTab === 'account' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-secondary-900">
                    Account Information
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Username</label>
                        <p className="mt-1 text-sm text-secondary-900">{user?.username}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Account Created</label>
                        <p className="mt-1 text-sm text-secondary-900">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Last Activity</label>
                        <p className="mt-1 text-sm text-secondary-900">
                          {user?.last_activity ? new Date(user.last_activity).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Account Status</label>
                        <p className="mt-1 text-sm text-secondary-900">Active</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-secondary-700">Profile Completion</label>
                        <p className="mt-1 text-sm text-secondary-900">
                          {user?.profile_completed ? 'Complete' : 'Incomplete'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-medium text-red-900 mb-4">Danger Zone</h4>
                    
                    <div className="bg-red-50 border border-red-200 rounded-md p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <h5 className="text-sm font-medium text-red-800">Delete Account</h5>
                          <p className="text-sm text-red-700 mt-1">
                            Once you delete your account, there is no going back. Please be certain.
                          </p>
                          <button 
                            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                            onClick={() => alert('Account deletion functionality would be implemented here')}
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default AccountSettings;