import { Alert, Animated, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View, useWindowDimensions } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useEffect, useRef } from 'react';

const AUTH_STORAGE_KEYS = [
  'isLoggedIn',
  'userToken',
  'token',
  'accessToken',
  'refreshToken',
  'authToken',
  'auth',
  'userName',
  'userEmail',
  'userPhone',
];

const MENU_ITEMS = [
  {
    section: 'Prepare',
    items: [
      { id: 'home', label: 'Home', icon: 'home', bg: ['#059669', '#0d9488'] as const },
      { id: 'mocks', label: 'Mocks', icon: 'document-text', bg: ['#3b82f6', '#2563eb'] as const },
      { id: 'pyqs', label: 'Previous Year Papers', icon: 'copy', bg: ['#ec4899', '#f43f5e'] as const },
      { id: 'contests', label: 'Live Contests', icon: 'trophy', bg: ['#f59e0b', '#eab308'] as const, badge: 'LIVE' },
    ],
  },
  {
    section: 'Tools',
    items: [
      { id: 'typing', label: 'Typing Test', icon: 'keypad', bg: ['#06b6d4', '#0891b2'] as const },
      { id: 'mistakes', label: 'Mistake Notebook', icon: 'book', bg: ['#ef4444', '#dc2626'] as const, badge: '5' },
    ],
  },
  {
    section: 'Community',
    items: [
      { id: 'forums', label: 'Forums', icon: 'people', bg: ['#10b981', '#059669'] as const },
      { id: 'mnemonics', label: 'Mnemonics', icon: 'bulb', bg: ['#8b5cf6', '#7c3aed'] as const, badge: 'NEW' },
    ],
  },
  {
    section: 'Account',
    items: [
      { id: 'settings', label: 'Settings', icon: 'settings', bg: ['#64748b', '#475569'] as const },
      { id: 'signout', label: 'Sign Out', icon: 'log-out', bg: ['#94a3b8', '#64748b'] as const },
    ],
  },
];

