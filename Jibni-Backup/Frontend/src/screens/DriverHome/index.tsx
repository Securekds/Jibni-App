import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View, TouchableOpacity, Text } from 'react-native';
import { Box } from '@/components';
import { theme } from '@/theme';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import useGPSLocation from '@/hooks/useGpsLocation';
import { useFocusEffect } from '@react-navigation/native';
import useWhiteStatusbarColor from '@/hooks/useWhiteStatusbar';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AvailabilitySection from './AvailabilitySection';
import { useAuthStore } from '@/stores/authStore';
import { useTranslation } from 'react-i18next';
import {
  useServerLocationTracker,
  useMissionSocket,
  useDriver,
  usePubSub,
} from '@/hooks';
import RequestSection from './RequestSection';
import AcceptedMissionSection from './AcceptedMissionSection';
import polyline from '@mapbox/polyline';
import { useAuth } from '@/hooks/useAuth';

const DriverHomeScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const [coordiantes, setCoordinates] = useState({
    latitudeDelta: 13,
    longitudeDelta: 13,
    latitude: 28.0339,
    longitude: 1.6596,
  });
  const { t } = useTranslation();
  const { getUserPosition } = useGPSLocation();
  const insets = useSafeAreaInsets();
  const [mapKey, setMapKey] = useState(true);
  const { user, isAuthenticated } = useAuthStore();
  const [isAccepted, setIsAccepted] = useState(false);
  const [polylineCoords, setPolylineCoords] = useState<any>();
  const { logout } = useAuth();
  const [availability, setAvailability] = useState(() =>
    user?.isAvailable != null ? user?.isAvailable : true,
  );
  const { on, off, EVENTS } = usePubSub();
  useWhiteStatusbarColor();
  const { isLoading, toogleAvailability } = useDriver();

  const handleLogout = async () => {
    Alert.alert(
      t('logout') || 'Logout',
      t('logoutConfirm') || 'Are you sure you want to logout?',
      [
        {
          text: t('cancel') || 'Cancel',
          style: 'cancel',
        },
        {
          text: t('logout') || 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ],
    );
  };

  useEffect(() => {
    //logout()
    setAvailability(() =>
      user?.isAvailable != null ? user?.isAvailable : true,
    );
  }, [user]);

  // Fetch current availability status from backend when component mounts
  useEffect(() => {
    if (user?.role === 'server' && isAuthenticated) {
      const fetchAvailability = async () => {
        try {
          const { driverApi } = await import('@/services/api');
          const response = await driverApi.getAvailability();
          if (response.status === 'success' && response.open_to_work !== undefined) {
            console.log('[DRIVER-HOME] Fetched availability from backend:', response.open_to_work);
            setAvailability(response.open_to_work);
            // Update store with current availability
            const { toogleAvailability } = useAuthStore.getState();
            toogleAvailability(response.open_to_work);
          }
        } catch (error) {
          console.error('[DRIVER-HOME] Error fetching availability:', error);
          // If fetch fails, use stored value or default to true
          if (user?.isAvailable === null || user?.isAvailable === undefined) {
            setAvailability(true);
          }
        }
      };
      fetchAvailability();
    }
  }, [user?.role, isAuthenticated]);

  async function getETA(
    origin: { lat: string; lng: string },
    destination: { lat: string; lng: string },
  ) {
    const apiKey = 'AIzaSyBmTHYTBqjwA1GVvvBHPOuPP_41K6k-8bE';
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}&mode=driving&key=${apiKey}`;

    try {
      console.log('try get eta');
      const res = await fetch(url);
      const data = await res.json();

      console.log(data.routes[0].legs, 'routes');
      if (data.routes.length) {
        const leg = data.routes[0].legs[0];
        const points = polyline.decode(data.routes[0].overview_polyline.points);
        const routeCoords = points.map(([lat, lng]: any[]) => ({
          latitude: lat,
          longitude: lng,
        }));
        setPolylineCoords(routeCoords);
        console.log(leg.distance, leg.duration);
        return {
          eta: leg.duration.text,
          distance: leg.distance.text,
        };
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  // Server location tracking hook
  const { isTracking, currentLocation, startTracking, stopTracking } =
    useServerLocationTracker(10000); // Update every 10 seconds

  // Mission WebSocket connection hook (no data sending, just listening)
  const {
    isConnected: isMissionConnected,
    request: missionRequest,
    isAccepting,
    isRejecting,
  } = useMissionSocket();

  const [request, setRequest] = useState(missionRequest);

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

  useEffect(() => {
    const token = on(EVENTS.mission_accepted, () => {
      setIsAccepted(true);
    });

    const expirationToken = on(EVENTS.mission_expired, () => {
      setRequest(null);
    });

    return () => {
      off(token);
      off(expirationToken);
    };
  }, []);

  useEffect(() => {
    setRequest(missionRequest);
    console.log(missionRequest, 'mission request');
    if (missionRequest?.lat && coordiantes.latitude && coordiantes.longitude)
      getETA(
        { lat: missionRequest.client_lat, lng: missionRequest.client_lng },
        {
          lat: String(coordiantes.latitude),
          lng: String(coordiantes.longitude),
        },
      );
  }, [missionRequest]);

  useEffect(() => {
    if (request && isAccepted) {
      getUserPosition().then((location: any) => {
        setTimeout(() => {
          mapRef.current?.fitToCoordinates(
            [
              {
                latitude: Number(request?.lat),
                longitude: Number(request?.lng),
              },
              {
                latitude: Number(location.coords.latitude),
                longitude: Number(location.coords.longitude),
              },
            ],
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            },
          );
        }, 200);
        setCoordinates({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      });
    }
  }, [isAccepted]);

  const onToogleAvailability = async () => {
    if (isLoading) {
      return;
    }
    try {
      const response = await toogleAvailability();
      if (response.status == 'Success.') {
        setAvailability(response.open_to_work);
      } else if (
        response.message == 'Please wait before changing availability again.'
      ) {
        Alert.alert(t('home.tooManyToogleRequest'));
      } else {
        Alert.alert('genericError');
      }
    } catch (err) {
      Alert.alert('genericError');
    }
  };

  // Use useEffect instead of useFocusEffect since NavigationContainer is not available
  useEffect(() => {
    setMapKey(false);
    setTimeout(() => {
      setMapKey(true);
    }, 0);
    getUserPosition()
      .then((location: any) => {
          setCoordinates({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
          const interval = setInterval(() => {
            if (mapRef.current) {
              clearInterval(interval);
              setTimeout(() => {
                mapRef.current?.animateToRegion({
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                });
              }, 500);
            }
          }, 500);
        })
        .catch((err: any) => {});
    return () => {};
  }, []);

  return (
    <Box
      flex={1}
      backgroundColor={'mainBackground'}
      justifyContent={'center'}
      alignItems={'center'}
    >
      <View
        style={{
          position: 'absolute',
          top: insets.top + 10,
          left: 0,
          right: 0,
          zIndex: 9999,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        <View style={{ flex: 1 }} />
        <BlastedImage
          source={require('@/assets/header_logo.png')}
          style={{
            width: 70,
            height: 24,
            alignSelf: 'center',
          }}
        />
        <TouchableOpacity
          onPress={handleLogout}
          style={{
            padding: 8,
            borderRadius: 8,
            backgroundColor: 'rgba(0,0,0,0.1)',
          }}
        >
          <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '600' }}>
            {t('logout') || 'Logout'}
          </Text>
        </TouchableOpacity>
      </View>
      {request && !isAccepted ? (
        <RequestSection
          request={request}
          setRequest={setRequest}
          isAccepting={isAccepting}
          isRejecting={isRejecting}
        />
      ) : !isAccepted ? (
        <AvailabilitySection
          onToogleAvailability={onToogleAvailability}
          isToogling={isLoading}
          available={availability}
        />
      ) : (
        isAccepted && request && <AcceptedMissionSection request={request} />
      )}
      {!!mapKey && (
        <MapView
          ref={mapRef}
          initialRegion={{
            latitudeDelta: 13,
            longitudeDelta: 13,
            latitude: 28.0339,
            longitude: 1.6596,
          }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            start: 0,
            end: 0,
          }}
          provider={PROVIDER_GOOGLE}
        >
          {isAccepted && request && (
            <>
              <Marker
                coordinate={{
                  latitude: Number(coordiantes.latitude),
                  longitude: Number(coordiantes.longitude),
                }}
              >
                <View
                  style={{
                    height: 42,
                    width: 42,
                    borderRadius: 21,
                    backgroundColor: '#FEC846',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#185ADC',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        height: 10,
                        width: 10,
                        backgroundColor: '#185ADC',
                        borderRadius: 5,
                      }}
                    />
                  </View>
                </View>
              </Marker>

              <Marker
                coordinate={{
                  latitude: Number(request.client_lat),
                  longitude: Number(request.client_lng),
                }}
              >
                <View
                  style={{
                    height: 42,
                    width: 42,
                    borderRadius: 21,
                    backgroundColor: '#FEC846',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#185ADC',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <View
                      style={{
                        height: 10,
                        width: 10,
                        backgroundColor: '#185ADC',
                        borderRadius: 5,
                      }}
                    />
                  </View>
                </View>
              </Marker>
              {polylineCoords && (
                <Polyline
                  coordinates={polylineCoords}
                  strokeColor="#0000FF"
                  strokeWidth={4}
                />
              )}
            </>
          )}
        </MapView>
      )}
      {!(isAccepted && request) && (
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
      )}
    </Box>
  );
};

export default DriverHomeScreen;
