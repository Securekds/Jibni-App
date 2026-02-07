import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import useGPSLocation from './useGpsLocation';
import { getWebSocketUrl, WEBSOCKET_CONFIG } from '@/config/websocket';
import { authAPI, refreshToken } from '@/services/api';

interface ServerSocketHook {
  isConnected: boolean;
  sendLocation: (lat: number, lng: number) => void;
  connect: () => void;
  disconnect: () => void;
}

const useServerSocket = (): ServerSocketHook => {
  const { user } = useAuthStore();
  const { getUserPosition } = useGPSLocation();
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { refreshToken: storedRefreshToken, accessToken } = useAuthStore();

  const connect = () => {
    console.log(
      user?.role !== 'server',
      user?.isAvailable === false,
      wsRef.current?.readyState === WebSocket.OPEN,
      'ezeezzeezzeezezeezzeezzeezezeezzeezzeez',
    );
    if (
      user?.role !== 'server' ||
      !user?.isAvailable ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      if (!accessToken) {
        console.error('No access token available for WebSocket connection');
        return;
      }

      // Create WebSocket URL with access token as query parameter
      const wsUrl = `${getWebSocketUrl()}?token=${encodeURIComponent(
        accessToken,
      )}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[SERVER_WS] WebSocket connected for server', {
          userId: user?.id,
          phone: user?.phone_number,
          isAvailable: user?.isAvailable,
        });
        isConnectedRef.current = true;
        setIsConnected(true);

        // Clear any existing reconnect interval
        if (reconnectIntervalRef.current) {
          clearInterval(reconnectIntervalRef.current);
          reconnectIntervalRef.current = null;
        }
      };

      ws.onmessage = async event => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
        } catch (error) {
          console.log('WebSocket raw message:', event.data);
        }
      };

      ws.onclose = async event => {
        isConnectedRef.current = false;
        setIsConnected(false);
        if (event.code == 1006 && storedRefreshToken) {
          await refreshToken();
        }
        // Attempt to reconnect after configured interval
        if (user?.role === 'server') {
          reconnectIntervalRef.current = setTimeout(() => {
            connect();
          }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
        }
      };

      ws.onerror = error => {
        console.error('WebSocket error:', error);
        if (error) isConnectedRef.current = false;
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
  };

  const sendLocation = async (lat: number, lng: number) => {
    const readyState = wsRef.current?.readyState;
    const isOpen = readyState === WebSocket.OPEN;
    
    console.log('[SERVER_WS] sendLocation called', {
      readyState,
      isOpen,
      role: user?.role,
      isAvailable: user?.isAvailable,
      lat,
      lng,
    });
    
    if (
      isOpen &&
      user?.role === 'server' &&
      user?.isAvailable
    ) {
      try {
        // Get current access token
        const { accessToken } = useAuthStore.getState();

        const locationData = {
          type: WEBSOCKET_CONFIG.MESSAGE_TYPES.LOCATION_UPDATE,
          lat: String(lat),
          lng: String(lng),
          //token: accessToken, // Include access token for authentication
        };
        wsRef.current.send(JSON.stringify(locationData));
        console.log('[SERVER_WS] Location sent successfully:', locationData);
      } catch (error) {
        console.error('[SERVER_WS] Failed to send location via WebSocket:', error);
      }
    } else {
      console.warn('[SERVER_WS] Cannot send location:', {
        reason: !isOpen ? 'WebSocket not open' :
                user?.role !== 'server' ? 'not a server' :
                !user?.isAvailable ? 'not available' : 'unknown',
      });
    }
  };

  // Auto-connect when user role becomes server
  useEffect(() => {
    if (user?.role === 'server') {
      connect();
    } else {
      disconnect();
    }

    return () => {
      //disconnect();
    };
  }, [user?.role, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      //disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: isConnected,
    sendLocation,
    connect,
    disconnect,
  };
};

export default useServerSocket;
