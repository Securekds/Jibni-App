# React Native Authentication Middleware

A comprehensive authentication system for React Native using Zustand for state management, Axios for API calls, and JWT tokens for authentication.

## Features

- ✅ **JWT Token Management**: Automatic token storage, validation, and refresh
- ✅ **Zustand State Management**: Centralized auth state with persistence
- ✅ **Axios Interceptors**: Automatic token injection and refresh handling
- ✅ **Concurrency Control**: Prevents multiple simultaneous token refresh requests
- ✅ **TypeScript Support**: Full type safety throughout the system
- ✅ **Persistence**: Tokens and user data persist across app restarts
- ✅ **Protected Routes**: Easy distinction between public and protected endpoints
- ✅ **Error Handling**: Comprehensive error handling and user feedback

## Installation

The required dependencies are already installed:

```bash
npm install zustand @react-native-async-storage/async-storage axios jwt-decode
```

## Project Structure

```
src/
├── types/
│   └── auth.ts              # TypeScript interfaces
├── stores/
│   └── authStore.ts         # Zustand store with persistence
├── services/
│   └── api.ts              # Axios instance with interceptors
├── hooks/
│   └── useAuth.ts          # Custom authentication hook
├── utils/
│   └── tokenUtils.ts       # Token utility functions
└── components/
    ├── LoginScreen.tsx     # Example login component
    └── ProfileScreen.tsx   # Example protected component
```

## Quick Start

### 1. Configure API Base URL

Update the `API_BASE_URL` in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'https://your-api-domain.com/api';
```

### 2. Use the Authentication Hook

```typescript
import { useAuth } from './src/hooks/useAuth';

const MyComponent = () => {
  const { 
    user, 
    isAuthenticated, 
    login, 
    logout, 
    isLoading 
  } = useAuth();

  const handleLogin = async () => {
    const result = await login({ 
      email: 'user@example.com', 
      password: 'password' 
    });
    
    if (result.success) {
      // Navigate to main app
    }
  };

  return (
    // Your component JSX
  );
};
```

### 3. Make Protected API Calls

```typescript
import { protectedAPI } from './src/services/api';

// GET request
const userData = await protectedAPI.get<UserData>('/user/profile');

// POST request
const newPost = await protectedAPI.post<Post>('/posts', { 
  title: 'New Post', 
  content: 'Content' 
});

// PUT request
const updatedUser = await protectedAPI.put<User>('/user/profile', { 
  name: 'New Name' 
});

// DELETE request
await protectedAPI.delete('/user/account');
```

## API Reference

### Auth Store (`useAuthStore`)

The Zustand store provides the following state and actions:

#### State
- `user: User | null` - Current user information
- `accessToken: string | null` - JWT access token
- `refreshToken: string | null` - JWT refresh token
- `isAuthenticated: boolean` - Authentication status
- `isLoading: boolean` - Loading state

#### Actions
- `login(user, tokens)` - Set user and tokens
- `logout()` - Clear all auth data
- `setTokens(tokens)` - Update tokens only
- `setUser(user)` - Update user only
- `setLoading(loading)` - Set loading state

#### Utilities
- `isTokenExpired()` - Check if access token is expired
- `getDecodedToken()` - Get decoded token payload
- `clearTokens()` - Clear tokens only

### Auth Hook (`useAuth`)

The custom hook provides a simplified interface:

#### State
- `user` - Current user
- `isAuthenticated` - Authentication status
- `isLoading` - Loading state

#### Actions
- `login(credentials)` - Login with email/password
- `register(email, password, name)` - Register new user
- `logout()` - Logout user
- `checkAuthStatus()` - Check current auth status

### Protected API (`protectedAPI`)

Methods for making authenticated API calls:

- `get<T>(url, config?)` - GET request
- `post<T>(url, data?, config?)` - POST request
- `put<T>(url, data?, config?)` - PUT request
- `patch<T>(url, data?, config?)` - PATCH request
- `delete<T>(url, config?)` - DELETE request

### Token Utilities (`tokenUtils`)

Utility functions for token management:

- `decodeToken(token)` - Decode JWT token
- `isTokenExpired(token)` - Check if token is expired
- `isTokenExpiringSoon(token, bufferSeconds?)` - Check if token expires soon
- `getTokenExpirationTime(token)` - Get expiration timestamp
- `getTimeUntilExpiration(token)` - Get time until expiration
- `isValidTokenFormat(token)` - Validate token format

## How It Works

### 1. Token Management

The system automatically:
- Stores tokens in Zustand with persistence
- Decodes and validates tokens
- Checks expiration before API calls
- Refreshes expired tokens automatically

### 2. Axios Interceptors

**Request Interceptor:**
- Skips token logic for public endpoints (`/auth/login`, `/auth/register`, `/public`)
- Checks if access token is expired
- If expired, refreshes token before proceeding
- Adds `Authorization: Bearer <token>` header

**Response Interceptor:**
- Handles 401 (Unauthorized) responses
- Automatically retries failed requests after token refresh
- Logs out user if refresh fails

### 3. Concurrency Control

The system prevents multiple simultaneous token refresh requests:
- Uses a shared promise for ongoing refresh operations
- Multiple requests wait for the same refresh operation
- Prevents race conditions and unnecessary API calls

### 4. Persistence

Auth data persists across app restarts using:
- Zustand persist middleware
- AsyncStorage for React Native
- Automatic rehydration on app start

## Configuration

### Customizing Public Endpoints

Update the `isPublicEndpoint` check in `src/services/api.ts`:

```typescript
const isPublicEndpoint = config.url?.includes('/auth/login') || 
                       config.url?.includes('/auth/register') ||
                       config.url?.includes('/public') ||
                       config.url?.includes('/health'); // Add your public endpoints
