import { ScrollView, View, Text, StyleSheet, Pressable, Modal, Image } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const RECENT_TEST = {
  title: 'YOUR PREVIOUS TEST ANALYSIS.',
  subtitle: 'CGL (26_09_2025) — Keep practicing to improve your rank and accuracy.',
  score: '-0.5/200 Marks',
  accuracy: '0.0% Accuracy',
  time: '20s Time',
  percentile: '0% Percentile',
};

const PYQ_LIST = [
  {
    id: '1',
    title: 'SSC CGL 2025 Tier1',
    shift: 'Shift 3',
    date: '26 Sep 2025',
    questions: '100 Questions',
    duration: '60 min',
  },
  {
    id: '2',
    title: 'SSC CGL 2025 Tier1',
    shift: 'Shift 2',
    date: '26 Sep 2025',
    questions: '100 Questions',
    duration: '60 min',
  },
  {
    id: '3',
    title: 'SSC CGL 2025 Tier1',
    shift: 'Shift 1',
    date: '25 Sep 2025',
    questions: '100 Questions',
    duration: '60 min',
  },
];

const RECENT_HISTORY = [
  {
    id: 'h1',
    test: 'CGL (26_09_2025)',
    date: 'Mar 1, 2026',
    score: '-0.5',
    rank: '5 / 5',
    accuracy: '0.0%',
    time: '20s',
    percentile: '0%',
  },
];

const FILTER_DATA = {
  Exam: ['All Exams', 'CGL', 'CHSL', 'MTS', 'CPO'],
  Tier: ['All Tiers', 'Tier 1', 'Tier 2'],
  Year: ['All Years', '2025', '2024', '2023', '2022'],
  Shift: ['All Shifts', 'Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'],
  Date: ['Any Date', 'Today', 'Yesterday', 'Custom (dd-mm-yyyy)'],
};

