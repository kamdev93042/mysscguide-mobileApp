import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoginModal } from '../context/LoginModalContext';
import { useTheme } from '../context/ThemeContext';

const SLIDES = [
  {
    title: 'Live Quizzes & Tests',
    subtitle: 'Attempt daily mock tests and boost your preparation level.',
    btn: 'Try For Free',
    bg: '#059669',
  },
  {
    title: 'MySSCguide',
    subtitle: 'The ultimate platform where students solve questions for SSC exams confidently.',
    btn: 'Start Solving',
    bg: '#047857',
  },
];

const SUBJECT_CARDS = [
  { label: 'Quant. Aptitude Solved', value: '450', icon: 'calculator', color: '#eab308' },
  { label: 'Gen. Intelligence Solved', value: '320', icon: 'bulb', color: '#a855f7' },
  { label: 'English Language Solved', value: '280', icon: 'document-text', color: '#ec4899' },
  { label: 'Gen. Awareness Solved', value: '500', icon: 'globe', color: '#c084fc' },
];


export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName } = useLoginModal();
  const { isDark, toggleTheme } = useTheme();
  const [slideIndex, setSlideIndex] = useState(0);
  const scrollRef = useRef(null);

  const displayName = userName || 'User';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';

  useEffect(() => {
    const t = setInterval(() => {
      setSlideIndex((i) => {
        const next = (i + 1) % SLIDES.length;
        scrollRef.current?.scrollTo({ x: next * width, animated: true });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [width]);

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
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
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.welcomeTitle, { color: text }]}>
          Welcome back, {displayName}!
        </Text>
        <Text style={[styles.welcomeSub, { color: muted }]}>
          Let's crush your goals today.
        </Text>

        {/* Ad Slider */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / width);
            setSlideIndex(i);
          }}
          style={[styles.slider, { width }]}
          contentContainerStyle={{ width: width * SLIDES.length }}
        >
          {SLIDES.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View style={[styles.slideInner, { backgroundColor: s.bg }]}>
                <Text style={styles.slideTitle}>{s.title}</Text>
                <Text style={styles.slideSub}>{s.subtitle}</Text>
                <Pressable style={styles.slideBtn}>
                  <Text style={styles.slideBtnText}>{s.btn}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === slideIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Subject Wise Performance */}
        <Text style={[styles.sectionTitle, { color: text }]}>
          Subject Wise Performance
        </Text>
        <View style={styles.subjectGrid}>
          {SUBJECT_CARDS.map((item) => (
            <View
              key={item.label}
              style={[styles.subjectCard, { backgroundColor: cardBg, borderColor: border }]}
            >
              <View style={[styles.subjectIconWrap, { backgroundColor: item.color + '30' }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={[styles.subjectValue, { color: text }]}>{item.value}</Text>
              <Text style={[styles.subjectLabel, { color: muted }]} numberOfLines={2}>
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Today's Target */}
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(5, 150, 105, 0.2)' }]}>
            <Ionicons name="flag" size={22} color="#059669" />
          </View>
          <Text style={[styles.blockTitle, { color: text }]}>TODAY'S TARGET</Text>
          <Text style={[styles.blockSub, { color: muted }]}>
            Your day is clear. Start fresh!
          </Text>
          <Pressable style={styles.blockBtn}>
            <Text style={styles.blockBtnText}>+ NEW TARGET</Text>
          </Pressable>
        </View>

        {/* Daily Challenge */}
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
            <Ionicons name="stopwatch" size={22} color="#3b82f6" />
          </View>
          <Text style={[styles.blockTitle, { color: text }]}>DAILY CHALLENGE</Text>
          <Text style={[styles.blockSub, { color: muted }]} numberOfLines={2}>
            Complete 50 calculation questions in 30 mins to boost your speed.
          </Text>
          <Pressable style={styles.blockBtn}>
            <Text style={styles.blockBtnText}>START NOW →</Text>
          </Pressable>
        </View>

        {/* Daily Quiz */}
        <View style={[styles.blockCard, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={[styles.blockIconWrap, { backgroundColor: 'rgba(236, 72, 153, 0.2)' }]}>
            <Ionicons name="help-circle" size={22} color="#ec4899" />
          </View>
          <Text style={[styles.blockTitle, { color: text }]}>DAILY QUIZ</Text>
          <Text style={[styles.blockSub, { color: muted }]} numberOfLines={2}>
            10 mixed questions from Quant, Reasoning, English, and GA.
          </Text>
          <Pressable style={styles.blockBtn}>
            <Text style={styles.blockBtnText}>PLAY QUIZ →</Text>
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
  welcomeTitle: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  welcomeSub: { fontSize: 15, marginBottom: 16 },
  slider: { marginHorizontal: -16, marginBottom: 8 },
  slide: {
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  slideInner: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 12,
  },
  slideTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  slideSub: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginBottom: 16 },
  slideBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  slideBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#475569' },
  dotActive: { backgroundColor: '#059669', width: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  subjectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  subjectCard: {
    width: '48%',
    padding: 10,
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  subjectLabel: { fontSize: 12, textAlign: 'center' },
  blockCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  blockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  blockTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  blockSub: { fontSize: 14, marginBottom: 12, textAlign: 'center' },
  blockBtn: { alignSelf: 'center' },
  blockBtnText: { color: '#059669', fontWeight: '700', fontSize: 14 },
  shortcutsGrid: {
    marginTop: 4,
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
  shortcutCard: {
    width: '48%',
    padding: 12,
    marginHorizontal: 6,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  shortcutSpacer: {
    width: '48%',
    marginHorizontal: 6,
    marginVertical: 6,
  },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  shortcutTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  shortcutTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4 },
  shortcutTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  shortcutSub: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
