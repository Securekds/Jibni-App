import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Box, Text } from '@/components';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { useMissionSocket } from '@/hooks';
import { DateTime } from 'luxon';

const { width: deviceWidth } = Dimensions.get('window');

const RequestSection: React.FC<{
  request: any;
  isAccepting: boolean;
  isRejecting: boolean;
  setRequest: (param:any) => void;
}> = ({ request, isAccepting, isRejecting, setRequest }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const { acceptMission, rejectMission } = useMissionSocket();
  const [remainingSeconds, setRemainingSeconds] = useState<string | null>(null);
  const [isRequestExpired, setIsRequestExpired] = useState<boolean | null>(
    null,
  );

  const getRemainingTimeToExpire = () => {
    if (request) {
      const jsDate = new Date(request?.createdAt);
      const luxonDate = DateTime.fromJSDate(jsDate);
      const diff = Math.floor(
        DateTime.now().diff(luxonDate, 'seconds').seconds,
      );
      const remainingSeconds = 60 - diff;
      if (remainingSeconds < 0) {
        return null;
      }
      return remainingSeconds < 10
        ? `00: 0${remainingSeconds}`
        : `00: ${remainingSeconds}`;
    } else {
      return null;
    }
  };

  useEffect(() => {
    if(isRequestExpired){
      setRequest(null)
    }
  }, [isRequestExpired]);

  useEffect(() => {
    if (request) {
      const interval = setInterval(() => {
        const time = getRemainingTimeToExpire();
        setRemainingSeconds(time);
        if (time === null) {
          setIsRequestExpired(true);
          clearInterval(interval);
        } else {
          setIsRequestExpired(false);
        }
      }, 100);
    }
  }, [request]);

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 1000);
  }, []);

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
            color={'primary'}
            style={{
              flex: 1,
            }}
          >
            {t('home.requestAwaiting')}
          </Text>
          {remainingSeconds && (
            <View
              style={{
                height: 34,
                justifyContent: 'center',
                backgroundColor: '#FFE2E2',
                borderRadius: 8,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: theme.colors.danger,
              }}
            >
              <Text variant={'body'} color={'danger'}>
                {'\u202A'}
                {remainingSeconds}
                {'\u202C'}
              </Text>
            </View>
          )}
        </View>
        <Text
          variant={'body'}
          style={{
            marginTop: 8,
          }}
        >
          {t('home.clientNeedsHelp')}
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
          }}
        >
          <BlastedImage
            source={require('@/assets/blue_location.png')}
            style={{
              height: 24,
              width: 24,
              marginEnd: 8,
            }}
          />
          <Text variant={'body'} style={{}}>
            {t('home.clientPlace')}
            <Text color={'primary'}>{t('home.away')}</Text>
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginVertical: 24,
          }}
        >
          <BlastedImage
            source={require('@/assets/blue_location.png')}
            style={{
              height: 24,
              width: 24,
              marginEnd: 8,
            }}
          />
          <Text variant={'body'} style={{}}>
            {t('home.clientDestination')}
            <Text color={'primary'}>حي السلام رقم 1</Text>
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
          }}
        >
          <BlastedImage
            source={require('@/assets/wallet.png')}
            style={{
              height: 24,
              width: 24,
              marginEnd: 8,
            }}
          />
          <Text variant={'body'} style={{}}>
            {t('home.price')}
            <Text color={'primary'}>{request.price} {t('home.currency')}</Text>
          </Text>
        </View>
        <View
          style={{
            height: 1,
            backgroundColor: '#E2E0DC',
            marginVertical: 24,
          }}
        />
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: theme.colors.primary,
          }}
          onPress={() => acceptMission(request.mission_id)}
        >
          {isAccepting ? (
            <ActivityIndicator color={'white'} />
          ) : (
            <BlastedImage
              source={require('@/assets/accept_request.png')}
              style={{
                height: 24,
                width: 24,
                marginEnd: 8,
              }}
            />
          )}
          <Text variant={'body'} color={'buttonText'}>
            {t('home.acceptRequest')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 12,
            backgroundColor: '#FFE2E2',
            borderWidth: 1,
            borderColor: theme.colors.danger,
            marginTop: 24,
          }}
          onPress={() => rejectMission(request.mission_id)}
        >
          {isRejecting ? (
            <ActivityIndicator color={'white'} />
          ) : (
            <BlastedImage
              source={require('@/assets/reject_request.png')}
              style={{
                height: 24,
                width: 24,
                marginEnd: 8,
              }}
            />
          )}
          <Text variant={'body'} color={'danger'}>
            {t('home.rejectRequest')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    )
  );
};

export default RequestSection;
