import { BackHandler, ScrollView, View, Text, StyleSheet, Pressable, Modal, Image, Platform } from 'react-native';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pyqApi } from '../services/api';
import { buildUserStorageScope, withUserScope } from '../utils/storageScope';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

const PAUSED_TESTS_STORAGE_KEY = 'pyqs_paused_tests_v1';
const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';

const PYQ_EXAM_TIER_CARDS = [
  { key: 'cgl_t1', title: 'CGL Tier 1', exam: 'CGL', tier: 'Tier 1' },
  { key: 'cgl_t2', title: 'CGL Tier 2', exam: 'CGL', tier: 'Tier 2' },
  { key: 'chsl_t1', title: 'CHSL Tier 1', exam: 'CHSL', tier: 'Tier 1' },
  { key: 'chsl_t2', title: 'CHSL Tier 2', exam: 'CHSL', tier: 'Tier 2' },
  { key: 'mts', title: 'MTS', exam: 'MTS' },
  { key: 'cpo_t1', title: 'CPO Tier 1', exam: 'CPO', tier: 'Tier 1' },
  { key: 'cpo_t2', title: 'CPO Tier 2', exam: 'CPO', tier: 'Tier 2' },
];

const CARD_YEAR_OPTIONS = ['All', '2025', '2024', '2023', '2022', '2021', '2020', '2019'];

const EXAM_QUERY_MAP: Record<string, string> = {
  CGL: 'SSC CGL',
  CHSL: 'SSC CHSL',
  MTS: 'SSC MTS',
  CPO: 'SSC CPO',
};

const TIER_QUERY_MAP: Record<string, string> = {
  'Tier 1': 'Tier1',
  'Tier 2': 'Tier2',
};

type CardPaperCount = {
  pyq: number;
  rankMaker: number;
};


