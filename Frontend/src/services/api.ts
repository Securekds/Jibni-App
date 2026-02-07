import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/authStore';
import { RefreshTokenResponse } from '../types/auth';

// API Configuration
const API_BASE_URL = 'http://172.20.10.3:8000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Refresh token promise to handle concurrency
let refreshTokenPromise: Promise<string> | null = null;
let isRefreshingToken: boolean = false;

// Function to refresh token
export const refreshToken = async (): Promise<string> => {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  if (isRefreshingToken) {
    throw new Error('we are refreshing token');
  }

  isRefreshingToken = true;

  try {
    const response = await axios.post<RefreshTokenResponse>(
      `${API_BASE_URL}/api/v1/passport/token/refresh/`,
      { refresh: refreshToken },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const { access: accessToken, refresh: newRefreshToken } = response.data;

    // Update tokens in store
    setTokens({
      accessToken,
      refreshToken: newRefreshToken || refreshToken, // Use new refresh token if provided
    });

    return accessToken;
  } catch (error: any) {
    const status = error?.response?.status;

    if (status === 401) {
      // Only logout if server says refresh token is invalid/expired
      logout();
    }
    // For network errors (no status) or other server errors (500, 503, etc.)
    // just rethrow, so the request can retry later
    throw error;
  } finally {
    isRefreshingToken = false;
  }
};

// Request interceptor
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const { accessToken, isTokenExpired } = useAuthStore.getState();
    // Skip token logic for public endpoints
    const isPublicEndpoint =
      config.url?.includes('/api/v1/passport/send-otp') ||
      config.url?.includes('/api/v1/passport/verify-otp');

    if (isPublicEndpoint) {
      return config;
    }

    // Check if token is expired
    if (accessToken && isTokenExpired()) {
      // If there's already a refresh in progress, wait for it
      if (refreshTokenPromise) {
        try {
          const newToken = await refreshTokenPromise;
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${newToken}`;
          return config;
        } catch (error) {
          // Refresh failed, continue without token (will be handled by response interceptor)
          return config;
        }
      }

      // Start new refresh
      refreshTokenPromise = refreshToken();
      try {
        const newToken = await refreshTokenPromise;
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        refreshTokenPromise = null;
        return config;
      } catch (error) {
        refreshTokenPromise = null;
        return config;
      }
    }

    // Add token to request if available
    if (accessToken) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & {
      _retry?: boolean;
    };

    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const { isAuthenticated, logout } = useAuthStore.getState();

      if (!isAuthenticated) {
        return Promise.reject(error);
      }

      // Try to refresh token
      if (refreshTokenPromise) {
        try {
          await refreshTokenPromise;
          // Retry the original request
          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      } else {
        try {
          refreshTokenPromise = refreshToken();
          await refreshTokenPromise;
          refreshTokenPromise = null;
          // Retry the original request
          return api(originalRequest);
        } catch (refreshError) {
          refreshTokenPromise = null;
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  },
);

// API methods
export const authAPI = {
  sendOtp: async (phone_number: string) => {
    try {
      const response = await api.post('/api/v1/passport/send-otp/', {
        phone_number,
      });
      return response.data;
    } catch (error: any) {
      // Return a structured error object
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },

  verifyOtp: async (phone_number: string, code: string) => {
    try {
      const response = await api.post('/api/v1/passport/verify-otp/', {
        phone_number,
        code,
      });
      return response.data;
    } catch (error: any) {
      console.error('VerifyOtp error:', error);
      // Return a structured error object
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },

  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      name,
    });
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refreshToken: async () => {
    const { refreshToken, setTokens } = useAuthStore.getState();
    const response = await api.post('/api/v1/passport/token/refresh/', {
      refresh: refreshToken,
    });
    const { access: accessToken, refresh: newRefreshToken } = response.data;

    // Update tokens in store
    setTokens({
      accessToken,
      refreshToken: newRefreshToken || refreshToken, // Use new refresh token if provided
    });
    return response.data;
  },
};

export const clientApi = {
  getNearServers: async (
    lat: string,
    lng: string,
    dist_lat: string,
    dist_lng: string,
    duration: number,
    distance: number,
  ) => {
    console.log('[API] getNearServers called with params:', {
      lat,
      lng,
      dist_lat,
      dist_lng,
      duration,
      distance,
    });
    console.log('[API] Making GET request to /api/v1/wire/servers/nearby/');
    try {
      const response = await api.get('/api/v1/wire/servers/nearby/', {
        params: {
          lat,
          lng,
          dist_lat,
          dist_lng,
          duration,
          distance,
        },
      });
      console.log('[API] getNearServers response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[API] getNearServers error:', error);
      console.error('[API] Error details:', {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`,
        isNetworkError: !error.response,
      });
      
      // Handle network errors specifically
      if (!error.response) {
        console.error('[API] Network error - Backend may be unreachable');
        console.error('[API] Check if backend is running on:', API_BASE_URL);
        return {
          success: false,
          status: 'NETWORK_ERROR',
          message: `Cannot connect to server at ${API_BASE_URL}. Please check if the backend is running.`,
          error: error.message,
        };
      }
      
      // Handle 404 "No nearby servers found" - this is a valid response, not an error
      if (error.response?.status === 404 && error.response?.data?.error) {
        const errorMessage = error.response.data.error;
        if (errorMessage.includes('No nearby servers found')) {
          console.log('[API] No nearby servers found (404) - this is expected, not an error');
          // Extract phone number if present
          const phoneMatch = errorMessage.match(/(\d+)/);
          const phone = phoneMatch ? phoneMatch[1] : null;
          
          return {
            success: true, // Not an error, just no results
            status: 404,
            message: errorMessage,
            error: null,
            phone: phone,
          };
        }
      }
      
      // Return a structured error object for actual errors
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.error || error.response?.data?.message || error.message,
        error,
      };
    }
  },
};

