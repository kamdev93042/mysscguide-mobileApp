import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Animated,
  Easing,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

const TODO_STORAGE_KEY = 'dashboard_todays_target_todos_v1';
const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';
const DAILY_EXAM_LATEST_STORAGE_KEY = 'daily_exam_latest_v1';

import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoginModal } from '../context/LoginModalContext';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';
import { dashboardApi, forumApi } from '../services/api';
import { buildUserStorageScope, withUserScope } from '../utils/storageScope';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

type TodoItem = {
  text: string;
  done: boolean;
};

type ResultHistoryItem = {
  wrong?: number;
  sectionBreakup?: Array<{ section?: string; correct?: number; attempted?: number }>;
};

type QuickActionItem = {
  id: string;
  label: string;
  icon: string;
  bg: readonly [string, string];
  badge?: string;
};

type HomeForumPost = {
  id: string;
  category: string;
  title: string;
  likes: number;
  comments: number;
  user: string;
  avatar: string;
  toneBg: string;
  toneText: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type DailyExamResultEntry = {
  mode: 'challenge' | 'quiz';
  title: string;
  totalQuestions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  timeTaken: number;
  completedAt: string;
};

type DailyLatestMap = {
  challenge?: DailyExamResultEntry;
  quiz?: DailyExamResultEntry;
};

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseMaybeDate = (raw: unknown): Date | null => {
  if (!raw) return null;
  const parsed = new Date(String(raw));
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

const COLORS = {
  primary: '#059669',
  primaryDark: '#047857',
  bg: '#f8fafc',
  text: '#1e293b',
  textSecondary: '#64748b',
};

const SECTION_TONES = {
  challenge: {
    lightBg: '#fffbf5',
    lightBorder: '#fed7aa',
    lightAccent: '#f97316',
    darkBg: '#1f1208',
    darkBorder: '#92400e',
    darkAccent: '#fb923c',
  },
  quiz: {
    lightBg: '#f5f3ff',
    lightBorder: '#ddd6fe',
    lightAccent: '#7c3aed',
    darkBg: '#130d1f',
    darkBorder: '#4c1d95',
    darkAccent: '#a78bfa',
  },
  mock: {
    lightBg: '#ecfeff',
    lightBorder: '#a5f3fc',
    lightAccent: '#0891b2',
    darkBg: '#08232d',
    darkBorder: '#0e7490',
    darkAccent: '#22d3ee',
  },
};

const SLIDES = [
  {
    id: 'crash',
    title: 'SSC CGL 2026 Crash Course',
    subtitle: 'Complete syllabus in 60 days with live classes',
    btn: 'Learn More',
  },
  {
    id: 'mocks',
    title: 'Free Mock Test Series',
    subtitle: '500+ questions with detailed solutions and analytics',
    btn: 'Start Free',
  },
  {
    id: 'gk',
    title: 'Current Affairs Daily Dose',
    subtitle: 'Get 10 handpicked GK updates every morning',
    btn: 'Subscribe',
  },
];

const SLIDE_FALLBACK_BACKGROUNDS = ['#312e81', '#c2410c', '#0d9488'] as const;

const QUICK_ACTIONS: QuickActionItem[] = [
  { id: 'mocks', label: 'Mocks', icon: 'document-text', bg: ['#059669', '#0d9488'] as const },
  { id: 'pyq', label: 'PYQs', icon: 'copy', bg: ['#ec4899', '#f43f5e'] as const },
  { id: 'contests', label: 'Contests', icon: 'trophy', bg: ['#f59e0b', '#eab308'] as const },
  { id: 'typing', label: 'Typing', icon: 'keypad', bg: ['#3b82f6', '#2563eb'] as const },
  { id: 'mistakes', label: 'Mistakes', icon: 'book', bg: ['#ef4444', '#dc2626'] as const },
  { id: 'mnemonics', label: 'Mnemonics', icon: 'bulb', bg: ['#8b5cf6', '#7c3aed'] as const },
  { id: 'forums', label: 'Forums', icon: 'people', bg: ['#06b6d4', '#0891b2'] as const },
  { id: 'premium', label: 'Premium', icon: 'key', bg: ['#f97316', '#ea580c'] as const },
];

const FALLBACK_FORUM_POSTS: HomeForumPost[] = [
  {
    id: 'f1',
    category: 'Maths',
    title: 'Shortcut for percentage-based profit and loss problems in SSC CGL?',
    likes: 47,
    comments: 12,
    user: 'Rahul_Kapoor',
    avatar: 'RK',
    toneBg: '#fef3c7',
    toneText: '#b45309',
    icon: 'calculator',
  },
  {
    id: 'f2',
    category: 'GK',
    title: 'Best source for Static GK: Lucent or Arihant for 2025 exams?',
    likes: 83,
    comments: 29,
    user: 'Priya_Sharma',
    avatar: 'PS',
    toneBg: '#dbeafe',
    toneText: '#1d4ed8',
    icon: 'globe',
  },
  {
    id: 'f3',
    category: 'English',
    title: 'How to improve reading comprehension speed in under 30 days?',
    likes: 61,
    comments: 18,
    user: 'Anjali_Tripathi',
    avatar: 'AT',
    toneBg: '#dcfce7',
    toneText: '#15803d',
    icon: 'create',
  },
  {
    id: 'f4',
    category: 'Motivation',
    title: 'Failed 3 attempts. Here is what I changed for attempt 4 and it worked.',
    likes: 134,
    comments: 45,
    user: 'Sneha_Gupta',
    avatar: 'SG',
    toneBg: '#fff7ed',
    toneText: '#c2410c',
    icon: 'flame',
  },
];

const getForumStyle = (category: string) => {
  const normalized = category.toLowerCase();
  if (normalized.includes('math')) return { toneBg: '#fef3c7', toneText: '#b45309', icon: 'calculator' as const };
  if (normalized.includes('gk') || normalized.includes('current')) return { toneBg: '#dbeafe', toneText: '#1d4ed8', icon: 'globe' as const };
  if (normalized.includes('english')) return { toneBg: '#dcfce7', toneText: '#15803d', icon: 'create' as const };
  if (normalized.includes('motiv')) return { toneBg: '#fff7ed', toneText: '#c2410c', icon: 'flame' as const };
  return { toneBg: '#ecfeff', toneText: '#0e7490', icon: 'chatbubbles' as const };
};

const getInitials = (name: string) => {
  const compact = name.trim();
  if (!compact) return 'US';
  const parts = compact.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
};

const toArray = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.posts)) return payload.posts;
  if (Array.isArray(payload.data?.posts)) return payload.data.posts;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.challenges)) return payload.challenges;
  if (Array.isArray(payload.data?.challenges)) return payload.data.challenges;
  return [];
};

