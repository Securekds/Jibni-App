import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { Box, Button, Text } from '@/components';
import { theme } from '@/theme';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import useGPSLocation from '@/hooks/useGpsLocation';
import { navigate } from '@/utils/navigatorUtils';
// Removed useFocusEffect - it requires NavigationContainer
// We'll use useEffect instead
import useWhiteStatusbarColor from '@/hooks/useWhiteStatusbar';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePubSub } from '@/hooks';

const initialRegion = {
  latitudeDelta: 13,
  longitudeDelta: 13,
  latitude: 28.0339,
  longitude: 1.6596,
};

const ChooseFromMapScreen: React.FC = ({ navigation, ...props }: any) => {
  const mapRef = useRef<MapView>(null);
  const [coordiantes, setCoordinates] = useState({
    latitudeDelta: 13,
    longitudeDelta: 13,
    latitude: 28.0339,
    longitude: 1.6596,
  });
  const { getUserPosition } = useGPSLocation();
  const [mapKey, setMapKey] = useState(true);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  useWhiteStatusbarColor();
  const [mapRegion, setMapRegion] = useState(initialRegion);
  const { publish, EVENTS } = usePubSub();

  const checkIfShouldChangeRegion = (region: any) => {
    if (
      String(region.latitude).substring(0, 6) ==
        String(coordiantes.latitude).substring(0, 6) &&
      String(region.longitude).substring(0, 5) ==
        String(coordiantes.longitude).substring(0, 5)
    ) {
      return false;
    } else {
      return true;
    }
  };

  const onRegionChangeComplete = (region: any) => {
    if (!checkIfShouldChangeRegion(region)) {
      return;
    }
    setMapRegion(region);
  };

  // Use useEffect instead of useFocusEffect since NavigationContainer is not available
  useEffect(() => {
    setMapKey(true);
    getUserPosition()
        .then((location: any) => {
          setCoordinates({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
          if (mapRef.current) {
            setTimeout(() => {
              mapRef.current?.animateToRegion({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              });
            }, 500);
          }
        })
        .catch((err: any) => {});
  }, []);

  const selectAddress = () => {
    publish(EVENTS.address_choosed_from_map, {
      address_latitude: mapRegion.latitude,
      address_longitude: mapRegion.longitude,
    });
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      require('@/utils/navigatorUtils').goBack();
    }
  };

  return (
    <Box
      flex={1}
      backgroundColor={'mainBackground'}
      justifyContent={'center'}
      alignItems={'center'}
    >
      {!!mapKey && (
        <MapView
          ref={mapRef}
          initialRegion={initialRegion}
          onRegionChangeComplete={onRegionChangeComplete}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            start: 0,
            end: 0,
          }}
          provider={PROVIDER_GOOGLE}
        />
      )}
      <View
        style={{
          position: 'absolute',
        }}
      >
        <View
          style={{
            height: 20,
            width: 20,
            borderWidth: 5,
            borderColor: theme.colors.primary,
            backgroundColor: 'transparent',
            borderRadius: 10,
          }}
        />
        <View
          style={{
            height: 12,
            width: 2,
            backgroundColor: theme.colors.primary,
            borderBottomEndRadius: 1,
            borderBottomStartRadius: 1,
            alignSelf: 'center',
            marginBottom: 20,
          }}
        />
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'white',
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 24,
          paddingVertical: 18,
        }}
      >
        <Text marginBottom={'s'} variant={'header'}>
          {t('chooseFromMap.chooseDestination')}
        </Text>
        <Text marginBottom={'s'} variant={'body'}>
          {t('chooseFromMap.destinationYouChoosed')}
        </Text>
        <Button label={t('confirm')} onPress={selectAddress} />
      </View>
    </Box>
  );
};

export default ChooseFromMapScreen;
