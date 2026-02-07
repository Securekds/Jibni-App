import React from 'react';
import { Keyboard, TouchableOpacity, View } from 'react-native';
import { Input, Text } from '@/components';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';

const InputsSection: React.FC<{
  firstname: string;
  lastname: string;
  wilaya: number | null;
  setFirstname: (name: string) => void;
  setLastname: (name: string) => void;
  setIsWilayasBottomsheetVisible: (visible: boolean) => void;
}> = ({
  firstname,
  wilaya,
  setFirstname,
  setIsWilayasBottomsheetVisible,
  lastname,
  setLastname,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <Text
        variant={'body'}
        style={{
          marginTop: 38,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.firstname')}
      </Text>
      <Input
        placeholder={t('becomeDriver.firstnamePlaceholder')}
        value={firstname}
        onChangeText={v => {
          if (/^[a-zA-Z\s]*$/.test(v)) {
            setFirstname(v);
          }
        }}
      />
      <Text
        variant={'body'}
        style={{
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.lastname')}
      </Text>
      <Input
        placeholder={t('becomeDriver.lastnamePlaceholder')}
        value={lastname}
        onChangeText={v => {
          if (/^[a-zA-Z\s]*$/.test(v)) {
            setLastname(v);
          }
        }}
      />
      <Text
        variant={'body'}
        style={{
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {t('becomeDriver.wilaya')}
      </Text>
      <TouchableOpacity
        onPress={() => {
          setIsWilayasBottomsheetVisible(true);
          Keyboard.dismiss();
        }}
      >
        <Input
          placeholder={t('becomeDriver.wilayaPlaceholder')}
          editable={false}
          pointerEvents="none"
          value={wilaya ? t(`becomeDriver.wilayas.${wilaya}`) : ''}
          leftView={
            <View
              style={{
                justifyContent: 'center',
              }}
            >
              <BlastedImage
                source={require('@/assets/arrow-down.png')}
                style={{
                  width: 24,
                  height: 24,
                }}
              />
            </View>
          }
        />
      </TouchableOpacity>
    </>
  );
};

export default InputsSection;
