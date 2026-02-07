import React, { useEffect, useState } from 'react';
import {
  TouchableOpacity,
  View,
  Dimensions,
  Linking,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Button, Text } from '@/components';
import BlastedImage from 'react-native-blasted-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/theme';
import { useTranslation } from 'react-i18next';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from '@react-native-community/blur';
import { DateTime } from 'luxon';
import { useClientMissionSocket } from '@/hooks';

const { width: deviceWidth } = Dimensions.get('window');

const ServerItem: React.FC<{
  requestDriver: (serverid: string) => void;
  isSelectingServer: string | null;
  remainingSeconds: string | null;
  item: any;
  isCurrenct: boolean;
  isRequestExpired: boolean | null;
  isRejected: boolean;
}> = ({
  isSelectingServer,
  requestDriver,
  item,
  isCurrenct,
  remainingSeconds,
  isRequestExpired,
  isRejected,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          backgroundColor: '#F7F6F5',
          marginBottom: 16,
          borderRadius: 12,
          paddingVertical: 7,
          alignItems: 'center',
          paddingHorizontal: 12,
        }}
        disabled={isCurrenct}
        onPress={() => requestDriver(String(item.id))}
      >
        <BlastedImage
          source={require('@/assets/camion.png')}
          style={{
            width: 56,
            height: 56,
          }}
        />
        <View
          style={{
            flex: 1,
            marginHorizontal: 12,
          }}
        >
          <Text
            variant={'subheader'}
            style={{ fontSize: 16 }}
            color={'primary'}
            flex={1}
            adjustsFontSizeToFit
          >
            {2000} {t('home.currency')}
          </Text>
          <Text variant={'body'} flex={1}>
            {item.distance_km} {t('home.km')}
          </Text>
        </View>
        {isCurrenct ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            {isRejected ? (
              <View
                style={{
                  height: 36,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  backgroundColor: '#FFE2E2',
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                  borderRadius: 8,
                }}
              >
                <Text
                  variant={'body'}
                  style={{
                    color: theme.colors.danger,
                  }}
                >
                  {t('home.requestRejected')}
                </Text>
              </View>
            ) : isRequestExpired ? (
              <View
                style={{
                  height: 36,
                  justifyContent: 'center',
                  paddingHorizontal: 12,
                  backgroundColor: '#FFE2E2',
                  borderWidth: 1,
                  borderColor: theme.colors.danger,
                  borderRadius: 8,
                }}
              >
                <Text
                  variant={'body'}
                  style={{
                    color: theme.colors.danger,
                  }}
                >
                  {t('home.requestExpired')}
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    height: 34,
                    justifyContent: 'center',
                    backgroundColor: '#E5F8F2',
                    borderRadius: 8,
                    paddingHorizontal: 6,
                    borderWidth: 1,
                    borderColor: '#00BC7D',
                  }}
                >
                  <Text
                    variant={'body'}
                    style={{
                      color: '#00BC7D',
                    }}
                  >
                    {t('home.requested')}
                  </Text>
                </View>
                {remainingSeconds && (
                  <View
                    style={{
                      height: 34,
                      justifyContent: 'center',
                      backgroundColor: '#FFE2E2',
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.danger,
                    }}
                  >
                    <Text variant={'body'} color={'danger'}>
                      {'\u202A'}
                      {remainingSeconds}
                      {'\u202C'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.primary,
              backgroundColor: '#E8EEFB',
              borderRadius: 8,
              height: 30,
              justifyContent: 'center',
            }}
          >
            <>
              {isSelectingServer == item.id && (
                <ActivityIndicator
                  style={{
                    position: 'absolute',
                    alignSelf: 'center',
                  }}
                />
              )}
              <Text
                variant={'body'}
                color={'primary'}
                style={{
                  paddingHorizontal: 8,
                  opacity: isSelectingServer == item.id ? 0 : 1,
                }}
              >
                {t('home.requestServer')}
              </Text>
            </>
          </View>
        )}
      </TouchableOpacity>
      {remainingSeconds && !isCurrenct && (
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType="light"
          blurAmount={1}
          reducedTransparencyFallbackColor="white"
        />
      )}
    </>
  );
};