```

### Customizing Token Refresh

Modify the refresh token logic in `src/services/api.ts`:

```typescript
const refreshToken = async (): Promise<string> => {
  // Your custom refresh logic
  const response = await axios.post('/auth/refresh', { 
    refreshToken: useAuthStore.getState().refreshToken 
  });
  
  // Update tokens
  useAuthStore.getState().setTokens({
    accessToken: response.data.accessToken,
    refreshToken: response.data.refreshToken,
  });
  
  return response.data.accessToken;
};
```

### Customizing Error Handling

Add custom error handling in the response interceptor:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 403) {
      // Handle forbidden errors
      Alert.alert('Access Denied', 'You don\'t have permission to access this resource');
    }
    
    // Continue with existing logic...
    return Promise.reject(error);
  }
);
```

## Example Usage

### Login Flow

```typescript
const LoginScreen = () => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result = await login({ email, password });
    
    if (result.success) {
      // Navigate to main app
      navigation.navigate('Home');
    } else {
      Alert.alert('Login Failed', 'Invalid credentials');
    }
  };

  return (
    <View>
      <TextInput value={email} onChangeText={setEmail} />
      <TextInput value={password} onChangeText={setPassword} secureTextEntry />
      <Button title="Login" onPress={handleLogin} disabled={isLoading} />
    </View>
  );
};
```

### Protected API Call

```typescript
const ProfileScreen = () => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);

  const fetchProfile = async () => {
    try {
      // This automatically handles token injection and refresh
      const userProfile = await protectedAPI.get('/user/profile');
      setProfile(userProfile);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
    }
  }, [isAuthenticated]);

  return (
    <View>
      <Text>Welcome, {user?.name}!</Text>
      {profile && <Text>Last login: {profile.lastLogin}</Text>}
    </View>
  );
};
```

### Logout

```typescript
const SettingsScreen = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout(); // This calls the API and clears local state
    // Navigate to login screen
    navigation.navigate('Login');
  };

  return (
    <View>
      <Button title="Logout" onPress={handleLogout} />
    </View>
  );
};
```

## Security Considerations

1. **Token Storage**: Tokens are stored in AsyncStorage (encrypted on iOS, not on Android)
2. **Token Validation**: Always validate tokens on the server side
3. **Refresh Token Rotation**: Consider implementing refresh token rotation for better security
4. **Token Expiration**: Set appropriate expiration times for access and refresh tokens
5. **HTTPS**: Always use HTTPS for API communications

## Troubleshooting

### Common Issues

1. **Token not being sent**: Check if the endpoint is marked as public
2. **Infinite refresh loop**: Ensure your refresh endpoint returns valid tokens
3. **Persistence not working**: Check AsyncStorage permissions
4. **TypeScript errors**: Ensure all types are properly imported

### Debug Mode

Enable debug logging by adding this to your app:

```typescript
// In your App.tsx or index.js
if (__DEV__) {
  console.log('Auth Store State:', useAuthStore.getState());
}
```

## Contributing

Feel free to submit issues and enhancement requests! 