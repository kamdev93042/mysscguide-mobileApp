import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginModalProvider } from './context/LoginModalContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SplashProvider } from './context/SplashContext';
import { MocksProvider } from './context/MocksContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';
import NameScreen from './screens/NameScreen';
import NotificationScreen from './screens/NotificationScreen';
import PyqsScreen from './screens/PyqsScreen';
import MocksScreen from './screens/MocksScreen';
import SplashScreen from './screens/SplashScreen';
import CreateMockScreen from './screens/CreateMockScreen';
import MockInstructionScreen from './screens/MockInstructionScreen';
import TypingScreen from './screens/TypingScreen';
import { Ionicons } from '@expo/vector-icons';

import ContestScreen from './screens/ContestScreen';
import MnemonicsScreen from './screens/MnemonicsScreen';
import ForumsScreen from './screens/ForumsScreen';
import ForumPostScreen from './screens/ForumPostScreen';
import TestsScreen from './screens/TestsScreen';
import TestAnalysisScreen from './screens/TestAnalysisScreen';
import DailyChallengeScreen from './screens/DailyChallengeScreen';

const MockPracticeScreen = require('./screens/MockPracticeScreen').default;

const Stack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Keep this true only while testing locally.
const BYPASS_LOGIN_FOR_TESTING = __DEV__ && false;

const TAB_SCREENS = [
  { name: 'Tests', label: 'Tests', icon: 'document-text', component: TestsScreen },
  { name: 'Mnemonics', label: 'Mnemonics', icon: 'bulb', component: MnemonicsScreen },
  { name: 'Typing', label: 'Typing', icon: 'keypad', component: TypingScreen },
  { name: 'Forums', label: 'Forums', icon: 'people', component: ForumsScreen },
];

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="DashboardMain" component={DashboardScreen} />
    </HomeStack.Navigator>
  );
}

function MainTabs() {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBg = isDark ? '#0f172a' : '#f8fafc';
  const tabActive = '#059669';
  const tabInactive = isDark ? '#64748b' : '#94a3b8';
  const borderTop = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <Tab.Navigator
      id={undefined}
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: borderTop,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 8,
        },
        tabBarActiveTintColor: tabActive,
        tabBarInactiveTintColor: tabInactive,
        tabBarItemStyle: { paddingVertical: 2 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', paddingBottom: 2 },
        tabBarIconStyle: { marginTop: 0 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color, marginTop: 2 }}>
              Home
            </Text>
          ),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      {TAB_SCREENS.map(({ name, label, icon, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          initialParams={{ name }}
          options={{
            tabBarLabel: ({ color }) => (
              <Text style={{ fontSize: 11, fontWeight: '700', color, marginTop: 2 }}>
                {label}
              </Text>
            ),
            tabBarIcon: ({ color, size }) => <Ionicons name={icon as any} size={size} color={color} />,
          }}
        />
      ))}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: ({ color }) => (
            <Text style={{ fontSize: 11, fontWeight: '700', color, marginTop: 2 }}>
              Profile
            </Text>
          ),
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

import { MnemonicsProvider } from './context/MnemonicsContext';
import { ForumsProvider } from './context/ForumsContext';

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState<'Login' | 'Main'>(
    BYPASS_LOGIN_FOR_TESTING ? 'Main' : 'Login'
  );
  const [hasResolvedInitialRoute, setHasResolvedInitialRoute] = useState(BYPASS_LOGIN_FOR_TESTING);

  useEffect(() => {
    if (BYPASS_LOGIN_FOR_TESTING) {
      setHasResolvedInitialRoute(true);
      setInitialRouteName('Main');
      return;
    }

    let isMounted = true;

    const hydrateAuthState = async () => {
      try {
        const [isLoggedIn, userToken] = await Promise.all([
          AsyncStorage.getItem('isLoggedIn'),
          AsyncStorage.getItem('userToken'),
        ]);

        if (!isMounted) {
          return;
        }

        if (isLoggedIn === 'true' && userToken) {
          setInitialRouteName('Main');
        } else {
          setInitialRouteName('Login');
        }
      } catch (error) {
        console.error('Failed to restore auth state', error);
        if (isMounted) {
          setInitialRouteName('Login');
        }
      } finally {
        if (isMounted) {
          setHasResolvedInitialRoute(true);
        }
      }
    };

    hydrateAuthState();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <ThemeProvider>
      <LoginModalProvider>
        <SplashProvider>
          <MocksProvider>
            <MnemonicsProvider>
              <ForumsProvider>
                <NavigationContainer>
            <StatusBar style="auto" />
            {hasResolvedInitialRoute && (
              <Stack.Navigator
                id={undefined}
                screenOptions={{
                  headerShown: false,
                }}
                initialRouteName={initialRouteName}
              >
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="OTP" component={OtpVerificationScreen} />
                <Stack.Screen name="Name" component={NameScreen} />
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="Notifications" component={NotificationScreen} />
                <Stack.Screen name="CreateMock" component={CreateMockScreen} />
                <Stack.Screen 
                  name="MockInstruction" 
                  component={MockInstructionScreen}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen name="MockPractice" component={MockPracticeScreen} />
                <Stack.Screen name="TestAnalysis" component={TestAnalysisScreen} />
                <Stack.Screen name="DailyChallenge" component={DailyChallengeScreen} />
                <Stack.Screen name="ForumPost" component={ForumPostScreen} />
                <Stack.Screen name="Mocks" component={MocksScreen} />
                <Stack.Screen name="PYQs" component={PyqsScreen} />
                <Stack.Screen name="Contests" component={ContestScreen} />
              </Stack.Navigator>
            )}
            <SplashScreen />
            </NavigationContainer>
               </ForumsProvider>
            </MnemonicsProvider>
          </MocksProvider>
        </SplashProvider>
      </LoginModalProvider>
    </ThemeProvider>
  );
}
