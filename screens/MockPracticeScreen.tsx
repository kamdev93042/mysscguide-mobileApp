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
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const [activePaletteTab, setActivePaletteTab] = useState<'symbols' | 'instructions'>('symbols');
  const [isSubmitModalVisible, setIsSubmitModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
  const [infoModalType, setInfoModalType] = useState<'symbols' | 'instructions'>('instructions');
  const [isPauseConfirmVisible, setIsPauseConfirmVisible] = useState(false);
  const [isTestPaused, setIsTestPaused] = useState(false);

  const bg = isDark ? '#111827' : '#edf0f4';
  const card = isDark ? '#1f2937' : '#ffffff';
  const border = isDark ? '#374151' : '#d1d5db';
  const text = isDark ? '#f3f4f6' : '#0f172a';
  const muted = isDark ? '#9ca3af' : '#64748b';
  const primary = '#1d4ed8';

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
    if (isTestPaused) {
      return;
    }

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
  }, [timeLeft, isSubmitting, isTestPaused]);

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
    setSelectedOptions((prev) => {
      if (prev[currentQuestion.id] === optionIndex) {
        const next = { ...prev };
        delete next[currentQuestion.id];
        return next;
      }

      return {
        ...prev,
        [currentQuestion.id]: optionIndex,
      };
    });
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

  const handleLanguageSelect = (language: 'English' | 'Hindi') => {
    setSelectedLanguage(language);
    setIsLanguageDropdownOpen(false);
  };

  const handleReportSelect = (reason: string) => {
    setIsReportDropdownOpen(false);
    Alert.alert('Report submitted', `Issue type: ${reason}`);
  };

  const openInfoModal = (type: 'symbols' | 'instructions') => {
    setInfoModalType(type);
    setIsInfoModalVisible(true);
  };

  const handlePauseRequest = () => {
    if (isSubmitting || isTestPaused) {
      return;
    }
    setIsPauseConfirmVisible(true);
  };

  const handlePauseConfirm = () => {
    setIsPauseConfirmVisible(false);
    setIsTestPaused(true);
    setIsLanguageDropdownOpen(false);
    setIsReportDropdownOpen(false);
    setIsPaletteVisible(false);
    setIsInfoModalVisible(false);
    setIsSubmitModalVisible(false);
  };

  const handleResumeTest = () => {
    setIsTestPaused(false);
  };

  const sectionQuestions = examQuestions.filter((q) => q.section === activeSection);
  const sectionAnsweredCount = sectionQuestions.filter((q) => selectedOptions[q.id] !== undefined).length;
  const sectionReviewCount = sectionQuestions.filter((q) => !!reviewedQuestions[q.id]).length;
  const sectionNotAnsweredCount = sectionQuestions.length - sectionAnsweredCount;
  const isLongQuestion = currentQuestion.questionText.length > 260;

  const submitTableRows = sectionNames.map((section) => {
    const questions = examQuestions.filter((q) => q.section === section);
    const answered = questions.filter((q) => selectedOptions[q.id] !== undefined).length;
    const notAnswered = questions.filter(
      (q) => !!visitedQuestions[q.id] && selectedOptions[q.id] === undefined
    ).length;
    const markedForReview = questions.filter((q) => !!reviewedQuestions[q.id]).length;
    const notVisited = questions.filter((q) => !visitedQuestions[q.id]).length;

    return {
      section,
      subject: SECTION_SUBJECTS[section],
      total: questions.length,
      answered,
      notAnswered,
      markedForReview,
      notVisited,
    };
  });

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
    <View style={[styles.container, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? insets.top : 10 }]}> 
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: card }]}>
        <Pressable style={styles.iconCircle} onPress={handleBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={18} color={text} />
        </Pressable>

        <View style={styles.titleWrap}>
          <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
            {mockData.title}
          </Text>
          <Text style={[styles.headerSub, { color: muted }]} numberOfLines={1}>
            Question {currentQuestionIndex + 1} of {examQuestions.length}
          </Text>
        </View>

        <View style={styles.timerWrap}>
          <View style={styles.timerPill}>
            <Text style={styles.timerLabel}>Time Left</Text>
            <Text style={styles.timerText}>{formatTime(timeLeft).slice(3).replace(':', ' : ')}</Text>
          </View>
          <Pressable
            style={[styles.pauseBtn, (isSubmitting || isTestPaused) && styles.pauseBtnDisabled]}
            onPress={handlePauseRequest}
            disabled={isSubmitting || isTestPaused}
            hitSlop={6}
          >
            <Ionicons name="pause" size={13} color="#0f172a" />
          </Pressable>
        </View>
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

        <View style={[styles.zoomGroup, { borderColor: border }]}> 
          <Pressable style={styles.zoomBtn} onPress={handleZoomOut}>
            <Ionicons name="remove" size={16} color={text} />
          </Pressable>
          <Text style={[styles.zoomText, { color: text }]}>{Math.round(zoomLevel * 100)}%</Text>
          <Pressable style={styles.zoomBtn} onPress={handleZoomIn}>
            <Ionicons name="add" size={16} color={text} />
          </Pressable>
        </View>

        <View style={styles.topRightActions}>
          <Pressable style={[styles.submitBtn, { backgroundColor: '#2563eb' }]} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Test</Text>
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
        <View style={styles.infoTabsRow}>
          <Pressable onPress={() => openInfoModal('symbols')} hitSlop={8}>
            <Text style={styles.infoTabLink}>SYMBOLS</Text>
          </Pressable>
          <Pressable onPress={() => openInfoModal('instructions')} hitSlop={8}>
            <Text style={styles.infoTabLink}>INSTRUCTIONS</Text>
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
        <View style={[styles.sectionStrip, { borderBottomColor: border, backgroundColor: card }]}> 
          <View style={styles.sectionStripContent}>
          {sectionNames.map((section) => {
            const isActive = currentQuestion.section === section;
            return (
              <Pressable
                key={section}
                style={[
                  styles.sectionTab,
                  { borderColor: isActive ? '#16a34a' : '#2563eb', backgroundColor: isActive ? '#16a34a' : '#2563eb' },
                ]}
                onPress={() => {
                  setActiveSection(section);
                  const firstIdx = examQuestions.findIndex((q) => q.section === section);
                  if (firstIdx >= 0) {
                    navigateToQuestion(firstIdx);
                  }
                }}
              >
                <Text style={[styles.sectionTabText, { color: '#ffffff' }]}>{section}</Text>
              </Pressable>
            );
          })}

          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.mainContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.questionCard, { backgroundColor: card, borderColor: border }]}> 
          <Text style={[styles.questionNo, { color: text, fontSize: 16 * zoomLevel }]}>Question No. {currentQuestion.id}</Text>

          <View style={[styles.questionPanel, { borderColor: isDark ? '#4b5563' : '#e5e7eb' }]}>
            <View style={styles.questionTopRow}>
              <View style={styles.questionTopSpacer} />
              <View style={styles.questionTopActions}>
                <Pressable
                  style={[styles.inlineLanguageBtn, { borderColor: border, backgroundColor: card }]}
                  onPress={() => {
                    setIsReportDropdownOpen(false);
                    setIsLanguageDropdownOpen((prev) => !prev);
                  }}
                >
                  <Text style={[styles.inlineLanguageText, { color: muted }]}>{selectedLanguage}</Text>
                  <Ionicons name="chevron-down" size={12} color={muted} />
                </Pressable>

                <Pressable
                  style={styles.inlineReportBtn}
                  onPress={() => {
                    setIsLanguageDropdownOpen(false);
                    setIsReportDropdownOpen((prev) => !prev);
                  }}
                >
                  <Ionicons name="warning" size={14} color="#64748b" />
                  <Text style={styles.inlineReportText}>Report</Text>
                </Pressable>
              </View>
            </View>

            {isLanguageDropdownOpen && (
              <View style={[styles.inlineDropdown, { borderColor: border, backgroundColor: card }]}>
                {LANGUAGE_OPTIONS.map((language) => {
                  const isSelected = selectedLanguage === language;
                  return (
                    <Pressable
                      key={`lang-${language}`}
                      style={[styles.inlineDropdownItem, isSelected && { backgroundColor: isDark ? '#1e3a8a66' : '#dbeafe' }]}
                      onPress={() => handleLanguageSelect(language)}
                    >
                      <Text style={[styles.inlineDropdownItemText, { color: text }]}>{language}</Text>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#2563eb" />}
                    </Pressable>
                  );
                })}
              </View>
            )}

            {isReportDropdownOpen && (
              <View style={[styles.inlineDropdown, styles.reportDropdown, { borderColor: border, backgroundColor: card }]}>
                {['Wrong Question', 'Formatting Issue', 'Wrong Translation', 'Others'].map((reason) => (
                  <Pressable
                    key={reason}
                    style={styles.inlineDropdownItem}
                    onPress={() => handleReportSelect(reason)}
                  >
                    <Text style={[styles.inlineDropdownItemText, { color: text }]}>{reason}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <ScrollView
              style={styles.questionTextScroll}
              contentContainerStyle={styles.questionTextScrollContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator={isLongQuestion}
              scrollEnabled={isLongQuestion}
            >
              <Text style={[styles.questionText, { color: text, fontSize: 16 * zoomLevel, lineHeight: 25 * zoomLevel }]}>
                {currentQuestion.questionText}
              </Text>
            </ScrollView>

            <View style={styles.optionsWrap}>
              {currentQuestion.options.map((option, optionIndex) => {
                const isSelected = selectedOptions[currentQuestion.id] === optionIndex;
                return (
                  <Pressable
                    key={`${currentQuestion.id}-${optionIndex}`}
                    style={[
                      styles.optionRow,
                      {
                        borderColor: isSelected ? '#3b82f6' : border,
                        backgroundColor: isSelected ? (isDark ? '#111827' : '#f8fbff') : card,
                      },
                    ]}
                    onPress={() => handleSelectOption(optionIndex)}
                  >
                    <View style={[styles.optionRadioSlot, { borderRightColor: border }]}>
                      <View
                        style={[
                          styles.radioOuter,
                          { borderColor: isSelected ? '#3b82f6' : muted, backgroundColor: 'transparent' },
                        ]}
                      >
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                    <Text style={[styles.optionText, { color: text, fontSize: 14 * zoomLevel, lineHeight: 22 * zoomLevel }]}>
                      {option.replace(/^Option\s[A-D]:\s*/, '')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActionDock, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Pressable
          style={[styles.tbBottomBtn, styles.tbReviewBtn]}
          onPress={handleMarkReviewToggle}
        >
          <Text style={styles.tbBottomBtnText}>{reviewedQuestions[currentQuestion.id] ? 'Unmark Review' : 'Mark for Review'}</Text>
        </Pressable>

        <Pressable
          style={[styles.tbBottomSmallBtn, currentQuestionIndex === 0 && { opacity: 0.5 }]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <Text style={styles.tbBottomBtnText}>Prev</Text>
        </Pressable>

        <Pressable
          style={[styles.tbBottomBtn, styles.tbSaveBtn, currentQuestionIndex === examQuestions.length - 1 && { opacity: 0.65 }]}
          onPress={handleSaveAndNext}
          disabled={currentQuestionIndex === examQuestions.length - 1}
        >
          <Text style={styles.tbBottomBtnText}>Save & Next</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.paletteMenuTrigger}
        onPress={() => setIsPaletteVisible(true)}
        hitSlop={8}
      >
        <Ionicons name="menu" size={18} color="#ffffff" />
      </Pressable>

      <Modal visible={isPaletteVisible} transparent animationType="fade" onRequestClose={() => setIsPaletteVisible(false)}>
        <View style={styles.modalWrap}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsPaletteVisible(false)} />

          <View style={[styles.palettePanel, { backgroundColor: card, borderColor: border }]}>
            <View style={[styles.paletteExamMeta, { borderBottomColor: border }]}> 
              <Text style={[styles.paletteExamMetaText, { color: text }]} numberOfLines={1}>{mockData.title}</Text>
              <Pressable style={styles.paletteCloseIconBtn} onPress={() => setIsPaletteVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={18} color={text} />
              </Pressable>
            </View>

                <View style={styles.palettePartRow}>
                  <View style={styles.palettePartButtonsRow}>
                    {sectionNames.map((section) => (
                      <Pressable
                        key={`part-${section}`}
                        style={[
                          styles.palettePartBadge,
                          { backgroundColor: activeSection === section ? '#16a34a' : '#2563eb' },
                        ]}
                        onPress={() => {
                          setActiveSection(section);
                          const firstIdx = examQuestions.findIndex((q) => q.section === section);
                          if (firstIdx >= 0) {
                            navigateToQuestion(firstIdx);
                          }
                        }}
                      >
                        <Text style={styles.palettePartBadgeText}>{section}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={[styles.paletteAnsweredStrip, { borderColor: border }]}> 
                  <Text style={[styles.paletteAnsweredLabel, { color: '#374151' }]}>Total Questions Answered: </Text>
                  <Text style={styles.paletteAnsweredValue}>{answeredCount}</Text>
                </View>

                <Text style={[styles.paletteSectionHeading, { color: text }]}> 
                  {SECTION_SUBJECTS[activeSection]}
                </Text>

                <ScrollView contentContainerStyle={styles.paletteBody}>
                  <View style={styles.paletteGrid}>
                    {sectionQuestions.map((q) => {
                      const globalIndex = examQuestions.findIndex((question) => question.id === q.id);
                      const status = getStatus(q.id);
                      const styleMeta = statusStyle(status);
                      const isCurrent = q.id === currentQuestion.id;

                      return (
                        <Pressable
                          key={`q-${q.id}`}
                          style={[
                            styles.paletteQuestion,
                            {
                              backgroundColor: styleMeta.bg,
                              borderColor: isCurrent ? '#1e3a8a' : styleMeta.borderColor,
                              borderWidth: isCurrent ? 2 : 1,
                            },
                          ]}
                          onPress={() => {
                            navigateToQuestion(globalIndex);
                            setIsPaletteVisible(false);
                          }}
                        >
                          <Text style={[styles.paletteQuestionText, { color: styleMeta.textColor }]}>{q.id}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                <View style={[styles.analysisBox, { borderTopColor: border }]}> 
                  <Text style={styles.analysisBandTitle}>{activeSection} Analysis</Text>
                  <View style={[styles.analysisTableRow, { borderColor: border }]}> 
                    <Text style={[styles.analysisTableLabel, { color: text }]}>Answered</Text>
                    <Text style={styles.analysisTableValue}>{sectionAnsweredCount}</Text>
                  </View>
                  <View style={[styles.analysisTableRow, { borderColor: border }]}> 
                    <Text style={[styles.analysisTableLabel, { color: text }]}>Not Answered</Text>
                    <Text style={styles.analysisTableValue}>{sectionNotAnsweredCount}</Text>
                  </View>
                  <View style={[styles.analysisTableRow, { borderColor: border }]}> 
                    <Text style={[styles.analysisTableLabel, { color: text }]}>Mark for Review</Text>
                    <Text style={styles.analysisTableValue}>{sectionReviewCount}</Text>
                  </View>
                </View>

                <View style={styles.paletteFooterSubmitWrap}>
                  <Pressable style={styles.paletteFooterSubmit} onPress={handleSubmit}>
                    <Text style={styles.paletteFooterSubmitText}>Submit Test</Text>
                  </Pressable>
                </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPauseConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsPauseConfirmVisible(false)}
      >
        <View style={styles.languageModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsPauseConfirmVisible(false)} />
          <View style={[styles.pauseCard, { backgroundColor: card, borderColor: border }]}>
            <Text style={[styles.pauseTitle, { color: text }]}>Pause Test</Text>
            <Text style={[styles.pauseMessage, { color: muted }]}>Do you really want to pause the test?</Text>
            <View style={styles.pauseActionsRow}>
              <Pressable
                style={[styles.pauseActionBtn, styles.pauseCancelBtn]}
                onPress={() => setIsPauseConfirmVisible(false)}
              >
                <Text style={styles.pauseCancelText}>No</Text>
              </Pressable>
              <Pressable
                style={[styles.pauseActionBtn, styles.pauseConfirmBtn]}
                onPress={handlePauseConfirm}
              >
                <Text style={styles.pauseConfirmText}>Yes, Pause</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isTestPaused}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.pausedOverlay}>
          <View style={styles.pausedPopup}>
            <Text style={styles.pausedTitle}>Test Paused</Text>
            <Text style={styles.pausedText}>Timer is stopped. Tap Resume to continue your test.</Text>
            <Pressable style={styles.resumeBtn} onPress={handleResumeTest}>
              <Text style={styles.resumeBtnText}>Resume</Text>
            </Pressable>
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
            style={[
              styles.submitModalCard,
              {
                backgroundColor: card,
                borderColor: border,
                maxWidth: isCompact ? screenWidth - 20 : 1120,
                padding: isCompact ? 10 : 18,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <Text style={[styles.submitModalTitle, { color: text, fontSize: isCompact ? 20 : 28 }]}>Submit your test</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.submitTableScroll}>
              <View style={[styles.submitTable, { borderColor: border, minWidth: isCompact ? 700 : 980 }]}> 
                <View style={[styles.submitTableHeaderRow, { backgroundColor: '#10b981' }]}>
                  <Text style={[styles.submitHeaderCellSection, { width: isCompact ? 220 : 300, fontSize: isCompact ? 14 : 18 }]}>Section</Text>
                  <Text style={[styles.submitHeaderCell, { width: isCompact ? 96 : 136, fontSize: isCompact ? 12 : 17 }]}>No. of questions</Text>
                  <Text style={[styles.submitHeaderCell, { width: isCompact ? 90 : 136, fontSize: isCompact ? 12 : 17 }]}>Answered</Text>
                  <Text style={[styles.submitHeaderCell, { width: isCompact ? 96 : 136, fontSize: isCompact ? 12 : 17 }]}>Not Answered</Text>
                  <Text style={[styles.submitHeaderCell, { width: isCompact ? 108 : 136, fontSize: isCompact ? 12 : 17 }]}>Marked for Review</Text>
                  <Text style={[styles.submitHeaderCell, { width: isCompact ? 90 : 136, fontSize: isCompact ? 12 : 17 }]}>Not Visited</Text>
                </View>

                {submitTableRows.map((row) => (
                  <View key={`submit-${row.section}`} style={[styles.submitTableRow, { borderTopColor: border }]}>
                    <Text style={[styles.submitCellSection, { color: text, width: isCompact ? 220 : 300, fontSize: isCompact ? 13 : 17, lineHeight: isCompact ? 18 : 24 }]}>{row.subject}</Text>
                    <Text style={[styles.submitCell, { color: text, width: isCompact ? 96 : 136, fontSize: isCompact ? 14 : 17 }]}>{row.total}</Text>
                    <Text style={[styles.submitCell, { color: text, width: isCompact ? 90 : 136, fontSize: isCompact ? 14 : 17 }]}>{row.answered}</Text>
                    <Text style={[styles.submitCell, { color: text, width: isCompact ? 96 : 136, fontSize: isCompact ? 14 : 17 }]}>{row.notAnswered}</Text>
                    <Text style={[styles.submitCell, { color: text, width: isCompact ? 108 : 136, fontSize: isCompact ? 14 : 17 }]}>{row.markedForReview}</Text>
                    <Text style={[styles.submitCell, { color: text, width: isCompact ? 90 : 136, fontSize: isCompact ? 14 : 17 }]}>{row.notVisited}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.submitActionsRowTable}>
              <Pressable
                style={[styles.submitActionBtnTable, styles.submitActionBtnClose, isCompact && { minWidth: 82, height: 40 }]}
                onPress={() => setIsSubmitModalVisible(false)}
              >
                <Text style={[styles.submitActionTextTable, isCompact && { fontSize: 16 }]}>Close</Text>
              </Pressable>
              <Pressable style={[styles.submitActionBtnTable, styles.submitActionBtnSubmit, isCompact && { minWidth: 82, height: 40 }]} onPress={handleFinalSubmit}>
                <Text style={[styles.submitActionTextTable, isCompact && { fontSize: 16 }]}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isInfoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsInfoModalVisible(false)}
      >
        <View style={styles.languageModalOverlay}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setIsInfoModalVisible(false)} />
          <View style={[styles.infoTableModalCard, { backgroundColor: '#f3f4f6', borderColor: border }]}>
            {infoModalType === 'symbols' ? (
              <>
                <Text style={styles.infoTableTopNote}>
                  The different symbols used in the next pages are shown below. Please go through them and understand their meaning before you start the test.
                </Text>

                <View style={[styles.infoTableHeaderRow, { backgroundColor: '#2563eb' }]}>
                  <Text style={styles.infoSymbolHeader}>Symbol</Text>
                  <Text style={styles.infoDescHeader}>Description</Text>
                </View>

                <ScrollView style={styles.infoTableBody} contentContainerStyle={{ paddingBottom: 8 }}>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolDotUnchosen} /></View>
                    <Text style={styles.infoDescCell}>Option Not chosen</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolDotBlueOuter}><View style={styles.symbolDotBlueInner} /></View></View>
                    <Text style={styles.infoDescCell}>Option chosen as correct (By clicking on it again you can delete your option and choose another option if desired.)</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={[styles.symbolBadge, { backgroundColor: '#1d4ed8' }]}><Text style={styles.symbolBadgeText}>12</Text></View></View>
                    <Text style={styles.infoDescCell}>Question number shown in blue color indicates that you have not yet attempted the question.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={[styles.symbolBadge, { backgroundColor: '#16a34a' }]}><Text style={styles.symbolBadgeText}>15</Text></View></View>
                    <Text style={styles.infoDescCell}>Question number shown in green color indicates that you have answered the question.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={[styles.symbolBadge, { backgroundColor: '#dc2626' }]}><Text style={styles.symbolBadgeText}>14</Text></View></View>
                    <Text style={styles.infoDescCell}>You have not yet answered the question, but marked it for coming back for review later, if time permits.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={[styles.symbolBadge, { backgroundColor: '#eab308' }]}><Text style={[styles.symbolBadgeText, { color: '#111827' }]}>15</Text></View></View>
                    <Text style={styles.infoDescCell}>You have answered the question, but marked it for review later, if time permits.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolBtnSample}><Text style={styles.symbolBtnSampleText}>Save & Next</Text></View></View>
                    <Text style={styles.infoDescCell}>Clicking on this will take you to the next question.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolBtnSample}><Text style={styles.symbolBtnSampleText}>Previous</Text></View></View>
                    <Text style={styles.infoDescCell}>Clicking on this will take you to the previous question.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolBtnSample}><Text style={styles.symbolBtnSampleText}>Mark for Review</Text></View></View>
                    <Text style={styles.infoDescCell}>By clicking on this button, you can mark the question for review later. Please note that if you answer the question and mark for review, the question will be treated as answered and evaluated even if you do not review it.</Text>
                  </View>
                  <View style={styles.infoTableRow}>
                    <View style={styles.infoSymbolCell}><View style={styles.symbolBtnSample}><Text style={styles.symbolBtnSampleText}>Unmark Review</Text></View></View>
                    <Text style={styles.infoDescCell}>By clicking on this button, you can unmark the question for review.</Text>
                  </View>
                </ScrollView>

                <View style={styles.infoTableFooter}>
                  <Pressable style={styles.infoCloseBtn} onPress={() => setIsInfoModalVisible(false)}>
                    <Text style={styles.infoCloseBtnText}>Close</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={styles.instructionsWrap}>
                <View style={styles.instructionsTopRow}>
                  <Text style={styles.instructionsHeading}>Instructions, Terms & Conditions</Text>
                  <Pressable onPress={() => setIsInfoModalVisible(false)}>
                    <Text style={styles.instructionsCloseTop}>Close (x)</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.instructionsScroll} contentContainerStyle={styles.instructionsContent}>
                  <Text style={styles.instructionsSectionTitle}>1. Exam Overview / परीक्षा का संक्षिप्त विवरण</Text>
                  <Text style={styles.instructionsBullet}>- Duration: 60 minutes / समयावधि: 60 मिनट</Text>
                  <Text style={styles.instructionsBullet}>- Total Questions: 100 / कुल प्रश्न: 100</Text>
                  <Text style={styles.instructionsBullet}>- Negative Marking: 0.50 marks deducted for each wrong answer. / ऋणात्मक अंकन: प्रत्येक गलत उत्तर पर 0.50 अंक काटे जाएंगे।</Text>
                  <Text style={styles.instructionsBullet}>- Number of Sections displayed at any time: 4 / किसी भी समय पर प्रदर्शित अनुभागों की संख्या: 4</Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.instructionsTableScrollContent}
                  >
                    <View style={styles.instructionsSectionTable}>
                      <View style={[styles.instructionsTableRow, styles.instructionsTableHead]}>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSection]}>Section</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSubject]}>Subject</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellCount]}>Number of Questions</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellMarks]}>Maximum Marks</Text>
                      </View>
                      <View style={styles.instructionsTableRow}>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSection]}>PART-A</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSubject]}>General Awareness</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellCount]}>25</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellMarks]}>50</Text>
                      </View>
                      <View style={styles.instructionsTableRow}>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSection]}>PART-B</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSubject]}>Quantitative Aptitude</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellCount]}>25</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellMarks]}>50</Text>
                      </View>
                      <View style={styles.instructionsTableRow}>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSection]}>PART-C</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSubject]}>General Intelligence & Reasoning</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellCount]}>25</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellMarks]}>50</Text>
                      </View>
                      <View style={styles.instructionsTableRow}>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSection]}>PART-D</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellSubject]}>English Comprehension</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellCount]}>25</Text>
                        <Text style={[styles.instructionsTableCell, styles.instructionsCellMarks]}>50</Text>
                      </View>
                    </View>
                  </ScrollView>

                  <Text style={styles.instructionsSectionTitle}>2. Timing & Submission / समय और उत्तर जमा करना</Text>
                  <Text style={styles.instructionsBullet}>- The timer (top right) is server-controlled; Remaining time appears top right.</Text>
                  <Text style={styles.instructionsBullet}>  ऊपर दाईं तरफ़ टाइमर सर्वर-नियंत्रित है; शेष समय वहीं दिखेगा।</Text>
                  <Text style={styles.instructionsBullet}>- The exam auto-submits when time ends; no manual submission required.</Text>
                  <Text style={styles.instructionsBullet}>  समय समाप्त होने पर परीक्षा स्वतः सबमिट हो जाएगी - मैन्युअल सबमिशन की आवश्यकता नहीं है।</Text>
                  <Text style={styles.instructionsBullet}>- At the end, you may be asked to take a photo (ensure your face is aligned with area delineated). After seeing the "Thank you" message, raise your hand and on approval proceed for exit verification.</Text>
                  <Text style={styles.instructionsBullet}>  अंत में, आपसे एक फोटो लेने को कहा जा सकता है (सुनिश्चित करें कि आपका चेहरा चिन्हित क्षेत्र के भीतर हो)। "Thank you" संदेश दिखाने के बाद, अपना हाथ उठाएं और स्वीकृति मिलने के बाद ही बाहर निकलने की प्रक्रिया पूरी करें।</Text>

                  <Text style={styles.instructionsSectionTitle}>3. Language / भाषा</Text>
                  <Text style={styles.instructionsBullet}>- Only one comprehension section (Hindi or English) appears as per your initial choice; this cannot be changed during the exam.</Text>
                  <Text style={styles.instructionsBullet}>  केवल एक समझ-बूझ (कॉम्प्रिहेंशन) अनुभाग आपकी प्रारंभिक भाषा चयन (हिंदी या अंग्रेजी) के अनुसार दिखाई देगा; इसे परीक्षा के दौरान बदला नहीं जा सकता।</Text>
                  <Text style={styles.instructionsBullet}>- Other MCQ sections may be displayed in English, Hindi, or both, based on your language selection.</Text>
                  <Text style={styles.instructionsBullet}>  अन्य MCQ अनुभाग अंग्रेज़ी, हिंदी या दोनों में आपकी भाषा चयन के अनुसार प्रदर्शित हो सकते हैं।</Text>

                  <Text style={styles.instructionsSectionTitle}>4. Navigation / नेविगेशन (परीक्षा में चलना)</Text>
                  <Text style={styles.instructionsBullet}>- All sections are always visible, you can move freely between sections or questions in any order by clicking section names (top left) or question numbers.</Text>
                  <Text style={styles.instructionsBullet}>  सभी अनुभाग हमेशा दिखाई देते हैं; आप किसी भी अनुभाग या प्रश्न पर सीधे क्लिक कर के जा सकते हैं।</Text>
                  <Text style={styles.instructionsBullet}>- Use Previous or Save & Next to move between questions; use Mark for Review button to flag questions you wish to revisit later.</Text>
                  <Text style={styles.instructionsBullet}>  प्रश्नों के बीच जाने के लिए Previous या Save & Next का उपयोग करें; किसी प्रश्न को बाद में देखने के लिए Mark for Review बटन दबाएं।</Text>
                  <Text style={styles.instructionsBullet}>- After the last question in a section, Save & Next takes you to the next section.</Text>
                  <Text style={styles.instructionsBullet}>  किसी अनुभाग का अंतिम प्रश्न पूरा करने के बाद Save & Next अगला अनुभाग खोलता है।</Text>

                  <Text style={styles.instructionsSectionTitle}>5. Answering / उत्तर देना</Text>
                  <Text style={styles.instructionsBullet}>- Each question has four options, out of which only one is correct. Select or change your answer at any time before saving.</Text>
                  <Text style={styles.instructionsBullet}>  हर प्रश्न में चार विकल्प होते हैं, जिनमें से केवल एक ही सही होता है। सेव करने से पहले आप कभी भी समय अपना उत्तर चुनें या बदलें।</Text>
                  <Text style={styles.instructionsBullet}>- Answers are saved only after clicking Save & Next.</Text>
                  <Text style={styles.instructionsBullet}>  उत्तर पूर्ण व सही, लेकिन Save & Next पर क्लिक करने के बाद ही उत्तर सुरक्षित होता है।</Text>
                  <Text style={styles.instructionsBullet}>- To deselect an answer, click the selected option again or use Clear Response.</Text>
                  <Text style={styles.instructionsBullet}>  उत्तर को अनचयनित करने के लिए, चयनित विकल्प पर फिर से क्लिक करें या Clear Response का उपयोग करें।</Text>

                  <Text style={styles.instructionsSectionTitle}>6. Additional Notes / अतिरिक्त निर्देश</Text>
                  <Text style={styles.instructionsBullet}>- Maintain silence in the exam hall and do not engage in any communication with other candidates.</Text>
                  <Text style={styles.instructionsBullet}>  परीक्षा कक्ष में शांति बनाए रखें और अन्य उम्मीदवारों से बात न करें।</Text>
                  <Text style={styles.instructionsBullet}>- The system saves responses for each question and auto-submits when time ends.</Text>
                  <Text style={styles.instructionsBullet}>  हर उत्तर स्वचालित रूप से सिस्टम में सुरक्षित होता है और समय समाप्त होते ही स्वचालित रूप से जमा हो जाता है।</Text>
                  <Text style={styles.instructionsBullet}>- If you have any queries regarding exam content, raise your hand and seek invigilator assistance without disturbing others.</Text>
                  <Text style={styles.instructionsBullet}>  परीक्षा सामग्री से संबंधित कोई प्रश्न हो, तो हाथ उठाकर निरीक्षक से सहायता लें; दूसरों को परेशान न करें।</Text>
                  <Text style={styles.instructionsBullet}>- In case of a technical issue (system hang, network loss, or power failure), immediately inform the invigilator without attempting to resolve it on your own.</Text>
                  <Text style={styles.instructionsBullet}>  तकनीकी समस्या (सिस्टम हैंग, नेटवर्क फेल या बिजली चली जाना) होने पर निरीक्षक को तुरंत सूचित करें; स्वयं हल करने का प्रयास न करें।</Text>
                  <Text style={styles.instructionsBullet}>- Bathroom breaks or leaving your seat are not allowed during the exam.</Text>
                  <Text style={styles.instructionsBullet}>  परीक्षा के दौरान वाशरूम ब्रेक या सीट छोड़ने की अनुमति नहीं है।</Text>
                  <Text style={styles.instructionsBullet}>- All exam materials (Rough sheets, pens) provided must be returned to the invigilator before exiting the exam hall.</Text>
                  <Text style={styles.instructionsBullet}>  सभी परीक्षा सामग्री (रफ शीट, पेन) परीक्षा समाप्त होने पर निरीक्षक को लौटानी होगी।</Text>
                  <Text style={styles.instructionsBullet}>- Do not attempt to capture screenshots or take photos of the exam screen at any time.</Text>
                  <Text style={styles.instructionsBullet}>  किसी भी समय परीक्षा स्क्रीन की तस्वीर या स्क्रीनशॉट लेने का प्रयास न करें।</Text>
                </ScrollView>

                <View style={styles.infoTableFooter}>
                  <Pressable style={styles.infoCloseBtn} onPress={() => setIsInfoModalVisible(false)}>
                    <Text style={styles.infoCloseBtnText}>Close</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
  tbHeaderRow: {
    minHeight: 48,
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tbBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tbBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tbBrandText: {
    color: '#0ea5e9',
    fontWeight: '800',
    fontSize: 27,
    lineHeight: 30,
  },
  tbHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tbTimeLabel: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  tbTimeBadge: {
    backgroundColor: '#fef08a',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  tbTimeText: {
    color: '#dc2626',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 26,
  },
  tbPauseBtn: {
    width: 30,
    height: 30,
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
  },
  examTitleStrip: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  examTitleText: {
    color: '#111827',
    fontSize: 21,
    fontWeight: '500',
  },
  mainExamArea: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 80,
  },
  questionPanel: {
    marginTop: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 2,
  },
  questionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  questionTopSpacer: {
    flex: 1,
  },
  questionTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inlineLanguageBtn: {
    minWidth: 98,
    height: 28,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineLanguageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineWarnBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineReportBtn: {
    height: 28,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  inlineReportText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  inlineDropdown: {
    alignSelf: 'flex-end',
    width: 170,
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 4,
  },
  reportDropdown: {
    width: 190,
  },
  inlineDropdownItem: {
    minHeight: 40,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inlineDropdownItemText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionsWrap: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  optionRadioSlot: {
    width: 42,
    borderRightWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    alignSelf: 'stretch',
  },
  bottomActionDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#e5e7eb',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  tbBottomBtn: {
    height: 36,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tbReviewBtn: {
    backgroundColor: '#2563eb',
    minWidth: 112,
  },
  tbBottomSmallBtn: {
    height: 36,
    borderRadius: 3,
    backgroundColor: '#2563eb',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  tbSaveBtn: {
    backgroundColor: '#2563eb',
    minWidth: 102,
  },
  tbBottomBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  paletteMenuTrigger: {
    position: 'absolute',
    right: 8,
    bottom: 72,
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  paletteExamMeta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paletteExamMetaText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  paletteCloseIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteTopTabs: {
    minHeight: 44,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
  },
  paletteTopTabBlue: {
    fontSize: 12,
    color: '#0ea5e9',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  paletteTopTabRed: {
    fontSize: 12,
    color: '#b91c1c',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  palettePartRow: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  palettePartScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  palettePartBadge: {
    backgroundColor: '#16a34a',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  palettePartBadgeText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  paletteCancelText: {
    color: '#0ea5e9',
    fontSize: 12,
    fontWeight: '600',
  },
  paletteAnsweredStrip: {
    marginHorizontal: 12,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paletteAnsweredLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  paletteAnsweredValue: {
    fontSize: 14,
    color: '#eab308',
    fontWeight: '800',
  },
  paletteSectionHeading: {
    fontSize: 20,
    fontWeight: '500',
    marginTop: 10,
    marginHorizontal: 12,
  },
  analysisBandTitle: {
    backgroundColor: '#d1d5db',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 3,
    marginBottom: 0,
  },
  analysisTableRow: {
    borderWidth: 1,
    borderTopWidth: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 28,
    paddingHorizontal: 8,
  },
  analysisTableLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  analysisTableValue: {
    fontSize: 18,
    color: '#eab308',
    fontWeight: '700',
  },
  paletteFooterSubmitWrap: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
  },
  paletteFooterSubmit: {
    backgroundColor: '#2563eb',
    borderRadius: 3,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteFooterSubmitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  instructionsWrap: {
    flex: 1,
  },
  instructionsTopRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#d2b48c',
  },
  instructionsHeading: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
  },
  instructionsCloseTop: {
    color: '#1d4ed8',
    fontSize: 12,
    textDecorationLine: 'underline',
    fontWeight: '700',
  },
  instructionsScroll: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  instructionsContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  instructionsSectionTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 6,
  },
  instructionsBullet: {
    color: '#111827',
    fontSize: 13,
    lineHeight: 21,
    marginBottom: 4,
  },
  instructionsSectionTable: {
    borderWidth: 1,
    borderColor: '#c0c7d1',
    marginTop: 8,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
    minWidth: 620,
  },
  instructionsTableScrollContent: {
    paddingRight: 4,
  },
  instructionsTableRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: 1,
    borderTopColor: '#c0c7d1',
  },
  instructionsTableHead: {
    backgroundColor: '#e5e7eb',
    borderTopWidth: 0,
  },
  instructionsTableCell: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#c0c7d1',
    textAlignVertical: 'center',
  },
  instructionsCellSection: {
    width: 72,
    fontWeight: '700',
  },
  instructionsCellSubject: {
    flex: 1,
    minWidth: 210,
    fontWeight: '500',
  },
  instructionsCellCount: {
    width: 150,
    textAlign: 'center',
    fontWeight: '600',
  },
  instructionsCellMarks: {
    width: 130,
    textAlign: 'center',
    borderRightWidth: 0,
    fontWeight: '600',
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
  timerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#fde047',
    backgroundColor: '#fef08a',
    paddingVertical: 3,
    paddingHorizontal: 6,
    maxWidth: 128,
  },
  timerLabel: {
    color: '#374151',
    fontSize: 9,
    fontWeight: '700',
    marginRight: 4,
  },
  timerText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
    letterSpacing: 0.2,
  },
  pauseBtn: {
    width: 26,
    height: 26,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#fef08a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseBtnDisabled: {
    opacity: 0.6,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  utilityBarCompact: {
    flexWrap: 'wrap',
    rowGap: 8,
  },
  infoTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  infoTabLink: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
    letterSpacing: 0.6,
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
    height: 36,
    paddingHorizontal: 4,
    marginRight: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  sectionTab: {
    borderWidth: 1,
    borderRadius: 6,
    minWidth: 84,
    height: 34,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTabSubText: {
    marginTop: 1,
    fontSize: 9,
    fontWeight: '700',
  },
  mainContent: {
    padding: 12,
    paddingBottom: 90,
  },
  mainContentFullscreen: {
    paddingTop: 8,
  },
  questionCard: {
    borderWidth: 1,
    borderRadius: 2,
    padding: 12,
  },
  questionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionNo: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
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
    fontWeight: '400',
    marginBottom: 14,
  },
  questionTextScroll: {
    maxHeight: 160,
    marginBottom: 8,
  },
  questionTextScrollContent: {
    paddingRight: 2,
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
    borderBottomWidth: 1,
    marginBottom: 0,
    minHeight: 48,
    paddingVertical: 8,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
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
    flex: 1,
    minWidth: 0,
  },
  prevBtnText: {
    color: '#ffffff',
    paddingHorizontal: 8,
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
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
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
  pauseCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pauseTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  pauseMessage: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  pauseActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  pauseActionBtn: {
    minWidth: 90,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pauseCancelBtn: {
    backgroundColor: '#e2e8f0',
  },
  pauseConfirmBtn: {
    backgroundColor: '#f59e0b',
  },
  pauseCancelText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
  },
  pauseConfirmText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  pausedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  pausedPopup: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#94a3b8',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pausedTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  pausedText: {
    color: '#334155',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 14,
  },
  resumeBtn: {
    minWidth: 120,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  resumeBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  submitModalCard: {
    width: '100%',
    maxWidth: 1120,
    borderRadius: 10,
    borderWidth: 1,
    padding: 18,
  },
  submitModalTitle: {
    fontSize: 28,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 14,
  },
  submitTableScroll: {
    maxHeight: 360,
    marginBottom: 14,
  },
  submitTable: {
    minWidth: 980,
    borderWidth: 1,
  },
  submitTableHeaderRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  submitHeaderCellSection: {
    width: 300,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  submitHeaderCell: {
    width: 136,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  submitTableRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  submitCellSection: {
    width: 300,
    fontSize: 17,
    textAlign: 'center',
    paddingHorizontal: 8,
    lineHeight: 24,
  },
  submitCell: {
    width: 136,
    fontSize: 17,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  submitActionsRowTable: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 2,
  },
  submitActionBtnTable: {
    minWidth: 96,
    height: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitActionBtnClose: {
    backgroundColor: '#34d399',
  },
  submitActionBtnSubmit: {
    backgroundColor: '#10b981',
  },
  submitActionTextTable: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  palettePanel: {
    height: '100%',
    width: '82%',
    maxWidth: 360,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  paletteHeader: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  palettePartButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  symbolLegendWrap: {
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    backgroundColor: '#f8fafc',
  },
  symbolLegendTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    backgroundColor: '#ecfeff',
  },
  symbolLegendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  symbolLegendLabel: {
    width: 105,
    color: '#1d4ed8',
    fontSize: 12,
    fontWeight: '700',
  },
  symbolLegendDesc: {
    flex: 1,
    color: '#334155',
    fontSize: 12,
    lineHeight: 18,
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
    paddingBottom: 10,
    paddingTop: 8,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 0,
  },
  paletteQuestion: {
    width: 24,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 24,
    marginBottom: 16,
  },
  paletteQuestionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  analysisBox: {
    borderTopWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  infoTableModalCard: {
    width: '100%',
    maxWidth: 900,
    maxHeight: '90%',
    borderWidth: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  infoTableTopNote: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#d2b48c',
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  infoTableHeaderRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoSymbolHeader: {
    width: 132,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  infoDescHeader: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  infoTableBody: {
    backgroundColor: '#f3f4f6',
  },
  infoTableRow: {
    flexDirection: 'row',
    minHeight: 40,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  infoSymbolCell: {
    width: 132,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  infoDescCell: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  symbolDotUnchosen: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: 'transparent',
  },
  symbolDotBlueOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.8,
    borderColor: '#0ea5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolDotBlueInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0ea5e9',
  },
  symbolBadge: {
    minWidth: 28,
    height: 16,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  symbolBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  symbolBtnSample: {
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    minHeight: 22,
    minWidth: 78,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  symbolBtnSampleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  infoTableFooter: {
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'flex-end',
    backgroundColor: '#f3f4f6',
  },
  infoCloseBtn: {
    backgroundColor: '#0284c7',
    minWidth: 58,
    minHeight: 30,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  infoCloseBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
