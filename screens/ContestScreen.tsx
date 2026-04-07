import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';
import { useTheme } from '../context/ThemeContext';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

const FILTERS = ['All', 'Live', 'Upcoming', 'Past'];

export default function ContestScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName } = useLoginModal();
  const { isDark } = useTheme();
  const hasUnreadNotifications = useHasUnreadNotifications();

  const [filterQuery, setFilterQuery] = useState('Upcoming');
  const [filterOpen, setFilterOpen] = useState(false);

  const displayName = userName || 'User';
  const avatarText = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  // Theme colors based on DashboardScreen logic
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      <View style={[styles.appHeader, { borderBottomColor: border, backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <View style={styles.headerTopRow}>
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
            <Pressable
              style={[styles.iconBtn, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}
              hitSlop={8}
              onPress={() => navigation.navigate('Notifications' as never)}
            >
              <Ionicons name="notifications" size={18} color="#f59e0b" />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate('MenuDrawer' as never)}>
              <Text style={styles.avatarText}>{avatarText}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
      >


        {/* Hero Banner Section */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>First time here!</Text>
            <Text style={styles.heroSub}>
              You haven't attempted any contest yet. Join a contest to see your stats and analysis here.
            </Text>

            <Pressable style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>Browse Contests  {'>'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Section Heading & Filter */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleBlock}>
            <Text style={[styles.sectionTitle, { color: '#10b981' }]}>Upcoming Contests</Text>
            <Text style={[styles.sectionSubtitle, { color: muted }]}>
              Practice with verified previous year question papers.
            </Text>
          </View>

          <View style={{ position: 'relative', zIndex: 10 }}>
            <Pressable
              style={[styles.filterBtn, { backgroundColor: cardBg, borderColor: border }]}
              onPress={() => setFilterOpen(!filterOpen)}
            >
              <Ionicons name="filter-outline" size={16} color={muted} />
              <Text style={[styles.filterBtnText, { color: text }]}>Filters</Text>
              <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color={muted} />
            </Pressable>

            {/* Simulated dropdown */}
            {filterOpen && (
              <View style={[styles.filterDropdown, { backgroundColor: cardBg, borderColor: border }]}>
                {FILTERS.map(f => (
                  <Pressable
                    key={f}
                    style={[
                      styles.filterItem,
                      filterQuery === f && { backgroundColor: isDark ? '#334155' : '#f1f5f9' }
                    ]}
                    onPress={() => {
                      setFilterQuery(f);
                      setFilterOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.filterItemText,
                      { color: filterQuery === f ? '#10b981' : text }
                    ]}>
                      {f}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Empty State */}
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
            <Ionicons name="funnel-outline" size={28} color={muted} />
          </View>
          <Text style={[styles.emptyTitle, { color: text }]}>No contests found</Text>
          <Text style={[styles.emptySub, { color: muted }]}>
            Try changing the filter to see more results.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
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
  contentContainer: {
    padding: 16,
  },
  heroBanner: {
    backgroundColor: '#059669', // Match the green banner color roughly
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 40,
    overflow: 'hidden',
  },
  heroContent: {
    flex: 1,
    paddingRight: 16,
    zIndex: 2,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  heroSub: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 20,
  },
  heroBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  heroBtnText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 60,
    zIndex: 10,
  },
  sectionTitleBlock: {
    flex: 1,
    paddingRight: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterDropdown: {
    position: 'absolute',
    top: 44,
    right: 0,
    width: 140,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4, // Android shadow
  },
  filterItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
  },
});
