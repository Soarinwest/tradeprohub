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
 * Enhanced Profile creation wizard
 * 7-step process with proper data transformation and error handling
 */
const CreateProfile = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [existingProfileId, setExistingProfileId] = useState(null);
  const [formData, setFormData] = useState({
    business: {
      name: '',
      phone: '',
      email: '',
      logo: null
    },
    address: {
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      zip_code: '',
      latitude: null,
      longitude: null
    },
    serviceArea: {
      type: 'radius',
      radius: 25,
      willing_to_travel_outside: false
    },
    pricing: {
      mode: 'hourly',
      hourly_rate: '',
      minimum_charge: '',
      quote_packages: []
    },
    media: {
      certifications: '',
      profile_photo: null,
      gallery_images: []
    },
    availability: {
      availability_schedule: getDefaultSchedule(),
      available_immediately: true,
      start_date: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
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
        // Try the new endpoint first, fallback to old endpoint
        let response;
        try {
          response = await api.get('/profiles/me/');
        } catch (error) {
          if (error.response?.status === 404) {
            // No profile exists, use default data
            setLoading(false);
            return;
          }
          // Try the list endpoint as fallback
          response = await api.get('/profiles/');
        }
        
        let profile = null;
        if (Array.isArray(response.data) && response.data.length > 0) {
          profile = response.data[0];
        } else if (response.data && !Array.isArray(response.data)) {
          profile = response.data;
        }
        
        if (profile && profile.id) {
          setExistingProfileId(profile.id);
          console.log('Found existing profile with ID:', profile.id);
          
          // Transform backend data to frontend format
          setFormData({
            business: {
              name: profile.business_name || '',
              phone: profile.business_phone || '',
              email: profile.business_email || '',
              logo: profile.business_logo || null
            },
            address: {
              address_line1: profile.address_line1 || '',
              address_line2: profile.address_line2 || '',
              city: profile.city || '',
              state: profile.state || '',
              zip_code: profile.zip_code || '',
              latitude: profile.latitude || null,
              longitude: profile.longitude || null
            },
            serviceArea: {
              type: profile.service_area_type || 'radius',
              radius: profile.service_radius || 25,
              willing_to_travel_outside: profile.willing_to_travel_outside || false
            },
            pricing: {
              mode: profile.pricing_mode || 'hourly',
              hourly_rate: profile.hourly_rate || '',
              minimum_charge: profile.minimum_charge || '',
              quote_packages: profile.quote_packages || []
            },
            media: {
              certifications: profile.certifications || '',
              profile_photo: profile.profile_photo || null,
              gallery_images: profile.gallery_images || []
            },
            availability: {
              availability_schedule: profile.availability_schedule || getDefaultSchedule(),
              available_immediately: profile.available_immediately ?? true,
              start_date: profile.start_date || ''
            }
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
        // Continue with empty form if no profile exists
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
      setErrors({}); // Clear errors when moving to next step
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
      setErrors({});
    }
  };

  const goToStep = (stepNumber) => {
    if (stepNumber >= 1 && stepNumber <= steps.length) {
      setCurrentStep(stepNumber);
      window.scrollTo(0, 0);
      setErrors({});
    }
  };

  const updateFormData = (section, data) => {
    console.log(`Updating ${section} with:`, data);
    setFormData(prev => ({
      ...prev,
      [section]: { ...prev[section], ...data }
    }));
    // Clear errors for this section
    if (errors[section]) {
      setErrors(prev => ({ ...prev, [section]: null }));
    }
  };

  const transformDataForBackend = (data) => {
    // Transform frontend data structure to match backend expectations
    const payload = {
      // Business information
      business_name: data.business.name,
      business_phone: data.business.phone,
      business_email: data.business.email,
      
      // Address information
      address_line1: data.address.address_line1,
      address_line2: data.address.address_line2 || '',
      city: data.address.city,
      state: data.address.state,
      zip_code: data.address.zip_code,
      latitude: data.address.latitude ? parseFloat(data.address.latitude) : null,
      longitude: data.address.longitude ? parseFloat(data.address.longitude) : null,
      
      // Service area information
      service_area_type: data.serviceArea.type || 'radius',
      service_radius: parseInt(data.serviceArea.radius) || 25,
      willing_to_travel_outside: data.serviceArea.willing_to_travel_outside || false,
      
      // Pricing information
      pricing_mode: data.pricing.mode || 'hourly',
      hourly_rate: data.pricing.mode === 'hourly' && data.pricing.hourly_rate
        ? parseFloat(data.pricing.hourly_rate) 
        : null,
      minimum_charge: data.pricing.minimum_charge 
        ? parseFloat(data.pricing.minimum_charge) 
        : null,
      quote_packages: data.pricing.quote_packages || [],
      
      // Media information
      certifications: data.media.certifications || '',
      
      // Availability information
      availability_schedule: data.availability.availability_schedule || {},
      available_immediately: data.availability.available_immediately ?? true,
      start_date: data.availability.start_date || null
    };

    // Remove null/undefined values to avoid backend validation issues
    const cleanPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});

    return cleanPayload;
  };

  const validateFormData = (data) => {
    const errors = {};
    
    // Validate business information
    if (!data.business.name?.trim()) {
      errors.business = 'Business name is required';
    }
    if (!data.business.phone?.trim()) {
      errors.business = errors.business || 'Business phone is required';
    }
    if (!data.business.email?.trim()) {
      errors.business = errors.business || 'Business email is required';
    }
    
    // Validate address
    if (!data.address.address_line1?.trim()) {
      errors.address = 'Street address is required';
    }
    if (!data.address.city?.trim()) {
      errors.address = errors.address || 'City is required';
    }
    if (!data.address.state?.trim()) {
      errors.address = errors.address || 'State is required';
    }
    if (!data.address.zip_code?.trim()) {
      errors.address = errors.address || 'ZIP code is required';
    }
    
    // Validate service area
    if (data.serviceArea.type === 'radius' && (!data.serviceArea.radius || data.serviceArea.radius < 1)) {
      errors.serviceArea = 'Service radius must be at least 1 mile';
    }
    
    // Validate pricing
    if (data.pricing.mode === 'hourly' && (!data.pricing.hourly_rate || parseFloat(data.pricing.hourly_rate) <= 0)) {
      errors.pricing = 'Hourly rate is required for hourly pricing';
    }
    if (data.pricing.mode === 'quoted' && (!data.pricing.quote_packages || data.pricing.quote_packages.length === 0)) {
      errors.pricing = 'At least one quote package is required for quoted pricing';
    }
    
    return errors;
  };

  const submitProfile = async () => {
    console.log('Submitting profile with data:', formData);
    setSubmitting(true);
    setErrors({});

    try {
      // Validate form data
      const validationErrors = validateFormData(formData);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        setSubmitting(false);
        
        // Show first error and scroll to top
        const firstErrorMessage = Object.values(validationErrors)[0];
        alert(`Please fix the following errors:\n${Object.values(validationErrors).join('\n')}`);
        return;
      }

      // Transform data for backend
      const payload = transformDataForBackend(formData);
      console.log('Sending payload to API:', payload);

      let response;
      if (existingProfileId) {
        // Update existing profile using the /me/ endpoint
        console.log(`Updating existing profile ${existingProfileId}`);
        try {
          response = await api.put('/profiles/me/', payload);
        } catch (error) {
          // Fallback to ID-based endpoint
          response = await api.put(`/profiles/${existingProfileId}/`, payload);
        }
      } else {
        // Create new profile
        console.log('Creating new profile');
        response = await api.post('/profiles/', payload);
      }
      
      console.log('API Response:', response);

      if (response.status === 200 || response.status === 201) {
        // Handle file uploads separately if there are any
        await handleFileUploads(response.data.id || existingProfileId);
        
        navigate('/dashboard', { 
          state: { 
            message: existingProfileId ? 'Profile updated successfully!' : 'Profile created successfully!',
            profileId: response.data.id || existingProfileId
          }
        });
      }
    } catch (error) {
      console.error('Profile submission error:', error);
      
      let errorMessage = 'Failed to save profile';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'object') {
          // Handle field-specific errors
          const fieldErrors = {};
          const errorDetails = [];
          
          Object.entries(error.response.data).forEach(([field, errors]) => {
            const errorArray = Array.isArray(errors) ? errors : [errors];
            errorDetails.push(`${field}: ${errorArray.join(', ')}`);
            
            // Map backend field names to frontend sections
            if (field.includes('business_')) {
              fieldErrors.business = errorArray.join(', ');
            } else if (['address_line1', 'city', 'state', 'zip_code'].includes(field)) {
              fieldErrors.address = errorArray.join(', ');
            } else if (['service_area_type', 'service_radius'].includes(field)) {
              fieldErrors.serviceArea = errorArray.join(', ');
            } else if (['pricing_mode', 'hourly_rate', 'quote_packages'].includes(field)) {
              fieldErrors.pricing = errorArray.join(', ');
            }
          });
          
          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors);
          }
          
          errorMessage = `Validation errors:\n${errorDetails.join('\n')}`;
        } else {
          errorMessage = error.response.data.error || error.response.data || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUploads = async (profileId) => {
    try {
      // Handle profile photo upload
      if (formData.media.profile_photo && typeof formData.media.profile_photo === 'object') {
        const photoFormData = new FormData();
        photoFormData.append('profile_photo', formData.media.profile_photo);
        
        try {
          await api.patch(`/profiles/${profileId}/`, photoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.warn('Failed to upload profile photo:', error);
        }
      }

      // Handle gallery images upload
      if (formData.media.gallery_images && formData.media.gallery_images.length > 0) {
        const galleryFormData = new FormData();
        formData.media.gallery_images.forEach((image, index) => {
          if (typeof image === 'object') {
            galleryFormData.append('images', image);
          }
        });
        
        try {
          await api.post(`/profiles/${profileId}/upload-images/`, galleryFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.warn('Failed to upload gallery images:', error);
        }
      }

      // Handle business logo upload
      if (formData.business.logo && typeof formData.business.logo === 'object') {
        const logoFormData = new FormData();
        logoFormData.append('business_logo', formData.business.logo);
        
        try {
          await api.patch(`/profiles/${profileId}/`, logoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (error) {
          console.warn('Failed to upload business logo:', error);
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      // Don't fail the entire submission for file upload errors
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
          
          {/* Show errors at the top if any */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside text-red-700 text-sm">
                {Object.entries(errors).map(([section, error]) => (
                  <li key={section}>
                    <strong className="capitalize">{section}:</strong> {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
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
                  } ${
                    errors[step.name.toLowerCase()] ? 'ring-2 ring-red-500' : ''
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
                  } ${index === steps.length - 1 ? '' : 'hidden sm:inline'} ${
                    errors[step.name.toLowerCase()] ? 'text-red-600' : ''
                  }`}
                >
                  {step.name}
                  {errors[step.name.toLowerCase()] && (
                    <span className="ml-1 text-red-500">⚠</span>
                  )}
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
            key={currentStep}
            data={formData}
            updateData={updateFormData}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={submitProfile}
            isFirstStep={currentStep === 1}
            isLastStep={currentStep === steps.length}
            submitting={submitting}
            errors={errors}
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