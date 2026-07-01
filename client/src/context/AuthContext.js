import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Decode token payload without a library
  const decodeToken = (tkn) => {
    try {
      const payload = JSON.parse(atob(tkn.split('.')[1]));
      // Check expiry
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch { return null; }
  };

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token);
      if (payload) {
        setUser({ userId: payload.userId });
      } else {
        // expired / invalid
        localStorage.removeItem('token');
        setToken(null);
      }
    }
    setLoading(false);
  }, [token]);

  const login = useCallback((tkn) => {
    localStorage.setItem('token', tkn);
    setToken(tkn);
    const payload = decodeToken(tkn);
    setUser({ userId: payload?.userId });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
