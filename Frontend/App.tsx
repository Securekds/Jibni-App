/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { ThemeProvider } from '@shopify/restyle';
import {
  I18nManager,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { theme } from './src/theme';
import { Application } from '@/screens/Application';
import TranslationsProvider from '@/translations';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';

function App() {
  console.log('[APP] App component rendering...');
  
  // Add FCM setup
  useEffect(() => {
    console.log('[FCM] Initializing FCM...');
    requestUserPermission();
    getDeviceToken();
    
    // Listen for foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] Foreground message received:', remoteMessage);
    });

    return unsubscribe;
  }, []);

  const requestUserPermission = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          console.log('✅ Android notification permission granted');
        } else {
          console.log('❌ Android notification permission denied');
        }
      } else if (Platform.OS === 'ios') {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        if (enabled) {
          console.log('✅ iOS Authorization status:', authStatus);
        }
      }
    } catch (error) {
      console.log('❌ Error requesting permission:', error);
    }
  };

  const getDeviceToken = async () => {
    try {
      await messaging().registerDeviceForRemoteMessages();
      const token = await messaging().getToken();
      console.log('📱 FCM Token:', token);
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Token length:', token.length);
      
      // TODO: Send to Django backend later
      // sendTokenToBackend(token);
    } catch (error) {
      console.log('❌ Error getting FCM token:', error);
    }
  };
  
  try {
    console.log('[APP] Loading theme...');
    const appTheme = theme;
    console.log('[APP] ✓ Theme loaded');
    
    console.log('[APP] Creating ThemeProvider...');
    const themeProvider = (
      <ThemeProvider theme={appTheme}>
        <TranslationsProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
              <StatusBar
                backgroundColor={'transparent'}
                barStyle={'dark-content'}
                translucent={false}
              />
              <Application />
            </View>
          </GestureHandlerRootView>
        </TranslationsProvider>
      </ThemeProvider>
    );
    console.log('[APP] ThemeProvider created, returning...');
    return themeProvider;
  } catch (e) {
    console.error('[APP] FATAL ERROR in App component:', e);
    console.error('[APP] Error stack:', e.stack);
    // Return a simple fallback instead of throwing
    console.log('[APP] Returning fallback View...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;