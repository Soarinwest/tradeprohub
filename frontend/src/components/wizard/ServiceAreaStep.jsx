import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { serviceAreaSchema } from '../../utils/validation';
import RadiusServiceArea from './RadiusServiceArea';

const ServiceAreaStep = ({
  initialData,
  confirmedAddress,
  onConfirm,
  onBack,
  mapboxToken
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(serviceAreaSchema),
    defaultValues: initialData || {
      service_area_type: 'radius',
      willing_to_travel_outside: false
    }
  });

  const watchedServiceAreaType = watch('service_area_type', 'radius');

  const onSubmit = (data) => {
    onConfirm({
      ...confirmedAddress,
      ...data
    });
  };

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Define Your Service Coverage Area
        </h2>
        <p className="text-secondary-600">
          Choose how you want to define your service area.
        </p>

        <div className="mt-4 p-3 bg-green-50 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            ✓ Confirmed Address: {confirmedAddress?.address_line1}, {confirmedAddress?.city}, {confirmedAddress?.state} {confirmedAddress?.zip_code}
          </p>
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-green-600 hover:text-green-700 underline mt-1"
          >
            Change address
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-6">
          <div className="bg-secondary-50 p-4 rounded-lg">
            <label className="block text-sm font-medium text-secondary-700 mb-3">
              Service Area Type *
            </label>
            <div className="space-y-3">
              {/* Service area type radio buttons */}
              <label className="flex items-center">
                <input
                  {...register('service_area_type')}
                  type="radio"
                  value="radius"
                  className="mr-3"
                />
                <span className="text-sm">Radius from my location</span>
              </label>
              {/* ...other radio options... */}
            </div>
          </div>

          {watchedServiceAreaType === 'radius' && (
            <RadiusServiceArea
              address={confirmedAddress}
              register={register}
              setValue={setValue}
              mapboxToken={mapboxToken}
              watch={watch}
            />
          )}

          <div className="bg-primary-50 p-4 rounded-lg">
            <label className="flex items-start">
              <input
                {...register('willing_to_travel_outside')}
                type="checkbox"
                className="mt-1 mr-3"
              />
              <div>
                <span className="text-sm font-medium text-secondary-900">
                  Willing to discuss projects outside my service area
                </span>
                <p className="text-xs text-secondary-600 mt-1">
                  Check this if you're open to considering special projects outside your normal service area.
                </p>
              </div>
            </label>
          </div>

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={onBack}
              className="btn-secondary"
            >
              ← Back to Address
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Confirm Service Area →
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ServiceAreaStep;