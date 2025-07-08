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
  
  // Change password (authenticated)
  changePassword: (data) => api.post('/change-password/', data),
  
  // Get auth status
  getAuthStatus: () => api.get('/auth/status/'),
  
  // Get user profile
  getProfile: () => api.get('/profile/'),
  
  // Update user profile
  updateProfile: (data) => api.put('/profile/', data),
};

// Business Profile API endpoints (keeping existing for compatibility)
export const profileAPI = {
  // Create business profile
  createProfile: (profileData) => api.post('/profiles/', profileData),
  
  // Get user's business profile
  getProfile: () => api.get('/profiles/me/'),
  
  // Update business profile
  updateProfile: (profileData) => api.put('/profiles/me/', profileData),
  
  // Upload profile images
  uploadImages: (formData) => api.post('/profiles/me/images/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  
  // Delete profile image
  deleteImage: (imageId) => api.delete(`/profiles/me/images/${imageId}/`),
  
  // Get all profiles (public)
  getProfiles: (params) => api.get('/profiles/', { params }),
  
  // Get specific profile by ID
  getProfileById: (id) => api.get(`/profiles/${id}/`),
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