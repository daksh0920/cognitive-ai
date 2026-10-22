
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  login as loginRequest,
  signup as signupRequest,
  getCurrentUser,
} from "../features/auth/api/authApi";

import {
  getToken,
  saveToken,
  clearToken,
} from "../lib/authStorage";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore the session after a page refresh.
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        if (!getToken()) return;

        const currentUser = await getCurrentUser();

        if (isMounted) {
          setUser(currentUser);
        }
      } catch {
        clearToken();

        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // Sign in an existing user.
  const signIn = useCallback(async (credentials) => {
    const data = await loginRequest(credentials);

    saveToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  // Create an account and sign in immediately.
  const signUp = useCallback(async (details) => {
    const data = await signupRequest(details);

    saveToken(data.token);
    setUser(data.user);

    return data.user;
  }, []);

  // End the local session.
  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signUp,
      signOut,
    }),
    [user, isLoading, signIn, signUp, signOut]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider."
    );
  }

  return context;
}
