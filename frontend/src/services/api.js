// Enhanced API service with comprehensive authentication features
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Token management utilities
const TokenManager = {
  getAccessToken: () => localStorage.getItem('access_token'),
  getRefreshToken: () => localStorage.getItem('refresh_token'),
  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
  },
  clearTokens: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
  isTokenExpired: (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  }
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    
    if (token && !TokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { requestStartedAt: new Date().getTime() };
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => {
    // Add response time for debugging
    if (response.config.metadata) {
      response.config.metadata.responseTime = 
        new Date().getTime() - response.config.metadata.requestStartedAt;
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 401 errors with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = TokenManager.getRefreshToken();
      
      if (refreshToken && !TokenManager.isTokenExpired(refreshToken)) {
        try {
          const response = await axios.post(
            `${api.defaults.baseURL}/token/refresh/`,
            { refresh: refreshToken }
          );
          
          const newAccessToken = response.data.access;
          const newRefreshToken = response.data.refresh;
          
          TokenManager.setTokens(newAccessToken, newRefreshToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          TokenManager.clearTokens();
          window.location.href = '/login';
        }
      } else {
        TokenManager.clearTokens();
        window.location.href = '/login';
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
      error.message = 'Network error. Please check your connection and try again.';
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
      error.message = 'Server error. Please try again later.';
    }
    
    return Promise.reject(error);
  }
);

// Authentication API endpoints
export const authAPI = {
  // User registration
  register: (userData) => api.post('/register/', userData),
  
  // User login
  login: (credentials) => api.post('/login/', credentials),
  
  // User logout
  logout: (refreshToken) => api.post('/logout/', { refresh_token: refreshToken }),
  
  // Token refresh
  refreshToken: (refreshToken) => api.post('/token/refresh/', { refresh: refreshToken }),
  
  // Password reset request
  requestPasswordReset: (email) => api.post('/password-reset/', { email }),
  
  // Password reset confirmation
  confirmPasswordReset: (data) => api.post('/password-reset/confirm/', data),
  
  // Email verification
  verifyEmail: (token) => api.post('/verify-email/', { token }),

  // Email re-verification
  resendVerification: (email) => api.post('/users/resend-verification/', { email }),
  
  // Change password (authenticated)
  changePassword: (data) => api.post('/change-password/', data),
  
  // Get auth status
  getAuthStatus: () => api.get('/auth/status/'),
  
  // Get user profile
  getProfile: () => api.get('/profile/'),
  
  // Update user profile
  updateProfile: (data) => api.put('/profile/', data),
};

// Enhanced Business Profile API endpoints
export const profileAPI = {
  // Get user's business profile (try new endpoint first)
  getProfile: async () => {
    try {
      return await api.get('/profiles/me/');
    } catch (error) {
      if (error.response?.status === 404) {
        // Try the list endpoint as fallback
        const response = await api.get('/profiles/');
        if (Array.isArray(response.data) && response.data.length > 0) {
          return { data: response.data[0] };
        }
        throw error;
      }
      throw error;
    }
  },
  
  // Create business profile
  createProfile: (profileData) => api.post('/profiles/', profileData),
  
  // Update business profile (try new endpoint first)
  updateProfile: async (profileData, profileId = null) => {
    try {
      return await api.put('/profiles/me/', profileData);
    } catch (error) {
      if (profileId) {
        // Fallback to ID-based endpoint
        return await api.put(`/profiles/${profileId}/`, profileData);
      }
      throw error;
    }
  },
  
  // Partial update
  patchProfile: async (profileData, profileId = null) => {
    try {
      return await api.patch('/profiles/me/', profileData);
    } catch (error) {
      if (profileId) {
        return await api.patch(`/profiles/${profileId}/`, profileData);
      }
      throw error;
    }
  },
  
  // Upload profile images
  uploadImages: (profileId, formData) => 
    api.post(`/profiles/${profileId}/upload-images/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  // Delete profile image
  deleteImage: (profileId, imageId) => 
    api.delete(`/profiles/${profileId}/images/${imageId}/`),
  
  // Get profile completion status
  getCompletionStatus: (profileId) => 
    api.get(`/profiles/${profileId}/completion-status/`),
  
  // Get all profiles (public)
  getProfiles: (params) => api.get('/profiles/', { params }),
  
  // Get specific profile by ID
  getProfileById: (id) => api.get(`/profiles/${id}/`),
  
  // Upload files with better error handling
  uploadFile: async (profileId, field, file) => {
    const formData = new FormData();
    formData.append(field, file);
    
    try {
      return await api.patch(`/profiles/${profileId}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  },
  
  // Bulk upload gallery images
  uploadGalleryImages: async (profileId, images) => {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });
    
    try {
      return await api.post(`/profiles/${profileId}/upload-images/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    } catch (error) {
      throw apiUtils.handleError(error);
    }
  }
};

// Enhanced error handling for profiles
export const profileUtils = {
  // Transform backend profile data to frontend format
  transformProfileFromBackend: (profile) => {
    if (!profile) return null;
    
    return {
      id: profile.id,
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
        availability_schedule: profile.availability_schedule || {},
        available_immediately: profile.available_immediately ?? true,
        start_date: profile.start_date || ''
      },
      status: {
        is_complete: profile.is_complete || false,
        is_active: profile.is_active ?? true,
        completion_percentage: profile.completion_percentage || 0
      },
      timestamps: {
        created_at: profile.created_at,
        updated_at: profile.updated_at
      }
    };
  },
  
  // Transform frontend profile data to backend format
  transformProfileToBackend: (profileData) => {
    const payload = {
      // Business information
      business_name: profileData.business?.name || '',
      business_phone: profileData.business?.phone || '',
      business_email: profileData.business?.email || '',
      
      // Address information
      address_line1: profileData.address?.address_line1 || '',
      address_line2: profileData.address?.address_line2 || '',
      city: profileData.address?.city || '',
      state: profileData.address?.state || '',
      zip_code: profileData.address?.zip_code || '',
      latitude: profileData.address?.latitude ? parseFloat(profileData.address.latitude) : null,
      longitude: profileData.address?.longitude ? parseFloat(profileData.address.longitude) : null,
      
      // Service area information
      service_area_type: profileData.serviceArea?.type || 'radius',
      service_radius: parseInt(profileData.serviceArea?.radius) || 25,
      willing_to_travel_outside: profileData.serviceArea?.willing_to_travel_outside || false,
      
      // Pricing information
      pricing_mode: profileData.pricing?.mode || 'hourly',
      hourly_rate: profileData.pricing?.mode === 'hourly' && profileData.pricing?.hourly_rate
        ? parseFloat(profileData.pricing.hourly_rate) 
        : null,
      minimum_charge: profileData.pricing?.minimum_charge 
        ? parseFloat(profileData.pricing.minimum_charge) 
        : null,
      quote_packages: profileData.pricing?.quote_packages || [],
      
      // Media information
      certifications: profileData.media?.certifications || '',
      
      // Availability information
      availability_schedule: profileData.availability?.availability_schedule || {},
      available_immediately: profileData.availability?.available_immediately ?? true,
      start_date: profileData.availability?.start_date || null
    };

    // Remove null/undefined values
    return Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        acc[key] = value;
      }
      return acc;
    }, {});
  },
  
  // Validate profile data
  validateProfile: (profileData) => {
    const errors = {};
    
    // Business validation
    if (!profileData.business?.name?.trim()) {
      errors.business_name = 'Business name is required';
    }
    if (!profileData.business?.phone?.trim()) {
      errors.business_phone = 'Business phone is required';
    }
    if (!profileData.business?.email?.trim()) {
      errors.business_email = 'Business email is required';
    }
    
    // Address validation
    if (!profileData.address?.address_line1?.trim()) {
      errors.address_line1 = 'Street address is required';
    }
    if (!profileData.address?.city?.trim()) {
      errors.city = 'City is required';
    }
    if (!profileData.address?.state?.trim()) {
      errors.state = 'State is required';
    }
    if (!profileData.address?.zip_code?.trim()) {
      errors.zip_code = 'ZIP code is required';
    }
    
    // Service area validation
    if (profileData.serviceArea?.type === 'radius') {
      if (!profileData.serviceArea?.radius || profileData.serviceArea.radius < 1) {
        errors.service_radius = 'Service radius must be at least 1 mile';
      }
    }
    
    // Pricing validation
    if (profileData.pricing?.mode === 'hourly') {
      if (!profileData.pricing?.hourly_rate || parseFloat(profileData.pricing.hourly_rate) <= 0) {
        errors.hourly_rate = 'Hourly rate is required for hourly pricing';
      }
    } else if (profileData.pricing?.mode === 'quoted') {
      if (!profileData.pricing?.quote_packages || profileData.pricing.quote_packages.length === 0) {
        errors.quote_packages = 'At least one quote package is required for quoted pricing';
      }
    }
    
    return errors;
  }
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = TokenManager.getAccessToken();
    return token && !TokenManager.isTokenExpired(token);
  },
  
  // Get current user info from token
  getCurrentUserInfo: () => {
    const token = TokenManager.getAccessToken();
    if (!token) return null;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        userId: payload.user_id,
        username: payload.username,
        email: payload.email,
        exp: payload.exp,
        iat: payload.iat,
      };
    } catch (error) {
      return null;
    }
  },
  
  // Clear all auth data
  clearAuth: () => {
    TokenManager.clearTokens();
  },
  
  // Handle API errors consistently
  handleError: (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return {
            type: 'validation',
            message: 'Invalid input data',
            details: data.details || data,
          };
        case 401:
          return {
            type: 'authentication',
            message: 'Authentication required',
            details: data.detail || 'Please log in to continue',
          };
        case 403:
          return {
            type: 'permission',
            message: 'Permission denied',
            details: data.detail || 'You do not have permission to perform this action',
          };
        case 404:
          return {
            type: 'not_found',
            message: 'Resource not found',
            details: data.detail || 'The requested resource was not found',
          };
        case 429:
          return {
            type: 'rate_limit',
            message: 'Too many requests',
            details: data.detail || 'Please wait before making more requests',
          };
        case 500:
          return {
            type: 'server_error',
            message: 'Server error',
            details: 'An internal server error occurred. Please try again later.',
          };
        default:
          return {
            type: 'unknown',
            message: 'An error occurred',
            details: data.detail || error.message,
          };
      }
    } else if (error.request) {
      // Network error
      return {
        type: 'network',
        message: 'Network error',
        details: 'Please check your internet connection and try again.',
      };
    } else {
      // Other error
      return {
        type: 'unknown',
        message: 'An unexpected error occurred',
        details: error.message,
      };
    }
  },
  
  // Format file uploads
  createFormData: (data, fileFields = []) => {
    const formData = new FormData();
    
    Object.keys(data).forEach(key => {
      if (fileFields.includes(key)) {
        // Handle file fields
        if (data[key] instanceof FileList) {
          Array.from(data[key]).forEach(file => {
            formData.append(key, file);
          });
        } else if (data[key] instanceof File) {
          formData.append(key, data[key]);
        }
      } else if (Array.isArray(data[key])) {
        // Handle arrays
        data[key].forEach(item => {
          formData.append(key, item);
        });
      } else if (data[key] !== null && data[key] !== undefined) {
        // Handle regular fields
        formData.append(key, data[key]);
      }
    });
    
    return formData;
  },
};

// Request/Response logging for development
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(request => {
    console.log('🚀 API Request:', {
      method: request.method?.toUpperCase(),
      url: request.url,
      data: request.data,
      headers: request.headers,
    });
    return request;
  });
  
  api.interceptors.response.use(
    response => {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data,
        responseTime: response.config.metadata?.responseTime + 'ms',
      });
      return response;
    },
    error => {
      console.error('❌ API Error:', {
        status: error.response?.status,
        url: error.config?.url,
        message: error.message,
        data: error.response?.data,
      });
      return Promise.reject(error);
    }
  );
}


export default api;