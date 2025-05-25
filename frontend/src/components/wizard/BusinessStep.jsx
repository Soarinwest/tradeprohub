import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { businessStepSchema } from '../../utils/validation';

const BusinessStep = ({ data, updateData, onNext }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(businessStepSchema),
    defaultValues: data.business,
  });

  const onSubmit = (formData) => {
    updateData('business', formData);
    onNext();
  };

  return (
    <div className="wizard-step">
      <h2 className="text-2xl font-bold mb-4">Business Information</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Business Name *</label>
          <input
            {...register('name')}
            className="input-field"
            placeholder="Enter your business name"
          />
          {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Phone Number *</label>
          <input
            {...register('phone')}
            className="input-field"
            placeholder="(555) 123-4567"
          />
          {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Business Email *</label>
          <input
            {...register('email')}
            type="email"
            className="input-field"
            placeholder="business@example.com"
          />
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <button type="submit" className="btn-primary w-full">
          Next: Location
        </button>
      </form>
    </div>
  );
};

export default BusinessStep;