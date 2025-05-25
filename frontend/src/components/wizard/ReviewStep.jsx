import React from 'react';

/**
 * ReviewStep - Final review of all profile information
 * Shows a comprehensive summary before submission
 */
const ReviewStep = ({ data, onPrev, onSubmit, submitting }) => {
  // Format phone number for display
  const formatPhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  // Format time for display
  const formatTime = (time) => {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  };

  // Get working days summary
  const getWorkingDaysSummary = () => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    const workingDays = days
      .map((day, index) => ({
        day,
        label: dayLabels[index],
        schedule: data.availability.availability_schedule[day]
      }))
      .filter(item => item.schedule.enabled);

    return workingDays;
  };

  const workingDays = getWorkingDaysSummary();

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Review Your Profile
        </h2>
        <p className="text-secondary-600">
          Take a moment to review your information before submitting. You can always update it later.
        </p>
      </div>

      <div className="space-y-6">
        {/* Business Information */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Business Information
            </h3>
            <button
              type="button"
              onClick={() => onPrev()}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-secondary-600">Business Name</p>
              <p className="font-medium text-secondary-900">{data.business.name || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-600">Phone</p>
              <p className="font-medium text-secondary-900">{formatPhone(data.business.phone) || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-secondary-600">Email</p>
              <p className="font-medium text-secondary-900">{data.business.email || 'Not provided'}</p>
            </div>
          </div>
        </div>

        {/* Location & Service Area */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Location & Service Area
            </h3>
            <button
              type="button"
              onClick={() => onPrev()}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-secondary-600">Address</p>
              <p className="font-medium text-secondary-900">
                {data.location.address_line1}
                {data.location.address_line2 && <>, {data.location.address_line2}</>}
              </p>
              <p className="font-medium text-secondary-900">
                {data.location.city}, {data.location.state} {data.location.zip_code}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-600">Service Radius</p>
              <p className="font-medium text-secondary-900">{data.location.service_radius} miles</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Pricing
            </h3>
            <button
              type="button"
              onClick={() => onPrev()}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          
          <div>
            <p className="text-sm text-secondary-600">Pricing Mode</p>
            <p className="font-medium text-secondary-900 capitalize mb-3">
              {data.pricing.mode === 'hourly' ? 'Hourly Rate' : 'Project Quotes'}
            </p>
            
            {data.pricing.mode === 'hourly' ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-secondary-600">Hourly Rate:</span>
                  <span className="font-medium text-secondary-900">${data.pricing.hourly_rate}/hour</span>
                </div>
                {data.pricing.minimum_charge && (
                  <div className="flex justify-between">
                    <span className="text-secondary-600">Minimum Charge:</span>
                    <span className="font-medium text-secondary-900">${data.pricing.minimum_charge}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {data.pricing.quote_packages.map((pkg, index) => (
                  <div key={index} className="bg-secondary-50 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-secondary-900">{pkg.name}</p>
                        <p className="text-sm text-secondary-600 mt-1">{pkg.description}</p>
                      </div>
                      <span className="font-semibold text-primary-600">${pkg.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Media & Certifications */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Media & Certifications
            </h3>
            <button
              type="button"
              onClick={() => onPrev()}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-secondary-600">Profile Photo</p>
              <p className="font-medium text-secondary-900">
                {data.media.profile_photo ? '✓ Uploaded' : '✗ Not uploaded'}
              </p>
            </div>
            <div>
              <p className="text-sm text-secondary-600">Gallery Images</p>
              <p className="font-medium text-secondary-900">
                {data.media.gallery_images?.length || 0} photos uploaded
              </p>
            </div>
            {data.media.certifications && (
              <div>
                <p className="text-sm text-secondary-600">Certifications</p>
                <p className="font-medium text-secondary-900 whitespace-pre-line">
                  {data.media.certifications}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
              <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Availability
            </h3>
            <button
              type="button"
              onClick={() => onPrev()}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Edit
            </button>
          </div>
          
          <div className="grid md:grid-cols-2 gap-3">
            {workingDays.map(({ label, schedule }) => (
              <div key={label} className="flex justify-between">
                <span className="text-secondary-600">{label}:</span>
                <span className="font-medium text-secondary-900">
                  {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-orange-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-grow">
              <h4 className="text-lg font-semibold text-secondary-900 mb-2">
                Ready to Go Live?
              </h4>
              <p className="text-secondary-700 mb-4">
                Once you submit your profile, customers will be able to find and contact you for jobs. 
                You can always come back and update your information anytime.
              </p>
              
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="checkbox"
                  id="terms"
                  className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  required
                />
                <label htmlFor="terms" className="text-sm text-secondary-700">
                  I confirm that all information provided is accurate and up to date.
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6">
          <button
            type="button"
            onClick={onPrev}
            className="btn-secondary"
            disabled={submitting}
          >
            ← Back
          </button>
          
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting}
            className="btn-primary min-w-[200px]"
          >
            {submitting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Submitting...
              </div>
            ) : (
              <>
                Submit Profile
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReviewStep;