import React, { createContext, useContext, useState, useEffect } from 'react';

const SplashContext = createContext(null);

export const useSplash = () => useContext(SplashContext);

export function SplashProvider({ children }) {
  const [isSplashing, setIsSplashing] = useState(true);

  useEffect(() => {
    // Initial load splash
    const timer = setTimeout(() => {
      setIsSplashing(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const showSplash = (duration = 2000) => {
    return new Promise<void>((resolve) => {
      setIsSplashing(true);
      setTimeout(() => {
        setIsSplashing(false);
        resolve();
      }, duration);
    });
  };

  return (
    <SplashContext.Provider value={{ isSplashing, showSplash }}>
      {children}
    </SplashContext.Provider>
  );
}
