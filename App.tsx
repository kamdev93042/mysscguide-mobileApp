import 'react-native-gesture-handler';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';
import { LoginModalProvider } from './context/LoginModalContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SplashProvider } from './context/SplashContext';
import { MocksProvider } from './context/MocksContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import WelcomeScreen from './screens/WelcomeScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import MenuScreen from './screens/MenuScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';
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
  const tabBg = isDark ? '#0f172a' : '#ffffff';
  const tabActive = '#059669';
  const tabInactive = '#94a3b8';
  const borderTop = isDark ? '#334155' : '#f1f5f9';

  return (
    <Tab.Navigator
      id={undefined}
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: tabBg,
          borderTopColor: borderTop,
          borderTopWidth: 1,
          height: 62 + Math.max(insets.bottom, 4),
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 4),
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: tabActive,
        tabBarInactiveTintColor: tabInactive,
        tabBarActiveBackgroundColor: isDark ? '#064e3b' : '#ecfdf5',
        tabBarItemStyle: {
          marginHorizontal: 4,
          marginVertical: 2,
          borderRadius: 14,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '700',
          marginBottom: 2,
        },
        tabBarIconStyle: { marginTop: 2 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="home" size={focused ? 20 : 18} color={color} />
          ),
        }}
      />
      {TAB_SCREENS.map(({ name, label, icon, component }) => (
        <Tab.Screen
          key={name}
          name={name}
          component={component}
          initialParams={{ name }}
          options={{
            tabBarLabel: label,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={icon as any} size={focused ? 20 : 18} color={color} />
            ),
          }}
        />
      ))}
      <Tab.Screen
        name="Menu"
        component={PlaceholderScreen}
        listeners={({ navigation }) => ({
          tabPress: (event: any) => {
            event.preventDefault();
            navigation.getParent()?.navigate('MenuDrawer' as never);
          },
        })}
        initialParams={{ name: 'Menu' }}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="grid" size={focused ? 20 : 18} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import { MnemonicsProvider } from './context/MnemonicsContext';
import { ForumsProvider } from './context/ForumsContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [initialRouteName, setInitialRouteName] = useState<'Welcome' | 'Main'>(
    BYPASS_LOGIN_FOR_TESTING ? 'Main' : 'Welcome'
  );
  const [hasResolvedInitialRoute, setHasResolvedInitialRoute] = useState<boolean>(BYPASS_LOGIN_FOR_TESTING);

  useEffect(() => {
    if (!fontsLoaded) return;

    const textDefaults = (Text as any).defaultProps || {};
    (Text as any).defaultProps = {
      ...textDefaults,
      style: [{ fontFamily: 'PlusJakartaSans_500Medium' }, textDefaults.style],
    };

    const inputDefaults = (TextInput as any).defaultProps || {};
    (TextInput as any).defaultProps = {
      ...inputDefaults,
      style: [{ fontFamily: 'PlusJakartaSans_500Medium' }, inputDefaults.style],
    };
  }, [fontsLoaded]);

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
          setInitialRouteName('Welcome');
        }
      } catch (error) {
        console.error('Failed to restore auth state', error);
        if (isMounted) {
          setInitialRouteName('Welcome');
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
                <Stack.Screen name="Welcome" component={WelcomeScreen} />
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
                <Stack.Screen name="Forums" component={ForumsScreen} />
                <Stack.Screen name="Mocks" component={MocksScreen} />
                <Stack.Screen name="PYQs" component={PyqsScreen} />
                <Stack.Screen name="Contests" component={ContestScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen
                  name="MenuDrawer"
                  component={MenuScreen}
                  options={{
                    presentation: 'transparentModal',
                    animation: 'none',
                  }}
                />
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
