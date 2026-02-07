import React, { useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Platform,
  PermissionsAndroid,
  Alert,
} from 'react-native';
import messaging from '@react-native-firebase/messaging';

function AppTest() {
  useEffect(() => {
    console.log('[APP_TEST] Component mounted');
    requestUserPermission();
    getDeviceToken();
    
    // Listen for foreground messages
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('[FCM] 🔔 Foreground notification received!');
      console.log('[FCM] Notification data:', remoteMessage);
      
      Alert.alert(
        remoteMessage.notification?.title || 'New Notification',
        remoteMessage.notification?.body || 'You have a new message',
        [{ text: 'OK' }]
      );
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
      console.log('='.repeat(50));
      console.log('📱 FCM TOKEN - COPY THIS:');
      console.log(token);
      console.log('='.repeat(50));
      console.log('📱 Platform:', Platform.OS);
      console.log('📱 Token length:', token.length);
    } catch (error) {
      console.log('❌ Error getting FCM token:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔔</Text>
        <Text style={styles.title}>Push Notification Test</Text>
        <Text style={styles.subtitle}>App is ready to receive notifications!</Text>
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>✅ Setup Complete</Text>
          <Text style={styles.infoText}>• FCM initialized</Text>
          <Text style={styles.infoText}>• Permissions requested</Text>
          <Text style={styles.infoText}>• Token generated</Text>
        </View>
        <Text style={styles.instruction}>
          Check the console for your FCM token
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#333',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#4CAF50',
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  instruction: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default AppTest;