import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Box, Text } from '@/components';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useMissionSocket } from '@/hooks';
import { DateTime } from 'luxon';
import Svg, { Path } from 'react-native-svg';

const { width: deviceWidth } = Dimensions.get('window');

const LocationSvgComponent = (props: any) => {
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
        stroke="#185ADC"
        strokeWidth={1.5}
      />
      <Path
        d="M3.62 8.49c1.97-8.66 14.8-8.65 16.76.01 1.15 5.08-2.01 9.38-4.78 12.04a5.194 5.194 0 01-7.21 0c-2.76-2.66-5.92-6.97-4.77-12.05z"
        stroke="#185ADC"
        strokeWidth={1.5}
      />
    </Svg>
  );
};

const AcceptedMissionSection: React.FC<{
  request: any;
}> = ({ request }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const { acceptMission, rejectMission } = useMissionSocket();

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 1000);
  }, []);

  const callPhoneNumber = () => {
    if (request?.phone_number) {
      Linking.openURL(`tel:${request?.phone_number}`);
    }
  };

  console.log(request, "io")

  return (
    visible && (
      <Animated.View
        entering={SlideInDown}
        style={{
          position: 'absolute',
          bottom: 0,
          width: deviceWidth - 32,
          backgroundColor: 'white',
          paddingHorizontal: 24,
          paddingTop: 12,
          marginBottom: 12 + insets.bottom,
          paddingBottom: 22,
          borderRadius: 33,
          zIndex: 9999,
        }}
      >
        <View
          style={{
            height: 2,
            backgroundColor: '#00000033',
            borderRadius: 2,
            width: 106,
            alignSelf: 'center',
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 28,
          }}
        >
          <Text
            variant={'header'}
            color={'text'}
            style={{
              flex: 1,
            }}
          >
            {t('home.driverInRoute')}
          </Text>
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: '#E2E0DC',
            marginVertical: 24,
          }}
        />

        <View
          style={{
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <LocationSvgComponent />
          <View>
            <Text variant={'body'}>{t('home.clientPosition')}</Text>
            <Text
              variant={'body'}
              color={'primary'}
              style={{
                fontSize: 14,
              }}
            >
              10 د , 3.4كم
            </Text>
          </View>
          <View
            style={{
              height: 25,
              borderLeftWidth: 1,
              borderColor: theme.colors.primary,
              position: 'absolute',
              top: 25,
              left: 11,
              borderStyle: 'dashed',
            }}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            gap: 8,
          }}
        >
          <LocationSvgComponent />
          <View>
            <Text variant={'body'}>حي السلام رقم 19</Text>
          </View>
        </View>

        <Text
          color={'text'}
          style={{
            fontSize: 20,
          }}
        >
          {t('home.price')}
          <Text color={'primary'}>{request.price} {t('home.currency')}</Text>
        </Text>
        <View
          style={{
            height: 1,
            backgroundColor: '#E2E0DC',
            marginVertical: 24,
          }}
        />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <TouchableOpacity
            onPress={callPhoneNumber}
            style={{
              height: 48,
              flexDirection: 'row',
              flex: 1,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: theme.colors.primary,
              backgroundColor: '#E8EEFB',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <BlastedImage
              source={require('@/assets/phone.png')}
              style={{
                height: 24,
                width: 24,
              }}
            />
            <Text variant={'subheader'} color={'primary'}>
              {t('home.callClient')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={()=> rejectMission(request.mission_id)}
          >
            <BlastedImage
              source={require('@/assets/close.png')}
              style={{
                height: 48,
                width: 48,
              }}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    )
  );
};

export default AcceptedMissionSection;
