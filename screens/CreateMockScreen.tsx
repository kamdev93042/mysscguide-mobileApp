import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';

const { width } = Dimensions.get('window');

const SUBJECTS = [
  { id: 'english', title: 'English Comprehension', topicsCount: 51, icon: 'chatbubble-ellipses' },
  { id: 'ga', title: 'General Awareness', topicsCount: 95, icon: 'globe' },
  { id: 'reasoning', title: 'General Intelligence & Reasoning', topicsCount: 86, icon: 'hardware-chip' },
  { id: 'quant', title: 'Quantitative Aptitude', topicsCount: 53, icon: 'calculator' },
];

const REASONING_TOPICS = [
  'Address Matching', 'Age Problems', 'Alphabet',
  'Alphabet Series', 'Alphabet Test', 'Alphabetical Order',
  'Alphabetical Reasoning', 'Alphanumeric Series', 'Analogy',
];

export default function CreateMockScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const { addChallenge } = useMocks();

  // Navigation State
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Form State
  const [mockName, setMockName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [numQuestions, setNumQuestions] = useState(25);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isPublic, setIsPublic] = useState(false);

  // Theme Colors
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669'; // The extracted brand green
  const primaryLight = isDark ? '#064e3b' : '#d1fae5';

  const toggleSubject = (id: string) => {
    if (selectedSubjects.includes(id)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== id));
    } else {
      setSelectedSubjects([...selectedSubjects, id]);
    }
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
    } else {
      setSelectedTopics([...selectedTopics, topic]);
    }
  };

  const handleCreate = () => {
    const finalName = mockName.trim() || 'Custom Mock';
    addChallenge({
      id: Math.random().toString(36).substring(7),
      title: finalName,
      meta: `${numQuestions} Questions · ${timeLimit} Minutes`,
      author: 'BY YOU · JUST NOW', // simplified for demo
    });
    setStep(1); // Reset
    navigation.goBack();
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleCreate();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  // Validation
  const isNextDisabled = () => {
    if (step === 1) return mockName.trim().length === 0;
    if (step === 2) return selectedSubjects.length === 0;
    if (step === 3) return selectedTopics.length === 0;
    return false;
  };

  const renderProgressBar = () => {
    return (
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((s) => (
          <View
            key={`progress-${s}`}
            style={[
              styles.progressSegment,
              { backgroundColor: s <= step ? primary : border },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeaderCenter}>
               <View style={[styles.iconLargeWrap, { backgroundColor: primaryLight }]}>
                  <Ionicons name="create-outline" size={32} color={primary} />
               </View>
               <Text style={[styles.stepTitle, { color: text }]}>Name your challenge</Text>
               <Text style={[styles.stepDesc, { color: textMuted }]}>
                  Give your custom mock test a memorable and identifiable name.
               </Text>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: card, borderColor: border }]}>
               <Text style={[styles.label, { color: textMuted }]}>Mock Name</Text>
               <TextInput
                  style={[styles.input, { color: text }]}
                  placeholder="e.g. Daily Target 1"
                  placeholderTextColor={textMuted}
                  value={mockName}
                  onChangeText={setMockName}
                  autoFocus
               />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: text }]}>Choose Subjects</Text>
            <Text style={[styles.stepDesc, { color: textMuted, marginBottom: 24, textAlign: 'left' }]}>
              Select the subject areas you want to practice.
            </Text>

            <View style={styles.grid}>
              {SUBJECTS.map((sub) => {
                const isSelected = selectedSubjects.includes(sub.id);
                return (
                  <Pressable
                    key={sub.id}
                    style={[
                      styles.subjectCard,
                      {
                        borderColor: isSelected ? primary : border,
                        backgroundColor: isSelected ? (isDark ? '#064e3b' : '#ecfdf5') : card,
                      },
                    ]}
                    onPress={() => toggleSubject(sub.id)}
                  >
                    <View style={[styles.subjectIcon, { backgroundColor: isSelected ? primary : border }]}>
                      <Ionicons name={sub.icon as any} size={20} color={isSelected ? '#fff' : textMuted} />
                    </View>
                    <View style={styles.subjectTextWrap}>
                      <Text style={[styles.subjectTitle, { color: text }]}>{sub.title}</Text>
                      <Text style={[styles.subjectCount, { color: textMuted }]}>{sub.topicsCount} Topics available</Text>
                    </View>
                    <View style={[styles.radio, { borderColor: isSelected ? primary : border }]}>
                      {isSelected && <View style={[styles.radioInner, { backgroundColor: primary }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: text }]}>Select Topics</Text>
            <Text style={[styles.stepDesc, { color: textMuted, marginBottom: 20, textAlign: 'left' }]}>
              Narrow down your practice to specific topics from your selected subjects.
            </Text>

            <View style={styles.topicsHeaderContainer}>
                <Text style={[styles.topicsLabel, { backgroundColor: primaryLight, color: primary }]}>
                  GENERAL INTELLIGENCE & REASONING
                </Text>
            </View>

            {/* SEARCH AND BULK ACTIONS */}
            <View style={styles.topicsActionRow}>
              <View style={[styles.searchInputWrap, { backgroundColor: card, borderColor: border }]}>
                <Ionicons name="search" size={16} color={textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: text }]}
                  placeholder="Search topics..."
                  placeholderTextColor={textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <Pressable
                style={[styles.bulkBtn, { backgroundColor: primaryLight }]}
                onPress={() => setSelectedTopics(Array.from(new Set([...selectedTopics, ...REASONING_TOPICS])))}
              >
                <Text style={[styles.bulkBtnText, { color: primary }]}>All</Text>
              </Pressable>
              {selectedTopics.length > 0 && (
                <Pressable
                   style={[styles.bulkBtn, { backgroundColor: 'transparent', borderColor: border, borderWidth: 1 }]}
                   onPress={() => setSelectedTopics([])}
                >
                   <Text style={[styles.bulkBtnText, { color: textMuted }]}>Clear</Text>
                </Pressable>
              )}
            </View>

            <View style={[styles.grid, { marginTop: 12 }]}>
              {REASONING_TOPICS.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase())).map((topic) => {
                const isSelected = selectedTopics.includes(topic);
                return (
                  <Pressable
                    key={topic}
                    style={[
                      styles.topicCard,
                      {
                         borderColor: isSelected ? primary : border,
                         backgroundColor: isSelected ? (isDark ? '#064e3b' : '#ecfdf5') : card
                      },
                    ]}
                    onPress={() => toggleTopic(topic)}
                  >
                    <Text style={[styles.topicText, { color: isSelected ? primary : text }]} numberOfLines={1}>{topic}</Text>
                    <View style={[styles.checkbox, { borderColor: isSelected ? primary : border, backgroundColor: isSelected ? primary : 'transparent' }]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      case 4:
        return (
          <View style={styles.stepContainer}>
            <Text style={[styles.stepTitle, { color: text }]}>Review & Settings</Text>
            <Text style={[styles.stepDesc, { color: textMuted, marginBottom: 24, textAlign: 'left' }]}>
              Finalize parameters and launch your practice session.
            </Text>

            <View style={styles.settingsRow}>
              {/* Questions block */}
              <View style={[styles.settingsBlock, { borderColor: border, backgroundColor: card }]}>
                <View style={styles.settingsHeader}>
                  <View style={[styles.settingsIcon, { backgroundColor: primaryLight }]}>
                    <Ionicons name="list" size={16} color={primary} />
                  </View>
                  <View>
                    <Text style={[styles.settingsTitle, { color: text }]}>TOTAL QUESTIONS</Text>
                  </View>
                </View>
                <View style={styles.settingsControl}>
                  <Text style={[styles.settingsValue, { color: text }]}>{numQuestions}</Text>
                  <Text style={[styles.settingsUnit, { color: textMuted }]}>Q'S</Text>
                </View>
                <View style={styles.stepperRow}>
                  <Pressable onPress={() => setNumQuestions(Math.max(5, numQuestions - 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                    <Ionicons name="remove" size={18} color={text} />
                  </Pressable>
                  <Pressable onPress={() => setNumQuestions(Math.min(100, numQuestions + 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                    <Ionicons name="add" size={18} color={text} />
                  </Pressable>
                </View>
              </View>

              {/* Time block */}
              <View style={[styles.settingsBlock, { borderColor: border, backgroundColor: card }]}>
                <View style={styles.settingsHeader}>
                  <View style={[styles.settingsIcon, { backgroundColor: primaryLight }]}>
                    <Ionicons name="time" size={16} color={primary} />
                  </View>
                  <View>
                    <Text style={[styles.settingsTitle, { color: text }]}>TIME LIMIT</Text>
                  </View>
                </View>
                <View style={styles.settingsControl}>
                  <Text style={[styles.settingsValue, { color: text }]}>{timeLimit}</Text>
                  <Text style={[styles.settingsUnit, { color: textMuted }]}>MINS</Text>
                </View>
                <View style={styles.stepperRow}>
                  <Pressable onPress={() => setTimeLimit(Math.max(5, timeLimit - 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                    <Ionicons name="remove" size={18} color={text} />
                  </Pressable>
                  <Pressable onPress={() => setTimeLimit(Math.min(60, timeLimit + 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                    <Ionicons name="add" size={18} color={text} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Visibility toggle */}
            <View style={[styles.visibilityContainer, { backgroundColor: card, borderColor: border }]}>
              <View style={styles.visibilityLeft}>
                 <View style={[styles.settingsIcon, { backgroundColor: primaryLight, marginRight: 12 }]}>
                    <Ionicons name={isPublic ? "globe" : "lock-closed"} size={16} color={primary} />
                 </View>
                <View>
                  <Text style={[styles.visibilityTitle, { color: text }]}>Mock Access</Text>
                  <Text style={[styles.visibilitySub, { color: textMuted }]}>{isPublic ? 'Visible to community' : 'Only you can see this'}</Text>
                </View>
              </View>
              <Pressable
                  style={[styles.toggleBtn, isPublic && { backgroundColor: primary }]}
                  onPress={() => setIsPublic(!isPublic)}
               >
                  <Text style={[styles.toggleText, { color: isPublic ? '#fff' : text }]}>{isPublic ? 'PUBLIC' : 'PRIVATE'}</Text>
               </Pressable>
            </View>

            <View style={[styles.summaryCard, { backgroundColor: primaryLight }]}>
               <Text style={[styles.summaryTitle, { color: primary }]}>CHALLENGE BLUEPRINT</Text>
               <Text style={[styles.summaryName, { color: text }]}>{mockName.trim() || 'Untitled Mock'}</Text>
               <View style={styles.summaryStatsRow}>
                  <View style={styles.summaryStatItem}>
                     <Ionicons name="folder" size={14} color={primary} />
                     <Text style={[styles.summaryStatText, { color: primary }]}>{selectedSubjects.length} Subject(s)</Text>
                  </View>
                  <View style={styles.summaryStatItem}>
                     <Ionicons name="document-text" size={14} color={primary} />
                     <Text style={[styles.summaryStatText, { color: primary }]}>{selectedTopics.length} Topic(s)</Text>
                  </View>
               </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: card, borderBottomColor: border }]}>
        <Pressable onPress={prevStep} style={styles.headerBtn}>
          <Ionicons name={step === 1 ? "close" : "chevron-back"} size={26} color={text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: text }]}>
            {step === 4 ? "Final Review" : `Step ${step} of ${totalSteps}`}
          </Text>
        </View>
        <View style={styles.headerBtn} />
      </View>
      {renderProgressBar()}

      {/* CONTENT */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
           {renderStep()}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: card, borderTopColor: border }]}>
         <Pressable
            style={[
               styles.nextBtn,
               { backgroundColor: primary },
               isNextDisabled() && { opacity: 0.5 }
            ]}
            onPress={nextStep}
            disabled={isNextDisabled()}
         >
            <Text style={styles.nextBtnText}>{step === totalSteps ? 'Create Challenge' : 'Continue'}</Text>
            {step < totalSteps && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
         </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  progressContainer: {
    flexDirection: 'row',
    height: 4,
    width: '100%',
  },
  progressSegment: {
     flex: 1,
  },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 20 },
  contentWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  stepContainer: {
     flex: 1,
  },
  stepHeaderCenter: {
     alignItems: 'center',
     marginBottom: 40,
     marginTop: 20,
  },
  iconLargeWrap: {
     width: 72,
     height: 72,
     borderRadius: 36,
     justifyContent: 'center',
     alignItems: 'center',
     marginBottom: 16,
  },
  stepTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  stepDesc: { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  inputContainer: {
     borderWidth: 1.5,
     borderRadius: 16,
     paddingHorizontal: 16,
     paddingTop: 12,
     paddingBottom: 8,
  },
  label: {
     fontSize: 11,
     fontWeight: '700',
     textTransform: 'uppercase',
     marginBottom: 4,
     letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 6,
  },

  grid: {
    flexDirection: 'column',
    gap: 12,
  },
  subjectCard: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  subjectTextWrap: { flex: 1 },
  subjectTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  subjectCount: { fontSize: 11, fontWeight: '600' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  topicsHeaderContainer: { marginBottom: 16 },
  topicsLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  topicsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  bulkBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  topicCard: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicText: { fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  settingsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  settingsBlock: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingsTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  settingsControl: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  settingsValue: { fontSize: 32, fontWeight: '800', marginRight: 4 },
  settingsUnit: { fontSize: 12, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepperBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  visibilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  visibilityLeft: { flexDirection: 'row', alignItems: 'center' },
  visibilityTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  visibilitySub: { fontSize: 11, fontWeight: '500' },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },

  summaryCard: {
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  summaryTitle: { fontSize: 10, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5 },
  summaryName: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  summaryStatsRow: { flexDirection: 'row', gap: 14 },
  summaryStatItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryStatText: { fontSize: 12, fontWeight: '700' },

  footer: {
     paddingHorizontal: 20,
     paddingTop: 16,
     borderTopWidth: 1,
  },
  nextBtn: {
     flexDirection: 'row',
     width: '100%',
     paddingVertical: 16,
     borderRadius: 999,
     alignItems: 'center',
     justifyContent: 'center',
  },
  nextBtnText: {
     fontSize: 15,
     fontWeight: '800',
     color: '#fff',
     letterSpacing: 0.5,
  },
});
