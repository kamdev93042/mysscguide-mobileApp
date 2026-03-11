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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';

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

  // State
  const [mockName, setMockName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [numQuestions, setNumQuestions] = useState(25);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isPublic, setIsPublic] = useState(false);

  // Completion states
  const isStep1Done = mockName.trim().length > 0;
  const isStep2Done = selectedSubjects.length > 0;
  const isStep3Done = selectedTopics.length > 0;
  const isStep4Done = false; // Settings are never "checked" until form is submitted

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
    // Navigate back to MocksScreen
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top, borderBottomColor: border, backgroundColor: card }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={text} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: text }]}>Custom Mock Builder</Text>
          <Text style={[styles.headerSubtitle, { color: primary }]}>PROFESSIONAL TEST DESIGNER</Text>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* CENTER WRAPPER */}
        <View style={styles.centerWrapper}>
          {/* TIMELINE CONTAINER */}
          <View style={styles.timelineContainer}>

            {/* Step 1: Name */}
            <View style={styles.timelineItem}>
              {/* Connecting Line to next step */}
              <View style={[styles.timelineItemLine, { backgroundColor: isStep1Done ? primary : border }]} />
              
              <View style={[styles.timelineDot, { backgroundColor: isStep1Done ? primary : bg, borderColor: isStep1Done ? primary : border }]}>
                {isStep1Done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <View style={[styles.timelineDotInner, { backgroundColor: border }]} />
                )}
              </View>
              <View style={[styles.timelineContent, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Name your mock test</Text>
              <Text style={[styles.sectionDesc, { color: textMuted }]}>
                Enter a name first, then you can select topics and settings.
              </Text>

              <Text style={[styles.label, { color: text }]}>Mock name</Text>
              <TextInput
                style={[styles.input, { borderColor: border, color: text, backgroundColor: bg }]}
                placeholder="Distance n Time #1"
                placeholderTextColor={textMuted}
                value={mockName}
                onChangeText={setMockName}
              />
            </View>
          </View>

          {/* Step 2: Subjects */}
          <View style={styles.timelineItem}>
            {/* Connecting Line to next step */}
            <View style={[styles.timelineItemLine, { backgroundColor: isStep2Done ? primary : border }]} />
            
            <View style={[styles.timelineDot, { backgroundColor: isStep2Done ? primary : bg, borderColor: isStep2Done ? primary : border }]}>
              {isStep2Done ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <View style={[styles.timelineDotInner, { backgroundColor: isStep1Done ? primary : border }]} />
              )}
            </View>
            <View style={[styles.timelineContent, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Choose Subjects</Text>
              <Text style={[styles.sectionDesc, { color: textMuted }]}>
                Choose which subjects to include in your mock test.
              </Text>

              <View style={styles.grid}>
                {SUBJECTS.map((sub) => {
                  const isSelected = selectedSubjects.includes(sub.id);
                  return (
                    <Pressable
                      key={sub.id}
                      style={[
                        styles.subjectCard,
                        { borderColor: isSelected ? primary : border, backgroundColor: isSelected ? primaryLight : bg },
                      ]}
                      onPress={() => toggleSubject(sub.id)}
                    >
                      <View style={[styles.subjectIcon, { backgroundColor: isSelected ? primary : border }]}>
                        <Ionicons name={sub.icon as any} size={20} color={isSelected ? '#fff' : textMuted} />
                      </View>
                      <View style={styles.subjectTextWrap}>
                        <Text style={[styles.subjectTitle, { color: text }]}>{sub.title}</Text>
                        <Text style={[styles.subjectCount, { color: textMuted }]}>{sub.topicsCount} TOPICS</Text>
                      </View>
                      <View style={[styles.radio, { borderColor: isSelected ? primary : border }]}>
                        {isSelected && <View style={[styles.radioInner, { backgroundColor: primary }]} />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Step 3: Topics */}
          {selectedSubjects.length > 0 && (
            <View style={styles.timelineItem}>
              {/* Connecting Line to next step */}
              <View style={[styles.timelineItemLine, { backgroundColor: isStep3Done ? primary : border }]} />
              
              <View style={[styles.timelineDot, { backgroundColor: isStep3Done ? primary : bg, borderColor: isStep3Done ? primary : border }]}>
                {isStep3Done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <View style={[styles.timelineDotInner, { backgroundColor: isStep2Done ? primary : border }]} />
                )}
              </View>
              <View style={[styles.timelineContent, { backgroundColor: card, borderColor: border }]}>
                <Text style={[styles.sectionTitle, { color: text, marginBottom: 12 }]}>Select Topics</Text>
                
                <View style={styles.topicsHeader}>
                  <Text style={[styles.topicsLabel, { backgroundColor: primaryLight, color: primary }]}>
                    GENERAL INTELLIGENCE & REASONING
                  </Text>
                </View>

                {/* SEARCH AND BULK ACTIONS */}
                <View style={styles.topicsActionRow}>
                  <View style={[styles.searchInputWrap, { backgroundColor: bg, borderColor: border }]}>
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
                    <Text style={[styles.bulkBtnText, { color: primary }]}>Select All</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.bulkBtn, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]}
                    onPress={() => setSelectedTopics([])}
                  >
                    <Text style={[styles.bulkBtnText, { color: text }]}>Clear</Text>
                  </Pressable>
                </View>

                <View style={styles.grid}>
                  {REASONING_TOPICS.filter(t => t.toLowerCase().includes(searchQuery.toLowerCase())).map((topic) => {
                    const isSelected = selectedTopics.includes(topic);
                    return (
                      <Pressable
                        key={topic}
                        style={[
                          styles.topicCard,
                          { borderColor: isSelected ? primary : border, backgroundColor: isSelected ? primaryLight : bg },
                        ]}
                        onPress={() => toggleTopic(topic)}
                      >
                        <Text style={[styles.topicText, { color: text }]} numberOfLines={1}>{topic}</Text>
                        <View style={[styles.checkbox, { borderColor: isSelected ? primary : border, backgroundColor: isSelected ? primary : 'transparent' }]}>
                          {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Step 4: Settings */}
          <View style={styles.timelineItem}>
            {/* Connecting Line to next step */}
            <View style={[styles.timelineItemLine, { backgroundColor: isStep4Done ? primary : border }]} />

            <View style={[styles.timelineDot, { backgroundColor: isStep4Done ? primary : bg, borderColor: isStep4Done ? primary : border }]}>
              {isStep4Done ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <View style={[styles.timelineDotInner, { backgroundColor: (selectedSubjects.length > 0 ? isStep3Done : isStep2Done) ? primary : border }]} />
              )}
            </View>
            <View style={[styles.timelineContent, { backgroundColor: card, borderColor: border }]}>
              <Text style={[styles.sectionTitle, { color: text }]}>Refine Parameters</Text>
              <Text style={[styles.sectionDesc, { color: textMuted }]}>
                Professional configuration for your practice session.
              </Text>

              <View style={styles.settingsRow}>
                {/* Questions block */}
                <View style={[styles.settingsBlock, { borderColor: border, backgroundColor: bg }]}>
                  <View style={styles.settingsHeader}>
                    <View style={[styles.settingsIcon, { backgroundColor: primaryLight }]}>
                      <Ionicons name="list" size={16} color={primary} />
                    </View>
                    <View>
                      <Text style={[styles.settingsTitle, { color: text }]}>TOTAL QUESTIONS</Text>
                      <Text style={[styles.settingsSub, { color: textMuted }]}>TEST VOLUME</Text>
                    </View>
                  </View>
                  <View style={styles.settingsControl}>
                    <Text style={[styles.settingsValue, { color: text }]}>{numQuestions}</Text>
                    <Text style={[styles.settingsUnit, { color: textMuted }]}>Q'S</Text>
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable onPress={() => setNumQuestions(Math.max(5, numQuestions - 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                      <Ionicons name="remove" size={16} color={text} />
                    </Pressable>
                    <Pressable onPress={() => setNumQuestions(Math.min(100, numQuestions + 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                      <Ionicons name="add" size={16} color={text} />
                    </Pressable>
                  </View>
                </View>

                {/* Time block */}
                <View style={[styles.settingsBlock, { borderColor: border, backgroundColor: bg }]}>
                  <View style={styles.settingsHeader}>
                    <View style={[styles.settingsIcon, { backgroundColor: primaryLight }]}>
                      <Ionicons name="time" size={16} color={primary} />
                    </View>
                    <View>
                      <Text style={[styles.settingsTitle, { color: text }]}>TIME LIMIT</Text>
                      <Text style={[styles.settingsSub, { color: textMuted }]}>DURATION</Text>
                    </View>
                  </View>
                  <View style={styles.settingsControl}>
                    <Text style={[styles.settingsValue, { color: text }]}>{timeLimit}</Text>
                    <Text style={[styles.settingsUnit, { color: textMuted }]}>MINS</Text>
                  </View>
                  <View style={styles.stepperRow}>
                    <Pressable onPress={() => setTimeLimit(Math.max(5, timeLimit - 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                      <Ionicons name="remove" size={16} color={text} />
                    </Pressable>
                    <Pressable onPress={() => setTimeLimit(Math.min(60, timeLimit + 5))} style={[styles.stepperBtn, { backgroundColor: border }]}>
                      <Ionicons name="add" size={16} color={text} />
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Visibility toggle */}
              <View style={[styles.visibilityRow, { borderColor: border }]}>
                <View style={styles.visibilityLeft}>
                  <Ionicons name="layers" size={20} color={text} />
                  <View style={{ marginLeft: 12 }}>
                    <Text style={[styles.visibilityTitle, { color: text }]}>MOCK VISIBILITY</Text>
                    <Text style={[styles.visibilitySub, { color: textMuted }]}>COMMUNITY ACCESS</Text>
                  </View>
                </View>
                <View style={[styles.toggleWrap, { borderColor: border, backgroundColor: bg }]}>
                  <Pressable
                    style={[styles.toggleBtn, isPublic && { backgroundColor: primary }]}
                    onPress={() => setIsPublic(true)}
                  >
                    <Text style={[styles.toggleText, { color: isPublic ? '#fff' : textMuted }]}>PUBLIC</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleBtn, !isPublic && { backgroundColor: primary }]}
                    onPress={() => setIsPublic(false)}
                  >
                    <Text style={[styles.toggleText, { color: !isPublic ? '#fff' : textMuted }]}>PRIVATE</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Step 5: Review */}
          <View style={styles.timelineItem}>
            <View style={[styles.timelineDot, { backgroundColor: primaryLight, borderColor: primary }]}>
              <Ionicons name="flash" size={14} color={primary} />
            </View>
            <View style={[styles.timelineContent, { backgroundColor: card, borderColor: border, padding: 0 }]}>
              {/* MOCK IDENTIFICATION */}
              <View style={[styles.reviewSubSection, { borderColor: border, backgroundColor: bg, borderTopWidth: 0, borderLeftWidth: 0, borderRightWidth: 0, borderRadius: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingVertical: 20 }]}>
                <Text style={[styles.reviewSubTitle, { color: primary }]}>MOCK IDENTIFICATION</Text>
                <Text style={[styles.reviewValue, { color: text, fontSize: 18, fontWeight: '600', textTransform: 'none' }]}>{mockName.trim() || 'Untitled Mock'}</Text>
              </View>

              <View style={{ padding: 16 }}>
                {/* BLUEPRINT SUMMARY */}
                <View style={[styles.reviewSubSection, { borderColor: border, backgroundColor: bg }]}>
                  <Text style={[styles.reviewSubTitle, { color: primary }]}>SELECTED BLUEPRINT</Text>
                  {selectedSubjects.map((subjectId) => {
                    const subject = SUBJECTS.find(s => s.id === subjectId);
                    return (
                      <View key={subjectId} style={styles.reviewSubjectRow}>
                        <Text style={[styles.reviewSubjectTitle, { color: text }]}>• {subject?.title.toUpperCase()}</Text>
                        {subjectId === 'reasoning' && selectedTopics.length > 0 && (
                          <View style={styles.reviewTopicsWrap}>
                            {selectedTopics.map(topic => (
                              <View key={topic} style={[styles.reviewTopicPill, { backgroundColor: bg, borderColor: border }]}>
                                <Text style={[styles.reviewTopicText, { color: text }]}>{topic}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {selectedSubjects.length === 0 && (
                    <Text style={[styles.reviewTopicText, { color: textMuted }]}>No subjects selected.</Text>
                  )}
                </View>

                {/* SETTINGS ROW */}
                <View style={styles.reviewSettingsRow}>
                   <View style={[styles.reviewSettingBox, { borderColor: border, backgroundColor: bg }]}>
                      <View style={styles.reviewSettingHeader}>
                         <Ionicons name="list" size={14} color={primary} />
                         <Text style={[styles.reviewSettingLabel, { color: primary, fontWeight: '600' }]}>QUESTIONS</Text>
                      </View>
                      <Text style={[styles.reviewValue, { color: text, fontSize: 20, fontWeight: '700' }]}>{numQuestions}</Text>
                   </View>
                   <View style={[styles.reviewSettingBox, { borderColor: border, backgroundColor: bg }]}>
                      <View style={styles.reviewSettingHeader}>
                         <Ionicons name="time" size={14} color={primary} />
                         <Text style={[styles.reviewSettingLabel, { color: primary, fontWeight: '600' }]}>DURATION</Text>
                      </View>
                      <Text style={[styles.reviewValue, { color: text, fontSize: 20, fontWeight: '700' }]}>{timeLimit}m</Text>
                   </View>
                   <View style={[styles.reviewSettingBox, { borderColor: border, backgroundColor: bg }]}>
                      <View style={styles.reviewSettingHeader}>
                         <Ionicons name="globe" size={14} color={primary} />
                         <Text style={[styles.reviewSettingLabel, { color: primary, fontWeight: '600' }]}>ACCESS</Text>
                      </View>
                      <Text style={[styles.reviewValue, { color: text, fontSize: 15, fontWeight: '600', marginTop: 4 }]}>{isPublic ? 'Public' : 'Private'}</Text>
                   </View>
                </View>

                {/* FINAL CTA CARD */}
                <View style={[styles.ctaCard, { backgroundColor: primaryLight }]}>
                  <View style={styles.ctaIconWrap}>
                    <Ionicons name="flash" size={24} color="#fff" />
                  </View>
                  <Text style={[styles.ctaTitle, { color: primary }]}>READY?</Text>
                  <Text style={styles.ctaSub}>LAUNCH PRACTICE MODE</Text>
                  <Pressable style={styles.createBtn} onPress={handleCreate}>
                    <Text style={[styles.createBtnText, { color: primary }]}>CREATE MOCK</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSubtitle: { fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  scrollContent: { paddingVertical: 24, paddingHorizontal: 16 },
  centerWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
  },
  timelineContainer: {
    position: 'relative',
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineItemLine: {
    position: 'absolute',
    left: 13,
    top: 28, // Start below the dot
    bottom: -24, // Extend to the next dot
    width: 2,
    zIndex: 0,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    zIndex: 1,
    marginTop: 4, // Align better with title text
  },
  timelineDotInner: { width: 10, height: 10, borderRadius: 5 },
  timelineContent: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionDesc: { fontSize: 13, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  grid: {
    flexDirection: 'column',
    gap: 12,
  },
  subjectCard: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  subjectIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  subjectTextWrap: { flex: 1 },
  subjectTitle: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
  subjectCount: { fontSize: 10, fontWeight: '600' },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  radioInner: { width: 8, height: 8, borderRadius: 4 },
  topicsHeader: { marginBottom: 12 },
  topicsLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 10,
    fontWeight: '800',
  },
  topicsActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: 12,
    fontWeight: '600',
  },
  bulkBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulkBtnText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
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
  topicText: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsRow: {
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  settingsBlock: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
  },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  settingsTitle: { fontSize: 10, fontWeight: '800', marginBottom: 2 },
  settingsSub: { fontSize: 9, fontWeight: '600' },
  settingsControl: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  settingsValue: { fontSize: 32, fontWeight: '800', marginRight: 4 },
  settingsUnit: { fontSize: 12, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', gap: 8 },
  stepperBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
  },
  visibilityLeft: { flexDirection: 'row', alignItems: 'center' },
  visibilityTitle: { fontSize: 11, fontWeight: '800', marginBottom: 2 },
  visibilitySub: { fontSize: 10, fontWeight: '600' },
  toggleWrap: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  toggleText: { fontSize: 11, fontWeight: '700' },
  reviewSubSection: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  reviewSubTitle: { fontSize: 10, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  reviewValue: { fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
  reviewSubjectRow: { marginBottom: 12 },
  reviewSubjectTitle: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  reviewTopicsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingLeft: 8 },
  reviewTopicPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  reviewTopicText: { fontSize: 9, fontWeight: '700' },
  reviewSettingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  reviewSettingBox: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSettingHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 4 },
  reviewSettingLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  ctaCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  ctaIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  ctaTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  ctaSub: { fontSize: 10, fontWeight: '700', color: '#059669', marginBottom: 20, opacity: 0.8 },
  createBtn: {
    width: '100%',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  createBtnText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
});
