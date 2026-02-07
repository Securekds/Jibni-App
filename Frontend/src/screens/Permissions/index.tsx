import React from 'react';
import { ImageRequireSource, Platform, TouchableOpacity } from 'react-native';
import { Box, Button, Header, Text } from '@/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import BlastedImage from 'react-native-blasted-image';
import { theme } from '@/theme';
import { navigationRef } from '@/utils/navigatorUtils';
import { FlashList } from '@shopify/flash-list';
import { usePermissions } from '@/hooks/usePermissions';

type permissionId = 'location' | 'notification' | 'backgroundLocation';

type permissionItem = {
  id: permissionId;
  icon: ImageRequireSource;
};

const androidVersion = Platform.Version as number;

const PermissionsScreen: React.FC = () => {
  const { t } = useTranslation();
  const {
    permissions,
    onRequestFineLocation,
    onRequestNotificationPermission,
    onRequestBackgroundLocation,
    setNeedsAllowPermissions,
  } = usePermissions();

  const insets = useSafeAreaInsets();
  const localPermissions: permissionItem[] =
    androidVersion > 28
      ? [
          {
            id: 'location',
            icon: require('@/assets/location.png'),
          },
          {
            id: 'notification',
            icon: require('@/assets/notification.png'),
          },
          {
            id: 'backgroundLocation',
            icon: require('@/assets/backgroundLocation.png'),
          },
        ]
      : [
          {
            id: 'location',
            icon: require('@/assets/location.png'),
          },
          {
            id: 'notification',
            icon: require('@/assets/notification.png'),
          },
        ];

  const goback = () => {
    navigationRef.goBack();
  };

  const requestPermission = (id: permissionId) => {
    if (id == 'notification') {
      onRequestNotificationPermission();
    } else if (id == 'location') {
      onRequestFineLocation();
    } else if (id == 'backgroundLocation') {
      onRequestBackgroundLocation();
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
      <FlashList
        data={localPermissions}
        keyExtractor={item => item?.id}
        ListHeaderComponent={
          <Text
            variant={'header'}
            color={'primary'}
            textAlign={'center'}
            style={{ marginTop: 48, marginBottom: 32 }}
          >
            {t('permissions.screenTitle')}
          </Text>
        }
        contentContainerStyle={{
          paddingHorizontal: 24,
        }}
        renderItem={({ item, index }) => (
          <Box
            flexDirection={'row'}
            borderWidth={1}
            borderRadius={8}
            alignItems={'center'}
            style={{
              borderColor: '#D1DEF8',
              paddingHorizontal: 12,
              paddingVertical: 20,
              marginBottom: 16,
            }}
          >
            <BlastedImage
              source={item.icon}
              style={{
                height: 24,
                width: 24,
              }}
            />
            <Text
              variant={'body'}
              flex={1}
              style={{
                marginHorizontal: 8,
              }}
            >
              {t(`permissions.${item.id}`)}
            </Text>
            <TouchableOpacity
              disabled={permissions[item.id]}
              style={{
                width: 44,
                height: 24,
                backgroundColor: permissions[item.id]
                  ? theme.colors.primary
                  : '#D1DEF8',
                borderRadius: 50,
                alignItems: !permissions[item.id] ? 'flex-start' : 'flex-end',
                justifyContent: 'center',
                padding: 2,
              }}
              onPress={() => requestPermission(item.id)}
            >
              <Box
                backgroundColor={'mainBackground'}
                height={20}
                width={20}
                borderRadius={10}
              />
            </TouchableOpacity>
          </Box>
        )}
        ListFooterComponent={() => (
          <Button
            label={t('permissions.createAccount')}
            onPress={() => setNeedsAllowPermissions(false)}
            disabled={Object.values(permissions).some(item => item === false)}
          />
        )}
      />
    </Box>
  );
};

export default PermissionsScreen;
