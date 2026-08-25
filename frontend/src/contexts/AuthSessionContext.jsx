import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearStoredSession,
  getStoredSession,
  hasSessionPermission,
  setStoredSession,
  subscribeAuthSession,
  updateStoredUser,
} from '../utils/authSession';

const AuthSessionContext = createContext(null);

export function AuthSessionProvider({ children }) {
  const [session, setSession] = useState(() => getStoredSession());

  useEffect(() => subscribeAuthSession(() => setSession(getStoredSession())), []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === 'token' ||
        event.key === 'user' ||
        event.key === 'session'
      ) {
        setSession(getStoredSession());
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const contextValue = useMemo(
    () => ({
      ...session,
      login(nextSession) {
        return setStoredSession(nextSession);
      },
      logout() {
        return clearStoredSession();
      },
      refreshUser(nextUser) {
        return updateStoredUser(nextUser);
      },
      hasPermission(permission) {
        return hasSessionPermission(permission, session.user);
      },
    }),
    [session]
  );

  return (
    <AuthSessionContext.Provider value={contextValue}>
      {children}
    </AuthSessionContext.Provider>
  );
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error(
      'useAuthSession deve ser usado dentro de AuthSessionProvider'
    );
  }

  return context;
}
