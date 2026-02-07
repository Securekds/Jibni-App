/**
 * Used to navigating without the navigation prop
 * @see https://reactnavigation.org/docs/navigating-without-navigation-prop/
 *
 * You can add other navigation functions that you need and export them
 */
import {
    CommonActions,
    createNavigationContainerRef,
  } from '@react-navigation/native'
  
  export const navigationRef = createNavigationContainerRef()
  
  // Global navigation function that can be set from StartupScreen
  let globalNavigateFunction = null;
  
  export const setGlobalNavigate = (fn) => {
    globalNavigateFunction = fn;
  };
  
  export const navigate = (name, params) => {
    if (navigationRef.isReady()) {
      navigationRef.navigate(name, params);
    } else if (globalNavigateFunction) {
      // Fallback to state-based navigation when NavigationContainer is not available
      console.log('[NAV] Using fallback navigation to:', name);
      globalNavigateFunction(name, params);
    } else {
      // Navigation not initialized yet - this is OK, just log it
      console.log('[NAV] Navigation not initialized yet, will navigate when ready. Screen:', name);
      // Try to set it up on next tick
      setTimeout(() => {
        if (globalNavigateFunction) {
          globalNavigateFunction(name, params);
        }
      }, 100);
    }
  }
  
  export const navigateAndReset = (routes = [], index = 0) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index,
          routes,
        }),
      )
    }
  }
  
  export const navigateAndSimpleReset = (name, index = 0) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index,
          routes: [{ name }],
        }),
      )
    }
  }
  
  export const navigateAndSimpleResetToNestedRoute = (name, screen, params, index = 0) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index,
          routes: [{ 
            name,
            params: {
              screen,
              params
            }
          }],
        }),
      )
    }
  }
  
  export const navigateAndSimpleResetToNestedRoutes = (
    name, 
    parentRoute, 
    routes, 
    index = 0
  ) => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ 
            name,
            state:{
              index: 0,
              routes: [
                {
                  name: parentRoute,
                  state:{
                    index,
                    routes
                  }
                }
              ]
            }, 
          }],
        }),
      )
    }
  }

  // Helper functions for navigation actions (works without NavigationContainer)
  export const goBack = () => {
    if (navigationRef.isReady()) {
      navigationRef.goBack();
    } else {
      console.warn('[NAV] Navigation not ready, cannot go back');
    }
  }

  // Global function to reset navigation state (for state-based navigation)
  let globalResetFunction = null;
  
  export const setGlobalReset = (fn) => {
    globalResetFunction = fn;
  };
  
  export const popToTop = () => {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(CommonActions.reset({
        index: 0,
        routes: [{ name: 'Startup' }],
      }));
    } else if (globalResetFunction) {
      // Fallback to state-based navigation when NavigationContainer is not available
      console.log('[NAV] Using fallback popToTop - resetting to Startup');
      globalResetFunction();
    } else {
      console.warn('[NAV] Navigation not ready, cannot pop to top');
    }
  }
  