import { jwtDecode } from 'jwt-decode';
import { DecodedToken } from '../types/auth';

/**
 * Decode JWT token and return payload
 */
export const decodeToken = (token: string): DecodedToken | null => {
  try {
    return jwtDecode<DecodedToken>(token);
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

/**
 * Check if token will expire within the next buffer time (in seconds)
 */
export const isTokenExpiringSoon = (token: string, bufferSeconds: number = 300): boolean => {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return true;
    
    const currentTime = Date.now() / 1000;
    return decoded.exp < (currentTime + bufferSeconds);
  } catch (error) {
    console.error('Error checking if token expires soon:', error);
    return true;
  }
};

/**
 * Get token expiration time in milliseconds
 */
export const getTokenExpirationTime = (token: string): number | null => {
  try {
    const decoded = decodeToken(token);
    if (!decoded) return null;
    
    return decoded.exp * 1000; // Convert to milliseconds
  } catch (error) {
    console.error('Error getting token expiration time:', error);
    return null;
  }
};

/**
 * Get time until token expires in milliseconds
 */
export const getTimeUntilExpiration = (token: string): number | null => {
  try {
    const expirationTime = getTokenExpirationTime(token);
    if (expirationTime === null) return null;
    
    return expirationTime - Date.now();
  } catch (error) {
    console.error('Error getting time until expiration:', error);
    return null;
  }
};

/**
 * Validate token format (basic validation)
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // Basic JWT format validation (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
}; 