import { ScrollView, View, Text, StyleSheet, Pressable, Modal, Image, Platform } from 'react-native';
import { useState, createElement } from 'react';
import { useNavigation } from '@react-navigation/native';

let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

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
  {
    id: '4',
    title: 'SSC CGL 2024 Tier1',
    shift: 'Shift 3',
    date: '10 Sep 2024',
    questions: '100 Questions',
    duration: '60 min',
  },
  {
    id: '5',
    title: 'SSC CGL 2024 Tier1',
    shift: 'Shift 2',
    date: '10 Sep 2024',
    questions: '100 Questions',
    duration: '60 min',
  },
];

const RANK_MAKER_LIST = [
  { id: 'rm1', title: 'Rank Maker Series — Test 1', questions: '100 Questions', duration: '60 min' },
  { id: 'rm2', title: 'Rank Maker Series — Test 2', questions: '100 Questions', duration: '60 min' },
  { id: 'rm3', title: 'Rank Maker Series — Test 3', questions: '100 Questions', duration: '60 min' },
  { id: 'rm4', title: 'Rank Maker Series — Test 4', questions: '100 Questions', duration: '60 min' },
  { id: 'rm5', title: 'Rank Maker Series — Test 5', questions: '100 Questions', duration: '60 min' },
];

const FILTER_DATA_PYQ = {
  Exam: ['All Exams', 'CGL', 'CHSL', 'MTS', 'CPO'],
  Tier: ['All Tiers', 'Tier 1', 'Tier 2'],
  Year: ['All Years', '2025', '2024', '2023', '2022'],
  Shift: ['All Shifts', 'Shift 1', 'Shift 2', 'Shift 3', 'Shift 4'],
  Date: [], // directly triggers date picker
};

const FILTER_DATA_RM = {
  Exam: ['All Exams', 'CGL', 'CHSL', 'MTS', 'CPO'],
  Tier: ['All Tiers', 'Tier 1', 'Tier 2'],
  Year: ['All Years', '2025', '2024', '2023', '2022', '2021', '2020', '2019'],
};

