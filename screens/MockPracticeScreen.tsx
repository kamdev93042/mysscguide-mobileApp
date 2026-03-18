import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions, StackActions, useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const SECTION_TITLES = ['PART-A', 'PART-B', 'PART-C', 'PART-D'] as const;
const EXAM_DURATION_SECONDS = 60 * 60;

type SectionTitle = (typeof SECTION_TITLES)[number];

type Question = {
  id: number;
  section: SectionTitle;
  questionText: string;
  options: string[];
  correctOption: number;
};

type SourceTab = 'PYQ' | 'RankMaker';

type SectionBreakup = {
  section: SectionTitle;
  correct: number;
  wrong: number;
  attempted: number;
  score: number;
};

const SECTION_SUBJECTS: Record<SectionTitle, string> = {
  'PART-A': 'General Intelligence',
  'PART-B': 'General Awareness',
  'PART-C': 'Quantitative Aptitude',
  'PART-D': 'English Comprehension',
};

const LANGUAGE_OPTIONS = ['English', 'Hindi'] as const;

const SAMPLE_OPTIONS = [
  ['Facilitate', 'Block', 'Assist', 'Maintain'],
  ['Plentiful', 'Limited', 'Short', 'Rare'],
  ['Conclude', 'Begin', 'Pause', 'Stop'],
  ['Accurate', 'False', 'Quick', 'Simple'],
];

const buildQuestions = (count: number): Question[] => {
  const total = Math.max(4, count);
  const perSection = Math.ceil(total / SECTION_TITLES.length);

  return Array.from({ length: total }, (_, index) => {
    const sectionIndex = Math.min(Math.floor(index / perSection), SECTION_TITLES.length - 1);
    const sample = SAMPLE_OPTIONS[index % SAMPLE_OPTIONS.length];
    const questionNo = index + 1;

    return {
      id: questionNo,
      section: SECTION_TITLES[sectionIndex],
      questionText: `Question ${questionNo}: Select the option that is related to the third term in the same way as the second term is related to the first term.`,
      options: [
        `Option A: ${sample[0]}`,
        `Option B: ${sample[1]}`,
        `Option C: ${sample[2]}`,
        `Option D: ${sample[3]}`,
      ],
      correctOption: index % 4,
    };
  });
};

type QuestionStatus = 'unvisited' | 'notAnswered' | 'answered' | 'review' | 'answeredReview';