export default function PyqsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark, toggleTheme } = useTheme();

  const [filters, setFilters] = useState({
    Exam: 'Exam',
    Tier: 'Tier',
    Year: 'Year',
    Shift: 'Shift',
    Date: 'Date',
  });
  const [activeFilter, setActiveFilter] = useState(null);

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const highlight = isDark ? '#05966922' : '#dcfce7';
  const border = isDark ? '#1e293b' : '#e5e7eb';
  const text = isDark ? '#ffffff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669';

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      {/* Header copied from dashboard: logo + theme + notifications */}
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
        {/* Previous test analysis card */}
        <View style={[styles.analysisCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.analysisHeader}>
            <View style={[styles.pill, { backgroundColor: highlight }]}>
              <Ionicons name="trophy" size={14} color={primary} />
              <Text style={[styles.pillText, { color: primary }]}>Last Test Result</Text>
            </View>
          </View>
          <Text style={[styles.analysisTitle, { color: text }]}>{RECENT_TEST.title}</Text>
          <Text style={[styles.analysisSubtitle, { color: muted }]}>{RECENT_TEST.subtitle}</Text>

          <View style={styles.analysisRow}>
            <View style={styles.analysisCol}>
              <Text style={[styles.analysisLabel, { color: muted }]}>Score</Text>
              <Text style={[styles.analysisValue, { color: text }]}>{RECENT_TEST.score}</Text>
            </View>
            <View style={styles.analysisCol}>
              <Text style={[styles.analysisLabel, { color: muted }]}>Accuracy</Text>
              <Text style={[styles.analysisValue, { color: text }]}>{RECENT_TEST.accuracy}</Text>
            </View>
          </View>
          <View style={styles.analysisRow}>
            <View style={styles.analysisCol}>
              <Text style={[styles.analysisLabel, { color: muted }]}>Time</Text>
              <Text style={[styles.analysisValue, { color: text }]}>{RECENT_TEST.time}</Text>
            </View>
            <View style={styles.analysisCol}>
              <Text style={[styles.analysisLabel, { color: muted }]}>Percentile</Text>
              <Text style={[styles.analysisValue, { color: text }]}>{RECENT_TEST.percentile}</Text>
            </View>
          </View>

          <Pressable style={[styles.primaryBtn, { backgroundColor: primary }]}>
            <Text style={styles.primaryBtnText}>View Full Analysis</Text>
          </Pressable>
        </View>

        {/* Mobile Horizontal Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {Object.keys(FILTER_DATA).map((key) => {
            const isActive = filters[key] !== key;
            return (
              <Pressable
                key={key}
                style={[
                  styles.filterPill,
                  { backgroundColor: card, borderColor: isActive ? primary : border },
                  isActive && { backgroundColor: isDark ? primary + '20' : primary + '10' }
                ]}
                onPress={() => setActiveFilter(key)}
              >
                <Text style={[styles.filterPillText, { color: isActive ? primary : text }]}>
                  {filters[key] === key ? key : filters[key]}
                </Text>
                <Ionicons name="chevron-down" size={14} color={isActive ? primary : muted} />
              </Pressable>
            );
          })}
        </ScrollView>

        {/* PYQ cards list */}
        <Text style={[styles.sectionTitle, { color: text, paddingHorizontal: 0, marginTop: 8 }]}>Available PYQs</Text>
        {PYQ_LIST.map((item) => (
          <View
            key={item.id}
            style={[styles.pyqCard, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.pyqInfoCol}>
              <Text style={[styles.pyqTitle, { color: text }]}>{item.title}</Text>
              <Text style={[styles.pyqMeta, { color: muted }]}>
                Held on {item.date} · {item.shift}
              </Text>
              <Text style={[styles.pyqMeta, { color: muted }]}>
                {item.questions} · {item.duration}
              </Text>
            </View>
            <Pressable style={[styles.secondaryBtn, { backgroundColor: primary + '15' }]}>
              <Text style={[styles.secondaryBtnText, { color: primary }]}>Start</Text>
            </Pressable>
          </View>
        ))}

        {/* Recent history card */}
        <Text style={[styles.sectionTitle, { color: text, paddingHorizontal: 0 }]}>Recent History</Text>
        {RECENT_HISTORY.map((h) => (
          <View
            key={h.id}
            style={[styles.historyCard, { backgroundColor: card, borderColor: border }]}
          >
            <View style={styles.historyHeaderRow}>
              <View>
                <Text style={[styles.historyTest, { color: text }]}>{h.test}</Text>
                <Text style={[styles.historyDate, { color: muted }]}>{h.date}</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="flash" size={14} color={primary} />
              </View>
            </View>
            <View style={styles.historyStatsRow}>
              <View style={styles.historyStat}>
                <Text style={[styles.historyLabel, { color: muted }]}>Rank</Text>
                <Text style={[styles.historyValue, { color: text }]}>{h.rank}</Text>
              </View>
              <View style={styles.historyStat}>
                <Text style={[styles.historyLabel, { color: muted }]}>Score</Text>
                <Text style={[styles.historyValue, { color: text }]}>{h.score}</Text>
              </View>
              <View style={styles.historyStat}>
                <Text style={[styles.historyLabel, { color: muted }]}>Accuracy</Text>
                <Text style={[styles.historyValue, { color: text }]}>{h.accuracy}</Text>
              </View>
              <View style={styles.historyStat}>
                <Text style={[styles.historyLabel, { color: muted }]}>Percentile</Text>
                <Text style={[styles.historyValue, { color: text }]}>{h.percentile}</Text>
              </View>
            </View>
            <Pressable style={[styles.primaryBtn, { backgroundColor: primary }]}>
              <Text style={styles.primaryBtnText}>View Result & Solution</Text>
            </Pressable>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Sheet Modal for Filters */}
      <Modal
        visible={!!activeFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveFilter(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveFilter(null)}>
          <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: text }]}>Select {activeFilter}</Text>
              <Pressable onPress={() => setActiveFilter(null)} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>
            {activeFilter && (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {FILTER_DATA[activeFilter].map((item) => {
                  const isSelected = filters[activeFilter] === item || (filters[activeFilter] === activeFilter && item.startsWith('All'));
                  return (
                    <Pressable
                      key={item}
                      style={[
                        styles.modalOption,
                        { borderBottomColor: border },
                        isSelected && { backgroundColor: isDark ? primary + '20' : primary + '10' }
                      ]}
                      onPress={() => {
                        setFilters((prev) => ({
                          ...prev,
                          [activeFilter]: item.startsWith('All') || item.startsWith('Any') ? activeFilter : item,
                        }));
                        setActiveFilter(null);
                      }}
                    >
                      <Text style={[styles.modalOptionText, { color: isSelected ? primary : text }]}>
                        {item}
                      </Text>
                      {isSelected && <Ionicons name="checkmark" size={20} color={primary} />}
                    </Pressable>
                  );
                })}
                <View style={{ height: 20 }} />
              </ScrollView>
            )}
          </View>
        </Pressable>
      </Modal>
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
  analysisCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 6,
  },
  pillText: { fontSize: 11, fontWeight: '600' },
  analysisTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  analysisSubtitle: { fontSize: 13, marginBottom: 10 },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  analysisCol: { flex: 1 },
  analysisLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  analysisValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  primaryBtn: {
    marginTop: 10,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  filterScroll: {
    marginBottom: 16,
    maxHeight: 40,
    marginHorizontal: -16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, paddingHorizontal: 16 },
  pyqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  pyqInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  pyqTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  pyqMeta: { fontSize: 13, marginBottom: 2 },
  secondaryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
  historyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTest: { fontSize: 14, fontWeight: '700' },
  historyDate: { fontSize: 12, marginTop: 2 },
  badge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(34,197,94,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyStat: { flex: 1 },
  historyLabel: { fontSize: 11, textTransform: 'uppercase' },
  historyValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalList: { paddingBottom: 20 },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  modalOptionText: { fontSize: 15, fontWeight: '500' },
});

