import { useState } from 'react';
import API from '../api/api';

export const useAuth = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = async (username, password) => {
    const { data } = await API.post('token/', { username, password });
    localStorage.setItem('token', data.access);
    setToken(data.access);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  return { token, login, logout };
};