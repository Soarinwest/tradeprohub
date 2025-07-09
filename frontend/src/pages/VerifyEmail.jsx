import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Email Verification Page
 * Handles email verification from links and manual token entry
 */
const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyEmail, user, isAuthenticated } = useAuth();
  
  const [status, setStatus] = useState('loading'); // loading, success, error, manual
  const [message, setMessage] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailFromState = location.state?.email;
  const messageFromState = location.state?.message;
  const tokenFromUrl = searchParams.get('token');

  useEffect(() => {
    if (tokenFromUrl) {
      // Automatic verification from email link
      handleVerification(tokenFromUrl);
    } else {
      // Manual verification needed
      setStatus('manual');
    }
  }, [tokenFromUrl]);

  const handleVerification = async (token) => {
    try {
      setStatus('loading');
      const result = await verifyEmail(token);
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message);
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          if (isAuthenticated) {
            navigate('/dashboard');
          } else {
            navigate('/login', { 
              state: { message: 'Email verified! Please log in to continue.' }
            });
          }
        }, 3000);
      } else {
        setStatus('error');
        setMessage(result.error);
      }
    } catch (error) {
      setStatus('error');
      setMessage('An unexpected error occurred. Please try again.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualToken.trim()) {
      setMessage('Please enter a verification token.');
      return;
    }

    setIsSubmitting(true);
    await handleVerification(manualToken.trim());
    setIsSubmitting(false);
  };

  const handleResendVerification = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/users/resend-verification/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user?.email || 'soren.donisvitch@gmail.com' // fallback for dev
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Verification email resent successfully. Please check your inbox or the terminal log.');
      } else {
        setMessage(data.error || '❌ Failed to resend verification email.');
      }
    } catch (error) {
      setMessage('❌ An error occurred while trying to resend the verification email.');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <h2 className="text-2xl font-bold text-secondary-900">
            Verifying Your Email...
          </h2>
          <p className="text-secondary-600">
            Please wait while we verify your email address.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Email Verified!
            </h2>
            
            <p className="text-secondary-600 mb-6">
              {message || 'Your email has been successfully verified.'}
            </p>

            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <p className="text-sm text-green-800">
                Redirecting you to {isAuthenticated ? 'dashboard' : 'login'}...
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                className="w-full btn-primary"
              >
                Continue to {isAuthenticated ? 'Dashboard' : 'Login'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Verification Failed
            </h2>
            
            <p className="text-secondary-600 mb-6">
              {message || 'We couldn\'t verify your email address.'}
            </p>

            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Common Issues:</h4>
                  <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                    <li>Verification link has expired</li>
                    <li>Link has already been used</li>
                    <li>Invalid verification token</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setStatus('manual')}
                className="w-full btn-primary"
              >
                Try Manual Verification
              </button>
              
              <button
                onClick={handleResendVerification}
                className="w-full btn-secondary"
              >
                Request New Verification Email
              </button>
              
              <Link to="/login" className="block w-full btn-secondary text-center">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Manual verification form
  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-secondary-900 mb-2">
            Verify Your Email
          </h2>
          <p className="text-secondary-600">
            {emailFromState 
              ? `We sent a verification email to ${emailFromState}` 
              : 'Enter your verification token to activate your account'
            }
          </p>
        </div>

        {messageFromState && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-sm text-blue-800">{messageFromState}</p>
          </div>
        )}

        <div className="card">
          <div className="mb-6">
            <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-semibold text-center text-secondary-900 mb-2">
              Check Your Email
            </h3>
            
            <p className="text-sm text-secondary-600 text-center">
              Click the verification link in your email, or enter the verification token below.
            </p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-secondary-700 mb-2">
                Verification Token
              </label>
              <input
                type="text"
                id="token"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                className="input-field"
                placeholder="Enter verification token"
                required
              />
              <p className="mt-1 text-xs text-secondary-500">
                The token should be a long string of letters and numbers from your email.
              </p>
            </div>

            {message && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={handleResendVerification}
              className="text-sm text-primary-600 hover:text-primary-500 font-medium"
            >
              Didn't receive the email? Request a new one
            </button>
            
            <div>
              <Link to="/login" className="text-sm text-secondary-600 hover:text-secondary-500">
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-secondary-100 rounded-lg p-4">
          <h4 className="text-sm font-medium text-secondary-900 mb-2">Need Help?</h4>
          <ul className="text-sm text-secondary-700 space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure you're checking the correct email address</li>
            <li>• Verification links expire after 24 hours</li>
            <li>• Contact support if you continue having issues</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;