export default function PyqsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'RankMaker' | 'PYQ'>('RankMaker');

  const [showAllPyqs, setShowAllPyqs] = useState(false);
  const [showAllRM, setShowAllRM] = useState(false);

  const [filters, setFilters] = useState({
    Exam: 'Exam',
    Tier: 'Tier',
    Year: 'Year',
    Shift: 'Shift',
    Date: 'Date',
  });
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateObj, setDateObj] = useState(new Date());

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#1e293b' : '#e5e7eb';
  const text = isDark ? '#ffffff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const primary = '#059669';

  const filterData = activeTab === 'PYQ' ? FILTER_DATA_PYQ : FILTER_DATA_RM;

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      {/* Header */}
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
            <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color="#059669" />
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
        {/* Hero Banner */}
        <View style={[styles.heroCard, { backgroundColor: primary }]}>
           <View style={{ flex: 1 }}>
              <View style={styles.heroTagWrap}>
                <Ionicons name="sparkles" size={12} color="#bbf7d0" style={{ marginRight: 4 }} />
                <Text style={styles.heroTag}>First Time Here?</Text>
              </View>
              <Text style={styles.heroTitle}>MASTER PREVIOUS YEAR PAPERS.</Text>
              <Text style={styles.heroSub}>
                 Practice with authentic previous year questions from CGL, CHSL, MTS, and CPO to boost your confidence and exam readiness.
              </Text>
              <Pressable style={styles.heroBtn}>
                 <Text style={styles.heroBtnText}>Start Practicing <Ionicons name="chevron-forward" size={12} color="#166534" /></Text>
              </Pressable>
           </View>
        </View>

        {/* Custom Tab Toggle (Native Mobile Segmented Control Style) */}
        <View style={styles.tabWrapper}>
          <View style={[styles.tabContainer, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]}>
            <Pressable 
              style={[
                styles.tabBtn, 
                activeTab === 'RankMaker' && [styles.activeTabBtn, { backgroundColor: primary }]
              ]}
              onPress={() => setActiveTab('RankMaker')}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'RankMaker' ? '#fff' : muted }
              ]}>Rank Maker Series</Text>
            </Pressable>
            <Pressable 
              style={[
                styles.tabBtn, 
                activeTab === 'PYQ' && [styles.activeTabBtn, { backgroundColor: primary }]
              ]}
              onPress={() => setActiveTab('PYQ')}
            >
              <Text style={[
                styles.tabText, 
                { color: activeTab === 'PYQ' ? '#fff' : muted }
              ]}>PYQ</Text>
            </Pressable>
          </View>
        </View>

        {/* Mobile Horizontal Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterScrollContent}
        >
          {Object.keys(filterData).map((key) => {
            const isActive = filters[key as keyof typeof filters] !== key;
            return (
              <View key={key} style={styles.filterWrap}>
                <Text style={[styles.filterLabel, { color: muted }]}>{key}</Text>
                <Pressable
                  style={[
                    styles.filterPill,
                    { backgroundColor: card, borderColor: isActive ? primary : border },
                    isActive && { backgroundColor: isDark ? primary + '20' : primary + '10' }
                  ]}
                  onPress={() => {
                    if (key === 'Date') {
                      setShowDatePicker(true);
                    } else {
                      setActiveFilter(key);
                    }
                  }}
                >
                  <Text style={[styles.filterPillText, { color: isActive ? primary : text }]}>
                    {filters[key as keyof typeof filters] === key ? (key === 'Date' ? 'Date' : 'All') : filters[key as keyof typeof filters]}
                  </Text>
                  <Ionicons name="calendar-outline" size={14} color={isActive ? primary : muted} style={{ display: key === 'Date' ? 'flex' : 'none' }} />
                  <Ionicons name="chevron-down" size={14} color={isActive ? primary : muted} style={{ display: key !== 'Date' ? 'flex' : 'none' }} />
                </Pressable>
              </View>
            );
          })}
        </ScrollView>

        {activeTab === 'RankMaker' && (
          <Text style={[styles.infoText, { color: muted }]}>Will be available from 2nd April.</Text>
        )}

        {/* Test List Section */}
        {activeTab === 'PYQ' ? (
          <>
            {(showAllPyqs ? PYQ_LIST : PYQ_LIST.slice(0, 3)).map((item) => (
              <View
                key={item.id}
                style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
              >
                <View style={styles.testInfoCol}>
                  <View style={styles.testMetaTopRow}>
                    <Ionicons name="document-text-outline" size={14} color={muted} />
                    <Text style={[styles.testExamName, { color: muted }]}>CGL</Text>
                  </View>
                  <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                  <Text style={[styles.testMetaDetails, { color: muted }]}>
                    {item.questions} · {item.duration} · Held on {item.date} ({item.shift})
                  </Text>
                </View>
                <Pressable 
                  style={[styles.startBtn, { backgroundColor: primary }]}
                  onPress={() => navigation.navigate('MockInstruction', { mockData: { title: item.title, questions: parseInt(item.questions), duration: parseInt(item.duration) }})}
                >
                  <Text style={[styles.startBtnText, { color: '#fff' }]}>Start</Text>
                </Pressable>
              </View>
            ))}
            {PYQ_LIST.length > 3 && (
              <Pressable
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowAllPyqs(!showAllPyqs)}
              >
                <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                  {showAllPyqs ? 'View Less' : 'Load More'}
                </Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            {(showAllRM ? RANK_MAKER_LIST : RANK_MAKER_LIST.slice(0, 3)).map((item) => (
              <View
                key={item.id}
                style={[styles.testCard, { backgroundColor: card, borderColor: border }]}
              >
                <View style={styles.testInfoCol}>
                  <View style={styles.testMetaTopRow}>
                    <Ionicons name="document-text-outline" size={14} color={muted} />
                    <Text style={[styles.testExamName, { color: muted }]}>CGL</Text>
                  </View>
                  <Text style={[styles.testTitle, { color: text }]}>{item.title}</Text>
                  <Text style={[styles.testMetaDetails, { color: muted }]}>
                    {item.questions} · {item.duration}
                  </Text>
                </View>
                <Pressable 
                  style={[styles.startBtn, { backgroundColor: primary }]}
                  onPress={() => navigation.navigate('MockInstruction', { mockData: { title: item.title, questions: parseInt(item.questions), duration: parseInt(item.duration) }})}
                >
                  <Text style={[styles.startBtnText, { color: '#fff' }]}>Start</Text>
                </Pressable>
              </View>
            ))}
            {RANK_MAKER_LIST.length > 3 && (
              <Pressable
                style={{ paddingVertical: 12, alignItems: 'center' }}
                onPress={() => setShowAllRM(!showAllRM)}
              >
                <Text style={{ color: primary, fontWeight: '700', fontSize: 13 }}>
                  {showAllRM ? 'View Less' : 'Load More'}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Recent history section */}
        <Text style={[styles.sectionTitle, { color: text, marginTop: 16 }]}>Recent History</Text>
        <View style={[styles.historyCard, { backgroundColor: isDark ? '#020617' : '#f1f5f9', borderColor: border }]}>
          <View style={styles.historyIconCircle}>
            <Ionicons name="time-outline" size={22} color={muted} />
          </View>
          <Text style={[styles.historyTitle, { color: text }]}>No history found</Text>
          <Text style={[styles.historySub, { color: muted }]}>
            Start attempting previous year papers to see your history here.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Bottom Sheet Modal for Filters */}
      <Modal
        visible={!!activeFilter}
        transparent
        animationType="fade"
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
            {activeFilter && filterData[activeFilter as keyof typeof filterData] && (
              <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                {filterData[activeFilter as keyof typeof filterData].map((item) => {
                  const isSelected = filters[activeFilter as keyof typeof filters] === item || (filters[activeFilter as keyof typeof filters] === activeFilter && item.startsWith('All'));
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

      {/* Date Picker Modal (iOS) */}
      {showDatePicker && Platform.OS === 'ios' && DateTimePicker && (
        <Modal transparent animationType="slide">
           <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
                 <View style={styles.modalHeader}>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: 'Date' }));
                    }} hitSlop={10}>
                       <Text style={{ color: muted, fontSize: 16 }}>Clear</Text>
                    </Pressable>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         const dd = String(dateObj.getDate()).padStart(2, '0');
                         const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                         const yyyy = dateObj.getFullYear();
                         setFilters((prev) => ({ ...prev, Date: `${dd}-${mm}-${yyyy}` }));
                    }} hitSlop={10}>
                       <Text style={{ color: primary, fontSize: 16, fontWeight: '700' }}>Confirm</Text>
                    </Pressable>
                 </View>
                 <DateTimePicker
                   value={dateObj}
                   mode="date"
                   display="spinner"
                   textColor={text}
                   onChange={(e: any, d: Date | undefined) => d && setDateObj(d)}
                 />
              </View>
           </Pressable>
        </Modal>
      )}

      {/* Date Picker (Android fallback) */}
      {showDatePicker && Platform.OS === 'android' && DateTimePicker && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={(event: any, selectedDate: Date | undefined) => {
            setShowDatePicker(false);
            if (selectedDate && event.type === 'set') {
              setDateObj(selectedDate);
              const dd = String(selectedDate.getDate()).padStart(2, '0');
              const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const yyyy = selectedDate.getFullYear();
              setFilters((prev) => ({ ...prev, Date: `${dd}-${mm}-${yyyy}` }));
            }
          }}
        />
      )}

      {/* Web Fallback */}
      {showDatePicker && Platform.OS === 'web' && (
        <Modal transparent animationType="fade">
           <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
              <View style={[styles.modalContent, { backgroundColor: card }]} onStartShouldSetResponder={() => true}>
                 <View style={styles.modalHeader}>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         setFilters((prev) => ({ ...prev, Date: 'Date' }));
                    }} hitSlop={10}>
                       <Text style={{ color: muted, fontSize: 16 }}>Clear</Text>
                    </Pressable>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: text }}>Select Date</Text>
                    <Pressable onPress={() => {
                         setShowDatePicker(false);
                         const dd = String(dateObj.getDate()).padStart(2, '0');
                         const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                         const yyyy = dateObj.getFullYear();
                         setFilters((prev) => ({ ...prev, Date: `${dd}-${mm}-${yyyy}` }));
                    }} hitSlop={10}>
                       <Text style={{ color: primary, fontSize: 16, fontWeight: '700' }}>Confirm</Text>
                    </Pressable>
                 </View>
                 {createElement('input', {
                    type: 'date',
                    style: {
                       padding: '16px',
                       borderRadius: '8px',
                       border: `1px solid ${border}`,
                       outline: 'none',
                       fontSize: '16px',
                       color: text,
                       backgroundColor: bg,
                       width: '100%',
                    },
                    value: dateObj.toISOString().split('T')[0],
                    onChange: (e: any) => {
                       const d = new Date(e.target.value);
                       if (!isNaN(d.getTime())) setDateObj(d);
                    }
                 })}
                 <View style={{ height: 32 }} />
              </View>
           </Pressable>
        </Modal>
      )}
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
     padding: 20,
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 20,
  },
  heroTagWrap: {
     flexDirection: 'row',
     alignItems: 'center',
     paddingHorizontal: 8,
     paddingVertical: 4,
     backgroundColor: 'rgba(255,255,255,0.15)',
     alignSelf: 'flex-start',
     borderRadius: 999,
     marginBottom: 10,
  },
  heroTag: { fontSize: 10, fontWeight: '700', color: '#bbf7d0' },
  heroTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff', marginBottom: 8, textTransform: 'uppercase' },
  heroSub: { fontSize: 13, color: '#dcfce7', marginBottom: 14, lineHeight: 18 },
  heroBtn: {
     borderRadius: 999,
     backgroundColor: '#ffffff',
     paddingVertical: 10,
     paddingHorizontal: 16,
     alignSelf: 'flex-start',
     flexDirection: 'row',
     alignItems: 'center',
  },
  heroBtnText: { fontSize: 13, fontWeight: '800', color: '#166534' },

  tabWrapper: {
     paddingHorizontal: 0,
     marginBottom: 20,
  },
  tabContainer: {
     flexDirection: 'row',
     borderRadius: 12,
     padding: 4,
     width: '100%',
  },
  tabBtn: {
     flex: 1,
     paddingVertical: 10,
     borderRadius: 10,
     alignItems: 'center',
     justifyContent: 'center',
  },
  activeTabBtn: {
     shadowColor: '#000',
     shadowOffset: { width: 0, height: 2 },
     shadowOpacity: 0.15,
     shadowRadius: 3,
     elevation: 2,
  },
  tabText: {
     fontSize: 14,
     fontWeight: '700',
     textAlign: 'center',
  },

  filterScroll: {
    marginBottom: 20,
    maxHeight: 60,
    marginHorizontal: -16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterWrap: {
     flexDirection: 'column',
  },
  filterLabel: {
     fontSize: 11,
     marginBottom: 4,
     fontWeight: '500',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minWidth: 100,
    justifyContent: 'space-between',
  },
  filterPillText: { fontSize: 13, fontWeight: '600' },
  
  infoText: {
     fontSize: 13,
     marginBottom: 12,
  },

  testCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  },
  testInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  testMetaTopRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 6,
     gap: 4,
  },
  testExamName: {
     fontSize: 12,
     fontWeight: '600',
  },
  testTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  testMetaDetails: { fontSize: 12 },
  startBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  startBtnText: { fontSize: 13, fontWeight: '800' },

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

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
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
});

