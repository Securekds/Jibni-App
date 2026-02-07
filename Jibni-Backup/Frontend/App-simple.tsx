/**
 * Simplified App for testing - gradually adding providers
 * @format
 */

import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ThemeProvider } from '@shopify/restyle';
import { theme } from './src/theme';
import TranslationsProvider from './src/translations';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Application } from './src/screens/Application';

function App() {
  console.log('[APP-SIMPLE] Simple App rendering...');
  
  try {
    console.log('[APP-SIMPLE] Step 1: Testing ThemeProvider...');
    // Test ThemeProvider first
    const testTheme = (
      <ThemeProvider theme={theme}>
        <View style={styles.container}>
          <ActivityIndicator size="large" />
        </View>
      </ThemeProvider>
    );
    console.log('[APP-SIMPLE] ✓ ThemeProvider OK');
    
    console.log('[APP-SIMPLE] Step 2: Testing TranslationsProvider...');
    // Test TranslationsProvider
    const testTranslations = (
      <ThemeProvider theme={theme}>
        <TranslationsProvider>
          <View style={styles.container}>
            <ActivityIndicator size="large" />
          </View>
        </TranslationsProvider>
      </ThemeProvider>
    );
    console.log('[APP-SIMPLE] ✓ TranslationsProvider OK');
    
    console.log('[APP-SIMPLE] Step 3: Testing GestureHandlerRootView...');
    // Test GestureHandlerRootView
    const testGesture = (
      <ThemeProvider theme={theme}>
        <TranslationsProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
              <ActivityIndicator size="large" />
            </View>
          </GestureHandlerRootView>
        </TranslationsProvider>
      </ThemeProvider>
    );
    console.log('[APP-SIMPLE] ✓ GestureHandlerRootView OK');
    
    console.log('[APP-SIMPLE] Step 4: Bypassing NavigationContainer - rendering StartupScreen directly...');
    // BYPASS NavigationContainer - render StartupScreen directly
    // This will get the app working, we'll fix navigation later
    const StartupScreen = require('./src/screens/Startup').default;
    
    console.log('[APP-SIMPLE] Rendering app without NavigationContainer...');
    return (
      <SafeAreaProvider>
        <ThemeProvider theme={theme}>
          <TranslationsProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StartupScreen />
            </GestureHandlerRootView>
          </TranslationsProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    );
    
    // TODO: After NavigationContainer works, uncomment this:
    // console.log('[APP-SIMPLE] Step 5: Testing Application component...');
    // return (
    //   <ThemeProvider theme={theme}>
    //     <TranslationsProvider>
    //       <GestureHandlerRootView style={{ flex: 1 }}>
    //         <Application />
    //       </GestureHandlerRootView>
    //     </TranslationsProvider>
    //   </ThemeProvider>
    // );
  } catch (e) {
    console.error('[APP-SIMPLE] Error:', e);
    console.error('[APP-SIMPLE] Error stack:', e.stack);
    // Fallback without providers
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});

export default App;
