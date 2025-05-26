import api from './api';

export const profileService = {
  async getProfile() {
    try {
      const response = await api.get('/business/profile/');
      return { success: true, data: response.data };
    } catch (error) {
      // Return null if 404 (profile doesn't exist yet)
      if (error.response?.status === 404) {
        return { success: true, data: null };
      }
      return { success: false, error: error.response?.data };
    }
  },

  async createProfile(profileData) {
    try {
      const response = await api.post('/business/profile/', profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  async updateProfile(profileData) {
    try {
      const response = await api.put('/business/profile/', profileData);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  },

  async saveWizardStep(step, data) {
    try {
      const response = await api.post(`/business/profile/wizard/${step}/`, data);
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.response?.data };
    }
  }
};