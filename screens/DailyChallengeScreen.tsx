import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pyqApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { buildUserStorageScope, withUserScope } from '../utils/storageScope';

type SubjectKey = 'MATHS' | 'ENGLISH' | 'REASONING' | 'GENERAL AWARENESS';
type Language = 'EN' | 'HI';
type Mode = 'challenge' | 'quiz';

type QuestionItem = {
  id: string;
  subject: SubjectKey;
  questionText: string;
  questionTextHi?: string;
  options: string[];
  optionsHi?: string[];
  correctOptionIndex: number;
};

type ModeConfig = {
  title: string;
  subtitle: string;
  totalQuestions: number;
  durationSeconds: number;
  perSubject: Record<SubjectKey, number>;
};

const SUBJECTS: SubjectKey[] = ['MATHS', 'ENGLISH', 'REASONING', 'GENERAL AWARENESS'];

const MODE_CONFIGS: Record<Mode, ModeConfig> = {
  challenge: {
    title: 'Daily Challenge',
    subtitle: 'CGL Tier 1 practice',
    totalQuestions: 20,
    durationSeconds: 30 * 60,
    perSubject: {
      MATHS: 5,
      ENGLISH: 5,
      REASONING: 5,
      'GENERAL AWARENESS': 5,
    },
  },
  quiz: {
    title: 'Daily Quiz',
    subtitle: 'Quick CGL mixed quiz',
    totalQuestions: 10,
    durationSeconds: 15 * 60,
    perSubject: {
      MATHS: 3,
      ENGLISH: 2,
      REASONING: 3,
      'GENERAL AWARENESS': 2,
    },
  },
};

const DAILY_EXAM_LATEST_STORAGE_KEY = 'daily_exam_latest_v1';
const DAILY_EXAM_HISTORY_STORAGE_KEY = 'daily_exam_history_v1';
const DAILY_EXAM_QUESTION_CACHE_STORAGE_KEY = 'daily_exam_question_cache_v1';

type DailyExamResultEntry = {
  mode: Mode;
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

const persistDailyExamResult = async (
  entry: DailyExamResultEntry,
  latestStorageKey: string,
  historyStorageKey: string
) => {
  try {
    const [latestRaw, historyRaw] = await Promise.all([
      AsyncStorage.getItem(latestStorageKey),
      AsyncStorage.getItem(historyStorageKey),
    ]);

    const latest = latestRaw ? JSON.parse(latestRaw) : {};
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    const nextLatest = {
      ...(latest && typeof latest === 'object' ? latest : {}),
      [entry.mode]: entry,
    };

    const historyList = Array.isArray(history) ? history : [];
    const nextHistory = [entry, ...historyList].slice(0, 100);

    await Promise.all([
      AsyncStorage.setItem(latestStorageKey, JSON.stringify(nextLatest)),
      AsyncStorage.setItem(historyStorageKey, JSON.stringify(nextHistory)),
    ]);
  } catch (error) {
    console.error('Failed to persist daily exam result', error);
  }
};

const entityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const sanitize = (value: any) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => entityMap[m] || m)
    .replace(/\s+/g, ' ')
    .trim();

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

const stableShuffle = <T,>(items: T[], seed: number) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const extractPapers = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.testPapers)) return res.testPapers;
  if (Array.isArray(res.papers)) return res.papers;
  return [];
};

const extractQuestionsFromStartResponse = (res: any): any[] => {
  if (!res) return [];
  if (Array.isArray(res.questions)) return res.questions;
  if (Array.isArray(res.data?.questions)) return res.data.questions;
  if (Array.isArray(res.paper?.questions)) return res.paper.questions;
  if (Array.isArray(res.data?.paper?.questions)) return res.data.paper.questions;
  if (Array.isArray(res.questionPaper?.questions)) return res.questionPaper.questions;
  if (Array.isArray(res.data?.questionPaper?.questions)) return res.data.questionPaper.questions;
  return [];
};

