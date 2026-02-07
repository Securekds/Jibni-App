import React from 'react';
import { navigationRef } from '@/utils/navigatorUtils';
import LoginScreen from './Login/Index';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import SelectLanguageScreen from './SelectLanguage';
import StartupScreen from './Startup';
import VerifyOtpScreen from './VerifyOtp';
import BecomeDriverScreen from './BecomeDriver';
import AddressAutoCompleteScreen from './AddressAutoComplete';
import ChooseFromMapScreen from './ChooseFromMap';
import { View, ActivityIndicator } from 'react-native';

export const Application: React.FC = () => {
  console.log('[APPLICATION] Application component rendering...');
  
  try {
    console.log('[APPLICATION] Step 1: Creating Stack navigator...');
    const Stack = createNativeStackNavigator();
    console.log('[APPLICATION] ✓ Stack navigator created');
    
    console.log('[APPLICATION] Step 2: Creating NavigationContainer...');
    const navContainer = (
      <NavigationContainer 
        ref={navigationRef}
        onReady={() => console.log('[APPLICATION] ✓ NavigationContainer ready!')}
        onStateChange={() => console.log('[APPLICATION] Navigation state changed')}
        onError={(error) => {
          console.error('[APPLICATION] NavigationContainer error:', error);
        }}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Startup" component={StartupScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SelectLanguage" component={SelectLanguageScreen} />
          <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          <Stack.Screen name="BecomeDriver" component={BecomeDriverScreen} />
          <Stack.Screen name="AddressAutoComplete" component={AddressAutoCompleteScreen} />
          <Stack.Screen name="ChooseFromMap" component={ChooseFromMapScreen}/>
        </Stack.Navigator>
      </NavigationContainer>
    );
    console.log('[APPLICATION] ✓ NavigationContainer JSX created');
    console.log('[APPLICATION] Returning NavigationContainer...');
    return navContainer;
  } catch (e) {
    console.error('[APPLICATION] FATAL ERROR in Application component:', e);
    console.error('[APPLICATION] Error stack:', e.stack);
    // Don't throw, return a fallback
    console.log('[APPLICATION] Returning fallback View...');
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
};
