import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { availabilityStepSchema } from '../../utils/validation';

/**
 * AvailabilityStep - Weekly schedule and availability settings
 * Allows users to set their working days and hours
 */
const AvailabilityStep = ({ data = { availability: {} }, updateData, onNext, onPrev }) => {
  const days = [
    { key: 'monday', label: 'Monday', short: 'M' },
    { key: 'tuesday', label: 'Tuesday', short: 'T' },
    { key: 'wednesday', label: 'Wednesday', short: 'W' },
    { key: 'thursday', label: 'Thursday', short: 'T' },
    { key: 'friday', label: 'Friday', short: 'F' },
    { key: 'saturday', label: 'Saturday', short: 'S' },
    { key: 'sunday', label: 'Sunday', short: 'S' },
  ];

  const timeSlots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const displayTime = formatTime(time);
      timeSlots.push({ value: time, label: displayTime });
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm({
    resolver: yupResolver(availabilityStepSchema),
    defaultValues: {
      schedule: data.availability?.schedule || defaultSchedule,
      custom_hours: data.availability?.custom_hours || false,
      available_immediately: data.availability?.available_immediately || false,
      start_date: data.availability?.start_date || '',
      business_hours: data.availability?.business_hours || defaultBusinessHours,
    }
  });

  const watchedSchedule = watch('schedule');

  // Format time for display
  function formatTime(time) {
    const [hour, minute] = time.split(':').map(Number);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
  }

  // Toggle day enabled/disabled
  const toggleDay = (dayKey) => {
    const currentValue = watchedSchedule[dayKey].enabled;
    setValue(`schedule.${dayKey}.enabled`, !currentValue);
  };

  // Apply same hours to all enabled days
  const applyToAllDays = () => {
    const firstEnabledDay = days.find(day => watchedSchedule[day.key].enabled);
    if (!firstEnabledDay) return;

    const { start, end } = watchedSchedule[firstEnabledDay.key];
    
    days.forEach(day => {
      if (watchedSchedule[day.key].enabled) {
        setValue(`schedule.${day.key}.start`, start);
        setValue(`schedule.${day.key}.end`, end);
      }
    });
  };

  // Copy hours from one day to another
  const copyHours = (fromDay, toDay) => {
    const fromSchedule = watchedSchedule[fromDay];
    setValue(`schedule.${toDay}.start`, fromSchedule.start);
    setValue(`schedule.${toDay}.end`, fromSchedule.end);
    setValue(`schedule.${toDay}.enabled`, true);
  };

  const onSubmit = (formData) => {
    updateData('availability', formData);
    onNext();
  };

  const hasEnabledDays = days.some(day => watchedSchedule[day.key].enabled);

  return (
    <div className="wizard-step">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-secondary-900 mb-2">
          Availability Schedule
        </h2>
        <p className="text-secondary-600">
          Set your regular working hours. Customers will know when you're available for jobs.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Quick Actions */}
        <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">
            Quick Setup
          </h3>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                days.slice(0, 5).forEach(day => {
                  setValue(`schedule.${day.key}.enabled`, true);
                  setValue(`schedule.${day.key}.start`, '09:00');
                  setValue(`schedule.${day.key}.end`, '17:00');
                });
                days.slice(5).forEach(day => {
                  setValue(`schedule.${day.key}.enabled`, false);
                });
              }}
              className="btn-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mon-Fri 9-5
            </button>
            
            <button
              type="button"
              onClick={() => {
                days.forEach(day => {
                  setValue(`schedule.${day.key}.enabled`, true);
                  setValue(`schedule.${day.key}.start`, '08:00');
                  setValue(`schedule.${day.key}.end`, '18:00');
                });
              }}
              className="btn-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              All Week
            </button>

            <button
              type="button"
              onClick={() => {
                days.forEach(day => {
                  setValue(`schedule.${day.key}.enabled`, false);
                });
              }}
              className="btn-secondary text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All
            </button>

            {hasEnabledDays && (
              <button
                type="button"
                onClick={applyToAllDays}
                className="btn-secondary text-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Apply to All Days
              </button>
            )}
          </div>
        </div>

        {/* Weekly Schedule */}
        <div className="space-y-4">
          {days.map((day, index) => {
            const isEnabled = watchedSchedule[day.key].enabled;
            const startTime = watchedSchedule[day.key].start;
            const endTime = watchedSchedule[day.key].end;

            return (
              <div
                key={day.key}
                className={`rounded-lg border-2 p-4 transition-all ${
                  isEnabled
                    ? 'border-primary-200 bg-primary-50'
                    : 'border-secondary-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => toggleDay(day.key)}
                      className={`w-6 h-6 rounded mr-3 transition-colors ${
                        isEnabled
                          ? 'bg-primary-500 text-white'
                          : 'bg-secondary-200 text-secondary-600'
                      }`}
                    >
                      {isEnabled && (
                        <svg className="w-4 h-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`font-medium ${isEnabled ? 'text-secondary-900' : 'text-secondary-500'}`}>
                      {day.label}
                    </span>
                  </div>

                  {isEnabled ? (
                    <div className="flex items-center space-x-3">
                      <select
                        {...register(`schedule.${day.key}.start`)}
                        className="input-field py-2 px-3 text-sm"
                      >
                        {timeSlots.map(slot => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>
                      
                      <span className="text-secondary-600">to</span>
                      
                      <select
                        {...register(`schedule.${day.key}.end`)}
                        className="input-field py-2 px-3 text-sm"
                      >
                        {timeSlots.map(slot => (
                          <option key={slot.value} value={slot.value}>
                            {slot.label}
                          </option>
                        ))}
                      </select>

                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => copyHours(days[index - 1].key, day.key)}
                          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                          title={`Copy hours from ${days[index - 1].label}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-secondary-500 text-sm">Closed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error Message */}
        {errors.schedule && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-800">{errors.schedule.message}</p>
          </div>
        )}

        {/* Schedule Summary */}
        {hasEnabledDays && (
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-secondary-900 mb-3">
              Your Schedule Summary
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              {days.filter(day => watchedSchedule[day.key].enabled).map(day => (
                <div key={day.key} className="flex justify-between">
                  <span className="font-medium text-secondary-700">{day.label}:</span>
                  <span className="text-secondary-900">
                    {formatTime(watchedSchedule[day.key].start)} - {formatTime(watchedSchedule[day.key].end)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <p className="text-sm text-blue-800">
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This is your regular schedule. You can always adjust for specific jobs or time off.
              </p>
            </div>
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
            Next: Review & Submit →
          </button>
        </div>
      </form>
    </div>
  );
};

// Helper function to get default schedule
const defaultSchedule = {
  monday: { enabled: false, start: '09:00', end: '17:00' },
  tuesday: { enabled: false, start: '09:00', end: '17:00' },
  wednesday: { enabled: false, start: '09:00', end: '17:00' },
  thursday: { enabled: false, start: '09:00', end: '17:00' },
  friday: { enabled: false, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' }
};

// Add default business hours
const defaultBusinessHours = {
  start: '09:00',
  end: '17:00'
};

export default AvailabilityStep;