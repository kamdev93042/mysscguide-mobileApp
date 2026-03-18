import { View, Text, StyleSheet, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';
import { useMnemonics } from '../context/MnemonicsContext';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { userName, userEmail, userPhone } = useLoginModal();

  const bg = '#fdfdfd';
  const card = '#ffffff';
  const cardSoft = '#f9fafb';
  const text = '#111827';
  const muted = '#6b7280';
  const border = '#e5e7eb';
  
  const { mnemonics, toggleSave, incrementLike, incrementDislike } = useMnemonics();
  const savedMnemonics = mnemonics.filter(m => m.isSaved);

  const initial = (userName || 'U').charAt(0).toUpperCase();
  const displayName = userName || 'User';

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row with avatar like app page */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: text }]}>{displayName}</Text>
              <Text style={[styles.headerSub, { color: muted }]}>SSC Aspirant</Text>
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

        {/* Problems solved circular card */}
        <View style={[styles.metricCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.metricTitle, { color: text }]}>Problems Solved</Text>
          <View style={styles.circleWrap}>
            <View style={styles.circleOuter}>
              <Text style={styles.circleValue}>1</Text>
            </View>
          </View>
          <Text style={[styles.metricFooter, { color: muted }]}>General Awareness · 1</Text>
        </View>

        {/* Dashboard overview / profile details */}
        <View style={[styles.profileCard, { backgroundColor: card, borderColor: border }]}>
          <Text style={[styles.sectionHeader, { color: text }]}>Dashboard Overview</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Email</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {userEmail || 'email not set'}
              </Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={[styles.label, { color: muted }]}>Mobile</Text>
              <Text style={[styles.infoLine, { color: text }]}>
                {userPhone || 'mobile not set'}
              </Text>
            </View>
          </View>

          <Pressable style={styles.editBtn}>
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>

          <View style={styles.divider} />

          <View style={styles.communitySection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Community</Text>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Mnemonics</Text>
              <Text style={[styles.communityValue, { color: text }]}>0</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Total Posts</Text>
              <Text style={[styles.communityValue, { color: text }]}>0</Text>
            </View>
            <View style={styles.communityRow}>
              <Text style={[styles.communityKey, { color: text }]}>Upvotes</Text>
              <Text style={[styles.communityValue, { color: text }]}>0</Text>
            </View>
          </View>

          <View style={styles.skillsSection}>
            <Text style={[styles.sectionLabel, { color: muted }]}>Skills</Text>
            <View style={styles.skillPill}>
              <Text style={styles.skillText}>General Awareness</Text>
            </View>
          </View>
        </View>

        {/* Consistency panel at bottom */}
        <View style={[styles.consistencyCard, { backgroundColor: cardSoft, borderColor: border }]}>
          <View style={styles.consistencyHeader}>
            <Text style={[styles.consistencyTitle, { color: text }]}>CONSISTENCY</Text>
            <Text style={[styles.consistencySub, { color: muted }]}>Goal completion trend</Text>
          </View>
          <View style={styles.consistencyStats}>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>0</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Perfect Days</Text>
            </View>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>0%</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Win Rate</Text>
            </View>
            <View style={styles.consistencyStatItem}>
              <Text style={[styles.consistencyStatValue, { color: text }]}>0</Text>
              <Text style={[styles.consistencyStatLabel, { color: muted }]}>Total Goals</Text>
            </View>
          </View>
          <View style={styles.consistencyGraphPlaceholder}>
            <Text style={[styles.graphText, { color: muted }]}>
              Your consistency graph will appear here once you start practicing.
            </Text>
          </View>
        </View>

        {/* Saved Mnemonics Section */}
        {savedMnemonics.length > 0 && (
          <View style={[styles.profileCard, { backgroundColor: card, borderColor: border, marginTop: 16 }]}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <Ionicons name="bookmark" size={18} color="#059669" style={{marginRight: 8}} />
              <Text style={[styles.sectionHeader, { color: text, marginBottom: 0 }]}>Saved Mnemonics</Text>
            </View>
            
            {savedMnemonics.map(item => (
              <View key={item.id} style={styles.savedMnemonicCard}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 16 },
  metricCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#059669' },
  infoCol: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  tag: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  infoLine: { fontSize: 13 },
  editBtn: {
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#059669',
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
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
  skillPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
  },
  skillText: { fontSize: 12, fontWeight: '600', color: '#e5e7eb' },
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
  circleValue: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
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
  },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 10,
  },
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
  consistencyStatItem: { alignItems: 'center', flex: 1 },
  consistencyStatValue: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  consistencyStatLabel: { fontSize: 12 },
  consistencyGraphPlaceholder: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  graphText: { fontSize: 13, textAlign: 'center' },
  savedMnemonicCard: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  savedMnemonicWord: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  savedMnemonicMeaning: { fontSize: 13, marginBottom: 8 },
  savedTrickBox: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  savedTrickText: { fontSize: 13, fontStyle: 'italic', lineHeight: 20 },
});
