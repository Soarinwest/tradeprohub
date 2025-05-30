// File: frontend/src/pages/CreateProfile.jsx
// ---------------------------------------
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BusinessStep from '../components/wizard/BusinessStep';
import AddressStep from '../components/wizard/AddressStep';
import ServiceAreaStep from '../components/wizard/ServiceAreaStep';
import PricingStep from '../components/wizard/PricingStep';
import MediaStep from '../components/wizard/MediaStep';
import AvailabilityStep from '../components/wizard/AvailabilityStep';
import ReviewStep from '../components/wizard/ReviewStep';
import api from '../services/api';
import ErrorBoundary from '../components/ErrorBoundary';

/**
 * Profile creation wizard component
 * 7-step process to collect complete business profile information
 */
const CreateProfile = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    business: {},
    address: {},
    serviceArea: {},
    pricing: {},
    media: {},
    availability: {
      availability_schedule: {},
      available_immediately: true,
      start_date: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const steps = [
    { number: 1, name: 'Business', component: BusinessStep },
    { number: 2, name: 'Address', component: AddressStep },
    { number: 3, name: 'Service Area', component: ServiceAreaStep },
    { number: 4, name: 'Pricing', component: PricingStep },
    { number: 5, name: 'Media', component: MediaStep },
    { number: 6, name: 'Availability', component: AvailabilityStep },
    { number: 7, name: 'Review', component: ReviewStep },
  ];

  // Load existing profile data if available
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.get('/profiles/');
        if (response.data && response.data.length > 0) {
          const profile = response.data[0]; // Get first profile if it's an array
          
          setFormData({
            business: {
              name: profile.business_name || '',
              phone: profile.business_phone || '',
              email: profile.business_email || '',
              logo: null,
            },
            address: {
              address_line1: profile.address_line1 || '',
              address_line2: profile.address_line2 || '',
              city: profile.city || '',
              state: profile.state || '',
              zip_code: profile.zip_code || '',
              latitude: profile.latitude || null,
              longitude: profile.longitude || null,
            },
            serviceArea: {
              type: profile.service_area_type || 'radius',
              radius: profile.service_radius || 25,
              willing_to_travel_outside: profile.willing_to_travel_outside || false,
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
              available_immediately: profile.available_immediately ?? true,
              start_date: profile.start_date || ''
            },
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        // If no profile exists, continue with empty form
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0); // Scroll to top when changing steps
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0); // Scroll to top when changing steps
    }
  };

  const goToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= steps.length) {
      setCurrentStep(stepNumber);
      window.scrollTo(0, 0);
    }
  };

  const updateFormData = (section, data) => {
    console.log(`Updating ${section} with:`, data);
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
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
        
        // Address
        address_line1: formData.address.address_line1,
        address_line2: formData.address.address_line2 || '',
        city: formData.address.city,
        state: formData.address.state,
        zip_code: formData.address.zip_code,
        latitude: formData.address.latitude ? parseFloat(formData.address.latitude) : null,
        longitude: formData.address.longitude ? parseFloat(formData.address.longitude) : null,
        
        // Service Area
        service_area_type: formData.serviceArea.type || 'radius',
        service_radius: formData.serviceArea.type === 'radius' 
          ? parseInt(formData.serviceArea.radius) 
          : null,
        service_area_boundary: formData.serviceArea.boundary || null,
        willing_to_travel_outside: Boolean(formData.serviceArea.willing_to_travel_outside),
        
        // Pricing
        pricing_mode: formData.pricing.mode || 'hourly',
        hourly_rate: formData.pricing.hourly_rate ? parseFloat(formData.pricing.hourly_rate) : null,
        minimum_charge: formData.pricing.minimum_charge ? parseFloat(formData.pricing.minimum_charge) : null,
        quote_packages: Array.isArray(formData.pricing.quote_packages) ? formData.pricing.quote_packages : [],
        
        // Media
        certifications: formData.media.certifications || '',
        
        // Availability
        availability_schedule: formData.availability.availability_schedule || {},
        available_immediately: Boolean(formData.availability.available_immediately),
        start_date: formData.availability.start_date || null
      };

      console.log('Sanitized payload:', payload);

      // First validate the payload on frontend
      const requiredFields = [
        'business_name',
        'business_phone',
        'business_email',
        'address_line1',
        'city',
        'state',
        'zip_code'
      ];

      const missingFields = requiredFields.filter(field => !payload[field]);
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const response = await api.post('/profiles/', payload);
      console.log('API Response:', response);

      if (response.status === 201 || response.status === 200) {
        navigate('/dashboard', { 
          state: { message: 'Profile created successfully!' }
        });
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      
      let errorMessage = 'Failed to save profile: ';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
        
        if (error.response.data) {
          if (typeof error.response.data === 'object') {
            errorMessage += Object.entries(error.response.data)
              .map(([field, msg]) => `${field}: ${msg}`)
              .join('\n');
          } else {
            errorMessage += error.response.data;
          }
        } else {
          errorMessage += `Server error (${error.response.status})`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        errorMessage += 'No response received from server';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
        errorMessage += error.message;
      }
      
      alert(errorMessage);
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
          <div className="flex items-center justify-between mb-6 overflow-x-auto">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => currentStep > step.number && goToStep(step.number)}
                  disabled={currentStep <= step.number}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    currentStep >= step.number 
                      ? 'bg-primary-500 text-white' 
                      : 'bg-secondary-200 text-secondary-600'
                  } ${
                    currentStep > step.number 
                      ? 'cursor-pointer hover:bg-primary-600' 
                      : 'cursor-default'
                  }`}
                >
                  {currentStep > step.number ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>
                <span 
                  className={`ml-2 font-medium whitespace-nowrap ${
                    currentStep >= step.number ? 'text-primary-600' : 'text-secondary-600'
                  } ${index === steps.length - 1 ? '' : 'hidden sm:inline'}`}
                >
                  {step.name}
                </span>
                {index < steps.length - 1 && (
                  <div 
                    className={`w-4 sm:w-12 h-0.5 mx-2 ${
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
            key={currentStep} // Force re-render when step changes
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={submitProfile}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
            submitting={submitting}
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