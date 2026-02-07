// WebSocket server configuration
export const WEBSOCKET_CONFIG = {
  // Replace with your actual WebSocket server URL
  SERVER_URL: 'ws://172.20.10.3:8000/ws/server/',
  MISSION_URL: 'ws://172.20.10.3:8000/ws/missions/',
  
  // Connection settings
  RECONNECT_INTERVAL: 5000, // 5 seconds
  LOCATION_UPDATE_INTERVAL: 10000, // 10 seconds
  
  // Message types
  MESSAGE_TYPES: {
    LOCATION_UPDATE: 'heartbeat',
    CONNECTION_ESTABLISHED: 'connection_established',
    HEARTBEAT: 'heartbeat', 
    SNED_MISSION_REQUEST: "mission_request", 
    MISSION_RESPONSE: "mission_response"
  }
};

// Environment-based configuration
export const getWebSocketUrl = (endpoint: 'server' | 'mission' = 'server') => {
  // You can add environment-specific logic here
  // For example, different URLs for development, staging, production
  return endpoint === 'mission' ? WEBSOCKET_CONFIG.MISSION_URL : WEBSOCKET_CONFIG.SERVER_URL;
};
