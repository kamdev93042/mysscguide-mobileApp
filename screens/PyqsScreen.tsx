import { BackHandler, ScrollView, View, Text, StyleSheet, Pressable, Modal, Image, Platform } from 'react-native';
import { useState, createElement, useEffect, useMemo, useCallback } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pyqApi } from '../services/api';

const PAUSED_TESTS_STORAGE_KEY = 'pyqs_paused_tests_v1';
const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';

const RANK_MAKER_LIST = [
  { id: 'rm1', title: 'Rank Maker Series — Test 1', questions: '100 Questions', duration: '60 min' },
  { id: 'rm2', title: 'Rank Maker Series — Test 2', questions: '100 Questions', duration: '60 min' },
  { id: 'rm3', title: 'Rank Maker Series — Test 3', questions: '100 Questions', duration: '60 min' },
  { id: 'rm4', title: 'Rank Maker Series — Test 4', questions: '100 Questions', duration: '60 min' },
  { id: 'rm5', title: 'Rank Maker Series — Test 5', questions: '100 Questions', duration: '60 min' },
];

const FILTER_DATA_PYQ = {
  Exam: ['All Exams', 'CGL', 'CHSL', 'MTS', 'CPO'],
  Tier: ['All Tiers', 'Tier 1', 'Tier 2'],
  Year: ['All Years', '2025', '2024', '2023', '2022'],
  Shift: ['All Shifts', 'Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'],
  Date: [], // directly triggers date picker
};

const FILTER_DATA_RM = {
  Exam: ['All Exams', 'CGL', 'CHSL', 'MTS', 'CPO'],
  Tier: ['All Tiers', 'Tier 1', 'Tier 2'],
  Year: ['All Years', '2025', '2024', '2023', '2022', '2021', '2020', '2019'],
};

const DUMMY_PYQ_PAPERS = [
  { id: 'demo-cgl-t1-2025-s1', examName: 'SSC CGL', examYear: '2025', tier: 'Tier1', shift: 'shift1', date: '2025-02-10', title: 'SSC CGL Tier 1 Demo Paper', questionCount: 100, timeLimit: 60 * 60 },
  { id: 'demo-cgl-t2-2025-s2', examName: 'SSC CGL', examYear: '2025', tier: 'Tier2', shift: 'shift2', date: '2025-03-11', title: 'SSC CGL Tier 2 Demo Paper', questionCount: 120, timeLimit: 60 * 60 },
  { id: 'demo-chsl-t1-2024-s1', examName: 'SSC CHSL', examYear: '2024', tier: 'Tier1', shift: 'shift1', date: '2024-07-08', title: 'SSC CHSL Tier 1 Demo Paper', questionCount: 100, timeLimit: 60 * 60 },
  { id: 'demo-chsl-t2-2024-s3', examName: 'SSC CHSL', examYear: '2024', tier: 'Tier2', shift: 'shift3', date: '2024-08-14', title: 'SSC CHSL Tier 2 Demo Paper', questionCount: 100, timeLimit: 60 * 60 },
  { id: 'demo-mts-t1-2023-s2', examName: 'SSC MTS', examYear: '2023', tier: 'Tier1', shift: 'shift2', date: '2023-09-18', title: 'SSC MTS Tier 1 Demo Paper', questionCount: 90, timeLimit: 60 * 60 },
  { id: 'demo-mts-t2-2023-s4', examName: 'SSC MTS', examYear: '2023', tier: 'Tier2', shift: 'shift4', date: '2023-10-03', title: 'SSC MTS Tier 2 Demo Paper', questionCount: 90, timeLimit: 60 * 60 },
  { id: 'demo-cpo-t1-2022-s1', examName: 'SSC CPO', examYear: '2022', tier: 'Tier1', shift: 'shift1', date: '2022-11-20', title: 'SSC CPO Tier 1 Demo Paper', questionCount: 100, timeLimit: 60 * 60 },
  { id: 'demo-cpo-t2-2022-s2', examName: 'SSC CPO', examYear: '2022', tier: 'Tier2', shift: 'shift2', date: '2022-12-06', title: 'SSC CPO Tier 2 Demo Paper', questionCount: 100, timeLimit: 60 * 60 },
].map((item) => ({
  _id: item.id,
  date: item.date,
  shift: item.shift,
  tier: item.tier,
  questionCount: item.questionCount,
  timeLimit: item.timeLimit,
  __dummy: true,
  metaData: {
    title: item.title,
    examName: item.examName,
    examYear: item.examYear,
  },
}));

