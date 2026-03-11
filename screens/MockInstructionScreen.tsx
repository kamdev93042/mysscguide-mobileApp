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

const INSTRUCTIONS = [
  "Total time for this test is 15 minutes.",
  "The clock will be set at the server. The countdown timer in the top right corner of screen will display the remaining time available for you to complete the examination.",
  "Submit your answers before the time runs out.",
  "You can navigate between sections at any time.",
  "Do not refresh the page or exit fullscreen mode during the test.",
  "The test will auto-submit when the timer reaches zero.",
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
              {INSTRUCTIONS.map((inst, index) => (
                <View key={index} style={styles.instructionRow}>
                  <View style={[styles.bullet, { backgroundColor: primary }]} />
                  <Text style={[styles.instructionText, { color: text }]}>{inst}</Text>
                </View>
              ))}
            </View>

            <Pressable 
              style={[styles.consentBox, { borderColor: hasAgreed ? primary : border }]}
              onPress={() => setHasAgreed(!hasAgreed)}
            >
              <View style={[styles.checkbox, { borderColor: hasAgreed ? primary : border, backgroundColor: hasAgreed ? primary : 'transparent' }]}>
                {hasAgreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={[styles.consentText, { color: text }]}>
                I have read and understood all the instructions. I agree to abide by the rules of the examination.
              </Text>
            </Pressable>

            <View style={styles.actionsRow}>
              <Pressable 
                style={[styles.actionBtn, styles.cancelBtn, { borderColor: border }]}
                onPress={() => navigation.goBack()}
              >
                <Text style={[styles.cancelBtnText, { color: textMuted }]}>CANCEL</Text>
              </Pressable>
              <Pressable 
                style={[styles.actionBtn, styles.continueBtn, { backgroundColor: hasAgreed ? primary : border }]}
                onPress={handleContinue}
                disabled={!hasAgreed}
              >
                <Text style={[styles.continueBtnText, { color: hasAgreed ? '#fff' : textMuted }]}>
                  CONTINUE
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
    marginHorizontal: 32,
    padding: 24,
    borderRadius: 16,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  consentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 32,
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
