import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Dimensions, InteractionManager } from 'react-native';
import { Text } from '@/components';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';

const { width: deviceWidth } = Dimensions.get('window');

const DestinationSection: React.FC<{onSelectAddress:()=>void}> = ({onSelectAddress}) => {
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
          paddingBottom: 32,
          borderRadius: 33,
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
        <Text
          variant={'header'}
          fontWeight={600}
          style={{
            marginTop: 18,
          }}
        >
          {t('home.whereUWannaGo')}
        </Text>
        <Text variant={'subheader'}>{t('home.fillDestination')}</Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            borderRadius: 12,
            paddingHorizontal: 12,
            marginTop: 16,
            paddingVertical: 14,
          }}
          onPress={onSelectAddress}
        >
          <Text
            variant={'subheader'}
            style={{
              color: '#000000E0',
              flex: 1,
            }}
          >
            {t('home.destination')}
          </Text>
          <BlastedImage
            source={require('@/assets/arrow-left.png')}
            style={{
              height: 24,
              width: 24,
              ...theme.RTLMirror
            }}
          />
        </TouchableOpacity>
      </Animated.View>
    )
  );
};

export default DestinationSection;