const resolveSubject = (raw: any, index: number): SubjectKey => {
  const token = String(raw?.section || raw?.subject || raw?.questionData?.section || raw?.questionData?.subject || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  if (token.includes('parta') || token.includes('quant') || token.includes('math') || token.includes('aptitude')) return 'MATHS';
  if (token.includes('partb') || token.includes('english')) return 'ENGLISH';
  if (token.includes('partc') || token.includes('reasoning') || token.includes('intelligence')) return 'REASONING';
  if (token.includes('partd') || token.includes('awareness') || token.includes('gk') || token.includes('general')) return 'GENERAL AWARENESS';
  return SUBJECTS[index % SUBJECTS.length];
};

const extractOptionText = (option: any) => {
  if (typeof option === 'string') return sanitize(option);
  if (option && typeof option === 'object') return sanitize(option.text || option.optionText || option.content || option.label || option.value || '');
  return '';
};

const mapQuestions = (rawQuestions: any[]): QuestionItem[] => {
  return rawQuestions
    .map((q, i) => {
      const optionsRaw = Array.isArray(q?.options)
        ? q.options
        : Array.isArray(q?.questionData?.options)
        ? q.questionData.options
        : Array.isArray(q?.questionData?.content?.options)
        ? q.questionData.content.options
        : Array.isArray(q?.optionList)
        ? q.optionList
        : [];

      const options = optionsRaw.map(extractOptionText).filter(Boolean);
      if (options.length < 2) return null;

      const correctOptionIndex = Number.isInteger(q?.correctOptionIndex)
        ? q.correctOptionIndex
        : Number.isInteger(q?.answerIndex)
        ? q.answerIndex
        : Number.isInteger(q?.correctOption)
        ? q.correctOption
        : -1;

      return {
        id: String(q?._id || q?.id || q?.questionId || i + 1),
        subject: resolveSubject(q, i),
        questionText: sanitize(q?.questionText || q?.questionData?.text || q?.questionData?.content?.text || q?.content || `Question ${i + 1}`),
        questionTextHi: sanitize(q?.questionData?.hindiText || q?.hindiText || ''),
        options,
        optionsHi: Array.isArray(q?.questionData?.hindiOptions) ? q.questionData.hindiOptions.map(extractOptionText).filter(Boolean) : undefined,
        correctOptionIndex,
      } as QuestionItem;
    })
    .filter((q): q is QuestionItem => Boolean(q));
};

const pickByMode = (pool: QuestionItem[], mode: Mode): QuestionItem[] => {
  const config = MODE_CONFIGS[mode];
  const grouped: Record<SubjectKey, QuestionItem[]> = {
    MATHS: [],
    ENGLISH: [],
    REASONING: [],
    'GENERAL AWARENESS': [],
  };

  pool.forEach((q) => grouped[q.subject].push(q));

  const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
  const picked: QuestionItem[] = [];

  SUBJECTS.forEach((subject, idx) => {
    const need = config.perSubject[subject];
    picked.push(...stableShuffle(grouped[subject], seed + idx * 101).slice(0, need));
  });

  if (picked.length < config.totalQuestions) {
    const exists = new Set(picked.map((q) => q.id));
    const extras = stableShuffle(pool.filter((q) => !exists.has(q.id)), seed + 991);
    picked.push(...extras.slice(0, config.totalQuestions - picked.length));
  }

  // Keep subject blocks ordered to match exam-style section flow.
  const finalSet = picked.slice(0, config.totalQuestions);
  return SUBJECTS.flatMap((subject) => finalSet.filter((q) => q.subject === subject));
};

const buildFallback = (mode: Mode): QuestionItem[] => {
  const count = MODE_CONFIGS[mode].totalQuestions;
  return Array.from({ length: count }, (_, idx) => ({
    id: `fallback-${idx + 1}`,
    subject: SUBJECTS[idx % SUBJECTS.length],
    questionText: `Question ${idx + 1}: Fallback question loaded because backend data was unavailable for this session.`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctOptionIndex: idx % 4,
  }));
};

const withTimeout = async <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
};

