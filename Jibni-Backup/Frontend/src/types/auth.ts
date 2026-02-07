export type CurrentLanguage = 'ar' | 'en' | 'fr';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  currentLanguage: CurrentLanguage | null;
  user: {
    role: 'server' | 'client';
    requestedToBeServer: boolean;
    isAvailable?: boolean;
  } | null;
}

export interface SendOtpRequest {
  phone_number: string;
}

export interface VerifyOtpRequest {
  phone_number: string;
  code: string;
}

export interface RefreshTokenResponse {
  access: string;
  refresh?: string;
}

export interface DecodedToken {
  sub: string; // user id
  email: string;
  exp: number; // expiration timestamp
  iat: number; // issued at timestamp
  [key: string]: any; // for any additional claims
}
