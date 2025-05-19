// frontend/src/auth/useAuth.js
import { useState, useEffect } from 'react';
import API from '../api/api';

export function useAuth() {
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      API.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      localStorage.removeItem('token');
      delete API.defaults.headers.common.Authorization;
    }
  }, [token]);

  const login = async (username, password) => {
    const { data } = await API.post('token/', { username, password });
    setToken(data.access);
  };

  const logout = () => {
    setToken(null);
  };

  return { token, login, logout };
}