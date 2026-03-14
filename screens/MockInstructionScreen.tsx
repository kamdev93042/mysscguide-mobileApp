import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const INSTRUCTIONS_GENERAL = [
  "1. The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You need not terminate the examination or submit your paper.",
  "2. The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:"
];

const INSTRUCTIONS_NAV = [
  "3. To answer a question, do the following:",
  "1. Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.",
  "2. Click on Save & Next to save your answer for the current question and then go to the next question.",
  "3. Click on Mark for Review & Next to save your answer for the current question, mark it for review, and then go to the next question."
];

export default function MockInstructionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();

  // The mock data passed from the previous screen
  const mockData = route.params?.mockData || {
    title: 'YET PUBLICK ONE BRO',
    questions: 15,
    duration: 15,
  };

  const [hasAgreed, setHasAgreed] = useState(false);

  // Theme Colors
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const textMuted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669'; // The extracted brand green

  const handleContinue = () => {
    if (hasAgreed) {
      navigation.navigate('MockPractice', { mockData });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: Platform.OS === 'ios' ? insets.top : 24 }]}>
      {/* Header */}
      <View style={[styles.header, { borderColor: border }]}>
        <Pressable
          style={styles.headerBtn}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={text} />
        </Pressable>
        {/* Placeholder for center alignment */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.centerWrapper}>

          <View style={[styles.instructionCard, { backgroundColor: card, borderColor: border }]}>
            {/* Top accent bar */}
            <View style={[styles.accentBar, { backgroundColor: primary }]} />

            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: text }]}>TEST INSTRUCTIONS</Text>
              <Text style={[styles.subtitle, { color: textMuted }]}>
                {mockData.title.toUpperCase()} • {mockData.questions} QUESTIONS • {mockData.duration} MINUTES
              </Text>
            </View>

            <View style={[styles.instructionsBox, { backgroundColor: bg }]}>
              <Text style={[styles.sectionHeading, { color: text }]}>General Instructions</Text>

              {INSTRUCTIONS_GENERAL.map((inst, index) => (
                <View key={`gen-${index}`} style={styles.instructionRow}>
                  <Text style={[styles.instructionText, { color: text }]}>{inst}</Text>
                </View>
              ))}

              {/* Legend matching the authentic SSC layout */}
              <View style={styles.legendContainer}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendIcon, { backgroundColor: bg, borderColor: border, borderWidth: 1 }]} />
                  <Text style={[styles.legendText, { color: text }]}>You have not visited the question yet.</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendIcon, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.legendText, { color: text }]}>You have not answered the question.</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendIcon, { backgroundColor: primary }]} />
                  <Text style={[styles.legendText, { color: text }]}>You have answered the question.</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendIcon, { backgroundColor: '#8b5cf6', borderRadius: 999 }]} />
                  <Text style={[styles.legendText, { color: text }]}>You have NOT answered the question, but have marked the question for review.</Text>
                </View>
                <View style={styles.legendRow}>
                  <View style={[styles.legendIcon, { backgroundColor: '#8b5cf6', borderRadius: 999 }]}>
                    <View style={{ width: 8, height: 8, backgroundColor: '#22c55e', borderRadius: 4, position: 'absolute', bottom: -2, right: -2 }} />
                  </View>
                  <Text style={[styles.legendText, { color: text }]}>The question(s) "Answered and Marked for Review" will be considered for evaluation.</Text>
                </View>
              </View>

              <Text style={[styles.sectionHeading, { color: text, marginTop: 16 }]}>Navigating to a Question:</Text>

              {INSTRUCTIONS_NAV.map((inst, index) => (
                <View key={`nav-${index}`} style={styles.instructionRow}>
                  <Text style={[styles.instructionText, { color: text }]}>{inst}</Text>
                </View>
              ))}

              <Text style={[styles.noteText, { color: '#ef4444', marginTop: 8 }]}>Note: All the questions are compulsory.</Text>
            </View>

            <Pressable
              style={[styles.consentBox, { borderColor: hasAgreed ? primary : border }]}
              onPress={() => setHasAgreed(!hasAgreed)}
            >
              <View style={[styles.checkbox, { borderColor: hasAgreed ? primary : border, backgroundColor: hasAgreed ? primary : 'transparent' }]}>
                {hasAgreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.consentText, { color: text }]}>
                I have read and understood the instructions.
              </Text>
            </Pressable>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, styles.continueBtn, { backgroundColor: hasAgreed ? primary : border }]}
                onPress={handleContinue}
                disabled={!hasAgreed}
              >
                <Text style={[styles.continueBtnText, { color: hasAgreed ? '#fff' : textMuted }]}>
                  BEGIN
                </Text>
              </Pressable>
            </View>

          </View>
        </View>
      </ScrollView>
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
  },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },
  scrollContent: { padding: 24, paddingLeft: 16 },
  centerWrapper: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 600,
    marginTop: 20,
  },
  instructionCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden', // to clip the accent bar
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  accentBar: {
    height: 8,
    width: '100%',
  },
  cardHeader: {
    padding: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  instructionsBox: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  legendContainer: {
    paddingLeft: 8,
    marginVertical: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  legendIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginRight: 10,
  },
  legendText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  noteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  consentText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
    padding: 32,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  continueBtn: {
  },
  continueBtnText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
