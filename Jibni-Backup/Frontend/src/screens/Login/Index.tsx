import React, { useState } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { Box } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import BlastedImage from 'react-native-blasted-image';
import { KeyboardAwareScrollView as ScrollView } from 'react-native-keyboard-aware-scroll-view';
import Card from './Card';
import useWhiteStatusbarColor from '@/hooks/useWhiteStatusbar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { navigate } from '@/utils/navigatorUtils';

const { width: deviceWidth } = Dimensions.get('window');

const LoginScreen: React.FC = ({ navigation, ...props }: any) => {
  const [phone, setPhone] = useState('');
  const { isLoading, sendOtp } = useAuth();
  const { t } = useTranslation();
  useWhiteStatusbarColor();
  const insets = useSafeAreaInsets();

  const handleSendOtp = async () => {
    if (isLoading) {
      return;
    }
    try {
      const response = await sendOtp({ phone_number: `0${phone}` });
      if (response.status === 'success') {
        navigate('VerifyOtp', {
          phone: `0${phone}`,
          code: String(response.data.otp),
        });
      } else if (
        response.message ==
        'Please wait 60 seconds before requesting a new OTP.'
      ) {
        Alert.alert(t('login.tooManyRequests'));
      } else {
        Alert.alert(t('genericError'));
      }
    } catch (error) {
      Alert.alert(t('genericError'));
    }
  };

  return (
    <Box flex={1} style={{}}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        style={{
          flex: 1,
        }}
        contentContainerStyle={{
          flex: 1,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
          }}
        >
          <BlastedImage
            source={require('@/assets/login_background_image.png')}
            style={{
              width: deviceWidth,
              height: (deviceWidth * 965) / 430,
            }}
          />
        </View>
        <View
          style={{
            flex: 1,
          }}
        />
        <Card phone={phone} setPhone={setPhone} handleSendOtp={handleSendOtp} />
      </ScrollView>
    </Box>
  );
};

export default LoginScreen;
