import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { BlurView } from '@react-native-community/blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type BottomSheetWrapperProps = {
  isVisible: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const BottomSheetWrapper: React.FC<BottomSheetWrapperProps> = ({
  isVisible,
  onClose,
  children,
}) => {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  // Open or close the sheet depending on isVisible
  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.snapToIndex(0);
    } else {
      sheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

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
          {isVisible && (
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
    [isVisible],
  );

  return (
    <>
      <BottomSheet
        ref={sheetRef}
        enablePanDownToClose
        onClose={onClose}
        onChange={handleSheetChanges}
        index={isVisible ? 0 : -1}
        backdropComponent={renderBackdrop}
        containerStyle={{
          zIndex: 9999,
          alignSelf: 'center',
        }}
      >
        <BottomSheetView
          style={[
            styles.contentContainer,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          {children}
        </BottomSheetView>
      </BottomSheet>
    </>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 16,
    zIndex: 9999,
  },
});

export default BottomSheetWrapper;
