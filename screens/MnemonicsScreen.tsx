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
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useMnemonics, MnemonicItem } from '../context/MnemonicsContext';
import { useLoginModal } from '../context/LoginModalContext';

const FILTER_OPTIONS = ['By word', 'By username'];
const REPORT_REASONS = ['Inappropriate content', 'Incorrect information', 'Spam', 'Other'];

export default function MnemonicsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();
  const { userName } = useLoginModal();

  const { mnemonics, addMnemonic, deleteMnemonic, reportMnemonic, incrementLike, incrementDislike, isLoading } = useMnemonics();

  const [filterQuery, setFilterQuery] = useState('By word');
  const [filterOpen, setFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination State for word groups
  const [visibleCount, setVisibleCount] = useState(3);
  
  // Track how many variants to show per word group:
  // e.g., expandedGroups["assiduous"] = 4 (shows original + 3 variants)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      setVisibleCount(3);
    }, [])
  );

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newTrick, setNewTrick] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Report Modal states
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportTargetWord, setReportTargetWord] = useState<string>('');
  const [reportReason, setReportReason] = useState<string>('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const groupTileWidth = width > 1100 ? '32%' : width > 700 ? '48%' : '100%';

  const filteredMnemonics = useMemo(() => {
    return mnemonics.filter((m) => {
      if (!searchQuery) return true;
      const lowerSearch = searchQuery.toLowerCase();
      if (filterQuery === 'By word') {
        return m.word.toLowerCase().startsWith(lowerSearch);
      } else {
        return m.author.toLowerCase().startsWith(lowerSearch);
      }
    });
  }, [mnemonics, searchQuery, filterQuery]);

  const groupedMnemonics = useMemo(() => {
    const groups: Record<string, MnemonicItem[]> = {};
    filteredMnemonics.forEach((m) => {
      const key = m.word.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(m);
    });

    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (b.likes !== a.likes) return b.likes - a.likes;

        const aTs = Number(a.id) || 0;
        const bTs = Number(b.id) || 0;
        return bTs - aTs;
      });
    });

    // Keep word groups in alphabetical order.
    return Object.values(groups).sort((a, b) =>
      (a[0]?.word || '').localeCompare(b[0]?.word || '', undefined, {
        sensitivity: 'base',
      })
    );
  }, [filteredMnemonics, userName]);

  const myGroupedMnemonics = useMemo(() => {
    if (!userName) return [];

    return groupedMnemonics
      .map((group) => group.filter((item) => item.author === userName))
      .filter((group) => group.length > 0)
      .sort((a, b) =>
        (a[0]?.word || '').localeCompare(b[0]?.word || '', undefined, {
          sensitivity: 'base',
        })
      );
  }, [groupedMnemonics, userName]);

  const visibleGroups = useMemo(() => {
    return groupedMnemonics.slice(0, visibleCount);
  }, [groupedMnemonics, visibleCount]);

  const handleLoadMoreGroups = () => {
    setVisibleCount(prev => prev + 3);
  };

  const handleExpandGroup = (word: string) => {
    const key = word.toLowerCase();
    setExpandedGroups(prev => ({
      ...prev,
      [key]: (prev[key] || 1) + 3 // show 3 more
    }));
  };

  const canSubmitTrick = newWord.trim().length > 0 && newMeaning.trim().length > 0 && newTrick.trim().length > 0;

  const handlePostMnemonic = async () => {
    if (!canSubmitTrick || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const authorName = userName || 'Anonymous';
      await addMnemonic(newWord.trim(), newMeaning.trim(), newTrick.trim(), authorName);
      setModalVisible(false);
      setNewWord('');
      setNewMeaning('');
      setNewTrick('');
    } catch (error) {
      Alert.alert("Error", "Failed to post trick. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openReportModal = (item: MnemonicItem) => {
    setReportTargetId(item.id);
    setReportTargetWord(item.word);
    setReportReason('');
    setReportModalVisible(true);
  };

  const submitReport = () => {
    if (reportTargetId) {
      reportMnemonic(reportTargetId, reportReason.trim() || 'No details provided');
      setReportModalVisible(false);
      setReportTargetId(null);
      setReportTargetWord('');
      setReportReason('');
      Alert.alert("Report Submitted", "Thank you for helping keep the community clean.");
    }
  };

  const deleteTrick = (id: string) => {
    // Alert dialogs are unreliable on web, so delete directly there.
    if (Platform.OS === 'web') {
      deleteMnemonic(id);
      return;
    }

    Alert.alert(
      "Delete Trick",
      "Are you sure you want to delete this trick?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteMnemonic(id) }
      ]
    );
  };

  const renderMnemonicCard = (item: MnemonicItem, isVariant = false) => {
    return (
      <View
        key={item.id}
        style={[
          styles.mnemonicCard,
          { backgroundColor: cardBg, borderColor: border, borderWidth: 1 },
          isVariant && { marginLeft: 16, borderLeftWidth: 4, borderLeftColor: '#059669', marginBottom: 12, borderRadius: 12, padding: 16 }
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardWord, { color: text }, isVariant && { fontSize: 16 }]}>{item.word}</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <Pressable onPress={() => openReportModal(item)} hitSlop={8}>
              <Ionicons name="flag-outline" size={20} color={muted} />
            </Pressable>
            {userName && item.author === userName && (
              <Pressable onPress={() => deleteTrick(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </Pressable>
            )}
          </View>
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
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
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

        <View style={[styles.searchBarContainer, { flexDirection: width > 600 ? 'row' : 'column' }]}>
          <View style={[styles.searchInputWrapper, { backgroundColor: cardBg, borderColor: border }]}>
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

            <TextInput
              style={[styles.searchInput, { color: text }]}
              placeholder={`Search ${filterQuery.toLowerCase()}...`}
              placeholderTextColor={muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <Pressable
            style={[styles.submitTrickBtn, width <= 600 && { marginTop: 12 }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.submitTrickText}>Submit Trick</Text>
          </Pressable>
        </View>

        {userName ? (
          <View style={styles.sectionHeaderWrap}>
            <Text style={[styles.sectionTitle, { color: text }]}>My Mnemonics</Text>
            <Text style={[styles.sectionSubtitle, { color: muted }]}>Your submitted tricks shown first, grouped A-Z.</Text>
          </View>
        ) : null}

        {userName ? (
          <View style={[styles.grid, { flexDirection: width > 600 ? 'row' : 'column' }]}>
            {myGroupedMnemonics.map((group) => {
              const topTrick = group[0];
              const key = topTrick.word.toLowerCase();
              const variantsVisible = expandedGroups[key] || 1;
              const hasMoreVariants = group.length > variantsVisible;
              const shownVariants = group.slice(1, variantsVisible);

              return (
                <View key={`mine-${topTrick.id}`} style={{ width: groupTileWidth, marginBottom: 24 }}>
                  {renderMnemonicCard(topTrick, false)}
                  {shownVariants.length > 0 ? (
                    <View style={styles.variantStack}>
                      {shownVariants.map(variant => (
                        <View key={variant.id} style={styles.variantItemWrap}>
                          {renderMnemonicCard(variant, true)}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {hasMoreVariants ? (
                    <Pressable 
                      onPress={() => handleExpandGroup(topTrick.word)}
                      style={styles.moreVariantsBtn}
                    >
                      <Ionicons name="chevron-down-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.moreVariantsText}>See {group.length - variantsVisible} more trick{group.length - variantsVisible > 1 ? 's' : ''}</Text>
                    </Pressable>
                  ) : (group.length > 1 && variantsVisible >= group.length) ? (
                    <Pressable 
                      onPress={() => setExpandedGroups(p => ({ ...p, [key]: 1 }))}
                      style={styles.moreVariantsBtn}
                    >
                      <Ionicons name="chevron-up-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                      <Text style={styles.moreVariantsText}>Show less</Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}

            {myGroupedMnemonics.length === 0 && (
              <Text style={{ color: muted, width: '100%', textAlign: 'center', marginTop: 4, marginBottom: 20 }}>
                No mnemonic posted by you yet.
              </Text>
            )}
          </View>
        ) : null}

        <View style={styles.sectionHeaderWrap}>
          <Text style={[styles.sectionTitle, { color: text }]}>All Mnemonics (A-Z)</Text>
          <Text style={[styles.sectionSubtitle, { color: muted }]}>Word groups are alphabetically sorted.</Text>
        </View>

        <View style={[styles.grid, { flexDirection: width > 600 ? 'row' : 'column' }]}>
          {isLoading && groupedMnemonics.length === 0 ? (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 40, marginBottom: 40 }}>
              <ActivityIndicator size="large" color="#059669" />
              <Text style={{ color: muted, marginTop: 12 }}>Loading mnemonics...</Text>
            </View>
          ) : (
            visibleGroups.map((group) => {
              const topTrick = group[0];
              const key = topTrick.word.toLowerCase();
            const variantsVisible = expandedGroups[key] || 1;
            const hasMoreVariants = group.length > variantsVisible;
            const shownVariants = group.slice(1, variantsVisible);

            return (
              <View key={topTrick.id} style={{ width: groupTileWidth, marginBottom: 24 }}>
                {/* Main Trick */}
                {renderMnemonicCard(topTrick, false)}

                {/* Sub Tricks if expanded */}
                {shownVariants.length > 0 ? (
                  <View style={styles.variantStack}>
                    {shownVariants.map(variant => (
                      <View key={variant.id} style={styles.variantItemWrap}>
                        {renderMnemonicCard(variant, true)}
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Show more variants button */}
                {hasMoreVariants ? (
                  <Pressable 
                    onPress={() => handleExpandGroup(topTrick.word)}
                    style={styles.moreVariantsBtn}
                  >
                    <Ionicons name="chevron-down-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.moreVariantsText}>See {group.length - variantsVisible} more trick{group.length - variantsVisible > 1 ? 's' : ''}</Text>
                  </Pressable>
                ) : (group.length > 1 && variantsVisible >= group.length) ? (
                  <Pressable 
                    onPress={() => setExpandedGroups(p => ({ ...p, [key]: 1 }))}
                    style={styles.moreVariantsBtn}
                  >
                    <Ionicons name="chevron-up-outline" size={16} color="#059669" style={{ marginRight: 6 }} />
                    <Text style={styles.moreVariantsText}>Show less</Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }))}

          {groupedMnemonics.length > visibleCount && !isLoading && (
            <View style={{ width: '100%', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
              <Pressable style={styles.loadMoreBtn} onPress={handleLoadMoreGroups}>
                <Text style={styles.loadMoreText}>Load More</Text>
              </Pressable>
            </View>
          )}

          {groupedMnemonics.length === 0 && !isLoading && (
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
              <Pressable
                style={[styles.postBtn, (!canSubmitTrick || isSubmitting) && { opacity: 0.5 }]}
                onPress={handlePostMnemonic}
                disabled={!canSubmitTrick || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postBtnText}>Post Mnemonic</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#0b1320' : '#fff', borderColor: border, borderWidth: 1, padding: 24, borderRadius: 16 }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: text, marginBottom: 8 }}>Report mnemonic</Text>
            <Text style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
              Tell us what's wrong with "{reportTargetWord}".
            </Text>

            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                { 
                  backgroundColor: isDark ? '#142033' : '#f8fafc',
                  borderColor: isDark ? '#1e293b' : '#e2e8f0',
                  color: text,
                  marginBottom: 24,
                  height: 100,
                  fontSize: 14
                }
              ]}
              placeholder="Add details (optional)"
              placeholderTextColor={muted}
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              textAlignVertical="top"
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 }}>
              <Pressable onPress={() => setReportModalVisible(false)} hitSlop={10}>
                <Text style={{ color: text, fontWeight: '600', fontSize: 14 }}>Cancel</Text>
              </Pressable>
              <Pressable
                style={{ backgroundColor: '#f59e0b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}
                onPress={submitReport}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Submit report</Text>
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

  sectionHeaderWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    marginBottom: 6,
  },

  heroBanner: {
    backgroundColor: '#059669',
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

  searchBarContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    zIndex: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 24,
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
    columnGap: 12,
    rowGap: 12,
  },
  mnemonicCard: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 0, // removed margin so parent dictates it
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

  variantStack: {
    marginTop: 8,
    rowGap: 8,
  },
  variantItemWrap: {
    marginBottom: 0,
  },

  moreVariantsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  moreVariantsText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 13,
  },

  loadMoreBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
  },
  loadMoreText: { color: '#059669', fontSize: 13, fontWeight: '600' },

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

  reportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  reportOptionText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
});
