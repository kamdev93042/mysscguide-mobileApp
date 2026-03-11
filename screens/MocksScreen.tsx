import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const FEATURE_CARDS = [
  {
    id: 'create',
    title: 'Create Challenge',
    subtitle: 'Create tailored tests by topic & difficulty levels.',
    badge: 'PYQ-POWERED',
    cta: 'Build Now',
    icon: 'construct',
  },
  {
    id: 'archives',
    title: 'PYQ Archives',
    subtitle: 'Actual papers from 2018–2024 across all shifts.',
    badge: 'PREVIOUS YEAR',
    cta: 'Browse Files',
    icon: 'archive',
  },
  {
    id: 'rank',
    title: 'Rank Maker Series',
    subtitle: 'Signature mocks for top rank aspirants.',
    badge: 'ELITE SERIES',
    cta: 'Upgrade',
    icon: 'ribbon',
  },
  {
    id: 'prescription',
    title: "Doctor's Prescription",
    subtitle: 'Diagnostic test to get a personalized plan.',
    badge: 'FIRST STEP',
    cta: 'Start',
    icon: 'medkit',
  },
];

const PUBLIC_CHALLENGES = [
  {
    id: 'c1',
    title: 'nikhil gg',
    meta: '18 Questions · 15 Minutes',
    author: 'BY NIKHIL MAURYA · 7 MAR 2026',
  },
  {
    id: 'c2',
    title: 'fast',
    meta: '6 Questions · 15 Minutes',
    author: 'BY YASH MAURYA · 7 MAR 2026',
  },
  {
    id: 'c3',
    title: 'yet another public',
    meta: '23 Questions · 15 Minutes',
    author: 'BY NIKHIL MAURYA · 6 MAR 2026',
  },
  {
    id: 'c4',
    title: 'one more challenge',
    meta: '22 Questions · 15 Minutes',
    author: 'BY NIKHIL MAURYA · 6 MAR 2026',
  },
];

export default function MocksScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#020617' : '#ffffff';
  const cardSoft = isDark ? '#020617' : '#f1f5f9';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669';

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      {/* Shared app header (logo + theme + notifications) */}
      <View style={[styles.header, { borderBottomColor: border }]}>
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
          <Pressable style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero mock banner like web but mobile-optimized */}
        <View style={[styles.heroCard, { backgroundColor: primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTag}>First Time Here?</Text>
            <Text style={styles.heroTitle}>Create & share your custom mocks.</Text>
            <Text style={styles.heroSub}>
              Design tests by choosing topics and difficulty, then share with friends or keep
              them private.
            </Text>
            <Pressable style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>Create New Mock</Text>
            </Pressable>
          </View>
          {/* <View style={styles.heroIconWrap}>
            <Ionicons name="laptop-outline" size={32} color="#bbf7d0" />
          </View> */}
        </View>

        {/* More to explore – 2x2 grid */}
        <Text style={[styles.sectionTitle, { color: text }]}>More to explore</Text>
        <View style={styles.exploreGrid}>
          {FEATURE_CARDS.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.exploreGridCard,
                { backgroundColor: card, borderColor: border },
              ]}
            >
              <View style={[styles.exploreIconWrap, { backgroundColor: isDark ? primary + '20' : primary + '15', marginBottom: 12 }]}>
                <Ionicons name={item.icon as any} size={24} color={primary} />
              </View>
              <Text style={[styles.exploreTitle, { color: text, textAlign: 'center' }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.exploreSub, { color: muted, textAlign: 'center', marginTop: 4 }]} numberOfLines={2}>
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Public challenges list */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: text, marginBottom: 0 }]}>
            Public Challenges
          </Text>
          <Pressable style={[styles.searchIconButton, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <Ionicons name="search" size={18} color={primary} />
          </Pressable>
        </View>
        <View style={styles.challengeList}>
          {PUBLIC_CHALLENGES.map((c) => (
            <View
              key={c.id}
              style={[styles.challengeListItem, { backgroundColor: cardSoft }]}
            >
              <View style={styles.challengeIconWrap}>
                <Ionicons name="globe-outline" size={24} color={primary} />
              </View>
              <View style={styles.challengeInfo}>
                <Text style={[styles.challengeTitle, { color: text }]} numberOfLines={1}>{c.title}</Text>
                <Text style={[styles.challengeMeta, { color: muted }]} numberOfLines={1}>{c.meta}</Text>
                <Text style={[styles.challengeAuthor, { color: muted }]} numberOfLines={1}>{c.author}</Text>
              </View>
              <Pressable style={[styles.challengeStartBtn, { backgroundColor: primary }]}>
                <Text style={styles.challengeStartText}>Start</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {/* Recent history section */}
        <Text style={[styles.sectionTitle, { color: text, marginTop: 16 }]}>Recent History</Text>
        <View style={[styles.historyCard, { backgroundColor: cardSoft, borderColor: border }]}>
          <View style={styles.historyIconCircle}>
            <Ionicons name="time-outline" size={22} color={muted} />
          </View>
          <Text style={[styles.historyTitle, { color: text }]}>No history found</Text>
          <Text style={[styles.historySub, { color: muted }]}>
            Start attempting mocks to see your performance summary here.
          </Text>
          <Pressable style={[styles.historyBtn, { borderColor: primary }]}>
            <Text style={[styles.historyBtnText, { color: primary }]}>Start a Mock</Text>
          </Pressable>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
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
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 },
  heroCard: {
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTag: { fontSize: 12, fontWeight: '700', color: '#bbf7d0', marginBottom: 6 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#ecfdf5', marginBottom: 6 },
  heroSub: { fontSize: 13, color: '#dcfce7', marginBottom: 10 },
  heroBtn: {
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  heroBtnText: { fontSize: 14, fontWeight: '700', color: '#166534' },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(15,23,42,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  exploreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  exploreGridCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  exploreIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  exploreTitle: { fontSize: 14, fontWeight: '700', lineHeight: 18 },
  exploreSub: { fontSize: 11, lineHeight: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 12,
  },
  searchIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  challengeList: {
    marginTop: 8,
  },
  challengeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
  },
  challengeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  challengeInfo: {
    flex: 1,
    marginRight: 8,
  },
  challengeTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  challengeMeta: { fontSize: 12, marginBottom: 3 },
  challengeAuthor: { fontSize: 11 },
  challengeStartBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  challengeStartText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  historyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    marginTop: 4,
  },
  historyIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  historySub: { fontSize: 13, textAlign: 'center', marginBottom: 10 },
  historyBtn: {
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  historyBtnText: { fontSize: 13, fontWeight: '700' },
});

