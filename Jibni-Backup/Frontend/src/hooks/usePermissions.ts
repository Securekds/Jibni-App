import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  AppState,
  Linking,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  requestNotifications,
  Permission,
  checkNotifications,
} from 'react-native-permissions';
import Geolocation from 'react-native-geolocation-service';
// Removed useFocusEffect - it requires NavigationContainer
// We'll use useEffect instead which works without NavigationContainer

const androidVersion = Platform.Version as number;
export const usePermissions = () => {
  const { t } = useTranslation();
  // Start with all permissions as false - they will be checked on mount
  const [permissions, setPermissions] = useState(
    androidVersion > 28
      ? {
          location: false,
          notification: false,
          backgroundLocation: false,
        }
      : {
          location: false,
          notification: false,
        },
  );
  const [needsAllowPermission, setNeedsAllowPermissions] = useState(false);
  const checkNotificationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    const permission = await checkNotifications();
    if (['granted', 'limited'].includes(permission.status)) {
      callback(true);
    } else {
      callback(false);
    }
  };

  const ensureGalleryReadingAndContinue = async (
    callback: (granted: boolean) => void,
  ) => {
    let permission;
    if (androidVersion >= 32) {
      permission = Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
        default: PERMISSIONS.ANDROID.READ_MEDIA_IMAGES,
      });
    } else {
      permission = Platform.select({
        ios: PERMISSIONS.IOS.PHOTO_LIBRARY,
        android: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
        default: PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
      });
    }

    await checkAndRequest(permission, callback);
  };

  const checkAndRequest = async (
    permission: Permission,
    callback: (granted: boolean) => void,
  ) => {
    try {
      const result = await check(permission);
      if (result === RESULTS.DENIED) {
        request(permission).then(r => {
          if (r === RESULTS.GRANTED || r === RESULTS.LIMITED) {
            callback(true);
          } else {
            openSettingFormPermission();
            callback(false);
          }
        });
      } else if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
        callback(true);
      } else {
        openSettingFormPermission();
        callback(false);
      }
    } catch (err) {
      console.log('catched e:', err);
      //alert('generiError')
      openSettingFormPermission();
      callback(false);
    }
  };

  const checkFineLocationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ios: PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      default: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
    });
    await _check(permission, callback);
  };

  const checkBackgroundLocationPermission = async (
    callback: (granted: boolean) => void,
  ) => {
    const permission = Platform.select({
      android: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
      ios: PERMISSIONS.IOS.LOCATION_ALWAYS,
      default: PERMISSIONS.ANDROID.ACCESS_BACKGROUND_LOCATION,
    });
    await _check(permission, callback);
  };

  const checkAllPermissions = async () => {
    let _permissions = {
      location: true,
      notification: true,
      backgroundLocation: true,
    };
    await checkNotificationPermission(granted => {
      _permissions = {
        ..._permissions,
        notification: granted,
      };
    });
    await checkFineLocationPermission(granted => {
      _permissions = {
        ..._permissions,
        location: granted,
      };
    });
    // request permission only in android > 9
    if (androidVersion > 28) {
      await checkBackgroundLocationPermission(granted => {
        _permissions = {
          ..._permissions,
          backgroundLocation: granted,
        };
      });
    }
    setPermissions(_permissions);
    setNeedsAllowPermissions(
      Object.values(_permissions).some(item => item === false),
    );
  };

  const _check = async (
    permission: Permission,
    callback: (granted: boolean) => void,
  ) => {
    try {
      const result = await check(permission);
      if (result === RESULTS.GRANTED || result === RESULTS.LIMITED) {
        callback(true);
      } else {
        callback(false);
      }
    } catch {
      callback(false);
    }
  };

  const onRequestNotificationPermission = async () => {
    const notificationStatus = await requestNotifications();
    if (['granted', 'limited'].includes(notificationStatus.status)) {
      setPermissions(prev => ({
        ...prev,
        notification: true,
      }));
    } else {
      openSettingFormPermission();
    }
  };

  const onRequestFineLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: t('permissions.gps.title'),
            message: t('permissions.gps.message'),
            buttonPositive: t('permissions.gps.buttonPositive'),
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissions(prev => ({
            ...prev,
            location: true,
          }));
        } else {
          openSettingFormPermission();
        }
      } catch (err) {
        openSettingFormPermission();
      }
    } else {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      if (auth === 'granted') {
        setPermissions(prev => ({
          ...prev,
          location: true,
        }));
      } else {
        openSettingFormPermission();
      }
    }
  };

  const onRequestBackgroundLocation = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          {
            title: t('permissions.backgroundGps.title'),
            message: t('permissions.backgroundGps.message'),
            buttonPositive: t('permissions.backgroundGps.buttonPositive'),
          },
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setPermissions(prev => ({
            ...prev,
            backgroundLocation: true,
          }));
        } else {
          openSettingFormPermission();
        }
      } catch (err) {
        openSettingFormPermission();
      }
    } else {
      const auth = await Geolocation.requestAuthorization('always');
      if (auth === 'granted') {
        setPermissions(prev => ({
          ...prev,
          backgroundLocation: true,
        }));
      } else {
        openSettingFormPermission();
      }
    }
  };

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        checkAllPermissions();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useEffect instead of useFocusEffect since NavigationContainer is not available
  // This will check permissions on mount
  useEffect(() => {
    checkAllPermissions();
  }, []);

  const openSettingFormPermission = () => {
    Alert.alert('', t(`openSettingsPromptMessage`), [
      // The "Yes" button
      {
        text: t(`openSettingsPromptButton`),
        onPress: () => Linking.openSettings(),
      },
      // The "No" button
      // Does nothing but dismiss the dialog when tapped
      {
        text: t('close'),
      },
    ]);
  };

  return {
    permissions,
    needsAllowPermission,
    setNeedsAllowPermissions,
    checkAllPermissions,
    onRequestFineLocation,
    onRequestNotificationPermission,
    onRequestBackgroundLocation,
    ensureGalleryReadingAndContinue,
  };
};
