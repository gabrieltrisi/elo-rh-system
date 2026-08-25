import axios from 'axios';
import {
  clearStoredSession,
  getStoredToken,
  setAuthNotice,
} from '../utils/authSession';

const PUBLIC_ROUTES = [
  '/admission/public/',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/health',
];
const PUBLIC_PAGE_PREFIXES = ['/admission/'];
const REQUEST_TIMEOUT_MS = 12000;
const isDevelopment = Boolean(import.meta.env.DEV);
const AUTH_401_CODES = new Set([
  'AUTH_TOKEN_MISSING',
  'AUTH_TOKEN_INVALID',
  'AUTH_TOKEN_EXPIRED',
  'AUTH_SESSION_LEGACY',
  'AUTH_SESSION_NOT_FOUND',
  'AUTH_SESSION_REVOKED',
  'AUTH_SESSION_EXPIRED',
  'AUTH_USER_INACTIVE',
  'AUTH_COMPANY_CONTEXT_INVALID',
]);

const sanitizeBaseUrl = (value) => String(value || '').trim().replace(/\/$/, '');

const resolveApiBaseUrl = () => {
  const envBaseUrl = sanitizeBaseUrl(import.meta.env.VITE_API_URL);

  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname || '';

    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }

  return '';
};

const isPublicRequest = (url = '') =>
  PUBLIC_ROUTES.some((route) => String(url).includes(route));

const isPublicPage = () => {
  if (typeof window === 'undefined') return false;

  const currentPath = window.location.pathname || '';

  return PUBLIC_PAGE_PREFIXES.some((route) => currentPath.startsWith(route));
};

const isSafeRetryCandidate = (error) => {
  const method = String(error.config?.method || 'get').toLowerCase();
  const hasResponse = Boolean(error.response);
  const timedOut = error.code === 'ECONNABORTED';
  const browserOffline =
    typeof navigator !== 'undefined' && navigator.onLine === false;
  const networkFailure =
    (browserOffline || !hasResponse) &&
    (error.message === 'Network Error' ||
      error.message?.includes('Network Error') ||
      timedOut ||
      browserOffline);

  return method === 'get' && networkFailure;
};

export const resolveApiErrorMessage = (error) => {
  if (error?.userMessage) {
    return error.userMessage;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'Sem conexao com a internet no momento. Verifique sua rede e tente novamente.';
  }

  if (error?.code === 'ECONNABORTED') {
    return 'A requisicao demorou demais. Tente novamente em instantes.';
  }

  if (!error?.response) {
    return 'Nao foi possivel conectar ao servidor. Verifique sua conexao ou tente novamente.';
  }

  const status = Number(error.response.status);
  const responseCode = error.response?.data?.code;
  const responseMessage = error.response?.data?.message;

  if (status === 401) {
    if (responseCode === 'AUTH_USER_INACTIVE') {
      return 'Seu acesso nao esta disponivel no momento. Procure a administracao do sistema.';
    }

    return 'Sua sessao expirou. Faca login novamente.';
  }

  if (status === 403) {
    return 'Voce nao tem permissao para esta acao.';
  }

  if (status === 429) {
    return (
      responseMessage ||
      'Muitas tentativas ou requisicoes. Aguarde alguns minutos e tente novamente.'
    );
  }

  if (status >= 500) {
    return 'Erro interno no servidor. Tente novamente em instantes.';
  }

  return (
    responseMessage ||
    error.message ||
    'Nao foi possivel concluir a operacao.'
  );
};

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    const requestUrl = `${config.url || ''}`;
    const publicRequest = isPublicRequest(requestUrl);

    config.metadata = {
      startedAt: Date.now(),
    };

    if (!publicRequest && token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    if (isDevelopment && response.config?.metadata?.startedAt) {
      const durationMs = Date.now() - response.config.metadata.startedAt;
      console.info(
        `[API] ${String(response.config?.method || 'GET').toUpperCase()} ${response.config?.url} (${durationMs}ms)`
      );
    }

    return response;
  },
  async (error) => {
    const requestUrl = `${error.config?.url || ''}`;
    const publicRequest = isPublicRequest(requestUrl);
    const publicPage = isPublicPage();

    if (isSafeRetryCandidate(error) && !error.config?.__retried) {
      error.config.__retried = true;
      return api.request(error.config);
    }

    if (
      error.response?.status === 401 &&
      !publicRequest &&
      !publicPage &&
      AUTH_401_CODES.has(String(error.response?.data?.code || ''))
    ) {
      const sessionMessage = resolveApiErrorMessage(error);
      setAuthNotice(sessionMessage);
      clearStoredSession();

      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    error.userMessage = resolveApiErrorMessage(error);

    if (isDevelopment) {
      console.error('API ERROR:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        message: error.message,
        userMessage: error.userMessage,
      });
    }

    return Promise.reject(error);
  }
);

export const getHealthStatus = () => api.get('/health');

export default api;
