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
  const [existingProfileId, setExistingProfileId] = useState(null);
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
        console.log('Profile response:', response.data);
        
        // Check if response contains profile data
        let profile = null;
        if (Array.isArray(response.data) && response.data.length > 0) {
          profile = response.data[0];
        } else if (response.data && !Array.isArray(response.data)) {
          profile = response.data;
        }
        
        if (profile && profile.id) {
          setExistingProfileId(profile.id);
          console.log('Found existing profile with ID:', profile.id);
          
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
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
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
    console.log('Existing profile ID:', existingProfileId);
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
        latitude: parseFloat(formData.address.latitude) || null,
        longitude: parseFloat(formData.address.longitude) || null,
        
        // Service Area
        service_radius: formData.serviceArea.type === 'radius' 
          ? parseInt(formData.serviceArea.radius) 
          : 25, // Default radius even for non-radius types
        service_area_type: formData.serviceArea.type || 'radius',
        willing_to_travel_outside: formData.serviceArea.willing_to_travel_outside || false,
        
        // Pricing
        pricing_mode: formData.pricing.mode || 'hourly',
        hourly_rate: formData.pricing.mode === 'hourly' 
          ? parseFloat(formData.pricing.hourly_rate) || null 
          : null,
        minimum_charge: parseFloat(formData.pricing.minimum_charge) || null,
        quote_packages: formData.pricing.quote_packages || [],
        
        // Media
        certifications: formData.media.certifications || '',
        // Note: profile_photo and gallery_images would need to be handled separately
        // as file uploads in a real implementation
        
        // Availability
        availability_schedule: formData.availability.availability_schedule || {},
        available_immediately: formData.availability.available_immediately ?? true,
        start_date: formData.availability.start_date || null
      };

      // Remove null values to avoid backend validation issues
      const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (value !== null && value !== undefined) {
          acc[key] = value;
        }
        return acc;
      }, {});

      console.log('Sending payload to API:', cleanPayload);

      let response;
      if (existingProfileId) {
        // Update existing profile
        console.log(`Updating existing profile ${existingProfileId}`);
        response = await api.put(`/profiles/${existingProfileId}/`, cleanPayload);
      } else {
        // Create new profile
        console.log('Creating new profile');
        response = await api.post('/profiles/', cleanPayload);
      }
      
      console.log('API Response:', response);

      if (response.status === 200 || response.status === 201) {
        navigate('/dashboard', { 
          state: { message: existingProfileId ? 'Profile updated successfully!' : 'Profile created successfully!' }
        });
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      
      // Log more detailed error information
      if (error.response?.data) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      
      let errorMessage = 'Failed to save profile';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          // If it's an HTML error page, try to extract the error message
          const match = error.response.data.match(/<pre class="exception_value">(.*?)<\/pre>/);
          if (match) {
            errorMessage = `Failed to save profile: ${match[1]}`;
          }
        } else if (typeof error.response.data === 'object') {
          // Handle field-specific errors
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          errorMessage = `Failed to save profile:\n${fieldErrors}`;
        }
      } else if (error.message) {
        errorMessage = `Failed to save profile: ${error.message}`;
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
            {existingProfileId ? 'Update Your Business Profile' : 'Create Your Business Profile'}
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