const SUCCESS_STORIES = [
  {
    id: 's1',
    accent: '#059669',
    badgeBg: '#ecfdf5',
    badgeText: '#059669',
    quote: 'MySSCguide mocks were the closest to the actual exam. Solving 200+ mocks made the pattern muscle memory before exam day.',
    name: 'Arjun Mehta',
    exam: 'Rank 142 · Score 178/200',
    avatar: 'AM',
    examTag: 'SSC CGL 2024',
  },
  {
    id: 's2',
    accent: '#7c3aed',
    badgeBg: '#f3e8ff',
    badgeText: '#7c3aed',
    quote: 'The mistake notebook changed my accuracy. Tracking errors for 60 days stopped repeat mistakes completely.',
    name: 'Neha Kulkarni',
    exam: 'Rank 58 · Score 183/200',
    avatar: 'NK',
    examTag: 'SSC CHSL 2024',
  },
  {
    id: 's3',
    accent: '#ea580c',
    badgeBg: '#fff7ed',
    badgeText: '#ea580c',
    quote: 'PYQs and live contests gave me confidence to compete with anyone in the country from a small town background.',
    name: 'Rohit Singh',
    exam: 'Rank 211 · Score 165/200',
    avatar: 'RS',
    examTag: 'SSC MTS 2024',
  },
];

const TIPS = [
  'Practice daily to build consistency. Even 30 minutes beats a 3-hour weekend binge.',
  'Skip hard questions first in SSC exams. Mark and return later so one question does not cost 10 minutes.',
  'Make mnemonics for GK lists that feel difficult. Silly lines stay longer than plain repetition.',
  'For Quant, master top 5 shortcut formulas per chapter. Speed wins in MCQs.',
  'Take a 5-minute walk every 45 minutes. Memory consolidates during breaks.',
];

function TopoHeaderTexture() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 250" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Path d="M20 44c34-29 79-31 111 2 33 35 29 84-5 113-35 29-82 27-113-7-30-34-25-79 7-108z" stroke="rgba(16,185,129,0.1)" strokeWidth="2" fill="none" />
      <Path d="M47 72c20-18 49-18 70 0 20 19 21 49 0 69-21 20-50 18-69-1-20-20-20-50-1-68z" stroke="rgba(16,185,129,0.1)" strokeWidth="2" fill="none" />
      <Path d="M248 26c37-21 88-13 114 20 26 32 19 78-17 108-38 29-90 25-118-6-29-32-21-92 21-122z" stroke="rgba(16,185,129,0.1)" strokeWidth="2" fill="none" />
      <Path d="M265 54c23-12 55-8 73 12 18 21 13 52-12 72-26 20-58 17-76-4-18-22-12-58 15-80z" stroke="rgba(16,185,129,0.1)" strokeWidth="2" fill="none" />
      <Path d="M0 165c42 20 86 17 121-5 29-19 53-36 86-41 30-5 62 5 90 10 31 6 63 4 93-8" stroke="rgba(16,185,129,0.1)" strokeWidth="2" fill="none" />
    </Svg>
  );
}

function FireStreakIcon({ active }: { active: boolean }) {
  const fill = active ? '#fb923c' : '#d1d5db';
  const stroke = active ? '#f97316' : '#9ca3af';

  return (
    <Svg width="13" height="13" viewBox="0 0 24 24">
      <Path
        d="M12 2.5c.8 3-1.2 4.8-2.7 6.2-1.5 1.4-2.8 2.6-2.8 5 0 3 2.3 5.3 5.5 5.3 3.4 0 5.8-2.5 5.8-5.7 0-2.2-1-3.9-2.4-5.5-.9-1-1.7-2.1-2-3.9-.2-.9-.4-1.3-1.4-1.4z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <Path
        d="M12.1 10.1c.3 1.3-.6 2.1-1.2 2.8-.7.7-1.2 1.2-1.2 2.2 0 1.4 1.1 2.4 2.5 2.4 1.5 0 2.6-1.1 2.6-2.6 0-1.1-.5-1.8-1.1-2.6-.5-.6-1-1.2-1.2-2.2-.1-.5-.2-.7-.4-.7z"
        fill={active ? '#fdba74' : '#e5e7eb'}
      />
    </Svg>
  );
}

function SlideSurface({ index }: { index: number }) {
  const gradients = [
    ['#1e1b4b', '#312e81'],
    ['#7c2d12', '#c2410c'],
    ['#134e4a', '#0d9488'],
  ] as const;
  const pair = gradients[index] || gradients[0];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 340 180" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`slideGrad${index}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={pair[0]} />
          <Stop offset="100%" stopColor={pair[1]} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="340" height="180" fill={`url(#slideGrad${index})`} />
      <Circle cx="306" cy="20" r="66" fill="rgba(255,255,255,0.14)" />
      <Circle cx="24" cy="22" r="34" fill="rgba(255,255,255,0.09)" />
    </Svg>
  );
}

