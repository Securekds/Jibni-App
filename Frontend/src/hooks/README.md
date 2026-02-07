# Server Location Tracking Hooks

This directory contains custom hooks for handling WebSocket connections and location tracking for server users.

## Hooks Overview

### `useServerSocket`
Manages WebSocket connection to the server endpoint `/ws/server/` for users with `role === "server"`.

**Features:**
- Automatic connection when user role becomes "server"
- Automatic reconnection on connection loss
- Location data transmission
- Connection status management

**Usage:**
```typescript
import { useServerSocket } from '@/hooks';

const { isConnected, sendLocation, connect, disconnect } = useServerSocket();

// Send location manually
sendLocation(latitude, longitude);
```

### `useServerLocationTracker`
Automatically tracks GPS location and sends updates to the WebSocket server at regular intervals.

**Features:**
- Automatic GPS location tracking
- Configurable update intervals
- Integration with WebSocket connection
- Location state management

**Usage:**
```typescript
import { useServerLocationTracker } from '@/hooks';

const { isTracking, currentLocation, startTracking, stopTracking } = useServerLocationTracker(10000); // 10 second intervals
```

## Configuration

Update the WebSocket server URL in `src/config/websocket.ts`:

```typescript
export const WEBSOCKET_CONFIG = {
  SERVER_URL: 'ws://your-actual-server.com/ws/server/',
  // ... other config
};
```

## Integration

The hooks are automatically integrated into the `DriverHome` screen when a user has the "server" role. The system will:

1. Check if `user.role === "server"`
2. Establish WebSocket connection to `/ws/server/`
3. Start GPS location tracking
4. Send location updates every 10 seconds (configurable)
5. Handle reconnections automatically

## Message Format

Location updates are sent in the following format:

```json
{
  "type": "location_update",
  "latitude": 28.0339,
  "longitude": 1.6596,
  "timestamp": "2024-01-01T12:00:00.000Z",
  "userId": "server_user"
}
```

## Dependencies

- `react-native-websocket` - WebSocket functionality
- `react-native-geolocation-service` - GPS location services
- `zustand` - State management
- `@react-native-async-storage/async-storage` - Persistent storage

## Error Handling

The hooks include comprehensive error handling:
- GPS permission errors
- WebSocket connection failures
- Automatic reconnection attempts
- Graceful degradation when services are unavailable

