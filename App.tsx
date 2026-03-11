import 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { LoginModalProvider } from './context/LoginModalContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SplashProvider } from './context/SplashContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProfileScreen from './screens/ProfileScreen';
import PlaceholderScreen from './screens/PlaceholderScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';
import NameScreen from './screens/NameScreen';
import NotificationScreen from './screens/NotificationScreen';
import PyqsScreen from './screens/PyqsScreen';
import MocksScreen from './screens/MocksScreen';
import SplashScreen from './screens/SplashScreen';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_SCREENS = [
  { name: 'Mocks', label: 'Mocks', icon: 'document-text', component: MocksScreen },
  { name: 'PYQs', label: 'PYQs', icon: 'document-text', component: PyqsScreen },
  { name: 'Typing', label: 'Typing', icon: 'keypad', component: PlaceholderScreen },
  { name: 'Contests', label: 'Contests', icon: 'trophy', component: PlaceholderScreen },
];

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="DashboardMain" component={DashboardScreen} />
      <HomeStack.Screen name="Notifications" component={NotificationScreen} />
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

export default function App() {
  return (
    <ThemeProvider>
      <LoginModalProvider>
        <SplashProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <Stack.Navigator
              id={undefined}
              screenOptions={{
                headerShown: false,
              }}
              initialRouteName="Login"
            >
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="OTP" component={OtpVerificationScreen} />
              <Stack.Screen name="Name" component={NameScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
            </Stack.Navigator>
            <SplashScreen />
          </NavigationContainer>
        </SplashProvider>
      </LoginModalProvider>
    </ThemeProvider>
  );
}
