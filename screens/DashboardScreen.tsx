import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
  TextInput,
} from 'react-native';
// Simple persistent storage key for today's target todos
const TODO_STORAGE_KEY = 'dashboard_todays_target_todos_v1';
const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';
const DAILY_EXAM_LATEST_STORAGE_KEY = 'daily_exam_latest_v1';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoginModal } from '../context/LoginModalContext';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';

const SLIDES = [
  {
    title: 'Live Quizzes & Tests',
    subtitle: 'Attempt daily mock tests and boost your preparation level.',
    btn: 'Try For Free',
    bg: '#059669',
  },
  {
    title: 'MySSCguide',
    subtitle: 'The ultimate platform where students solve questions for SSC exams confidently.',
    btn: 'Start Solving',
    bg: '#047857',
  },
];

const SUBJECT_CARD_META = [
  { key: 'quant', label: 'Quant. Aptitude Solved', icon: 'calculator', color: '#eab308' },
  { key: 'gi', label: 'Gen. Intelligence Solved', icon: 'bulb', color: '#a855f7' },
  { key: 'english', label: 'English Language Solved', icon: 'document-text', color: '#ec4899' },
  { key: 'ga', label: 'Gen. Awareness Solved', icon: 'globe', color: '#c084fc' },
] as const;

type ResultHistoryItem = {
  sectionBreakup?: Array<{ section?: string; correct?: number; attempted?: number }>;
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

const normalizeSectionToken = (name?: string) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const resolveSubjectKey = (sectionName?: string): 'quant' | 'gi' | 'english' | 'ga' | null => {
  const token = normalizeSectionToken(sectionName);
  if (!token) return null;
  if (token.includes('parta') || token.includes('generalintelligence') || token.includes('reasoning')) return 'gi';
  if (token.includes('partb') || token.includes('quant') || token.includes('aptitude') || token.includes('math')) return 'quant';
  if (token.includes('partc') || token.includes('english')) return 'english';
  if (token.includes('partd') || token.includes('generalawareness') || token.includes('gk')) return 'ga';
  return null;
};


export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName } = useLoginModal();
  const { isDark, toggleTheme } = useTheme();
  const { recentAttempts } = useMocks();
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef(null);
  const [resultHistory, setResultHistory] = useState<ResultHistoryItem[]>([]);
  const [dailyLatest, setDailyLatest] = useState<DailyLatestMap>({});

  // To-do list state
  const [todos, setTodos] = useState<string[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [todosLoaded, setTodosLoaded] = useState(false);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  // Load todos from storage on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const raw = await (await import('@react-native-async-storage/async-storage')).default.getItem(TODO_STORAGE_KEY);
        if (raw && isMounted) {
          setTodos(JSON.parse(raw));
        }
      } catch {}
      if (isMounted) setTodosLoaded(true);
    })();
    return () => { isMounted = false; };
  }, []);

  // Persist todos when changed (after load)
  useEffect(() => {
    if (!todosLoaded) return;
    (async () => {
      try {
        const storage = (await import('@react-native-async-storage/async-storage')).default;
        if (todos.length === 0) {
          await storage.removeItem(TODO_STORAGE_KEY);
        } else {
          await storage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
        }
      } catch {}
    })();
  }, [todos, todosLoaded]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const storage = (await import('@react-native-async-storage/async-storage')).default;
          const [raw, dailyRaw] = await Promise.all([
            storage.getItem(RESULT_HISTORY_STORAGE_KEY),
            storage.getItem(DAILY_EXAM_LATEST_STORAGE_KEY),
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
    }, [])
  );

  const subjectSolvedMap = useMemo(() => {
    const base = { quant: 0, gi: 0, english: 0, ga: 0 };

    const absorb = (items: Array<{ section?: string; correct?: number; attempted?: number }>) => {
      items.forEach((sectionItem) => {
        const subjectKey = resolveSubjectKey(sectionItem.section);
        if (!subjectKey) return;
        const solved = Number(sectionItem.correct ?? sectionItem.attempted ?? 0);
        if (Number.isFinite(solved)) {
          base[subjectKey] += Math.max(0, solved);
        }
      });
    };

    resultHistory.forEach((item) => {
      absorb(item.sectionBreakup || []);
    });

    (recentAttempts || []).forEach((attempt: any) => {
      absorb(attempt?.sectionBreakup || attempt?.results?.sectionBreakup || []);
    });

    return base;
  }, [resultHistory, recentAttempts]);

  const subjectCards = useMemo(
    () =>
      SUBJECT_CARD_META.map((item) => ({
        ...item,
        value: String(subjectSolvedMap[item.key]),
      })),
    [subjectSolvedMap]
  );

  const displayName = userName || 'User';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';

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

  const challengeResult = dailyLatest.challenge;
  const quizResult = dailyLatest.quiz;

  useEffect(() => {
    const t = setInterval(() => {
      setSlideIndex((i) => {
        const next = (i + 1) % SLIDES.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [width]);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.logoRow}>
          <Image 
            source={require('../assets/sscguidelogo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: text }]}>
            My<Text style={styles.logoHighlight}>SSC</Text>guide
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={toggleTheme} style={styles.iconBtn} hitSlop={8}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color="#059669"
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.welcomeTitle, { color: text }]}>
          Welcome back, {displayName}!
        </Text>
        <Text style={[styles.welcomeSub, { color: muted }]}>
          Let's crush your goals today.
        </Text>

        {/* Ad Slider */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setSlideIndex(i);
          }}
          style={[styles.slider, { width }]}
          contentContainerStyle={{ width: width * SLIDES.length }}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={[styles.slideInner, { backgroundColor: s.bg }]}>
                <Text style={styles.slideTitle}>{s.title}</Text>
                <Text style={styles.slideSub}>{s.subtitle}</Text>
                <Pressable style={styles.slideBtn}>
                  <Text style={styles.slideBtnText}>{s.btn}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === slideIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Subject Wise Performance */}
        <Text style={[styles.sectionTitle, { color: text }]}>
          Subject Wise Performance
        </Text>
        <View style={styles.subjectGrid}>
          {subjectCards.map((item) => (
            <View
              key={item.label}
              style={[styles.subjectCard, { backgroundColor: cardBg, borderColor: border }]}
            >
              <View style={[styles.subjectIconWrap, { backgroundColor: item.color + '30' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.subjectValue, { color: text }]}>{item.value}</Text>
              <Text style={[styles.subjectLabel, { color: muted }]} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Today's Target with To-Do List */}
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}> 
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.2)' }]}> 
            <Ionicons name="flag" size={22} color="#059669" /> 
          </View> 
          <Text style={[styles.blockTitle, { color: text }]}>TODAY'S TARGET</Text>
          {/* To-Do List */}
          <View style={{ width: '100%', marginTop: 12, marginBottom: 8 }}>
            {todos.length === 0 && !isAddingTodo && (
              <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <Text style={[styles.blockSub, { color: muted, textAlign: 'center', fontStyle: 'italic' }]}>
                  Your day is clear. Add your first target!
                </Text>
              </View>
            )}
            {todos.map((todo, idx) => (
              <View 
                key={idx} 
                style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  marginBottom: 8,
                  backgroundColor: isDark ? '#33415550' : '#f1f5f9',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: isDark ? '#47556950' : '#e2e8f0',
                }}
              >
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669', marginRight: 10 }} />
                <Text style={{ flex: 1, color: text, fontSize: 14, fontWeight: '500' }}>{todo}</Text>
                <Pressable
                  onPress={() => setTodos(todos.filter((_, i) => i !== idx))}
                  style={{ marginLeft: 8, padding: 2 }}
                  hitSlop={8}
                  accessibilityLabel="Delete task"
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </Pressable>
              </View>
            ))}
          </View>

          {/* New Target Button - only shown when not adding */}
          {!isAddingTodo && (
            <Pressable style={styles.blockBtn} onPress={() => setIsAddingTodo(true)}>
              <Text style={styles.blockBtnText}>+ NEW TARGET</Text>
            </Pressable>
          )}

          {/* Add New To-Do Input Row - only shown when isAddingTodo is true */}
          {isAddingTodo && (
            <View style={{ width: '100%', marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  autoFocus
                  value={newTodo}
                  onChangeText={setNewTodo}
                  placeholder="Task name (e.g. Solve 50 Quant)..."
                  placeholderTextColor={muted}
                  style={{
                    flex: 1,
                    backgroundColor: isDark ? '#334155' : '#fff',
                    color: text,
                    borderRadius: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    fontSize: 14,
                    borderWidth: 1,
                    borderColor: '#059669',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.1,
                    shadowRadius: 2,
                    elevation: 2,
                  }}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (newTodo.trim()) {
                      setTodos([newTodo.trim(), ...todos]);
                      setNewTodo('');
                      setIsAddingTodo(false);
                    } else {
                      setIsAddingTodo(false);
                    }
                  }}
                />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 12 }}>
                <Pressable
                  onPress={() => {
                    setNewTodo('');
                    setIsAddingTodo(false);
                  }}
                  style={{ paddingVertical: 6, paddingHorizontal: 12 }}
                >
                  <Text style={{ color: muted, fontWeight: '600', fontSize: 13 }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (newTodo.trim()) {
                      setTodos([newTodo.trim(), ...todos]);
                      setNewTodo('');
                      setIsAddingTodo(false);
                    } else {
                      setIsAddingTodo(false);
                    }
                  }}
                  style={{ 
                    backgroundColor: '#059669', 
                    paddingVertical: 6, 
                    paddingHorizontal: 16, 
                    borderRadius: 6,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    elevation: 3,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add Target</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Daily Challenge */}
        {(() => {
          const isCompletedToday = !!challengeResult && new Date(challengeResult.completedAt).toDateString() === new Date().toDateString();
          const maxScore = challengeResult ? challengeResult.totalQuestions * 2 : 40;
          const pct = challengeResult ? Math.round((challengeResult.score / maxScore) * 100) : 0;
          return (
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="stopwatch" size={22} color="#3b82f6" />
          </View>
          <Text style={[styles.blockTitle, { color: text }]}>DAILY CHALLENGE</Text>
          {isCompletedToday && challengeResult ? (
            <View style={[styles.dailyResultCard, { backgroundColor: isDark ? '#064e3b' : '#dcfce7' }]}>
              <View style={styles.dailyResultTopRow}>
                <View style={styles.dailyResultScoreCircle}>
                  <Text style={[styles.dailyResultPct, { color: isDark ? '#ffffff' : '#065f46' }]}>{pct}%</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.dailyResultTitle, { color: isDark ? '#bbf7d0' : '#065f46' }]}>Challenge Complete</Text>
                  <Text style={[styles.dailyResultScore, { color: isDark ? '#ffffff' : '#065f46' }]}>
                    {challengeResult.score.toFixed(1)}
                    <Text style={[styles.dailyResultOutOf, { color: isDark ? '#a7f3d0' : '#047857' }]}> / {maxScore}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.dailyStatsRow}>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#d1fae5' : '#047857' }]}>{challengeResult.correct} Correct</Text>
                </View>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="close-circle" size={14} color="#ef4444" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#d1fae5' : '#047857' }]}>{challengeResult.wrong} Wrong</Text>
                </View>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="time" size={14} color="#3b82f6" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#d1fae5' : '#047857' }]}>{formatDuration(challengeResult.timeTaken)}</Text>
                </View>
              </View>
              <Text style={[styles.dailyResultStamp, { color: isDark ? '#a7f3d0' : '#065f46' }]}>Completed {formatCompletedAt(challengeResult.completedAt)}</Text>
            </View>
          ) : (
            <Text style={[styles.blockSub, { color: muted }]} numberOfLines={2}>
              Complete 20 mixed questions in 30 mins to boost your speed.
            </Text>
          )}
          <Pressable
            style={[styles.blockBtn, isCompletedToday && styles.blockBtnDisabled]}
            disabled={isCompletedToday}
            onPress={() => navigation.navigate('DailyChallenge' as never, { mode: 'challenge' } as never)}
          >
            <Text style={[styles.blockBtnText, isCompletedToday && { color: muted }]}>
              {isCompletedToday ? 'COMPLETED TODAY ✓' : 'START NOW →'}
            </Text>
          </Pressable>
        </View>
          );
        })()}

        {/* Daily Quiz */}
        {(() => {
          const isCompletedToday = !!quizResult && new Date(quizResult.completedAt).toDateString() === new Date().toDateString();
          const maxScore = quizResult ? quizResult.totalQuestions * 2 : 20;
          const pct = quizResult ? Math.round((quizResult.score / maxScore) * 100) : 0;
          return (
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
            <Ionicons name="help-circle" size={22} color="#ec4899" />
          </View>
          <Text style={[styles.blockTitle, { color: text }]}>DAILY QUIZ</Text>
          {isCompletedToday && quizResult ? (
            <View style={[styles.dailyResultCard, { backgroundColor: isDark ? '#4c1d95' : '#fce7f3' }]}>
              <View style={styles.dailyResultTopRow}>
                <View style={[styles.dailyResultScoreCircle, { borderColor: isDark ? '#a78bfa' : '#ec4899' }]}>
                  <Text style={[styles.dailyResultPct, { color: isDark ? '#ffffff' : '#9d174d' }]}>{pct}%</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={[styles.dailyResultTitle, { color: isDark ? '#e9d5ff' : '#9d174d' }]}>Quiz Complete</Text>
                  <Text style={[styles.dailyResultScore, { color: isDark ? '#ffffff' : '#9d174d' }]}>
                    {quizResult.score.toFixed(1)}
                    <Text style={[styles.dailyResultOutOf, { color: isDark ? '#f5d0fe' : '#be185d' }]}> / {maxScore}</Text>
                  </Text>
                </View>
              </View>
              <View style={styles.dailyStatsRow}>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#f5d0fe' : '#be185d' }]}>{quizResult.correct} Correct</Text>
                </View>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="close-circle" size={14} color="#ef4444" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#f5d0fe' : '#be185d' }]}>{quizResult.wrong} Wrong</Text>
                </View>
                <View style={styles.dailyStatItem}>
                  <Ionicons name="time" size={14} color="#3b82f6" />
                  <Text style={[styles.dailyStatText, { color: isDark ? '#f5d0fe' : '#be185d' }]}>{formatDuration(quizResult.timeTaken)}</Text>
                </View>
              </View>
              <Text style={[styles.dailyResultStamp, { color: isDark ? '#f0abfc' : '#9d174d' }]}>Completed {formatCompletedAt(quizResult.completedAt)}</Text>
            </View>
          ) : (
            <Text style={[styles.blockSub, { color: muted }]} numberOfLines={2}>
              10 mixed questions from Quant, Reasoning, English, and GA.
            </Text>
          )}
          <Pressable
            style={[styles.blockBtn, isCompletedToday && styles.blockBtnDisabled]}
            disabled={isCompletedToday}
            onPress={() => navigation.navigate('DailyChallenge' as never, { mode: 'quiz' } as never)}
          >
            <Text style={[styles.blockBtnText, isCompletedToday && { color: muted }]}>
              {isCompletedToday ? 'COMPLETED TODAY ✓' : 'PLAY QUIZ →'}
            </Text>
          </Pressable>
        </View>
          );
        })()}


        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 44, height: 44 },
  logoText: { fontSize: 18, fontWeight: '700', marginLeft: -4 },
  logoHighlight: { color: '#059669' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  welcomeTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  welcomeSub: { fontSize: 15, marginBottom: 16 },
  slider: { marginHorizontal: -16, marginBottom: 8 },
  slide: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  slideInner: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 12,
  },
  slideTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  slideSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 16 },
  slideBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  slideBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#475569' },
  dotActive: { backgroundColor: '#059669', width: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  subjectCard: {
    width: '48%',
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  subjectLabel: { fontSize: 12, textAlign: 'center' },
  blockCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  blockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  blockSub: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  blockBtn: { alignSelf: 'center', paddingVertical: 6 },
  blockBtnText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  blockBtnDisabled: { opacity: 0.6 },
  dailyResultCard: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  dailyResultTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dailyResultScoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dailyResultPct: { fontSize: 14, fontWeight: '900' },
  dailyResultTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2, marginBottom: 2 },
  dailyResultScore: { fontSize: 24, fontWeight: '900' },
  dailyResultOutOf: { fontSize: 14, fontWeight: '700' },
  dailyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dailyStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dailyStatText: { fontSize: 11, fontWeight: '700' },
  dailyResultMeta: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  dailyResultStamp: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  shortcutsGrid: {
    marginTop: 4,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  shortcutCard: {
    width: '48%',
    padding: 12,
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  shortcutSpacer: {
    width: '48%',
    marginHorizontal: 6,
    marginVertical: 6,
  },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  shortcutTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  shortcutTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  shortcutSub: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
