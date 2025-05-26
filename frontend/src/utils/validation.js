import * as yup from 'yup';

/**
 * Shared validation schemas for forms using Yup
 * Centralized validation logic for consistency across the app
 */

// Phone number regex pattern
const phoneRegex = /^(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}$/;

// User registration schema
export const registrationSchema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

// Login schema
export const loginSchema = yup.object({
  username: yup
    .string()
    .required('Username is required'),
  password: yup
    .string()
    .required('Password is required'),
});

// Business information step schema
export const businessStepSchema = yup.object({
  name: yup
    .string()
    .required('Business name is required')
    .min(2, 'Business name must be at least 2 characters')
    .max(200, 'Business name must be less than 200 characters'),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(phoneRegex, 'Invalid phone number format'),
  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email address'),
  logo: yup
    .mixed()
    .nullable()
    .test('fileSize', 'File size too large (max 5MB)', (value) => {
      if (!value) return true;
      return value.size <= 5 * 1024 * 1024;
    })
    .test('fileType', 'Invalid file type (only images allowed)', (value) => {
      if (!value) return true;
      return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
    }),
});

// Location step schema
export const locationStepSchema = yup.object({
  address_line1: yup
    .string()
    .required('Address is required')
    .max(255, 'Address must be less than 255 characters'),
  address_line2: yup
    .string()
    .max(255, 'Address line 2 must be less than 255 characters'),
  city: yup
    .string()
    .required('City is required')
    .max(100, 'City must be less than 100 characters'),
  state: yup
    .string()
    .required('State is required')
    .max(50, 'State must be less than 50 characters'),
  zip_code: yup
    .string()
    .required('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  service_radius: yup
    .number()
    .required('Service radius is required')
    .min(1, 'Service radius must be at least 1 mile')
    .max(500, 'Service radius must be less than 500 miles'),
});

// Pricing step schema
export const pricingStepSchema = yup.object({
  mode: yup
    .string()
    .required('Pricing mode is required')
    .oneOf(['hourly', 'quoted'], 'Invalid pricing mode'),
  hourly_rate: yup
    .number()
    .nullable()
    .when('mode', {
      is: 'hourly',
      then: (schema) => schema
        .required('Hourly rate is required for hourly pricing')
        .min(1, 'Hourly rate must be at least $1')
        .max(1000, 'Hourly rate must be less than $1000'),
      otherwise: (schema) => schema.nullable(),
    }),
  minimum_charge: yup
    .number()
    .nullable()
    .min(0, 'Minimum charge cannot be negative')
    .max(10000, 'Minimum charge must be less than $10,000'),
  quote_packages: yup
    .array()
    .when('mode', {
      is: 'quoted',
      then: (schema) => schema
        .min(1, 'At least one quote package is required for quoted pricing')
        .of(
          yup.object({
            name: yup.string().required('Package name is required'),
            description: yup.string().required('Package description is required'),
            price: yup.number().required('Package price is required').min(1, 'Price must be greater than $0'),
          })
        ),
      otherwise: (schema) => schema,
    }),
});

// Media step schema
export const mediaStepSchema = yup.object({
  certifications: yup
    .string()
    .max(2000, 'Certifications must be less than 2000 characters'),
  profile_photo: yup
    .mixed()
    .nullable()
    .test('fileSize', 'File size too large (max 5MB)', (value) => {
      if (!value) return true;
      return value.size <= 5 * 1024 * 1024;
    })
    .test('fileType', 'Invalid file type (only images allowed)', (value) => {
      if (!value) return true;
      return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
    }),
  gallery_images: yup
    .array()
    .max(10, 'Maximum 10 gallery images allowed')
    .of(
      yup.mixed()
        .test('fileSize', 'File size too large (max 5MB)', (value) => {
          return value.size <= 5 * 1024 * 1024;
        })
        .test('fileType', 'Invalid file type (only images allowed)', (value) => {
          return ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(value.type);
        })
    ),
});

// Availability step schema
export const availabilityStepSchema = yup.object().shape({
  schedule: yup.object().test(
    'at-least-one-day',
    'Please select at least one working day',
    value => Object.values(value).some(day => day.enabled)
  ),
  custom_hours: yup.boolean(),
  available_immediately: yup.boolean(),
  start_date: yup.string().when('available_immediately', {
    is: false,
    then: yup.string().required('Start date is required when not immediately available')
  }),
  business_hours: yup.object().shape({
    start: yup.string().required(),
    end: yup.string().required()
  })
});

// Split location validation into separate schemas
export const addressConfirmationSchema = yup.object({
  address_line1: yup
    .string()
    .required('Address is required')
    .max(255, 'Address must be less than 255 characters'),
  address_line2: yup
    .string()
    .max(255, 'Address line 2 must be less than 255 characters'),
  city: yup
    .string()
    .required('City is required')
    .max(100, 'City must be less than 100 characters'),
  state: yup
    .string()
    .required('State is required')
    .max(50, 'State must be less than 50 characters'),
  zip_code: yup
    .string()
    .required('ZIP code is required')
    .matches(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code format'),
  latitude: yup
    .number()
    .required('Please select a location on the map'),
  longitude: yup
    .number()
    .required('Please select a location on the map')
});

export const serviceAreaSchema = yup.object({
  service_area_type: yup
    .string()
    .required('Please select a service area type')
    .oneOf(['radius']), // Add other types if needed
  service_radius: yup
    .number()
    .required('Service radius is required')
    .min(1, 'Service radius must be at least 1 mile')
    .max(500, 'Service radius must be less than 500 miles'),
  willing_to_travel_outside: yup
    .boolean()
    .default(false)
});