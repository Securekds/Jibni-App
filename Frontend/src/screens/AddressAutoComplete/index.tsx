import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { Box, Button, Header, Input, Text } from '@/components';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import Svg, { Path } from 'react-native-svg';
import { usePubSub } from '@/hooks';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDebounce } from 'use-debounce';
import { FlashList } from '@shopify/flash-list';
import { setDestinationData } from '@/utils/destinationStore';

const LocationSvgComponent: React.FC<any> = ({ props, strokeColor }) => {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M12 13.43a3.12 3.12 0 100-6.24 3.12 3.12 0 000 6.24z"
        stroke={strokeColor || '#185ADC'}
        strokeWidth={1.5}
      />
      <Path
        d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.194 5.194 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke={strokeColor || '#185ADC'}
        strokeWidth={1.5}
      />
    </Svg>
  );
};

function MapSvgComponent(props: any) {
  return (
    <Svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <Path
        d="M2.29 7.78v9.73c0 1.9 1.35 2.68 2.99 1.74l2.35-1.34c.51-.29 1.36-.32 1.89-.05l5.25 2.63c.53.26 1.38.24 1.89-.05l4.33-2.48c.55-.32 1.01-1.1 1.01-1.74V6.49c0-1.9-1.35-2.68-2.99-1.74l-2.35 1.34c-.51.29-1.36.32-1.89.05L9.52 3.52c-.53-.26-1.38-.24-1.89.05L3.3 6.05c-.56.32-1.01 1.1-1.01 1.73zM8.56 4v13M15.73 6.62V20"
        stroke="#185ADC"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

const AddressAutoCompleteScreen: React.FC<any> = ({ navigation, ...props }) => {
  const [currentPosition, setCurrentPosition] = useState<any>('');
  const [destination, setDestination] = useState<any>('');
  const [isSelectingSuggestion, setIsSelectingSuggestion] = useState<
    string | null
  >(null);
  const { publish, EVENTS, on, off } = usePubSub();
  const insets = useSafeAreaInsets();
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setSearching] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef(searchValue);
  const [debouncedValue] = useDebounce(searchValue, 200);
  const clientPositionRef = useRef(currentPosition);
  const [selectedInput, setSelectedInput] = useState<
    'destination' | 'clientPosition'
  >();
  const goback = () => {
    console.log('[ADDRESS] goback called, navigation:', navigation);
    if (navigation?.goBack) {
      console.log('[ADDRESS] Using navigation.goBack()');
      navigation.goBack();
    } else {
      console.log('[ADDRESS] Using navigatorUtils.goBack()');
      require('@/utils/navigatorUtils').goBack();
    }
  };
  const { t } = useTranslation();

  const ChooseFromMap = () => {
    if (navigation?.navigate) {
      navigation.navigate('ChooseFromMap');
    } else {
      require('@/utils/navigatorUtils').navigate('ChooseFromMap');
    }
  };

  useEffect(() => {
    clientPositionRef.current = currentPosition;
  }, [currentPosition]);

  const selectAddress = () => {
    console.log('[ADDRESS] selectAddress called - Button pressed!');
    console.log('[ADDRESS] Current destination state:', destination);
    console.log('[ADDRESS] Current position state:', currentPosition);
    
    // Check if destination is selected
    if (!destination?.lat || !destination?.lng) {
      console.error('[ADDRESS] Destination not selected!', destination);
      Alert.alert(
        t('addressAutoComplete.error') || 'Error',
        t('addressAutoComplete.selectDestination') || 'Please select a destination address',
      );
      return;
    }
    
    console.log('[ADDRESS] Destination is valid, proceeding...');
    
    const params = currentPosition?.lat
      ? {
          destinationCoord: {
            lat: destination.lat,
            lng: destination.lng,
          },
          userCoord: {
            lat: currentPosition?.lat,
            lng: currentPosition?.lng,
          },
        }
      : {
          destinationCoord: {
            lat: destination.lat,
            lng: destination.lng,
          },
        };
    
    console.log('[ADDRESS] ===== PUBLISHING EVENT =====');
    console.log('[ADDRESS] Event name:', EVENTS.destination_address_selected);
    console.log('[ADDRESS] Event payload:', JSON.stringify(params, null, 2));
    console.log('[ADDRESS] Event payload type:', typeof params);
    
    try {
      // Store destination data in global store (primary method)
      console.log('[ADDRESS] Storing destination data in global store...');
      setDestinationData(params);
      
      // Also publish event as backup
      console.log('[ADDRESS] Calling publish()...');
      publish(EVENTS.destination_address_selected, params);
      console.log('[ADDRESS] Event published successfully!');
      
      // Navigate back immediately
      console.log('[ADDRESS] Navigating back...');
      goback();
    } catch (error) {
      console.error('[ADDRESS] Error processing destination:', error);
      Alert.alert('Error', 'Failed to process destination. Please try again.');
    }
  };

  useEffect(() => {
    const addressToken = on(
      EVENTS.address_choosed_from_map,
      (e, { address_latitude, address_longitude }) =>
        addressSelectedFromMap({ address_latitude, address_longitude }),
    );
    return () => off(addressToken);
  }, []);

  const addressSelectedFromMap = ({
    address_latitude,
    address_longitude,
  }: {
    address_latitude: number;
    address_longitude: number;
  }) => {
    const params = clientPositionRef.current?.lat
      ? {
          destinationCoord: {
            lat: address_latitude,
            lng: address_longitude,
          },
          userCoord: {
            lat: clientPositionRef.current?.lat,
            lng: clientPositionRef.current?.lng,
          },
        }
      : {
          destinationCoord: {
            lat: address_latitude,
            lng: address_longitude,
          },
        };
    publish(EVENTS.destination_address_selected, params);
    goback();
  };

  const fetchPlaces = async (query: string) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          query,
        )}&key=AIzaSyBmTHYTBqjwA1GVvvBHPOuPP_41K6k-8bE&language=en`,
      );
      const data = await res.json();
      if (data.predictions) {
        setSuggestions(data.predictions);
      }
    } catch (e) {
      Alert.alert('genericError');
      console.log('Places API error:', e);
    }
  };

  const getPlaceDetails = async (placeId: string, placeDescription: string) => {
    if (isSelectingSuggestion) {
      return;
    }
    setIsSelectingSuggestion(placeId);
    try {
      const apiKey = 'AIzaSyBmTHYTBqjwA1GVvvBHPOuPP_41K6k-8bE';
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        if (selectedInput == 'destination') {
          console.log('[ADDRESS] Setting destination from place details:', { lat, lng, placeDescription });
          setDestination({
            lat,
            lng,
            placeDescription,
          });
        } else {
          console.log('[ADDRESS] Setting current position from place details:', { lat, lng, placeDescription });
          setCurrentPosition({
            lat,
            lng,
            placeDescription,
          });
        }
        setSearchValue(placeDescription);
      } else {
        console.warn(
          'Error fetching place details:',
          data.status,
          data.error_message,
        );
        return null;
      }
    } catch (error) {
      console.error('Fetch failed:', error);
      return null;
    } finally {
      setIsSelectingSuggestion(null);
    }
  };

  useEffect(() => {
    searchRef.current = searchValue;
    if (debouncedValue.length >= 3) {
      setSearching(true);
      fetchPlaces(debouncedValue);
    } else {
      setSearching(false);
      setSuggestions([]);
    }
  }, [debouncedValue]);

  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      <Header onPress={goback} />
      <FlashList
        keyboardShouldPersistTaps="handled"
        style={{
          flex: 1,
        }}
        data={suggestions}
        keyExtractor={(item, index) => item?.place_id + index}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 30,
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 1,
              backgroundColor: '#E2E0DC',
              marginVertical: 16,
            }}
          />
        )}
        ListHeaderComponent={
          <>
            <Text
              variant={'subheader'}
              color={'text'}
              style={{ marginBottom: 6, marginTop: 22, marginStart: 32 }}
            >
              {t('addressAutoComplete.currentPositionLabel')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <LocationSvgComponent />
              <Input
                placeholder={t('addressAutoComplete.currentPosition')}
                value={
                  currentPosition?.placeDescription ||
                  currentPosition ||
                  (selectedInput == 'clientPosition' && searchValue)
                }
                onFocus={() => {
                  setSelectedInput('clientPosition');
                  setSearchValue('');
                }}
                onChangeText={v => {
                  setSearchValue(v);
                  // Only set currentPosition to string if it's not already an object with coordinates
                  // This prevents overwriting the selected position object
                  if (!currentPosition?.lat || !currentPosition?.lng) {
                    setCurrentPosition(v);
                  }
                }}
                containerStyle={{
                  backgroundColor: '#FAFAFA',
                  borderColor: '#EDEBE8',
                  flex: 1,
                }}
                style={{
                  color: theme.colors.primary,
                  height: 46,
                }}
                placeholderTextColor={theme.colors.primary}
              />
              <View
                style={{
                  height: 72,
                  borderLeftWidth: 1,
                  borderColor: theme.colors.primary,
                  position: 'absolute',
                  top: 35,
                  left: 11,
                  borderStyle: 'dashed',
                }}
              />
            </View>
            <Text
              variant={'subheader'}
              color={'text'}
              style={{ marginBottom: 6, marginTop: 22, marginStart: 32 }}
            >
              {t('addressAutoComplete.destinationLabel')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <LocationSvgComponent />
              <Input
                placeholder={t('addressAutoComplete.destination')}
                value={
                  destination?.placeDescription ||
                  destination ||
                  (selectedInput == 'destination' && searchValue)
                }
                onChangeText={v => {
                  setSearchValue(v);
                  // Only set destination to string if it's not already an object with coordinates
                  // This prevents overwriting the selected destination object
                  if (!destination?.lat || !destination?.lng) {
                    setDestination(v);
                  }
                }}
                onFocus={() => {
                  setSelectedInput('destination');
                  setSearchValue('');
                }}
                containerStyle={{
                  backgroundColor: '#FAFAFA',
                  borderColor: '#EDEBE8',
                  flex: 1,
                }}
                style={{
                  height: 46,
                }}
              />
            </View>
            <View
              style={{
                height: 1,
                backgroundColor: '#E2E0DC',
                marginTop: 32,
                marginBottom: 20,
              }}
            />
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: '#E8EEFB',
                gap: 8,
                alignItems: 'center',
              }}
              onPress={ChooseFromMap}
            >
              <MapSvgComponent />
              <Text
                color={'primary'}
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {t('addressAutoComplete.openInMap')}
              </Text>
            </TouchableOpacity>
            {suggestions.length > 0 && (
              <>
                <View
                  style={{
                    height: 1,
                    backgroundColor: '#E2E0DC',
                    marginVertical: 20,
                  }}
                />
                <Text variant={'header'}>
                  {t('addressAutoComplete.chooseDestinationFromList')}
                </Text>
              </>
            )}
          </>
        }
        renderItem={({ item }) => {
          return (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
              }}
              onPress={() => {
                console.log('[ADDRESS] Suggestion clicked:', item.description, 'selectedInput:', selectedInput);
                getPlaceDetails(item.place_id, item.description);
              }}
            >
              {item.place_id == isSelectingSuggestion ? (
                <ActivityIndicator />
              ) : (
                <LocationSvgComponent strokeColor={'#000000CC'} />
              )}
              <View
                style={{
                  flex: 1,
                  marginStart: 5,
                }}
              >
                <Text variant={'subheader'} style={{ flex: 1 }}>
                  {item.description}
                </Text>
                <Text variant={'body'}>
                  {item.structured_formatting.secondary_text}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Button
        label={t('continue')}
        onPress={() => {
          console.log('[ADDRESS] ===== CONTINUE BUTTON PRESSED =====');
          console.log('[ADDRESS] Button state check:', {
            hasDestination: !!destination?.lat,
            destination: destination,
            destinationType: typeof destination,
            destinationIsObject: typeof destination === 'object' && destination !== null,
            currentPosition: currentPosition,
            currentPositionIsString: typeof currentPosition === 'string',
            currentPositionHasLat: currentPosition?.lat,
            disabled: !destination?.lat || (currentPosition && typeof currentPosition !== 'string' && !currentPosition?.lat),
          });
          
          // Show alert to confirm button is working
          if (!destination?.lat || !destination?.lng) {
            Alert.alert('Error', 'Please select a destination from the suggestions list');
            return;
          }
          
          console.log('[ADDRESS] Calling selectAddress()...');
          selectAddress();
        }}
        disabled={
          !destination?.lat || (currentPosition && typeof currentPosition !== 'string' && !currentPosition?.lat)
        }
        style={{
          marginHorizontal: 24,
          marginBottom: insets.bottom + 62,
        }}
      />
    </Box>
  );
};

export default AddressAutoCompleteScreen;
