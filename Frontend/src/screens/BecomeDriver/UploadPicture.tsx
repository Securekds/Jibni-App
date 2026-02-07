import React, { useState } from 'react';
import { Dimensions, Keyboard, TouchableOpacity } from 'react-native';
import { Text } from '@/components';

import BlastedImage from 'react-native-blasted-image';
import WilayaPickerSheet from './WilayaPickerSheet';

const { width: deviceWidth } = Dimensions.get('window');
const UploadPicture: React.FC<{
  placeholder: string;
  picturePath?: any;
  title: string;
  setShowSheet: (show: boolean) => void;
}> = ({ placeholder, picturePath, title, setShowSheet }) => {

  return (
    <>
      <Text
        variant={'body'}
        style={{
          marginTop: 24,
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {picturePath?.path ? (
        <BlastedImage
          source={{ uri: picturePath.path }}
          style={{
            height: 152,
            width: deviceWidth - 32,
            borderRadius: 8,
          }}
        />
      ) : (
        <TouchableOpacity
          style={{
            height: 152,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#E8EEFB',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#D1DEF8',
          }}
          onPress={() => {setShowSheet(true); Keyboard.dismiss()}}
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
            style={{
              color: '#185ADC',
              marginTop: 12,
            }}
          >
            {placeholder}
          </Text>
        </TouchableOpacity>
      )}
    </>
  );
};

export default UploadPicture;