async function clearAuthKeysEverywhere() {
  try {
    await Promise.all(AUTH_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Failed removing auth keys', error);
  }

  await Promise.all([
    AsyncStorage.setItem('isLoggedIn', 'false'),
    AsyncStorage.setItem('userToken', ''),
    AsyncStorage.setItem('userName', ''),
    AsyncStorage.setItem('userEmail', ''),
    AsyncStorage.setItem('userPhone', ''),
  ]);

  if (Platform.OS === 'web') {
    try {
      AUTH_STORAGE_KEYS.forEach((key) => {
        window.localStorage.removeItem(key);
        window.sessionStorage.removeItem(key);
      });
      window.localStorage.setItem('isLoggedIn', 'false');
      window.localStorage.setItem('userToken', '');
      window.sessionStorage.setItem('isLoggedIn', 'false');
      window.sessionStorage.setItem('userToken', '');
    } catch (error) {
      console.error('Failed clearing web auth storage', error);
    }
  }
}

export default function MenuScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();
  const { userName, setHasLoggedIn, setUserName, setUserEmail, setUserPhone } = useLoginModal();
  const drawerWidth = Math.min(282, width * 0.74);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const drawerTranslateX = useRef(new Animated.Value(-320)).current;

  useEffect(() => {
    drawerTranslateX.setValue(-drawerWidth);
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [drawerTranslateX, drawerWidth, overlayOpacity]);

  const displayName = userName || 'User';
  const initials = displayName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(drawerTranslateX, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('Home');
      }
    });
  };

  const closeDrawerThenNavigate = (routeName: string, params?: Record<string, unknown>) => {
    let rootNavigation: any = navigation;
    while (rootNavigation?.getParent?.()) {
      rootNavigation = rootNavigation.getParent();
    }

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(drawerTranslateX, {
        toValue: -drawerWidth,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }

      setTimeout(() => {
        if (params) {
          rootNavigation.navigate(routeName, params);
          return;
        }

        rootNavigation.navigate(routeName);
      }, 40);
    });
  };

  const performLogout = async () => {
    let rootNavigation: any = navigation;
    while (rootNavigation?.getParent?.()) {
      rootNavigation = rootNavigation.getParent();
    }

    try {
      await clearAuthKeysEverywhere();

      const [isLoggedInAfter, tokenAfter] = await Promise.all([
        AsyncStorage.getItem('isLoggedIn'),
        AsyncStorage.getItem('userToken'),
      ]);

      if (isLoggedInAfter === 'true' || tokenAfter) {
        await clearAuthKeysEverywhere();
      }
    } catch (error) {
      console.error('Failed clearing auth storage during logout', error);
    } finally {
      setHasLoggedIn(false);
      setUserName('');
      setUserEmail('');
      setUserPhone('');

      try {
        rootNavigation.reset?.({
          index: 0,
          routes: [{ name: 'Login' }],
        });

        rootNavigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        );
      } catch (error) {
        console.error('Root reset failed, trying navigation fallback', error);
        try {
          rootNavigation.navigate('Login');
        } catch (fallbackError) {
          console.error('Fallback navigate failed', fallbackError);
        }
      }

      setTimeout(() => {
        try {
          rootNavigation.reset?.({
            index: 0,
            routes: [{ name: 'Login' }],
          });

          rootNavigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            })
          );
        } catch {
          try {
            rootNavigation.navigate('Login');
          } catch {
            // no-op final fallback
          }
        }
      }, 50);

      if (Platform.OS === 'android') {
        ToastAndroid.show('Logged out successfully', ToastAndroid.SHORT);
      }
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const confirmFn = (globalThis as any)?.confirm;
      const shouldLogout = typeof confirmFn === 'function' ? confirmFn('Are you sure you want to log out?') : true;
      if (shouldLogout) {
        void performLogout();
      }
      return;
    }

    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          void performLogout();
        },
      },
    ]);
  };

  const onMenuPress = (id: string) => {
    if (id === 'signout') return handleSignOut();

    if (id === 'home') return closeDrawerThenNavigate('Main', { screen: 'Home' });
    if (id === 'mocks') return closeDrawerThenNavigate('Mocks');
    if (id === 'pyqs') return closeDrawerThenNavigate('PYQs');
    if (id === 'contests') return closeDrawerThenNavigate('Contests');
    if (id === 'typing') return closeDrawerThenNavigate('Main', { screen: 'Typing' });
    if (id === 'mistakes') return closeDrawerThenNavigate('DailyChallenge', { mode: 'challenge' });
    if (id === 'mnemonics') return closeDrawerThenNavigate('Main', { screen: 'Mnemonics' });
    if (id === 'forums') return closeDrawerThenNavigate('Forums');
    if (id === 'settings') return closeDrawerThenNavigate('Profile');
  };

  const onViewProfile = () => {
    closeDrawerThenNavigate('Profile');
  };

  return (
    <View style={styles.overlayRoot}>
      <Animated.View style={[styles.overlayShade, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
      </Animated.View>

      <Animated.View
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            paddingTop: insets.top,
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            transform: [{ translateX: drawerTranslateX }],
          },
        ]}
      >
      <View style={styles.headerWrap}>
        <View style={styles.userRow}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.nameText}>{displayName}</Text>
            <Text style={styles.subText}>SSC Aspirant</Text>
          </View>
        </View>
        <View style={styles.topBtns}>
          <Pressable style={styles.topIconBtn} onPress={toggleTheme}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={16} color="#ffffff" />
          </Pressable>
          <Pressable style={styles.topIconBtn} onPress={closeDrawer}>
            <Ionicons name="close" size={16} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
        <Pressable style={styles.profileBtn} onPress={onViewProfile}>
          <Text style={styles.profileBtnText}>View Profile</Text>
          <Ionicons name="chevron-forward" size={13} color="#f8fafc" />
        </Pressable>

        {MENU_ITEMS.map((section) => (
          <View key={section.section}>
            <Text style={styles.sectionTitle}>{section.section}</Text>
            {section.items.map((item) => (
              <Pressable key={item.id} style={styles.menuItem} onPress={() => onMenuPress(item.id)}>
                <View style={[styles.menuIcon, { backgroundColor: item.bg[0] }]}>
                  <Ionicons name={item.icon as any} size={15} color="#ffffff" />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                {item.badge ? <Text style={[styles.badge, item.badge === 'LIVE' && styles.badgeLive]}>{item.badge}</Text> : null}
              </Pressable>
            ))}
          </View>
        ))}

        <Pressable style={styles.upgradeCard} onPress={() => navigation.navigate('Mocks')}>
          <View style={styles.upgradeIcon}><Ionicons name="key" size={14} color="#ffffff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Unlock Selection Key</Text>
            <Text style={styles.upgradeSub}>Unlimited mocks, PYQs and contests</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#d97706" />
        </Pressable>

        <Text style={styles.footerText}>© 2026 MySSCguide · All rights reserved</Text>
      </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  drawer: {
    height: '100%',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerWrap: {
    backgroundColor: '#059669',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  nameText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  subText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 11,
    marginTop: 1,
  },
  topBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileBtnText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollBody: {
    paddingHorizontal: 12,
    paddingBottom: 18,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 10,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.7,
    paddingHorizontal: 8,
    marginTop: 14,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 2,
  },
  menuIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuLabel: {
    flex: 1,
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  badge: {
    fontSize: 9,
    fontWeight: '800',
    color: '#f43f5e',
    backgroundColor: '#fef2f2',
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeLive: {
    color: '#dc2626',
  },
  upgradeCard: {
    marginTop: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeTitle: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
  },
  upgradeSub: {
    color: '#b45309',
    fontSize: 10,
    marginTop: 1,
  },
  footerText: {
    marginTop: 'auto',
    textAlign: 'center',
    color: '#cbd5e1',
    fontSize: 10,
    paddingTop: 18,
    paddingBottom: 8,
  },
});
