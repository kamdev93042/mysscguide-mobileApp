import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const POPULAR_EXAMS = [
  'SSC CGL',
  'SSC GD Constable',
  'SSC CHSL',
  'SSC CPO',
  'SSC MTS',
  'SSC Selection Post',
];

const ALL_SSC_EXAMS = [
  'SSC CGL',
  'SSC CHSL',
  'SSC GD Constable',
  'SSC CPO',
  'SSC MTS',
  'SSC Selection Post',
  'SSC Stenographer',
  'SSC JE',
  'SSC JHT',
  'SSC Phase 10',
  'SSC Phase 11',
  'SSC Phase 12',
];

export default function SSCExamsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  const filteredExams = useMemo(() => {
    if (!search.trim()) return ALL_SSC_EXAMS;
    const q = search.trim().toLowerCase();
    return ALL_SSC_EXAMS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const toggleSelect = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>What are you looking for?</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Target Exams"
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <Text style={styles.sectionTitle}>Popular Exams</Text>
        <View style={styles.chipsWrap}>
          {POPULAR_EXAMS.map((name) => (
            <Pressable
              key={name}
              style={styles.chip}
              onPress={() => toggleSelect(name)}
            >
              <View style={styles.chipIcon}>
                <Ionicons name="school" size={16} color="#059669" />
              </View>
              <Text style={styles.chipText}>{name}</Text>
              <Ionicons name="add" size={18} color="#94a3b8" />
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>All SSC Exams</Text>
        <View style={styles.list}>
          {filteredExams.map((name) => {
            const isSelected = selected.has(name);
            return (
              <Pressable
                key={name}
                style={styles.listRow}
                onPress={() => toggleSelect(name)}
              >
                <View style={styles.listIcon}>
                  <Ionicons name="document-text" size={20} color="#059669" />
                </View>
                <Text style={styles.listLabel}>{name}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
<Pressable
            style={styles.startBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Dashboard' })}
          >
            <Text style={styles.startBtnText}>Start Preparation</Text>
          </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRight: { width: 36 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipIcon: { marginRight: 8 },
  chipText: { fontSize: 14, color: '#fff', fontWeight: '500', marginRight: 6 },
  list: { marginBottom: 16 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  listIcon: { marginRight: 12 },
  listLabel: { flex: 1, fontSize: 15, color: '#fff', fontWeight: '500' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#475569',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0f172a',
  },
  startBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
