import { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginModalContext = createContext(null);

export function LoginModalProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(true);
  const [userName, setUserNameState] = useState('');
  const [userPhone, setUserPhoneState] = useState('');
  const [userEmail, setUserEmailState] = useState('');

  // Load persisted user data on app start
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedName = await AsyncStorage.getItem('userName');
        if (storedName) setUserNameState(storedName);

        const storedEmail = await AsyncStorage.getItem('userEmail');
        if (storedEmail) setUserEmailState(storedEmail);

        const storedPhone = await AsyncStorage.getItem('userPhone');
        if (storedPhone) setUserPhoneState(storedPhone);
      } catch (e) {
        console.error('Failed to load user data from storage', e);
      }
    };
    loadUserData();
  }, []);

  // Wrappers to update both state and persistence
  const setUserName = (val) => {
    setUserNameState(val);
    AsyncStorage.setItem('userName', val).catch(e => console.error(e));
  };
  
  const setUserEmail = (val) => {
    setUserEmailState(val);
    AsyncStorage.setItem('userEmail', val).catch(e => console.error(e));
  };

  const setUserPhone = (val) => {
    setUserPhoneState(val);
    AsyncStorage.setItem('userPhone', val).catch(e => console.error(e));
  };

  const openLogin = () => setIsVisible(true);
  const closeLogin = () => setIsVisible(false);
  const openNameModal = () => setNameModalVisible(true);
  const closeNameModal = () => setNameModalVisible(false);

  return (
    <LoginModalContext.Provider
      value={{
        isVisible,
        openLogin,
        closeLogin,
        nameModalVisible,
        openNameModal,
        closeNameModal,
        hasLoggedIn,
        setHasLoggedIn,
        userName,
        setUserName,
        userPhone,
        setUserPhone,
        userEmail,
        setUserEmail,
      }}
    >
      {children}
    </LoginModalContext.Provider>
  );
}

export function useLoginModal() {
  const ctx = useContext(LoginModalContext);
  if (!ctx) throw new Error('useLoginModal must be used inside LoginModalProvider');
  return ctx;
}