export default function MockPracticeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  const mockData = route.params?.mockData || {
    title: 'Rank Maker Series',
    questions: 25,
  };
  const sourceTab: SourceTab = route.params?.sourceTab || (mockData.title.includes('Rank Maker') ? 'RankMaker' : 'PYQ');

  const totalQuestions = Number.isFinite(Number(mockData.questions))
    ? Number(mockData.questions)
    : 25;

  const examQuestions = useMemo(() => buildQuestions(totalQuestions), [totalQuestions]);
  const sectionNames = useMemo(
    () => Array.from(new Set(examQuestions.map((q) => q.section))) as SectionTitle[],
    [examQuestions]
  );

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<number, boolean>>({
    [examQuestions[0].id]: true,
  });
  const [reviewedQuestions, setReviewedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_DURATION_SECONDS);
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionTitle>(sectionNames[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Hindi'>('English');
  const [isLanguageMenuVisible, setIsLanguageMenuVisible] = useState(false);
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#111827' : '#ffffff';
  const border = isDark ? '#334155' : '#d1d5db';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#0d9488';

  const currentQuestion = examQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(selectedOptions).length;
  const reviewedCount = Object.values(reviewedQuestions).filter(Boolean).length;
  const isCompact = screenWidth < 430;

  const answeredAndReviewedCount = examQuestions.filter(
    (q) => selectedOptions[q.id] !== undefined && !!reviewedQuestions[q.id]
  ).length;
  const reviewedOnlyCount = examQuestions.filter(
    (q) => selectedOptions[q.id] === undefined && !!reviewedQuestions[q.id]
  ).length;
  const answeredOnlyCount = examQuestions.filter(
    (q) => selectedOptions[q.id] !== undefined && !reviewedQuestions[q.id]
  ).length;
  const notAnsweredCount = examQuestions.filter(
    (q) => !!visitedQuestions[q.id] && selectedOptions[q.id] === undefined && !reviewedQuestions[q.id]
  ).length;
  const notVisitedCount = examQuestions.filter((q) => !visitedQuestions[q.id]).length;

  const goBackSafe = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('PYQs');
  };

  const buildSubmissionResult = () => {
    let correct = 0;
    let wrong = 0;

    examQuestions.forEach((q) => {
      const selected = selectedOptions[q.id];
      if (selected === undefined) {
        return;
      }
      if (selected === q.correctOption) {
        correct += 1;
      } else {
        wrong += 1;
      }
    });

    const attempted = correct + wrong;
    const unattempted = examQuestions.length - attempted;
    const score = correct * 2 - wrong * 0.5;
    const sectionBreakup: SectionBreakup[] = sectionNames.map((section) => {
      const sectionQuestions = examQuestions.filter((q) => q.section === section);
      let sectionCorrect = 0;
      let sectionWrong = 0;

      sectionQuestions.forEach((q) => {
        const selected = selectedOptions[q.id];
        if (selected === undefined) {
          return;
        }
        if (selected === q.correctOption) {
          sectionCorrect += 1;
        } else {
          sectionWrong += 1;
        }
      });

      return {
        section,
        correct: sectionCorrect,
        wrong: sectionWrong,
        attempted: sectionCorrect + sectionWrong,
        score: sectionCorrect * 2 - sectionWrong * 0.5,
      };
    });

    return {
      sourceTab,
      testTitle: String(mockData.title || 'Mock Test'),
      attempted,
      correct,
      wrong,
      unattempted,
      score,
      sectionBreakup,
      submittedAt: new Date().toLocaleString(),
    };
  };

  const submitAndReturnToSeries = (mode: 'manual' | 'auto') => {
    const result = buildSubmissionResult();
    setIsSubmitting(false);

    const state = navigation.getState?.();
    const routes = state?.routes || [];
    const currentIndex = typeof state?.index === 'number' ? state.index : routes.length - 1;

    let pyqsRouteIndex = -1;
    for (let i = currentIndex - 1; i >= 0; i -= 1) {
      if (routes[i]?.name === 'PYQs') {
        pyqsRouteIndex = i;
        break;
      }
    }

    if (pyqsRouteIndex >= 0) {
      const pyqsKey = routes[pyqsRouteIndex].key;
      navigation.dispatch({
        ...CommonActions.setParams({
          submissionResult: result,
          submitMode: mode,
        }),
        source: pyqsKey,
      });

      const popCount = currentIndex - pyqsRouteIndex;
      if (popCount > 0) {
        navigation.dispatch(StackActions.pop(popCount));
      }
      return;
    }

    navigation.navigate('PYQs', {
      submissionResult: result,
      submitMode: mode,
    });
  };

  useEffect(() => {
    if (!sectionNames.includes(activeSection)) {
      setActiveSection(sectionNames[0]);
    }
  }, [activeSection, sectionNames]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (isSubmitting) {
        return;
      }
      setIsSubmitModalVisible(false);
      setIsSubmitting(true);
      Alert.alert('Time up', 'Your test has been auto-submitted as the timer reached zero.', [
        {
          text: 'OK',
          onPress: () => {
            submitAndReturnToSeries('auto');
          },
        },
      ]);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, isSubmitting]);

  const getStatus = (questionId: number): QuestionStatus => {
    const isAnswered = selectedOptions[questionId] !== undefined;
    const isReviewed = !!reviewedQuestions[questionId];
    const isVisited = !!visitedQuestions[questionId];

    if (isReviewed && isAnswered) {
      return 'answeredReview';
    }
    if (isReviewed) {
      return 'review';
    }
    if (isAnswered) {
      return 'answered';
    }
    if (isVisited) {
      return 'notAnswered';
    }
    return 'unvisited';
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setVisitedQuestions((prev) => ({
      ...prev,
      [examQuestions[index].id]: true,
    }));
  };

  const handleBack = () => {
    goBackSafe();
  };

  const handleSubmit = () => {
    setIsSubmitModalVisible(true);
  };

  const handleFinalSubmit = () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitModalVisible(false);
    setIsSubmitting(true);
    submitAndReturnToSeries('manual');
  };

  const handleSelectOption = (optionIndex: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));
  };

  const handleMarkReviewToggle = () => {
    setReviewedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1);
    }
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < examQuestions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(1.45, Number((prev + 0.1).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.85, Number((prev - 0.1).toFixed(2))));
  };

  const sectionQuestions = examQuestions.filter((q) => q.section === activeSection);

  const statusStyle = (status: QuestionStatus) => {
    if (status === 'answered') {
      return { bg: '#16a34a', textColor: '#ffffff', borderColor: '#16a34a' };
    }
    if (status === 'review') {
      return { bg: '#dc2626', textColor: '#ffffff', borderColor: '#dc2626' };
    }
    if (status === 'answeredReview') {
      return { bg: '#eab308', textColor: '#111827', borderColor: '#eab308' };
    }
    if (status === 'notAnswered') {
      return { bg: '#2563eb', textColor: '#ffffff', borderColor: '#2563eb' };
    }
    return {
      bg: '#2563eb',
      textColor: '#ffffff',
      borderColor: '#2563eb',
    };
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? insets.top : 14 }]}>
      <View style={[styles.header, { borderBottomColor: border }]}>
        <Pressable style={styles.iconCircle} onPress={handleBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={20} color={text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
            {mockData.title}
          </Text>
          <Text style={[styles.headerSub, { color: muted }]} numberOfLines={1}>
            Question {currentQuestionIndex + 1} of {examQuestions.length}
          </Text>
        </View>

        <View style={[styles.timerPill, { borderColor: border, backgroundColor: card }]}>
          <Ionicons name="time-outline" size={14} color={text} />
          <Text style={[styles.timerText, { color: text }]}>{formatTime(timeLeft)}</Text>
        </View>
      </View>

      <View style={[styles.candidateBar, { borderBottomColor: border, backgroundColor: card }]}> 
        <Text style={[styles.candidateText, { color: text }]} numberOfLines={1}>
          Roll No: 2404512398
        </Text>
        <Text style={[styles.candidateDivider, { color: border }]}>|</Text>
        <Text style={[styles.candidateText, { color: text }]} numberOfLines={1}>
          Candidate: [Candidate Name]
        </Text>
      </View>

      <View
        style={[
          styles.topControls,
          { borderBottomColor: border, backgroundColor: card },
          isCompact && styles.topControlsCompact,
        ]}
      >
        <View style={[styles.metricBadge, { borderColor: border, backgroundColor: isDark ? '#0b1324' : '#f1f5f9' }]}>
          <Ionicons name="stats-chart-outline" size={14} color={primary} />
          <Text style={[styles.metricText, { color: text }]}>Answered {answeredCount}/{examQuestions.length}</Text>
        </View>

        <View style={styles.topRightActions}>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#dc2626' }]} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={[
          styles.utilityBar,
          { borderBottomColor: border, backgroundColor: card },
          isCompact && styles.utilityBarCompact,
        ]}
      >
        <Pressable
          style={[styles.languageDropdownBtn, { borderColor: border, backgroundColor: card }]}
          onPress={() => setIsLanguageMenuVisible(true)}
        >
          <Text style={[styles.languageDropdownLabel, { color: muted }]}>Select Language:</Text>
          <Text style={[styles.languageDropdownValue, { color: text }]}>{selectedLanguage}</Text>
          <Ionicons name="chevron-down" size={14} color={muted} />
        </Pressable>

        <View style={[styles.zoomGroup, { borderColor: border }]}> 
          <Pressable style={styles.zoomBtn} onPress={handleZoomOut}>
            <Ionicons name="remove" size={16} color={text} />
          </Pressable>
          <Text style={[styles.zoomText, { color: text }]}>{Math.round(zoomLevel * 100)}%</Text>
          <Pressable style={styles.zoomBtn} onPress={handleZoomIn}>
            <Ionicons name="add" size={16} color={text} />
          </Pressable>
        </View>

        <Pressable
          style={[styles.fullscreenBtn, { borderColor: border }]}
          onPress={() => setIsFullscreen((prev) => !prev)}
        >
          <Ionicons name={isFullscreen ? 'contract-outline' : 'expand-outline'} size={16} color={text} />
          <Text style={[styles.fullscreenBtnText, { color: text }]}>{isFullscreen ? 'Exit' : 'Full'}</Text>
        </Pressable>
      </View>

      {!isFullscreen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.sectionStrip, { borderBottomColor: border }]}
          contentContainerStyle={styles.sectionStripContent}
        >
          {sectionNames.map((section) => {
            const isActive = currentQuestion.section === section;
            return (
              <Pressable
                key={section}
                style={[
                  styles.sectionTab,
                  { borderColor: isActive ? primary : border, backgroundColor: isActive ? primary : card },
                ]}
                onPress={() => {
                  setActiveSection(section);
                  const firstIdx = examQuestions.findIndex((q) => q.section === section);
                  if (firstIdx >= 0) {
                    navigateToQuestion(firstIdx);
                  }
                }}
              >
                <Text style={[styles.sectionTabText, { color: isActive ? '#ffffff' : text }]}>{section}</Text>
                <Text style={[styles.sectionTabSubText, { color: isActive ? '#d1fae5' : muted }]} numberOfLines={1}>
                  {SECTION_SUBJECTS[section]}
                </Text>
              </Pressable>
            );
          })}

        </ScrollView>
      )}

      <ScrollView contentContainerStyle={[styles.mainContent, isFullscreen && styles.mainContentFullscreen]} showsVerticalScrollIndicator={false}>
        <View style={[styles.questionCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.questionMetaRow}>
            <Text style={[styles.questionNo, { color: text, fontSize: 16 * zoomLevel }]}>Question: {currentQuestion.id}</Text>
            <View style={[styles.languageBadge, { borderColor: border }]}>
              <Text style={[styles.languageText, { color: muted }]}>{selectedLanguage}</Text>
            </View>
          </View>

          <Text style={[styles.currentSectionText, { color: muted }]}>
            {currentQuestion.section} - {SECTION_SUBJECTS[currentQuestion.section]}
          </Text>

          {selectedLanguage === 'Hindi' && (
            <Text style={[styles.languageNotice, { color: muted }]}>Hindi view selected for this question.</Text>
          )}

          <Text style={[styles.questionText, { color: text, fontSize: 16 * zoomLevel, lineHeight: 24 * zoomLevel }]}>
            {currentQuestion.questionText}
          </Text>

          <View>
            {currentQuestion.options.map((option, optionIndex) => {
              const isSelected = selectedOptions[currentQuestion.id] === optionIndex;
              return (
                <Pressable
                  key={`${currentQuestion.id}-${optionIndex}`}
                  style={[
                    styles.optionRow,
                    {
                      borderColor: isSelected ? '#3b82f6' : border,
                      backgroundColor: isSelected ? (isDark ? '#0f172a' : '#f8fbff') : card,
                    },
                  ]}
                  onPress={() => handleSelectOption(optionIndex)}
                >
                  <View
                    style={[
                      styles.radioOuter,
                      { borderColor: isSelected ? '#3b82f6' : muted, backgroundColor: 'transparent' },
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <Text style={[styles.optionText, { color: text, fontSize: 14 * zoomLevel, lineHeight: 20 * zoomLevel }]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: border, backgroundColor: card, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          style={[styles.prevBtn, { borderColor: '#2563eb', backgroundColor: '#2563eb', opacity: currentQuestionIndex === 0 ? 0.5 : 1 }]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={styles.prevBtnText}>Previous</Text>
        </Pressable>

        <Pressable
          style={[styles.reviewBtn, { backgroundColor: '#2563eb' }]}
          onPress={handleMarkReviewToggle}
        >
          <Text style={styles.reviewBtnText}>
            {reviewedQuestions[currentQuestion.id] ? 'Unmark Review' : 'Mark for Review'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.saveNextBtn, { backgroundColor: '#2563eb', opacity: currentQuestionIndex === examQuestions.length - 1 ? 0.65 : 1 }]}
          onPress={handleSaveAndNext}
          disabled={currentQuestionIndex === examQuestions.length - 1}
        >
          <Text style={styles.saveNextBtnText}>Save & Next</Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.paletteArrowTrigger, { backgroundColor: '#0284c7' }]}
        onPress={() => setIsPaletteVisible(true)}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={18} color="#ffffff" />
      </Pressable>

      <Modal visible={isPaletteVisible} transparent animationType="slide" onRequestClose={() => setIsPaletteVisible(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsPaletteVisible(false)} />

          <View style={[styles.palettePanel, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.paletteHeader, { borderBottomColor: border }]}>
              <View>
                <Text style={[styles.paletteTitle, { color: text }]}>Question Palette</Text>
                <Text style={[styles.paletteSub, { color: muted }]}>{mockData.title}</Text>
                <Text style={[styles.paletteActiveSection, { color: primary }]}> 
                  {activeSection} - {SECTION_SUBJECTS[activeSection]}
                </Text>
              </View>
              <Pressable style={styles.iconCircle} onPress={() => setIsPaletteVisible(false)}>
                <Ionicons name="close" size={20} color={text} />
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.paletteSectionStrip}
              contentContainerStyle={styles.paletteSectionStripContent}
            >
              {sectionNames.map((section) => (
                <Pressable
                  key={`palette-${section}`}
                  style={[
                    styles.paletteSectionTab,
                    {
                      borderColor: activeSection === section ? primary : border,
                      backgroundColor: activeSection === section ? primary : card,
                    },
                  ]}
                  onPress={() => setActiveSection(section)}
                >
                  <Text style={[styles.paletteSectionText, { color: activeSection === section ? '#ffffff' : text }]}>
                    {section}
                  </Text>
                  <Text
                    style={[
                      styles.paletteSectionSubText,
                      { color: activeSection === section ? '#d1fae5' : muted },
                    ]}
                    numberOfLines={1}
                  >
                    {SECTION_SUBJECTS[section]}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <ScrollView contentContainerStyle={styles.paletteBody}>
              <View style={styles.paletteGrid}>
                {sectionQuestions.map((q) => {
                  const globalIndex = examQuestions.findIndex((question) => question.id === q.id);
                  const status = getStatus(q.id);
                  const styleMeta = statusStyle(status);
                  const isCurrent = q.id === currentQuestion.id;
                  const showReviewPointer = status === 'review' || status === 'answeredReview';
                  const pointerColor = status === 'answeredReview' ? '#111827' : '#ffffff';

                  return (
                    <Pressable
                      key={`q-${q.id}`}
                      style={[
                        styles.paletteQuestion,
                        {
                          backgroundColor: styleMeta.bg,
                          borderColor: isCurrent ? text : styleMeta.borderColor,
                          borderWidth: isCurrent ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        navigateToQuestion(globalIndex);
                        setIsPaletteVisible(false);
                      }}
                    >
                      <Text style={[styles.paletteQuestionText, { color: styleMeta.textColor }]}>{q.id}</Text>
                      {showReviewPointer && (
                        <View
                          style={[
                            styles.reviewPointer,
                            {
                              borderLeftColor: 'transparent',
                              borderRightColor: 'transparent',
                              borderTopColor: pointerColor,
                            },
                          ]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={[styles.analysisBox, { borderTopColor: border }]}>
              <Text style={[styles.analysisTitle, { color: text }]}>Section Analysis</Text>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: muted }]}>Answered</Text>
                <Text style={[styles.analysisValue, { color: '#16a34a' }]}>{answeredCount}</Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: muted }]}>Not Answered</Text>
                <Text style={[styles.analysisValue, { color: '#2563eb' }]}>
                  {Object.values(visitedQuestions).filter(Boolean).length - answeredCount}
                </Text>
              </View>
              <View style={styles.analysisRow}>
                <Text style={[styles.analysisLabel, { color: muted }]}>Marked for Review</Text>
                <Text style={[styles.analysisValue, { color: '#dc2626' }]}>{reviewedCount}</Text>
              </View>

              <View style={styles.legendWrap}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} />
                  <Text style={[styles.legendText, { color: text }]}>Not Answered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                  <Text style={[styles.legendText, { color: text }]}>Answered</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} />
                  <Text style={[styles.legendText, { color: text }]}>Review</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#eab308' }]} />
                  <Text style={[styles.legendText, { color: text }]}>Answered + Review</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isSubmitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSubmitModalVisible(false)}
      >
        <View style={styles.languageModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsSubmitModalVisible(false)} />
          <View
            style={[styles.submitModalCard, { backgroundColor: card, borderColor: border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.submitModalTitle, { color: text }]}>Submit Test</Text>
            <Text style={[styles.submitModalSub, { color: muted }]}>Please review your question status before final submission.</Text>

            <View style={styles.submitSummaryGrid}>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Answered</Text>
                <Text style={[styles.submitSummaryValue, { color: '#16a34a' }]}>{answeredOnlyCount}</Text>
              </View>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Not Answered</Text>
                <Text style={[styles.submitSummaryValue, { color: '#2563eb' }]}>{notAnsweredCount}</Text>
              </View>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Review Only</Text>
                <Text style={[styles.submitSummaryValue, { color: '#dc2626' }]}>{reviewedOnlyCount}</Text>
              </View>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Answered + Review</Text>
                <Text style={[styles.submitSummaryValue, { color: '#eab308' }]}>{answeredAndReviewedCount}</Text>
              </View>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Not Visited</Text>
                <Text style={[styles.submitSummaryValue, { color: text }]}>{notVisitedCount}</Text>
              </View>
              <View style={[styles.submitSummaryItem, { borderColor: border }]}>
                <Text style={[styles.submitSummaryLabel, { color: muted }]}>Time Left</Text>
                <Text style={[styles.submitSummaryValue, { color: text }]}>{formatTime(timeLeft)}</Text>
              </View>
            </View>

            <View style={styles.submitActionsRow}>
              <Pressable
                style={[styles.submitActionBtn, { borderColor: border, backgroundColor: isDark ? '#0b1324' : '#f1f5f9' }]}
                onPress={() => setIsSubmitModalVisible(false)}
              >
                <Text style={[styles.submitActionText, { color: text }]}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitActionBtn, { backgroundColor: '#2563eb' }]} onPress={handleFinalSubmit}>
                <Text style={[styles.submitActionText, { color: '#ffffff' }]}>Submit Test</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isLanguageMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLanguageMenuVisible(false)}
      >
        <View style={styles.languageModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsLanguageMenuVisible(false)} />
          <View
            style={[styles.languageModalCard, { backgroundColor: card, borderColor: border }]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.languageModalTitle, { color: text }]}>Select Language</Text>
            {LANGUAGE_OPTIONS.map((language) => {
              const isSelected = selectedLanguage === language;
              return (
                <Pressable
                  key={language}
                  style={[
                    styles.languageModalItem,
                    { borderColor: border },
                    isSelected && { backgroundColor: isDark ? '#1e3a8a66' : '#dbeafe' },
                  ]}
                  onPress={() => {
                    setSelectedLanguage(language);
                    setIsLanguageMenuVisible(false);
                  }}
                >
                  <Text style={[styles.languageModalItemText, { color: text }]}>{language}</Text>
                  {isSelected && <Ionicons name="checkmark" size={18} color="#2563eb" />}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  timerText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  topControlsCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  metricBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  metricText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  candidateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  candidateText: {
    fontSize: 12,
    fontWeight: '700',
    maxWidth: '46%',
  },
  candidateDivider: {
    marginHorizontal: 8,
    fontWeight: '700',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  utilityBarCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  languageDropdownBtn: {
    height: 36,
    minWidth: 176,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageDropdownLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  languageDropdownValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    height: 34,
    paddingHorizontal: 4,
  },
  zoomBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    minWidth: 46,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenBtnText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionStrip: {
    borderBottomWidth: 1,
  },
  sectionStripContent: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionTab: {
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 124,
    height: 46,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTabSubText: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  mainContent: {
    padding: 12,
  },
  mainContentFullscreen: {
    paddingTop: 8,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  questionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNo: {
    fontSize: 16,
    fontWeight: '800',
  },
  languageBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  languageText: {
    fontSize: 12,
    fontWeight: '600',
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 14,
  },
  languageNotice: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  currentSectionText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prevBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  prevBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  reviewBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  saveNextBtn: {
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginLeft: 'auto',
  },
  saveNextBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  paletteArrowTrigger: {
    position: 'absolute',
    right: 0,
    top: '52%',
    width: 26,
    height: 52,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  languageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  languageModalCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  languageModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  languageModalItem: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  languageModalItemText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitModalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  submitModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  submitModalSub: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 10,
  },
  submitSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  submitSummaryItem: {
    width: '48.5%',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  submitSummaryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  submitSummaryValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '800',
  },
  submitActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  submitActionBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  palettePanel: {
    height: '78%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  paletteHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  paletteSub: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  paletteActiveSection: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  paletteSectionStrip: {
    maxHeight: 54,
  },
  paletteSectionStripContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  paletteSectionTab: {
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 124,
    height: 42,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  paletteSectionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  paletteSectionSubText: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  paletteBody: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  paletteQuestion: {
    width: 46,
    height: 34,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 10,
  },
  paletteQuestionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  reviewPointer: {
    position: 'absolute',
    bottom: -5,
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 6,
  },
  analysisBox: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  analysisTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  analysisLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  analysisValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  legendWrap: {
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
