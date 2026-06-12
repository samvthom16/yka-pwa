"use client";

import { useState, useEffect, useCallback } from "react";
import type { WPUser } from "@/lib/api/auth";

const STORAGE_KEY = "yka_user";

export interface AuthState {
  user: WPUser | null;
  isLoading: boolean;
  login: (user: WPUser) => void;
  logout: () => void;
}

export function useAuth(): AuthState {
  const [user, setUser] = useState<WPUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw) as WPUser);
    } catch {
      /* corrupt — ignore */
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((u: WPUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return { user, isLoading, login, logout };
}
