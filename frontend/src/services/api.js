import axios from 'axios';

// 🔥 BASE URL DINÂMICA (PROD + DEV)
const baseURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.MODE === 'development'
    ? 'http://localhost:3000'
    : 'https://elo-backend-ajak.onrender.com');

const api = axios.create({
  baseURL,
});

// 🔐 INTERCEPTOR TOKEN
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ⚠️ INTERCEPTOR DE ERRO (opcional, mas MUITO bom)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('API ERROR:', error.response.data);
    } else {
      console.error('API ERROR:', error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
