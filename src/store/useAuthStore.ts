import { create } from 'zustand';
import type { User } from '../../shared/types.js';
import { authApi } from '../lib/api.js';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : '认证失败',
      });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.login({ email, password });
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '登录失败',
      });
      throw error;
    }
  },

  register: async (username: string, email: string, password: string, phone?: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authApi.register({ username, email, password, phone });
      if (response.success && response.data) {
        set({
          user: response.data,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '注册失败',
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        error: null,
      });
    }
  },

  setUser: (user: User | null) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));
