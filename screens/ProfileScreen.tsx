import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Image,
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
import { useForums } from '../context/ForumsContext';
import { useMocks } from '../context/MocksContext';
import { useMnemonics } from '../context/MnemonicsContext';
import { useTheme } from '../context/ThemeContext';
import { userApi } from '../services/api';
import { buildUserStorageScope, withUserScope } from '../utils/storageScope';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';
import Svg, { Circle, Defs, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';

const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';
const DAILY_EXAM_HISTORY_STORAGE_KEY = 'daily_exam_history_v1';
const USERNAME_LAST_EDIT_AT_STORAGE_KEY = 'profile_username_last_edit_at_v1';
const USERNAME_EDIT_LOCK_MS = 365 * 24 * 60 * 60 * 1000;

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

const hasUsableAuthToken = (token: string | null) => {
  if (!token) return false;
  const trimmed = token.trim();
  if (!trimmed || trimmed === 'true' || trimmed === 'dev-bypass-token') {
    return false;
  }

  return trimmed.split('.').length === 3;
};

const clearAuthKeysEverywhere = async () => {
  try {
    await Promise.all(AUTH_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Failed removing auth keys individually', error);
  }

  try {
    await Promise.all(AUTH_STORAGE_KEYS.map((key) => AsyncStorage.removeItem(key)));
  } catch (error) {
    console.error('Failed removing auth keys in bulk', error);
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

const toFiniteNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const firstPositive = (...values: Array<unknown>) => {
  for (const value of values) {
    const num = toFiniteNumber(value);
    if (num != null && num > 0) {
      return num;
    }
  }
  return 0;
};

const parseRelativeTimestamp = (value: string): Date | null => {
  const clean = value.trim().toLowerCase();
  if (!clean) return null;
  if (clean === 'just now') return new Date();

  const match = clean.match(/^(\d+)\s*([mhdw])\s*ago$/);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(amount) || amount < 0) return null;

  const date = new Date();
  if (unit === 'm') {
    date.setMinutes(date.getMinutes() - amount);
  } else if (unit === 'h') {
    date.setHours(date.getHours() - amount);
  } else if (unit === 'd') {
    date.setDate(date.getDate() - amount);
  } else if (unit === 'w') {
    date.setDate(date.getDate() - amount * 7);
  }

  return date;
};

const parseToAppDate = (raw: unknown): Date | null => {
  const parsed = parseToValidDate(raw);
  if (parsed) return parsed;

  if (typeof raw === 'string') {
    return parseRelativeTimestamp(raw);
  }

  return null;
};

const toRelativeTime = (value: Date) => {
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const getNiceStep = (raw: number) => {
  if (!Number.isFinite(raw) || raw <= 0) return 10;

  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;

  if (normalized <= 1) return magnitude;
  if (normalized <= 2) return 2 * magnitude;
  if (normalized <= 5) return 5 * magnitude;
  return 10 * magnitude;
};

const buildMonotoneCubicPath = (points: Array<{ x: number; y: number }>) => {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const count = points.length;
  const slopes = new Array<number>(count - 1).fill(0);
  const tangents = new Array<number>(count).fill(0);

  for (let i = 0; i < count - 1; i += 1) {
    const dx = points[i + 1].x - points[i].x;
    if (Math.abs(dx) < 1e-6) {
      slopes[i] = 0;
      continue;
    }
    slopes[i] = (points[i + 1].y - points[i].y) / dx;
  }

  tangents[0] = slopes[0];
  tangents[count - 1] = slopes[count - 2];

  for (let i = 1; i < count - 1; i += 1) {
    tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
  }

  for (let i = 0; i < count - 1; i += 1) {
    if (Math.abs(slopes[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }

    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const magnitude = Math.hypot(a, b);

    if (magnitude > 3) {
      const t = 3 / magnitude;
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < count - 1; i += 1) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const cp1x = p0.x + dx / 3;
    const cp1y = p0.y + (tangents[i] * dx) / 3;
    const cp2x = p1.x - dx / 3;
    const cp2y = p1.y - (tangents[i + 1] * dx) / 3;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return path;
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
  const { isDark } = useTheme();
  const hasUnreadNotifications = useHasUnreadNotifications();
  const { posts } = useForums();
  const { recentAttempts } = useMocks();
  const { mnemonics } = useMnemonics();

  const [profileData, setProfileData] = useState<any>(null);
  const [resultHistory, setResultHistory] = useState<StoredResult[]>([]);
  const [dailyExamHistory, setDailyExamHistory] = useState<DailyExamResultEntry[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
  });
  const [canEditUsername, setCanEditUsername] = useState(true);
  const [usernameUnlockHint, setUsernameUnlockHint] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeRatingRange, setActiveRatingRange] = useState<'1m' | '3m' | '6m' | 'all'>('1m');
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'practice' | 'mocks' | 'community'>('all');
  const [friendQuery, setFriendQuery] = useState('');
  const graphReveal = useMemo(() => new Animated.Value(0), []);
  const ratingSwitchAnim = useMemo(() => new Animated.Value(1), []);
  const listSwitchAnim = useMemo(() => new Animated.Value(1), []);

  const isWide = width >= 720;

  const bg = isDark ? '#0f172a' : '#fdfdfd';
  const card = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? '#334155' : '#e5e7eb';
  const footerSafeBottom = Math.max(insets.bottom, 6);
  const footerBarHeight = 68 + footerSafeBottom;
  const storageScope = useMemo(() => buildUserStorageScope(userEmail, userName), [userEmail, userName]);
  const resultHistoryStorageKey = useMemo(
    () => withUserScope(RESULT_HISTORY_STORAGE_KEY, storageScope),
    [storageScope]
  );
  const dailyExamHistoryStorageKey = useMemo(
    () => withUserScope(DAILY_EXAM_HISTORY_STORAGE_KEY, storageScope),
    [storageScope]
  );
  const usernameLastEditAtStorageKey = useMemo(
    () => withUserScope(USERNAME_LAST_EDIT_AT_STORAGE_KEY, storageScope),
    [storageScope]
  );
  const gradientIdSuffix = useMemo(() => Math.random().toString(36).slice(2, 10), []);
  const profileHeroGradientId = useMemo(() => `profileHeroGrad_${gradientIdSuffix}`, [gradientIdSuffix]);
  const profileEditBtnGradientId = useMemo(() => `profileEditBtnGrad_${gradientIdSuffix}`, [gradientIdSuffix]);
  const ratingAreaGradientId = useMemo(() => `ratingGrad_${gradientIdSuffix}`, [gradientIdSuffix]);
  const ratingLineGradientId = useMemo(() => `ratingLineGrad_${gradientIdSuffix}`, [gradientIdSuffix]);

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
          AsyncStorage.getItem(resultHistoryStorageKey),
          AsyncStorage.getItem(dailyExamHistoryStorageKey),
        ]);

        const storedResults = storedResultsRaw ? JSON.parse(storedResultsRaw) : [];
        const storedDailyExamHistory = dailyExamHistoryRaw ? JSON.parse(dailyExamHistoryRaw) : [];
        if (Array.isArray(storedResults)) {
          setResultHistory(storedResults);
        }
        if (Array.isArray(storedDailyExamHistory)) {
          setDailyExamHistory(storedDailyExamHistory);
        }

        if (isLoggedIn === 'true' && hasUsableAuthToken(token)) {
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
  }, [dailyExamHistoryStorageKey, resultHistoryStorageKey]);

  useFocusEffect(
    useMemo(
      () => () => {
        let isActive = true;

        const refreshProfileStats = async () => {
          try {
            const [isLoggedIn, token, storedResultsRaw, dailyExamHistoryRaw] = await Promise.all([
              AsyncStorage.getItem('isLoggedIn'),
              AsyncStorage.getItem('userToken'),
              AsyncStorage.getItem(resultHistoryStorageKey),
              AsyncStorage.getItem(dailyExamHistoryStorageKey),
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

            if (isLoggedIn === 'true' && hasUsableAuthToken(token)) {
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
      [dailyExamHistoryStorageKey, resultHistoryStorageKey]
    )
  );

  useEffect(() => {
    graphReveal.setValue(0);
    Animated.timing(graphReveal, {
      toValue: 1,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [resultHistory, dailyExamHistory, recentAttempts, graphReveal]);

  useEffect(() => {
    ratingSwitchAnim.setValue(0.86);
    Animated.timing(ratingSwitchAnim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeRatingRange, ratingSwitchAnim]);

  useEffect(() => {
    listSwitchAnim.setValue(0.75);
    Animated.timing(listSwitchAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activeHistoryTab, friendQuery, listSwitchAnim]);

  const displayName = profileData?.fullName || profileData?.username || userName || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const identityTag = profileData?.role || 'Learner';

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

  const sectionAttemptedMap = useMemo(() => {
    const map: Record<string, number> = {};
    resultHistory.forEach((item) => {
      (item.sectionBreakup || []).forEach((sectionItem) => {
        map[sectionItem.section] = (map[sectionItem.section] || 0) + (sectionItem.attempted || 0);
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
  const totalUpvotes = posts.reduce((sum, p: any) => sum + Number(p?.likes || 0), 0);

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
      currentStreak,
      maxStreak,
      yearLabel: `${start.getFullYear()} - ${end.getFullYear()}`,
    };
  }, [resultHistory, recentAttempts, dailyExamHistory]);

  const ratingTimeline = useMemo(() => {
    const events: Array<{ at: number; attempted: number; accuracy: number }> = [];

    resultHistory.forEach((item) => {
      const date = parseToValidDate(item.submittedAt);
      if (!date) return;

      const attempted = firstPositive(item.attempted);
      if (!attempted) return;

      const correct = Math.max(0, Number(item.correct || 0));
      const accuracy = attempted > 0 ? Math.max(0, Math.min(1, correct / attempted)) : 0.5;
      events.push({ at: date.getTime(), attempted, accuracy });
    });

    dailyExamHistory.forEach((item) => {
      const date = parseToValidDate(item.completedAt);
      if (!date) return;

      const attempted = firstPositive(item.attempted, item.totalQuestions);
      if (!attempted) return;

      const correctRaw = toFiniteNumber((item as any).correct);
      const accuracy =
        correctRaw != null && attempted > 0
          ? Math.max(0, Math.min(1, correctRaw / attempted))
          : 0.5;

      events.push({ at: date.getTime(), attempted, accuracy });
    });

    recentAttempts.forEach((attempt: any) => {
      const date = parseToValidDate(attempt?.createdAt || attempt?.submittedAt);
      if (!date) return;

      const attempted = firstPositive(
        attempt?.attempted,
        attempt?.results?.attempted,
        attempt?.testId?.questionCount,
        attempt?.testId?.totalQuestions
      );
      if (!attempted) return;

      const accuracyRaw = toFiniteNumber(attempt?.accuracy);
      const correctRaw = toFiniteNumber(attempt?.correct ?? attempt?.results?.correct);
      const accuracy =
        accuracyRaw != null
          ? Math.max(0, Math.min(1, accuracyRaw / 100))
          : correctRaw != null
          ? Math.max(0, Math.min(1, correctRaw / attempted))
          : 0.5;

      events.push({ at: date.getTime(), attempted, accuracy });
    });

    const ordered = events
      .filter((event) => event.attempted > 0 && Number.isFinite(event.at))
      .sort((a, b) => a.at - b.at);

    let rating = 1000;
    const points = ordered.map((event, index) => {
      const performance = Math.round((event.accuracy - 0.5) * 95);
      const activityBoost = Math.min(16, Math.round(Math.log2(event.attempted + 1) * 4));
      const delta = Math.max(-38, Math.min(45, performance + activityBoost));
      rating = Math.max(800, Math.min(2500, rating + delta));

      const pointDate = new Date(event.at);
      return {
        id: `${formatLocalDateKey(pointDate)}-${index}`,
        label: pointDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        date: pointDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        at: event.at,
        rating,
        rank: Math.max(1, Math.round(1650 - (rating - 900) * 0.95)),
        delta,
      };
    });

    return { points };
  }, [resultHistory, dailyExamHistory, recentAttempts]);

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

  const openEditModal = async () => {
    let allowUsernameEdit = true;
    let unlockHint = '';

    try {
      const lastUsernameEditAt = await AsyncStorage.getItem(usernameLastEditAtStorageKey);
      if (lastUsernameEditAt) {
        const parsed = new Date(lastUsernameEditAt);
        if (!isNaN(parsed.getTime())) {
          const unlockAt = parsed.getTime() + USERNAME_EDIT_LOCK_MS;
          if (Date.now() < unlockAt) {
            allowUsernameEdit = false;
            unlockHint = `Username can be changed after ${new Date(unlockAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}`;
          }
        }
      }
    } catch {
      // Keep username editable if local lock metadata is unavailable.
    }

    setCanEditUsername(allowUsernameEdit);
    setUsernameUnlockHint(unlockHint);

    setEditForm({
      fullName: String(profileData?.fullName || profileData?.username || userName || ''),
      email: String(profileData?.email || userEmail || ''),
      phone: String(profileData?.phone || userPhone || ''),
      city: String(profileData?.city || ''),
    });
    setIsEditModalVisible(true);
  };

  const updateEditField = (key: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = async () => {
    const currentName = String(profileData?.fullName || profileData?.username || userName || '').trim();
    const requestedName = editForm.fullName.trim();
    const finalName = canEditUsername ? requestedName || currentName : currentName;
    const didUsernameChange = canEditUsername && !!finalName && finalName !== currentName;
    const lockedEmail = String(profileData?.email || userEmail || '').trim();
    const lockedPhone = String(profileData?.phone || userPhone || '').trim();

    if (didUsernameChange) {
      try {
        await AsyncStorage.setItem(usernameLastEditAtStorageKey, new Date().toISOString());
      } catch {
        // Continue save even if local lock timestamp fails to persist.
      }
    }

    const updatedProfile = {
      ...(profileData ?? {}),
      fullName: finalName,
      username: finalName,
      email: lockedEmail,
      phone: lockedPhone,
      city: editForm.city.trim(),
    };

    setProfileData(updatedProfile);

    if (updatedProfile.fullName) {
      setUserName(updatedProfile.fullName);
    }
    setUserEmail(lockedEmail);
    setUserPhone(lockedPhone);

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

  const handleOpenNotifications = () => {
    navigation.navigate('Notifications');
  };

  const navigateToMainHome = () => {
    navigation.navigate('Main', {
      screen: 'Home',
      params: { screen: 'DashboardMain' },
    });
  };

  const handleOpenPyqsTab = () => {
    navigation.navigate('Main', { screen: 'PYQs' });
  };

  const handleOpenHomeTab = () => {
    navigateToMainHome();
  };

  const handleOpenMocksTab = () => {
    navigation.navigate('Main', { screen: 'Mocks' });
  };

  const handleOpenForumsTab = () => {
    navigation.navigate('Main', { screen: 'Forums' });
  };

  const handleOpenPremiumTab = () => {
    navigation.navigate('Main', { screen: 'Premium' });
  };

  const handleOpenMenuDrawer = () => {
    navigation.navigate('MenuDrawer');
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

  const ratingRangeDays = activeRatingRange === '1m' ? 30 : activeRatingRange === '3m' ? 90 : activeRatingRange === '6m' ? 180 : 365;
  const ratingRangeEndAt = Date.now();
  const ratingRangeStartAt = ratingRangeEndAt - ratingRangeDays * 24 * 60 * 60 * 1000;

  const ratingPoints = useMemo(() => {
    const visiblePoints = ratingTimeline.points.filter(
      (point) => point.at >= ratingRangeStartAt && point.at <= ratingRangeEndAt
    );

    if (visiblePoints.length === 0) {
      return [] as typeof ratingTimeline.points;
    }

    if (visiblePoints[0].at > ratingRangeStartAt) {
      const previousPoint = [...ratingTimeline.points].reverse().find((point) => point.at < ratingRangeStartAt);
      if (previousPoint) {
        return [
          {
            ...previousPoint,
            id: `${previousPoint.id}-carry-${activeRatingRange}`,
            at: ratingRangeStartAt,
            delta: 0,
          },
          ...visiblePoints,
        ];
      }
    }

    return visiblePoints;
  }, [activeRatingRange, ratingRangeEndAt, ratingRangeStartAt, ratingTimeline.points]);

  const ratingCurrent = ratingPoints.length > 0 ? ratingPoints[ratingPoints.length - 1].rating : 0;
  const ratingDelta = ratingPoints.length > 1 ? ratingCurrent - ratingPoints[0].rating : 0;

  const ratingChartWidth = Math.max(240, Math.min(width - 72, 420));
  const ratingChartHeight = 186;
  const chartPadTop = 12;
  const chartPadRight = 10;
  const chartPadBottom = 30;
  const chartPadLeft = 34;
  const ratingPlotWidth = Math.max(1, ratingChartWidth - chartPadLeft - chartPadRight);
  const ratingPlotHeight = Math.max(1, ratingChartHeight - chartPadTop - chartPadBottom);
  const xDomainRange = Math.max(1, ratingRangeEndAt - ratingRangeStartAt);

  const ratingMin = ratingPoints.length > 0 ? Math.min(...ratingPoints.map((p) => p.rating)) : 980;
  const ratingMax = ratingPoints.length > 0 ? Math.max(...ratingPoints.map((p) => p.rating)) : 1020;
  const yDomainPadding = Math.max(20, Math.round((ratingMax - ratingMin) * 0.15));
  const rawYMin = Math.max(0, ratingMin - yDomainPadding);
  const rawYMax = ratingMax + yDomainPadding;
  const yTickStep = getNiceStep((rawYMax - rawYMin) / 4);
  const yDomainMin = Math.floor(rawYMin / yTickStep) * yTickStep;
  const yDomainMax = Math.ceil(rawYMax / yTickStep) * yTickStep;
  const yDomainRange = Math.max(1, yDomainMax - yDomainMin);

  const ratingCoords = ratingPoints.map((point) => {
    const xRatio = Math.max(0, Math.min(1, (point.at - ratingRangeStartAt) / xDomainRange));
    const x = chartPadLeft + xRatio * ratingPlotWidth;
    const y = chartPadTop + (1 - (point.rating - yDomainMin) / yDomainRange) * ratingPlotHeight;
    return { x, y };
  });

  const ratingPolyline = ratingCoords.map((point) => `${point.x},${point.y}`).join(' ');

  const ratingMonotoneLinePath = useMemo(() => buildMonotoneCubicPath(ratingCoords), [ratingCoords]);

  const ratingAreaPath = useMemo(() => {
    if (ratingCoords.length < 2) return '';
    const baseY = chartPadTop + ratingPlotHeight;
    const first = ratingCoords[0];
    const last = ratingCoords[ratingCoords.length - 1];

    if (ratingMonotoneLinePath) {
      return `${ratingMonotoneLinePath} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
    }

    return `M ${first.x} ${first.y} ${ratingCoords.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`;
  }, [chartPadTop, ratingCoords, ratingPlotHeight, ratingMonotoneLinePath]);

  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let value = yDomainMin; value <= yDomainMax + yTickStep * 0.5; value += yTickStep) {
      ticks.push(Math.round(value));
    }
    return ticks.reverse();
  }, [yDomainMin, yDomainMax, yTickStep]);

  const yForTick = (value: number) => chartPadTop + (1 - (value - yDomainMin) / yDomainRange) * ratingPlotHeight;

  const xAxisLabels = useMemo(() => {
    const tickCount = activeRatingRange === '1m' ? 5 : activeRatingRange === '3m' ? 4 : activeRatingRange === '6m' ? 7 : 5;
    if (tickCount <= 1) return [] as Array<{ id: string; x: number; label: string }>;

    return Array.from({ length: tickCount }, (_, idx) => {
      const ratio = idx / (tickCount - 1);
      const at = ratingRangeStartAt + ratio * (ratingRangeEndAt - ratingRangeStartAt);
      const dt = new Date(at);

      const label =
        activeRatingRange === '1m'
          ? dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : activeRatingRange === 'all'
          ? dt.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
          : dt.toLocaleDateString('en-IN', { month: 'short' });

      return {
        id: `x-${idx}`,
        x: chartPadLeft + ratio * ratingPlotWidth,
        label,
      };
    });
  }, [activeRatingRange, chartPadLeft, ratingPlotWidth, ratingRangeEndAt, ratingRangeStartAt]);

  const profileUsername = (profileData?.username || displayName || 'user').toLowerCase().replace(/\s+/g, '_');
  const profileBio = String((profileData as any)?.bio || '').trim() || 'Stay consistent. Small daily progress leads to big exam results.';

  const subjectRows = useMemo(() => {
    const palette = ['#3b82f6', '#059669', '#f59e0b', '#ec4899', '#8b5cf6', '#0ea5e9'];
    const rows = Object.entries(sectionSolvedMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, solved], idx) => {
        const attempted = Number(sectionAttemptedMap[name] || 0);
        const accuracy = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
        return {
          name,
          color: palette[idx % palette.length],
          solved,
          accuracy,
          id: `${name}-${idx}`,
        };
      });

    return rows;
  }, [sectionAttemptedMap, sectionSolvedMap]);

  const friendsData = useMemo(() => {
    const palette = ['#ec4899', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#0ea5e9'];
    const currentUser = displayName.trim().toLowerCase();
    const peers = new Map<string, { name: string; activity: number }>();

    posts.forEach((post) => {
      const name = String(post?.author || '').trim();
      if (!name || name.toLowerCase() === currentUser) return;

      const key = name.toLowerCase();
      const likeScore = Math.max(0, Number(post?.likes || 0));
      const contribution = 1 + Math.min(6, Math.floor(likeScore / 10));

      if (!peers.has(key)) {
        peers.set(key, { name, activity: contribution });
      } else {
        const existing = peers.get(key)!;
        existing.activity += contribution;
      }
    });

    return Array.from(peers.values())
      .sort((a, b) => b.activity - a.activity || a.name.localeCompare(b.name))
      .slice(0, 16)
      .map((peer, idx) => ({
        name: peer.name,
        city: 'Community',
        streak: peer.activity,
        color: palette[idx % palette.length],
      }));
  }, [displayName, posts]);

  const visibleFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    const alphaSorted = [...friendsData].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return alphaSorted;

    const score = (item: (typeof friendsData)[number]) => {
      const n = item.name.toLowerCase();
      const c = item.city.toLowerCase();
      if (n.startsWith(q)) return 0;
      if (c.startsWith(q)) return 1;
      if (n.includes(q)) return 2;
      if (c.includes(q)) return 3;
      return 9;
    };

    return alphaSorted
      .filter((item) => score(item) < 9)
      .sort((a, b) => {
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      });
  }, [friendQuery, friendsData]);

  const historyItems = useMemo(() => {
    const items: Array<{
      title: string;
      type: 'practice' | 'mocks' | 'community';
      when: string;
      badge: 'Practice' | 'Mock' | 'Community';
      score: string;
      sub: string;
      at: number;
    }> = [];

    resultHistory.forEach((item) => {
      const date = parseToAppDate(item.submittedAt);
      if (!date) return;

      const attempted = firstPositive(item.attempted);
      const correct = Math.max(0, Number(item.correct || 0));
      const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : null;
      const isMock = item.sourceTab === 'RankMaker';

      items.push({
        title: String(item.testTitle || (isMock ? 'Rank Maker Test' : 'Practice Test')),
        type: isMock ? 'mocks' : 'practice',
        when: toRelativeTime(date),
        badge: isMock ? 'Mock' : 'Practice',
        score: accuracy != null ? `${accuracy}%` : '',
        sub: attempted > 0 ? `${correct}/${attempted}` : '',
        at: date.getTime(),
      });
    });

    dailyExamHistory.forEach((entry) => {
      const date = parseToAppDate(entry.completedAt);
      if (!date) return;

      const attempted = firstPositive(entry.attempted, entry.totalQuestions);
      const correctRaw = toFiniteNumber((entry as any)?.correct);
      const accuracy =
        correctRaw != null && attempted > 0
          ? Math.round((correctRaw / attempted) * 100)
          : null;
      const mode = entry.mode === 'challenge' ? 'Daily Challenge' : 'Daily Quiz';

      items.push({
        title: mode,
        type: 'practice',
        when: toRelativeTime(date),
        badge: 'Practice',
        score: accuracy != null ? `${accuracy}%` : '',
        sub: attempted > 0 ? `${attempted} Qs` : '',
        at: date.getTime(),
      });
    });

    recentAttempts.forEach((attempt: any) => {
      const date = parseToAppDate(attempt?.createdAt || attempt?.submittedAt);
      if (!date) return;

      const testRef = attempt?.testId && typeof attempt.testId === 'object' ? attempt.testId : null;
      const title = String(testRef?.title || attempt?.title || 'Mock Attempt');
      const accuracyRaw = toFiniteNumber(attempt?.accuracy);
      const scoreRaw = toFiniteNumber(attempt?.score);

      items.push({
        title,
        type: 'mocks',
        when: toRelativeTime(date),
        badge: 'Mock',
        score: accuracyRaw != null ? `${Math.round(accuracyRaw)}%` : '',
        sub: scoreRaw != null ? `Score ${Number.isInteger(scoreRaw) ? scoreRaw : scoreRaw.toFixed(1)}` : '',
        at: date.getTime(),
      });
    });

    posts.forEach((post) => {
      const date = parseToAppDate(post.timestamp);
      if (!date) return;

      items.push({
        title: String(post.title || 'Forum Post'),
        type: 'community',
        when: toRelativeTime(date),
        badge: 'Community',
        score: '',
        sub: '',
        at: date.getTime(),
      });
    });

    return items.sort((a, b) => b.at - a.at).slice(0, 24);
  }, [dailyExamHistory, posts, recentAttempts, resultHistory]);

  const visibleHistory = useMemo(() => {
    if (activeHistoryTab === 'all') return historyItems;
    return historyItems.filter((item) => item.type === activeHistoryTab);
  }, [activeHistoryTab, historyItems]);

  if (loading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: footerBarHeight + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.homeHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}> 
          <Pressable style={styles.homeBrandRow} onPress={handleOpenHomeTab}>
            <Image source={require('../assets/sscguidelogo.png')} style={styles.homeBrandLogo} resizeMode="contain" />
            <Text style={styles.homeBrandText}>
              My<Text style={styles.htmlBrandAccent}>SSC</Text>guide
            </Text>
          </Pressable>
          <View style={styles.homeHeaderActions}>
            <Pressable style={styles.homeIconBtn} onPress={handleOpenNotifications}>
              <Ionicons name="notifications" size={16} color="#f59e0b" />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable style={styles.homeAvatarBtn} onPress={handleOpenMenuDrawer}>
              <Text style={styles.homeAvatarText}>{initial}</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.htmlProfileCard, { backgroundColor: card, borderColor: border }]}> 
          <View style={styles.profileHero}>
            <Svg width="100%" height="100%" viewBox="0 0 360 170" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id={profileHeroGradientId} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor="#34d399" />
                  <Stop offset="100%" stopColor="#047857" />
                </LinearGradient>
              </Defs>
              <Rect x="0" y="0" width="360" height="170" fill={`url(#${profileHeroGradientId})`} />
              <Path d="M0 122 Q180 168 360 122 L360 170 L0 170 Z" fill={card} />
            </Svg>
            <Text style={styles.profileHeroTitle}>PROFILE</Text>
          </View>

          <View style={styles.profileAvatarWrap}>
            <View style={styles.profileAvatarClean}>
              <Text style={styles.htmlAvatarCircleText}>{initial}</Text>
            </View>
          </View>

          <View style={styles.profileContent}>
            <Text style={[styles.htmlProfileName, { color: text }]}>{displayName}</Text>
            <Text style={[styles.htmlProfileSub, { color: muted }]}>{identityTag}</Text>
            <Text style={[styles.profileBio, { color: muted }]}>{profileBio}</Text>

            <Pressable style={styles.htmlEditBtn} onPress={openEditModal}>
              <Svg width="100%" height="100%" viewBox="0 0 220 44" preserveAspectRatio="none" style={styles.editBtnGradientBg}>
                <Defs>
                  <LinearGradient id={profileEditBtnGradientId} x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#10b981" />
                    <Stop offset="100%" stopColor="#059669" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="220" height="44" rx="12" fill={`url(#${profileEditBtnGradientId})`} />
              </Svg>
              <Text style={styles.htmlEditBtnText}>Edit Profile</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.sectionTitleRowAlt}>
          <Text style={styles.sectionTitleMain}>Activity</Text>
          <Text style={styles.sectionTitleSub}>Last 24 weeks</Text>
        </View>

        <View style={[styles.htmlHeatmapCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.htmlHeatmapHeader}>
            <Text style={[styles.htmlHeatmapTitle, { color: text }]}>Study activity</Text>
            <View style={styles.htmlHeatLegendRow}>
              <Text style={[styles.graphText, { color: muted }]}>Less</Text>
              <View style={[styles.heatmapLegendCell, { backgroundColor: '#e2e8f0' }]} />
              <View style={[styles.heatmapLegendCell, { backgroundColor: '#bbf7d0' }]} />
              <View style={[styles.heatmapLegendCell, { backgroundColor: '#86efac' }]} />
              <View style={[styles.heatmapLegendCell, { backgroundColor: '#22c55e' }]} />
              <View style={[styles.heatmapLegendCell, { backgroundColor: '#047857' }]} />
              <Text style={[styles.graphText, { color: muted }]}>More</Text>
            </View>
          </View>

          <View style={styles.htmlHeatmapGridRow}>
            <View style={styles.htmlHeatDaysLabel}>
              <Text style={styles.htmlHeatDayText}>Mon</Text>
              <Text style={styles.htmlHeatDayText}>Wed</Text>
              <Text style={styles.htmlHeatDayText}>Fri</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heatmapScrollContent}>
              <View style={styles.heatmapGridWrap}>
                {consistencyHeatmap.weeks.map((week, idx) => (
                  <View key={`week-${idx}`} style={styles.heatmapWeekCol}>
                    {week.map((day) => {
                      const levelBg =
                        day.level === 0
                          ? '#e2e8f0'
                          : day.level === 1
                            ? '#bbf7d0'
                            : day.level === 2
                              ? '#86efac'
                              : day.level === 3
                                ? '#22c55e'
                                : '#047857';

                      return <View key={day.key} style={[styles.heatmapCell, { backgroundColor: levelBg }]} />;
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.htmlSummaryRow}>
            <View style={styles.htmlSummaryItem}>
              <Text style={[styles.htmlSummaryValue, { color: text }]}>{consistencyHeatmap.activeDays}</Text>
              <Text style={[styles.htmlSummaryLabel, { color: muted }]}>Total Days</Text>
            </View>
            <View style={styles.htmlSummaryItem}>
              <Text style={[styles.htmlSummaryValue, { color: text }]}>{consistencyHeatmap.currentStreak}</Text>
              <Text style={[styles.htmlSummaryLabel, { color: muted }]}>Current Streak</Text>
            </View>
            <View style={styles.htmlSummaryItem}>
              <Text style={[styles.htmlSummaryValue, { color: text }]}>{consistencyHeatmap.maxStreak}</Text>
              <Text style={[styles.htmlSummaryLabel, { color: muted }]}>Longest Streak</Text>
            </View>
          </View>
        </View>

        <Animated.View
          style={[
            styles.ratingCard,
            {
              backgroundColor: card,
              borderColor: border,
              opacity: graphReveal,
              transform: [
                {
                  translateY: graphReveal.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.ratingAccentBar} />
          <View style={styles.ratingTopRow}>
            <View style={styles.ratingTitleWrap}>
              <View style={styles.ratingIconBadge}>
                <Ionicons name="trending-up" size={14} color="#ffffff" />
              </View>
              <View>
                <Text style={[styles.sectionHeader, { color: text, marginBottom: 0 }]}>Contest Rating</Text>
                <Text style={styles.ratingSubTight}>Performance over time</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.ratingValue, { color: text }]}>{ratingCurrent || '—'}</Text>
              <Text style={[styles.ratingDelta, { color: ratingDelta >= 0 ? '#059669' : '#dc2626' }]}>
                {ratingPoints.length > 0 ? `${ratingDelta >= 0 ? '↑' : '↓'} ${Math.abs(ratingDelta)} pts` : 'No contests yet'}
              </Text>
            </View>
          </View>

          <View style={styles.ratingTabsRow}>
            {(['1m', '3m', '6m', 'all'] as const).map((range) => (
              <Pressable
                key={range}
                style={[styles.ratingTabBtn, activeRatingRange === range && styles.ratingTabBtnOn]}
                onPress={() => setActiveRatingRange(range)}
              >
                <Text style={[styles.ratingTabText, activeRatingRange === range && styles.ratingTabTextOn]}>{range === 'all' ? '1Y' : range.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <Animated.View
            style={{
              opacity: ratingSwitchAnim,
              transform: [
                {
                  translateX: ratingSwitchAnim.interpolate({
                    inputRange: [0.86, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            }}
          >
          {ratingPoints.length > 0 ? (
            <View style={styles.chartWrap}>
              <Svg width={ratingChartWidth} height={ratingChartHeight}>
                <Defs>
                  <LinearGradient id={ratingAreaGradientId} x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="hsl(263, 55%, 52%)" stopOpacity={0.25} />
                    <Stop offset="100%" stopColor="hsl(263, 55%, 52%)" stopOpacity={0} />
                  </LinearGradient>
                  <LinearGradient id={ratingLineGradientId} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor="#06b6d4" />
                    <Stop offset="100%" stopColor="#7c3aed" />
                  </LinearGradient>
                </Defs>
                {yTicks.map((tick) => {
                  const y = yForTick(tick);
                  return (
                    <Path
                      key={`grid-${tick}`}
                      d={`M ${chartPadLeft} ${y} L ${chartPadLeft + ratingPlotWidth} ${y}`}
                      stroke={isDark ? '#334155' : '#e5e7eb'}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  );
                })}
                {yTicks.map((tick) => (
                  <SvgText key={`ylabel-${tick}`} x={chartPadLeft - 4} y={yForTick(tick) + 3} fill="#94a3b8" fontSize="9" textAnchor="end">{tick}</SvgText>
                ))}
                <Path d={`M ${chartPadLeft} ${chartPadTop + ratingPlotHeight} L ${chartPadLeft + ratingPlotWidth} ${chartPadTop + ratingPlotHeight}`} stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={1} />
                {!!ratingAreaPath && <Path d={ratingAreaPath} fill={`url(#${ratingAreaGradientId})`} />}
                {ratingCoords.length > 1 &&
                  (!!ratingMonotoneLinePath ? (
                    <>
                      <Path
                        d={ratingMonotoneLinePath}
                        fill="none"
                        stroke={isDark ? '#8b5cf6' : '#6d28d9'}
                        strokeWidth={3.2}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeOpacity={0.95}
                      />
                      <Path
                        d={ratingMonotoneLinePath}
                        fill="none"
                        stroke={`url(#${ratingLineGradientId})`}
                        strokeWidth={2.6}
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </>
                  ) : (
                    <>
                      <Polyline
                        points={ratingPolyline}
                        fill="none"
                        stroke={isDark ? '#8b5cf6' : '#6d28d9'}
                        strokeWidth="3.2"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                        strokeOpacity={0.95}
                      />
                      <Polyline
                        points={ratingPolyline}
                        fill="none"
                        stroke={`url(#${ratingLineGradientId})`}
                        strokeWidth="2.6"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </>
                  ))}
                {ratingPoints.map((point, idx) => {
                  const coord = ratingCoords[idx];
                  if (!coord) return null;
                  return (
                    <Circle
                      key={point.id}
                      cx={coord.x}
                      cy={coord.y}
                      r={idx === ratingPoints.length - 1 ? 4 : 3.5}
                      fill="#6f3cc3"
                      stroke="#ffffff"
                      strokeWidth={2}
                    />
                  );
                })}
                {xAxisLabels.map((label) => (
                  <SvgText key={`x-${label.id}`} x={label.x} y={ratingChartHeight - 6} fill="#64748b" fontSize={activeRatingRange === '1m' ? '8.5' : '8'} textAnchor="middle">
                    {label.label}
                  </SvgText>
                ))}
              </Svg>
            </View>
          ) : (
            <View style={styles.ratingEmptyState}>
              <Ionicons name="analytics-outline" size={22} color={muted} />
              <Text style={[styles.ratingEmptyText, { color: muted }]}>Join a contest to unlock your rating curve.</Text>
            </View>
          )}
          </Animated.View>
        </Animated.View>


        <View style={[styles.communityFootprintCard, { backgroundColor: card, borderColor: border }]}> 
          <View style={styles.communityFootprintHeaderRow}>
            <Text style={[styles.communityFootprintTitle, { color: text }]}>Community footprint</Text>
            <Text style={styles.communityLinkText}>View All →</Text>
          </View>
          <View style={styles.communityFootprintGrid}>
            <View style={[styles.communityFootprintCell, { borderRightColor: border }]}>
              <Ionicons name="book" size={16} color="#059669" />
              <Text style={[styles.communityFootprintVal, { color: text }]}>{totalMnemonics}</Text>
              <Text style={[styles.communityFootprintLbl, { color: muted }]}>Mnemonics</Text>
            </View>
            <View style={[styles.communityFootprintCell, { borderRightColor: border }]}>
              <Ionicons name="chatbubble" size={16} color="#2563eb" />
              <Text style={[styles.communityFootprintVal, { color: text }]}>{totalPosts}</Text>
              <Text style={[styles.communityFootprintLbl, { color: muted }]}>Forum Posts</Text>
            </View>
            <View style={styles.communityFootprintCell}>
              <Ionicons name="heart" size={16} color="#f43f5e" />
              <Text style={[styles.communityFootprintVal, { color: text }]}>{totalUpvotes}</Text>
              <Text style={[styles.communityFootprintLbl, { color: muted }]}>Upvotes</Text>
            </View>
          </View>
        </View>

        <View style={[styles.sectionTitleRowAlt, styles.subjectSectionSpacer]}>
          <Text style={styles.sectionTitleMain}>Subject Performance</Text>
          <Text style={styles.sectionTitleSub}>Practice summary</Text>
        </View>

        <View style={[styles.subjectCard, { backgroundColor: card, borderColor: border }]}> 
          <View style={[styles.subjectHeaderRow, { borderBottomColor: '#f1f5f9' }]}>
            <Text style={styles.subjectHeadLeft}>Subject</Text>
            <Text style={styles.subjectHeadCell}>Solved</Text>
            <Text style={styles.subjectHeadCell}>Accuracy</Text>
          </View>
          {subjectRows.length === 0 ? (
            <Text style={styles.panelEmptyText}>No subject-wise stats yet.</Text>
          ) : (
            subjectRows.map((row) => (
              <View key={row.id} style={[styles.subjectItemRow, { borderBottomColor: '#f8fafc' }]}>
                <View style={styles.subjectNameWrap}>
                  <View style={[styles.subjectDot, { backgroundColor: row.color }]} />
                  <Text style={[styles.subjectName, { color: text }]}>{row.name}</Text>
                </View>
                <Text style={[styles.subjectVal, { color: text }]}>{row.solved || 0}</Text>
                <Text style={[styles.subjectVal, row.accuracy === 0 && { color: '#cbd5e1' }]}>{row.accuracy ? `${row.accuracy}%` : '—'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionTitleRowAlt, styles.friendsSectionSpacer]}>
          <Text style={styles.sectionTitleMain}>Friends & Nearby</Text>
          <Text style={styles.sectionTitleSub}>Accountability circle</Text>
        </View>

        <View style={[styles.friendsCard, { backgroundColor: card, borderColor: border }]}> 
          <View style={styles.friendsHeaderRow}>
            <Text style={[styles.friendsTitle, { color: text }]}>My study circle</Text>
            <Text style={styles.findFriendsText}>Find Friends</Text>
          </View>
          <View style={[styles.friendsSearchWrap, { borderColor: border }]}>
            <Ionicons name="search" size={14} color="#94a3b8" />
            <TextInput
              value={friendQuery}
              onChangeText={setFriendQuery}
              placeholder="Search by username or city..."
              placeholderTextColor="#94a3b8"
              style={[styles.friendsSearchInput, { color: text }]}
            />
          </View>
          <Animated.View
            style={{
              opacity: listSwitchAnim,
              transform: [
                {
                  translateY: listSwitchAnim.interpolate({
                    inputRange: [0.75, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            }}
          >
          {visibleFriends.length === 0 ? (
            <Text style={styles.panelEmptyText}>No community peers found yet.</Text>
          ) : (
            visibleFriends.map((friend) => (
              <View key={friend.name} style={[styles.friendItemRow, { borderBottomColor: '#f8fafc' }]}>
                <View style={[styles.friendAvatar, { backgroundColor: friend.color }]}>
                  <Text style={styles.friendAvatarText}>{friend.name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfoWrap}>
                  <Text style={[styles.friendName, { color: text }]}>{friend.name}</Text>
                  <Text style={[styles.friendSub, { color: muted }]}>{friend.city}</Text>
                </View>
                <View style={styles.friendStreakWrap}>
                  <Text style={styles.friendStreakText}>{friend.streak}</Text>
                </View>
              </View>
            ))
          )}
          </Animated.View>
        </View>

        <View style={[styles.sectionTitleRowAlt, styles.historySectionSpacer]}>
          <Text style={styles.sectionTitleMain}>Recent History</Text>
          <Text style={styles.sectionTitleSub}>Latest attempts</Text>
        </View>

        <View style={styles.historyTabsRow}>
          {(['all', 'practice', 'mocks', 'community'] as const).map((tab) => (
            <Pressable key={tab} style={[styles.historyTabBtn, activeHistoryTab === tab && styles.historyTabBtnOn]} onPress={() => setActiveHistoryTab(tab)}>
              <Text style={[styles.historyTabText, activeHistoryTab === tab && styles.historyTabTextOn]}>{tab === 'all' ? 'All' : tab.charAt(0).toUpperCase() + tab.slice(1)}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.historyCard, { backgroundColor: card, borderColor: border }]}> 
          <Animated.View
            style={{
              opacity: listSwitchAnim,
              transform: [
                {
                  translateY: listSwitchAnim.interpolate({
                    inputRange: [0.75, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            }}
          >
          {visibleHistory.length === 0 ? (
            <Text style={styles.panelEmptyText}>No recent activity yet.</Text>
          ) : (
            visibleHistory.map((item, idx) => (
              <View key={`${item.title}-${idx}`} style={[styles.historyItemRow, { borderBottomColor: '#f8fafc' }]}>
                <View style={[styles.historyStatusDot, { backgroundColor: item.type === 'community' ? '#8b5cf6' : item.type === 'mocks' ? '#059669' : '#f59e0b' }]} />
                <View style={styles.historyBodyWrap}>
                  <Text style={[styles.historyItemTitle, { color: text }]} numberOfLines={1}>{item.title}</Text>
                  <View style={styles.historyMetaWrap}>
                    <Text style={styles.historyBadge}>{item.badge}</Text>
                    <Text style={[styles.historyTime, { color: muted }]}>{item.when}</Text>
                  </View>
                </View>
                {!!item.score && (
                  <View style={styles.historyScoreWrap}>
                    <Text style={[styles.historyScoreVal, { color: text }]}>{item.score}</Text>
                    <Text style={[styles.historyScoreSub, { color: muted }]}>{item.sub}</Text>
                  </View>
                )}
              </View>
            ))
          )}
          </Animated.View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.profileFooterNav,
          {
            height: footerBarHeight,
            paddingTop: 6,
            paddingBottom: footerSafeBottom,
            borderTopColor: border,
            backgroundColor: card,
          },
        ]}
      >
        <Pressable style={styles.profileFooterItem} onPress={handleOpenHomeTab}>
          <Ionicons name="home" size={18} color="#94a3b8" />
          <Text style={styles.profileFooterLabel}>Home</Text>
        </Pressable>
        <Pressable style={styles.profileFooterItem} onPress={handleOpenPyqsTab}>
          <Ionicons name="copy" size={18} color="#94a3b8" />
          <Text style={styles.profileFooterLabel}>PYQ</Text>
        </Pressable>
        <Pressable style={styles.profileFooterItem} onPress={handleOpenMocksTab}>
          <Ionicons name="clipboard" size={18} color="#94a3b8" />
          <Text style={styles.profileFooterLabel}>Mocks</Text>
        </Pressable>
        <Pressable style={styles.profileFooterItem} onPress={handleOpenForumsTab}>
          <Ionicons name="people" size={18} color="#94a3b8" />
          <Text style={styles.profileFooterLabel}>Forums</Text>
        </Pressable>
        <Pressable style={styles.profileFooterItem} onPress={handleOpenPremiumTab}>
          <Ionicons name="diamond" size={18} color="#94a3b8" />
          <Text style={styles.profileFooterLabel}>Premium</Text>
        </Pressable>
      </View>

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
                <Text style={[styles.fieldLabel, { color: muted }]}>Username</Text>
                <TextInput
                  value={editForm.fullName}
                  onChangeText={(v) => updateEditField('fullName', v)}
                  editable={canEditUsername}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter username"
                  placeholderTextColor={muted}
                />
                {!!usernameUnlockHint && <Text style={styles.fieldHintText}>{usernameUnlockHint}</Text>}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Email</Text>
                <TextInput
                  value={editForm.email}
                  editable={false}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.fieldInput, styles.lockedFieldInput, { color: muted, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Email is locked"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Phone</Text>
                <TextInput
                  value={editForm.phone}
                  editable={false}
                  keyboardType="phone-pad"
                  style={[styles.fieldInput, styles.lockedFieldInput, { color: muted, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Phone is locked"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>City</Text>
                <TextInput
                  value={editForm.city}
                  onChangeText={(v) => updateEditField('city', v)}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Add city"
                  placeholderTextColor={muted}
                />
                <Text style={styles.fieldHintText}>City is editable now.</Text>
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
  scrollContent: { paddingBottom: 34, paddingTop: 0 },

  htmlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  homeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  htmlBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  homeBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  htmlBrandLogo: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeBrandLogo: {
    width: 44,
    height: 44,
  },
  htmlBrandText: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  homeBrandText: {
    marginLeft: -4,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  htmlBrandAccent: {
    color: '#059669',
  },
  htmlHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  homeHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  htmlNotifBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  htmlAvatarBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  homeAvatarBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  htmlAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  homeAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  htmlProfileCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 0,
    marginBottom: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  profileHero: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  profileHeroTitle: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  profileAvatarWrap: {
    alignItems: 'center',
    marginTop: -34,
    zIndex: 3,
  },
  profileAvatarClean: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  profileContent: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 5,
    paddingBottom: 8,
  },
  htmlAvatarCircleText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
  },
  htmlProfileName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 1,
  },
  htmlProfileSub: {
    fontSize: 10,
    marginBottom: 3,
    textTransform: 'lowercase',
  },
  profileBio: {
    fontSize: 9,
    lineHeight: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  htmlEditBtn: {
    marginTop: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 0,
    paddingHorizontal: 0,
    minWidth: 124,
    height: 30,
    overflow: 'hidden',
    position: 'relative',
  },
  editBtnGradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  htmlEditBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sectionTitleRowAlt: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectSectionSpacer: {
    marginTop: 18,
  },
  friendsSectionSpacer: {
    marginTop: 18,
  },
  historySectionSpacer: {
    marginTop: 20,
  },
  sectionTitleMain: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
  },
  sectionTitleSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  htmlHeatmapCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  htmlHeatmapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  htmlHeatmapTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  htmlHeatLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  htmlHeatmapGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  htmlHeatDaysLabel: {
    width: 28,
    height: 90,
    justifyContent: 'space-between',
    marginRight: 2,
    paddingVertical: 6,
  },
  htmlHeatDayText: {
    fontSize: 9,
    color: '#cbd5e1',
    fontWeight: '600',
  },
  htmlSummaryRow: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  htmlSummaryItem: {
    alignItems: 'center',
  },
  htmlSummaryValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  htmlSummaryLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
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
    marginHorizontal: 16,
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

  ratingCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    borderColor: '#e7e9ef',
  },
  progressCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  communityFootprintCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    overflow: 'hidden',
  },
  communityFootprintHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  communityFootprintHeaderRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  communityLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  communityFootprintTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  communityFootprintGrid: {
    flexDirection: 'row',
  },
  communityFootprintCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
  },
  communityFootprintVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  communityFootprintLbl: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
  ratingTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 10,
  },
  ratingAccentBar: {
    height: 4,
    marginHorizontal: -16,
    backgroundColor: '#6f3cc3',
  },
  ratingTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ratingIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6f3cc3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingSubTight: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  ratingSub: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 32,
  },
  ratingDelta: {
    fontSize: 12,
    fontWeight: '700',
  },
  ratingTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    padding: 4,
  },
  ratingTabBtn: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  ratingTabBtnOn: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  ratingTabText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
  },
  ratingTabTextOn: {
    color: '#1e293b',
  },
  chartWrap: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  ratingEmptyState: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.08)',
    gap: 8,
  },
  ratingEmptyText: {
    fontSize: 12,
    fontWeight: '500',
  },
  subjectCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 4,
  },
  subjectHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  subjectHeadLeft: {
    flex: 1,
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subjectHeadCell: {
    width: 72,
    textAlign: 'center',
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  subjectItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subjectNameWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectName: {
    fontSize: 13,
    fontWeight: '600',
  },
  subjectVal: {
    width: 72,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  friendsCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  friendsHeaderRow: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  friendsTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  findFriendsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3b82f6',
  },
  friendsSearchWrap: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  friendsSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  friendItemRow: {
    marginHorizontal: 14,
    borderBottomWidth: 1,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  friendAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  friendInfoWrap: {
    flex: 1,
  },
  friendName: {
    fontSize: 13,
    fontWeight: '700',
  },
  friendSub: {
    marginTop: 1,
    fontSize: 11,
    fontWeight: '500',
  },
  friendStreakWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 26,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#fff7ed',
  },
  friendStreakText: {
    color: '#ea580c',
    fontSize: 11,
    fontWeight: '700',
  },
  historyTabsRow: {
    marginHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    padding: 3,
    flexDirection: 'row',
    marginBottom: 12,
  },
  historyTabBtn: {
    flex: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  historyTabBtnOn: {
    backgroundColor: '#fff',
  },
  historyTabText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  historyTabTextOn: {
    color: '#1e293b',
  },
  historyCard: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyBodyWrap: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyMetaWrap: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyBadge: {
    fontSize: 9,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    borderRadius: 99,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontWeight: '700',
  },
  historyTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  historyScoreWrap: {
    alignItems: 'flex-end',
  },
  historyScoreVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  historyScoreSub: {
    fontSize: 9,
    fontWeight: '500',
  },
  panelEmptyText: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  profileFooterNav: {
    borderTopWidth: 1,
    paddingHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  profileFooterItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  profileFooterLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  progressBarsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 114,
    alignItems: 'flex-end',
  },
  progressBarCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
  },
  progressBar: {
    width: '70%',
    maxWidth: 18,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 8,
  },
  progressPct: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressLabel: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressTrendWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
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
  lockedFieldInput: {
    opacity: 0.9,
  },
  fieldHintText: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: '500',
    color: '#94a3b8',
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
