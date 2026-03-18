import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMnemonics } from '../context/MnemonicsContext';
import { useLoginModal } from '../context/LoginModalContext';

const FILTER_OPTIONS = ['By word', 'By username'];

export default function MnemonicsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();
  const { userName } = useLoginModal();

  const { mnemonics, addMnemonic, toggleSave, incrementLike, incrementDislike } = useMnemonics();

  const [filterQuery, setFilterQuery] = useState('By word');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(3);

  useFocusEffect(
    useCallback(() => {
      // Reset visible count when screen comes into focus
      setVisibleCount(3);
    }, [])
  );

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newTrick, setNewTrick] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';

  const filteredMnemonics = useMemo(() => {
    return mnemonics.filter((m) => {
      if (!searchQuery) return true;
      const lowerSearch = searchQuery.toLowerCase();
      if (filterQuery === 'By word') {
        return m.word.toLowerCase().includes(lowerSearch);
      } else {
        return m.author.toLowerCase().includes(lowerSearch);
      }
    });
  }, [mnemonics, searchQuery, filterQuery]);

  const visibleMnemonics = useMemo(() => {
    return filteredMnemonics.slice(0, visibleCount);
  }, [filteredMnemonics, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 3);
  };

  const canSubmit = newWord.trim().length > 0 && newMeaning.trim().length > 0 && newTrick.trim().length > 0;

  const handlePostMnemonic = () => {
    if (!canSubmit) return;
    const authorName = userName || 'Anonymous';
    addMnemonic(newWord.trim(), newMeaning.trim(), newTrick.trim(), authorName);
    setModalVisible(false);
    setNewWord('');
    setNewMeaning('');
    setNewTrick('');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Shared Dashboard/App Header */}
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
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
      >
        {/* Hero Banner Section */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.tagWrap}>
              <Ionicons name="bulb-outline" size={14} color="#fcd34d" style={{ marginRight: 6 }} />
              <Text style={styles.tagText}>The Art of Memory</Text>
            </View>
            <Text style={styles.heroTitle}>Hack Your Brain Power.</Text>
            <Text style={styles.heroSub}>
              Discover thousands of crowdsourced mnemonics to learn faster, remember longer, and ace your exams effortlessly.
            </Text>
            <Pressable style={styles.heroBtn}>
              <Text style={styles.heroBtnText}>Explore Mnemonics  {'>'}</Text>
            </Pressable>
          </View>
        </View>

        {/* Search & Filter Bar */}
        <View style={[styles.searchBarContainer, { flexDirection: width > 600 ? 'row' : 'column' }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: cardBg, borderColor: border }]}>
            {/* Filter Dropdown */}
            <View style={{ position: 'relative', zIndex: 10 }}>
              <Pressable
                style={[styles.inSearchBarFilter, { borderRightColor: border }]}
                onPress={() => setFilterOpen(!filterOpen)}
              >
                <Text style={[styles.inSearchFilterText, { color: text }]}>{filterQuery}</Text>
                <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={14} color={muted} />
              </Pressable>

              {filterOpen && (
                <View style={[styles.filterDropdown, { backgroundColor: cardBg, borderColor: border }]}>
                  {FILTER_OPTIONS.map(f => (
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

            {/* Input */}
            <TextInput
              style={[styles.searchInput, { color: text }]}
              placeholder={`Search ${filterQuery.toLowerCase()}...`}
              placeholderTextColor={muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Submit Trick Button */}
          <Pressable
            style={[styles.submitTrickBtn, width <= 600 && { marginTop: 12 }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.submitTrickText}>Submit Trick</Text>
          </Pressable>
        </View>

        {/* Mnemonics Grid */}
        <View style={[styles.grid, { flexDirection: width > 600 ? 'row' : 'column' }]}>
          {visibleMnemonics.map((item) => (
            <View
              key={item.id}
              style={[
                styles.mnemonicCard,
                { backgroundColor: cardBg, borderColor: border },
                width > 600 && { width: '31%', marginRight: '2%' }
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardWord, { color: text }]}>{item.word}</Text>
                <Pressable onPress={() => toggleSave(item.id)} hitSlop={8}>
                  <Ionicons
                    name={item.isSaved ? "bookmark" : "bookmark-outline"}
                    size={22}
                    color={item.isSaved ? "#059669" : muted}
                  />
                </Pressable>
              </View>
              <Text style={[styles.cardMeaning, { color: muted }]}>{item.meaning}</Text>

              <View style={[styles.trickContainer, { backgroundColor: isDark ? '#132135' : '#f0fdf4', borderColor: isDark ? '#1e293b' : '#bbf7d0' }]}>
                <View style={styles.trickTag}>
                  <Text style={styles.trickTagText}>TRICK</Text>
                </View>
                <Text style={[styles.trickText, { color: text }]}>{item.trick}</Text>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.authorRow}>
                  <View style={styles.authorAvatar}>
                    <Ionicons name="person" size={12} color="#fff" />
                  </View>
                  <View>
                    <Text style={[styles.authorLabel, { color: muted }]}>POSTED BY</Text>
                    <Text style={[styles.authorName, { color: text }]}>{item.author}</Text>
                  </View>
                </View>
                <View style={styles.actionRow}>
                  <Pressable
                    style={[styles.actionBtn, item.userVote === 'like' && { backgroundColor: 'rgba(5, 150, 105, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}
                    onPress={() => incrementLike(item.id)}
                  >
                    <Ionicons name={item.userVote === 'like' ? 'thumbs-up' : 'thumbs-up-outline'} size={16} color={item.userVote === 'like' ? '#059669' : muted} />
                    <Text style={[styles.actionNum, { color: item.userVote === 'like' ? '#059669' : muted }]}>{item.likes}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.actionBtn, item.userVote === 'dislike' && { backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }]}
                    onPress={() => incrementDislike(item.id)}
                  >
                    <Ionicons name={item.userVote === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline'} size={16} color={item.userVote === 'dislike' ? '#ef4444' : muted} />
                    <Text style={[styles.actionNum, { color: item.userVote === 'dislike' ? '#ef4444' : muted }]}>{item.dislikes}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}

          {/* Pagination Load More */}
          {filteredMnemonics.length > visibleCount && (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
              <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
            </View>
          )}

          {filteredMnemonics.length === 0 && (
            <Text style={{ color: muted, width: '100%', textAlign: 'center', marginTop: 20 }}>
              No mnemonics found matching "{searchQuery}"
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Share a Trick Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: bg, borderColor: border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: border }]}>
              <View style={styles.modalTitleRow}>
                <View style={styles.modalIconWrap}>
                  <Ionicons name="color-wand" size={16} color="#059669" />
                </View>
                <Text style={[styles.modalTitle, { color: text }]}>Share a Trick</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={muted} />
              </Pressable>
            </View>

            <Text style={[styles.modalSubtitle, { color: muted }]}>
              Help the community remember better.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Form Fields */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: text }]}>
                  Word / Concept <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, { color: text, backgroundColor: cardBg, borderColor: border }]}
                  placeholder="e.g. Abrogate"
                  placeholderTextColor={muted}
                  value={newWord}
                  onChangeText={setNewWord}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: text }]}>
                  Meaning <Text style={{ color: '#ef4444' }}>*</Text>
                </Text>
                <TextInput
                  style={[styles.textInput, { color: text, backgroundColor: cardBg, borderColor: border }]}
                  placeholder="Short definition..."
                  placeholderTextColor={muted}
                  value={newMeaning}
                  onChangeText={setNewMeaning}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="sparkles" size={14} color="#059669" style={{ marginRight: 6 }} />
                  <Text style={[styles.inputLabel, { color: text, marginBottom: 0 }]}>
                    Mnemonic Trick <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                </View>
                <TextInput
                  style={[
                    styles.textInput,
                    styles.textArea,
                    { color: text, backgroundColor: cardBg, borderColor: border }
                  ]}
                  placeholder="Your creative memory trick..."
                  placeholderTextColor={muted}
                  value={newTrick}
                  onChangeText={setNewTrick}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: muted }]}>Cancel</Text>
              </Pressable>
              {/* The user requested post mnemonic responsive, button fits cleanly in bottom corner */}
              <Pressable
                style={[styles.postBtn, !canSubmit && { opacity: 0.5 }]}
                onPress={handlePostMnemonic}
                disabled={!canSubmit}
              >
                <Text style={styles.postBtnText}>Post Mnemonic</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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

  contentContainer: { padding: 16 },

  heroBanner: {
    backgroundColor: '#059669', // green background matching the image
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    overflow: 'hidden',
  },
  heroContent: { flex: 1, paddingRight: 16, zIndex: 2 },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginBottom: 12 },
  heroSub: { color: 'rgba(255, 255, 255, 0.95)', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  heroBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  heroBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },

  heroImageWrapper: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  laptopScreen: {
    width: '100%',
    height: 90,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 4,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laptopCamera: { position: 'absolute', top: 4, width: 20, height: 4, backgroundColor: '#0f172a', borderRadius: 2 },
  laptopIconWrapper: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  laptopBase: {
    width: '115%',
    height: 10,
    backgroundColor: '#64748b',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  laptopTrackpad: {
    position: 'absolute',
    bottom: 27, // on the base
    width: 30,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    zIndex: 5,
  },

  searchBarContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 10, // for dropdown
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24, // pill shape
    width: '100%',
  },
  inSearchBarFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRightWidth: 1,
  },
  inSearchFilterText: { fontSize: 13, fontWeight: '600', marginRight: 6 },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    width: 140,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  filterItem: { paddingHorizontal: 16, paddingVertical: 12 },
  filterItemText: { fontSize: 13, fontWeight: '500' },
  searchInput: { flex: 1, height: 46, paddingHorizontal: 16, fontSize: 14 },
  submitTrickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginLeft: 12,
  },
  submitTrickText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 6 },

  grid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  mnemonicCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  cardWord: { fontSize: 20, fontWeight: '800' },
  cardMeaning: { fontSize: 13, marginBottom: 16 },
  trickContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    position: 'relative',
    marginTop: 6,
  },
  trickTag: {
    position: 'absolute',
    top: -10,
    left: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trickTagText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  trickText: { fontSize: 14, fontStyle: 'italic', lineHeight: 22 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  authorAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#94a3b8', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  authorLabel: { fontSize: 9, fontWeight: '700' },
  authorName: { fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionNum: { fontSize: 13, fontWeight: '600' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center' },
  modalIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    gap: 16,
  },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelBtnText: { fontSize: 14, fontWeight: '600' },
  postBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  postBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  loadMoreBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
  },
  loadMoreText: { color: '#059669', fontSize: 13, fontWeight: '600' },

});
