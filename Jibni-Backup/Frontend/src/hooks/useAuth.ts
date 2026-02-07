import { useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';
import { SendOtpRequest, VerifyOtpRequest } from '../types/auth';

export const useAuth = () => {
  const {
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,
    login: loginStore,
    logout: logoutStore,
    setLoading,
    isTokenExpired,
    getDecodedToken,
  } = useAuthStore();

  const sendOtp = useCallback(
    async (credentials: SendOtpRequest) => {
      try {
        setLoading(true);
        const response = await authAPI.sendOtp(credentials.phone_number);
        return response;
      } catch (error) {
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const verifyOtp = useCallback(
    async (credentials: VerifyOtpRequest) => {
      try {
        setLoading(true);
        const response = await authAPI.verifyOtp(
          credentials.phone_number,
          credentials.code,
        );
        if (response.status == 'success') {
          loginStore({
            accessToken: response.data.access,
            refreshToken: response.data.refresh,
          });
          
          // Update user role and availability from backend response if provided
          if (response.data.role) {
            const { setBecameServer, toogleAvailability } = useAuthStore.getState();
            if (response.data.role === 'server') {
              setBecameServer();
              // Restore availability status from backend if provided
              if (response.data.open_to_work !== undefined) {
                toogleAvailability(response.data.open_to_work);
              }
            }
          }
        }
        return response;
      } catch (error) {
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [setLoading],
  );

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      try {
        setLoading(true);
        const response = await authAPI.register(email, password, name);

        const { user, accessToken, refreshToken } = response;

        // Store user and tokens
        loginStore({ accessToken, refreshToken });

        return { success: true, user };
      } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error };
      } finally {
        setLoading(false);
      }
    },
    [loginStore, setLoading],
  );

  const logout = useCallback(async () => {
    try {
      // Call logout API if user is authenticated
      if (isAuthenticated && accessToken) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Always clear local state
      logoutStore();
    }
  }, [isAuthenticated, accessToken, logoutStore]);

  const checkAuthStatus = useCallback(() => {
    if (!accessToken) {
      return { isAuthenticated: false };
    }

    if (isTokenExpired()) {
      logoutStore();
      return { isAuthenticated: false };
    }

    return { isAuthenticated: true };
  }, [accessToken, isTokenExpired, logoutStore]);

  return {
    // State
    accessToken,
    refreshToken,
    isAuthenticated,
    isLoading,

    // Actions
    register,
    logout,
    checkAuthStatus,
    sendOtp,
    verifyOtp,

    // Utilities
    isTokenExpired,
    getDecodedToken,
  };
};
