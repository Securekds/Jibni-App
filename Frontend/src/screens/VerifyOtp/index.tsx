import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Box, Button, Header, Text } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import OTPTextView from 'react-native-otp-textinput';
import Clipboard from '@react-native-clipboard/clipboard';
import { theme } from '@/theme';
import { DateTime } from 'luxon';
import { popToTop, goBack } from '@/utils/navigatorUtils';

const MaxDelayToRequestCode = 60;

const VerifyOtpScreen: React.FC = ({ navigation, route }: any) => {
  const { phone, code: initialCode } = route.params;
  const [code, setCode] = useState(initialCode);
  const { isLoading, sendOtp, verifyOtp } = useAuth();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [otpInput, setOtpInput] = useState<string>('');
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [expireIn, setExpireIn] = useState(() =>
    DateTime.now().plus({ seconds: MaxDelayToRequestCode }),
  );
  const [secondsBeforeNextCodeRequest, setSecondsBeforeNextCodeRequest] =
    useState(MaxDelayToRequestCode);

  const input = useRef<OTPTextView>(null);

  useEffect(() => {
    const now = DateTime.now();
    const diff = Math.floor(expireIn.diff(now, 'seconds').seconds);
    setTimeout(() => {
      setSecondsBeforeNextCodeRequest(diff >= 0 ? diff : 0);
    }, 1000);
  }, [secondsBeforeNextCodeRequest]);

  const handleSendOtp = async () => {
    if (isLoading || isRequestingCode) {
      return;
    }
    setIsRequestingCode(true);
    try {
      const response = await sendOtp({ phone_number: phone });
      if (response.status === 'success') {
        setCode(response.data.otp);
        setExpireIn(DateTime.now().plus({ seconds: MaxDelayToRequestCode }));
        setSecondsBeforeNextCodeRequest(MaxDelayToRequestCode);
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
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isLoading) {
      return;
    }
    try {
      const response = await verifyOtp({ phone_number: phone, code });
      if (response.status === 'success') {
        // Use helper function instead of navigation prop
        if (navigation?.popToTop) {
          navigation.popToTop();
        } else {
          popToTop();
        }
      } else if (response.message == 'No OTP found for this number.') {
        Alert.alert(t('verifyOtp.noOtpFound'));
      } else if (response.message == 'OTP expired. Please request a new one.') {
        Alert.alert(t('verifyOtp.otpExpired'));
      } else if (response.message.includes('Incorrect OTP.')) {
        Alert.alert(t('verifyOtp.incorrectOtp'));
      } else if (
        response.message == 'Too many incorrect attempts. OTP invalidated.'
      ) {
        Alert.alert(t('verifyOtp.TooManyIncorrectAttemps'));
      } else {
        Alert.alert(t('genericError'));
      }
    } catch (error) {
      Alert.alert(t('genericError'));
    }
  };

  const handleCellTextChange = async (text: string, i: number) => {
    if (i === 0) {
      const clippedText = await Clipboard.getString();
      if (clippedText.slice(0, 1) === text) {
        input.current?.setValue(clippedText, true);
      }
    }
  };
  const goback = () => {
    // Use helper function instead of navigation prop
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      goBack();
    }
  };

  return (
    <Box
      flex={1}
      backgroundColor={'mainBackground'}
      style={{
        paddingBottom: insets.bottom + 16,
      }}
    >
      <Header onPress={goback} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        style={{
          flex: 1,
          paddingHorizontal: 24,
        }}
      >
        <BlastedImage
          source={require('@/assets/verify_otp.png')}
          style={{
            height: 48,
            width: 48,
            marginTop: 48,
            marginBottom: 24,
            alignSelf: 'center',
          }}
        />
        <Text
          variant={'header'}
          textAlign={'center'}
          color={'primary'}
          marginBottom={'m'}
        >
          {t('verifyOtp.screenTitle')}
        </Text>
        <Text
          variant={'subheader'}
          fontSize={16}
          color={'text'}
          textAlign={'center'}
          marginBottom={'m'}
        >
          {t('verifyOtp.screenDescription')}
        </Text>
        <OTPTextView
          containerStyle={styles.textInputContainer}
          tintColor={'#F7F6F5'}
          offTintColor={'#F7F6F5'}
          textInputStyle={styles.textInput}
          cursorColor={theme.colors.primary}
          handleTextChange={setOtpInput}
          handleCellTextChange={handleCellTextChange}
          inputCount={6}
          keyboardType="numeric"
        />
        <Text
          textAlign={'center'}
          marginTop={'l'}
          variant={'body'}
          fontSize={12}
        >
          {t('verifyOtp.didNotReceiveCode')}
        </Text>
        {secondsBeforeNextCodeRequest <= 0 ? (
          <TouchableOpacity onPress={handleSendOtp}>
            {isRequestingCode ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                variant={'body'}
                fontSize={12}
                color={'primary'}
                textDecorationLine={'underline'}
                textAlign={'center'}
                lineHeight={30}
              >
                {t('verifyOtp.resendCode')}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <Text textAlign={'center'} variant={'body'} fontSize={12}>
            {t('verifyOtp.resendCodeIn')} 00:
            {secondsBeforeNextCodeRequest < 10
              ? '0' + secondsBeforeNextCodeRequest
              : secondsBeforeNextCodeRequest}
          </Text>
        )}
        <Button
          label={t('verifyOtp.checkCode')}
          disabled={otpInput.length != 6 || isRequestingCode}
          onPress={handleVerifyOtp}
          style={{
            marginTop: 30,
          }}
          loading={isLoading}
        />
      </ScrollView>
    </Box>
  );
};

const styles = StyleSheet.create({
  textInputContainer: {
    marginBottom: 0,
    direction: 'ltr',
  },
  textInput: {
    height: 46,
    borderRadius: 8,
    flex: 1,
    backgroundColor: '#F7F6F5',
    padding: 10,
    fontSize: 16,
    letterSpacing: 5,
    textAlign: 'center',
  },
});

export default VerifyOtpScreen;
