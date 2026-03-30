import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { mockApi, pyqApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';

type MarkingScheme = {
  correctMark: number;
  wrongMark: number | string;
};

type SectionItem = {
  section: string;
  correct: number;
  wrong: number;
  attempted: number;
  score: number;
};

type SubmissionResult = {
  sourceTab: 'PYQ' | 'RankMaker';
  testKey?: string;
  attemptId?: string;
  testPaperId?: string;
  testTitle: string;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  totalQuestions?: number;
  durationSeconds?: number;
  examName?: string;
  tier?: string;
  shift?: string;
  date?: string;
  submittedAt: string;
  markingScheme?: MarkingScheme;
  sectionBreakup?: SectionItem[];
};

type ReviewQuestion = {
  id: string;
  number: number;
  section: string;
  questionText: string;
  options: string[];
  selectedOptionIndex: number;
  correctOptionIndex: number;
  solutionText: string;
};

const htmlEntityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

const decodeText = (value: any) => {
  const raw = String(value ?? '');
  const withoutTags = raw.replace(/<[^>]+>/g, ' ');
  return withoutTags
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (token) => htmlEntityMap[token] || token)
    .replace(/\s+/g, ' ')
    .trim();
};

const normalizeTitleMeta = (result: SubmissionResult) => {
  const title = String(result.testTitle || 'Test Analysis');
  const normalized = title.toLowerCase();
  const tierMatch = normalized.match(/tier\s*([12])/);
  const tier = result.tier || (tierMatch?.[1] ? `Tier ${tierMatch[1]}` : 'Tier 1');

  let exam = result.examName || title;
  if (/cgl/.test(normalized)) exam = 'SSC CGL';
  else if (/chsl/.test(normalized)) exam = 'SSC CHSL';
  else if (/mts/.test(normalized)) exam = 'SSC MTS';
  else if (/cpo/.test(normalized)) exam = 'SSC CPO';

  return { exam, tier };
};

const fallbackMarking = (result: SubmissionResult): MarkingScheme => {
  if (result.markingScheme && Number.isFinite(result.markingScheme.correctMark) && Number.isFinite(result.markingScheme.wrongMark)) {
    return result.markingScheme;
  }

  const t = String(result.testTitle || '').toLowerCase();
  const isTier2 = /tier\s*2/.test(t);

  if (/mts/.test(t)) return { correctMark: 3, wrongMark: '0 (S1), 1 (S2)' };
  if (/cpo/.test(t)) return { correctMark: 1, wrongMark: 0.25 };
  if (/cgl/.test(t) && isTier2) return { correctMark: 3, wrongMark: 1 };
  if (/chsl/.test(t) && isTier2) return { correctMark: 2, wrongMark: 0.5 };
  if (/cgl|chsl/.test(t)) return { correctMark: 2, wrongMark: 0.5 };

  return { correctMark: 2, wrongMark: 0.5 };
};

const extractPayload = (res: any) => {
  if (!res) return null;
  if (res.data && typeof res.data === 'object') return res.data;
  return res;
};

