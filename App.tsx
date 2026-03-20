import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { LoginModalProvider } from './context/LoginModalContext';
import { ThemeProvider } from './context/ThemeContext';
import { SplashProvider } from './context/SplashContext';
import { MocksProvider } from './context/MocksContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TypingScreen from './screens/TypingScreen';
import { MnemonicsProvider } from './context/MnemonicsContext';
import { ForumsProvider } from './context/ForumsContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LoginModalProvider>
          <SplashProvider>
            <MocksProvider>
              <MnemonicsProvider>
                <ForumsProvider>
                  <StatusBar style="auto" />
                  <TypingScreen />
                </ForumsProvider>
              </MnemonicsProvider>
            </MocksProvider>
          </SplashProvider>
        </LoginModalProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
