import { createContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../api/client.js';

const STORAGE_KEY = 'tuition-manager-session';

export const AuthContext = createContext(null);

function readStoredSession() {
  const rawSession = localStorage.getItem(STORAGE_KEY);

  if (!rawSession) {
    return {
      token: '',
      user: null
    };
  }

  try {
    return JSON.parse(rawSession);
  } catch (_error) {
    return {
      token: '',
      user: null
    };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session.token) {
      setIsLoading(false);
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  useEffect(() => {
    let ignore = false;

    async function bootstrap() {
      if (!session.token) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest('/auth/me', {
          token: session.token
        });

        if (!ignore) {
          setSession((current) => ({
            ...current,
            user: response.user
          }));
        }
      } catch (_error) {
        if (!ignore) {
          setSession({
            token: '',
            user: null
          });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [session.token]);

  async function login(credentials) {
    const response = await apiRequest('/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        password: credentials.password
      }
    });

    setSession(response);
  }

  async function register(payload) {
    const response = await apiRequest('/auth/register', {
      method: 'POST',
      body: payload
    });

    setSession(response);
  }

  function logout() {
    setSession({
      token: '',
      user: null
    });
  }

  const value = useMemo(
    () => ({
      token: session.token,
      user: session.user,
      isAuthenticated: Boolean(session.token && session.user),
      isLoading,
      login,
      register,
      logout
    }),
    [isLoading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