export const driverApi = {
  getAvailability: async () => {
    try {
      const response = await api.get('/api/v1/wire/availability/');
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },
  becomeServer: async (
    first_name: string,
    last_name: string,
    city: string,
    driving_license: any,
    gray_card: any,
  ) => {
    try {
      const formData = new FormData();
      formData.append('first_name', first_name);
      formData.append('last_name', last_name);
      formData.append('city', city);
      formData.append('driving_license', {
        uri: driving_license.path,
        type: driving_license.mime,
        name: driving_license.filename,
      });
      formData.append('gray_card', {
        uri: gray_card.path,
        type: gray_card.mime,
        name: gray_card.filename,
      });
      const response = await api.post(
        '/api/v1/passport/profile/become-server/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Accept: '*/*',
          },
        },
      );
      return response.data;
    } catch (error: any) {
      console.error('become server error:', error);
      // Return a structured error object
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },
  checkStatus: async () => {
    try {
      console.log('[API] checkStatus: Making request to /api/v1/passport/server-upgrade/status/');
      const response = await api.get('/api/v1/passport/server-upgrade/status/');
      console.log('[API] checkStatus: Response received:', response.data);
      return response.data;
    } catch (error: any) {
      // Backend returns 404 with "not_submitted" status when no upgrade request exists
      // This is a valid response, not an error
      if (error?.response?.status === 404 && error?.response?.data?.upgrade_status === 'not_submitted') {
        console.log('[API] checkStatus: No upgrade request found (not_submitted) - this is normal');
        return {
          status: 'error',
          upgrade_status: 'not_submitted',
        };
      }
      
      console.error('[API] checkStatus error details:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
      });
      // Return a structured error object for actual errors
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },

  toogleAvailability: async () => {
    try {
      const response = await api.post('/api/v1/wire/toggle-availability/');
      return response.data;
    } catch (error: any) {
      // Return a structured error object
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },
  
  getAvailability: async () => {
    try {
      const response = await api.get('/api/v1/wire/availability/');
      return response.data;
    } catch (error: any) {
      // Return a structured error object
      return {
        success: false,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        error,
      };
    }
  },
};

// Generic API methods for protected endpoints
export const protectedAPI = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.get<T>(url, config);
    return response.data;
  },

  post: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.post<T>(url, data, config);
    return response.data;
  },

  put: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.put<T>(url, data, config);
    return response.data;
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await api.delete<T>(url, config);
    return response.data;
  },

  patch: async <T>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> => {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  },
};

export default api;
