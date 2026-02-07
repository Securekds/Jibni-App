import React from 'react';
import { TouchableOpacity, View, Dimensions } from 'react-native';
import { Text } from '@/components';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
const { width: deviceWidth } = Dimensions.get('window');

const DriverSection: React.FC<{ handleBecomeDriver: () => void }> = ({
  handleBecomeDriver,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  return (
    <View
      style={{
        position: 'absolute',
        top: insets.top + 31,
      }}
    >
      <BlastedImage
        source={require('@/assets/header_logo.png')}
        style={{
          width: 70,
          height: 24,
          alignSelf: 'center',
        }}
      />
      <View
        style={{
          backgroundColor: user?.requestedToBeServer
            ? '#E8EEFB'
            : theme.colors.primary,
          flexDirection: 'row',
          marginHorizontal: 24,
          paddingStart: 24,
          paddingTop: 16,
          borderRadius: 12,
          width: deviceWidth - 32,
          overflow: 'hidden',
          marginTop: 17,
          minHeight: 150,
        }}
      >
        <BlastedImage
          source={require('@/assets/home_wave_1.png')}
          style={{
            position: 'absolute',
            top: 0,
            end: 0,
            height: 69,
            width: 325,
            ...theme.RTLMirror
          }}
        />

        <BlastedImage
          source={require('@/assets/home_wave_2.png')}
          style={{
            position: 'absolute',
            bottom: 0,
            end: 0,
            height: 83,
            width: 305,
            ...theme.RTLMirror
          }}
        />
        <View
          style={{
            flex: 1,
            zIndex: 999,
            alignItems: 'flex-start',
            paddingBottom: 10
          }}
        >
          <Text
            variant={'header'}
            color={'mainBackground'}
            fontSize={20}
            fontWeight={500}
            style={[
              {
                flexShrink: 1,
              },
              user?.requestedToBeServer && {
                color: theme.colors.primary,
              },
            ]}
          >
            {user?.requestedToBeServer
              ? t('home.requestSent')
              : t('home.wannaBeDriver')}
          </Text>
          {user?.requestedToBeServer ? (
            <Text
              marginTop={'s'}
              variant={'subheader'}
              adjustsFontSizeToFit
              numberOfLines={6}
              style={{
                flex: 1,
              }}
            >
              {t('home.nowWeAreAnalisingYourProfile')}
            </Text>
          ) : (
            <TouchableOpacity
              style={{
                backgroundColor: '#FEC846',
                marginTop: 14,
                borderRadius: 12,
                padding: 10,
              }}
              onPress={handleBecomeDriver}
            >
              <Text
                fontWeight={500}
                fontSize={14}
                color={'text'}
                textAlign={'center'}
              >
                {t('home.requestNow')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <View
          style={{
            justifyContent: 'flex-end',
          }}
        >
          <BlastedImage
            source={require('@/assets/home_picture.png')}
            style={{
              position: "absolute",
              bottom: 0,
              end: 0,
              height: 140,
              width: 186,
              ...theme.RTLMirror
            }}
          />
          <View style={{width: 186}}/>
        </View>
      </View>
    </View>
  );
};

export default DriverSection;
