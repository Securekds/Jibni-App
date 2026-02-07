import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getWebSocketUrl, WEBSOCKET_CONFIG } from '@/config/websocket';
import { authAPI, refreshToken } from '@/services/api';
import usePubSub from './usePubsub';
import { Alert } from 'react-native';

interface MissionSocketHook {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  request: any;
  acceptMission: (mission_id: string) => void;
  rejectMission: (mission_id: string) => void;
  isAccepting: boolean;
  isRejecting: boolean;
  isAccepted: boolean;
}

const useMissionSocket = (): MissionSocketHook => {
  const { user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const isConnectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [request, setRequest] = useState<any>();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const { refreshToken: storedRefreshToken, accessToken } = useAuthStore();
  const { publish, EVENTS } = usePubSub();

  const connect = () => {
    if (
      user?.role !== 'server' ||
      wsRef.current?.readyState === WebSocket.OPEN
    ) {
      console.log('[MISSION-WS] Not connecting:', {
        role: user?.role,
        isAvailable: user?.isAvailable,
        alreadyOpen: wsRef.current?.readyState === WebSocket.OPEN,
      });
      return;
    }
    
    // If isAvailable is not set, default to true for servers
    const isAvailable = user?.isAvailable != null ? user.isAvailable : true;
    if (!isAvailable) {
      console.log('[MISSION-WS] Not connecting: User is not available');
      return;
    }

    try {
      if (!accessToken) {
        console.error(
          '[MISSION-WS] No access token available for mission WebSocket connection',
        );
        return;
      }

      // Create WebSocket URL with access token as query parameter
      const wsUrl = `${getWebSocketUrl('mission')}?token=${encodeURIComponent(
        accessToken,
      )}`;
      console.log('[MISSION-WS] Attempting to connect to:', wsUrl.replace(accessToken, 'TOKEN_HIDDEN'));
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[MISSION-WS] ✅ Mission WebSocket connected for server');
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
          if (data.type == 'new_mission') {
            const createdAt = new Date();
            setRequest({ ...data, createdAt });
          } else if (data.status == 'mission_accepted') {
            publish(EVENTS.mission_accepted);
          } else if (data.detail == 'Mission expired or not found') {
            setRequest(null);
            publish(EVENTS.mission_expired);
            Alert.alert('home.requestExpired');
          } else if (data.status == 'mission_rejected') {
            setRequest(null);
            publish(EVENTS.mission_expired);
          }
        } catch (error) {
          console.log('Mission WebSocket raw message:', event.data);
        }
      };

      ws.onclose = async event => {
        console.log('[MISSION-WS] ❌ Mission WebSocket disconnected:', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean,
        });
        isConnectedRef.current = false;
        setIsConnected(false);
        
        // Error code meanings:
        // 1006 = Abnormal closure (connection lost without close frame)
        // 4401 = Unauthorized (from backend)
        // 4405 = Server ID required (from backend)
        // 4406 = Server offline (from backend)
        
        if (event.code === 4401) {
          console.log('[MISSION-WS] Authentication failed, attempting to refresh token...');
          if (storedRefreshToken) {
            try {
              await refreshToken();
              // Retry connection after token refresh
              setTimeout(() => {
                if (user?.role === 'server' && user?.isAvailable) {
                  connect();
                }
              }, 2000);
            } catch (error) {
              console.error('[MISSION-WS] Failed to refresh token:', error);
            }
          }
        } else if (event.code === 4405 || event.code === 4406) {
          console.error('[MISSION-WS] Backend rejected connection:', {
            code: event.code,
            reason: event.reason,
            hint: event.code === 4405 ? 'User might not be a server yet' : 'Server might be offline',
          });
          // Don't retry immediately for these errors
        } else if (event.code === 1006) {
          console.log('[MISSION-WS] Connection lost (1006), will retry...');
          // Attempt to reconnect after configured interval
          if (user?.role === 'server' && user?.isAvailable) {
            reconnectIntervalRef.current = setTimeout(() => {
              connect();
            }, 5000); // 5 seconds reconnect interval
          }
        }
      };

      ws.onerror = error => {
        console.error('[MISSION-WS] ❌ WebSocket error:', {
          error,
          readyState: ws.readyState,
          url: wsUrl.replace(accessToken, 'TOKEN_HIDDEN'),
        });
        // Note: onerror doesn't provide much info, check onclose for details
        isConnectedRef.current = false;
        setIsConnected(false);
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

    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
      reconnectIntervalRef.current = null;
    }

    isConnectedRef.current = false;
    setIsConnected(false);
  }, []);

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

  const acceptMission = useCallback(
    async (mission_id: string) => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        user?.role === 'server' &&
        !isAccepting &&
        !isRejecting
      ) {
        try {
          setIsAccepting(true);
          // Get current access token
          const { accessToken } = useAuthStore.getState();

          const locationData = {
            type: WEBSOCKET_CONFIG.MESSAGE_TYPES.MISSION_RESPONSE,
            mission_id: mission_id,
            response: true,
            //token: accessToken, // Include access token for authentication
          };
          console.log('Try accept mission:', locationData);
          wsRef.current.send(JSON.stringify(locationData));
          console.log('mission accepted via WebSocket:', locationData);
        } catch (error) {
          console.error('Failed to accept mission via WebSocket:', error);
        } finally {
          setIsAccepting(false);
        }
      }
    },
    [user?.role, user?.isAvailable, request],
  );

  const rejectMission = useCallback(
    async (mission_id: string) => {
      if (
        wsRef.current?.readyState === WebSocket.OPEN &&
        user?.role === 'server' &&
        !isAccepting &&
        !isRejecting
      ) {
        try {
          setIsRejecting(true);
          // Get current access token
          const { accessToken } = useAuthStore.getState();

          const locationData = {
            type: WEBSOCKET_CONFIG.MESSAGE_TYPES.MISSION_RESPONSE,
            mission_id: mission_id,
            response: false,
            //token: accessToken, // Include access token for authentication
          };
          console.log('Try reject mission:', locationData);
          wsRef.current.send(JSON.stringify(locationData));
          console.log('mission rejected via WebSocket:', locationData);
        } catch (error) {
          console.error('Failed to reject mission via WebSocket:', error);
        } finally {
          setIsRejecting(false);
        }
      }
    },
    [user?.role, user?.isAvailable, request],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      //disconnect();
    };
  }, [disconnect]);

  return {
    isConnected: isConnected,
    connect,
    disconnect,
    request,
    acceptMission,
    rejectMission,
    isAccepting,
    isRejecting,
    isAccepted: isAccepted,
  };
};

export default useMissionSocket;
