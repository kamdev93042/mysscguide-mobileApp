import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = 'notifications_state_v1';

export function useHasUnreadNotifications() {
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(true);

  const refreshUnreadState = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);

      if (!raw) {
        // If state is not initialized yet, keep the indicator visible by default.
        setHasUnreadNotifications(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setHasUnreadNotifications(false);
        return;
      }

      setHasUnreadNotifications(parsed.some((item: any) => item?.read !== true));
    } catch (error) {
      console.error('Failed to read unread notifications state', error);
      setHasUnreadNotifications(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnreadState();
  }, [refreshUnreadState]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadState();
    }, [refreshUnreadState])
  );

  return hasUnreadNotifications;
}
