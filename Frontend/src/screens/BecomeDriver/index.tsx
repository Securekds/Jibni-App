import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { BottomSheetWrapper, Box, Button, Header, Text } from '@/components';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import InputsSection from './InputsSection';
import UploadPicture from './UploadPicture';
import { usePermissions } from '@/hooks/usePermissions';
import ImagePicker from 'react-native-image-crop-picker';
import ImageModal from './ImageModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WilayaPickerSheet from './WilayaPickerSheet';
import RequestSentSeccusfuly from './RequestSentSeccusfuly';
import { useAuthStore } from '@/stores/authStore';
import { wilayas } from './Wilayas';
import { useDriver } from '@/hooks';
import { goBack } from '@/utils/navigatorUtils';

const BecomeDriverScreen: React.FC<any> = ({ navigation, route }) => {
  const goback = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else {
      goBack();
    }
  };
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [wilaya, setWilaya] = useState<number | null>(null);
  const [drivingLicenceImage, setDrivingLicenceImage] = useState<any>(null);
  const [greyCardImage, setGreyCardImage] = useState<any>(null);
  const [showSheet, setShowSheet] = useState<any>(false);
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<any>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { ensureGalleryReadingAndContinue } = usePermissions();
  const [isCanSendRequest, setIsCanSendRequest] = useState<boolean>(false);
  const [requestSent, setRequestSent] = useState(false);
  const [isWilayasBottomsheetVisible, setIsWilayasBottomsheetVisible] =
    useState(false);
  const insets = useSafeAreaInsets();
  const [hasAcceptedConditions, setHasAcceptedConditions] =
    useState<boolean>(false);
  const { becomeServer, isLoading } = useDriver();
  const { setRequestedToBeServer } = useAuthStore();

  const uploadPicture = () => {
    ensureGalleryReadingAndContinue(isGranted => {
      if (isGranted) {
        ImagePicker.openPicker({
          width: 1000,
          height: 500,
          cropping: false,
          mediaType: 'photo',
          includeBase64: false,
          forceJpg: false,
          compressImageQuality: 1.0,
        })
          .then(image => {
            setPhoto(image);
            setIsModalVisible(true);
          })
          .catch(x => {});
      }
    });
  };

  const handleBecomeDriver = async () => {
    if (isLoading) {
      return;
    }
    try {
      const selectedWilaya: number = wilaya || 1;
      const response = await becomeServer({
        first_name: firstname,
        last_name: lastname,
        city: wilayas[selectedWilaya as keyof typeof wilayas],
        driving_license: drivingLicenceImage,
        gray_card: greyCardImage,
      });
      if (response.status === 'success') {
        setRequestedToBeServer();
        setRequestSent(true);
      } else {
        if (response?.message == 'Upgrade request already submitted.') {
          Alert.alert(t('becomeDriver.errors.requestAlredySubmitted'));
        } else if (
          [
            'First name must contain only lettes',
            'Last name must contain only lettes',
          ].includes(response?.message)
        ) {
          Alert.alert(t('becomeDriver.errors.nameMustContainOnlyLetters'));
        } else {
          Alert.alert(t('genericError'));
        }
      }
    } catch (err: any) {
      Alert.alert(t('genericError'));
    }
  };

  useEffect(() => {
    if (
      firstname.trim().length > 0 &&
      lastname.trim().length > 0 &&
      wilaya &&
      greyCardImage &&
      drivingLicenceImage &&
      hasAcceptedConditions
    ) {
      setIsCanSendRequest(true);
    } else {
      setIsCanSendRequest(false);
    }
  }, [
    firstname,
    lastname,
    wilaya,
    greyCardImage,
    drivingLicenceImage,
    hasAcceptedConditions,
  ]);
  return (
    <Box flex={1} backgroundColor={'mainBackground'}>
      <Header onPress={goback} />
      {requestSent ? (
        <RequestSentSeccusfuly />
      ) : (
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            marginHorizontal: 16,
            paddingBottom: insets.bottom + 15,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            variant={'header'}
            color={'primary'}
            textAlign={'center'}
            style={{ marginTop: 58 }}
          >
            {t('becomeDriver.screenTitle')}
          </Text>
          <Text
            variant={'body'}
            textAlign={'center'}
            style={{
              color: '#000000A3',
              marginTop: 18,
            }}
          >
            {t('becomeDriver.screenDescription')}
          </Text>
          <InputsSection
            firstname={firstname}
            lastname={lastname}
            setLastname={setLastname}
            wilaya={wilaya}
            setFirstname={setFirstname}
            setIsWilayasBottomsheetVisible={setIsWilayasBottomsheetVisible}
          />
          <UploadPicture
            placeholder={t('becomeDriver.drivingLicencePlaceholder')}
            title={t('becomeDriver.drivingLicenceTitle')}
            picturePath={drivingLicenceImage || undefined}
            setShowSheet={() => setShowSheet('drivingLicence')}
          />
          <UploadPicture
            placeholder={t('becomeDriver.greyCardPlaceholder')}
            title={t('becomeDriver.greyCardTitle')}
            picturePath={greyCardImage || undefined}
            setShowSheet={() => setShowSheet('greyCard')}
          />
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              marginTop: 24,
              alignItems: 'center',
              marginBottom: 44,
            }}
            onPress={() => setHasAcceptedConditions(prev => !prev)}
          >
            <View
              style={{
                height: 20,
                width: 20,
                borderColor: theme.colors.primary,
                borderWidth: hasAcceptedConditions ? 0 : 1,
                borderRadius: 4,
                marginEnd: 8,
              }}
            >
              {hasAcceptedConditions && (
                <BlastedImage
                  source={require('@/assets/checked.png')}
                  style={{
                    height: 20,
                    width: 20,
                  }}
                />
              )}
            </View>
            <Text
              variant={'body'}
              color={'primary'}
              textDecorationLine={'underline'}
              flexShrink={1}
            >
              {t(`becomeDriver.acceptConditions`)}
            </Text>
          </TouchableOpacity>
          <Button
            disabled={!isCanSendRequest}
            label={t('becomeDriver.sendRequest')}
            onPress={handleBecomeDriver}
            loading={isLoading}
          />
        </ScrollView>
      )}
      <BottomSheetWrapper
        isVisible={!!showSheet}
        onClose={() => setShowSheet(false)}
      >
        <Text variant={'header'} fontWeight={600}>
          {t(`becomeDriver.bottomSheetTitle.${showSheet}`)}
        </Text>
        <Text variant={'subheader'}>
          {t(`becomeDriver.bottomSheetDescription`)}
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            borderWidth: 1,
            borderColor: theme.colors.primary,
            backgroundColor: '#D1DEF8',
            borderRadius: 12,
            padding: 12,
            marginTop: 16,
          }}
          onPress={uploadPicture}
        >
          <BlastedImage
            source={require('@/assets/gallery-export.png')}
            style={{
              height: 24,
              width: 24,
            }}
          />
          <Text
            variant={'subheader'}
            color={'text'}
            style={{
              marginStart: 5,
              flexShrink: 1,
            }}
          >
            {t(`becomeDriver.uploadFromGallery`)}
          </Text>
        </TouchableOpacity>
      </BottomSheetWrapper>
      <ImageModal
        setDrivingLicenceImage={setDrivingLicenceImage}
        setIsModalVisible={setIsModalVisible}
        setPhoto={setPhoto}
        setGreyCardImage={setGreyCardImage}
        setShowSheet={setShowSheet}
        showSheet={showSheet}
        photo={photo}
        isModalVisible={isModalVisible}
      />
      <WilayaPickerSheet
        visible={isWilayasBottomsheetVisible}
        onClose={() => setIsWilayasBottomsheetVisible(false)}
        selectedWilaya={wilaya}
        setSelectedWilaya={setWilaya}
      />
    </Box>
  );
};

export default BecomeDriverScreen;
