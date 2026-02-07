import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getWebSocketUrl, WEBSOCKET_CONFIG } from '@/config/websocket';
import { authAPI, refreshToken } from '@/services/api';
import usePubSub from './usePubsub';

interface MissionSocketHook {
  isConnected: boolean;
  isConnecting: boolean;
  connect: (
    serverId: string,
    client_lat: number,
    client_lng: number,
    destination_lat: number,
    destination_lng: number,
  ) => void;
  disconnect: () => void;
}

const useClientMissionSocket = (): MissionSocketHook => {
  const { user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const { refreshToken: storedRefreshToken, accessToken } = useAuthStore();
  const [isConnecting, setisConnnecting] = useState(false);
  const [isDeclined, setIsDeclined] = useState(false);

  const { publish, EVENTS } = usePubSub();

  const connect = (
    serverId: string,
    client_lat: number,
    client_lng: number,
    destination_lat: number,
    destination_lng: number,
  ) => {
    if (
      user?.role == 'server' ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    try {
      if (!accessToken) {
        console.error(
          'No access token available for mission WebSocket connection',
        );
        return;
      }

      console.log(isConnected, "isConnected")

      // Create WebSocket URL with access token as query parameter
      const wsUrl = `${getWebSocketUrl(
        'mission',
      )}${serverId}/?token=${encodeURIComponent(accessToken)}`;
      const ws = new WebSocket(wsUrl);
      setisConnnecting(true);
      setIsDeclined(false);
      ws.onopen = () => {
        console.log('Mission WebSocket connected for client');
        isConnectedRef.current = true;
        setIsConnected(true);
        setisConnnecting(false)
        sendRequest(
          client_lat,
          client_lng,
          serverId,
          destination_lat,
          destination_lng,
        );
      };
      ws.onmessage = async event => {
        try {
          const data = JSON.parse(event.data);
          console.log('[MISSION-WS] Message received:', data);
          
          if (data.type == 'mission_result') {
            if (data.response == 'accepted') {
              publish(EVENTS.mission_accepted);
            } else if (['rejected', 'timeout'].includes(data.response)) {
              if(data.response=="rejected"){
                publish(EVENTS.mission_rejected);
              }
              disconnect();
            }
          } else if (data.type == 'driver_accepted') {
            // New: Detailed driver acceptance with driver info and location
            console.log('[MISSION-WS] Driver accepted:', data);
            publish(EVENTS.driver_accepted, {
              driver: data.driver,
              driverLocation: data.driver_location,
              missionData: data.mission_data,
              missionId: data.mission_id,
            });
            // Also trigger the old event for backward compatibility
            publish(EVENTS.mission_accepted);
          } else if (data.type == 'driver_location_update') {
            // New: Real-time driver location updates
            console.log('[MISSION-WS] Driver location update:', data);
            publish(EVENTS.driver_location_update, {
              lat: data.lat,
              lng: data.lng,
              timestamp: data.timestamp,
              heading: data.heading,
              missionId: data.mission_id,
            });
          } else if (data.type == 'location_update') {
            // Handle location updates (for backward compatibility)
            console.log('[MISSION-WS] Location update:', data);
            if (data.from && data.lat && data.lng) {
              publish(EVENTS.driver_location_update, {
                lat: data.lat,
                lng: data.lng,
                timestamp: data.ts,
                missionId: data.mission_id,
              });
            }
          }
        } catch (error) {
          console.log('[MISSION-WS] Error parsing message:', error, 'Raw:', event.data);
        }
      };

      ws.onclose = async event => {
        console.log('Mission WebSocket disconnected:', event.code);
        isConnectedRef.current = false;
        setIsConnected(false);
        if (event.code == 1006 && storedRefreshToken) {
          console.log('Mission WebSocket: Attempting to refresh token');

          await refreshToken();
          connect(
            serverId,
            client_lat,
            client_lng,
            destination_lat,
            destination_lng,
          );
        } else {
          setisConnnecting(false);
        }
      };

      ws.onerror = error => {
        console.error('Mission WebSocket error:', error);
        if (error) isConnectedRef.current = false;
        setIsConnected(false);
        setisConnnecting(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create mission WebSocket connection:', error);
    }
  };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    isConnectedRef.current = false;
    setIsConnected(false);
    setisConnnecting(false);
  }, [isConnected]);

  const sendRequest = useCallback(
    async (
      client_lat: number,
      client_lng: number,
      server_id: string,
      destination_lat: number,
      destination_lng: number,
    ) => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        user?.role != 'server'
      ) {
        try {
          // Validate coordinates before sending
          if (
            !client_lat || 
            !client_lng || 
            !destination_lat || 
            !destination_lng ||
            isNaN(client_lat) || 
            isNaN(client_lng) || 
            isNaN(destination_lat) || 
            isNaN(destination_lng)
          ) {
            console.error('[MISSION-WS] Invalid coordinates, cannot send request:', {
              client_lat,
              client_lng,
              destination_lat,
              destination_lng,
            });
            return;
          }

          // Get current access token
          const { accessToken } = useAuthStore.getState();

          const requestData = {
            type: WEBSOCKET_CONFIG.MESSAGE_TYPES.SNED_MISSION_REQUEST,
            client_lat: String(client_lat),
            client_lng: String(client_lng),
            server_id,
            destination_lat: String(destination_lat),
            destination_lng: String(destination_lng),
          };
          console.log('[MISSION-WS] Sending mission request:', requestData);
          wsRef.current.send(JSON.stringify(requestData));
          console.log('[MISSION-WS] Mission request sent successfully');
        } catch (error) {
          console.error('[MISSION-WS] Failed to send request via WebSocket:', error);
        }
      } else {
        console.warn('[MISSION-WS] Cannot send request - WebSocket not ready or user is server:', {
          readyState: wsRef.current?.readyState,
          userRole: user?.role,
        });
      }
    },
    [user?.role, user?.isAvailable],
  );

  useEffect(() => {
    let pingInterval: NodeJS.Timeout;
    if (wsRef.current) {
      pingInterval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'PING' }));
        }
      }, 30000); // every 30s
    }
    return () => clearInterval(pingInterval);
  }, [isConnected]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      //disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
  };
};

export default useClientMissionSocket;
