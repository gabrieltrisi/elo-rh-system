const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';
const SESSION_STORAGE_KEY = 'session';
const AUTH_NOTICE_STORAGE_KEY = 'auth_notice';

const listeners = new Set();

const safeConsoleError = (...args) => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.error(...args);
  }
};

const notifySessionListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      safeConsoleError('Erro ao atualizar listeners de sessao:', error);
    }
  });
};

const parseJson = (rawValue) => {
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue);
  } catch {
    return null;
  }
};

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      const decoded = window.atob(padded);
      return JSON.parse(decoded);
    }

    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
};

const isJwtExpired = (payload) => {
  if (!payload?.exp) return false;
  return Number(payload.exp) * 1000 <= Date.now();
};

const isCompatibleSessionToken = (payload) =>
  Boolean(
    payload?.userId &&
      payload?.companyId &&
      payload?.sessionId &&
      payload?.tokenId
  );

const buildEmptySession = () => ({
  token: '',
  user: null,
  session: null,
  isAuthenticated: false,
});

const clearSessionStorageSilently = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(USER_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const getStoredToken = () => {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  return parseJson(window.localStorage.getItem(USER_STORAGE_KEY));
};

export const getStoredSessionMeta = () => {
  if (typeof window === 'undefined') return null;
  return parseJson(window.localStorage.getItem(SESSION_STORAGE_KEY));
};

export const getStoredSession = () => {
  const token = getStoredToken();
  const user = getStoredUser();
  const session = getStoredSessionMeta();

  if (!token) {
    return buildEmptySession();
  }

  const payload = decodeJwtPayload(token);

  if (!payload || isJwtExpired(payload) || !isCompatibleSessionToken(payload)) {
    clearSessionStorageSilently();
    return buildEmptySession();
  }

  return {
    token,
    user,
    session,
    isAuthenticated: Boolean(token),
  };
};

export const setStoredSession = ({ token, user, session = null }) => {
  if (typeof window === 'undefined') {
    return getStoredSession();
  }

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }

  if (session) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  notifySessionListeners();
  return getStoredSession();
};

export const updateStoredUser = (user) => {
  if (typeof window === 'undefined') {
    return getStoredSession();
  }

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }

  notifySessionListeners();
  return getStoredSession();
};

export const setAuthNotice = (message) => {
  if (typeof window === 'undefined' || !message) return;
  window.sessionStorage.setItem(AUTH_NOTICE_STORAGE_KEY, String(message));
};

export const consumeAuthNotice = () => {
  if (typeof window === 'undefined') return '';

  const notice = window.sessionStorage.getItem(AUTH_NOTICE_STORAGE_KEY) || '';
  window.sessionStorage.removeItem(AUTH_NOTICE_STORAGE_KEY);
  return notice;
};

export const clearStoredSession = () => {
  if (typeof window === 'undefined') {
    return buildEmptySession();
  }

  clearSessionStorageSilently();
  notifySessionListeners();

  return buildEmptySession();
};

export const hasSessionPermission = (permission, user = getStoredUser()) => {
  if (!permission) return false;

  const role = String(user?.role || '').toUpperCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];

  return (
    role === 'SUPER_ADMIN' ||
    role === 'ADMIN' ||
    permissions.includes('*') ||
    permissions.includes(permission)
  );
};

export const subscribeAuthSession = (listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};
