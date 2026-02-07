import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

const useGPSLocation = () => {
  requestGeolocationPermission = () => {
    const promise = new Promise(async (resolve, reject) => {
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );
          if (granted === PermissionsAndroid.RESULTS.GRANTED) {
            resolve();
          } else {
            reject();
          }
        } catch (err) {
          reject(err);
        }
      } else {
        const auth = await Geolocation.requestAuthorization('whenInUse');
        if (auth === 'granted') {
          resolve();
        } else {
          reject();
        }
      }
    });

    return promise;
  };
  getUserPosition = () => {
    const promise = new Promise((resolve, reject) => {
      requestGeolocationPermission()
        .then(() => {
          Geolocation.getCurrentPosition(
            position => {
              resolve(position);
            },
            error => {
              reject(error);
            },
            { 
              enableHighAccuracy: true, // Try high accuracy first
              timeout: 20000, // Increased timeout to 20 seconds
              maximumAge: 10000, // Accept cached location up to 10 seconds old
            },
          );
        })
        .catch(e => {
          reject({ message: t('global.permissions.gps.error') });
        });
    });

    return promise;
  };

  return { getUserPosition };
};

export default useGPSLocation;
