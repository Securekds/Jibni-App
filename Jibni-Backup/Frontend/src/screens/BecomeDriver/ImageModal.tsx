import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Header, Text } from '@/components';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: deviceWidth, height: deviceHeight } = Dimensions.get('window');
const ImageModal: React.FC<{
  setIsModalVisible: (visible: boolean) => void;
  setPhoto: (photo: any) => void;
  setDrivingLicenceImage: (photo: any) => void;
  setGreyCardImage: (photo: any) => void;
  setShowSheet: (showSheet: boolean) => void;
  isModalVisible: boolean;
  photo: any;
  showSheet: string;
}> = ({
  setDrivingLicenceImage,
  setIsModalVisible,
  setPhoto,
  setGreyCardImage,
  setShowSheet,
  showSheet,
  photo,
  isModalVisible,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const closeModal = () => {
    setIsModalVisible(false);
    setPhoto('');
  };

  const selectPhoto = () => {
    setIsModalVisible(false);
    if (showSheet == 'drivingLicence') {
      setDrivingLicenceImage(photo);
    } else {
      setGreyCardImage(photo);
    }
    setShowSheet(false);
    setPhoto('');
  };

  return (
    <Modal
      visible={isModalVisible}
      statusBarTranslucent
      onRequestClose={closeModal}
    >
      <View
        style={{
          zIndex: 9999,
        }}
      >
        <Header onPress={closeModal} />
      </View>
      <BlastedImage
        source={{ uri: photo.path }}
        style={{
          ...StyleSheet.absoluteFillObject,
          width: deviceWidth,
          height: deviceHeight + insets.top,
        }}
      />
      <View
        style={{
          flex: 1,
        }}
      />
      <TouchableOpacity
        style={{
          paddingVertical: 16,
          paddingHorizontal: 24,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          flexDirection: 'row',
          alignSelf: 'center',
          backgroundColor: '#D1DEF8',
          alignItems: 'center',
        }}
        onPress={selectPhoto}
      >
        <Text color={'primary'} fontWeight={700} fontSize={14}>
          {t('becomeDriver.sendPic')}
        </Text>
        <BlastedImage
          source={require('@/assets/send.png')}
          style={{
            height: 24,
            width: 24,
            marginStart: 8,
          }}
        />
      </TouchableOpacity>
      <View
        style={{
          marginBottom: insets.bottom + 54,
          flexDirection: 'row',
          backgroundColor: theme.colors.mainBackground,
          borderRadius: 12,
          padding: 10,
          marginHorizontal: 16,
          marginTop: 19,
          alignItems: 'center',
        }}
      >
        <BlastedImage
          source={require('@/assets/info-circle.png')}
          style={{
            height: 24,
            width: 24,
            marginEnd: 10,
          }}
        />
        <Text variant={'body'} fontSize={14} flex={1}>
          {t('becomeDriver.confirmInfos')}
        </Text>
      </View>
    </Modal>
  );
};

export default ImageModal;
