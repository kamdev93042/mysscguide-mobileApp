import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Image,
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

const QUICK_PERKS = [
  {
    id: 'tests',
    icon: 'infinite-outline' as const,
    label: 'Unlimited Tests',
  },
  {
    id: 'contests',
    icon: 'trophy-outline' as const,
    label: 'Live Contests',
  },
  {
    id: 'analytics',
    icon: 'bar-chart-outline' as const,
    label: 'Deep Analytics',
  },
  {
    id: 'mistakes',
    icon: 'shield-checkmark-outline' as const,
    label: 'Mistake Tracker',
  },
  {
    id: 'streak',
    icon: 'flame-outline' as const,
    label: 'Daily Streaks',
  },
  {
    id: 'pyq',
    icon: 'checkmark-done-circle-outline' as const,
    label: 'All PYQ Papers',
  },
] as const;

const EVERYTHING = [
  {
    id: 'prev-year',
    icon: 'book-outline' as const,
    iconBg: ['#10b981', '#0d9488'],
    title: 'Previous Year Papers',
    desc: 'Real SSC CGL, CHSL, MTS papers in exact exam interface.',
  },
  {
    id: 'builder',
    icon: 'radio-button-on-outline' as const,
    iconBg: ['#2563eb', '#6366f1'],
    title: 'Custom Mock Builder',
    desc: 'Pick subjects, topics, difficulty and time. Build your own tests.',
  },
  {
    id: 'live',
    icon: 'trophy-outline' as const,
    iconBg: ['#f59e0b', '#f97316'],
    title: 'Live Contests',
    desc: 'Compete in real-time with rating system. Climb the leaderboard.',
  },
  {
    id: 'mnemonics',
    icon: 'bulb-outline' as const,
    iconBg: ['#7c3aed', '#9333ea'],
    title: 'Community Mnemonics',
    desc: 'Memory tricks shared by fellow aspirants. Learn smarter, faster.',
  },
  {
    id: 'typing',
    icon: 'keypad-outline' as const,
    iconBg: ['#0284c7', '#0ea5e9'],
    title: 'Typing Test + GK',
    desc: 'Practice typing with topic-based passages. Speed + knowledge.',
  },
  {
    id: 'mistake-book',
    icon: 'shield-outline' as const,
    iconBg: ['#e11d48', '#f43f5e'],
    title: 'Mistake Notebook',
    desc: 'Auto-track wrong answers. Add notes, tags and revisit anytime.',
  },
  {
    id: 'forum',
    icon: 'people-outline' as const,
    iconBg: ['#059669', '#14b8a6'],
    title: 'Community Forum',
    desc: 'Discuss doubts, share strategies and connect with serious aspirants.',
  },
  {
    id: 'perf',
    icon: 'stats-chart-outline' as const,
    iconBg: ['#f97316', '#ef4444'],
    title: 'Performance Analytics',
    desc: 'Deep subject-wise and topic-wise insights into your preparation.',
  },
  {
    id: 'daily',
    icon: 'flash-outline' as const,
    iconBg: ['#4f46e5', '#3b82f6'],
    title: 'Daily Challenge & Quiz',
    desc: '20 daily questions + random quizzes anytime.',
  },
  {
    id: 'tip',
    icon: 'newspaper-outline' as const,
    iconBg: ['#db2777', '#e11d48'],
    title: 'Tip of the Day',
    desc: 'Expert-curated daily tips, tricks and vocab to stay sharp.',
  },
] as const;

const FAQS = [
  {
    id: 'what',
    q: 'What is Selection Key?',
    a: 'Selection Key is our premium plan that unlocks full access to all features in MySSCguide, including unlimited mock tests, live contests, previous year papers, typing tests, mnemonics, and deep performance analytics.',
  },
  {
    id: 'include',
    q: 'What does INR 249/year include?',
    a: 'It includes one full year of premium access: unlimited tests, advanced analytics, all PYQ papers, daily challenges, community tools, and premium-only practice modules.',
  },
  {
    id: 'trial',
    q: 'Can I try before buying?',
    a: 'Yes. Most core features are available in free mode with limits. You can explore the interface and upgrade when you are ready for full access.',
  },
  {
    id: 'refund',
    q: 'Is there a refund policy?',
    a: 'If your purchase has a billing issue or technical activation problem, contact support. Eligible refund and credit requests are reviewed as per policy.',
  },
  {
    id: 'mobile',
    q: 'Can I access on mobile?',
    a: 'Yes. Selection Key works on mobile and web with the same account, so your tests and progress sync across devices.',
  },
] as const;