const extractQuestions = (analysisPayload: any, resultPayload: any): ReviewQuestion[] => {
  const sourceArrays: any[] = [
    analysisPayload?.questions,
    analysisPayload?.questionAnalysis,
    analysisPayload?.items,
    analysisPayload?.data?.questions,
    resultPayload?.questions,
    resultPayload?.data?.questions,
  ];

  const firstArray = sourceArrays.find((arr) => Array.isArray(arr));
  if (!Array.isArray(firstArray) || firstArray.length === 0) {
    return [];
  }

  return firstArray.map((q: any, index: number) => {
    const rawOptions = Array.isArray(q?.options)
      ? q.options
      : Array.isArray(q?.questionData?.options)
      ? q.questionData.options
      : [];

    const options = rawOptions.map((opt: any) => {
      if (typeof opt === 'string') return decodeText(opt);
      return decodeText(opt?.text || opt?.optionText || opt?.content || opt?.label || '');
    });

    const selectedByIndex = Number.isInteger(q?.selectedOptionIndex)
      ? q.selectedOptionIndex
      : Number.isInteger(q?.userAnswerIndex)
      ? q.userAnswerIndex
      : -1;

    const correctByIndex = Number.isInteger(q?.correctOptionIndex)
      ? q.correctOptionIndex
      : Number.isInteger(q?.answerIndex)
      ? q.answerIndex
      : Number.isInteger(q?.correctOption)
      ? q.correctOption
      : -1;

    return {
      id: String(q?._id || q?.id || q?.questionId || index + 1),
      number: Number(q?.number || q?.questionNumber || index + 1),
      section: String(q?.section || q?.subject || 'General'),
      questionText: decodeText(q?.questionText || q?.questionData?.text || q?.content || `Question ${index + 1}`),
      options,
      selectedOptionIndex: selectedByIndex,
      correctOptionIndex: correctByIndex,
      solutionText: decodeText(q?.solution || q?.explanation || q?.answerExplanation || ''),
    } as ReviewQuestion;
  });
};

const buildDummyQuestions = (result: SubmissionResult): ReviewQuestion[] => {
  const total = Math.max(3, Math.min(8, Number(result.totalQuestions || 4)));
  return Array.from({ length: total }, (_, idx) => ({
    id: `dummy-${idx + 1}`,
    number: idx + 1,
    section: 'General',
    questionText: `Question ${idx + 1}: Solution data is not available from backend for this attempt.`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    selectedOptionIndex: idx % 4,
    correctOptionIndex: (idx + 1) % 4,
    solutionText: 'Dummy fallback solution: backend did not provide detailed explanation for this question.',
  }));
};

