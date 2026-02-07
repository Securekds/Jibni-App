import React from 'react';
import { View } from 'react-native';
import { Button, Text } from '@/components';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { navigationRef } from '@/utils/navigatorUtils';
import { theme } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RequestSentSeccusfuly: React.FC = () => {
  const { t } = useTranslation();
  const handleBackToHome = () => {
    navigationRef.goBack();
  };
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 53,
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <BlastedImage
          source={require('@/assets/request-sent.png')}
          style={{
            height: 48,
            width: 48,
          }}
        />
        <Text variant={'header'} color={'primary'} marginTop={'l'}>
          {t('becomeDriver.requestSent')}
        </Text>
        <Text
          variant="body"
          marginTop={'s'}
          style={{ color: '#000000E0', textAlign: 'center' }}
        >
          {t('becomeDriver.requestSentWarning')}
        </Text>
      </View>
      <Button
        label={t('becomeDriver.backToHome')}
        onPress={handleBackToHome}
        buttonStyle={{
          backgroundColor: '#E8EEFB',
        }}
        textStyle={{
          color: theme.colors.primary,
        }}
      />
    </View>
  );
};

export default RequestSentSeccusfuly;
