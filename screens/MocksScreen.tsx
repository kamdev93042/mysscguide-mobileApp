import { ScrollView, View, Text, StyleSheet, Pressable, TextInput, Image, RefreshControl } from 'react-native';
import { useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';

const FEATURE_CARDS = [
  {
    id: 'create',
    title: 'Create Challenge',

    badge: 'PYQ-POWERED',
    cta: 'Build Now',
    icon: 'construct',
  },
  {
    id: 'archives',
    title: 'PYQ Archives',

    badge: 'PREVIOUS YEAR',
    cta: 'Browse Files',
    icon: 'archive',
  },
  {
    id: 'rank',
    title: 'Rank Maker Series',

    badge: 'ELITE SERIES',
    cta: 'Upgrade',
    icon: 'ribbon',
  },
  {
    id: 'prescription',
    title: "Doctor's Prescription",

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
  {
    id: 'c5',
    title: 'ssc cgl tier 1 mock',
    meta: '100 Questions · 60 Minutes',
    author: 'BY RAHUL · 5 MAR 2026',
  },
  {
    id: 'c6',
    title: 'chsl practice set',
    meta: '25 Questions · 20 Minutes',
    author: 'BY AMAN · 4 MAR 2026',
  },
];

export default function MocksScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark, toggleTheme } = useTheme();
  const { 
    myChallenges, 
    publicChallenges, 
    recentAttempts, 
    isLoading, 
    fetchMyChallenges, 
    fetchPublicChallenges, 
    fetchRecentAttempts 
  } = useMocks();

  const onRefresh = useCallback(() => {
    fetchMyChallenges();
    fetchPublicChallenges();
    fetchRecentAttempts();
  }, [fetchMyChallenges, fetchPublicChallenges, fetchRecentAttempts]);

  const [showAllPublic, setShowAllPublic] = useState(false);
  const [showAllMy, setShowAllMy] = useState(false);
  const [showLockedNotice, setShowLockedNotice] = useState(false);

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
          <Pressable onPress={() => navigation.goBack()} style={{ marginRight: 12 }} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={text} />
          </Pressable>
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={primary} />}
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
            <Pressable style={styles.heroBtn} onPress={() => navigation.navigate('CreateMock')}>
              <Text style={styles.heroBtnText}>Create New Mock</Text>
            </Pressable>
          </View>
          {/* <View style={styles.heroIconWrap}>
            <Ionicons name="laptop-outline" size={32} color="#bbf7d0" />
          </View> */}
        </View>

        {/* More to explore – 2x2 grid */}
        <Text style={[styles.sectionTitle, { color: text }]}>Mock Tools</Text>
        <View style={styles.exploreGrid}>
          {FEATURE_CARDS.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.exploreGridCard,
                { backgroundColor: card, borderColor: border },
              ]}
              onPress={() => {
                if (item.id === 'create') {
                  navigation.navigate('CreateMock');
                } else if (item.id === 'archives') {
                  navigation.navigate('PYQs', { activeTab: 'PYQ' });
                } else if (item.id === 'rank') {
                  navigation.navigate('PYQs', { activeTab: 'RankMaker' });
                } else if (item.id === 'prescription') {
                  setShowLockedNotice(true);
                }
              }}
            >
              <View style={[styles.exploreIconWrap, { backgroundColor: isDark ? primary + '20' : primary + '15', marginBottom: 12 }]}>
                <Ionicons name={item.icon as any} size={24} color={primary} />
              </View>
              <Text style={[styles.exploreTitle, { color: text, textAlign: 'center' }]} numberOfLines={2}>
                {item.title}
              </Text>

            </Pressable>
          ))}
        </View>

        {showLockedNotice && (
          <View style={[styles.lockedNotice, { backgroundColor: isDark ? '#1e293b' : '#ecfdf5', borderColor: isDark ? '#334155' : '#a7f3d0' }]}>
            <View style={styles.lockedNoticeLeft}>
              <Ionicons name="lock-closed" size={16} color={primary} />
              <Text style={[styles.lockedNoticeText, { color: text }]}>Doctor&apos;s Prescription is locked for now. Coming soon.</Text>
            </View>
            <Pressable onPress={() => setShowLockedNotice(false)} hitSlop={8}>
              <Ionicons name="close" size={16} color={muted} />
            </Pressable>
          </View>
        )}

        {/* My Challenges list */}
        {myChallenges.length > 0 && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: text, marginBottom: 0 }]}>
                My Challenges
              </Text>
            </View>
            <View style={styles.challengeList}>
              {(showAllMy ? myChallenges : myChallenges.slice(0, 3)).map((c) => (
                <View
                  key={c.id}
                  style={[styles.challengeListItem, { backgroundColor: primary + '15', borderColor: primary, borderWidth: 1 }]}
                >
                  <View style={[styles.challengeIconWrap, { backgroundColor: primary }]}>
                    <Ionicons name="folder-open" size={20} color="#fff" />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeTitle, { color: text }]} numberOfLines={1}>{c.title}</Text>
                    <Text style={[styles.challengeMeta, { color: muted }]} numberOfLines={1}>{c.meta}</Text>
                    <Text style={[styles.challengeAuthor, { color: primary, fontSize: 10, fontWeight: '700' }]} numberOfLines={1}>{c.author}</Text>
                  </View>
                  <Pressable
                    style={[styles.challengeStartBtn, { backgroundColor: primary }]}
                    onPress={() => navigation.navigate('MockInstruction', {
                      mockData: { title: c.title, questions: 15, duration: 15 }
                    })}
                  >
                    <Text style={styles.challengeStartText}>Start</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            
            {myChallenges.length > 3 && (
              <Pressable
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowAllMy(!showAllMy)}
              >
                <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                  {showAllMy ? 'View Less' : 'Load More'}
                </Text>
              </Pressable>
            )}
          </>
        )}

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
          {(showAllPublic ? publicChallenges : publicChallenges.slice(0, 3)).map((c) => (
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
                <Text style={[styles.challengeAuthor, { color: muted, fontSize: 10, fontWeight: '700' }]} numberOfLines={1}>{c.author}</Text>
              </View>
              <Pressable
                style={[styles.challengeStartBtn, { backgroundColor: card, borderWidth: 1, borderColor: border }]}
                onPress={() => navigation.navigate('MockInstruction', {
                  mockData: { title: c.title, questions: c.questionCount || 15, duration: c.timeLimit || 15 }
                })}
              >
                <Text style={[styles.challengeStartText, { color: text }]}>Start</Text>
              </Pressable>
            </View>
          ))}
        </View>

        {publicChallenges.length > 3 && (
          <Pressable
            style={{ paddingVertical: 12, alignItems: 'center' }}
            onPress={() => setShowAllPublic(!showAllPublic)}
          >
            <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
              {showAllPublic ? 'View Less' : 'Load More'}
            </Text>
          </Pressable>
        )}

        {/* Recent history section */}
        {recentAttempts.length > 0 ? (
          <>
            <Text style={[styles.sectionTitle, { color: text, marginTop: 16 }]}>Recent History</Text>
            <View style={styles.challengeList}>
              {recentAttempts.slice(0, 3).map((attempt: any) => (
                <View
                  key={attempt._id || Math.random().toString()}
                  style={[styles.challengeListItem, { backgroundColor: cardSoft, borderColor: border, borderWidth: 1 }]}
                >
                  <View style={[styles.challengeIconWrap, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color={muted} />
                  </View>
                  <View style={styles.challengeInfo}>
                    <Text style={[styles.challengeTitle, { color: text }]} numberOfLines={1}>{attempt.testId?.title || 'Custom Mock Attempt'}</Text>
                    <Text style={[styles.challengeMeta, { color: muted }]} numberOfLines={1}>Score: {attempt.score || 0}</Text>
                    <Text style={[styles.challengeAuthor, { color: muted, fontSize: 10 }]} numberOfLines={1}>{new Date(attempt.createdAt || Date.now()).toLocaleDateString()}</Text>
                  </View>
                  <Pressable
                    style={[styles.challengeStartBtn, { backgroundColor: card, borderWidth: 1, borderColor: border }]}
                    onPress={() => {}}
                  >
                    <Text style={[styles.challengeStartText, { color: text, fontSize: 12 }]}>Review</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: text, marginTop: 16 }]}>Recent History</Text>
            <View style={[styles.historyCard, { backgroundColor: cardSoft, borderColor: border }]}>
              <View style={styles.historyIconCircle}>
                <Ionicons name="time-outline" size={22} color={muted} />
              </View>
              <Text style={[styles.historyTitle, { color: text }]}>No history found</Text>
              <Text style={[styles.historySub, { color: muted }]}>
                Start attempting mocks to see your performance summary here.
              </Text>
              <Pressable style={[styles.historyBtn, { borderColor: primary }]} onPress={() => navigation.navigate('CreateMock')}>
                <Text style={[styles.historyBtnText, { color: primary }]}>Start a Mock</Text>
              </Pressable>
            </View>
          </>
        )}

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
  lockedNotice: {
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  lockedNoticeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  lockedNoticeText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
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

