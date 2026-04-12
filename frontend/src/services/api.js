import axios from 'axios';

const api = axios.create({
  baseURL: 'https://elo-backend-ajak.onrender.com',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API ERROR:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