function IconBadge({ colors, icon }: { colors: readonly [string, string]; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={[styles.quickActionIcon, { backgroundColor: colors[0] }]}>
      <Svg width="52" height="52" viewBox="0 0 52 52" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`qa-${icon}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor={colors[0]} />
            <Stop offset="100%" stopColor={colors[1]} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="52" height="52" rx="16" fill={`url(#qa-${icon})`} />
      </Svg>
      <Ionicons name={icon} size={22} color="#ffffff" />
    </View>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName, userEmail } = useLoginModal();
  const { isDark } = useTheme();
  const hasUnreadNotifications = useHasUnreadNotifications();
  useMocks();
  const storageScope = buildUserStorageScope(userEmail, userName);
  const resultHistoryStorageKey = withUserScope(RESULT_HISTORY_STORAGE_KEY, storageScope);
  const dailyExamLatestStorageKey = withUserScope(DAILY_EXAM_LATEST_STORAGE_KEY, storageScope);

  const [resultHistory, setResultHistory] = useState<ResultHistoryItem[]>([]);
  const [dailyLatest, setDailyLatest] = useState<DailyLatestMap>({});
  const [slideIndex, setSlideIndex] = useState(0);
  const [topCarouselWidth, setTopCarouselWidth] = useState(width);

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [showTodoInput, setShowTodoInput] = useState(false);
  const [todosLoaded, setTodosLoaded] = useState(false);
  const [forumPosts, setForumPosts] = useState<HomeForumPost[]>(FALLBACK_FORUM_POSTS);
  const todoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [storyIndex, setStoryIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const topCarouselRef = useRef<ScrollView>(null);
  const slideIndexRef = useRef(0);
  const autoSlideResumeAtRef = useRef(0);
  const storyScrollRef = useRef<ScrollView>(null);
  const forumTranslateX = useRef(new Animated.Value(0)).current;

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(16)).current;
  const carouselOpacity = useRef(new Animated.Value(0)).current;
  const carouselTranslateY = useRef(new Animated.Value(12)).current;
  const targetOpacity = useRef(new Animated.Value(0)).current;
  const targetTranslateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storage = (await import('@react-native-async-storage/async-storage')).default;
        const raw = await storage.getItem(TODO_STORAGE_KEY);

        let localTodos: TodoItem[] = [];
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            if (parsed.length && typeof parsed[0] === 'string') {
              localTodos = parsed.map((item: string) => ({ text: item, done: false }));
            } else {
              localTodos = parsed as TodoItem[];
            }
          }
        }

        let todosFromApi: TodoItem[] = [];
        try {
          todosFromApi = await dashboardApi.getTodos();
        } catch {
          // Fall back to local cache if dashboard todos API is unavailable.
        }

        if (!isMounted) return;

        const hydrated = todosFromApi.length > 0 ? todosFromApi : localTodos;
        setTodos(hydrated);

        if (todosFromApi.length > 0) {
          await storage.setItem(TODO_STORAGE_KEY, JSON.stringify(todosFromApi));
        }
      } catch {
        // Use empty default state when storage cannot be read.
      }

      if (isMounted) setTodosLoaded(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!todosLoaded) return;
    if (todoSyncTimerRef.current) {
      clearTimeout(todoSyncTimerRef.current);
    }

    todoSyncTimerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const storage = (await import('@react-native-async-storage/async-storage')).default;
          if (todos.length === 0) {
            await storage.removeItem(TODO_STORAGE_KEY);
          } else {
            await storage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
          }
        } catch {
          // Ignore write failures to avoid blocking UI.
        }

        try {
          await dashboardApi.saveTodos(todos);
        } catch {
          // Keep local persistence if API save fails.
        }
      })();
    }, 350);

    return () => {
      if (todoSyncTimerRef.current) {
        clearTimeout(todoSyncTimerRef.current);
      }
    };
  }, [todos, todosLoaded]);

  useEffect(() => {
    return () => {
      if (todoSyncTimerRef.current) {
        clearTimeout(todoSyncTimerRef.current);
      }
    };
  }, [resultHistoryStorageKey]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const storage = (await import('@react-native-async-storage/async-storage')).default;
          const [raw, dailyRaw] = await Promise.all([
            storage.getItem(resultHistoryStorageKey),
            storage.getItem(dailyExamLatestStorageKey),
          ]);

          const parsed = raw ? JSON.parse(raw) : [];
          if (isActive) {
            setResultHistory(Array.isArray(parsed) ? (parsed as ResultHistoryItem[]) : []);
          }

          const parsedDaily = dailyRaw ? JSON.parse(dailyRaw) : {};
          if (isActive && parsedDaily && typeof parsedDaily === 'object') {
            setDailyLatest(parsedDaily as DailyLatestMap);
          }
        } catch {
          if (isActive) {
            setResultHistory([]);
            setDailyLatest({});
          }
        }
      })();

      return () => {
        isActive = false;
      };
    }, [dailyExamLatestStorageKey, resultHistoryStorageKey])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      Animated.parallel([
        Animated.timing(carouselOpacity, {
          toValue: 1,
          duration: 380,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(carouselTranslateY, {
          toValue: 0,
          duration: 380,
          delay: 200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(targetOpacity, {
          toValue: 1,
          duration: 360,
          delay: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(targetTranslateY, {
          toValue: 0,
          duration: 360,
          delay: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [carouselOpacity, carouselTranslateY, headerOpacity, headerTranslateY, targetOpacity, targetTranslateY]);

  useFocusEffect(
    useCallback(() => {
      // Ensure the hero/carousel section is fully visible after returning from nested routes.
      headerOpacity.setValue(1);
      headerTranslateY.setValue(0);
      carouselOpacity.setValue(1);
      carouselTranslateY.setValue(0);
      targetOpacity.setValue(1);
      targetTranslateY.setValue(0);

      const frame = requestAnimationFrame(() => {
        const snapWidth = topCarouselWidth || width;
        topCarouselRef.current?.scrollTo({ x: slideIndexRef.current * snapWidth, y: 0, animated: false });
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }, [
      carouselOpacity,
      carouselTranslateY,
      headerOpacity,
      headerTranslateY,
      targetOpacity,
      targetTranslateY,
      topCarouselWidth,
      width,
    ])
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % TIPS.length);
    }, 8000);

    return () => clearInterval(timer);
  }, []);

  const displayName = userName || 'User';
  const challengeResult = dailyLatest.challenge;
  const quizResult = dailyLatest.quiz;

  const currentStreak = (() => {
    const activeDateKeys = new Set<string>();

    for (const item of resultHistory) {
      const dt = parseMaybeDate((item as any)?.submittedAt);
      if (dt) {
        activeDateKeys.add(formatDateKey(dt));
      }
    }

    const challengeDate = parseMaybeDate(challengeResult?.completedAt);
    if (challengeDate) {
      activeDateKeys.add(formatDateKey(challengeDate));
    }

    const quizDate = parseMaybeDate(quizResult?.completedAt);
    if (quizDate) {
      activeDateKeys.add(formatDateKey(quizDate));
    }

    let streak = 0;
    const day = new Date();
    day.setHours(0, 0, 0, 0);

    while (activeDateKeys.has(formatDateKey(day))) {
      streak += 1;
      day.setDate(day.getDate() - 1);
    }

    return streak;
  })();

  const hasStreak = currentStreak > 0;

  const pageBg = isDark ? '#0f1512' : COLORS.bg;
  const textColor = isDark ? '#f8fafc' : COLORS.text;
  const textMuted = isDark ? '#cbd5e1' : COLORS.textSecondary;
  const cardBg = isDark ? '#132920' : '#ffffff';
  const cardBorder = isDark ? '#065f46' : '#e2e8f0';
  const resultSurface = isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.45)';
  const sectionInlineColor = isDark ? '#cbd5e1' : '#64748b';
  const forumCardBg = isDark ? '#0f172a' : '#ffffff';
  const forumCardBorder = isDark ? '#334155' : '#e2e8f0';
  const forumTitleColor = isDark ? '#e2e8f0' : '#1e293b';
  const forumUserColor = isDark ? '#cbd5e1' : '#64748b';
  const forumStatsColor = isDark ? '#94a3b8' : '#94a3b8';
  const storyCardBg = isDark ? '#0f172a' : '#ffffff';
  const storyCardBorder = isDark ? '#334155' : '#e2e8f0';
  const storyQuoteColor = isDark ? '#cbd5e1' : '#475569';
  const storyNameColor = isDark ? '#f8fafc' : '#1e293b';
  const storyExamColor = isDark ? '#94a3b8' : '#94a3b8';
  const tipBg = isDark ? '#292016' : '#fffbeb';
  const tipBorder = isDark ? '#6b4f1d' : '#fde68a';
  const tipTextColor = isDark ? '#fcd34d' : '#78350f';
  const heroBg = isDark ? '#0f172a' : '#ffffff';
  const heroBorder = isDark ? '#334155' : '#f1f5f9';
  const heroTitleColor = isDark ? '#f8fafc' : '#0f172a';
  const heroDateColor = isDark ? '#cbd5e1' : '#94a3b8';
  const heroButtonBg = isDark ? '#1e293b' : '#ffffff';

  const challengeIsCompletedToday = !!challengeResult && new Date(challengeResult.completedAt).toDateString() === new Date().toDateString();
  const challengeMaxScore = challengeResult ? challengeResult.totalQuestions * 2 : 40;
  const challengePct = challengeResult ? Math.round((challengeResult.score / challengeMaxScore) * 100) : 0;

  const quizIsCompletedToday = !!quizResult && new Date(quizResult.completedAt).toDateString() === new Date().toDateString();
  const quizMaxScore = quizResult ? quizResult.totalQuestions * 2 : 20;
  const quizPct = quizResult ? Math.round((quizResult.score / quizMaxScore) * 100) : 0;

  const dailyCardWidth = Math.min(width * 0.74, 320);
  const forumCardWidth = Math.min(width * 0.7, 260);
  const forumCardGap = 10;
  const forumSetWidth = forumPosts.length * (forumCardWidth + forumCardGap);
  const storyCardWidth = Math.min(width - 32, 380);
  const storySnapWidth = storyCardWidth + 12;
  const todayLabel = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${mins}m ${secs}s`;
  };

  const formatCompletedAt = (iso: string) => {
    const dt = new Date(iso);
    if (isNaN(dt.getTime())) return 'Just now';
    return dt.toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const navigateQuickAction = (id: string) => {
    const root = navigation.getParent?.()?.getParent?.();

    if (id === 'mocks') {
      navigation.navigate('Mocks' as never);
      return;
    }

    if (id === 'pyq') {
      navigation.navigate('PYQs' as never);
      return;
    }

    if (id === 'contests') {
      navigation.navigate('Contests' as never);
      return;
    }

    if (id === 'typing' || id === 'mnemonics') {
      const targetScreen = id === 'typing' ? 'Typing' : 'Mnemonics';

      try {
        navigation.navigate(targetScreen as never);
      } catch (_error) {
        root?.navigate(targetScreen as never);
      }
      return;
    }

    if (id === 'forums') {
      root?.navigate('Forums');
      return;
    }

    if (id === 'premium') {
      navigation.navigate('Main' as never, { screen: 'Premium' } as never);
      return;
    }

    if (id === 'mistakes') {
      navigation.navigate('DailyChallenge' as never, { mode: 'challenge' } as never);
    }
  };

  const addTodo = () => {
    const text = newTodo.trim();
    if (!text) {
      setShowTodoInput(false);
      return;
    }

    setTodos((prev) => [...prev, { text, done: false }]);
    setNewTodo('');
    setShowTodoInput(false);
  };

  const openMenuTab = () => {
    navigation.getParent?.()?.getParent?.()?.navigate('MenuDrawer');
  };

  const onTopCarouselScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const measuredWidth = event.nativeEvent.layoutMeasurement.width || topCarouselWidth || width;
    const next = Math.round(x / measuredWidth);
    const bounded = Math.max(0, Math.min(SLIDES.length - 1, next));
    slideIndexRef.current = bounded;
    setSlideIndex(bounded);
  };

  const goToTopSlide = (index: number) => {
    const bounded = Math.max(0, Math.min(SLIDES.length - 1, index));
    const snapWidth = topCarouselWidth || width;
    topCarouselRef.current?.scrollTo({ x: bounded * snapWidth, y: 0, animated: true });
    slideIndexRef.current = bounded;
    setSlideIndex(bounded);
    autoSlideResumeAtRef.current = Date.now() + 6000;
  };

  useEffect(() => {
    setTopCarouselWidth(width);
  }, [width]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (Date.now() < autoSlideResumeAtRef.current) {
        return;
      }

      const next = (slideIndexRef.current + 1) % SLIDES.length;
      const snapWidth = topCarouselWidth || width;
      topCarouselRef.current?.scrollTo({ x: next * snapWidth, y: 0, animated: true });
      slideIndexRef.current = next;
      setSlideIndex(next);
    }, 4200);

    return () => clearInterval(timer);
  }, [topCarouselWidth, width]);

  useEffect(() => {
    if (forumSetWidth <= 0) return;

    forumTranslateX.stopAnimation();
    forumTranslateX.setValue(0);

    const pxPerSecond = 22;
    const duration = Math.max(8000, Math.round((forumSetWidth / pxPerSecond) * 1000));
    const marqueeAnim = Animated.loop(
      Animated.timing(forumTranslateX, {
        toValue: -forumSetWidth,
        duration,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      })
    );

    marqueeAnim.start();
    return () => marqueeAnim.stop();
  }, [forumSetWidth, forumTranslateX]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStoryIndex((prev) => (prev + 1) % SUCCESS_STORIES.length);
    }, 3800);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    storyScrollRef.current?.scrollTo({
      x: storyIndex * storySnapWidth,
      animated: true,
    });
  }, [storyIndex, storySnapWidth]);

  useEffect(() => {
    let isActive = true;

    const fetchHomeData = async () => {
      try {
        const postsRes = await forumApi.listPosts({ limit: 8 });

        if (!isActive) return;

        const posts = toArray(postsRes)
          .slice(0, 8)
          .map((post: any, index: number): HomeForumPost => {
            const category = String(post?.category || post?.tags?.[0] || 'General');
            const user = String(post?.authorName || post?.author?.name || post?.user?.name || 'Community User');
            const title = String(post?.title || post?.subtitle || 'Community discussion');
            const likes = Number(post?.likes ?? post?.likeCount ?? post?.stats?.likes ?? 0) || 0;
            const comments = Number(post?.comments ?? post?.replyCount ?? post?.commentCount ?? 0) || 0;
            const style = getForumStyle(category);

            return {
              id: String(post?.id || post?._id || `forum-${index}`),
              category,
              title,
              likes,
              comments,
              user,
              avatar: getInitials(user),
              toneBg: style.toneBg,
              toneText: style.toneText,
              icon: style.icon,
            };
          });

        if (posts.length > 0) {
          setForumPosts(posts);
        }
      } catch {
        if (!isActive) return;
        setForumPosts((prev) => (prev.length > 0 ? prev : FALLBACK_FORUM_POSTS));
      }
    };

    void fetchHomeData();
    return () => {
      isActive = false;
    };
  }, []);

  return (
    <View style={[styles.wrapper, { backgroundColor: pageBg }]}>
      <ScrollView
        style={[styles.scroll, { backgroundColor: pageBg }]}
        contentContainerStyle={[styles.scrollContent, { backgroundColor: pageBg }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              backgroundColor: heroBg,
              borderBottomColor: heroBorder,
              paddingTop: insets.top + 8,
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslateY }],
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <Pressable style={styles.brandRow} onPress={openMenuTab}>
              <Image source={require('../assets/sscguidelogo.png')} style={styles.brandLogo} resizeMode="contain" />
              <Text style={[styles.logoText, { color: heroTitleColor }]}>
                My<Text style={styles.logoHighlight}>SSC</Text>guide
              </Text>
            </Pressable>
            <View style={styles.heroActionRow}>
              <Pressable
                style={[
                  styles.streakChip,
                  hasStreak ? styles.streakChipActive : styles.streakChipIdle,
                ]}
                onPress={() => {}}
              >
                <FireStreakIcon active={hasStreak} />
                <Text style={[styles.streakChipText, hasStreak ? styles.streakChipTextActive : styles.streakChipTextIdle]}>
                  {currentStreak}
                </Text>
              </Pressable>
              <Pressable style={[styles.heroIconBtn, { backgroundColor: heroButtonBg }]} hitSlop={8} onPress={() => navigation.navigate('Notifications' as never)}>
                <Ionicons name="notifications" size={18} color="#f59e0b" />
                {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
              </Pressable>
              <Pressable style={styles.heroAvatar} onPress={openMenuTab}>
                <Text style={styles.heroAvatarText}>{displayName.slice(0, 2).toUpperCase()}</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.greetBar}>
            <Text style={[styles.greetText, { color: isDark ? '#e2e8f0' : '#334155' }]}>
              Hi, <Text style={styles.greetName}>{displayName}</Text>
            </Text>
            <Text style={[styles.greetDate, { color: heroDateColor }]}>{todayLabel}</Text>
          </View>
        </Animated.View>

        <View style={[styles.bodyContent, { backgroundColor: pageBg }]}>
          <Animated.View
            style={{
              opacity: carouselOpacity,
              transform: [{ translateY: carouselTranslateY }],
            }}
          >
            <View
              style={styles.slider}
              onLayout={(event) => {
                const measured = event.nativeEvent.layout.width;
                if (measured && Math.abs(measured - topCarouselWidth) > 1) {
                  setTopCarouselWidth(measured);
                }
              }}
            >
              <ScrollView
                ref={topCarouselRef}
                horizontal
                pagingEnabled
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onTopCarouselScrollEnd}
              >
                {SLIDES.map((item, index) => (
                  <View key={item.id} style={[styles.slide, { width: topCarouselWidth || width }]}>
                    <View
                      style={[
                        styles.slideInner,
                        { backgroundColor: SLIDE_FALLBACK_BACKGROUNDS[index] || SLIDE_FALLBACK_BACKGROUNDS[0] },
                      ]}
                    >
                      <SlideSurface index={index} />
                      <Text style={styles.slideLabel}>Sponsored</Text>
                      <Text style={styles.slideTitle}>{item.title}</Text>
                      <Text style={styles.slideSub}>{item.subtitle}</Text>
                      <Pressable style={styles.slideBtn}>
                        <Text style={styles.slideBtnText}>{item.btn}</Text>
                        <Ionicons name="arrow-forward" size={12} color="#ffffff" />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
            <View style={styles.carouselDots}>
              {SLIDES.map((_, index) => (
                <Pressable key={index} onPress={() => goToTopSlide(index)} hitSlop={12} style={styles.carouselDotTap}>
                  <View style={[styles.carouselDot, index === slideIndex && styles.carouselDotActive]} />
                </Pressable>
              ))}
            </View>
          </Animated.View>

          <Animated.View
            style={{
              opacity: targetOpacity,
              transform: [{ translateY: targetTranslateY }],
            }}
          >
            <View style={[styles.targetCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.targetHeader}>
                <Ionicons name="locate" size={14} color="#7c3aed" />
                <Text style={[styles.targetTitle, { color: textColor }]}>Today's Target</Text>
                <Text style={styles.targetHint}>{todos.length === 0 ? 'No goals yet' : `${todos.filter((item) => !item.done).length} left`}</Text>
                <Pressable style={styles.targetAdd} onPress={() => setShowTodoInput(true)}>
                  <Ionicons name="add" size={15} color="#059669" />
                </Pressable>
              </View>

              {showTodoInput && (
                <View style={styles.todoInputRow}>
                  <TextInput
                    value={newTodo}
                    onChangeText={setNewTodo}
                    placeholder="e.g. 20 Quant questions"
                    placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                    style={[styles.todoInput, { color: textColor, borderColor: '#d1d5db', backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
                    returnKeyType="done"
                    onSubmitEditing={addTodo}
                  />
                  <Pressable style={styles.todoSaveBtn} onPress={addTodo}>
                    <Text style={styles.todoSaveText}>Add</Text>
                  </Pressable>
                </View>
              )}

              {todos.length > 0 ? (
                <View style={styles.todoList}>
                  {todos.map((todo, idx) => (
                    <View key={`${todo.text}-${idx}`} style={styles.todoItem}>
                      <Pressable
                        style={[styles.todoCheck, todo.done && styles.todoCheckDone]}
                        onPress={() => {
                          setTodos((prev) => prev.map((item, index) => (index === idx ? { ...item, done: !item.done } : item)));
                        }}
                      >
                        {todo.done ? <Ionicons name="checkmark" size={10} color="#ffffff" /> : null}
                      </Pressable>
                      <Text style={[styles.todoText, { color: textColor }, todo.done && styles.todoTextDone]}>{todo.text}</Text>
                      <Pressable
                        style={styles.todoDelete}
                        onPress={() => {
                          setTodos((prev) => prev.filter((_, index) => index !== idx));
                        }}
                      >
                        <Ionicons name="close" size={14} color="#cbd5e1" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.emptyTargetText, { color: textMuted }]}>Add your first target for today.</Text>
              )}
            </View>
          </Animated.View>

          <Text style={[styles.sectionLabel, { color: isDark ? '#cbd5e1' : '#94a3b8' }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((item) => (
              <Pressable key={item.id} style={styles.quickActionItem} onPress={() => navigateQuickAction(item.id)}>
                <View>
                  <IconBadge colors={item.bg} icon={item.icon as keyof typeof Ionicons.glyphMap} />
                </View>
                <Text style={[styles.quickActionName, { color: isDark ? '#cbd5e1' : '#64748b' }]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: isDark ? '#cbd5e1' : '#94a3b8' }]}>Challenges</Text>
          <View style={styles.challengesList}>
            <Pressable style={[styles.challengeCard, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => navigation.navigate('DailyChallenge' as never, { mode: 'challenge' } as never)}>
              <View style={[styles.challengeIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="timer" size={18} color="#059669" />
              </View>
              <View style={styles.challengeBody}>
                <Text style={[styles.challengeTitle, { color: textColor }]}>Daily Challenge</Text>
                <Text style={[styles.challengeSub, { color: textMuted }]}>
                  {challengeIsCompletedToday && challengeResult
                    ? `Completed ${challengePct}% • ${challengeResult.score.toFixed(1)}/${challengeMaxScore}`
                    : '20 Qs - Maths, GK, English and Reasoning'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </Pressable>

            <Pressable style={[styles.challengeCard, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => navigation.navigate('DailyChallenge' as never, { mode: 'quiz' } as never)}>
              <View style={[styles.challengeIcon, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="shuffle" size={18} color="#ea580c" />
              </View>
              <View style={styles.challengeBody}>
                <Text style={[styles.challengeTitle, { color: textColor }]}>Random Quiz</Text>
                <Text style={[styles.challengeSub, { color: textMuted }]}>
                  {quizIsCompletedToday && quizResult
                    ? `Completed ${quizPct}% • ${quizResult.score.toFixed(1)}/${quizMaxScore}`
                    : '10 mixed questions - new set every time'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </Pressable>

            <Pressable style={[styles.challengeCard, { backgroundColor: cardBg, borderColor: cardBorder }]} onPress={() => navigation.navigate('CreateMock' as never)}>
              <View style={[styles.challengeIcon, { backgroundColor: '#ede9fe' }]}>
                <Ionicons name="create" size={18} color="#7c3aed" />
              </View>
              <View style={styles.challengeBody}>
                <Text style={[styles.challengeTitle, { color: textColor }]}>Create Your Mock</Text>
                <Text style={[styles.challengeSub, { color: textMuted }]}>Pick topic, difficulty and time limit</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.selectionKeyCard,
              isDark && {
                backgroundColor: '#065f46',
                borderColor: '#10b981',
                shadowColor: '#10b981',
              },
            ]}
            onPress={() => navigation.navigate('Mocks' as never)}
          >
            <View style={styles.selectionKeyBadge}>
              <Text style={styles.selectionKeyBadgeText}>BEST VALUE</Text>
            </View>
            <View style={[styles.selectionKeyIconWrap, isDark && { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
              <Ionicons name="key" size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectionKeyTitle}>Selection Key</Text>
              <Text style={styles.selectionKeySub}>Unlimited mocks, PYQs, contests and rank boosters</Text>
            </View>
            <View style={styles.selectionKeyRightCol}>
              <Text style={styles.selectionKeyPrice}>Rs249/yr</Text>
              <View style={[styles.selectionKeyCtaPill, isDark && { backgroundColor: '#a7f3d0' }]}>
                <Text style={styles.selectionKeyCtaText}>Unlock</Text>
                <Ionicons name="arrow-forward" size={11} color="#065f46" />
              </View>
            </View>
          </Pressable>

          <View style={styles.sectionTitleRow}>
            <Ionicons name="chatbubbles" size={14} color="#059669" />
            <Text style={[styles.sectionLabelInline, { color: sectionInlineColor }]}>From the Forums</Text>
          </View>

          <View style={styles.forumCarouselWrap}>
            <View style={styles.forumMarqueeViewport}>
              <Animated.View
                style={[
                  styles.forumMarqueeTrack,
                  {
                    transform: [{ translateX: forumTranslateX }],
                  },
                ]}
              >
                {[...forumPosts, ...forumPosts].map((item, index) => (
                  <Pressable
                    key={`${item.id}-${index}`}
                    style={[
                      styles.forumCard,
                      {
                        width: forumCardWidth,
                        backgroundColor: forumCardBg,
                        borderColor: forumCardBorder,
                      },
                    ]}
                    onPress={() => navigation.getParent?.()?.getParent?.()?.navigate('Forums')}
                  >
                    <View style={styles.forumTop}>
                      <View style={[styles.forumCategory, { backgroundColor: item.toneBg }]}>
                        <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={11} color={item.toneText} />
                        <Text style={[styles.forumCategoryText, { color: item.toneText }]}>{item.category}</Text>
                      </View>
                      <Text style={styles.forumHot}>{item.likes}</Text>
                    </View>
                    <Text style={[styles.forumTitle, { color: forumTitleColor }]} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.forumMeta}>
                      <View style={styles.forumAvatar}><Text style={styles.forumAvatarText}>{item.avatar}</Text></View>
                      <Text style={[styles.forumUser, { color: forumUserColor }]} numberOfLines={1}>{item.user}</Text>
                      <View style={styles.forumStats}>
                        <View style={styles.forumStatRow}>
                          <Ionicons name="heart-outline" size={11} color="#f43f5e" />
                          <Text style={[styles.forumStatText, { color: forumStatsColor }]}>{item.likes}</Text>
                        </View>
                        <View style={styles.forumStatRow}>
                          <Ionicons name="chatbubble-outline" size={11} color="#94a3b8" />
                          <Text style={[styles.forumStatText, { color: forumStatsColor }]}>{item.comments}</Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </Animated.View>
            </View>
          </View>

          <View style={styles.sectionTitleRow}>
            <Ionicons name="trophy" size={14} color="#f59e0b" />
            <Text style={[styles.sectionLabelInline, { color: sectionInlineColor }]}>Success Stories</Text>
          </View>

          <View style={styles.storyWrap}>
            <ScrollView
              ref={storyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={storySnapWidth}
              snapToAlignment="start"
              contentContainerStyle={styles.storyScrollContent}
              onMomentumScrollEnd={(event) => {
                const nextIndex = Math.round(event.nativeEvent.contentOffset.x / storySnapWidth);
                const boundedIndex = Math.max(0, Math.min(SUCCESS_STORIES.length - 1, nextIndex));
                setStoryIndex(boundedIndex);
              }}
            >
              {SUCCESS_STORIES.map((item) => (
                <View
                  key={item.id}
                  style={[
                    styles.storyCard,
                    {
                      width: storyCardWidth,
                      backgroundColor: storyCardBg,
                      borderColor: storyCardBorder,
                    },
                  ]}
                >
                  <View style={[styles.storyAccent, { backgroundColor: item.accent }]} />
                  <View style={styles.storyBody}>
                    <View style={[styles.storyBadge, { backgroundColor: item.badgeBg }]}>
                      <Ionicons name="medal" size={11} color={item.badgeText} />
                      <Text style={[styles.storyBadgeText, { color: item.badgeText }]}>{item.examTag}</Text>
                    </View>
                    <Text style={[styles.storyQuote, { color: storyQuoteColor }]}>{item.quote}</Text>
                    <View style={styles.storyDivider} />
                    <View style={styles.storyFooter}>
                      <View style={[styles.storyAvatar, { backgroundColor: item.accent }]}>
                        <Text style={styles.storyAvatarText}>{item.avatar}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.storyName, { color: storyNameColor }]}>{item.name}</Text>
                        <Text style={[styles.storyExam, { color: storyExamColor }]}>{item.exam}</Text>
                      </View>
                      <Text style={styles.storyStars}>★★★★★</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={styles.storyDots}>
              {SUCCESS_STORIES.map((story, index) => (
                <View key={story.id} style={[styles.storyDot, index === storyIndex && styles.storyDotOn]} />
              ))}
            </View>
          </View>

          <View style={[styles.tipCard, { backgroundColor: tipBg, borderColor: tipBorder }]}>
            <View style={styles.tipHeader}>
              <View style={styles.tipTag}>
                <Ionicons name="bulb" size={11} color="#92400e" />
                <Text style={styles.tipTagText}>Tip of the Day</Text>
              </View>
              <View style={styles.tipNav}>
                <Pressable style={styles.tipNavBtn} onPress={() => setTipIndex((prev) => (prev - 1 + TIPS.length) % TIPS.length)}>
                  <Ionicons name="chevron-back" size={12} color="#92400e" />
                </Pressable>
                <Text style={styles.tipCounter}>{tipIndex + 1}/{TIPS.length}</Text>
                <Pressable style={styles.tipNavBtn} onPress={() => setTipIndex((prev) => (prev + 1) % TIPS.length)}>
                  <Ionicons name="chevron-forward" size={12} color="#92400e" />
                </Pressable>
              </View>
            </View>
            <Text style={[styles.tipText, { color: tipTextColor }]}>{TIPS[tipIndex]}</Text>
            <View style={styles.tipProgress}>
              {TIPS.map((_, index) => (
                <View key={index} style={[styles.tipPip, index === tipIndex && styles.tipPipOn]} />
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 44,
    height: 44,
  },
  logoText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: -4,
  },
  logoHighlight: {
    color: '#059669',
    fontWeight: '800',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 99,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  streakChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  streakChipIdle: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  streakChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  streakChipTextActive: {
    color: '#ea580c',
  },
  streakChipTextIdle: {
    color: '#94a3b8',
  },
  heroIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#f43f5e',
  },
  heroAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
  },
  heroAvatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  greetBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingBottom: 4,
  },
  greetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  greetName: {
    color: '#059669',
    fontWeight: '800',
  },
  greetDate: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: 110,
  },
  bodyContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    marginTop: -2,
    backgroundColor: COLORS.bg,
  },
  slider: { marginHorizontal: -16 },
  slide: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  slideInner: {
    minHeight: 180,
    borderRadius: 16,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 18,
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  slideLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 6,
  },
  slideTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 5,
    maxWidth: '88%',
    lineHeight: 24,
  },
  slideSub: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
    maxWidth: '86%',
  },
  slideBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  slideBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  carouselDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 14,
  },
  carouselDotTap: {
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(5,150,105,0.35)',
  },
  carouselDotActive: {
    width: 18,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#059669',
  },
  targetCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 14,
  },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  targetTitle: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  targetHint: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  targetAdd: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  todoInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  todoSaveBtn: {
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  todoSaveText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 11,
  },
  todoList: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  todoCheck: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todoCheckDone: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  todoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  todoTextDone: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  todoDelete: {
    padding: 2,
  },
  emptyTargetText: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  challengesList: {
    gap: 10,
    marginBottom: 14,
  },
  challengeCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeBody: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  challengeSub: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 16,
  },
  quickActionItem: {
    width: '23%',
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    position: 'relative',
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#f43f5e',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  quickBadgeLive: {
    backgroundColor: '#059669',
  },
  quickBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  quickActionName: {
    marginTop: 6,
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  dailyCardsRail: {
    paddingTop: 2,
    paddingBottom: 8,
    gap: 12,
    paddingRight: 8,
    marginBottom: 12,
  },
  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  infoSub: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  resultCard: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  resultPct: {
    fontSize: 17,
    fontWeight: '900',
  },
  resultScore: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  resultMeta: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  infoBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 15,
  },
  infoBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  infoBtnDisabled: {
    opacity: 0.65,
  },
  selectionKeyCard: {
    marginBottom: 14,
    borderRadius: 14,
    backgroundColor: '#059669',
    borderWidth: 1,
    borderColor: '#34d399',
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#047857',
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  selectionKeyBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#fef3c7',
    borderBottomLeftRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  selectionKeyBadgeText: {
    color: '#92400e',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  selectionKeyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  selectionKeyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  selectionKeySub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    marginTop: 1,
    fontWeight: '600',
  },
  selectionKeyRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
  },
  selectionKeyPrice: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 14,
  },
  selectionKeyCtaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selectionKeyCtaText: {
    color: '#065f46',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabelInline: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forumCarouselWrap: {
    marginBottom: 22,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  forumMarqueeViewport: {
    overflow: 'hidden',
  },
  forumMarqueeTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  forumCard: {
    width: 240,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  forumTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  forumCategory: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  forumCategoryText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  forumHot: {
    color: '#f43f5e',
    fontSize: 10,
    fontWeight: '700',
  },
  forumTitle: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 10,
  },
  forumMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forumAvatar: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  forumAvatarText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  forumUser: {
    flex: 1,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
  },
  forumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forumStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  forumStatText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  storyWrap: {
    marginBottom: 22,
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  storyScrollContent: {
    paddingRight: 12,
    gap: 12,
  },
  storyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  storyAccent: {
    height: 4,
  },
  storyBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storyBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  storyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  storyQuote: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 19,
    marginBottom: 10,
  },
  storyDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 9,
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  storyAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  storyName: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '700',
  },
  storyExam: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
  storyStars: {
    fontSize: 10,
    color: '#f59e0b',
    letterSpacing: 0.6,
  },
  storyDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 10,
  },
  storyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e2e8f0',
  },
  storyDotOn: {
    width: 18,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  tipCard: {
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingTop: 10,
    paddingBottom: 11,
    paddingHorizontal: 14,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tipTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tipTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tipNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tipNavBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(251,191,36,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCounter: {
    minWidth: 30,
    textAlign: 'center',
    fontSize: 10,
    color: '#b45309',
    fontWeight: '700',
  },
  tipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78350f',
    lineHeight: 19,
    marginBottom: 10,
  },
  tipProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tipPip: {
    flex: 1,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#fde68a',
  },
  tipPipOn: {
    backgroundColor: '#f59e0b',
  },
});