type SubmissionResult = {
  sourceTab: 'PYQ' | 'RankMaker';
  testKey?: string;
  attemptId?: string;
  testPaperId?: string;
  testTitle: string;
  durationSeconds?: number;
  totalQuestions?: number;
  examName?: string;
  tier?: string;
  shift?: string;
  date?: string;
  markingScheme?: {
    correctMark: number;
    wrongMark: number;
  };
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

type ResumeState = {
  currentQuestionIndex: number;
  selectedOptions: Record<number, number>;
  visitedQuestions: Record<number, boolean>;
  reviewedQuestions: Record<number, boolean>;
  timeLeft: number;
  activeSection: string;
  selectedLanguage: 'English' | 'Hindi';
  zoomLevel: number;
};

type PausedTestPayload = {
  testKey: string;
  sourceTab: 'PYQ' | 'RankMaker';
  mockData: { title: string; questions: number; duration: number };
  resumeState: ResumeState;
  pausedAt: string;
};

const formatSubmittedAt = (value: string) => {
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return value;
};

const formatPyqDateForTitle = (rawDate?: string) => {
  if (!rawDate) return 'N/A';
  const parsed = new Date(rawDate);
  if (isNaN(parsed.getTime())) return rawDate;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = parsed.toLocaleString('en-US', { month: 'short' });
  const year = parsed.getFullYear();
  return `${day} ${month}, ${year}`;
};

const normalizeTierLabel = (tier?: string) => {
  if (!tier) return '';
  const compact = tier.replace(/\s+/g, '');
  const match = compact.match(/tier[-_ ]?(\d+)/i);
  if (match?.[1]) return `Tier ${match[1]}`;
  return tier;
};

const normalizeShiftLabel = (shift?: string) => {
  if (!shift) return 'Shift 1';
  const match = String(shift).match(/(\d+)/);
  if (match?.[1]) return `Shift ${match[1]}`;
  return shift;
};

const normalizeQuestionCount = (paper: any) => {
  const raw = Number(
    paper?.questionCount ??
      paper?.totalQuestions ??
      paper?.config?.questionCount ??
      paper?.metaData?.questionCount
  );
  if (Number.isFinite(raw) && raw > 0) {
    return Math.round(raw);
  }
  return 100;
};

const normalizeDurationMinutes = (paper: any) => {
  const raw = Number(
    paper?.timeLimit ??
      paper?.duration ??
      paper?.config?.timeLimit ??
      paper?.metaData?.timeLimit
  );
  if (!Number.isFinite(raw) || raw <= 0) {
    return 60;
  }
  // Backends may return minutes (e.g. 60) or seconds (e.g. 3600).
  return raw < 300 ? Math.round(raw) : Math.round(raw / 60);
};

const buildPyqDisplayTitle = (paper: any, fallbackExamName?: string) => {
  const examName = paper?.metaData?.examName || paper?.examName || fallbackExamName || 'SSC CGL';
  const yearFromDate = (() => {
    const d = paper?.date ? new Date(paper.date) : null;
    return d && !isNaN(d.getTime()) ? d.getFullYear() : undefined;
  })();
  const examYear =
    paper?.metaData?.examYear ||
    paper?.examYear ||
    yearFromDate ||
    new Date().getFullYear();
  const tier = normalizeTierLabel(paper?.tier);
  return tier ? `${examName} ${examYear} ${tier}` : `${examName} ${examYear}`;
};

export default function PyqsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const { userName, userEmail } = useLoginModal();
  const hasUnreadNotifications = useHasUnreadNotifications();

  const [activeTab, setActiveTab] = useState<'RankMaker' | 'PYQ'>('PYQ');

  const [pyqList, setPyqList] = useState<any[]>([]);
  const [pyqCursor, setPyqCursor] = useState<string | null>(null);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [hasMorePyqs, setHasMorePyqs] = useState(true);

  const [rankMakerList, setRankMakerList] = useState<any[]>([]);
  const [rankMakerCursor, setRankMakerCursor] = useState<string | null>(null);
  const [loadingRankMaker, setLoadingRankMaker] = useState(false);
  const [hasMoreRankMaker, setHasMoreRankMaker] = useState(true);

  const [filters, setFilters] = useState({
    Exam: 'Exam',
    Tier: 'Tier',
    Year: 'Year',
  });
  const [selectedExamTierCard, setSelectedExamTierCard] = useState<string | null>(null);
  const [cardYearFilter, setCardYearFilter] = useState<string>('All');
  const [isCardYearModalVisible, setIsCardYearModalVisible] = useState(false);
  const [cardPaperCounts, setCardPaperCounts] = useState<Record<string, CardPaperCount>>({});
  const [loadingCardPaperCounts, setLoadingCardPaperCounts] = useState(false);
  const [resultHistory, setResultHistory] = useState<SubmissionResult[]>([]);
  const [pausedTests, setPausedTests] = useState<Record<string, PausedTestPayload>>({});
  const [hasLoadedPausedTests, setHasLoadedPausedTests] = useState(false);
  const [hasLoadedResultHistory, setHasLoadedResultHistory] = useState(false);
  const cardCountRequestIdRef = useRef(0);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#132920' : '#ffffff';
  const border = isDark ? '#065f46' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669';
  const displayName = (userName || 'User').trim() || 'User';
  const storageScope = useMemo(() => buildUserStorageScope(userEmail, userName), [userEmail, userName]);
  const pausedTestsStorageKey = useMemo(
    () => withUserScope(PAUSED_TESTS_STORAGE_KEY, storageScope),
    [storageScope]
  );
  const resultHistoryStorageKey = useMemo(
    () => withUserScope(RESULT_HISTORY_STORAGE_KEY, storageScope),
    [storageScope]
  );
  const avatarText = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  const modeCards = useMemo(
    () => [
      {
        id: 'PYQ' as const,
        title: 'PYQ Papers',
        subtitle: 'Previous year papers across shifts and tiers.',
        cta: 'Browse PYQs',
        icon: 'copy-outline' as const,
        iconBg: '#ec4899',
      },
      {
        id: 'RankMaker' as const,
        title: 'Rank Maker Series',
        subtitle: 'Full-length practice series for exam readiness.',
        cta: 'Open Series',
        icon: 'star-outline' as const,
        iconBg: '#7c3aed',
      },
    ],
    []
  );

  const fetchPyqs = async (reset = false) => {
    if (loadingPyqs || (!hasMorePyqs && !reset)) return;
    setLoadingPyqs(true);
    
    try {
      const query: any = { limit: 10, type: 'pyq' };
      if (!reset && pyqCursor) query.cursor = pyqCursor;

      if (filters.Exam && filters.Exam !== 'Exam' && !filters.Exam.startsWith('All')) {
        query.examName = EXAM_QUERY_MAP[filters.Exam] || filters.Exam;
      }

      if (filters.Tier && filters.Tier !== 'Tier' && !filters.Tier.startsWith('All')) {
        query.tier = TIER_QUERY_MAP[filters.Tier] || filters.Tier.replace(/\s+/g, '');
      }

      if (filters.Year && filters.Year !== 'Year' && !filters.Year.startsWith('All')) {
        query.examYear = filters.Year;
      }

      const res = await pyqApi.listTestPapers(query);
      if (res && res.data) {
        setPyqList(prev => reset ? [...res.data] : [...prev, ...res.data]);
        setPyqCursor(res.nextCursor || null);
        setHasMorePyqs(!!res.nextCursor);
      } else if (reset) {
        setPyqList([]);
        setPyqCursor(null);
        setHasMorePyqs(false);
      }
    } catch (error) {
      console.error('Failed to fetch PYQs:', error);
      if (reset) {
        setPyqList([]);
        setPyqCursor(null);
        setHasMorePyqs(false);
      }
    } finally {
      setLoadingPyqs(false);
    }
  };

  const fetchRankMakerSeries = async (reset = false) => {
    if (loadingRankMaker || (!hasMoreRankMaker && !reset)) return;
    setLoadingRankMaker(true);

    try {
      const query: any = { limit: 10, type: 'rankMaker' };
      if (!reset && rankMakerCursor) query.cursor = rankMakerCursor;

      if (filters.Exam && filters.Exam !== 'Exam' && !filters.Exam.startsWith('All')) {
        query.examName = EXAM_QUERY_MAP[filters.Exam] || filters.Exam;
      }

      if (filters.Tier && filters.Tier !== 'Tier' && !filters.Tier.startsWith('All')) {
        query.tier = TIER_QUERY_MAP[filters.Tier] || filters.Tier.replace(/\s+/g, '');
      }

      if (filters.Year && filters.Year !== 'Year' && !filters.Year.startsWith('All')) {
        query.examYear = filters.Year;
      }

      const res = await pyqApi.listTestPapers(query);
      if (res && res.data) {
        setRankMakerList((prev) => (reset ? [...res.data] : [...prev, ...res.data]));
        setRankMakerCursor(res.nextCursor || null);
        setHasMoreRankMaker(!!res.nextCursor);
      } else if (reset) {
        setRankMakerList([]);
        setRankMakerCursor(null);
        setHasMoreRankMaker(false);
      }
    } catch (error) {
      console.error('Failed to fetch rank maker series:', error);
      if (reset) {
        setRankMakerList([]);
        setRankMakerCursor(null);
        setHasMoreRankMaker(false);
      }
    } finally {
      setLoadingRankMaker(false);
    }
  };

  const applyExamTierQuickFilter = (card: { key: string; exam: string; tier?: string }) => {
    setSelectedExamTierCard(card.key);
    setFilters((prev) => ({
      ...prev,
      Exam: card.exam,
      Tier: card.tier || 'Tier',
      Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter,
    }));
  };

  const selectedFilterTitle = useMemo(() => {
    const exam = filters.Exam !== 'Exam' ? filters.Exam : 'All Exams';
    return filters.Tier !== 'Tier' ? `${exam} ${filters.Tier}` : exam;
  }, [filters.Exam, filters.Tier]);

  const selectedExamTierData = useMemo(
    () => PYQ_EXAM_TIER_CARDS.find((cardItem) => cardItem.key === selectedExamTierCard) || null,
    [selectedExamTierCard]
  );

  const clearExamTierSelection = () => {
    setSelectedExamTierCard(null);
    setFilters((prev) => ({ ...prev, Exam: 'Exam', Tier: 'Tier', Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter }));
    setActiveTab('PYQ');
    setPyqList([]);
    setPyqCursor(null);
    setHasMorePyqs(true);
    setRankMakerList([]);
    setRankMakerCursor(null);
    setHasMoreRankMaker(true);
  };

  const cardYearOptions = CARD_YEAR_OPTIONS;

  const getFallbackCardCount = () => 0;

  const fetchCountByType = useCallback(async (query: any) => {
    const extractTotal = (res: any): number | null => {
      const candidates = [
        res?.total,
        res?.count,
        res?.totalCount,
        res?.pagination?.total,
        res?.meta?.total,
        res?.meta?.count,
      ];
      const matched = candidates.find((v) => typeof v === 'number' && Number.isFinite(v));
      return typeof matched === 'number' ? matched : null;
    };

    const firstRes = await pyqApi.listTestPapers({ ...query, limit: 100 });
    const explicitTotal = extractTotal(firstRes);
    if (explicitTotal !== null) {
      return explicitTotal;
    }

    const firstBatch = Array.isArray(firstRes?.data) ? firstRes.data.length : 0;
    let total = firstBatch;
    let cursor = firstRes?.nextCursor;
    let guard = 0;

    while (cursor && guard < 50) {
      const nextRes = await pyqApi.listTestPapers({ ...query, limit: 100, cursor });
      const list = Array.isArray(nextRes?.data) ? nextRes.data : [];
      total += list.length;
      cursor = nextRes?.nextCursor;
      guard += 1;
    }

    return total;
  }, []);

  const fetchSingleCardCount = useCallback(async (cardItem: { key: string; exam: string; tier?: string }): Promise<CardPaperCount> => {
    const mappedExam = EXAM_QUERY_MAP[cardItem.exam] || cardItem.exam;
    const baseQuery: any = {
      examName: mappedExam,
    };

    if (cardItem.tier) {
      const mappedTier = TIER_QUERY_MAP[cardItem.tier] || cardItem.tier.replace(/\s+/g, '');
      baseQuery.tier = mappedTier;
    }

    if (cardYearFilter !== 'All') {
      baseQuery.examYear = cardYearFilter;
    }

    try {
      const [pyqCount, rankMakerCount] = await Promise.all([
        fetchCountByType({ ...baseQuery, type: 'pyq' }),
        fetchCountByType({ ...baseQuery, type: 'rankMaker' }),
      ]);

      return {
        pyq: pyqCount,
        rankMaker: rankMakerCount,
      };
    } catch (error) {
      console.error(`Failed to fetch count for ${cardItem.key}:`, error);
      return {
        pyq: getFallbackCardCount(),
        rankMaker: getFallbackCardCount(),
      };
    }
  }, [cardYearFilter, fetchCountByType]);

  const refreshCardPaperCounts = useCallback(async () => {
    if (activeTab !== 'PYQ' || selectedExamTierCard) {
      return;
    }

    const requestId = cardCountRequestIdRef.current + 1;
    cardCountRequestIdRef.current = requestId;

    setLoadingCardPaperCounts(true);
    try {
      const pairs = await Promise.all(
        PYQ_EXAM_TIER_CARDS.map(async (cardItem) => {
          const count = await fetchSingleCardCount(cardItem);
          return [cardItem.key, count] as const;
        })
      );

      const nextCounts: Record<string, CardPaperCount> = {};
      pairs.forEach(([key, count]) => {
        nextCounts[key] = count;
      });
      if (requestId === cardCountRequestIdRef.current) {
        setCardPaperCounts(nextCounts);
      }
    } finally {
      if (requestId === cardCountRequestIdRef.current) {
        setLoadingCardPaperCounts(false);
      }
    }
  }, [activeTab, selectedExamTierCard, fetchSingleCardCount]);

  useFocusEffect(
    useCallback(() => {
      void refreshCardPaperCounts();
    }, [refreshCardPaperCounts])
  );

  const getCardPyqCount = (cardItem: { key: string; exam: string; tier?: string }) => {
    if (typeof cardPaperCounts[cardItem.key]?.pyq === 'number') {
      return cardPaperCounts[cardItem.key].pyq;
    }
    return getFallbackCardCount();
  };

  const getCardRankMakerCount = (cardItem: { key: string; exam: string; tier?: string }) => {
    if (typeof cardPaperCounts[cardItem.key]?.rankMaker === 'number') {
      return cardPaperCounts[cardItem.key].rankMaker;
    }
    return getFallbackCardCount();
  };

  const handleHeaderBack = () => {
    if (activeTab === 'PYQ' && selectedExamTierCard) {
      clearExamTierSelection();
      return;
    }
    navigation.goBack();
  };

  const handleSelectMode = (mode: 'PYQ' | 'RankMaker') => {
    setActiveTab(mode);
    if (mode === 'PYQ') {
      clearExamTierSelection();
    }
  };

  const handleOpenNotifications = () => {
    navigation.navigate('Notifications');
  };

  const openMainMenu = () => {
    navigation.navigate('MenuDrawer');
  };

  useEffect(() => {
    if (!selectedExamTierCard) {
      setPyqList([]);
      setPyqCursor(null);
      setHasMorePyqs(true);
      setRankMakerList([]);
      setRankMakerCursor(null);
      setHasMoreRankMaker(true);
      return;
    }

    if (filters.Year !== (cardYearFilter === 'All' ? 'Year' : cardYearFilter)) {
      setFilters((prev) => ({ ...prev, Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter }));
      return;
    }

    if (activeTab === 'PYQ') {
      fetchPyqs(true);
      return;
    }

    fetchRankMakerSeries(true);
  }, [filters, activeTab, selectedExamTierCard, cardYearFilter]);

  const loadResultHistory = async () => {
    try {
      const res = await pyqApi.getPyqAttemptsHistory({ limit: 10 });
      if (res && res.data) {
        const historyData = res.data.map((h: any) => ({
          sourceTab: 'PYQ',
          testKey: h.attemptId,
          attemptId: h.attemptId,
          testPaperId: h.testPaper?._id || h.testPaper?.id,
          testTitle: h.testPaper?.metaData?.title || buildPyqDisplayTitle(h.testPaper || {}, h.testPaper?.metaData?.examName),
          examName: h.testPaper?.metaData?.examName,
          tier: normalizeTierLabel(h.testPaper?.tier),
          shift: normalizeShiftLabel(h.testPaper?.shift),
          date: h.testPaper?.date,
          totalQuestions: h.testPaper?.questionCount,
          durationSeconds: h.testPaper?.timeLimit,
          markingScheme: {
            correctMark: Number(h?.results?.marksPerCorrect) || 2,
            wrongMark: Number(h?.results?.marksPerIncorrect) || 0.5,
          },
          attempted: h.results?.attempted || 0,
          correct: h.results?.correct || 0,
          wrong: h.results?.incorrect || 0,
          unattempted: h.results?.unattempted || 0,
          score: h.results?.score || 0,
          sectionBreakup: h.results?.sectionBreakup || [],
          submittedAt: new Date(h.createdAt || Date.now()).toLocaleDateString(),
        }));
        setResultHistory(historyData);
      } else {
        setResultHistory([]);
      }
    } catch (error) {
      console.error('Failed to load result history via API, checking async storage', error);
      // Fallback to async storage
      const raw = await AsyncStorage.getItem(resultHistoryStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SubmissionResult[];
        if (Array.isArray(parsed)) setResultHistory(parsed.slice(0, 10));
      } else {
        setResultHistory([]);
      }
    } finally {
      setHasLoadedResultHistory(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadPausedTests = async () => {
      try {
        const raw = await AsyncStorage.getItem(pausedTestsStorageKey);
        if (!raw) {
          if (isMounted) {
            setPausedTests({});
          }
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, PausedTestPayload>;
        if (isMounted && parsed && typeof parsed === 'object') {
          setPausedTests(parsed);
        }
      } catch (error) {
        console.error('Failed to load paused tests', error);
      } finally {
        if (isMounted) {
          setHasLoadedPausedTests(true);
        }
      }
    };

    loadPausedTests();
    loadResultHistory();

    return () => {
      isMounted = false;
    };
  }, [pausedTestsStorageKey, resultHistoryStorageKey]);

  useEffect(() => {
    if (!hasLoadedPausedTests) {
      return;
    }

    const persistPausedTests = async () => {
      try {
        if (Object.keys(pausedTests).length === 0) {
          await AsyncStorage.removeItem(pausedTestsStorageKey);
          return;
        }
        await AsyncStorage.setItem(pausedTestsStorageKey, JSON.stringify(pausedTests));
      } catch (error) {
        console.error('Failed to persist paused tests', error);
      }
    };

    persistPausedTests();
  }, [pausedTests, hasLoadedPausedTests, pausedTestsStorageKey]);

  useEffect(() => {
    if (!hasLoadedResultHistory) {
      return;
    }

    const persistResultHistory = async () => {
      try {
        if (resultHistory.length === 0) {
          await AsyncStorage.removeItem(resultHistoryStorageKey);
          return;
        }
        await AsyncStorage.setItem(resultHistoryStorageKey, JSON.stringify(resultHistory));
      } catch (error) {
        console.error('Failed to persist result history', error);
      }
    };

    persistResultHistory();
  }, [resultHistory, hasLoadedResultHistory, resultHistoryStorageKey]);

  useEffect(() => {
    const submissionResult = route.params?.submissionResult as SubmissionResult | undefined;
    if (!submissionResult) {
      return;
    }

    setResultHistory((prev) => [submissionResult, ...prev].slice(0, 10));
    setActiveTab(submissionResult.sourceTab === 'PYQ' ? 'PYQ' : 'RankMaker');
    if (submissionResult.testKey) {
      setPausedTests((prev) => {
        const next = { ...prev };
        delete next[submissionResult.testKey as string];
        return next;
      });
    }
    navigation.setParams({ submissionResult: undefined, clearPausedTestKey: undefined });
  }, [navigation, route.params?.submissionResult]);

  useEffect(() => {
    const pausedTest = route.params?.pausedTest as PausedTestPayload | undefined;
    if (!pausedTest) {
      return;
    }

    setPausedTests((prev) => ({ ...prev, [pausedTest.testKey]: pausedTest }));
    navigation.setParams({ pausedTest: undefined });
  }, [navigation, route.params?.pausedTest]);

  useEffect(() => {
    const clearPausedTestKey = route.params?.clearPausedTestKey as string | undefined;
    if (!clearPausedTestKey) {
      return;
    }

    setPausedTests((prev) => {
      const next = { ...prev };
      delete next[clearPausedTestKey];
      return next;
    });
    navigation.setParams({ clearPausedTestKey: undefined });
  }, [navigation, route.params?.clearPausedTestKey]);

  useEffect(() => {
    const requestedTab = route.params?.activeTab as 'PYQ' | 'RankMaker' | undefined;
    if (!requestedTab) {
      return;
    }

    setActiveTab(requestedTab);
    navigation.setParams({ activeTab: undefined });
  }, [navigation, route.params?.activeTab]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const onBackPress = () => {
      if (activeTab === 'PYQ' && selectedExamTierCard) {
        clearExamTierSelection();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeTab, selectedExamTierCard]);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.brandRow}>
            <Pressable onPress={handleHeaderBack} style={styles.backIconBtn} hitSlop={10}>
              <Ionicons name="chevron-back" size={18} color={text} />
            </Pressable>
            <Image source={require('../assets/sscguidelogo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={[styles.logoText, { color: text }]}>My<Text style={styles.logoHighlight}>SSC</Text>guide</Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={handleOpenNotifications}>
              <Ionicons name="notifications" size={18} color="#f59e0b" />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </Pressable>

            <Pressable style={styles.avatar} onPress={openMainMenu}>
              <Text style={styles.avatarText}>{avatarText}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 32 + Math.max(insets.bottom, 8) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#1e1b4b' : '#312e81' }]}>
          <View style={styles.heroBubbleLarge} />
          <View style={styles.heroBubbleSmall} />
          <View style={{ flex: 1 }}>
            <View style={styles.heroChipRow}>
              <View style={styles.heroTagWrap}>
                <Ionicons name="sparkles" size={12} color="#c4b5fd" style={{ marginRight: 4 }} />
                <Text style={styles.heroTag}>PYQ HUB</Text>
              </View>
              <View style={styles.heroMiniPill}>
                <Text style={styles.heroMiniPillText}>{selectedExamTierCard ? 'CARD ACTIVE' : '7 EXAM CARDS'}</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>PRACTICE THE HOME-PAGE WAY</Text>
            <Text style={styles.heroSub}>
              Better card visuals, cleaner colors, and quick-switch PYQ or Rank Maker flow for each exam-tier card.
            </Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{resultHistory.length}</Text>
                <Text style={styles.heroStatLabel}>Attempts</Text>
              </View>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{cardYearFilter === 'All' ? 'All' : cardYearFilter}</Text>
                <Text style={styles.heroStatLabel}>Year</Text>
              </View>
              <View style={styles.heroStatPill}>
                <Text style={styles.heroStatValue}>{activeTab === 'PYQ' ? 'PYQ' : 'RM'}</Text>
                <Text style={styles.heroStatLabel}>Mode</Text>
              </View>
            </View>
            <Pressable style={styles.heroBtn} onPress={() => handleSelectMode('PYQ')}>
              <Text style={styles.heroBtnText}>Start Practicing</Text>
              <Ionicons name="chevron-forward" size={12} color="#166534" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.contentCardShell, { backgroundColor: isDark ? '#10261d' : '#f8fafc', borderColor: border }]}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="albums-outline" size={14} color={primary} />
            <Text style={[styles.sectionLabelInline, { color: isDark ? '#cbd5e1' : '#334155' }]}>Choose Exam Card</Text>
          </View>

          {!selectedExamTierCard ? (
            <View style={styles.examTierGrid}>
              {PYQ_EXAM_TIER_CARDS.map((cardItem) => (
                <Pressable
                  key={cardItem.key}
                  style={[styles.examTierGridCard, { backgroundColor: card, borderColor: border }]}
                  onPress={() => applyExamTierQuickFilter(cardItem)}
                >
                  <View style={styles.examTierGridHead}>
                    <View style={[styles.examTierGridIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#ecfdf5' }]}>
                      <Ionicons name="book-outline" size={16} color={primary} />
                    </View>
                    <Ionicons name="arrow-forward-circle" size={18} color={muted} />
                  </View>
                  <Text style={[styles.examTierCardTitle, { color: text }]}>{cardItem.title}</Text>
                  <Text style={[styles.examTierCardSub, { color: muted }]}>PYQ + Rank Maker</Text>
                  <View style={[styles.examTierCountPill, { backgroundColor: isDark ? 'rgba(14,116,144,0.25)' : '#ecfeff' }]}>
                    <Text style={[styles.examTierCountText, { color: isDark ? '#67e8f9' : '#0e7490' }]}>
                      {loadingCardPaperCounts && !cardPaperCounts[cardItem.key]
                        ? '...'
                        : `${getCardPyqCount(cardItem)} PYQ | ${getCardRankMakerCount(cardItem)} RM`}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <>
              <View style={[styles.pyqSelectedHeader, { backgroundColor: card, borderColor: border }]}>
                <Pressable onPress={clearExamTierSelection} style={styles.pyqBackChip}>
                  <Ionicons name="chevron-back" size={14} color={primary} />
                  <Text style={styles.pyqBackChipText}>All Exams</Text>
                </Pressable>
                <Text style={[styles.selectedFilterText, { color: muted, marginBottom: 0 }]}>
                  Showing: {selectedExamTierData?.title || selectedFilterTitle}
                </Text>
                <View style={styles.selectedPageFilterRow}>
                  <Pressable
                    style={[styles.selectedYearBtn, { borderColor: border, backgroundColor: card }]}
                    onPress={() => setIsCardYearModalVisible(true)}
                  >
                    <Text style={[styles.selectedYearBtnText, { color: text }]}>Year: {cardYearFilter}</Text>
                    <Ionicons name="chevron-down" size={14} color={muted} />
                  </Pressable>
                  <Pressable style={[styles.clearFilterBtn, { borderColor: border }]} onPress={() => setCardYearFilter('All')}>
                    <Text style={[styles.clearFilterText, { color: muted }]}>Clear filter</Text>
                  </Pressable>
                </View>
              </View>

              <View style={[styles.sourceCardWrap, { backgroundColor: card, borderColor: border }]}>
                <View style={styles.sourceTabRow}>
                  {modeCards.map((mode) => {
                    const isActive = activeTab === mode.id;
                    return (
                      <Pressable
                        key={mode.id}
                        style={[styles.sourceTabBtn, isActive ? styles.sourceTabBtnOn : null]}
                        onPress={() => handleSelectMode(mode.id)}
                      >
                        <Text style={[styles.sourceTabText, isActive ? styles.sourceTabTextOn : null]}>{mode.title}</Text>
                      </Pressable>
                    );
                  })}
                </View>

              {activeTab === 'PYQ' ? (
              <>
                {pyqList.map((paper) => {
                  const backendTitle = String(paper?.metaData?.title || '').trim();
                  const shouldUseGeneratedTitle = !backendTitle || /^pyq\s*test$/i.test(backendTitle);
                  const fallbackExamName =
                    selectedExamTierData?.exam
                      ? EXAM_QUERY_MAP[selectedExamTierData.exam] || selectedExamTierData.exam
                      : undefined;
                  const resolvedTitle = shouldUseGeneratedTitle
                    ? buildPyqDisplayTitle(paper, fallbackExamName)
                    : backendTitle;
                  const resolvedQuestionCount = normalizeQuestionCount(paper);
                  const resolvedDurationMinutes = normalizeDurationMinutes(paper);
                  const item = {
                    id: paper._id || paper.id,
                    title: resolvedTitle,
                    date: paper.date || 'N/A',
                    shift: paper.shift || 'N/A',
                    questionCount: resolvedQuestionCount,
                    durationMinutes: resolvedDurationMinutes,
                    examName: paper.metaData?.examName || selectedExamTierData?.exam || 'SSC',
                  };
                  const testKey = `PYQ:${item.id}`;
                  const pausedState = pausedTests[testKey];

                  return (
                    <View
                      key={item.id}
                      style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
                    >
                      <View style={[styles.testCardAccent, { backgroundColor: '#0ea5e9' }]} />
                      <View style={styles.testInfoCol}>
                        <View style={styles.testMetaTopRow}>
                          <Ionicons name="document-text-outline" size={14} color={muted} />
                          <Text style={[styles.testExamName, { color: muted }]}>{item.examName}</Text>
                        </View>
                        <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                        <Text style={[styles.testMetaDetails, { color: muted }]}>
                          {item.questionCount} Questions · {item.durationMinutes} min · Held on {item.date} ({item.shift})
                        </Text>
                        {pausedState && (
                          <Text style={[styles.pausedHint, { color: '#f59e0b' }]}>Status: Resume Test</Text>
                        )}
                      </View>
                      <Pressable
                        style={[styles.startBtn, { backgroundColor: pausedState ? '#f59e0b' : primary }]}
                        onPress={() => {
                          if (pausedState) {
                            navigation.navigate('MockPractice', {
                              mockData: pausedState.mockData,
                              sourceTab: 'PYQ',
                              testKey,
                              resumeState: pausedState.resumeState,
                            });
                            return;
                          }

                          navigation.navigate('MockInstruction', {
                            mockData: { title: item.title, questions: item.questionCount, duration: item.durationMinutes },
                            sourceTab: 'PYQ',
                            testKey,
                            testPaperId: item.id,
                          });
                        }}
                      >
                        <Text style={[styles.startBtnText, { color: '#fff' }]}>{pausedState ? 'Resume Test' : 'Start'}</Text>
                      </Pressable>
                    </View>
                  );
                })}

                {pyqList.length === 0 && !loadingPyqs && (
                  <View style={[styles.historyCard, { backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: border }]}>
                    <View style={styles.historyIconCircle}>
                      <Ionicons name="funnel-outline" size={22} color={muted} />
                    </View>
                    <Text style={[styles.historyTitle, { color: text }]}>No PYQs found</Text>
                    <Text style={[styles.historySub, { color: muted }]}>No papers found for this exam and tier.</Text>
                  </View>
                )}

                {hasMorePyqs && (
                  <Pressable style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => fetchPyqs(false)}>
                    <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                      {loadingPyqs ? 'Loading...' : 'Load More'}
                    </Text>
                  </Pressable>
                )}
              </>
              ) : (
              <>
                {rankMakerList.map((paper) => {
                  const backendTitle = String(paper?.metaData?.title || '').trim();
                  const shouldUseGeneratedTitle = !backendTitle || /^pyq\s*test$/i.test(backendTitle);
                  const resolvedTitle = shouldUseGeneratedTitle
                    ? `Rank Maker - ${buildPyqDisplayTitle(paper, selectedExamTierData?.exam)}`
                    : backendTitle;
                  const resolvedQuestionCount = normalizeQuestionCount(paper);
                  const resolvedDurationMinutes = normalizeDurationMinutes(paper);
                  const item = {
                    id: paper._id || paper.id,
                    title: resolvedTitle,
                    questionCount: resolvedQuestionCount,
                    durationMinutes: resolvedDurationMinutes,
                    examName: paper.metaData?.examName || selectedExamTierData?.exam || 'SSC',
                  };
                  const testKey = `RankMaker:${item.id}`;
                  const pausedState = pausedTests[testKey];

                  return (
                    <View
                      key={item.id}
                      style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
                    >
                      <View style={[styles.testCardAccent, { backgroundColor: '#8b5cf6' }]} />
                      <View style={styles.testInfoCol}>
                        <View style={styles.testMetaTopRow}>
                          <Ionicons name="star-outline" size={14} color={muted} />
                          <Text style={[styles.testExamName, { color: muted }]}>{item.examName}</Text>
                        </View>
                        <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                        <Text style={[styles.testMetaDetails, { color: muted }]}>
                          {item.questionCount} Questions · {item.durationMinutes} min
                        </Text>
                        {pausedState && (
                          <Text style={[styles.pausedHint, { color: '#f59e0b' }]}>Status: Resume Test</Text>
                        )}
                      </View>
                      <Pressable
                        style={[styles.startBtn, { backgroundColor: pausedState ? '#f59e0b' : primary }]}
                        onPress={() => {
                          if (pausedState) {
                            navigation.navigate('MockPractice', {
                              mockData: pausedState.mockData,
                              sourceTab: 'RankMaker',
                              testKey,
                              resumeState: pausedState.resumeState,
                            });
                            return;
                          }

                          navigation.navigate('MockInstruction', {
                            mockData: { title: item.title, questions: item.questionCount, duration: item.durationMinutes },
                            sourceTab: 'RankMaker',
                            testKey,
                            testPaperId: item.id,
                          });
                        }}
                      >
                        <Text style={[styles.startBtnText, { color: '#fff' }]}>{pausedState ? 'Resume Test' : 'Start'}</Text>
                      </Pressable>
                    </View>
                  );
                })}

                {rankMakerList.length === 0 && !loadingRankMaker && (
                  <View style={[styles.historyCard, { backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: border }]}>
                    <View style={styles.historyIconCircle}>
                      <Ionicons name="star-outline" size={22} color={muted} />
                    </View>
                    <Text style={[styles.historyTitle, { color: text }]}>No Rank Maker sets found</Text>
                    <Text style={[styles.historySub, { color: muted }]}>No rank maker papers found for this exam and tier.</Text>
                  </View>
                )}

                {hasMoreRankMaker && (
                  <Pressable style={{ paddingVertical: 12, alignItems: 'center' }} onPress={() => fetchRankMakerSeries(false)}>
                    <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                      {loadingRankMaker ? 'Loading...' : 'Load More'}
                    </Text>
                  </Pressable>
                )}
              </>
                )}
              </View>
            </>
          )}
        </View>

        <View style={[styles.recentHistoryWrap, { backgroundColor: card, borderColor: border }]}> 
          <View style={styles.sectionTitleRow}>
            <Ionicons name="time-outline" size={14} color="#f59e0b" />
            <Text style={[styles.sectionLabelInline, { color: isDark ? '#cbd5e1' : '#334155' }]}>Recent History</Text>
          </View>
          <Text style={[styles.recentHistoryHint, { color: muted }]}>Latest attempts with one-tap deep analysis access.</Text>

          {resultHistory.length > 0 ? (
            <View style={styles.resultList}>
              {resultHistory.map((result, idx) => (
                <View
                  key={`${result.testTitle}-${result.submittedAt}-${idx}`}
                  style={[
                    styles.historyEntryCard,
                    {
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: border,
                    },
                  ]}
                >
                  <View style={styles.historyTopRow}>
                    <Text
                      style={[
                        styles.historyBadge,
                        {
                          color: result.sourceTab === 'PYQ' ? '#0369a1' : '#6d28d9',
                          backgroundColor: result.sourceTab === 'PYQ' ? '#e0f2fe' : '#ede9fe',
                        },
                      ]}
                    >
                      {result.sourceTab}
                    </Text>
                    <Text style={[styles.historyWhen, { color: muted }]}>{formatSubmittedAt(result.submittedAt)}</Text>
                  </View>

                  <Text style={[styles.historyMainTitle, { color: text }]} numberOfLines={2}>
                    {result.testTitle}
                  </Text>

                  <View style={styles.historyMetricsRow}>
                    <View style={[styles.historyMetricChip, { backgroundColor: isDark ? 'rgba(14,116,144,0.25)' : '#e0f2fe' }]}>
                      <Text style={[styles.historyMetricLabel, { color: isDark ? '#67e8f9' : '#0369a1' }]}>Score</Text>
                      <Text style={[styles.historyMetricValue, { color: isDark ? '#67e8f9' : '#0369a1' }]}>{Number(result.score || 0).toFixed(2)}</Text>
                    </View>
                    <View style={[styles.historyMetricChip, { backgroundColor: isDark ? 'rgba(5,150,105,0.22)' : '#dcfce7' }]}>
                      <Text style={[styles.historyMetricLabel, { color: isDark ? '#6ee7b7' : '#166534' }]}>Correct</Text>
                      <Text style={[styles.historyMetricValue, { color: isDark ? '#6ee7b7' : '#166534' }]}>{result.correct || 0}</Text>
                    </View>
                    <View style={[styles.historyMetricChip, { backgroundColor: isDark ? 'rgba(239,68,68,0.22)' : '#fee2e2' }]}>
                      <Text style={[styles.historyMetricLabel, { color: isDark ? '#fca5a5' : '#991b1b' }]}>Wrong</Text>
                      <Text style={[styles.historyMetricValue, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{result.wrong || 0}</Text>
                    </View>
                  </View>

                  <Pressable
                    style={[styles.historyActionGhostBtn, { borderColor: border }]}
                    onPress={() => navigation.navigate('TestAnalysis', { result })}
                  >
                    <Text style={[styles.historyActionGhostText, { color: primary }]}>Open Detailed Analysis</Text>
                    <Ionicons name="arrow-forward" size={14} color={primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.historyCard, { backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: border }]}>
              <View style={styles.historyIconCircle}>
                <Ionicons name="time-outline" size={22} color={muted} />
              </View>
              <Text style={[styles.historyTitle, { color: text }]}>No history found</Text>
              <Text style={[styles.historySub, { color: muted }]}> 
                Start attempting previous year papers to see your history here.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      <Modal
        visible={isCardYearModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCardYearModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsCardYearModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>Select Year</Text>
              <Pressable onPress={() => setIsCardYearModalVisible(false)} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {cardYearOptions.map((year) => {
                const isSelected = cardYearFilter === year;
                return (
                  <Pressable
                    key={year}
                    style={[
                      styles.modalOption,
                      { borderBottomColor: border },
                      isSelected && { backgroundColor: isDark ? primary + '20' : primary + '10' },
                    ]}
                    onPress={() => {
                      setCardYearFilter(year);
                      setIsCardYearModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalOptionText, { color: isSelected ? primary : text }]}>{year}</Text>
                    {isSelected && <Ionicons name="checkmark" size={20} color={primary} />}
                  </Pressable>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  backIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(148,163,184,0.14)',
    marginRight: 8,
  },
  headerLogo: { width: 44, height: 44 },
  logoText: { fontSize: 18, fontWeight: '700', marginLeft: -4 },
  logoHighlight: { color: '#059669' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
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
  heroCard: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 18,
     overflow: 'hidden',
     borderWidth: 1,
     borderColor: 'rgba(255,255,255,0.18)',
  },
  heroBubbleLarge: {
    position: 'absolute',
    top: -26,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroBubbleSmall: {
    position: 'absolute',
    bottom: -44,
    left: -30,
    width: 104,
    height: 104,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  heroChipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  heroTagWrap: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 10,
     paddingVertical: 5,
     backgroundColor: 'rgba(167,139,250,0.28)',
     alignSelf: 'flex-start',
     borderRadius: 999,
  },
  heroMiniPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroMiniPillText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTag: { fontSize: 10, fontWeight: '800', color: '#ddd6fe' },
  heroTitle: { fontSize: 16, fontWeight: '900', color: '#ffffff', marginBottom: 8, textTransform: 'uppercase' },
  heroSub: { fontSize: 13, color: '#ddd6fe', marginBottom: 12, lineHeight: 18 },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  heroStatPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  heroStatValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  heroStatLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '700',
  },
  heroBtn: {
     borderRadius: 12,
     backgroundColor: '#ffffff',
     paddingVertical: 9,
     paddingHorizontal: 13,
     alignSelf: 'flex-start',
     flexDirection: 'row',
     alignItems: 'center',
     gap: 5,
  },
  heroBtnText: { fontSize: 13, fontWeight: '800', color: '#166534' },

  sectionLabel: {
    marginTop: 10,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modeGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeCard: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 130,
  },
  modeCardActive: {
    shadowColor: '#059669',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  modeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  modeSub: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
  },
  modeCtaRow: {
    marginTop: 'auto',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modeCtaText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },

  tabWrapper: {
     paddingHorizontal: 0,
     marginBottom: 20,
  },
  tabContainer: {
     flexDirection: 'row',
     borderRadius: 12,
     padding: 4,
     width: '100%',
  },
  tabBtn: {
     flex: 1,
     paddingVertical: 10,
     borderRadius: 10,
     alignItems: 'center',
     justifyContent: 'center',
  },
  activeTabBtn: {
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.15,
     shadowRadius: 3,
     elevation: 2,
  },
  tabText: {
     fontSize: 14,
     fontWeight: '700',
     textAlign: 'center',
  },

  filterScroll: {
    marginBottom: 20,
    maxHeight: 60,
    marginHorizontal: -16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterWrap: {
     flexDirection: 'column',
  },
  filterLabel: {
     fontSize: 11,
     marginBottom: 4,
     fontWeight: '500',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
    justifyContent: 'space-between',
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  
  infoText: {
     fontSize: 13,
     marginBottom: 12,
  },

  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  testCardAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
    marginRight: 10,
  },
  testInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  testMetaTopRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 6,
     gap: 4,
  },
  testExamName: {
     fontSize: 12,
     fontWeight: '600',
  },
  testTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  testMetaDetails: { fontSize: 12 },
  pausedHint: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  startBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBtnText: { fontSize: 13, fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: { paddingBottom: 20 },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  modalOptionText: { fontSize: 15, fontWeight: '500' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionLabelInline: {
    fontSize: 15,
    fontWeight: '800',
  },
  contentCardShell: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  clearFilterBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  examTierGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 8,
  },
  examTierGridHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  examTierGridCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
    minHeight: 132,
  },
  examTierCountPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 6,
  },
  examTierCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  viewPapersBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#059669',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewPapersBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  examTierGridIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,150,105,0.12)',
  },
  pyqSelectedHeader: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  sourceCardWrap: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    marginBottom: 4,
  },
  selectedPageFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  selectedYearBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minWidth: 120,
  },
  selectedYearBtnText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  pyqBackChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(5,150,105,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pyqBackChipText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  examTierCardsScroll: {
    marginHorizontal: -16,
    marginBottom: 8,
  },
  examTierCardsRow: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 4,
  },
  examTierCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 132,
  },
  examTierCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  examTierCardSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  selectedFilterText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  sourceTabRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
  },
  sourceTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    backgroundColor: 'transparent',
  },
  sourceTabBtnOn: {
    backgroundColor: 'rgba(5,150,105,0.12)',
  },
  sourceTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  sourceTabTextOn: {
    color: '#059669',
  },
  recentHistoryWrap: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 16,
    marginBottom: 4,
    paddingBottom: 14,
  },
  recentHistoryHint: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  resultList: {
    gap: 12,
    marginTop: 6,
  },
  historyEntryCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBadge: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  historyWhen: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyMainTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  historyMetricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyMetricChip: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  historyMetricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyMetricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  historyActionGhostBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  historyActionGhostText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    marginRight: 10,
  },
  resultTab: {
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
  resultMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 3,
  },
  resultActionRow: {
    marginVertical: 8,
  },
  resultActionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  resultActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  sectionBreakupWrap: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.25)',
    gap: 2,
  },
  sectionBreakupText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  historyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  historySub: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
});

