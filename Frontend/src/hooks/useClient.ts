import { useCallback, useState } from 'react';
import { clientApi } from '../services/api';

type getNearServersRequest = {
  lat: string;
  lng: string;
  dist_lat: string;
  dist_lng: string;
  duration: number;
  distance: number;
};

const useClient = () => {
  const [isLoading, setIsLoading] = useState(false);
  const getNearServers = useCallback(
    async (credentials: getNearServersRequest) => {
      console.log('[USE_CLIENT] getNearServers called with:', credentials);
      setIsLoading(true);
      try {
        console.log('[USE_CLIENT] Calling clientApi.getNearServers...');
        const response = await clientApi.getNearServers(
          credentials.lat,
          credentials.lng,
          credentials.dist_lat,
          credentials.dist_lng,
          credentials.duration,
          credentials.distance,
        );
        console.log('[USE_CLIENT] getNearServers response:', response);
        return response;
      } catch (error) {
        console.error('[USE_CLIENT] getNearServers error:', error);
        return { success: false, error };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    getNearServers,
    isLoading,
  };
};

export default useClient;
