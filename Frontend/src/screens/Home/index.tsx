import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View, TouchableOpacity, Text } from 'react-native';
import { Box } from '@/components';
import { theme } from '@/theme';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import useGPSLocation from '@/hooks/useGpsLocation';
import DriverSection from './DriverSection';
import DestinationSection from './DestinationSection';
import { navigate } from '@/utils/navigatorUtils';
// Removed useFocusEffect - it requires NavigationContainer
// We'll use useEffect instead
import useWhiteStatusbarColor from '@/hooks/useWhiteStatusbar';
import { useClient, useClientMissionSocket, usePubSub } from '@/hooks';
import NearServersSection from './NearServersSection';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import AcceptedMissionSection from './AcceptedMissionSection';
import polyline from '@mapbox/polyline';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDestinationData } from '@/utils/destinationStore';

const HomeScreen: React.FC = () => {
  const mapRef = useRef<MapView>(null);
  const { isLoading, getNearServers } = useClient();
  const [coordiantes, setCoordinates] = useState({
    latitudeDelta: 13,
    longitudeDelta: 13,
    latitude: 28.0339,
    longitude: 1.6596,
  });
  const [isMapReady, setIsMapReady] = useState(false);
  const { getUserPosition } = useGPSLocation();
  const [userPosition, setUserPosition] = useState<any>();
  const [mapKey, setMapKey] = useState(false);
  const [page, setPage] = useState(1);
  const { on, off, EVENTS } = usePubSub();
  useWhiteStatusbarColor();
  const isMapReadyRef = useRef(false);
  const [nearServers, setNearServers] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [helpCenterPhone, setHelpCenterPhone] = useState('');
  const [destinationPosition, setDestinationPosition] = useState<any>();
  const [isMissionAccepted, setIsMissionAccepted] = useState(false);
  const [isMissionRejected, setIsMissionRejected] = useState(false);
  const [polylineCoords, setPolylineCoords] = useState<any>();
  const { logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [currentClientPosition, setCurrentClientPosition] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState<{
    serverId: string;
    requestedAt: any;
  } | null>(null);
  const [isSelectingServer, setisSelectingServer] = useState<string | null>(
    null,
  );
  // New: Driver tracking state
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number; lng: number} | null>(null);
  const [missionStatus, setMissionStatus] = useState<'pending' | 'accepted' | 'on_the_way' | 'arrived' | 'completed' | 'canceled'>('pending');
  const driverLocationRef = useRef<{lat: number; lng: number} | null>(null);
  const { t } = useTranslation();
  const { connect, isConnected, isConnecting } = useClientMissionSocket();
  const userPositionRef = useRef(userPosition);

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
    userPositionRef.current = userPosition;
    //logout()
  }, [userPosition]);

  const requestDriver = async (serverId: string) => {
    if (isConnecting) {
      return;
    }
    
    // Get coordinates with fallback to handle both {lat, lng} and {latitude, longitude} formats
    const getLat = (pos: any) => pos?.latitude || pos?.lat;
    const getLng = (pos: any) => pos?.longitude || pos?.lng;
    
    // Validate coordinates before sending
    const clientLat = getLat(currentClientPosition) || getLat(userPosition);
    const clientLng = getLng(currentClientPosition) || getLng(userPosition);
    const destLat = getLat(destinationPosition);
    const destLng = getLng(destinationPosition);
    
    console.log('[HOME] requestDriver called with:', {
      serverId,
      clientLat,
      clientLng,
      destLat,
      destLng,
      userPosition,
      currentClientPosition,
      destinationPosition,
      userPositionRef: userPositionRef.current,
    });
    
    // Validate all coordinates are valid numbers
    if (
      clientLat == null || 
      clientLng == null || 
      destLat == null || 
      destLng == null ||
      isNaN(Number(clientLat)) || 
      isNaN(Number(clientLng)) || 
      isNaN(Number(destLat)) || 
      isNaN(Number(destLng))
    ) {
      console.error('[HOME] Invalid coordinates for mission request:', {
        clientLat,
        clientLng,
        destLat,
        destLng,
        userPosition,
        currentClientPosition,
        destinationPosition,
      });
      Alert.alert(
        t('genericError') || 'Error',
        'Invalid location data. Please ensure your location is enabled and try selecting your destination again.',
      );
      return;
    }
    
    setIsMissionAccepted(false);
    setIsMissionRejected(false);
    
    console.log('[HOME] Connecting to mission WebSocket with valid coordinates');
    connect(
      serverId,
      Number(clientLat),
      Number(clientLng),
      Number(destLat),
      Number(destLng),
    );
    setisSelectingServer(serverId);
  };

  useEffect(() => {
    if (isSelectingServer && isConnected) {
      const now = DateTime.now().toJSDate().toString();
      setSelectedServer({
        serverId: isSelectingServer,
        requestedAt: now,
      });
      setTimeout(() => {
        setisSelectingServer(null);
      }, 100);
    }
  }, [isConnecting, isConnected, isSelectingServer]);

  const selectAddress = () => {
    navigate('AddressAutoComplete');
  };

  useEffect(() => {
    isMapReadyRef.current = isMapReady;
  }, [isMapReady]);

  useEffect(() => {
    if (isMissionAccepted) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            {
              latitude: Number(
                currentClientPosition?.latitude || userPosition?.latitude,
              ),
              longitude: Number(
                currentClientPosition?.longitude || userPosition?.longitude,
              ),
            },
            {
              latitude: Number(destinationPosition.latitude),
              longitude: Number(destinationPosition.longitude),
            },
          ],
          {
            edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true,
          },
        );
      }, 200);
    }
  }, [isMissionAccepted]);

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
          eta: leg.duration.value,
          distance: leg.distance.value,
        };
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  type coordiantes = {
    lat: string;
    lng: string;
  };
  const onGetNearServers = useCallback(async (
    clientCoords: { lat: string | number; lng: string | number },
    distinationCoords: { lat: string | number; lng: string | number },
    eta: string | number | undefined,
    distance: string | number | undefined,
  ) => {
    console.log('[HOME] onGetNearServers called:', {
      clientCoords,
      distinationCoords,
      eta,
      distance,
      isLoading,
    });
    
    if (isLoading) {
      console.log('[HOME] Already loading, skipping...');
      return;
    }
    
    try {
      // Convert ETA and distance to numbers if they're strings
      let durationNum = 0;
      let distanceNum = 0;
      
      if (eta) {
        if (typeof eta === 'string') {
          // Extract number from string like "15 mins" or "15 min"
          const etaMatch = eta.match(/(\d+)/);
          if (etaMatch) {
            durationNum = parseInt(etaMatch[1], 10);
          }
        } else {
          durationNum = eta;
        }
      }
      
      if (distance) {
        if (typeof distance === 'string') {
          // Extract number from string like "5.2 km" or "2.5 mi"
          const distMatch = distance.match(/(\d+\.?\d*)/);
          if (distMatch) {
            distanceNum = parseFloat(distMatch[1]);
          }
        } else {
          distanceNum = distance;
        }
      }
      
      console.log('[HOME] Calling getNearServers API with:', {
        lat: String(clientCoords.lat),
        lng: String(clientCoords.lng),
        dist_lat: String(distinationCoords.lat),
        dist_lng: String(distinationCoords.lng),
        duration: durationNum,
        distance: distanceNum,
      });
      
      const response = await getNearServers({
        lat: String(clientCoords.lat),
        lng: String(clientCoords.lng),
        dist_lat: String(distinationCoords.lat),
        dist_lng: String(distinationCoords.lng),
        duration: durationNum,
        distance: distanceNum,
      });
      
      console.log('[HOME] getNearServers API response:', response);
      
      // Check if response has results array
      if (response?.results && Array.isArray(response.results)) {
        setNearServers(response.results);
        console.log('[HOME] Found', response.results.length, 'nearby servers');
      } else if (
        response?.message?.includes('No nearby servers found') ||
        response?.status === 404 ||
        (response?.success === true && response?.status === 404)
      ) {
        // Handle "no servers found" response (404 from backend)
        const message = response.message || response.error || 'No nearby servers found';
        const phone = response.phone || message.match(/(\d+)/)?.[1] || '0778669194';
        setError(t('home.serversNotFound') || 'No nearby drivers found');
        setHelpCenterPhone(phone);
        setNearServers([]); // Clear any previous results
        console.log('[HOME] No nearby servers found, phone:', phone);
      } else if (response.status === 'NETWORK_ERROR') {
        console.error('[HOME] Network error:', response.message);
        Alert.alert(
          'Network Error',
          response.message || 'Cannot connect to server. Please check if the backend is running.',
        );
        setError('Network error - Cannot connect to server');
      } else {
        console.error('[HOME] Unexpected response:', response);
        Alert.alert(
          t('genericError') || 'Error',
          response.message || 'Unknown error occurred while searching for drivers',
        );
        setError(response.message || 'Unknown error');
      }
    } catch (err: any) {
      console.error('[HOME] Error in onGetNearServers:', err);
      const errorMessage = err.message || 'Failed to search for drivers';
      Alert.alert(t('genericError') || 'Error', errorMessage);
      setError(errorMessage);
    }
  }, [isLoading, getNearServers, t]);

  useEffect(() => {
    console.log('[HOME] Setting up destination_address_selected event listener...');
    console.log('[HOME] Event name:', EVENTS.destination_address_selected);
    console.log('[HOME] onGetNearServers function:', typeof onGetNearServers);
    console.log('[HOME] getUserPosition function:', typeof getUserPosition);
    
    const nearServersToken = on(
      EVENTS.destination_address_selected,
      (e: any, data: any) => {
        console.log('[HOME] ===== EVENT RECEIVED =====');
        console.log('[HOME] Event name:', e);
        console.log('[HOME] Event data:', data);
        console.log('[HOME] Data type:', typeof data);
        console.log('[HOME] destinationCoord:', data?.destinationCoord);
        console.log('[HOME] userCoord:', data?.userCoord);
        
        const { destinationCoord, userCoord } = data || {};
        
        console.log('[HOME] Parsed destinationCoord:', destinationCoord);
        console.log('[HOME] Parsed userCoord:', userCoord);
        console.log('[HOME] Current user position:', userPositionRef.current);
        
        if (!destinationCoord?.lat || !destinationCoord?.lng) {
          console.error('[HOME] Invalid destination coordinates:', destinationCoord);
          Alert.alert(t('genericError') || 'Error', 'Invalid destination address');
          return;
        }
        
        setDestinationPosition({
          latitude: destinationCoord.lat,
          longitude: destinationCoord.lng,
        });
        
        if (userCoord) {
          setCurrentClientPosition({
            latitude: userCoord.lat,
            longitude: userCoord.lng,
          });
        }
        
        // Convert userCoord to consistent format if needed
        const userCoords = userCoord 
          ? {
              lat: userCoord.lat || userCoord.latitude,
              lng: userCoord.lng || userCoord.longitude,
            }
          : {
              lat: userPositionRef.current?.latitude || userPositionRef.current?.lat,
              lng: userPositionRef.current?.longitude || userPositionRef.current?.lng,
            };
        
        if (!userCoords?.lat || !userCoords?.lng) {
          console.error('[HOME] User position not available, trying to get location...');
          getUserPosition()
            .then((location: any) => {
              const userPos = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setUserPosition(userPos);
              userPositionRef.current = userPos;
              
              const coords = {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              };
              
              getETA(destinationCoord, coords)
                .then(r => {
                  console.log('[HOME] ETA calculated:', r);
                  onGetNearServers(
                    coords,
                    { lat: destinationCoord.lat, lng: destinationCoord.lng },
                    r?.eta,
                    r?.distance,
                  );
                })
                .catch((err) => {
                  console.error('[HOME] Error getting ETA:', err);
                  // Continue without ETA
                  onGetNearServers(
                    coords,
                    { lat: destinationCoord.lat, lng: destinationCoord.lng },
                    undefined,
                    undefined,
                  );
                });
            })
            .catch((err) => {
              console.error('[HOME] Error getting user position:', err);
              Alert.alert(t('genericError') || 'Error', 'Could not get your location');
            });
          return;
        }
        
        getETA(destinationCoord, userCoords)
          .then(r => {
            console.log('[HOME] ETA calculated:', r);
            onGetNearServers(
              userCoords,
              { lat: destinationCoord.lat, lng: destinationCoord.lng },
              r?.eta,
              r?.distance,
            );
          })
          .catch((err) => {
            console.error('[HOME] Error getting ETA:', err);
            // Continue without ETA
            onGetNearServers(
              userCoords,
              { lat: destinationCoord.lat, lng: destinationCoord.lng },
              undefined,
              undefined,
            );
          });
      },
    );

    // Handle mission acceptance (backward compatibility)
    const missionResponseToken = on(EVENTS.mission_accepted, () => {
      console.log('[HOME] Mission accepted event received');
      setIsMissionAccepted(true);
      setMissionStatus('accepted');
    });
    
    // Handle detailed driver acceptance with driver info
    const driverAcceptedToken = on(EVENTS.driver_accepted, (e: any, data: any) => {
      console.log('[HOME] Driver accepted with details:', data);
      setIsMissionAccepted(true);
      setMissionStatus('accepted');
      
      if (data?.driver) {
        setDriverInfo(data.driver);
      }
      
      if (data?.driverLocation) {
        const loc = {
          lat: data.driverLocation.lat,
          lng: data.driverLocation.lng,
        };
        setDriverLocation(loc);
        driverLocationRef.current = loc;
        
        // Update map to show driver location
        if (mapRef.current && isMapReadyRef.current) {
          mapRef.current.fitToCoordinates(
            [
              {
                latitude: currentClientPosition?.latitude || userPosition?.latitude,
                longitude: currentClientPosition?.longitude || userPosition?.longitude,
              },
              {
                latitude: loc.lat,
                longitude: loc.lng,
              },
            ],
            {
              edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
              animated: true,
            },
          );
        }
      }
    });
    
    // Handle real-time driver location updates
    const driverLocationToken = on(EVENTS.driver_location_update, (e: any, data: any) => {
      console.log('[HOME] Driver location update:', data);
      if (data?.lat && data?.lng) {
        // Update location even if mission not yet marked as accepted (might be in transition)
        const loc = {
          lat: data.lat,
          lng: data.lng,
        };
        setDriverLocation(loc);
        const prevLoc = driverLocationRef.current;
        driverLocationRef.current = loc;
        
        // Update map camera to follow driver (smooth animation)
        if (mapRef.current && isMapReadyRef.current) {
          // Only update if driver moved significantly (to avoid jitter)
          if (prevLoc) {
            const distance = Math.sqrt(
              Math.pow(loc.lat - prevLoc.lat, 2) + Math.pow(loc.lng - prevLoc.lng, 2)
            );
            
            // Update camera if driver moved more than ~0.0001 degrees (~11 meters)
            if (distance > 0.0001) {
              mapRef.current.animateToCoordinate(
                {
                  latitude: loc.lat,
                  longitude: loc.lng,
                },
                1000, // Animation duration
              );
            }
          } else {
            // First location update - just set it
            mapRef.current.animateToCoordinate(
              {
                latitude: loc.lat,
                longitude: loc.lng,
              },
              500,
            );
          }
        }
      }
    });
    
    const rejectedMissionToken = on(EVENTS.mission_rejected, () => {
      setIsMissionRejected(true);
      setMissionStatus('canceled');
      setDriverInfo(null);
      setDriverLocation(null);
    });

    return () => {
      console.log('[HOME] Cleaning up event listeners...');
      off(nearServersToken);
      off(missionResponseToken);
      off(driverAcceptedToken);
      off(driverLocationToken);
      off(rejectedMissionToken);
    };
  }, [onGetNearServers, getUserPosition, on, off, EVENTS, isMissionAccepted, currentClientPosition, userPosition]);

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
          const userPos = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserPosition(userPos);
          userPositionRef.current = userPos;
          const interval = setInterval(() => {
            if (mapRef.current && isMapReadyRef.current) {
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
  }, []);

  // Check for destination data from global store when component mounts/updates
  useEffect(() => {
    // Check for destination data every time component renders (when navigating back)
    const checkDestinationData = () => {
      const destData = getDestinationData();
      if (destData?.destinationCoord) {
        console.log('[HOME] Found destination data in store, triggering search:', destData);
        const { destinationCoord, userCoord } = destData;
        
        if (!destinationCoord?.lat || !destinationCoord?.lng) {
          console.error('[HOME] Invalid destination coordinates from store:', destinationCoord);
          return;
        }
        
        setDestinationPosition({
          latitude: destinationCoord.lat,
          longitude: destinationCoord.lng,
        });
        
        if (userCoord) {
          setCurrentClientPosition({
            latitude: userCoord.lat,
            longitude: userCoord.lng,
          });
        }
        
        // Convert userCoord to consistent format if needed
        const userCoords = userCoord 
          ? {
              lat: userCoord.lat || userCoord.latitude,
              lng: userCoord.lng || userCoord.longitude,
            }
          : {
              lat: userPositionRef.current?.latitude || userPositionRef.current?.lat,
              lng: userPositionRef.current?.longitude || userPositionRef.current?.lng,
            };
        
        if (!userCoords?.lat || !userCoords?.lng) {
          console.log('[HOME] Getting user position for search...');
          getUserPosition()
            .then((location: any) => {
              const userPos = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              };
              setUserPosition(userPos);
              userPositionRef.current = userPos;
              
              const coords = {
                lat: location.coords.latitude,
                lng: location.coords.longitude,
              };
              
              getETA(destinationCoord, coords)
                .then(r => {
                  console.log('[HOME] ETA calculated from store data:', r);
                  onGetNearServers(
                    coords,
                    { lat: destinationCoord.lat, lng: destinationCoord.lng },
                    r?.eta,
                    r?.distance,
                  );
                })
                .catch((err) => {
                  console.error('[HOME] Error getting ETA from store data:', err);
                  onGetNearServers(
                    coords,
                    { lat: destinationCoord.lat, lng: destinationCoord.lng },
                    undefined,
                    undefined,
                  );
                });
            })
            .catch((err) => {
              console.error('[HOME] Error getting user position from store data:', err);
            });
          return;
        }
        
        getETA(destinationCoord, userCoords)
          .then(r => {
            console.log('[HOME] ETA calculated from store data:', r);
            onGetNearServers(
              userCoords,
              { lat: destinationCoord.lat, lng: destinationCoord.lng },
              r?.eta,
              r?.distance,
            );
          })
          .catch((err) => {
            console.error('[HOME] Error getting ETA from store data:', err);
            onGetNearServers(
              userCoords,
              { lat: destinationCoord.lat, lng: destinationCoord.lng },
              undefined,
              undefined,
            );
          });
      }
    };
    
    // Check immediately
    checkDestinationData();
    
    // Also check after a short delay (in case component renders before data is set)
    const timeout = setTimeout(checkDestinationData, 300);
    
    return () => clearTimeout(timeout);
  }, [onGetNearServers, getUserPosition]);

  const handleBecomeDriver = () => {
    navigate('BecomeDriver');
  };

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
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
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
      {!!mapKey && (
        <MapView
          onMapReady={() => setIsMapReady(true)}
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
          {isMissionAccepted && (
            <>
              {/* Client position marker */}
              <Marker
                coordinate={{
                  latitude: Number(
                    currentClientPosition?.latitude || userPosition?.latitude,
                  ),
                  longitude: Number(
                    currentClientPosition?.longitude || userPosition?.longitude,
                  ),
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

              {/* Driver location marker (real-time) */}
              {driverLocation && (
                <Marker
                  coordinate={{
                    latitude: driverLocation.lat,
                    longitude: driverLocation.lng,
                  }}
                  identifier="driver"
                >
                  <View
                    style={{
                      height: 50,
                      width: 50,
                      borderRadius: 25,
                      backgroundColor: '#4CAF50',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: 3,
                      borderColor: '#FFFFFF',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 3.84,
                      elevation: 5,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }}>
                      🚗
                    </Text>
                  </View>
                </Marker>
              )}

              {/* Destination marker */}
              <Marker
                coordinate={{
                  latitude: Number(destinationPosition?.latitude),
                  longitude: Number(destinationPosition?.longitude),
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
              
              {/* Route polyline */}
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
      <DriverSection handleBecomeDriver={handleBecomeDriver} />
      {isMissionAccepted ? (
        <AcceptedMissionSection
          mission={{}}
          server={
            driverInfo || nearServers.filter(item => item?.id == selectedServer?.serverId)[0]
          }
          driverLocation={driverLocation}
          missionStatus={missionStatus}
        />
      ) : isLoading || error || nearServers.length > 0 ? (
        <NearServersSection
          servers={nearServers}
          isLoading={isLoading}
          onRequest={() => {}}
          requestedServer={1}
          error={error}
          isRejected={isMissionRejected}
          tryOtherDestination={() => {
            setError('');
            setNearServers([]);
            setSelectedServer(null);
            setIsMissionRejected(false);
          }}
          helpCenterPhone={helpCenterPhone}
          requestDriver={requestDriver}
          isSelectingServer={isConnecting ? isSelectingServer : null}
          selectedServer={selectedServer}
        />
      ) : (
        <DestinationSection onSelectAddress={selectAddress} />
      )}
      {!isMissionAccepted && (
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

export default HomeScreen;
