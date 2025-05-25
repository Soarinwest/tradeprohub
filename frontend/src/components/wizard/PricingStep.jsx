import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { pricingStepSchema } from '../../utils/validation';

/**
 * PricingStep - Pricing model and rate configuration
 * Choose between hourly rates or project quotes with package builder
 */
const PricingStep = ({ data, updateData, onNext, onPrev }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
    setValue,
  } = useForm({
    resolver: yupResolver(pricingStepSchema),
    defaultValues: {
      mode: data.pricing.mode || 'hourly',
      hourly_rate: data.pricing.hourly_rate || '',
      minimum_charge: data.pricing.minimum_charge || '',
      quote_packages: data.pricing.quote_packages || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'quote_packages',
  });

  const watchedMode = watch('mode');

  const addPackage = () => {
    append({ name: '', description: '', price: '' });
  };

  const onSubmit = (formData) => {
    updateData('pricing', formData);
    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Pricing & Service Packages
        </h2>
        <p className="text-secondary-600">
          Set your rates and pricing structure. You can always adjust these later.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Pricing Mode Selection */}
        <div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            How do you prefer to price your work?
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <label className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
              watchedMode === 'hourly' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-secondary-200 hover:border-secondary-300'
            }`}>
              <input
                {...register('mode')}
                type="radio"
                value="hourly"
                className="sr-only"
              />
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    watchedMode === 'hourly' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-secondary-300'
                  }`}>
                    {watchedMode === 'hourly' && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-secondary-900">
                    Hourly Rate
                  </h4>
                  <p className="text-secondary-600 text-sm mt-1">
                    Charge by the hour for your time and expertise. Great for ongoing work, repairs, and consulting.
                  </p>
                  <div className="flex items-center mt-2">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-primary-600">Time-based billing</span>
                  </div>
                </div>
              </div>
            </label>

            <label className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
              watchedMode === 'quoted' 
                ? 'border-primary-500 bg-primary-50' 
                : 'border-secondary-200 hover:border-secondary-300'
            }`}>
              <input
                {...register('mode')}
                type="radio"
                value="quoted"
                className="sr-only"
              />
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-4 h-4 rounded-full border-2 mt-1 ${
                    watchedMode === 'quoted' 
                      ? 'border-primary-500 bg-primary-500' 
                      : 'border-secondary-300'
                  }`}>
                    {watchedMode === 'quoted' && (
                      <div className="w-2 h-2 bg-white rounded-full m-auto mt-0.5"></div>
                    )}
                  </div>
                </div>
                <div className="ml-4">
                  <h4 className="text-lg font-medium text-secondary-900">
                    Project Quotes
                  </h4>
                  <p className="text-secondary-600 text-sm mt-1">
                    Offer fixed-price packages for common jobs. Perfect for installations, complete projects, and standard services.
                  </p>
                  <div className="flex items-center mt-2">
                    <svg className="w-5 h-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-primary-600">Fixed-price packages</span>
                  </div>
                </div>
              </div>
            </label>
          </div>
          {errors.mode && (
            <p className="text-red-600 text-sm mt-2">{errors.mode.message}</p>
          )}
        </div>

        {/* Hourly Rate Section */}
        {watchedMode === 'hourly' && (
          <div className="bg-secondary-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Hourly Rate Details
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Hourly Rate *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-secondary-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('hourly_rate')}
                    type="number"
                    step="0.01"
                    min="1"
                    className={`input-field pl-7 ${errors.hourly_rate ? 'border-red-500' : ''}`}
                    placeholder="75.00"
                  />
                </div>
                {errors.hourly_rate && (
                  <p className="text-red-600 text-sm mt-1">{errors.hourly_rate.message}</p>
                )}
                <p className="text-sm text-secondary-600 mt-1">
                  What you charge per hour for your work
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Minimum Charge (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-secondary-500 sm:text-sm">$</span>
                  </div>
                  <input
                    {...register('minimum_charge')}
                    type="number"
                    step="0.01"
                    min="0"
                    className={`input-field pl-7 ${errors.minimum_charge ? 'border-red-500' : ''}`}
                    placeholder="150.00"
                  />
                </div>
                {errors.minimum_charge && (
                  <p className="text-red-600 text-sm mt-1">{errors.minimum_charge.message}</p>
                )}
                <p className="text-sm text-secondary-600 mt-1">
                  Minimum charge for any job (e.g., service call fee)
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-blue-800">Pricing Tips</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Factor in your expertise, materials, travel time, and local market rates. 
                    A minimum charge helps cover your time for small jobs and service calls.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quote Packages Section */}
        {watchedMode === 'quoted' && (
          <div className="bg-secondary-50 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-secondary-900">
                Service Packages
              </h3>
              <button
                type="button"
                onClick={addPackage}
                className="btn-primary text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Package
              </button>
            </div>

            {fields.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h4 className="text-lg font-medium text-secondary-900 mb-2">
                  No packages yet
                </h4>
                <p className="text-secondary-600 mb-4">
                  Create service packages with fixed prices for common jobs
                </p>
                <button
                  type="button"
                  onClick={addPackage}
                  className="btn-primary"
                >
                  Create Your First Package
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="bg-white rounded-lg border border-secondary-200 p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-medium text-secondary-900">
                        Package #{index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid gap-4">
                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Package Name *
                        </label>
                        <input
                          {...register(`quote_packages.${index}.name`)}
                          className={`input-field ${errors.quote_packages?.[index]?.name ? 'border-red-500' : ''}`}
                          placeholder="e.g., Basic Plumbing Service"
                        />
                        {errors.quote_packages?.[index]?.name && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.quote_packages[index].name.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Description *
                        </label>
                        <textarea
                          {...register(`quote_packages.${index}.description`)}
                          rows="3"
                          className={`input-field ${errors.quote_packages?.[index]?.description ? 'border-red-500' : ''}`}
                          placeholder="Describe what's included in this package..."
                        />
                        {errors.quote_packages?.[index]?.description && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.quote_packages[index].description.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-secondary-700 mb-1">
                          Price *
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-secondary-500 sm:text-sm">$</span>
                          </div>
                          <input
                            {...register(`quote_packages.${index}.price`)}
                            type="number"
                            step="0.01"
                            min="1"
                            className={`input-field pl-7 ${errors.quote_packages?.[index]?.price ? 'border-red-500' : ''}`}
                            placeholder="500.00"
                          />
                        </div>
                        {errors.quote_packages?.[index]?.price && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.quote_packages[index].price.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fields.length > 0 && (
              <div className="mt-4 p-4 bg-orange-50 rounded-md border border-orange-200">
                <div className="flex">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-orange-800">Package Examples</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Common packages: "Basic Service Call" ($150), "Full System Inspection" ($350), 
                      "Emergency After-Hours" ($250+), "Standard Installation" ($500-1500).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {errors.quote_packages && typeof errors.quote_packages === 'object' && 'message' in errors.quote_packages && (
              <p className="text-red-600 text-sm mt-2">{errors.quote_packages.message}</p>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={onPrev}
            className="btn-secondary"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            Next: Media & Certifications →
          </button>
        </div>
      </form>
    </div>
  );
};

export default PricingStep;