export default function TestAnalysisScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();

  const result = (route.params?.result || null) as SubmissionResult | null;

  const [loading, setLoading] = useState(true);
  const [analysisPayload, setAnalysisPayload] = useState<any>(null);
  const [resultPayload, setResultPayload] = useState<any>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const bg = isDark ? '#0f172a' : '#f1f5f9';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#2563eb';

  const isWide = width >= 900;
  const headerMeta = normalizeTitleMeta(result || ({} as SubmissionResult));

  useEffect(() => {
    let isMounted = true;

    const loadAttemptDetails = async () => {
      if (!result) {
        setLoading(false);
        return;
      }

      const attemptId = result.attemptId || (result.testKey && !result.testKey.includes(':') ? result.testKey : undefined);
      if (!attemptId) {
        setLoading(false);
        return;
      }

      try {
        const calls = result.sourceTab === 'PYQ'
          ? [
              pyqApi.getPyqAttemptAnalysis(attemptId),
              pyqApi.getPyqAttemptResult(attemptId),
            ]
          : [
              mockApi.getAttemptAnalysis(attemptId),
              mockApi.getAttemptResult(attemptId),
            ];

        const [analysisRes, resultRes] = await Promise.allSettled(calls);

        if (!isMounted) {
          return;
        }

        if (analysisRes.status === 'fulfilled') {
          setAnalysisPayload(extractPayload(analysisRes.value));
        }

        if (resultRes.status === 'fulfilled') {
          setResultPayload(extractPayload(resultRes.value));
        }
      } catch (error) {
        console.error('Failed to fetch attempt details', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAttemptDetails();

    return () => {
      isMounted = false;
    };
  }, [result]);

  const resolvedMarking = useMemo(() => fallbackMarking(result || ({} as SubmissionResult)), [result]);

  const resolvedStats = useMemo(() => {
    const fromResult = resultPayload?.results || resultPayload || {};
    const attempted = Number(fromResult?.attempted ?? result?.attempted ?? 0);
    const correct = Number(fromResult?.correct ?? result?.correct ?? 0);
    const wrong = Number(fromResult?.incorrect ?? fromResult?.wrong ?? result?.wrong ?? 0);
    const totalQuestions = Number(fromResult?.totalQuestions ?? result?.totalQuestions ?? attempted + Number(result?.unattempted || 0));
    const unattempted = Math.max(0, Number(fromResult?.unattempted ?? result?.unattempted ?? totalQuestions - attempted));
    const score = Number(fromResult?.score ?? result?.score ?? correct * resolvedMarking.correctMark - wrong * (typeof resolvedMarking.wrongMark === 'number' ? resolvedMarking.wrongMark : 0));
    const rank = Number(fromResult?.rank ?? resultPayload?.rank ?? analysisPayload?.rank ?? 1);
    const percentile = Number(fromResult?.percentile ?? resultPayload?.percentile ?? analysisPayload?.percentile ?? 100);
    const timeTaken = Number(fromResult?.totalTimeTaken ?? resultPayload?.totalTimeTaken ?? analysisPayload?.totalTimeTaken ?? 0);
    const duration = Number(fromResult?.timeLimit ?? result?.durationSeconds ?? 60 * 60);

    return {
      attempted,
      correct,
      wrong,
      unattempted,
      score,
      totalQuestions,
      rank,
      percentile,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      timeTaken,
      duration,
    };
  }, [analysisPayload, resolvedMarking, result, resultPayload]);

  const resolvedSections = useMemo(() => {
    const fromResult = resultPayload?.results?.sectionBreakup || resultPayload?.sectionBreakup;
    if (Array.isArray(fromResult) && fromResult.length > 0) {
      return fromResult.map((section: any) => ({
        section: String(section?.section || section?.name || 'Section'),
        correct: Number(section?.correct || 0),
        wrong: Number(section?.wrong || section?.incorrect || 0),
        attempted: Number(section?.attempted || 0),
        score: Number(section?.score || 0),
      })) as SectionItem[];
    }

    if (Array.isArray(result?.sectionBreakup) && result.sectionBreakup.length > 0) {
      return result.sectionBreakup;
    }

    return [
      {
        section: 'Overall',
        correct: resolvedStats.correct,
        wrong: resolvedStats.wrong,
        attempted: resolvedStats.attempted,
        score: resolvedStats.score,
      },
    ];
  }, [resolvedStats, result, resultPayload]);

  const questions = useMemo(() => {
    const parsed = extractQuestions(analysisPayload, resultPayload);
    if (parsed.length > 0) {
      return parsed;
    }
    return buildDummyQuestions(result || ({} as SubmissionResult));
  }, [analysisPayload, result, resultPayload]);

  const currentQuestion = questions[Math.min(currentQuestionIndex, Math.max(questions.length - 1, 0))];

  const formatSeconds = (seconds: number) => {
    const safe = Math.max(0, Number(seconds) || 0);
    const mins = Math.floor(safe / 60);
    const secs = safe % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleReattempt = () => {
    if (!result) {
      return;
    }

    const defaultMockData = {
      title: result.testTitle || 'Mock Test',
      questions: result.totalQuestions || Math.max(result.attempted + result.unattempted, 25),
      duration: Math.max(1, Math.floor((result.durationSeconds || 3600) / 60)),
    };

    if (result.sourceTab === 'PYQ') {
      if (!result.testPaperId) {
        Alert.alert('Cannot reattempt', 'Test paper id is not available for this attempt.');
        return;
      }
      navigation.navigate('MockInstruction', {
        mockData: defaultMockData,
        sourceTab: 'PYQ',
        testKey: result.testKey || `PYQ:${result.testPaperId}`,
        testPaperId: result.testPaperId,
      });
      return;
    }

    navigation.navigate('MockInstruction', {
      mockData: defaultMockData,
      sourceTab: 'RankMaker',
      testKey: result.testKey || `RankMaker:${Date.now()}`,
    });
  };

  if (!result) {
    return (
      <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}> 
        <View style={styles.centerBlock}>
          <Text style={[styles.emptyTitle, { color: text }]}>No analysis data found</Text>
          <Pressable style={[styles.primaryBtn, { backgroundColor: primary }]} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}> 
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: card }]}> 
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={text} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text numberOfLines={1} style={[styles.headerTitle, { color: text }]}>{result.testTitle}</Text>
          <Text style={[styles.headerSub, { color: muted }]}>{headerMeta.exam} · {headerMeta.tier} · Analysis</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centerBlock}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.actionRow}>
            <Pressable style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={handleReattempt}>
              <Text style={styles.actionBtnText}>Reattempt This Test</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: '#0f766e' }]} onPress={() => setShowSolutions(true)}>
              <Text style={styles.actionBtnText}>Go To Solution</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, { backgroundColor: '#1d4ed8' }]} onPress={() => navigation.navigate('PYQs')}>
              <Text style={styles.actionBtnText}>Go To Tests</Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionTitle, { color: text }]}>Overall Performance Summary</Text>
          <View style={[styles.statsGrid, isWide && styles.statsGridWide]}>
            <View style={[styles.statCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.statValue, { color: text }]}>{resolvedStats.rank}</Text>
              <Text style={[styles.statLabel, { color: muted }]}>Rank</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.statValue, { color: text }]}>{resolvedStats.score.toFixed(2)}</Text>
              <Text style={[styles.statLabel, { color: muted }]}>Score</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.statValue, { color: text }]}>{resolvedStats.attempted} / {resolvedStats.totalQuestions}</Text>
              <Text style={[styles.statLabel, { color: muted }]}>Attempted</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.statValue, { color: text }]}>{resolvedStats.accuracy.toFixed(2)}%</Text>
              <Text style={[styles.statLabel, { color: muted }]}>Accuracy</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.statValue, { color: text }]}>{resolvedStats.percentile.toFixed(2)}%</Text>
              <Text style={[styles.statLabel, { color: muted }]}>Percentile</Text>
            </View>
          </View>

          <View style={[styles.markingCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.markingTitle, { color: text }]}>Marking Scheme</Text>
            <Text style={[styles.markingText, { color: muted }]}>Correct: +{resolvedMarking.correctMark} | Wrong: -{resolvedMarking.wrongMark}</Text>
            <Text style={[styles.markingText, { color: muted }]}>Time: {formatSeconds(resolvedStats.timeTaken)} / {formatSeconds(resolvedStats.duration)}</Text>
          </View>

          <Text style={[styles.sectionTitle, { color: text }]}>Sectional Summary</Text>
          <View style={[styles.tableWrap, { backgroundColor: card, borderColor: border }]}>
            {resolvedSections.map((section, index) => {
              const acc = section.attempted > 0 ? (section.correct / section.attempted) * 100 : 0;
              return (
                <View
                  key={`${section.section}-${index}`}
                  style={[
                    styles.tableRow,
                    { borderBottomColor: border },
                    index === resolvedSections.length - 1 && styles.lastTableRow,
                  ]}
                >
                  <Text style={[styles.tableSection, { color: text }]}>{section.section}</Text>
                  <Text style={[styles.tableCell, { color: text }]}>{section.score.toFixed(2)}</Text>
                  <Text style={[styles.tableCell, { color: text }]}>{section.attempted}</Text>
                  <Text style={[styles.tableCell, { color: text }]}>{acc.toFixed(2)}%</Text>
                </View>
              );
            })}
          </View>

          {showSolutions && currentQuestion && (
            <View style={[styles.solutionRoot, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.solutionHeaderRow}>
                <Text style={[styles.solutionHeading, { color: text }]}>Question Paper + Solution</Text>
                <View style={styles.solutionPager}>
                  <Pressable
                    style={[styles.pageBtn, currentQuestionIndex === 0 && styles.pageBtnDisabled]}
                    disabled={currentQuestionIndex === 0}
                    onPress={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.pageBtnText}>Previous</Text>
                  </Pressable>
                  <Text style={[styles.pageMeta, { color: muted }]}>Q {currentQuestion.number} / {questions.length}</Text>
                  <Pressable
                    style={[styles.pageBtn, currentQuestionIndex >= questions.length - 1 && styles.pageBtnDisabled]}
                    disabled={currentQuestionIndex >= questions.length - 1}
                    onPress={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                  >
                    <Text style={styles.pageBtnText}>Next</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.questionText, { color: text }]}>{currentQuestion.questionText}</Text>

              <View style={styles.optionList}>
                {currentQuestion.options.map((option, idx) => {
                  const isCorrect = idx === currentQuestion.correctOptionIndex;
                  const isSelected = idx === currentQuestion.selectedOptionIndex;
                  const tone = isCorrect ? '#16a34a' : isSelected ? '#dc2626' : border;

                  return (
                    <View key={`${currentQuestion.id}-${idx}`} style={[styles.optionRow, { borderColor: tone }]}> 
                      <Text style={[styles.optionKey, { color: text }]}>{String.fromCharCode(65 + idx)}.</Text>
                      <Text style={[styles.optionText, { color: text }]}>{option || `Option ${idx + 1}`}</Text>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.solutionPanel, { borderColor: '#99f6e4', backgroundColor: isDark ? '#042f2e' : '#ecfeff' }]}>
                <Text style={styles.solutionPanelTitle}>SOLUTION & ANALYSIS</Text>
                <Text style={styles.solutionLabel}>Detailed explanation for the answer</Text>
                <Text style={[styles.solutionCopy, { color: text }]}> 
                  {currentQuestion.solutionText || 'Solution is unavailable from API for this question. Showing fallback explanation.'}
                </Text>
                <View style={styles.answerMetaRow}>
                  <View style={styles.answerMetaCard}>
                    <Text style={styles.answerMetaLabel}>You Selected</Text>
                    <Text style={styles.answerMetaValue}>
                      {currentQuestion.selectedOptionIndex >= 0 ? String.fromCharCode(65 + currentQuestion.selectedOptionIndex) : '--'}
                    </Text>
                  </View>
                  <View style={styles.answerMetaCard}>
                    <Text style={styles.answerMetaLabel}>Correct</Text>
                    <Text style={styles.answerMetaValue}>
                      {currentQuestion.correctOptionIndex >= 0 ? String.fromCharCode(65 + currentQuestion.correctOptionIndex) : '--'}
                    </Text>
                  </View>
                  <View style={styles.answerMetaCard}>
                    <Text style={styles.answerMetaLabel}>Status</Text>
                    <Text style={[styles.answerMetaValue, { color: currentQuestion.selectedOptionIndex === currentQuestion.correctOptionIndex ? '#16a34a' : '#dc2626' }]}>
                      {currentQuestion.selectedOptionIndex === currentQuestion.correctOptionIndex ? 'CORRECT' : 'INCORRECT'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 28,
    gap: 12,
  },
  centerBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginTop: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statsGridWide: {
    justifyContent: 'space-between',
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minWidth: 130,
    flexGrow: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  markingCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  markingTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  markingText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  tableWrap: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  lastTableRow: {
    borderBottomWidth: 0,
  },
  tableSection: {
    flex: 1.8,
    fontSize: 13,
    fontWeight: '800',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  solutionRoot: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
  },
  solutionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  solutionHeading: {
    fontSize: 18,
    fontWeight: '900',
  },
  solutionPager: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pageBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  pageBtnDisabled: {
    opacity: 0.45,
  },
  pageBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  pageMeta: {
    fontSize: 12,
    fontWeight: '700',
  },
  questionText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  optionList: {
    gap: 8,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  optionKey: {
    width: 22,
    fontSize: 13,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  solutionPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  solutionPanelTitle: {
    color: '#059669',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 2,
  },
  solutionLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  solutionCopy: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  answerMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  answerMetaCard: {
    minWidth: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  answerMetaLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  answerMetaValue: {
    marginTop: 3,
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
});