const PYQ_EXAM_TIER_CARDS = [
  { key: 'cgl_t1', title: 'CGL Tier 1', exam: 'CGL', tier: 'Tier 1' },
  { key: 'cgl_t2', title: 'CGL Tier 2', exam: 'CGL', tier: 'Tier 2' },
  { key: 'chsl_t1', title: 'CHSL Tier 1', exam: 'CHSL', tier: 'Tier 1' },
  { key: 'chsl_t2', title: 'CHSL Tier 2', exam: 'CHSL', tier: 'Tier 2' },
  { key: 'mts_t1', title: 'MTS Tier 1', exam: 'MTS', tier: 'Tier 1' },
  { key: 'mts_t2', title: 'MTS Tier 2', exam: 'MTS', tier: 'Tier 2' },
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

const SHIFT_QUERY_MAP: Record<string, string> = {
  'Shift 1': 'shift1',
  'Shift 2': 'shift2',
  'Shift 3': 'shift3',
  'Shift 4': 'shift4',
};

const getDummyFilteredPapers = (filters: {
  Exam: string;
  Tier: string;
  Year: string;
  Shift: string;
  Date: string;
}) => {
  const selectedExam =
    filters.Exam && filters.Exam !== 'Exam' && !filters.Exam.startsWith('All')
      ? EXAM_QUERY_MAP[filters.Exam] || filters.Exam
      : null;

  const selectedTier =
    filters.Tier && filters.Tier !== 'Tier' && !filters.Tier.startsWith('All')
      ? TIER_QUERY_MAP[filters.Tier] || filters.Tier.replace(/\s+/g, '')
      : null;

  const selectedYear =
    filters.Year && filters.Year !== 'Year' && !filters.Year.startsWith('All')
      ? filters.Year
      : null;

  const selectedShift =
    filters.Shift && filters.Shift !== 'Shift' && !filters.Shift.startsWith('All')
      ? SHIFT_QUERY_MAP[filters.Shift] || filters.Shift.toLowerCase().replace(/\s+/g, '')
      : null;

  const selectedDate = filters.Date && filters.Date !== 'Date' ? filters.Date : null;

  return DUMMY_PYQ_PAPERS.filter((paper) => {
    const examName = paper.metaData?.examName;
    const examYear = paper.metaData?.examYear;
    if (selectedExam && examName !== selectedExam) return false;
    if (selectedTier && paper.tier !== selectedTier) return false;
    if (selectedYear && String(examYear) !== String(selectedYear)) return false;
    if (selectedShift && paper.shift !== selectedShift) return false;
    if (selectedDate && paper.date !== selectedDate) return false;
    return true;
  });
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

const formatDate = (value: Date) => {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, '0');
  const dd = String(value.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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
  if (!tier) return 'Tier 1';
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
  return `${examName} ${examYear} ${tier}`;
};

export default function PyqsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'RankMaker' | 'PYQ'>('RankMaker');

  const [pyqList, setPyqList] = useState<any[]>([]);
  const [pyqCursor, setPyqCursor] = useState<string | null>(null);
  const [loadingPyqs, setLoadingPyqs] = useState(false);
  const [hasMorePyqs, setHasMorePyqs] = useState(true);

  const [showAllRM, setShowAllRM] = useState(false);

  const [filters, setFilters] = useState({
    Exam: 'Exam',
    Tier: 'Tier',
    Year: 'Year',
    Shift: 'Shift',
    Date: 'Date',
  });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());
  const [selectedExamTierCard, setSelectedExamTierCard] = useState<string | null>(null);
  const [cardYearFilter, setCardYearFilter] = useState<string>('All');
  const [isCardYearModalVisible, setIsCardYearModalVisible] = useState(false);
  const [cardPaperCounts, setCardPaperCounts] = useState<Record<string, number>>({});
  const [loadingCardPaperCounts, setLoadingCardPaperCounts] = useState(false);
  const [resultHistory, setResultHistory] = useState<SubmissionResult[]>([]);
  const [pausedTests, setPausedTests] = useState<Record<string, PausedTestPayload>>({});
  const [hasLoadedPausedTests, setHasLoadedPausedTests] = useState(false);
  const [hasLoadedResultHistory, setHasLoadedResultHistory] = useState(false);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e5e7eb';
  const text = isDark ? '#ffffff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669';

  const filterData = activeTab === 'PYQ' ? FILTER_DATA_PYQ : FILTER_DATA_RM;

  const fetchPyqs = async (reset = false) => {
    if (loadingPyqs || (!hasMorePyqs && !reset)) return;
    setLoadingPyqs(true);
    
    try {
      const query: any = { limit: 10 };
      if (!reset && pyqCursor) query.cursor = pyqCursor;
      const dummyFiltered = getDummyFilteredPapers(filters);

      if (filters.Exam && filters.Exam !== 'Exam' && !filters.Exam.startsWith('All')) {
        query.examName = EXAM_QUERY_MAP[filters.Exam] || filters.Exam;
      }

      if (filters.Tier && filters.Tier !== 'Tier' && !filters.Tier.startsWith('All')) {
        query.tier = TIER_QUERY_MAP[filters.Tier] || filters.Tier.replace(/\s+/g, '');
      }

      if (filters.Year && filters.Year !== 'Year' && !filters.Year.startsWith('All')) {
        query.examYear = filters.Year;
      }

      if (filters.Shift && filters.Shift !== 'Shift' && !filters.Shift.startsWith('All')) {
        query.shift = SHIFT_QUERY_MAP[filters.Shift] || filters.Shift.toLowerCase().replace(/\s+/g, '');
      }

      if (filters.Date && filters.Date !== 'Date') query.date = filters.Date;

      const res = await pyqApi.listTestPapers(query);
      if (res && res.data) {
        setPyqList(prev => reset ? [...dummyFiltered, ...res.data] : [...prev, ...res.data]);
        setPyqCursor(res.nextCursor || null);
        setHasMorePyqs(!!res.nextCursor);
      } else if (reset) {
        setPyqList(dummyFiltered);
        setPyqCursor(null);
        setHasMorePyqs(false);
      }
    } catch (error) {
      console.error('Failed to fetch PYQs:', error);
      if (reset) {
        const dummyFiltered = getDummyFilteredPapers(filters);
        setPyqList(dummyFiltered);
        setPyqCursor(null);
        setHasMorePyqs(false);
      }
    } finally {
      setLoadingPyqs(false);
    }
  };

  const applyExamTierQuickFilter = (card: { key: string; exam: string; tier: string }) => {
    setSelectedExamTierCard(card.key);
    setFilters((prev) => ({
      ...prev,
      Exam: card.exam,
      Tier: card.tier,
      Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter,
      Shift: 'Shift',
      Date: 'Date',
    }));
  };

  const selectedFilterTitle = useMemo(() => {
    const exam = filters.Exam !== 'Exam' ? filters.Exam : 'All Exams';
    const tier = filters.Tier !== 'Tier' ? filters.Tier : 'All Tiers';
    return `${exam} ${tier}`;
  }, [filters.Exam, filters.Tier]);

  const selectedExamTierData = useMemo(
    () => PYQ_EXAM_TIER_CARDS.find((cardItem) => cardItem.key === selectedExamTierCard) || null,
    [selectedExamTierCard]
  );

  const clearExamTierSelection = () => {
    setSelectedExamTierCard(null);
    setFilters((prev) => ({ ...prev, Exam: 'Exam', Tier: 'Tier', Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter, Shift: 'Shift', Date: 'Date' }));
  };

  const cardYearOptions = CARD_YEAR_OPTIONS;

  const getDummyCardPyqCount = (cardItem: { exam: string; tier: string }) => {
    const mappedExam = EXAM_QUERY_MAP[cardItem.exam] || cardItem.exam;
    const mappedTier = TIER_QUERY_MAP[cardItem.tier] || cardItem.tier.replace(/\s+/g, '');

    return DUMMY_PYQ_PAPERS.filter((paper) => {
      const matchesExam = paper?.metaData?.examName === mappedExam;
      const matchesTier = paper?.tier === mappedTier;
      const matchesYear =
        cardYearFilter === 'All' || String(paper?.metaData?.examYear || '') === String(cardYearFilter);
      return matchesExam && matchesTier && matchesYear;
    }).length;
  };

  const fetchSingleCardCount = useCallback(async (cardItem: { key: string; exam: string; tier: string }) => {
    const mappedExam = EXAM_QUERY_MAP[cardItem.exam] || cardItem.exam;
    const mappedTier = TIER_QUERY_MAP[cardItem.tier] || cardItem.tier.replace(/\s+/g, '');
    const baseQuery: any = {
      examName: mappedExam,
      tier: mappedTier,
    };

    if (cardYearFilter !== 'All') {
      baseQuery.examYear = cardYearFilter;
    }

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

    try {
      const firstRes = await pyqApi.listTestPapers({ ...baseQuery, limit: 100 });
      const explicitTotal = extractTotal(firstRes);
      if (explicitTotal !== null) {
        return explicitTotal;
      }

      const firstBatch = Array.isArray(firstRes?.data) ? firstRes.data.length : 0;
      let total = firstBatch;
      let cursor = firstRes?.nextCursor;
      let guard = 0;

      while (cursor && guard < 50) {
        const nextRes = await pyqApi.listTestPapers({ ...baseQuery, limit: 100, cursor });
        const list = Array.isArray(nextRes?.data) ? nextRes.data : [];
        total += list.length;
        cursor = nextRes?.nextCursor;
        guard += 1;
      }

      return total;
    } catch (error) {
      console.error(`Failed to fetch count for ${cardItem.key}:`, error);
      return getDummyCardPyqCount(cardItem);
    }
  }, [cardYearFilter]);

  useEffect(() => {
    if (activeTab !== 'PYQ' || selectedExamTierCard) {
      return;
    }

    let isMounted = true;
    const loadCounts = async () => {
      setLoadingCardPaperCounts(true);
      try {
        const pairs = await Promise.all(
          PYQ_EXAM_TIER_CARDS.map(async (cardItem) => {
            const count = await fetchSingleCardCount(cardItem);
            return [cardItem.key, count] as const;
          })
        );

        if (!isMounted) return;
        const nextCounts: Record<string, number> = {};
        pairs.forEach(([key, count]) => {
          nextCounts[key] = count;
        });
        setCardPaperCounts(nextCounts);
      } finally {
        if (isMounted) {
          setLoadingCardPaperCounts(false);
        }
      }
    };

    loadCounts();
    return () => {
      isMounted = false;
    };
  }, [activeTab, selectedExamTierCard, cardYearFilter, fetchSingleCardCount]);

  const getCardPyqCount = (cardItem: { key: string; exam: string; tier: string }) => {
    if (typeof cardPaperCounts[cardItem.key] === 'number') {
      return cardPaperCounts[cardItem.key];
    }
    return getDummyCardPyqCount(cardItem);
  };

  const handleHeaderBack = () => {
    if (activeTab === 'PYQ' && selectedExamTierCard) {
      clearExamTierSelection();
      return;
    }
    navigation.goBack();
  };

  useEffect(() => {
    if (activeTab === 'PYQ' && selectedExamTierCard) {
      if (filters.Year !== (cardYearFilter === 'All' ? 'Year' : cardYearFilter)) {
        setFilters((prev) => ({ ...prev, Year: cardYearFilter === 'All' ? 'Year' : cardYearFilter }));
        return;
      }
      fetchPyqs(true);
      return;
    }

    if (activeTab === 'PYQ' && !selectedExamTierCard) {
      setPyqList([]);
      setPyqCursor(null);
      setHasMorePyqs(false);
    }
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
      }
    } catch (error) {
      console.error('Failed to load result history via API, checking async storage', error);
      // Fallback to async storage
      const raw = await AsyncStorage.getItem(RESULT_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SubmissionResult[];
        if (Array.isArray(parsed)) setResultHistory(parsed.slice(0, 10));
      }
    } finally {
      setHasLoadedResultHistory(true);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadPausedTests = async () => {
      try {
        const raw = await AsyncStorage.getItem(PAUSED_TESTS_STORAGE_KEY);
        if (!raw) {
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
  }, []);

  useEffect(() => {
    if (!hasLoadedPausedTests) {
      return;
    }

    const persistPausedTests = async () => {
      try {
        if (Object.keys(pausedTests).length === 0) {
          await AsyncStorage.removeItem(PAUSED_TESTS_STORAGE_KEY);
          return;
        }
        await AsyncStorage.setItem(PAUSED_TESTS_STORAGE_KEY, JSON.stringify(pausedTests));
      } catch (error) {
        console.error('Failed to persist paused tests', error);
      }
    };

    persistPausedTests();
  }, [pausedTests, hasLoadedPausedTests]);

  useEffect(() => {
    if (!hasLoadedResultHistory) {
      return;
    }

    const persistResultHistory = async () => {
      try {
        if (resultHistory.length === 0) {
          await AsyncStorage.removeItem(RESULT_HISTORY_STORAGE_KEY);
          return;
        }
        await AsyncStorage.setItem(RESULT_HISTORY_STORAGE_KEY, JSON.stringify(resultHistory));
      } catch (error) {
        console.error('Failed to persist result history', error);
      }
    };

    persistResultHistory();
  }, [resultHistory, hasLoadedResultHistory]);

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
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.logoRow}>
          <Pressable onPress={handleHeaderBack} style={{ marginRight: 12 }} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={text} />
          </Pressable>
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
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#059669" />
          </Pressable>
          <Pressable style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: primary }]}>
           <View style={{ flex: 1 }}>
              <View style={styles.heroTagWrap}>
                <Ionicons name="sparkles" size={12} color="#bbf7d0" style={{ marginRight: 4 }} />
                <Text style={styles.heroTag}>First Time Here?</Text>
              </View>
              <Text style={styles.heroTitle}>MASTER PREVIOUS YEAR PAPERS.</Text>
              <Text style={styles.heroSub}>
                 Practice with authentic previous year questions from CGL, CHSL, MTS, and CPO to boost your confidence and exam readiness.
              </Text>
              <Pressable style={styles.heroBtn}>
                 <Text style={styles.heroBtnText}>Start Practicing <Ionicons name="chevron-forward" size={12} color="#166534" /></Text>
              </Pressable>
           </View>
        </View>

        {/* Custom Tab Toggle (Native Mobile Segmented Control Style) */}
        <View style={styles.tabWrapper}>
          <View style={[styles.tabContainer, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Pressable 
              style={[
                styles.tabBtn, 
                activeTab === 'RankMaker' && [styles.activeTabBtn, { backgroundColor: primary }]
              ]}
              onPress={() => setActiveTab('RankMaker')}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'RankMaker' ? '#fff' : muted }
              ]}>Rank Maker Series</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.tabBtn, 
                activeTab === 'PYQ' && [styles.activeTabBtn, { backgroundColor: primary }]
              ]}
              onPress={() => {
                setActiveTab('PYQ');
                clearExamTierSelection();
              }}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'PYQ' ? '#fff' : muted }
              ]}>PYQ</Text>
            </Pressable>
          </View>
        </View>

        {activeTab !== 'PYQ' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
            contentContainerStyle={styles.filterScrollContent}
          >
            {Object.keys(filterData).map((key) => {
              const isActive = filters[key as keyof typeof filters] !== key;
              return (
                <View key={key} style={styles.filterWrap}>
                  <Text style={[styles.filterLabel, { color: muted }]}>{key}</Text>
                  <Pressable
                    style={[
                      styles.filterPill,
                      { backgroundColor: card, borderColor: isActive ? primary : border },
                      isActive && { backgroundColor: isDark ? primary + '20' : primary + '10' }
                    ]}
                    onPress={() => {
                      if (key === 'Date') {
                        setShowDatePicker(true);
                      } else {
                        setActiveFilter(key);
                      }
                    }}
                  >
                    <Text style={[styles.filterPillText, { color: isActive ? primary : text }]}> 
                      {filters[key as keyof typeof filters] === key ? (key === 'Date' ? 'Date' : 'All') : filters[key as keyof typeof filters]}
                    </Text>
                    <Ionicons name="calendar-outline" size={14} color={isActive ? primary : muted} style={{ display: key === 'Date' ? 'flex' : 'none' }} />
                    <Ionicons name="chevron-down" size={14} color={isActive ? primary : muted} style={{ display: key !== 'Date' ? 'flex' : 'none' }} />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        )}

        {activeTab === 'RankMaker' && (
          <Text style={[styles.infoText, { color: muted }]}>Will be available from 2nd April.</Text>
        )}

        {/* Test List Section */}
        {activeTab === 'PYQ' ? (
          <>
            {!selectedExamTierCard ? (
              <>
                <Text style={[styles.sectionTitle, { color: text, marginBottom: 10 }]}>Select Exam</Text>

                <View style={styles.examTierGrid}>
                  {PYQ_EXAM_TIER_CARDS.map((cardItem) => (
                    <View
                      key={cardItem.key}
                      style={[styles.examTierGridCard, { backgroundColor: card, borderColor: border }]}
                    >
                      <View style={styles.examTierGridIcon}>
                        <Ionicons name="book-outline" size={16} color={primary} />
                      </View>
                      <Text style={[styles.examTierCardTitle, { color: text }]}>{cardItem.title}</Text>
                      <Text style={[styles.examTierCardSub, { color: muted }]}>
                        {loadingCardPaperCounts && typeof cardPaperCounts[cardItem.key] !== 'number'
                          ? 'Loading papers...'
                          : `${getCardPyqCount(cardItem)} Previous Year Papers`}
                      </Text>
                      <Pressable style={styles.viewPapersBtn} onPress={() => applyExamTierQuickFilter(cardItem)}>
                        <Text style={styles.viewPapersBtnText}>View Papers</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <View style={styles.pyqSelectedHeader}>
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
            )}

            {selectedExamTierCard && pyqList.map((paper) => (
              (() => {
                const backendTitle = String(paper?.metaData?.title || '').trim();
                const shouldUseGeneratedTitle =
                  !backendTitle || /^pyq\s*test$/i.test(backendTitle);
                const fallbackExamName =
                  selectedExamTierData?.exam
                    ? (EXAM_QUERY_MAP[selectedExamTierData.exam] || selectedExamTierData.exam)
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
                  tier: paper.tier || 'N/A',
                  questionCount: resolvedQuestionCount,
                  durationMinutes: resolvedDurationMinutes,
                  examName: paper.metaData?.examName || 'CGL',
                };
                const isDummyPaper = Boolean(paper.__dummy);
                const testKey = `PYQ:${item.id}`;
                const pausedState = pausedTests[testKey];
                return (
              <View
                key={item.id}
                style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
              >
                <View style={styles.testInfoCol}>
                  <View style={styles.testMetaTopRow}>
                    <Ionicons name="document-text-outline" size={14} color={muted} />
                    <Text style={[styles.testExamName, { color: muted }]}>{item.examName}</Text>
                  </View>
                  <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                  <Text style={[styles.testMetaDetails, { color: muted }]}>
                    {item.questionCount} Questions · {item.durationMinutes} min · Held on {item.date} ({item.shift})
                  </Text>
                  {isDummyPaper && (
                    <Text style={[styles.pausedHint, { color: '#2563eb' }]}>Demo Paper (Local)</Text>
                  )}
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
                      testPaperId: isDummyPaper ? undefined : item.id,
                    });
                  }}
                >
                  <Text style={[styles.startBtnText, { color: '#fff' }]}>{pausedState ? 'Resume Test' : 'Start'}</Text>
                </Pressable>
              </View>
                );
              })()
            ))}
            {selectedExamTierCard && pyqList.length === 0 && !loadingPyqs && (
              <View style={[styles.historyCard, { backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: border }]}>
                <View style={styles.historyIconCircle}>
                  <Ionicons name="funnel-outline" size={22} color={muted} />
                </View>
                <Text style={[styles.historyTitle, { color: text }]}>No PYQs found</Text>
                <Text style={[styles.historySub, { color: muted }]}>No papers found for selected exam/tier.</Text>
              </View>
            )}
            {selectedExamTierCard && hasMorePyqs && (
              <Pressable
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => fetchPyqs(false)}
              >
                <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                  {loadingPyqs ? 'Loading...' : 'Load More'}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {(showAllRM ? RANK_MAKER_LIST : RANK_MAKER_LIST.slice(0, 3)).map((item) => (
              (() => {
                const testKey = `RankMaker:${item.id}`;
                const pausedState = pausedTests[testKey];
                return (
              <View
                key={item.id}
                style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
              >
                <View style={styles.testInfoCol}>
                  <View style={styles.testMetaTopRow}>
                    <Ionicons name="document-text-outline" size={14} color={muted} />
                    <Text style={[styles.testExamName, { color: muted }]}>CGL</Text>
                  </View>
                  <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                  <Text style={[styles.testMetaDetails, { color: muted }]}>
                    {item.questions} · {item.duration}
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
                      mockData: { title: item.title, questions: parseInt(item.questions), duration: parseInt(item.duration) },
                      sourceTab: 'RankMaker',
                      testKey,
                    });
                  }}
                >
                  <Text style={[styles.startBtnText, { color: '#fff' }]}>{pausedState ? 'Resume Test' : 'Start'}</Text>
                </Pressable>
              </View>
                );
              })()
            ))}
            {RANK_MAKER_LIST.length > 3 && (
              <Pressable
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowAllRM(!showAllRM)}
              >
                <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                  {showAllRM ? 'View Less' : 'Load More'}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Recent history section */}
        <Text style={[styles.sectionTitle, { color: text, marginTop: 16 }]}>Recent History</Text>
        {resultHistory.length > 0 ? (
          <View style={styles.resultList}>
            {resultHistory.map((result, idx) => (
              <View key={`${result.testTitle}-${result.submittedAt}-${idx}`} style={[styles.resultCard, { backgroundColor: card, borderColor: border }]}>
                <View style={styles.resultHeaderRow}>
                  <Text style={[styles.resultTitle, { color: text }]} numberOfLines={1}>{result.testTitle}</Text>
                  <Text style={[styles.resultTab, { color: primary }]}>{result.sourceTab}</Text>
                </View>
                <Text style={[styles.resultMeta, { color: muted }]}>Submitted: {formatSubmittedAt(result.submittedAt)}</Text>
                <View style={styles.resultActionRow}>
                  <Pressable
                    style={[styles.resultActionBtn, { backgroundColor: primary }]}
                    onPress={() => navigation.navigate('TestAnalysis', { result })}
                  >
                    <Text style={styles.resultActionBtnText}>View Detailed Analysis</Text>
                  </Pressable>
                </View>
                <Text style={[styles.resultMeta, { color: muted }]}>Tap the button to view full section-wise and question-wise analysis.</Text>
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

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Sheet Modal for Filters */}
      <Modal
        visible={!!activeFilter}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveFilter(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveFilter(null)}>
          <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>Select {activeFilter}</Text>
              <Pressable onPress={() => setActiveFilter(null)} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            {activeFilter && filterData[activeFilter as keyof typeof filterData] && (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {filterData[activeFilter as keyof typeof filterData].map((item) => {
                  const isSelected = filters[activeFilter as keyof typeof filters] === item || (filters[activeFilter as keyof typeof filters] === activeFilter && item.startsWith('All'));
                  return (
                    <Pressable
                      key={item}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: border },
                        isSelected && { backgroundColor: isDark ? primary + '20' : primary + '10' }
                      ]}
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          [activeFilter]: item.startsWith('All') || item.startsWith('Any') ? activeFilter : item,
                        }));
                        setActiveFilter(null);
                      }}
                    >
                      <Text style={[styles.modalOptionText, { color: isSelected ? primary : text }]}>
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={primary} />}
                    </Pressable>
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>

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

      {/* Date Picker Modal (iOS) */}
      {showDatePicker && Platform.OS === 'ios' && DateTimePicker && (
        <Modal transparent animationType="slide">
           <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
                 <View style={styles.modalHeader}>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: 'Date' }));
                    }} hitSlop={10}>
                       <Text style={{ color: muted, fontSize: 16 }}>Clear</Text>
                    </Pressable>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: formatDate(dateObj) }));
                    }} hitSlop={10}>
                       <Text style={{ color: primary, fontSize: 16, fontWeight: '700' }}>Confirm</Text>
                    </Pressable>
                 </View>
                 <DateTimePicker
                   value={dateObj}
                   mode="date"
                   display="spinner"
                   textColor={text}
                   onChange={(e: any, d: Date | undefined) => d && setDateObj(d)}
                 />
              </View>
           </Pressable>
        </Modal>
      )}

      {/* Date Picker (Android fallback) */}
      {showDatePicker && Platform.OS === 'android' && DateTimePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={(event: any, selectedDate: Date | undefined) => {
            setShowDatePicker(false);
            if (selectedDate && event.type === 'set') {
              setDateObj(selectedDate);
              setFilters((prev) => ({ ...prev, Date: formatDate(selectedDate) }));
            }
          }}
        />
      )}

      {/* Web Fallback */}
      {showDatePicker && Platform.OS === 'web' && (
        <Modal transparent animationType="fade">
           <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
                 <View style={styles.modalHeader}>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: 'Date' }));
                    }} hitSlop={10}>
                       <Text style={{ color: muted, fontSize: 16 }}>Clear</Text>
                    </Pressable>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: text }}>Select Date</Text>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: formatDate(dateObj) }));
                    }} hitSlop={10}>
                       <Text style={{ color: primary, fontSize: 16, fontWeight: '700' }}>Confirm</Text>
                    </Pressable>
                 </View>
                 {createElement('input', {
                    type: 'date',
                    style: {
                       padding: '16px',
                       borderRadius: '8px',
                       border: `1px solid ${border}`,
                       outline: 'none',
                       fontSize: '16px',
                       color: text,
                       backgroundColor: bg,
                       width: '100%',
                    },
                    value: dateObj.toISOString().split('T')[0],
                    onChange: (e: any) => {
                       const d = new Date(e.target.value);
                       if (!isNaN(d.getTime())) setDateObj(d);
                    }
                 })}
                 <View style={{ height: 32 }} />
              </View>
           </Pressable>
        </Modal>
      )}
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

  heroCard: {
     borderRadius: 20,
     padding: 20,
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 20,
  },
  heroTagWrap: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 8,
     paddingVertical: 4,
     backgroundColor: 'rgba(255,255,255,0.15)',
     alignSelf: 'flex-start',
     borderRadius: 999,
     marginBottom: 10,
  },
  heroTag: { fontSize: 10, fontWeight: '700', color: '#bbf7d0' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 8, textTransform: 'uppercase' },
  heroSub: { fontSize: 13, color: '#dcfce7', marginBottom: 14, lineHeight: 18 },
  heroBtn: {
     borderRadius: 999,
     backgroundColor: '#ffffff',
     paddingVertical: 10,
     paddingHorizontal: 16,
     alignSelf: 'flex-start',
     flexDirection: 'row',
     alignItems: 'center',
  },
  heroBtnText: { fontSize: 13, fontWeight: '800', color: '#166534' },

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
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
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
    borderRadius: 8,
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
  examTierGridCard: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
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
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,150,105,0.12)',
    marginBottom: 8,
  },
  pyqSelectedHeader: {
    marginBottom: 10,
    gap: 8,
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
    fontWeight: '600',
    marginBottom: 10,
  },
  resultList: {
    gap: 10,
    marginTop: 4,
  },
  resultCard: {
    borderRadius: 14,
    borderWidth: 1,
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
    fontSize: 11,
    fontWeight: '800',
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

