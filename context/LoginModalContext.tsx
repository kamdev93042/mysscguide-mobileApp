import { createContext, useContext, useState } from 'react';

const LoginModalContext = createContext(null);

export function LoginModalProvider({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [hasLoggedIn, setHasLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userEmail, setUserEmail] = useState('');

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
