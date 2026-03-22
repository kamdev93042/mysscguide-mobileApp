import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const TEST_CATEGORIES = [
  {
    id: 'mocks',
    title: 'Mock Tests',
    description: 'Full length and sectional mocks to gauge your preparation.',
    icon: 'document-text',
    color: '#059669',
    route: 'Mocks'
  },
  {
    id: 'pyqs',
    title: 'Previous Year Papers',
    description: 'Practice with real past SSC exam papers.',
    icon: 'library',
    color: '#3b82f6',
    route: 'PYQs'
  },
  {
    id: 'contests',
    title: 'Live Contests',
    description: 'Compete with thousands of aspirants in real-time.',
    icon: 'trophy',
    color: '#eab308',
    route: 'Contests'
  }
];

export default function TestsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const text = isDark ? '#ffffff' : '#1e293b';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#334155' : '#e2e8f0';

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.appHeader, { borderBottomColor: border }]}>
        <View style={styles.logoRow}>
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
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color="#059669"
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={[styles.mainTitle, { color: text }]}>Test Series</Text>
          <Text style={[styles.mainSub, { color: mutedText }]}>
            Master your exams with our comprehensive practice material.
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {TEST_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.testCard, { backgroundColor: cardBg, borderColor: border }]}
              onPress={() => navigation.navigate(cat.route)}
            >
              <View style={[styles.iconBox, { backgroundColor: cat.color + '15' }]}>
                <Ionicons name={cat.icon as any} size={28} color={cat.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: text }]}>{cat.title}</Text>
                <Text style={[styles.cardDesc, { color: mutedText }]}>{cat.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={mutedText} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: {
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
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  headerSection: { marginBottom: 24, paddingHorizontal: 4 },
  mainTitle: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  mainSub: { fontSize: 14, lineHeight: 20 },
  cardsContainer: { gap: 16 },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
    paddingRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
