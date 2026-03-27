import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  useWindowDimensions,
  View,
} from 'react-native';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoginModal } from '../context/LoginModalContext';
import { useMnemonics } from '../context/MnemonicsContext';
import { useForums } from '../context/ForumsContext';
import { useMocks } from '../context/MocksContext';
import { useTheme } from '../context/ThemeContext';
import { userApi } from '../services/api';

const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';
const DAILY_EXAM_HISTORY_STORAGE_KEY = 'daily_exam_history_v1';

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

const clearAuthKeysEverywhere = async () => {
  try {
    await Promise.all(AUTH_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Failed removing auth keys individually', error);
  }

  try {
    await AsyncStorage.multiRemove(AUTH_STORAGE_KEYS);
  } catch (error) {
    console.error('Failed removing auth keys via multiRemove', error);
  }

  await AsyncStorage.multiSet([
    ['isLoggedIn', 'false'],
    ['userToken', ''],
    ['userName', ''],
    ['userEmail', ''],
    ['userPhone', ''],
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
};

type StoredResult = {
  sourceTab: 'PYQ' | 'RankMaker';
  testTitle: string;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  sectionBreakup?: Array<{
    section: string;
    correct: number;
    wrong: number;
    attempted: number;
    score: number;
  }>;
  submittedAt: string;
};

type DailyExamResultEntry = {
  mode?: 'challenge' | 'quiz';
  attempted?: number;
  totalQuestions?: number;
  completedAt?: string;
};

const formatLocalDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseToValidDate = (raw: unknown): Date | null => {
  if (!raw) return null;

  const direct = new Date(String(raw));
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  const text = String(raw).trim();
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);
  if (!match) {
    return null;
  }

  const a = Number(match[1]);
  const b = Number(match[2]);
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);

  // Resolve ambiguous locale dates like 03/04/2026.
  let month = a;
  let day = b;
  if (a > 12 && b <= 12) {
    day = a;
    month = b;
  }

  const parsed = new Date(year, month - 1, day);
  if (isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const {
    userName,
    userEmail,
    userPhone,
    setUserName,
    setUserEmail,
    setUserPhone,
    setHasLoggedIn,
  } = useLoginModal();
  const { isDark, toggleTheme } = useTheme();
  const { mnemonics, toggleSave } = useMnemonics();
  const { posts } = useForums();
  const { recentAttempts } = useMocks();

  const [profileData, setProfileData] = useState<any>(null);
  const [resultHistory, setResultHistory] = useState<StoredResult[]>([]);
  const [dailyExamHistory, setDailyExamHistory] = useState<DailyExamResultEntry[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    exam: '',
  });
  const [loading, setLoading] = useState(true);

  const isWide = width >= 720;

  const bg = isDark ? '#0f172a' : '#fdfdfd';
  const card = isDark ? '#1e293b' : '#ffffff';
  const cardSoft = isDark ? '#334155' : '#f9fafb';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? '#334155' : '#e5e7eb';

  const savedMnemonics = mnemonics.filter((m) => m.isSaved);

  const isAuthError = (error: unknown) => {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404') ||
      message.includes('user not found') ||
      message.includes('unauthorized') ||
      message.includes('invalid token')
    );
  };

  const clearAuthSession = async () => {
    await clearAuthKeysEverywhere();

    setHasLoggedIn(false);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setProfileData(null);

    let rootNavigation: any = navigation;
    while (rootNavigation?.getParent?.()) {
      rootNavigation = rootNavigation.getParent();
    }
    try {
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
        // no-op
      }
    }
  };

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [isLoggedIn, token, storedResultsRaw, dailyExamHistoryRaw] = await Promise.all([
          AsyncStorage.getItem('isLoggedIn'),
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem(RESULT_HISTORY_STORAGE_KEY),
          AsyncStorage.getItem(DAILY_EXAM_HISTORY_STORAGE_KEY),
        ]);

        const storedResults = storedResultsRaw ? JSON.parse(storedResultsRaw) : [];
        const storedDailyExamHistory = dailyExamHistoryRaw ? JSON.parse(dailyExamHistoryRaw) : [];
        if (Array.isArray(storedResults)) {
          setResultHistory(storedResults);
        }
        if (Array.isArray(storedDailyExamHistory)) {
          setDailyExamHistory(storedDailyExamHistory);
        }

        if (isLoggedIn === 'true' && token && token !== 'true') {
          try {
            const res = await userApi.getProfile();
            setProfileData(res?.user || res);
          } catch (error) {
            if (isAuthError(error)) {
              await clearAuthSession();
            } else {
              console.error('Failed to load profile data', error);
            }
          }
        }
      } catch (err) {
        if (!isAuthError(err)) {
          console.error('Failed to load profile data', err);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  useFocusEffect(
    useMemo(
      () => () => {
        let isActive = true;

        const refreshProfileStats = async () => {
          try {
            const [isLoggedIn, token, storedResultsRaw, dailyExamHistoryRaw] = await Promise.all([
              AsyncStorage.getItem('isLoggedIn'),
              AsyncStorage.getItem('userToken'),
              AsyncStorage.getItem(RESULT_HISTORY_STORAGE_KEY),
              AsyncStorage.getItem(DAILY_EXAM_HISTORY_STORAGE_KEY),
            ]);

            if (!isActive) {
              return;
            }

            const storedResults = storedResultsRaw ? JSON.parse(storedResultsRaw) : [];
            if (Array.isArray(storedResults)) {
              setResultHistory(storedResults);
            }
            const storedDailyExamHistory = dailyExamHistoryRaw ? JSON.parse(dailyExamHistoryRaw) : [];
            if (Array.isArray(storedDailyExamHistory)) {
              setDailyExamHistory(storedDailyExamHistory);
            }

            if (isLoggedIn === 'true' && token && token !== 'true') {
              try {
                const res = await userApi.getProfile();
                if (isActive) {
                  setProfileData(res?.user || res);
                }
              } catch (error) {
                if (isAuthError(error)) {
                  await clearAuthSession();
                } else {
                  console.error('Failed to refresh profile on focus', error);
                }
              }
            }
          } catch (error) {
            if (!isAuthError(error)) {
              console.error('Failed to reload profile stats', error);
            }
          }
        };

        refreshProfileStats();

        return () => {
          isActive = false;
        };
      },
      []
    )
  );

  const displayName = profileData?.fullName || profileData?.username || userName || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const identityTag = profileData?.role || profileData?.exam || 'Learner';

  const totalProblemsSolved = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.correct || 0), 0),
    [resultHistory]
  );

  const sectionSolvedMap = useMemo(() => {
    const map: Record<string, number> = {};
    resultHistory.forEach((item) => {
      (item.sectionBreakup || []).forEach((sectionItem) => {
        map[sectionItem.section] = (map[sectionItem.section] || 0) + (sectionItem.correct || 0);
      });
    });
    return map;
  }, [resultHistory]);

  const topSection = useMemo(() => {
    const entries = Object.entries(sectionSolvedMap);
    if (entries.length === 0) {
      return { name: 'No section yet', solved: 0 };
    }
    const [name, solved] = entries.sort((a, b) => b[1] - a[1])[0];
    return { name, solved };
  }, [sectionSolvedMap]);

  const totalAttempted = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.attempted || 0), 0),
    [resultHistory]
  );

  const totalCorrect = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.correct || 0), 0),
    [resultHistory]
  );

  const winRate = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const totalMnemonics = mnemonics.length;
  const totalPosts = posts.length;
  const totalUpvotes =
    mnemonics.reduce((sum, m) => sum + (m.likes || 0), 0) +
    posts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const consistencyHeatmap = useMemo(() => {
    const totalWeeks = 24;
    const totalDays = totalWeeks * 7;
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(end.getDate() - (totalDays - 1));

    const totalsByDay: Record<string, number> = {};

    resultHistory.forEach((item) => {
      const dt = parseToValidDate(item.submittedAt);
      if (!dt) {
        return;
      }
      const key = formatLocalDateKey(dt);
      const contribution = Math.max(1, Number(item.attempted || 0));
      totalsByDay[key] = (totalsByDay[key] || 0) + contribution;
    });

    recentAttempts.forEach((attempt: any) => {
      const dt = parseToValidDate(attempt?.createdAt || attempt?.submittedAt);
      if (!dt) {
        return;
      }
      const key = formatLocalDateKey(dt);
      const attemptedFromAttempt = Number(
        attempt?.attempted ||
          attempt?.results?.attempted ||
          0
      );
      const contribution = Math.max(1, attemptedFromAttempt);
      totalsByDay[key] = (totalsByDay[key] || 0) + contribution;
    });

    dailyExamHistory.forEach((entry) => {
      const dt = parseToValidDate(entry?.completedAt);
      if (!dt) {
        return;
      }
      const key = formatLocalDateKey(dt);
      const contribution = Math.max(1, Number(entry?.attempted || entry?.totalQuestions || 0));
      totalsByDay[key] = (totalsByDay[key] || 0) + contribution;
    });

    const days: Array<{ key: string; date: Date; value: number }> = [];
    for (let i = 0; i < totalDays; i += 1) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = formatLocalDateKey(d);
      days.push({ key, date: d, value: totalsByDay[key] || 0 });
    }

    const maxValue = Math.max(...days.map((d) => d.value), 1);
    const activeDays = days.filter((d) => d.value > 0).length;

    let currentStreak = 0;
    let maxStreak = 0;
    days.forEach((d) => {
      if (d.value > 0) {
        currentStreak += 1;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    });

    const getLevel = (value: number) => {
      if (value <= 0) return 0;
      const ratio = value / maxValue;
      if (ratio <= 0.25) return 1;
      if (ratio <= 0.5) return 2;
      if (ratio <= 0.75) return 3;
      return 4;
    };

    const weeks = Array.from({ length: totalWeeks }, (_, weekIndex) =>
      days.slice(weekIndex * 7, weekIndex * 7 + 7).map((d) => ({ ...d, level: getLevel(d.value) }))
    ).reverse();

    return {
      weeks,
      activeDays,
      maxStreak,
      yearLabel: `${start.getFullYear()} - ${end.getFullYear()}`,
    };
  }, [resultHistory, recentAttempts, dailyExamHistory]);

  const skillTags = useMemo(() => {
    const tags = Object.entries(sectionSolvedMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, solved]) => `${name} (${solved})`);

    if (tags.length > 0) {
      return tags;
    }

    return profileData?.city || profileData?.state ? ['Getting Started'] : ['No Activity Yet'];
  }, [sectionSolvedMap, profileData?.city, profileData?.state]);

  const openEditModal = () => {
    setEditForm({
      fullName: String(profileData?.fullName || profileData?.username || userName || ''),
      email: String(profileData?.email || userEmail || ''),
      phone: String(profileData?.phone || userPhone || ''),
      city: String(profileData?.city || ''),
      state: String(profileData?.state || ''),
      exam: String(profileData?.exam || ''),
    });
    setIsEditModalVisible(true);
  };

  const updateEditField = (key: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    const updatedProfile = {
      ...(profileData ?? {}),
      fullName: editForm.fullName.trim(),
      username: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      exam: editForm.exam.trim(),
    };

    setProfileData(updatedProfile);

    if (updatedProfile.fullName) {
      setUserName(updatedProfile.fullName);
    }
    if (updatedProfile.email) {
      setUserEmail(updatedProfile.email);
    }
    if (updatedProfile.phone) {
      setUserPhone(updatedProfile.phone);
    }

    setIsEditModalVisible(false);
    if (Platform.OS === 'android') {
      ToastAndroid.show('Profile updated successfully', ToastAndroid.SHORT);
    } else {
      Alert.alert('Success', 'Profile updated successfully');
    }
  };

  const showFeedback = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert('Success', message);
  };

  const openSupportLink = async (url: string, unsupportedMessage: string) => {
    try {
      const isSupported = await Linking.canOpenURL(url);
      if (!isSupported) {
        Alert.alert('Unavailable', unsupportedMessage);
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open support link', error);
      Alert.alert('Error', 'Unable to open support option right now.');
    }
  };

  const handleOpenNotifications = () => {
    navigation.navigate('Notifications');
  };

  const handleOpenSettings = () => {
    setIsSettingsModalVisible(true);
  };

  const handleToggleTheme = () => {
    toggleTheme();
    showFeedback(isDark ? 'Switched to light mode' : 'Switched to dark mode');
  };

  const handleOpenTests = () => {
    navigation.navigate('Tests');
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Choose how you want to contact us.', [
      {
        text: 'Email Support',
        onPress: () =>
          openSupportLink(
            'mailto:support@mysscguide.com?subject=MySSCguide%20Support',
            'No email app found. Please write to support@mysscguide.com.'
          ),
      },
      {
        text: 'WhatsApp Support',
        onPress: () =>
          openSupportLink(
            'whatsapp://send?text=Hi%20MySSCguide%20Support%2C%20I%20need%20help%20with%20the%20app.',
            'WhatsApp is not installed. Please use email support.'
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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

  const handleLogout = () => {
    setIsSettingsModalVisible(false);

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

  if (loading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: text }]}>{displayName}</Text>
              <Text style={[styles.headerSub, { color: muted }]}>{identityTag}</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={handleOpenNotifications}>
              <Ionicons name="notifications-outline" size={20} color="#059669" />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={handleOpenSettings}>
              <Ionicons name="settings-outline" size={20} color="#059669" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.metricTitle, { color: text }]}>Problems Solved</Text>
          <View style={styles.circleWrap}>
            <View style={styles.circleOuter}>
              <Text style={[styles.circleValue, { color: text }]}>{totalProblemsSolved}</Text>
            </View>
          </View>
          <Text style={[styles.metricFooter, { color: muted }]}>
            {topSection.name} · {topSection.solved}
          </Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionHeader, { color: text }]}>Dashboard Overview</Text>

          <View style={[styles.infoRow, !isWide && styles.infoRowStack]}>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Email</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {profileData?.email || userEmail || 'Not set'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Mobile</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {profileData?.phone || userPhone || 'Not set'}
              </Text>
            </View>
          </View>

          {(profileData?.city || profileData?.state) && (
            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: muted }]}>Location</Text>
                <Text style={[styles.infoLine, { color: text }]}>
                  {[profileData?.city, profileData?.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}

          <Pressable style={styles.editBtn} onPress={openEditModal}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.communitySection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Community</Text>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Mnemonics</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalMnemonics}</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Posts</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalPosts}</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Upvotes</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalUpvotes}</Text>
            </View>
          </View>

          <View style={styles.skillsSection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Skills</Text>
            <View style={styles.skillsWrap}>
              {skillTags.map((skill) => (
                <View
                  key={skill}
                  style={[styles.skillPill, { backgroundColor: isDark ? '#334155' : '#dcfce7' }]}
                >
                  <Text style={[styles.skillText, { color: isDark ? '#e5e7eb' : '#14532d' }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.consistencyCard, { backgroundColor: cardSoft, borderColor: border }]}>
          <View style={styles.consistencyHeader}>
            <Text style={[styles.consistencyTitle, { color: text }]}>Consistency</Text>
            <View style={styles.consistencyMetaRow}>
              <Text style={[styles.consistencyMetaText, { color: muted }]}>Total active days: <Text style={[styles.consistencyMetaValue, { color: text }]}>{consistencyHeatmap.activeDays}</Text></Text>
              <Text style={[styles.consistencyMetaText, { color: muted }]}>Max streak: <Text style={[styles.consistencyMetaValue, { color: text }]}>{consistencyHeatmap.maxStreak}</Text></Text>
              <Text style={[styles.consistencyMetaText, { color: muted }]}>{consistencyHeatmap.yearLabel}</Text>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScrollContent}>
            <View style={styles.heatmapGridWrap}>
              {consistencyHeatmap.weeks.map((week, idx) => (
                <View key={`week-${idx}`} style={styles.heatmapWeekCol}>
                  {week.map((day) => {
                    const levelBg =
                      day.level === 0
                        ? isDark
                          ? '#1e293b'
                          : '#e2e8f0'
                        : day.level === 1
                          ? '#bbf7d0'
                          : day.level === 2
                            ? '#86efac'
                            : day.level === 3
                              ? '#22c55e'
                              : '#047857';

                    return (
                      <View key={day.key} style={[styles.heatmapCell, { backgroundColor: levelBg }]} />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.heatmapLegendRow}>
            <Text style={[styles.graphText, { color: muted }]}>Less</Text>
            <View style={[styles.heatmapLegendCell, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]} />
            <View style={[styles.heatmapLegendCell, { backgroundColor: '#bbf7d0' }]} />
            <View style={[styles.heatmapLegendCell, { backgroundColor: '#86efac' }]} />
            <View style={[styles.heatmapLegendCell, { backgroundColor: '#22c55e' }]} />
            <View style={[styles.heatmapLegendCell, { backgroundColor: '#047857' }]} />
            <Text style={[styles.graphText, { color: muted }]}>More</Text>
          </View>
          <Text style={[styles.graphText, { color: muted, marginTop: 8 }]}>Daily practice consistency (last 24 weeks)</Text>
        </View>

        {savedMnemonics.length > 0 && (
          <View style={[styles.profileCard, { backgroundColor: card, borderColor: border, marginTop: 16 }]}> 
            <View style={styles.savedHeaderRow}>
              <Ionicons name="bookmark" size={18} color="#059669" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionHeader, { color: text, marginBottom: 0 }]}>Saved Mnemonics</Text>
            </View>

            {savedMnemonics.map((item) => (
              <View key={item.id} style={[styles.savedMnemonicCard, { borderBottomColor: border }]}>
                <View style={styles.savedTitleRow}>
                  <Text style={[styles.savedMnemonicWord, { color: text }]}>{item.word}</Text>
                  <Pressable onPress={() => toggleSave(item.id)} hitSlop={8}>
                    <Ionicons name="bookmark" size={18} color="#059669" />
                  </Pressable>
                </View>
                <Text style={[styles.savedMnemonicMeaning, { color: muted }]}>{item.meaning}</Text>

                <View style={styles.savedTrickBox}>
                  <Text style={[styles.savedTrickText, { color: text }]}>{item.trick}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isSettingsModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsSettingsModalVisible(false)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: card,
                borderColor: border,
                width: isWide ? 520 : width - 24,
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: border }]}>
              <Text style={[styles.modalTitle, { color: text }]}>Settings</Text>
              <Pressable onPress={() => setIsSettingsModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>

            <View style={styles.settingsBody}>
              <Pressable
                style={[styles.settingRow, { borderBottomColor: border }]}
                onPress={() => {
                  setIsSettingsModalVisible(false);
                  openEditModal();
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="person-circle-outline" size={18} color="#059669" />
                  <Text style={[styles.settingText, { color: text }]}>Edit Profile Details</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>

              <Pressable
                style={[styles.settingRow, { borderBottomColor: border }]}
                onPress={() => {
                  setIsSettingsModalVisible(false);
                  handleOpenNotifications();
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="notifications-outline" size={18} color="#059669" />
                  <Text style={[styles.settingText, { color: text }]}>Notifications</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>

              <Pressable style={[styles.settingRow, { borderBottomColor: border }]} onPress={handleToggleTheme}>
                <View style={styles.settingLeft}>
                  <Ionicons name="contrast-outline" size={18} color="#059669" />
                  <Text style={[styles.settingText, { color: text }]}>Theme Mode</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>

              <Pressable
                style={[styles.settingRow, { borderBottomColor: border }]}
                onPress={() => {
                  setIsSettingsModalVisible(false);
                  handleOpenTests();
                }}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="school-outline" size={18} color="#059669" />
                  <Text style={[styles.settingText, { color: text }]}>Practice Tests</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>

              <Pressable style={[styles.settingRow, { borderBottomColor: border }]} onPress={handleHelp}>
                <View style={styles.settingLeft}>
                  <Ionicons name="help-circle-outline" size={18} color="#059669" />
                  <Text style={[styles.settingText, { color: text }]}>Help & Support</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>

              <Pressable style={styles.logoutRow} onPress={handleLogout}>
                <View style={styles.settingLeft}>
                  <Ionicons name="log-out-outline" size={18} color="#dc2626" />
                  <Text style={styles.logoutText}>Logout</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsEditModalVisible(false)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: card,
                borderColor: border,
                width: isWide ? 520 : width - 24,
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: border }]}>
              <Text style={[styles.modalTitle, { color: text }]}>Edit Profile</Text>
              <Pressable onPress={() => setIsEditModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Full Name</Text>
                <TextInput
                  value={editForm.fullName}
                  onChangeText={(v) => updateEditField('fullName', v)}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter full name"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Email</Text>
                <TextInput
                  value={editForm.email}
                  onChangeText={(v) => updateEditField('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter email"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Phone</Text>
                <TextInput
                  value={editForm.phone}
                  onChangeText={(v) => updateEditField('phone', v)}
                  keyboardType="phone-pad"
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter phone"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={[styles.rowFields, !isWide && styles.rowFieldsStack]}>
                <View style={[styles.fieldBlock, styles.rowFieldChild]}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>City</Text>
                  <TextInput
                    value={editForm.city}
                    onChangeText={(v) => updateEditField('city', v)}
                    style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                    placeholder="City"
                    placeholderTextColor={muted}
                  />
                </View>
                <View style={[styles.fieldBlock, styles.rowFieldChild]}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>State</Text>
                  <TextInput
                    value={editForm.state}
                    onChangeText={(v) => updateEditField('state', v)}
                    style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                    placeholder="State"
                    placeholderTextColor={muted}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Exam Focus</Text>
                <TextInput
                  value={editForm.exam}
                  onChangeText={(v) => updateEditField('exam', v)}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="e.g. SSC CGL"
                  placeholderTextColor={muted}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: border }]}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalSaveBtn]} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { fontSize: 18, fontWeight: '700', color: '#059669' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 13 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  metricCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  metricTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  circleWrap: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  circleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleValue: { fontSize: 32, fontWeight: '700' },
  metricFooter: { fontSize: 13, marginTop: 4 },

  profileCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  infoRowStack: {
    flexDirection: 'column',
  },
  infoCol: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  infoLine: { fontSize: 13 },

  editBtn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#059669',
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  divider: {
    height: 1,
    marginVertical: 10,
  },

  communitySection: { marginTop: 16 },
  sectionLabel: { fontSize: 13, marginBottom: 6 },
  communityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  communityKey: { fontSize: 13, fontWeight: '500' },
  communityValue: { fontSize: 13, fontWeight: '600' },

  skillsSection: { marginTop: 16 },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  skillText: { fontSize: 12, fontWeight: '600' },

  consistencyCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  consistencyHeader: { marginBottom: 10 },
  consistencyTitle: { fontSize: 14, fontWeight: '700' },
  consistencyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  consistencyMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  consistencyMetaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  heatmapScrollContent: {
    paddingVertical: 8,
  },
  heatmapGridWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  heatmapWeekCol: {
    gap: 4,
  },
  heatmapCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  heatmapLegendRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  heatmapLegendCell: {
    width: 11,
    height: 11,
    borderRadius: 2,
  },
  graphText: {
    fontSize: 12,
    fontWeight: '500',
  },

  graphBarItem: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 44,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingsBody: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutRow: {
    marginTop: 8,
    paddingVertical: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },

  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedMnemonicCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  savedTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedMnemonicWord: { fontSize: 16, fontWeight: '700', marginBottom: 2, flex: 1 },
  savedMnemonicMeaning: { fontSize: 13, marginBottom: 8 },
  savedTrickBox: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  savedTrickText: { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: 14,
    gap: 10,
  },
  fieldBlock: {
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  rowFieldsStack: {
    flexDirection: 'column',
    gap: 2,
  },
  rowFieldChild: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  modalBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 86,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#e5e7eb',
  },
  modalSaveBtn: {
    backgroundColor: '#059669',
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
