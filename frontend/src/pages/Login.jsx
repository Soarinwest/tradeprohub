import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useAuth } from '../contexts/AuthContext';
import * as yup from 'yup';

// Enhanced login validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required'),
  rememberMe: yup.boolean()
});

/**
 * Enhanced Login page with comprehensive authentication features
 */
const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const { login, requestPasswordReset, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';
  const message = location.state?.message;

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: { errors: resetErrors },
    setError: setResetError,
  } = useForm({
    resolver: yupResolver(yup.object({
      email: yup.string().required('Email is required').email('Invalid email')
    }))
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    clearErrors();
    
    try {
      const result = await login(data.email, data.password, data.rememberMe);
      
      if (result.success) {
        // Handle different post-login scenarios
        if (result.needsPasswordChange) {
          navigate('/change-password', { 
            state: { message: 'Please change your password to continue.' }
          });
        } else if (result.requiresVerification) {
          navigate('/verify-email', { 
            state: { email: data.email, message: 'Please verify your email to continue.' }
          });
        } else {
          navigate(from, { replace: true });
        }
      } else {
        // Handle different types of errors
        if (typeof result.error === 'object' && result.error.details) {
          // Field-specific errors
          Object.keys(result.error.details).forEach(field => {
            if (field === 'non_field_errors') {
              setError('root', { message: result.error.details[field] });
            } else {
              setError(field, { message: result.error.details[field] });
            }
          });
        } else {
          // General error
          setError('root', { message: result.error });
        }
      }
    } catch (error) {
      setError('root', { message: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPasswordSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await requestPasswordReset(data.email);
      
      if (result.success) {
        setResetEmailSent(true);
      } else {
        setResetError('email', { message: result.error });
      }
    } catch (error) {
      setResetError('root', { message: 'Failed to send reset email. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Forgot Password?
            </h2>
            <p className="text-secondary-600">
              Enter your email address and we'll send you instructions to reset your password.
            </p>
          </div>

          <div className="card">
            {resetEmailSent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                
                <h3 className="text-lg font-semibold text-secondary-900">
                  Check Your Email
                </h3>
                
                <p className="text-secondary-600">
                  If an account with that email exists, we've sent password reset instructions.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmailSent(false);
                    }}
                    className="w-full btn-primary"
                  >
                    Back to Login
                  </button>
                  
                  <button
                    onClick={() => setResetEmailSent(false)}
                    className="w-full btn-secondary"
                  >
                    Try Different Email
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitReset(onForgotPasswordSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                    Email Address
                  </label>
                  <input
                    {...registerReset('email')}
                    type="email"
                    className={`input-field ${resetErrors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter your email address"
                  />
                  {resetErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{resetErrors.email.message}</p>
                  )}
                </div>

                {resetErrors.root && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <p className="text-sm text-red-800">{resetErrors.root.message}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full btn-primary"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Reset Instructions'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="w-full btn-secondary"
                  >
                    Back to Login
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-secondary-900 mb-2">
            Welcome Back
          </h2>
          <p className="text-secondary-600">
            Sign in to your TradeProHub account
          </p>
        </div>

        {/* Success message */}
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-800">{message}</p>
          </div>
        )}

        <div className="card">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`input-field ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-secondary-700 mb-2">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                autoComplete="current-password"
                className={`input-field ${errors.password ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  {...register('rememberMe')}
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-secondary-700">Remember me</span>
              </label>
              
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-primary-600 hover:text-primary-500 font-medium"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{errors.root.message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-secondary-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 hover:text-primary-500 font-medium">
                Create one here
              </Link>
            </p>
          </div>
        </div>

        {/* Additional Help */}
        <div className="text-center">
          <p className="text-sm text-secondary-500">
            Having trouble? Contact our{' '}
            <a href="/support" className="text-primary-600 hover:text-primary-500">
              support team
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;