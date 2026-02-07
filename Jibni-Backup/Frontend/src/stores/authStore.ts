import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import {
  AuthState,
  AuthTokens,
  DecodedToken,
  CurrentLanguage,
} from '../types/auth';
import { navigateAndSimpleReset } from '@/utils/navigatorUtils';

interface AuthStore extends AuthState {
  // Actions
  setTokens: (tokens: AuthTokens) => void;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setCurrentLanguage: (language: CurrentLanguage) => void;
  setRequestedToBeServer: () => void;
  setBecameServer: () => void;
  toogleAvailability: (available: boolean) => void;
  setUser: (userData: any) => void;

  // Token utilities
  isTokenExpired: () => boolean;
  getDecodedToken: () => DecodedToken | null;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      currentLanguage: null,
      // Actions
      setTokens: (tokens: AuthTokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),
      login: (tokens: AuthTokens) =>
        set({
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          isLoading: false,
        }),

      logout: () => {
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          user: null,
        });
        navigateAndSimpleReset('Startup');
      },

      setRequestedToBeServer: () =>
        set({
          user: {
            role: 'client',
            requestedToBeServer: true,
          },
        }),
      setBecameServer: () =>
        set({
          user: {
            // Default to true when becoming a server if not explicitly set
            isAvailable: get().user?.isAvailable ?? true,
            role: 'server',
            requestedToBeServer: false,
          },
        }),
      setUser: (userData: any) =>
        set({
          user: {
            ...get().user,
            ...userData,
          },
        }),
      toogleAvailability: (available: boolean) =>
        set({
          user: {
            role: 'server',
            requestedToBeServer: false,
            isAvailable: available,
          },
        }),
      setLoading: (loading: boolean) =>
        set({
          isLoading: loading,
        }),
      setCurrentLanguage: (language: CurrentLanguage) =>
        set({
          currentLanguage: language,
        }),

      // Token utilities
      isTokenExpired: () => {
        const { accessToken } = get();
        if (!accessToken) return true;

        try {
          const decoded = jwtDecode<DecodedToken>(accessToken);
          const currentTime = Date.now() / 1000;
          return decoded.exp < currentTime;
        } catch (error) {
          console.error('Error decoding token:', error);
          return true;
        }
      },

      getDecodedToken: () => {
        const { accessToken } = get();
        if (!accessToken) return null;

        try {
          return jwtDecode<DecodedToken>(accessToken);
        } catch (error) {
          console.error('Error decoding token:', error);
          return null;
        }
      },

      clearTokens: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: state => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        currentLanguage: state.currentLanguage,
        user: state.user,
      }),
    },
  ),
);