const hydrateSession = (
  list: QuestionItem[],
  setQuestions: (q: QuestionItem[]) => void,
  setCurrentIndex: (idx: number) => void,
  setSelectedSubject: (subject: SubjectKey) => void,
  setVisited: (v: Record<number, boolean>) => void,
  setSelectedOptions: (v: Record<number, number>) => void,
  setReviewed: (v: Record<number, boolean>) => void,
  setTimeLeft: (v: number) => void,
  durationSeconds: number,
  mode: Mode
) => {
  const seedSet = list.length > 0 ? list : buildFallback(mode);
  setQuestions(seedSet);
  setCurrentIndex(0);
  setSelectedSubject(seedSet[0]?.subject || 'MATHS');
  setVisited({ 0: true });
  setSelectedOptions({});
  setReviewed({});
  setTimeLeft(durationSeconds);
};

export default function DailyChallengeScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const { userName, userEmail } = useLoginModal();

  const mode: Mode = route.params?.mode === 'quiz' ? 'quiz' : 'challenge';
  const config = MODE_CONFIGS[mode];

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<SubjectKey>('MATHS');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [reviewed, setReviewed] = useState<Record<number, boolean>>({});
  const [visited, setVisited] = useState<Record<number, boolean>>({});
  const [language, setLanguage] = useState<Language>('EN');
  const [timeLeft, setTimeLeft] = useState(config.durationSeconds);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);

  const isDesktop = width >= 1000;
  const isMobile = width < 760;

  const bg = isDark ? '#0b1220' : '#f6f8fb';
  const card = isDark ? '#111a2b' : '#ffffff';
  const border = isDark ? '#223049' : '#e5e7eb';
  const text = isDark ? '#e5e7eb' : '#0f172a';
  const muted = isDark ? '#8ea0ba' : '#64748b';
  const primary = '#059669';
  const storageScope = buildUserStorageScope(userEmail, userName);
  const dailyExamLatestStorageKey = withUserScope(DAILY_EXAM_LATEST_STORAGE_KEY, storageScope);
  const dailyExamHistoryStorageKey = withUserScope(DAILY_EXAM_HISTORY_STORAGE_KEY, storageScope);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const todayKey = new Date().toISOString().slice(0, 10);
        const cacheKey = `${mode}_${todayKey}`;

        // Instant open path: reuse same-day cached set if present.
        try {
          const cachedRaw = await AsyncStorage.getItem(DAILY_EXAM_QUESTION_CACHE_STORAGE_KEY);
          const cachedObj = cachedRaw ? JSON.parse(cachedRaw) : {};
          const cachedList = Array.isArray(cachedObj?.[cacheKey]) ? cachedObj[cacheKey] : [];

          if (cachedList.length > 0) {
            const validated = mapQuestions(cachedList);
            if (validated.length > 0) {
              if (!isMounted) return;
              hydrateSession(
                validated,
                setQuestions,
                setCurrentIndex,
                setSelectedSubject,
                setVisited,
                setSelectedOptions,
                setReviewed,
                setTimeLeft,
                config.durationSeconds,
                mode
              );
              setLoading(false);
              return;
            }
          }
        } catch {
          // Continue with API flow if cache read/parsing fails.
        }

        const querySet = [
          { examName: 'SSC CGL', tier: 'Tier1', limit: 60 },
          { examName: 'SSC CGL', tier: 'Tier 1', limit: 60 },
          { examName: 'CGL', tier: 'Tier1', limit: 60 },
          { examName: 'SSC CGL', limit: 100 },
          { limit: 120 },
        ];

        const merged: any[] = [];
        const seen = new Set<string>();

        const listResponses = await Promise.allSettled(
          querySet.map((query) => pyqApi.listTestPapers(query as any))
        );

        listResponses.forEach((res) => {
          if (res.status !== 'fulfilled') return;
          extractPapers(res.value).forEach((paper) => {
            const id = String(paper?._id || paper?.id || '');
            if (!id || seen.has(id)) return;
            seen.add(id);
            merged.push(paper);
          });
        });

        const filtered = merged.filter((paper) => {
          const exam = String(paper?.metaData?.examName || paper?.examName || '').toLowerCase();
          const tier = String(paper?.tier || paper?.metaData?.tier || '').toLowerCase().replace(/\s+/g, '');
          const isCgl = exam.includes('cgl') || /cgl/i.test(String(paper?.metaData?.title || ''));
          const isTier1 = tier.includes('tier1') || tier === '';
          return isCgl && isTier1;
        });

        if (filtered.length === 0) {
          throw new Error('No CGL papers found');
        }

        const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
        const candidates = stableShuffle(filtered, seed).slice(0, 12);

        let mappedPool: QuestionItem[] = [];
        const seenQuestionIds = new Set<string>();

        const hasEnoughBySubject = () => {
          const counts: Record<SubjectKey, number> = {
            MATHS: 0,
            ENGLISH: 0,
            REASONING: 0,
            'GENERAL AWARENESS': 0,
          };
          mappedPool.forEach((q) => {
            counts[q.subject] += 1;
          });
          return SUBJECTS.every((subject) => counts[subject] >= config.perSubject[subject]);
        };

        const candidateWaves = [candidates.slice(0, 6), candidates.slice(6, 12)].filter((w) => w.length > 0);

        for (const wave of candidateWaves) {
          const waveResults = await Promise.allSettled(
            wave.map(async (paper) => {
              const paperId = String(paper?._id || paper?.id || '');
              if (!paperId) return [] as QuestionItem[];

              try {
                try {
                  await pyqApi.initPyq(paperId);
                } catch {
                  // Continue and try start.
                }

                const startRes = await withTimeout(pyqApi.startPyq(paperId), 3500, null as any);
                const raw = extractQuestionsFromStartResponse(startRes);
                return Array.isArray(raw) && raw.length > 0 ? mapQuestions(raw) : [];
              } catch {
                return [] as QuestionItem[];
              }
            })
          );

          waveResults.forEach((result) => {
            if (result.status !== 'fulfilled') return;
            result.value.forEach((q) => {
              if (seenQuestionIds.has(q.id)) return;
              seenQuestionIds.add(q.id);
              mappedPool.push(q);
            });
          });

          if (mappedPool.length >= config.totalQuestions && hasEnoughBySubject()) {
            break;
          }
        }

        const apiPicked = mappedPool.length > 0 ? pickByMode(mappedPool, mode) : [];
        const picked = apiPicked.length > 0 ? apiPicked : buildFallback(mode);

        if (apiPicked.length > 0) {
          try {
            const cachedRaw = await AsyncStorage.getItem(DAILY_EXAM_QUESTION_CACHE_STORAGE_KEY);
            const cachedObj = cachedRaw ? JSON.parse(cachedRaw) : {};
            const nextCache = {
              ...(cachedObj && typeof cachedObj === 'object' ? cachedObj : {}),
              [cacheKey]: apiPicked,
            };
            await AsyncStorage.setItem(DAILY_EXAM_QUESTION_CACHE_STORAGE_KEY, JSON.stringify(nextCache));
          } catch {
            // Cache write failure should not block user.
          }
        }

        if (!isMounted) return;
        hydrateSession(
          picked,
          setQuestions,
          setCurrentIndex,
          setSelectedSubject,
          setVisited,
          setSelectedOptions,
          setReviewed,
          setTimeLeft,
          config.durationSeconds,
          mode
        );
      } catch (error) {
        console.error('Daily set fetch failed:', error);
        if (!isMounted) return;
        hydrateSession(
          buildFallback(mode),
          setQuestions,
          setCurrentIndex,
          setSelectedSubject,
          setVisited,
          setSelectedOptions,
          setReviewed,
          setTimeLeft,
          config.durationSeconds,
          mode
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [mode, config.durationSeconds]);

  useEffect(() => {
    if (loading || submitting) return;

    if (timeLeft <= 0) {
      void handleFinalizeSubmission(computeResultSummary());
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, navigation, submitting, timeLeft]);

  const currentQuestion = questions[currentIndex];

  const indicesBySubject = useMemo(() => {
    const map: Record<SubjectKey, number[]> = {
      MATHS: [],
      ENGLISH: [],
      REASONING: [],
      'GENERAL AWARENESS': [],
    };

    questions.forEach((q, idx) => {
      map[q.subject].push(idx);
    });
    return map;
  }, [questions]);

  const sectionIndices = indicesBySubject[selectedSubject] || [];
  const sectionPositionMap = useMemo(() => {
    const map: Record<number, number> = {};
    sectionIndices.forEach((idx, pos) => {
      map[idx] = pos + 1;
    });
    return map;
  }, [sectionIndices]);

  const setCurrentQuestionIndex = (index: number) => {
    setCurrentIndex(index);
    setVisited((prev) => ({ ...prev, [index]: true }));
    const subject = questions[index]?.subject;
    if (subject) {
      setSelectedSubject(subject);
    }
  };

  const handleSaveAndNext = () => {
    const currentSection = indicesBySubject[selectedSubject] || [];
    const currentPos = currentSection.indexOf(currentIndex);

    if (currentPos >= 0 && currentPos < currentSection.length - 1) {
      setCurrentQuestionIndex(currentSection[currentPos + 1]);
      return;
    }

    const currentSubjectIdx = SUBJECTS.indexOf(selectedSubject);
    for (let s = currentSubjectIdx + 1; s < SUBJECTS.length; s += 1) {
      const nextSection = indicesBySubject[SUBJECTS[s]] || [];
      if (nextSection.length > 0) {
        setCurrentQuestionIndex(nextSection[0]);
        return;
      }
    }
  };

  const handleMarkReviewAndNext = () => {
    setReviewed((prev) => ({ ...prev, [currentIndex]: true }));
    handleSaveAndNext();
  };

  const computeResultSummary = () => {
    const attempted = Object.keys(selectedOptions).length;
    const correct = questions.reduce((sum, q, idx) => {
      const chosen = selectedOptions[idx];
      if (chosen === undefined || q.correctOptionIndex < 0) return sum;
      return chosen === q.correctOptionIndex ? sum + 1 : sum;
    }, 0);
    const wrong = attempted - correct;
    const unattempted = Math.max(0, questions.length - attempted);
    const score = correct * 2 - wrong * 0.5;
    const timeTaken = Math.max(0, config.durationSeconds - timeLeft);

    return {
      attempted,
      correct,
      wrong,
      unattempted,
      score,
      timeTaken,
    };
  };

  const handleSubmit = () => {
    if (submitting) return;
    setIsSubmitConfirmVisible(true);
  };

  const handleFinalizeSubmission = async (
    summary: ReturnType<typeof computeResultSummary> = computeResultSummary()
  ) => {
    if (submitting) return;

    setIsSubmitConfirmVisible(false);
    setSubmitting(true);

    const payload: DailyExamResultEntry = {
      mode,
      title: config.title,
      totalQuestions: questions.length,
      attempted: summary.attempted,
      correct: summary.correct,
      wrong: summary.wrong,
      unattempted: summary.unattempted,
      score: summary.score,
      timeTaken: summary.timeTaken,
      completedAt: new Date().toISOString(),
    };

    await persistDailyExamResult(payload, dailyExamLatestStorageKey, dailyExamHistoryStorageKey);
    navigation.goBack();
  };

  const handleConfirmSubmit = () => {
    void handleFinalizeSubmission();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(Math.max(0, seconds) / 60);
    const secs = Math.max(0, seconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const statusForIndex = (idx: number) => {
    if (selectedOptions[idx] !== undefined && reviewed[idx]) return 'answered-review';
    if (selectedOptions[idx] !== undefined) return 'answered';
    if (reviewed[idx]) return 'review';
    if (visited[idx]) return 'unanswered';
    return 'unvisited';
  };

  const statusColor = (status: string) => {
    if (status === 'answered') return '#16a34a';
    if (status === 'review') return '#6366f1';
    if (status === 'answered-review') return '#a855f7';
    if (status === 'unanswered') return '#f43f5e';
    return isDark ? '#334155' : '#e2e8f0';
  };

  const answeredCount = Object.keys(selectedOptions).length;

  if (loading || !currentQuestion) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: bg, paddingTop: insets.top }]}> 
        <ActivityIndicator size="large" color={primary} />
        <Text style={[styles.loaderText, { color: muted }]}>Loading {mode === 'challenge' ? 'Daily Challenge' : 'Daily Quiz'}...</Text>
      </View>
    );
  }

  const displayQuestion = language === 'HI' && currentQuestion.questionTextHi ? currentQuestion.questionTextHi : currentQuestion.questionText;
  const displayOptions =
    language === 'HI' && currentQuestion.optionsHi?.length === currentQuestion.options.length
      ? currentQuestion.optionsHi
      : currentQuestion.options;

  return (
    <View style={[styles.wrapper, { backgroundColor: bg, paddingTop: insets.top }]}> 
      <View style={[styles.topBar, { backgroundColor: card, borderBottomColor: border }]}> 
        <View style={styles.topBarMainRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={18} color={text} />
          </Pressable>

          <View style={styles.topTitleWrap}>
            <Text numberOfLines={1} style={[styles.topTitle, { color: text }]}>{config.title}</Text>
            <Text numberOfLines={1} style={[styles.topSubtitle, { color: muted }]}>{config.subtitle}</Text>
          </View>

          <View style={styles.topRightWrap}>
            <View style={styles.langWrap}>
              <Pressable style={[styles.langBtn, language === 'EN' && styles.langBtnActive]} onPress={() => setLanguage('EN')}>
                <Text style={[styles.langText, { color: language === 'EN' ? '#0f172a' : muted }]}>EN</Text>
              </Pressable>
              <Pressable style={[styles.langBtn, language === 'HI' && styles.langBtnActive]} onPress={() => setLanguage('HI')}>
                <Text style={[styles.langText, { color: language === 'HI' ? '#0f172a' : muted }]}>HI</Text>
              </Pressable>
            </View>

            <View style={[styles.timerChip, { borderColor: border }]}>
              <Ionicons name="time-outline" size={14} color={muted} />
              <Text style={[styles.timerText, { color: text }]}>{formatTimer(timeLeft)}</Text>
            </View>

            <Pressable style={styles.submitBtn} onPress={handleSubmit}>
              <Ionicons name="paper-plane" size={13} color="#ffffff" />
              <Text style={styles.submitBtnText}>SUBMIT</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectTabsWrap}>
          {SUBJECTS.map((subject) => {
            const active = subject === selectedSubject;
            return (
              <Pressable
                key={subject}
                style={styles.subjectTab}
                onPress={() => {
                  setSelectedSubject(subject);
                  const first = indicesBySubject[subject]?.[0];
                  if (Number.isInteger(first)) setCurrentQuestionIndex(first);
                }}
              >
                <Text style={[styles.subjectTabText, { color: active ? primary : muted }]}>{subject}</Text>
                {active && <View style={[styles.activeTabLine, { backgroundColor: primary }]} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={[styles.questionMetaRow, { borderBottomColor: border }]}>
        <Text style={[styles.questionMetaText, { color: muted }]}>QUESTION</Text>
        <Text style={[styles.questionMetaNumber, { color: text }]}>{currentIndex + 1}</Text>
        <Text style={[styles.questionMetaText, { color: muted }]}>of {questions.length}</Text>
      </View>

      <View style={[styles.contentRow, !isDesktop && styles.contentCol]}>
        <ScrollView style={styles.mainPane} contentContainerStyle={styles.mainPaneContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTag, { color: primary }]}>SECTION {selectedSubject}</Text>
          <Text
            style={[
              styles.questionText,
              {
                color: text,
                fontSize: isMobile ? 22 : 30,
                lineHeight: isMobile ? 32 : 40,
              },
            ]}
          >
            {displayQuestion}
          </Text>

          <View style={styles.optionsWrap}>
            {displayOptions.map((option, optionIndex) => {
              const selected = selectedOptions[currentIndex] === optionIndex;
              return (
                <Pressable
                  key={`${currentQuestion.id}-${optionIndex}`}
                  style={[
                    styles.optionCard,
                    { borderColor: selected ? primary : border, backgroundColor: card },
                    selected && styles.optionCardActive,
                  ]}
                  onPress={() => {
                    setSelectedOptions((prev) => ({ ...prev, [currentIndex]: optionIndex }));
                    setVisited((prev) => ({ ...prev, [currentIndex]: true }));
                  }}
                >
                  <View style={[styles.optionIndex, { borderColor: border }]}>
                    <Text style={[styles.optionIndexText, { color: muted }]}>{String.fromCharCode(65 + optionIndex)}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: text, fontSize: isMobile ? 15 : 18, lineHeight: isMobile ? 22 : 26 }]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={[styles.palettePane, { borderLeftColor: border, backgroundColor: card }, !isDesktop && styles.palettePaneMobile]}>
          <View style={styles.paletteHeadRow}>
            <Text style={[styles.paletteTitle, { color: text }]}>SECTION PALETTE</Text>
            <Text style={[styles.paletteCount, { color: muted }]}>{sectionIndices.length}/{questions.length}</Text>
          </View>
          <Text style={[styles.paletteSubject, { color: primary }]}>{selectedSubject}</Text>

          <View style={styles.paletteGrid}>
            {sectionIndices.map((idx) => {
              const current = idx === currentIndex;
              const status = statusForIndex(idx);
              return (
                <Pressable
                  key={`pal-${idx}`}
                  style={[
                    styles.paletteCell,
                    { backgroundColor: statusColor(status), borderColor: current ? '#0ea5e9' : 'transparent' },
                    current && styles.paletteCellCurrent,
                  ]}
                  onPress={() => setCurrentQuestionIndex(idx)}
                >
                  <Text style={[styles.paletteCellText, { color: status === 'unvisited' ? muted : '#ffffff' }]}>{sectionPositionMap[idx] || idx + 1}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendWrap}>
            <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} /><Text style={[styles.legendText, { color: muted }]}>Answered</Text></View>
            <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#f43f5e' }]} /><Text style={[styles.legendText, { color: muted }]}>Unanswered</Text></View>
            <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: '#6366f1' }]} /><Text style={[styles.legendText, { color: muted }]}>Reviewed</Text></View>
            <View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} /><Text style={[styles.legendText, { color: muted }]}>Unvisited</Text></View>
          </View>
        </View>
      </View>

      <View style={[styles.bottomDock, isMobile && styles.bottomDockMobile, { borderTopColor: border, backgroundColor: card, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable style={[styles.bottomBtn, styles.reviewBtn, isMobile && styles.bottomBtnMobile]} onPress={handleMarkReviewAndNext}>
          <Text style={styles.bottomBtnText}>MARK FOR REVIEW & NEXT</Text>
        </Pressable>

        <View style={[styles.bottomRightDock, isMobile && styles.bottomRightDockMobile]}>
          <Text style={[styles.bottomHint, { color: muted }]}>Answered {answeredCount}/{questions.length}</Text>
          <Pressable
            style={[styles.bottomBtn, styles.nextBtn, isMobile && styles.bottomBtnMobile, currentIndex === questions.length - 1 && styles.bottomBtnDisabled]}
            disabled={currentIndex === questions.length - 1}
            onPress={handleSaveAndNext}
          >
            <Text style={styles.bottomBtnText}>SAVE & NEXT</Text>
            <Ionicons name="arrow-forward" size={14} color="#ffffff" />
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={isSubmitConfirmVisible}
        onRequestClose={() => setIsSubmitConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.modalTitle, { color: text }]}>Submit {config.title}?</Text>
            <Text style={[styles.modalSub, { color: muted }]}>You can review answers before final submission.</Text>
            <View style={styles.modalActionsRow}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setIsSubmitConfirmVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalSubmitBtn]} onPress={handleConfirmSubmit}>
                <Text style={styles.modalSubmitText}>Yes, Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loaderText: { fontSize: 13, fontWeight: '600' },

  topBar: {
    borderBottomWidth: 1,
    minHeight: 80,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  topBarMainRow: { flexDirection: 'row', alignItems: 'center' },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  topTitleWrap: { flex: 1, minWidth: 0 },
  topTitle: { fontSize: 14, fontWeight: '800' },
  topSubtitle: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  topRightWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  langWrap: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  langBtn: { paddingVertical: 5, paddingHorizontal: 7 },
  langBtnActive: { backgroundColor: '#ffffff' },
  langText: { fontSize: 10, fontWeight: '800' },

  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  timerText: { fontSize: 12, fontWeight: '700' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  submitBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  subjectTabsWrap: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 2,
    paddingRight: 10,
  },
  subjectTab: { marginRight: 18, paddingVertical: 8 },
  subjectTabText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6 },
  activeTabLine: { marginTop: 6, height: 2, borderRadius: 2 },

  questionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  questionMetaText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  questionMetaNumber: { fontSize: 16, fontWeight: '900' },

  contentRow: { flex: 1, flexDirection: 'row' },
  contentCol: { flexDirection: 'column' },

  mainPane: { flex: 1 },
  mainPaneContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 30 },
  sectionTag: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  questionText: { fontWeight: '700', marginBottom: 18, maxWidth: 860 },

  optionsWrap: { maxWidth: 860 },
  optionCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionCardActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  optionIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIndexText: { fontSize: 11, fontWeight: '800' },
  optionText: { flex: 1, fontWeight: '600' },

  palettePane: {
    width: 220,
    borderLeftWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 14,
  },
  palettePaneMobile: {
    width: '100%',
    borderLeftWidth: 0,
    borderTopWidth: 1,
    minHeight: 120,
  },
  paletteHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paletteTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  paletteCount: { fontSize: 11, fontWeight: '700' },
  paletteSubject: { fontSize: 10, fontWeight: '900', marginTop: 4, marginBottom: 10, letterSpacing: 0.4 },

  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteCell: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  paletteCellCurrent: { borderWidth: 2 },
  paletteCellText: { fontSize: 12, fontWeight: '800' },

  legendWrap: { marginTop: 16, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600' },

  bottomDock: {
    borderTopWidth: 1,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  bottomDockMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 6,
  },
  bottomBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewBtn: { backgroundColor: '#6366f1' },
  nextBtn: { backgroundColor: '#059669' },
  bottomBtnDisabled: { opacity: 0.45 },
  bottomBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  bottomRightDock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bottomRightDockMobile: { justifyContent: 'space-between' },
  bottomBtnMobile: { justifyContent: 'center' },
  bottomHint: { fontSize: 11, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  modalSub: { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  modalActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalBtn: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 },
  modalCancelBtn: { backgroundColor: '#e2e8f0' },
  modalSubmitBtn: { backgroundColor: '#059669' },
  modalCancelText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  modalSubmitText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
});
