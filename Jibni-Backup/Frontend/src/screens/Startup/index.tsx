import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import SelectLanguageScreen from '../SelectLanguage';
import LoginScreen from '../Login/Index';
import VerifyOtpScreen from '../VerifyOtp';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionsScreen from '../Permissions';
import HomeScreen from '../Home';
import { decodeToken } from '@/utils/tokenUtils';
import DriverHomeScreen from '../DriverHome';
import { ActivityIndicator, View } from 'react-native';
import { useDriver } from '@/hooks';
import { setGlobalNavigate, setGlobalReset } from '@/utils/navigatorUtils';

// Simple navigation state for when NavigationContainer is not available
type ScreenName = 'Login' | 'VerifyOtp' | 'Home' | 'DriverHome' | 'Permissions' | 'SelectLanguage' | 'Startup' | 'BecomeDriver' | 'AddressAutoComplete' | 'ChooseFromMap';

const StartupScreen: React.FC = () => {
  console.log('[STARTUP] StartupScreen component rendering...');
  
  // State-based navigation (temporary until NavigationContainer is fixed)
  const [currentScreen, setCurrentScreen] = useState<ScreenName | null>(null);
  const [screenParams, setScreenParams] = useState<any>({});
  
  console.log('[STARTUP] Getting store values...');
  const { currentLanguage, isAuthenticated, accessToken, user } =
    useAuthStore();
  console.log('[STARTUP] Store values:', { currentLanguage, isAuthenticated, hasAccessToken: !!accessToken, userRole: user?.role });
  
  console.log('[STARTUP] Getting permissions...');
  const { needsAllowPermission } = usePermissions();
  console.log('[STARTUP] needsAllowPermission:', needsAllowPermission);
  
  console.log('[STARTUP] Initializing state...');
  const [isLoading, setIsLoading] = useState(true);
  const { checkStatus } = useDriver();
  console.log('[STARTUP] State initialized');
  console.log('[STARTUP] About to set up useEffect...');

  useEffect(() => {
    console.log('[STARTUP] useEffect triggered, isAuthenticated:', isAuthenticated);
    setIsLoading(true);
    // Wrap in try-catch to prevent crashes
    checkStatus()
      .then((result) => {
        console.log('[STARTUP] checkStatus result:', result);
        // If status changed, the user object will be updated in the store
        // The component will re-render automatically when user.role changes
      })
      .catch((error) => {
        console.error('[STARTUP] checkStatus error:', error);
        // Don't crash on error, just continue
      })
      .finally(() => {
        console.log('[STARTUP] checkStatus finished, setting loading to false');
        setIsLoading(false);
      });
    if (accessToken) {}
  }, [isAuthenticated]);
  
  // Also check status periodically to detect role changes after approval
  // Only check if user is not already a server AND has a pending upgrade request
  const [hasUpgradeRequest, setHasUpgradeRequest] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'server') {
      // User is already a server, no need to check status
      setHasUpgradeRequest(false);
      return;
    }
    
    // Initial check to see if there's an upgrade request
    checkStatus()
      .then((result) => {
        const status = result?.upgrade_status;
        if (status === 'pending' || status === 'approved') {
          setHasUpgradeRequest(true);
        } else {
          // No upgrade request (not_submitted) - stop checking
          setHasUpgradeRequest(false);
        }
      })
      .catch(() => {
        setHasUpgradeRequest(false);
      });
  }, [isAuthenticated, user?.role]);
  
  // Only check periodically if there's an active upgrade request
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'server' || hasUpgradeRequest === false) {
      // User is already a server or has no upgrade request - no need to check
      return;
    }
    
    if (hasUpgradeRequest === null) {
      // Still checking initial status, wait
      return;
    }
    
    // Check status every 10 seconds (reduced from 5s) to detect approval
    const interval = setInterval(() => {
      console.log('[STARTUP] Periodic checkStatus check (upgrade request pending)...');
      checkStatus()
        .then((result) => {
          console.log('[STARTUP] Periodic checkStatus result:', result);
          const status = result?.upgrade_status;
          
          // If approved or rejected, stop checking
          if (status === 'approved') {
            setHasUpgradeRequest(false);
            // User role will be updated in the store and component will re-render
          } else if (status === 'rejected' || status === 'not_submitted') {
            setHasUpgradeRequest(false);
          }
          // If still pending, keep checking
        })
        .catch((error) => {
          console.error('[STARTUP] Periodic checkStatus error:', error);
        });
    }, 10000); // Check every 10 seconds (reduced frequency)
    
    return () => clearInterval(interval);
  }, [isAuthenticated, user?.role, hasUpgradeRequest, checkStatus]);
  
  // Navigation function for screens (temporary workaround)
  const navigateToScreen = (screen: ScreenName, params?: any) => {
    console.log('[STARTUP] Navigating to screen:', screen, 'with params:', params);
    setCurrentScreen(screen);
    if (params) {
      setScreenParams(params);
    }
  };
  
  // Reset navigation state function
  const resetNavigation = () => {
    console.log('[STARTUP] Resetting navigation state');
    setCurrentScreen(null);
    setScreenParams({});
  };
  
  // Set global navigation functions early so other components can use them
  useEffect(() => {
    setGlobalNavigate(navigateToScreen);
    setGlobalReset(resetNavigation);
    console.log('[STARTUP] Global navigation functions registered');
    
    return () => {
      setGlobalNavigate(null);
      setGlobalReset(null);
    };
  }, []);
  
  // Set global navigation functions so navigate() and popToTop() utilities work
  useEffect(() => {
    setGlobalNavigate(navigateToScreen);
    setGlobalReset(resetNavigation);
  }, []);
  
  // Clear navigation state when authentication changes (user logs in/out)
  useEffect(() => {
    if (isAuthenticated && currentScreen === 'VerifyOtp') {
      // User just logged in, clear the VerifyOtp screen so normal flow takes over
      console.log('[STARTUP] User authenticated, clearing VerifyOtp screen');
      setCurrentScreen(null);
    }
  }, [isAuthenticated]);
  
  console.log('[STARTUP] useEffect hook registered');
  console.log('[STARTUP] Rendering return statement...');
  console.log('[STARTUP] Render conditions:', {
    currentLanguageIsNull: currentLanguage == null,
    isAuthenticated,
    needsAllowPermission,
    userRole: user?.role,
    isLoading,
    currentScreen,
  });

  try {
    let screenToRender;
    
    // If we have an explicit screen set (from navigation), use it
    if (currentScreen === 'VerifyOtp' && !isAuthenticated) {
      console.log('[STARTUP] Rendering VerifyOtpScreen (from navigation)');
      screenToRender = <VerifyOtpScreen route={{ params: screenParams }} navigation={{ goBack: () => setCurrentScreen(null), popToTop: resetNavigation }} />;
    } else if (currentScreen === 'BecomeDriver' && isAuthenticated) {
      console.log('[STARTUP] Rendering BecomeDriverScreen (from navigation)');
      const BecomeDriverScreen = require('../BecomeDriver').default;
      screenToRender = <BecomeDriverScreen route={{ params: screenParams }} navigation={{ goBack: () => setCurrentScreen(null) }} />;
    } else if (currentScreen === 'AddressAutoComplete' && isAuthenticated) {
      console.log('[STARTUP] Rendering AddressAutoCompleteScreen (from navigation)');
      const AddressAutoCompleteScreen = require('../AddressAutoComplete').default;
      screenToRender = <AddressAutoCompleteScreen route={{ params: screenParams }} navigation={{ goBack: () => setCurrentScreen(null), navigate: navigateToScreen }} />;
    } else if (currentScreen === 'ChooseFromMap' && isAuthenticated) {
      console.log('[STARTUP] Rendering ChooseFromMapScreen (from navigation)');
      const ChooseFromMapScreen = require('../ChooseFromMap').default;
      screenToRender = <ChooseFromMapScreen route={{ params: screenParams }} navigation={{ goBack: () => setCurrentScreen(null) }} />;
    } else if (currentLanguage == null) {
      console.log('[STARTUP] Rendering SelectLanguageScreen');
      screenToRender = <SelectLanguageScreen />;
    } else if (isAuthenticated) {
      if (needsAllowPermission) {
        console.log('[STARTUP] Rendering PermissionsScreen');
        screenToRender = <PermissionsScreen />;
      } else if (user?.role != 'server') {
        if (isLoading) {
          console.log('[STARTUP] Rendering Loading indicator (checking upgrade status...)');
          screenToRender = (
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator />
            </View>
          );
        } else {
          console.log('[STARTUP] Rendering HomeScreen (user role:', user?.role, ')');
          // Pass navigation function to HomeScreen so it can navigate to other screens
          screenToRender = <HomeScreen navigation={{ navigate: navigateToScreen }} />;
        }
      } else {
        console.log('[STARTUP] Rendering DriverHomeScreen (user role: server)');
        screenToRender = <DriverHomeScreen />;
      }
    } else {
      console.log('[STARTUP] Rendering LoginScreen');
      // Pass navigation function to LoginScreen
      screenToRender = <LoginScreen navigation={{ navigate: navigateToScreen }} />;
    }

    console.log('[STARTUP] Screen determined, wrapping in container...');
    // Use View instead of Box to avoid restyle issues
    console.log('[STARTUP] Using View component instead of Box...');
    
    // BYPASS NavigationContainer - render screens directly
    console.log('[STARTUP] Creating View with screenToRender (no NavigationContainer)...');
    const viewStyle = { flex: 1 };
    console.log('[STARTUP] View style created');
    console.log('[STARTUP] About to return View component...');
    const result = (
      <View style={viewStyle}>
        {screenToRender}
      </View>
    );
    console.log('[STARTUP] View component created, returning...');
    return result;
  } catch (e) {
    console.error('[STARTUP] FATAL ERROR in return statement:', e);
    console.error('[STARTUP] Error stack:', e.stack);
    // Return a simple error view instead of crashing
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
};

export default StartupScreen;
