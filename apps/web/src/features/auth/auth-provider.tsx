'use client';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as api from '@/lib/api-client';

type Status = 'initializing' | 'authenticated' | 'anonymous' | 'unavailable' | 'logout-unknown';
interface AuthContextValue {
  status: Status;
  user: api.User | null;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  revalidate(): Promise<void>;
}
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('initializing');
  const [user, setUser] = useState<api.User | null>(null);
  const operationVersion = useRef(0);
  const revalidate = useCallback(async () => {
    const operation = ++operationVersion.current;
    setStatus((current) => (current === 'logout-unknown' ? current : 'initializing'));
    try {
      const currentUser = await api.initializeSession();
      if (operation !== operationVersion.current) return;
      setUser(currentUser);
      setStatus('authenticated');
    } catch (caught) {
      if (operation !== operationVersion.current) return;
      if (caught instanceof api.ApiError && caught.status === 401) {
        api.clearSession();
        setUser(null);
        setStatus((current) => (current === 'logout-unknown' ? current : 'anonymous'));
        return;
      }
      setStatus((current) => (current === 'logout-unknown' ? current : 'unavailable'));
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void revalidate();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [revalidate]);
  useEffect(() => {
    const update = () => {
      if (status !== 'logout-unknown' && document.visibilityState === 'visible') void revalidate();
    };
    window.addEventListener('pageshow', update);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.removeEventListener('pageshow', update);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, [revalidate, status]);
  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signIn(email, password) {
        api.allowAutomaticRefresh();
        const currentUser = await api.login(email, password);
        operationVersion.current += 1;
        setUser(currentUser);
        setStatus('authenticated');
      },
      async signOut() {
        const operation = ++operationVersion.current;
        setUser(null);
        const outcome = await api.logout();
        if (operation === operationVersion.current)
          setStatus(outcome === 'confirmed' ? 'anonymous' : 'logout-unknown');
      },
      revalidate,
    }),
    [status, user, revalidate],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be inside AuthProvider.');
  return value;
}
