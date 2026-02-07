import React, {
  useRef,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { BlurView } from '@react-native-community/blur';
import { useTranslation } from 'react-i18next';
import { theme } from '@/theme';

const WILAYAS = Array.from({ length: 58 }, (_, i) => i + 1);
const WilayaPickerSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  selectedWilaya: number|null;
  setSelectedWilaya: (wilaya: number) => void;
}> = ({ visible, onClose, selectedWilaya, setSelectedWilaya }) => {
  const snapPoints = useMemo(() => ['60%'], []);
  const { t } = useTranslation();
  const sheetRef = useRef<BottomSheet>(null);
  const handleSelect = (wilaya: number) => {
    setSelectedWilaya(wilaya);
    sheetRef.current?.close(); // close on selection
  };

  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        style={{
          zIndex: 99,
          backgroundColor: '#0000000A',
        }}
        pressBehavior="close"
      >
        <View
          style={{
            flex: 1,
          }}
        >
          {visible && (
            <BlurView
              style={StyleSheet.absoluteFill}
              blurType="light"
              blurAmount={1}
              reducedTransparencyFallbackColor="white"
            />
          )}
        </View>
      </BottomSheetBackdrop>
    ),
    [visible],
  );

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        containerStyle={{
          zIndex: 9999,
        }}
        onChange={handleSheetChanges}
      >
        <BottomSheetFlatList
          data={WILAYAS}
          keyExtractor={item => item.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleSelect(item)}
              style={{
                padding: 16,
                backgroundColor:
                  selectedWilaya === item ? '#007bff22' : 'white',
                borderBottomWidth: 1,
                borderBottomColor: '#eee',
              }}
            >
              <Text
                style={{
                  color:
                    selectedWilaya === item ? theme.colors.primary : '#333',
                }}
              >
                {t(`becomeDriver.wilayas.${item}`)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </BottomSheet>
    </>
  );
};

export default WilayaPickerSheet;
