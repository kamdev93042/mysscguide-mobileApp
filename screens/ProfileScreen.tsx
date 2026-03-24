import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLoginModal } from '../context/LoginModalContext';
import { useMnemonics } from '../context/MnemonicsContext';
import { useForums } from '../context/ForumsContext';
import { useMocks } from '../context/MocksContext';
import { useTheme } from '../context/ThemeContext';
import { userApi } from '../services/api';

const RESULT_HISTORY_STORAGE_KEY = 'pyqs_result_history_v1';

type StoredResult = {
  sourceTab: 'PYQ' | 'RankMaker';
  testTitle: string;
  attempted: number;
  correct: number;
  wrong: number;
  unattempted: number;
  score: number;
  sectionBreakup?: Array<{
    section: string;
    correct: number;
    wrong: number;
    attempted: number;
    score: number;
  }>;
  submittedAt: string;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { userName, userEmail, userPhone, setUserName, setUserEmail, setUserPhone } = useLoginModal();
  const { isDark } = useTheme();
  const { mnemonics, toggleSave } = useMnemonics();
  const { posts } = useForums();
  const { recentAttempts } = useMocks();

  const [profileData, setProfileData] = useState<any>(null);
  const [resultHistory, setResultHistory] = useState<StoredResult[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    exam: '',
  });
  const [loading, setLoading] = useState(true);

  const isWide = width >= 720;

  const bg = isDark ? '#0f172a' : '#fdfdfd';
  const card = isDark ? '#1e293b' : '#ffffff';
  const cardSoft = isDark ? '#334155' : '#f9fafb';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? '#334155' : '#e5e7eb';

  const savedMnemonics = mnemonics.filter((m) => m.isSaved);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const [token, storedResultsRaw] = await Promise.all([
          AsyncStorage.getItem('userToken'),
          AsyncStorage.getItem(RESULT_HISTORY_STORAGE_KEY),
        ]);

        const storedResults = storedResultsRaw ? JSON.parse(storedResultsRaw) : [];
        if (Array.isArray(storedResults)) {
          setResultHistory(storedResults);
        }

        if (token && token !== 'true') {
          const res = await userApi.getProfile();
          setProfileData(res?.user || res);
        }
      } catch (err) {
        console.error('Failed to load profile data', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, []);

  const displayName = profileData?.fullName || profileData?.username || userName || 'User';
  const initial = displayName.charAt(0).toUpperCase();
  const identityTag = profileData?.role || profileData?.exam || 'Learner';

  const totalProblemsSolved = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.correct || 0), 0),
    [resultHistory]
  );

  const sectionSolvedMap = useMemo(() => {
    const map: Record<string, number> = {};
    resultHistory.forEach((item) => {
      (item.sectionBreakup || []).forEach((sectionItem) => {
        map[sectionItem.section] = (map[sectionItem.section] || 0) + (sectionItem.correct || 0);
      });
    });
    return map;
  }, [resultHistory]);

  const topSection = useMemo(() => {
    const entries = Object.entries(sectionSolvedMap);
    if (entries.length === 0) {
      return { name: 'No section yet', solved: 0 };
    }
    const [name, solved] = entries.sort((a, b) => b[1] - a[1])[0];
    return { name, solved };
  }, [sectionSolvedMap]);

  const totalAttempted = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.attempted || 0), 0),
    [resultHistory]
  );

  const totalCorrect = useMemo(
    () => resultHistory.reduce((sum, item) => sum + (item.correct || 0), 0),
    [resultHistory]
  );

  const winRate = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

  const perfectDays = useMemo(() => {
    const set = new Set<string>();
    resultHistory.forEach((item) => {
      const dt = new Date(item.submittedAt);
      if (!isNaN(dt.getTime()) && item.score > 0) {
        set.add(dt.toDateString());
      }
    });
    return set.size;
  }, [resultHistory]);

  const totalMnemonics = mnemonics.length;
  const totalPosts = posts.length;
  const totalUpvotes =
    mnemonics.reduce((sum, m) => sum + (m.likes || 0), 0) +
    posts.reduce((sum, p) => sum + (p.likes || 0), 0);

  const skillTags = useMemo(() => {
    const tags = Object.entries(sectionSolvedMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, solved]) => `${name} (${solved})`);

    if (tags.length > 0) {
      return tags;
    }

    return profileData?.city || profileData?.state ? ['Getting Started'] : ['No Activity Yet'];
  }, [sectionSolvedMap, profileData?.city, profileData?.state]);

  const openEditModal = () => {
    setEditForm({
      fullName: String(profileData?.fullName || profileData?.username || userName || ''),
      email: String(profileData?.email || userEmail || ''),
      phone: String(profileData?.phone || userPhone || ''),
      city: String(profileData?.city || ''),
      state: String(profileData?.state || ''),
      exam: String(profileData?.exam || ''),
    });
    setIsEditModalVisible(true);
  };

  const updateEditField = (key: keyof typeof editForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    const updatedProfile = {
      ...(profileData ?? {}),
      fullName: editForm.fullName.trim(),
      username: editForm.fullName.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      city: editForm.city.trim(),
      state: editForm.state.trim(),
      exam: editForm.exam.trim(),
    };

    setProfileData(updatedProfile);

    if (updatedProfile.fullName) {
      setUserName(updatedProfile.fullName);
    }
    if (updatedProfile.email) {
      setUserEmail(updatedProfile.email);
    }
    if (updatedProfile.phone) {
      setUserPhone(updatedProfile.phone);
    }

    setIsEditModalVisible(false);
  };

  if (loading) {
    return (
      <View style={[styles.loaderWrap, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: text }]}>{displayName}</Text>
              <Text style={[styles.headerSub, { color: muted }]}>{identityTag}</Text>
            </View>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="notifications-outline" size={20} color="#059669" />
            </Pressable>
            <Pressable style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="settings-outline" size={20} color="#059669" />
            </Pressable>
          </View>
        </View>

        <View style={[styles.metricCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.metricTitle, { color: text }]}>Problems Solved</Text>
          <View style={styles.circleWrap}>
            <View style={styles.circleOuter}>
              <Text style={[styles.circleValue, { color: text }]}>{totalProblemsSolved}</Text>
            </View>
          </View>
          <Text style={[styles.metricFooter, { color: muted }]}>
            {topSection.name} · {topSection.solved}
          </Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionHeader, { color: text }]}>Dashboard Overview</Text>

          <View style={[styles.infoRow, !isWide && styles.infoRowStack]}>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Email</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {profileData?.email || userEmail || 'Not set'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Mobile</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {profileData?.phone || userPhone || 'Not set'}
              </Text>
            </View>
          </View>

          {(profileData?.city || profileData?.state) && (
            <View style={[styles.infoRow, { marginTop: 4 }]}>
              <View style={styles.infoCol}>
                <Text style={[styles.label, { color: muted }]}>Location</Text>
                <Text style={[styles.infoLine, { color: text }]}>
                  {[profileData?.city, profileData?.state].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}

          <Pressable style={styles.editBtn} onPress={openEditModal}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>

          <View style={[styles.divider, { backgroundColor: border }]} />

          <View style={styles.communitySection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Community</Text>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Mnemonics</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalMnemonics}</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Posts</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalPosts}</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Upvotes</Text>
              <Text style={[styles.communityValue, { color: text }]}>{totalUpvotes}</Text>
            </View>
          </View>

          <View style={styles.skillsSection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Skills</Text>
            <View style={styles.skillsWrap}>
              {skillTags.map((skill) => (
                <View
                  key={skill}
                  style={[styles.skillPill, { backgroundColor: isDark ? '#334155' : '#dcfce7' }]}
                >
                  <Text style={[styles.skillText, { color: isDark ? '#e5e7eb' : '#14532d' }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.consistencyCard, { backgroundColor: cardSoft, borderColor: border }]}>
          <View style={styles.consistencyHeader}>
            <Text style={[styles.consistencyTitle, { color: text }]}>CONSISTENCY</Text>
            <Text style={[styles.consistencySub, { color: muted }]}>Goal completion trend</Text>
          </View>
          <View style={[styles.consistencyStats, !isWide && styles.consistencyStatsStack]}>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>{perfectDays}</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Perfect Days</Text>
            </View>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>{winRate}%</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Win Rate</Text>
            </View>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>{recentAttempts.length + resultHistory.length}</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Total Tests</Text>
            </View>
          </View>
          <View style={styles.consistencyGraphPlaceholder}>
            <Text style={[styles.graphText, { color: muted }]}>
              Your consistency graph will appear here once you start practicing.
            </Text>
          </View>
        </View>

        {savedMnemonics.length > 0 && (
          <View style={[styles.profileCard, { backgroundColor: card, borderColor: border, marginTop: 16 }]}>
            <View style={styles.savedHeaderRow}>
              <Ionicons name="bookmark" size={18} color="#059669" style={{ marginRight: 8 }} />
              <Text style={[styles.sectionHeader, { color: text, marginBottom: 0 }]}>Saved Mnemonics</Text>
            </View>

            {savedMnemonics.map((item) => (
              <View key={item.id} style={[styles.savedMnemonicCard, { borderBottomColor: border }]}>
                <View style={styles.savedTitleRow}>
                  <Text style={[styles.savedMnemonicWord, { color: text }]}>{item.word}</Text>
                  <Pressable onPress={() => toggleSave(item.id)} hitSlop={8}>
                    <Ionicons name="bookmark" size={18} color="#059669" />
                  </Pressable>
                </View>
                <Text style={[styles.savedMnemonicMeaning, { color: muted }]}>{item.meaning}</Text>

                <View style={styles.savedTrickBox}>
                  <Text style={[styles.savedTrickText, { color: text }]}>{item.trick}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isEditModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setIsEditModalVisible(false)} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: card,
                borderColor: border,
                width: isWide ? 520 : width - 24,
              },
            ]}
          >
            <View style={[styles.modalHeaderRow, { borderBottomColor: border }]}>
              <Text style={[styles.modalTitle, { color: text }]}>Edit Profile</Text>
              <Pressable onPress={() => setIsEditModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={muted} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Full Name</Text>
                <TextInput
                  value={editForm.fullName}
                  onChangeText={(v) => updateEditField('fullName', v)}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter full name"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Email</Text>
                <TextInput
                  value={editForm.email}
                  onChangeText={(v) => updateEditField('email', v)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter email"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Phone</Text>
                <TextInput
                  value={editForm.phone}
                  onChangeText={(v) => updateEditField('phone', v)}
                  keyboardType="phone-pad"
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="Enter phone"
                  placeholderTextColor={muted}
                />
              </View>

              <View style={[styles.rowFields, !isWide && styles.rowFieldsStack]}>
                <View style={[styles.fieldBlock, styles.rowFieldChild]}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>City</Text>
                  <TextInput
                    value={editForm.city}
                    onChangeText={(v) => updateEditField('city', v)}
                    style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                    placeholder="City"
                    placeholderTextColor={muted}
                  />
                </View>
                <View style={[styles.fieldBlock, styles.rowFieldChild]}>
                  <Text style={[styles.fieldLabel, { color: muted }]}>State</Text>
                  <TextInput
                    value={editForm.state}
                    onChangeText={(v) => updateEditField('state', v)}
                    style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                    placeholder="State"
                    placeholderTextColor={muted}
                  />
                </View>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={[styles.fieldLabel, { color: muted }]}>Exam Focus</Text>
                <TextInput
                  value={editForm.exam}
                  onChangeText={(v) => updateEditField('exam', v)}
                  style={[styles.fieldInput, { color: text, borderColor: border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}
                  placeholder="e.g. SSC CGL"
                  placeholderTextColor={muted}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: border }]}>
              <Pressable style={[styles.modalBtn, styles.modalCancelBtn]} onPress={() => setIsEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalSaveBtn]} onPress={handleSaveProfile}>
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wrapper: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34,197,94,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: { fontSize: 18, fontWeight: '700', color: '#059669' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 13 },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  metricCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  metricTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  circleWrap: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  circleOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 10,
    borderColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleValue: { fontSize: 32, fontWeight: '700' },
  metricFooter: { fontSize: 13, marginTop: 4 },

  profileCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  infoRowStack: {
    flexDirection: 'column',
  },
  infoCol: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  infoLine: { fontSize: 13 },

  editBtn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#059669',
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  divider: {
    height: 1,
    marginVertical: 10,
  },

  communitySection: { marginTop: 16 },
  sectionLabel: { fontSize: 13, marginBottom: 6 },
  communityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  communityKey: { fontSize: 13, fontWeight: '500' },
  communityValue: { fontSize: 13, fontWeight: '600' },

  skillsSection: { marginTop: 16 },
  skillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  skillPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  skillText: { fontSize: 12, fontWeight: '600' },

  consistencyCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  consistencyHeader: { marginBottom: 12 },
  consistencyTitle: { fontSize: 14, fontWeight: '700' },
  consistencySub: { fontSize: 13, marginTop: 2 },
  consistencyStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  consistencyStatsStack: {
    flexWrap: 'wrap',
    rowGap: 10,
  },
  consistencyStatItem: { alignItems: 'center', flex: 1, minWidth: 90 },
  consistencyStatValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  consistencyStatLabel: { fontSize: 12 },
  consistencyGraphPlaceholder: {
    minHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  graphText: { fontSize: 13, textAlign: 'center' },

  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  savedMnemonicCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  savedTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  savedMnemonicWord: { fontSize: 16, fontWeight: '700', marginBottom: 2, flex: 1 },
  savedMnemonicMeaning: { fontSize: 13, marginBottom: 8 },
  savedTrickBox: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  savedTrickText: { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    maxHeight: '88%',
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalBody: {
    padding: 14,
    gap: 10,
  },
  fieldBlock: {
    marginBottom: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '500',
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  rowFieldsStack: {
    flexDirection: 'column',
    gap: 2,
  },
  rowFieldChild: {
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  modalBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    minWidth: 86,
    alignItems: 'center',
  },
  modalCancelBtn: {
    backgroundColor: '#e5e7eb',
  },
  modalSaveBtn: {
    backgroundColor: '#059669',
  },
  modalCancelText: {
    color: '#111827',
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
