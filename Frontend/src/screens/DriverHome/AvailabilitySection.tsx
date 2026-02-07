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

const { width: deviceWidth } = Dimensions.get('window');

const AvailabitySection: React.FC<{
  available: boolean;
  isToogling: boolean;
  onToogleAvailability: () => void;
}> = ({ onToogleAvailability, available, isToogling }) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

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
          bottom: insets.bottom + 53,
          width: deviceWidth - 32,
          backgroundColor: 'white',
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: 12,
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
          }}
        >
          <Text
            variant={'header'}
            fontWeight={600}
            style={{
              marginTop: 18,
              flex: 1,
            }}
          >
            {t('home.welcome')}
          </Text>
          <TouchableOpacity>
            <Text
              color={'primary'}
              style={{
                textDecorationLine: 'underline',
              }}
            >
              {t('home.cr')}
            </Text>
          </TouchableOpacity>
        </View>
        <Text variant={'subheader'}>{t('home.areYouAvailable')}</Text>
        <View
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginTop: 16,
            paddingVertical: 14,
          }}
        >
          <Text
            variant={'subheader'}
            style={{
              color: '#000000E0',
              flex: 1,
            }}
          >
            {t('home.available')}
          </Text>
          <TouchableOpacity
            style={{
              width: 44,
              height: 24,
              backgroundColor: available ? theme.colors.primary : '#D1DEF8',
              borderRadius: 50,
              alignItems: !available ? 'flex-start' : 'flex-end',
              justifyContent: 'center',
              padding: 2,
            }}
            onPress={() => onToogleAvailability()}
          >
            {isToogling ? (
              <ActivityIndicator color={theme.colors.mainBackground} />
            ) : (
              <Box
                backgroundColor={'mainBackground'}
                height={20}
                width={20}
                borderRadius={10}
              />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{
            height: 40,
            justifyContent: 'center',
          }}
        >
          <Text
            variant={'subheader'}
            color={'primary'}
            fontSize={12}
            textDecorationLine={'underline'}
          >
            {t('home.wannaChangeYourPhone')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    )
  );
};

export default AvailabitySection;
