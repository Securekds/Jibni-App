import { useCallback, useState } from 'react';
import { driverApi } from '../services/api';
import { becomeServerRequest } from '@/types/driver';
import { useAuthStore } from '@/stores/authStore';

const useDriver = () => {
  console.log('[USEDRIVER] useDriver hook called');
  const [isLoading, setIsLoading] = useState(false);
  console.log('[USEDRIVER] State initialized');
  
  console.log('[USEDRIVER] Getting store values...');
  const {
    setBecameServer,
    isAuthenticated,
    toogleAvailability: toogleStoreAvailability,
    setRequestedToBeServer,
  } = useAuthStore();
  console.log('[USEDRIVER] Store values retrieved, isAuthenticated:', isAuthenticated);
  const becomeServer = useCallback(
    async (credentials: becomeServerRequest) => {
      setIsLoading(true);
      try {
        const response = await driverApi.becomeServer(
          credentials.first_name,
          credentials.last_name,
          credentials.city,
          credentials.driving_license,
          credentials.gray_card,
        );
        return response;
      } catch (error) {
        return { success: false, error };
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading],
  );

  const checkStatus = useCallback(async () => {
    if (!isAuthenticated) {
      console.log('[USEDRIVER] checkStatus: User not authenticated, skipping');
      return;
    }
    try {
      console.log('[USEDRIVER] checkStatus: Calling API...');
      const response = await driverApi.checkStatus();
      console.log('[USEDRIVER] checkStatus: API response:', response);
      if (response?.upgrade_status=="approved") {
        console.log('[USEDRIVER] Upgrade approved! Setting user role to server...');
        setBecameServer();
        console.log('[USEDRIVER] User role updated to server');
      } else if (response?.upgrade_status == 'pending') {
        console.log('[USEDRIVER] Upgrade pending...');
        setRequestedToBeServer();
      } else if (response?.upgrade_status == 'not_submitted') {
        console.log('[USEDRIVER] No upgrade request submitted');
      }
      return response;
    } catch (error: any) {
      console.error('[USEDRIVER] checkStatus error details:', {
        message: error?.message,
        code: error?.code,
        response: error?.response?.data,
        status: error?.response?.status,
        url: error?.config?.url,
      });
      return { success: false, error };
    }
  }, [isLoading, isAuthenticated]);

  const toogleAvailability = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await driverApi.toogleAvailability();
      if (response.status == 'Success.') {
        toogleStoreAvailability(response.open_to_work);
      }
      return response;
    } catch (error) {
      return { success: false, error };
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  console.log('[USEDRIVER] Creating return object...');
  const result = {
    becomeServer,
    checkStatus,
    toogleAvailability,
    isLoading,
  };
  console.log('[USEDRIVER] Return object created, returning...');
  return result;
};

export default useDriver
