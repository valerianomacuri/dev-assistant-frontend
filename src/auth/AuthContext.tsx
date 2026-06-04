import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "../lib/api";

interface AuthContextValue {
  token: string | null;
  email: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Decodifica el email del payload del JWT (sin verificar la firma). */
function emailFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return typeof json.email === "string" ? json.email : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => api.getToken());

  const applyToken = useCallback((accessToken: string) => {
    api.setToken(accessToken);
    setTokenState(accessToken);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api.login(email, password);
      applyToken(accessToken);
    },
    [applyToken],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const { accessToken } = await api.register(email, password);
      applyToken(accessToken);
    },
    [applyToken],
  );

  const logout = useCallback(() => {
    api.clearToken();
    setTokenState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      email: emailFromToken(token),
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
