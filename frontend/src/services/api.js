import axios from 'axios';

const PUBLIC_ROUTES = ['/admission/public/'];

const api = axios.create({
  baseURL: 'https://elo-backend-ajak.onrender.com',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const requestUrl = `${config.url || ''}`;

    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      requestUrl.includes(route)
    );

    if (!isPublicRoute && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = `${error.config?.url || ''}`;
    const isPublicRoute = PUBLIC_ROUTES.some((route) =>
      requestUrl.includes(route)
    );

    if (error.response?.status === 401 && !isPublicRoute) {
      console.warn('🚨 Token inválido ou expirado');

      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
