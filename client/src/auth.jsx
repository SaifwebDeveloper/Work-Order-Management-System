import { createContext, useContext, useState, useCallback } from "react";
import api from "./api";

const AuthContext = createContext(null);

export const ROLE_HOME = {
  nrtc_admin: "/nrtc",
  p3c: "/p3c",
  production: "/production",
  finance: "/finance",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nrtc_user") || "null");
    } catch {
      return null;
    }
  });

  const persist = (token, u) => {
    localStorage.setItem("nrtc_token", token);
    localStorage.setItem("nrtc_user", JSON.stringify(u));
    setUser(u);
  };

  const login = useCallback(async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    persist(data.token, data.user);
    return data.user;
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    persist(data.token, data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nrtc_token");
    localStorage.removeItem("nrtc_user");
    setUser(null);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    localStorage.setItem("nrtc_user", JSON.stringify(data.user));
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
