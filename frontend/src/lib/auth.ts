import axios from 'axios';

const API_URL = "http://localhost:8000/api";

export const setToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('flux_token', token);
  }
};

export const getToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('flux_token');
  }
  return null;
};

export const removeToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('flux_token');
    localStorage.removeItem('flux_user');
  }
};

export const setUser = (user: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('flux_user', JSON.stringify(user));
  }
};

export const getUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('flux_user');
    if (userStr) return JSON.parse(userStr);
  }
  return null;
};

// Axios instance with interceptor
export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
