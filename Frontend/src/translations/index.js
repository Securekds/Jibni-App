import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as resources from './resources';

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';

const I18nContext = createContext();
const APP_LANG_KEY = 'lang';
function TranslationsProvider(props) {
  const [currentLanguage, setCurrentLanguage] = useState();
  const [loading, setloading] = useState(true);
  const { setCurrentLanguage: setCurrentLanguageStore } = useAuthStore();

  const forceRTLIfNeeded = async lng => {
    if (lng === 'ar' && !I18nManager.isRTL) {
      I18nManager.forceRTL(true);
      setTimeout(() => {
        RNRestart.Restart();
      }, 1000);
      return false; // App will restart, so don't continue
    } else if (I18nManager.isRTL && lng !== 'ar') {
      I18nManager.forceRTL(false);
      setTimeout(() => {
        RNRestart.Restart();
      }, 1000);
      return false; // App will restart, so don't continue
    } else {
      // was already handled return
      // so we only need to continue with current context if the app wasn't restarted.
      return true;
    }
  };

  const initLanguage = useCallback(async () => {
    let IsSameAppInstance = false;
    try {
      setloading(true);
      I18nManager.allowRTL(true);

      const lng = 'fr'; // the default lang
      const storedlng = await AsyncStorage.getItem(APP_LANG_KEY);
      const currentLng = storedlng || lng;
      await i18next.use(initReactI18next).init({
        compatibilityJSON: 'v3',
        lng: currentLng,
        resources: {
          ...Object.entries(resources).reduce(
            (acc, [key, value]) => ({
              ...acc,
              [key]: {
                translation: value,
              },
            }),
            {},
          ),
        },
      });

      IsSameAppInstance = await forceRTLIfNeeded(currentLng);

      setCurrentLanguage(currentLng);
    } catch (error) {
      console.error('Translation initialization error:', error);
      // Set loading to false even on error to prevent blank screen
      setloading(false);
    } finally {
      if (IsSameAppInstance) {
        setloading(false);
      }
    }
  }, []);

  const changeLanguage = async lng => {
    let IsSameAppInstance = false;
    try {
      setloading(true);
      await i18next.changeLanguage(lng);
      await AsyncStorage.setItem(APP_LANG_KEY, lng);
      setCurrentLanguageStore(lng);
      IsSameAppInstance = await forceRTLIfNeeded(lng);
      setCurrentLanguage(lng);
    } catch (error) {
      console.error('Language change error:', error);
      // Set loading to false even on error
      setloading(false);
    } finally {
      if (IsSameAppInstance) {
        setloading(false);
      }
    }
  };

  const contextValues = { currentLanguage, changeLanguage };

  useEffect(() => {
    console.log('[TRANSLATIONS] useEffect triggered, initializing language...');
    initLanguage()
      .then(() => {
        console.log('[TRANSLATIONS] Language initialization completed');
      })
      .catch((error) => {
        console.error('[TRANSLATIONS] Language initialization error:', error);
      });
  }, [initLanguage]);

  console.log('[TRANSLATIONS] Render - loading:', loading);
  if (loading) {
    console.log('[TRANSLATIONS] Still loading, returning null');
    return null;
  }

  console.log('[TRANSLATIONS] Rendering provider with contextValues:', contextValues);
  return <I18nContext.Provider {...props} value={contextValues} />;
}

function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error(`useI18n must be used within a TranslationsProvider`);
  }

  return context;
}

export { TranslationsProvider as default, useI18n };
