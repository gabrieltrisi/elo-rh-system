import axios from 'axios';

const api = axios.create({
  baseURL: 'https://elo-backend-ajak.onrender.com',
});

// REQUEST
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (!token) {
    console.warn('⚠️ Token não encontrado no localStorage');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// RESPONSE
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔥 TRATAMENTO GLOBAL DE ERRO
    if (error.response?.status === 401) {
      console.warn('🚨 Token inválido ou expirado');

      // limpa sessão
      localStorage.removeItem('token');

      // redireciona
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