const NearServersSection: React.FC<{
  onRequest: () => void;
  servers: any[];
  isLoading: boolean;
  requestedServer: number;
  tryOtherDestination: () => void;
  error: string;
  helpCenterPhone: string;
  requestDriver: (serverid: string) => void;
  isSelectingServer: string | null;
  selectedServer: { serverId: string; requestedAt: string } | null;
  isRejected: boolean;
}> = ({
  isLoading,
  servers,
  onRequest,
  requestedServer,
  error,
  tryOtherDestination,
  helpCenterPhone,
  isSelectingServer,
  requestDriver,
  selectedServer,
  isRejected,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<string | null>(null);
  const [currentServer, setCurrentServer] = useState<any>(null);
  const [data, setData] = useState<any[]>([]);
  const [isRequestExpired, setIsRequestExpired] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    setTimeout(() => {
      setVisible(true);
    }, 50);
  }, []);

  useEffect(() => {
    if (!visible) {
      setIsRequestExpired(false);
      setRemainingSeconds(null);
    }
  }, [visible]);

  useEffect(() => {
    if (selectedServer) {
      const _currentServer = servers.filter(
        item => item.id == selectedServer.serverId,
      )[0];
      const otherServers = servers.filter(
        item => item.id != selectedServer.serverId,
      );
      setCurrentServer(_currentServer);
      setData([...otherServers]);
    } else {
      setData(servers);
    }
  }, [servers, selectedServer]);

  const callPhoneNumber = () => {
    Linking.openURL(`tel:${helpCenterPhone}`);
  };

  const getRemainingTimeToExpire = () => {
    if (selectedServer) {
      const jsDate = new Date(selectedServer?.requestedAt);
      const luxonDate = DateTime.fromJSDate(jsDate);
      const diff = Math.floor(
        DateTime.now().diff(luxonDate, 'seconds').seconds,
      );
      const remainingSeconds = 60 - diff;
      if (remainingSeconds < 0) {
        return null;
      }
      return remainingSeconds < 10
        ? `00: 0${remainingSeconds}`
        : `00: ${remainingSeconds}`;
    } else {
      return null;
    }
  };

  useEffect(() => {
    if (selectedServer) {
      const interval = setInterval(() => {
        const time = getRemainingTimeToExpire();
        setRemainingSeconds(time);
        if (time === null) {
          setIsRequestExpired(true);
          clearInterval(interval);
        } else {
          setIsRequestExpired(false);
        }
      }, 100);
    }
  }, [selectedServer]);

  return (
    visible && (
      <>
        <Animated.View
          entering={SlideInDown}
          style={[
            {
              position: 'absolute',
              zIndex: 11,
              bottom: 0,
              width: deviceWidth,
              maxHeight: Dimensions.get('window').height * 0.7,
              backgroundColor: 'white',
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: insets.bottom + 32,
              borderTopEndRadius: 33,
              borderTopStartRadius: 33,
            },
            isLoading && {
              height: 200,
              justifyContent: 'center',
            },
          ]}
        >
          {isLoading ? (
            <Text variant={'header'} textAlign={'center'}>
              {t('home.loading')}
            </Text>
          ) : error ? (
            <View>
              <Text
                variant={'header'}
                color={'primary'}
                style={{ marginBottom: 8 }}
              >
                {t('home.weDontFoundServersTitle')}
              </Text>
              <Text
                variant={'subheader'}
                color={'text'}
                style={{ marginBottom: 10 }}
              >
                {t('home.pleaseContactUs')}
              </Text>
              <Text
                variant={'header'}
                color={'primary'}
                style={{ marginBottom: 6 }}
              >
                {helpCenterPhone}
              </Text>
              <Text
                variant={'body'}
                color={'text'}
                style={{ marginBottom: 24 }}
              >
                {t('home.sorry')}
              </Text>
              <Button
                label={t('home.callHelpCenter')}
                onPress={callPhoneNumber}
                buttonStyle={{
                  backgroundColor: '#E8EEFB',
                }}
                textStyle={{
                  color: theme.colors.primary,
                }}
              />
            </View>
          ) : (
            <FlashList
              data={data}
              keyExtractor={(item, index) => item?.id + index}
              ListHeaderComponent={
                <>
                  <Text variant={'header'} style={{ marginBottom: 24 }}>
                    {t('home.chooseServer')}
                  </Text>
                  {currentServer && (
                    <>
                      <ServerItem
                        item={currentServer}
                        requestDriver={requestDriver}
                        isSelectingServer={isSelectingServer}
                        isCurrenct={true}
                        remainingSeconds={remainingSeconds}
                        isRequestExpired={isRequestExpired}
                        isRejected={isRejected}
                      />
                      {data.length > 0 && isRejected ? (
                        <Text variant={'body'} marginBottom={'m'}>
                          {t('home.requestExpiredChooseAnother')}
                        </Text>
                      ) : data.length > 0 && remainingSeconds ? (
                        <Text variant={'body'} marginBottom={'m'}>
                          {t('home.pleaseWaitForServerResponse')}
                        </Text>
                      ) : (
                        isRequestExpired && (
                          <Text variant={'body'} marginBottom={'m'}>
                            {t('home.requestExpiredChooseAnother')}
                          </Text>
                        )
                      )}
                    </>
                  )}
                </>
              }
              contentContainerStyle={{
                paddingHorizontal: 0,
              }}
              renderItem={({ item }) => {
                return (
                  <ServerItem
                    item={item}
                    requestDriver={requestDriver}
                    isSelectingServer={isSelectingServer}
                    isCurrenct={false}
                    remainingSeconds={remainingSeconds}
                    isRequestExpired={null}
                    isRejected={false}
                  />
                );
              }}
            />
          )}
        </Animated.View>
        {(error || isRequestExpired || isRejected) && (
          <TouchableOpacity
            style={[
              {
                flex: 1,
                zIndex: 10,
              },
              StyleSheet.absoluteFill,
            ]}
            onPress={tryOtherDestination}
          >
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={1}
              reducedTransparencyFallbackColor="white"
            />
          </TouchableOpacity>
        )}
      </>
    )
  );
};

export default NearServersSection;
