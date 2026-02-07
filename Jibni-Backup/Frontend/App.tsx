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
} from 'react-native';
import { theme } from './src/theme';
import { Application } from '@/screens/Application';
import TranslationsProvider from '@/translations';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

function App() {
  console.log('[APP] App component rendering...');
  
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