export default function PremiumScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  const { userName } = useLoginModal();
  const hasUnreadNotifications = useHasUnreadNotifications();
  const [openFaqId, setOpenFaqId] = useState<string>(FAQS[0].id);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#152033' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#ffffff' : '#0f172a';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const isTwoColumn = width >= 390;

  const initials = (userName || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U';

  const cardWidth = useMemo(() => (isTwoColumn ? '48.4%' : '100%'), [isTwoColumn]);

  const toggleFaq = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenFaqId((prev) => (prev === id ? '' : id));
  };

  const handleBuy = () => {
    Alert.alert('Selection Key', 'Payment integration can be connected next.');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.logoRow}>
            <Image source={require('../assets/sscguidelogo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={[styles.logoText, { color: text }]}>My<Text style={styles.logoHighlight}>SSC</Text>guide</Text>
          </View>

          <View style={styles.headerRight}>
            <Pressable style={[styles.iconBtn, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications" size={18} color="#f59e0b" />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate('MenuDrawer')}>
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.premiumPill}>
            <Ionicons name="key-outline" size={14} color="#059669" />
            <Text style={styles.premiumPillText}>PREMIUM PLAN</Text>
          </View>

          <Text style={[styles.heroTitle, { color: text }]}>Selection <Text style={styles.heroKey}>Key</Text></Text>
          <Text style={[styles.heroSub, { color: muted }]}>One key unlocks everything you need to crack your SSC exam. Unlimited access. Zero restrictions.</Text>

          <View style={styles.priceWrap}>
            <Text style={[styles.priceMain, { color: text }]}>INR 249 <Text style={[styles.pricePeriod, { color: muted }]}>/year</Text></Text>
            <Text style={[styles.priceNote, { color: muted }]}>That is about <Text style={styles.priceAccent}>INR 0.68/day</Text> for full access</Text>
          </View>

          <Pressable style={styles.ctaBtn} onPress={handleBuy}>
            <Ionicons name="sparkles-outline" size={16} color="#ffffff" />
            <Text style={styles.ctaBtnText}>Get Selection Key</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </Pressable>

          <View style={styles.smallMetaRow}>
            <Text style={[styles.smallMetaItem, { color: muted }]}>
              <Ionicons name="shield-checkmark-outline" size={12} color="#059669" /> Secure payment
            </Text>
            <Text style={[styles.smallMetaItem, { color: muted }]}>
              <Ionicons name="checkmark-circle-outline" size={12} color="#059669" /> Instant access
            </Text>
            <Text style={[styles.smallMetaItem, { color: muted }]}>
              <Ionicons name="star-outline" size={12} color="#f59e0b" /> 4.8/5 rating
            </Text>
          </View>

          <View style={styles.quickGrid}>
            {QUICK_PERKS.map((perk) => (
              <View key={perk.id} style={[styles.quickItem, { borderColor: border, backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
                <Ionicons name={perk.icon} size={18} color="#059669" />
                <Text style={[styles.quickLabel, { color: text }]}>{perk.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionTitle, { color: text }]}>Everything You Get</Text>
          <Text style={[styles.sectionSub, { color: muted }]}>All premium features in one plan. No hidden charges.</Text>
        </View>

        <View style={[styles.everythingGrid, { marginTop: 8 }]}>
          {EVERYTHING.map((item) => (
            <View key={item.id} style={[styles.benefitCard, { backgroundColor: card, borderColor: border, width: cardWidth }]}>
              <View style={[styles.benefitIconWrap, { backgroundColor: item.iconBg[0] }]}>
                <Ionicons name={item.icon} size={18} color="#ffffff" />
              </View>
              <Text style={[styles.benefitTitle, { color: text }]}>{item.title}</Text>
              <Text style={[styles.benefitDesc, { color: muted }]}>{item.desc}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.bottomCtaCard, { marginTop: 24 }]}>
          <View style={styles.bestValuePill}><Text style={styles.bestValueText}>BEST VALUE</Text></View>
          <Text style={styles.bottomTitle}><Ionicons name="key-outline" size={16} color="#ecfeff" /> Selection Key</Text>
          <Text style={styles.bottomSub}>Full access for 365 days</Text>
          <Text style={styles.bottomPrice}>INR 249 <Text style={styles.bottomPricePeriod}>/year</Text></Text>
          <Text style={styles.bottomSmall}>INR 0.68/day - Cancel anytime</Text>
          <Pressable style={styles.bottomBuyBtn} onPress={handleBuy}>
            <Ionicons name="key-outline" size={16} color="#047857" />
            <Text style={styles.bottomBuyBtnText}>Buy Selection Key</Text>
          </Pressable>
          <Text style={styles.bottomTiny}>100% Secure Payment • Instant Access • 24/7 Support</Text>
        </View>

        <View style={[styles.sectionHeaderWrap, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, { color: text }]}>Frequently Asked Questions</Text>
        </View>

        <View style={[styles.faqWrap, { marginTop: 12 }]}>
          {FAQS.map((faq) => {
            const open = openFaqId === faq.id;
            return (
              <View key={faq.id} style={[styles.faqItem, { borderColor: open ? '#86efac' : border, backgroundColor: card }]}>
                <Pressable style={styles.faqHead} onPress={() => toggleFaq(faq.id)}>
                  <Text style={[styles.faqQ, { color: text }]}>{faq.q}</Text>
                  <View style={[styles.faqChevron, { backgroundColor: open ? '#10b981' : (isDark ? '#1e293b' : '#f1f5f9') }]}>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={open ? '#ffffff' : '#64748b'} />
                  </View>
                </Pressable>
                {open ? (
                  <View style={styles.faqBody}>
                    <Text style={[styles.faqA, { color: muted }]}>{faq.a}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 44, height: 44 },
  logoText: { fontSize: 18, fontWeight: '700', marginLeft: -4 },
  logoHighlight: { color: '#059669' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  premiumPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  premiumPillText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  heroKey: { color: '#059669' },
  heroSub: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  priceWrap: { marginTop: 14, alignItems: 'center' },
  priceMain: { fontSize: 42, fontWeight: '900' },
  pricePeriod: { fontSize: 14, fontWeight: '700' },
  priceNote: { marginTop: 8, fontSize: 13, fontWeight: '600' },
  priceAccent: { color: '#059669', fontWeight: '800' },
  ctaBtn: {
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: '#059669',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  smallMetaRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 6,
    columnGap: 8,
  },
  smallMetaItem: { fontSize: 12, fontWeight: '600' },
  quickGrid: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  quickItem: {
    width: '32.1%',
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  quickLabel: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  sectionHeaderWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionSub: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  everythingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  benefitCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    minHeight: 150,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
  },
  benefitDesc: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  bottomCtaCard: {
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#059669',
    padding: 16,
    alignItems: 'center',
  },
  bestValuePill: {
    backgroundColor: '#facc15',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bestValueText: {
    color: '#92400e',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bottomTitle: {
    marginTop: 12,
    color: '#ecfeff',
    fontSize: 20,
    fontWeight: '800',
  },
  bottomSub: { marginTop: 6, color: '#d1fae5', fontSize: 13, fontWeight: '600' },
  bottomPrice: { marginTop: 14, color: '#ffffff', fontSize: 36, fontWeight: '900' },
  bottomPricePeriod: { color: '#a7f3d0', fontSize: 16, fontWeight: '700' },
  bottomSmall: { marginTop: 6, color: '#a7f3d0', fontSize: 14, fontWeight: '600' },
  bottomBuyBtn: {
    marginTop: 16,
    minHeight: 52,
    width: '100%',
    borderRadius: 14,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  bottomBuyBtnText: { color: '#047857', fontSize: 20, fontWeight: '800' },
  bottomTiny: {
    marginTop: 14,
    color: '#a7f3d0',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  faqWrap: { gap: 10, marginBottom: 8 },
  faqItem: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  faqHead: {
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQ: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  faqChevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faqBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  faqA: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
});
