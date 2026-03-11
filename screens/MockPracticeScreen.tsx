import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');

// Mock Questions Data
const MOCK_QUESTIONS = [
  {
    id: 1,
    questionText: 'Select the most appropriate ANTONYM of the given word. Hinder',
    options: ['Facilitate', 'Block', 'Praise', 'Joy'],
  },
  {
    id: 2,
    questionText: 'What is the synonym of "Abundant"?',
    options: ['Plentiful', 'Scarce', 'Rare', 'Deficient'],
  },
  {
    id: 3,
    questionText: 'Which of the following sentences is grammatically correct?',
    options: ['He do not like apples.', 'She doesn\'t likes apples.', 'They does not like apples.', 'He does not like apples.'],
  },
];

export default function MockPracticeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();

  const mockData = route.params?.mockData || {
    title: 'ENGLISH COMPREHENSION',
    questions: 15,
    duration: 15,
  };

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<number, boolean>>({ [MOCK_QUESTIONS[0].id]: true });
  const [reviewedQuestions, setReviewedQuestions] = useState<Record<number, boolean>>({});
  const [timeLeft, setTimeLeft] = useState(mockData.duration * 60);
  const [isPaletteVisible, setIsPaletteVisible] = useState(false);

  // Theme Colors
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669'; // Brand green
  const primaryLight = isDark ? '#064e3b' : '#d1fae5';

  const currentQuestion = MOCK_QUESTIONS[currentQuestionIndex];

  // Timer Effect
  useEffect(() => {
    if (timeLeft <= 0) {
       // Handle Auto-submit
       navigation.navigate('Main');
       return;
    }
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, navigation]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optIndex: number) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [currentQuestion.id]: optIndex,
    }));
  };

  const handleClearResponse = () => {
    const newOptions = { ...selectedOptions };
    delete newOptions[currentQuestion.id];
    setSelectedOptions(newOptions);
  };

  const handleMarkForReview = () => {
    setReviewedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: !prev[currentQuestion.id],
    }));
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setVisitedQuestions((prev) => ({
      ...prev,
      [MOCK_QUESTIONS[index].id]: true,
    }));
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < MOCK_QUESTIONS.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      navigateToQuestion(currentQuestionIndex - 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? insets.top : 24 }]}>
      {/* HEADER */}
      <View style={[styles.header, { borderColor: border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: primary }]} numberOfLines={1}>{mockData.title.toUpperCase()}</Text>
          <View style={[styles.headerTitleUnderline, { backgroundColor: primary }]} />
        </View>

        <View style={styles.headerRight}>
           <View style={[styles.timerBadge, { backgroundColor: card, borderColor: border }]}>
             <Ionicons name="time-outline" size={12} color={text} style={{ marginRight: 4 }} />
             <Text style={[styles.timerText, { color: text }]}>{formatTime(timeLeft)}</Text>
           </View>

           <Pressable style={[styles.submitBtn, { backgroundColor: primary }]}>
             <Text style={styles.submitBtnText}>SUBMIT</Text>
           </Pressable>
        </View>
      </View>

      {/* QUESTION STATS BAR */}
      <View style={[styles.statsBar, { borderColor: border }]}>
         <Text style={[styles.questionCounter, { color: textMuted }]}>
           QUESTION <Text style={[styles.questionCounterBold, { color: text }]}>{currentQuestionIndex + 1}</Text> of {MOCK_QUESTIONS.length}
         </Text>
         <Pressable style={styles.paletteTrigger} onPress={() => setIsPaletteVisible(true)}>
            <Ionicons name="grid" size={18} color={primary} />
         </Pressable>
      </View>

      {/* MAIN CONTENT AREA */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
         <View style={styles.centerWrapper}>
            <View style={styles.sectionBadge}>
              <Ionicons name="extension-puzzle-outline" size={14} color={primary} style={{ marginRight: 4 }} />
              <Text style={[styles.sectionBadgeText, { color: primary }]}>SECTION {mockData.title.toUpperCase()}</Text>
            </View>

            <Text style={[styles.questionText, { color: text }]}>
              {currentQuestion.questionText}
            </Text>

            <View style={styles.optionsList}>
              {currentQuestion.options.map((opt, idx) => {
                const isSelected = selectedOptions[currentQuestion.id] === idx;
                const letter = String.fromCharCode(65 + idx); // A, B, C, D
                
                return (
                  <Pressable 
                    key={idx}
                    style={[
                      styles.optionCard, 
                      { 
                        borderColor: isSelected ? primary : border, 
                        backgroundColor: isSelected ? primaryLight : card 
                      }
                    ]}
                    onPress={() => handleSelectOption(idx)}
                  >
                    <View style={[
                      styles.optionLetterBox, 
                      { 
                        backgroundColor: isSelected ? primary : bg,
                        borderColor: isDark && !isSelected ? border : 'transparent'
                      }
                    ]}>
                      <Text style={[styles.optionLetter, { color: isSelected ? '#fff' : text }]}>{letter}</Text>
                    </View>
                    <Text style={[styles.optionText, { color: text }]}>{opt}</Text>
                  </Pressable>
                );
              })}
            </View>
         </View>
      </ScrollView>

      {/* BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: card, borderColor: border, paddingBottom: Platform.OS === 'ios' ? insets.bottom || 16 : 16 }]}>
         <View style={styles.bottomLeft}>
           <Pressable 
             style={[
               styles.actionBtn, 
               { borderColor: border, backgroundColor: reviewedQuestions[currentQuestion.id] ? primaryLight : 'transparent' }
             ]} 
             onPress={handleMarkForReview}
             hitSlop={8}
           >
             <Ionicons 
               name={reviewedQuestions[currentQuestion.id] ? "flag" : "flag-outline"} 
               size={16} 
               color={reviewedQuestions[currentQuestion.id] ? primary : textMuted} 
             />
           </Pressable>
           <Pressable style={[styles.actionBtn, { borderColor: border }]} onPress={handleClearResponse} hitSlop={8}>
             <Ionicons name="refresh-outline" size={16} color={textMuted} />
           </Pressable>
         </View>

         <View style={styles.bottomRight}>
           <Pressable 
             style={[styles.navBtn, { backgroundColor: card, borderColor: border }]}
             onPress={handlePrevious}
             disabled={currentQuestionIndex === 0}
            >
             <Ionicons name="chevron-back" size={20} color={currentQuestionIndex === 0 ? border : text} />
           </Pressable>
           <Pressable 
             style={[styles.saveNextBtn, { backgroundColor: primary }]}
             onPress={handleSaveAndNext}
            >
             <Text style={styles.saveNextText}>SAVE & NEXT</Text>
             <Ionicons name="arrow-forward" size={16} color="#fff" />
           </Pressable>
         </View>
      </View>

      {/* MOBILE SECTION PALETTE OVERLAY (Slide from right) */}
      {isPaletteVisible && (
        <View style={styles.overlay}>
           <Pressable style={styles.overlayBg} onPress={() => setIsPaletteVisible(false)} />
           <View style={[styles.paletteDrawer, { backgroundColor: card }]}>
              <View style={[styles.paletteHeader, { borderColor: border }]}>
                 <View>
                   <Text style={[styles.paletteTitle, { color: text }]}>SECTION PALETTE</Text>
                   <Text style={[styles.paletteSubtitle, { color: primary }]}>{mockData.title.toUpperCase()}</Text>
                 </View>
                 <Pressable style={styles.closeBtn} onPress={() => setIsPaletteVisible(false)}>
                   <Ionicons name="close" size={24} color={text} />
                 </Pressable>
              </View>

              <ScrollView contentContainerStyle={styles.paletteScroll}>
                 <View style={styles.paletteGrid}>
                   {MOCK_QUESTIONS.map((q, idx) => {
                     const isVisited = visitedQuestions[q.id];
                     const isAnswered = selectedOptions[q.id] !== undefined;
                     const isReviewed = reviewedQuestions[q.id];
                     const isCurrent = currentQuestionIndex === idx;

                     // Determine styling
                     let bgColor = bg;        // Default Unvisited
                     let txtColor = text;
                     let bColor = 'transparent';

                     if (!isVisited) {
                        bgColor = bg;
                        txtColor = text;
                        bColor = 'transparent';
                     } else if (isReviewed) {
                        bgColor = '#8b5cf6'; // Purple for review
                        txtColor = '#fff';
                        bColor = '#8b5cf6';
                     } else if (isAnswered) {
                        bgColor = primary;
                        txtColor = '#fff';
                        bColor = primary;
                     } else {
                        // Visited but Unanswered
                        bgColor = '#ef4444'; // Red
                        txtColor = '#fff';
                        bColor = '#ef4444';
                     }

                     if (isCurrent && !isAnswered && !isReviewed) {
                        // Override for currently active empty bubble visual clarity
                        bColor = isDark ? border : '#94a3b8';
                        if (!isVisited) bColor = 'transparent'; 
                     }

                     return (
                       <Pressable 
                         key={q.id}
                         style={[
                           styles.paletteBubble, 
                           { 
                             backgroundColor: bgColor, 
                             borderColor: isCurrent ? text : bColor,
                             borderWidth: isCurrent ? 2 : 1 
                           }
                         ]}
                         onPress={() => {
                           navigateToQuestion(idx);
                           setIsPaletteVisible(false);
                         }}
                       >
                         <Text style={[styles.paletteBubbleText, { color: txtColor }]}>{idx + 1}</Text>
                       </Pressable>
                     );
                   })}
                 </View>
              </ScrollView>

              <View style={[styles.paletteLegend, { borderColor: border }]}>
                 <View style={styles.legendRow}>
                   <View style={styles.legendItem}>
                     <View style={[styles.legendDot, { backgroundColor: primary }]} />
                     <Text style={[styles.legendText, { color: text }]}>ANSWERED</Text>
                   </View>
                   <View style={styles.legendItem}>
                     <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                     <Text style={[styles.legendText, { color: text }]}>UNANSWERED</Text>
                   </View>
                 </View>
                 <View style={[styles.legendRow, { marginTop: 16 }]}>
                   <View style={styles.legendItem}>
                     <View style={[styles.legendDot, { backgroundColor: bg, borderWidth: 1, borderColor: border }]} />
                     <Text style={[styles.legendText, { color: text }]}>UNVISITED</Text>
                   </View>
                   <View style={styles.legendItem}>
                     <View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} />
                     <Text style={[styles.legendText, { color: text }]}>REVIEWED</Text>
                   </View>
                 </View>
              </View>
           </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    paddingBottom: 8,
    flex: 1, 
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerTitleUnderline: {
    height: 3,
    width: 24,
    borderRadius: 2,
    marginTop: 6,
    position: 'absolute',
    bottom: -13, // align with borderBottom
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  timerText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  questionCounter: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  questionCounterBold: {
    fontSize: 14,
  },
  paletteTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  paletteTriggerText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 24,
    paddingHorizontal: 16,
  },
  centerWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 800,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 32,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
  },
  optionLetterBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionLetter: {
    fontSize: 12,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  bottomLeft: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  bottomRight: {
    flexDirection: 'row',
    gap: 6,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveNextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  saveNextText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  paletteDrawer: {
    width: width * 0.85,
    maxWidth: 360,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
  },
  paletteTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  paletteSubtitle: {
    fontSize: 8,
    fontWeight: '800',
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  paletteScroll: {
    padding: 24,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  paletteBubble: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paletteBubbleText: {
    fontSize: 14,
    fontWeight: '800',
  },
  paletteLegend: {
    padding: 24,
    borderTopWidth: 1,
  },
  legendRow: {
    flexDirection: 'row',
  },
  legendItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
