// File: frontend/src/pages/CreateProfile.jsx
// ---------------------------------------
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessStep from '../components/wizard/BusinessStep';
import LocationStep from '../components/wizard/LocationStep';
import PricingStep from '../components/wizard/PricingStep';
import MediaStep from '../components/wizard/MediaStep';
import AvailabilityStep from '../components/wizard/AvailabilityStep';
import ReviewStep from '../components/wizard/ReviewStep';
import api from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Profile creation wizard component
 * 6-step process to collect complete business profile information
 */
const CreateProfile = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    business: {},
    location: {},
    pricing: {},
    media: {},
    availability: {
      availability_schedule: {} // Make sure this matches the structure
    }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { number: 1, name: 'Business', component: BusinessStep },
    { number: 2, name: 'Location', component: LocationStep },
    { number: 3, name: 'Pricing', component: PricingStep },
    { number: 4, name: 'Media', component: MediaStep },
    { number: 5, name: 'Availability', component: AvailabilityStep },
    { number: 6, name: 'Review', component: ReviewStep },
  ];

  // Load existing profile data if available
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profile/');
        if (response.data.success && response.data.profile) {
          const profile = response.data.profile;
          
          setFormData({
            business: {
              name: profile.business_name || '',
              phone: profile.business_phone || '',
              email: profile.business_email || '',
              logo: null,
            },
            location: {
              address_line1: profile.address_line1 || '',
              address_line2: profile.address_line2 || '',
              city: profile.city || '',
              state: profile.state || '',
              zip_code: profile.zip_code || '',
              latitude: profile.latitude || null,
              longitude: profile.longitude || null,
              service_radius: profile.service_radius || 25,
            },
            pricing: {
              mode: profile.pricing_mode || 'hourly',
              hourly_rate: profile.hourly_rate || '',
              minimum_charge: profile.minimum_charge || '',
              quote_packages: profile.quote_packages || [],
            },
            media: {
              certifications: profile.certifications || '',
              profile_photo: null,
              gallery_images: [],
            },
            availability: {
              availability_schedule: profile.availability_schedule || getDefaultSchedule(),
            },
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (section, data) => {
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
  };

  const handleStepUpdate = (stepData, step) => {
    // Transform availability data to match expected structure
    if (step === 'availability') {
      const transformedData = {
        availability_schedule: stepData.schedule,
        // ...other availability fields
      };
      setFormData(prev => ({
        ...prev,
        availability: transformedData
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [step]: stepData
      }));
    }
  };

  const handleStepComplete = async (stepData, step) => {
    console.log(`Step ${step} completed with data:`, stepData);
    
    try {
      setFormData(prev => {
        const newData = {
          ...prev,
          [step]: stepData
        };
        console.log('Updated form data:', newData);
        return newData;
      });

      // If this is the final step (Review), submit the entire form
      if (step === 'review') {
        await submitProfile();
      } else {
        setCurrentStep(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error completing step:', error);
    }
  };

  const submitProfile = async () => {
    console.log('Submitting profile with data:', formData);
    setSubmitting(true);

    try {
      // Transform data to match API expectations
      const payload = {
        business_name: formData.business.name,
        business_phone: formData.business.phone,
        business_email: formData.business.email,
        
        // Location
        address_line1: formData.location.address_line1,
        address_line2: formData.location.address_line2,
        city: formData.location.city,
        state: formData.location.state,
        zip_code: formData.location.zip_code,
        latitude: formData.location.latitude,
        longitude: formData.location.longitude,
        service_radius: formData.location.service_radius,
        
        // Pricing
        pricing_mode: formData.pricing.mode,
        hourly_rate: formData.pricing.hourly_rate,
        minimum_charge: formData.pricing.minimum_charge,
        quote_packages: formData.pricing.quote_packages,
        
        // Media
        profile_photo: formData.media.profile_photo,
        gallery_images: formData.media.gallery_images,
        certifications: formData.media.certifications,
        
        // Availability
        availability_schedule: formData.availability.availability_schedule,
        available_immediately: formData.availability.available_immediately,
        start_date: formData.availability.start_date
      };

      console.log('Sending payload to API:', payload);

      const response = await api.post('/api/profiles/', payload);
      console.log('API Response:', response);

      if (response.data.success) {
        navigate('/dashboard', { 
          state: { message: 'Profile created successfully!' }
        });
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      alert(`Failed to save profile: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-secondary-900 mb-6">
            Create Your Business Profile
          </h1>
          
          {/* Step Progress */}
          <div className="flex items-center justify-between mb-6">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep >= step.number 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-200 text-secondary-600'
                  }`}
                >
                  {step.number}
                </div>
                <span 
                  className={`ml-2 font-medium ${
                    currentStep >= step.number ? 'text-primary-600' : 'text-secondary-600'
                  }`}
                >
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div 
                    className={`w-12 h-0.5 mx-4 ${
                      currentStep > step.number ? 'bg-primary-500' : 'bg-secondary-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          <CurrentStepComponent
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={submitProfile}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
            submitting={submitting}
            onComplete={handleStepComplete}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// Default schedule helper
function getDefaultSchedule() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const schedule = {};
  
  days.forEach(day => {
    schedule[day] = {
      enabled: day !== 'saturday' && day !== 'sunday',
      start_time: '09:00',
      end_time: '17:00',
    };
  });
  
  return schedule;
}

export default CreateProfile;