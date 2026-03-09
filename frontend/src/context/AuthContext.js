import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setUser(data?.session?.user ?? null);
    setLoading(false);
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => listener.subscription.unsubscribe();
}, []);

  const login = useCallback(async (credentials) => {
  const { email, password } = credentials;
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
  console.error("Supabase login error:", error);
  throw new Error(error.message);
}
  const userData = data.user;
  setUser(userData);
  return userData;
}, []);
  
  const register = useCallback(async (data) => {
  const { email, password } = data;
  const { data: result, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
  console.error("Supabase signup error:", error);
  throw new Error(error.message);
}
  const userData = result.user;
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);
  return userData;
}, []);

 const logout = useCallback(async () => {
  await supabase.auth.signOut();
  setUser(null);
}, []);

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
