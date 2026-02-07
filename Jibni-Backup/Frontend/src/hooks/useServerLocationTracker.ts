import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import useGPSLocation from './useGpsLocation';
import useServerSocket from './useServerSocket';

interface LocationTrackerHook {
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  currentLocation: { lat: number; lng: number } | null;
}

const useServerLocationTracker = (
  updateInterval: number = 10000,
): LocationTrackerHook => {
  const { user } = useAuthStore();
  const { getUserPosition } = useGPSLocation();
  const { isConnected, sendLocation } = useServerSocket();

  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isTrackingRef = useRef(false);
  const currentLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const updateLocation = async () => {
    if (user?.role !== 'server' || !isConnected) {
      return;
    }

    try {
      const position = await getUserPosition();
      const { latitude, longitude } = position.coords;

      currentLocationRef.current = { lat: latitude, lng: longitude };

      // Send location to WebSocket server
      sendLocation(latitude, longitude);

      console.log('[LOCATION] Location updated and sent:', {
        lat: latitude,
        lng: longitude,
      });
    } catch (error: any) {
      // Handle different error types gracefully
      const errorCode = error?.code;
      const errorMessage = error?.message || 'Unknown location error';
      
      if (errorCode === 3) {
        // TIMEOUT - Location request timed out
        console.warn('[LOCATION] Location request timed out. This is normal if GPS signal is weak or permissions are not granted.');
        // Don't spam errors for timeout - it's expected in some situations
      } else if (errorCode === 1) {
        // PERMISSION_DENIED
        console.error('[LOCATION] Location permission denied. Please grant location permissions in device settings.');
      } else if (errorCode === 2) {
        // POSITION_UNAVAILABLE
        console.warn('[LOCATION] Position unavailable. GPS signal may be weak.');
      } else {
        console.error('[LOCATION] Failed to get location:', {
          code: errorCode,
          message: errorMessage,
        });
      }
      
      // Don't throw - just log and continue. The interval will retry.
    }
  };

  const startTracking = () => {
    console.log('[LOCATION_TRACKER] startTracking called', {
      role: user?.role,
      isTracking: isTrackingRef.current,
      isAvailable: user?.isAvailable,
      isConnected,
    });
    
    if (
      user?.role !== 'server' ||
      isTrackingRef.current ||
      !user?.isAvailable
    ) {
      console.log('[LOCATION_TRACKER] Cannot start tracking:', {
        reason: user?.role !== 'server' ? 'not a server' : 
                isTrackingRef.current ? 'already tracking' : 
                !user?.isAvailable ? 'not available' : 'unknown',
      });
      return;
    }
    
    console.log('[LOCATION_TRACKER] Starting location tracking...');
    updateLocation();

    trackingIntervalRef.current = setInterval(updateLocation, updateInterval);
    isTrackingRef.current = true;

    console.log('[LOCATION_TRACKER] Location tracking started for server user');
  };

  const stopTracking = () => {
    if (trackingIntervalRef.current) {
      clearInterval(trackingIntervalRef.current);
      trackingIntervalRef.current = null;
    }

    isTrackingRef.current = false;
    console.log('Location tracking stopped');
  };

  useEffect(() => {
    console.log('[LOCATION_TRACKER] useEffect triggered', {
      role: user?.role,
      isConnected,
      isTracking: isTrackingRef.current,
      isAvailable: user?.isAvailable,
    });
    
    if (user?.role === 'server' && isConnected && user?.isAvailable && !isTrackingRef.current) {
      console.log('[LOCATION_TRACKER] Conditions met, starting tracking...');
      startTracking();
    } else if (user?.role !== 'server' || !isConnected || !user?.isAvailable) {
      console.log('[LOCATION_TRACKER] Conditions not met, stopping tracking...');
      stopTracking();
    }
  }, [user?.role, isConnected, user?.isAvailable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    isTracking: isTrackingRef.current,
    startTracking,
    stopTracking,
    currentLocation: currentLocationRef.current,
  };
};

export default useServerLocationTracker;
