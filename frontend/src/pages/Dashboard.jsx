// File: frontend/src/pages/Dashboard.jsx
// --------------------------------------
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

/**
 * Dashboard page showing business profile status and quick actions
 */
const Dashboard = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await api.get('/profile/');
        if (response.data.success) {
          setProfile(response.data.profile);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const completionPercentage = profile?.is_complete ? 100 : calculateCompletionPercentage(profile);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">
          Dashboard
        </h1>
        <p className="text-secondary-600">
          Manage your business profile and track your progress
        </p>
      </div>

      {/* Profile Completion Card */}
      <div className="grid lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-secondary-900">
                Profile Completion
              </h2>
              <span className="text-sm font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                {completionPercentage}% Complete
              </span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-secondary-200 rounded-full h-3 mb-6">
              <div 
                className="bg-primary-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              ></div>
            </div>

            {profile?.is_complete ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Profile Complete!
                </h3>
                <p className="text-secondary-600 mb-4">
                  Your business profile is fully set up and ready to attract customers.
                </p>
                <Link
                  to="/create-profile"
                  className="btn-secondary"
                >
                  Edit Profile
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Complete Your Profile
                </h3>
                <p className="text-secondary-600 mb-4">
                  Finish setting up your business profile to start attracting customers.
                </p>
                <Link
                  to="/create-profile"
                  className="btn-primary"
                >
                  Continue Setup
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary-900">Business Profile</h3>
            <p className="text-sm text-secondary-600 mt-1">
              {profile?.business_name || 'Not set up'}
            </p>
          </div>

          <div className="card text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-secondary-900">Service Area</h3>
            <p className="text-sm text-secondary-600 mt-1">
              {profile?.city && profile?.state ? `${profile.city}, ${profile.state}` : 'Not set up'}
            </p>
          </div>
        </div>
      </div>

      {/* Business Profile Overview */}
      {profile && (
        <div className="card">
          <h2 className="text-xl font-semibold text-secondary-900 mb-6">
            Business Overview
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">Business Name</h3>
              <p className="text-secondary-900">
                {profile.business_name || 'Not provided'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">Location</h3>
              <p className="text-secondary-900">
                {profile.city && profile.state 
                  ? `${profile.city}, ${profile.state}` 
                  : 'Not provided'
                }
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">Pricing Model</h3>
              <p className="text-secondary-900 capitalize">
                {profile.pricing_mode || 'Not set'}
              </p>
            </div>
            
            <div>
              <h3 className="font-medium text-secondary-700 mb-2">Service Radius</h3>
              <p className="text-secondary-900">
                {profile.service_radius ? `${profile.service_radius} miles` : 'Not set'}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-secondary-200">
            <Link
              to="/create-profile"
              className="btn-primary"
            >
              Edit Business Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate completion percentage
function calculateCompletionPercentage(profile) {
  if (!profile) return 0;
  
  const sections = [
    // Business info (25%)
    profile.business_name && profile.business_phone && profile.business_email,
    // Location info (25%)
    profile.address_line1 && profile.city && profile.state && profile.zip_code,
    // Pricing info (25%)
    profile.pricing_mode && (
      (profile.pricing_mode === 'hourly' && profile.hourly_rate) ||
      (profile.pricing_mode === 'quoted' && profile.quote_packages?.length > 0)
    ),
    // Schedule info (25%)
    profile.availability_schedule && Object.keys(profile.availability_schedule).length > 0
  ];
  
  const completedSections = sections.filter(Boolean).length;
  return Math.round((completedSections / sections.length) * 100);
}

export default Dashboard;