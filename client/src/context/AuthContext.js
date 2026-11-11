import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Decode token payload without external library
  const decodeToken = (tkn) => {
    try {
      const payload = JSON.parse(atob(tkn.split('.')[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  };

  // Fetch full authenticated user profile
  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/api/users/me');
      if (res.data?.user) {
        setProfile(res.data.user);
      } else if (res.data?._id) {
        setProfile(res.data);
      }
    } catch {
      // Profile fetch failed (e.g. invalid session)
    }
  }, []);

  useEffect(() => {
    if (token) {
      const payload = decodeToken(token);
      if (payload) {
        setUser({ userId: payload.userId });
        fetchProfile();
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setProfile(null);
      }
    } else {
      setUser(null);
      setProfile(null);
    }
    setLoading(false);
  }, [token, fetchProfile]);

  const login = useCallback(
    (tkn) => {
      localStorage.setItem('token', tkn);
      setToken(tkn);
      const payload = decodeToken(tkn);
      setUser({ userId: payload?.userId });
      fetchProfile();
    },
    [fetchProfile]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        loading,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
