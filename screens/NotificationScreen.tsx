import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const NOTIFICATIONS = [
  {
    id: 1,
    name: 'SSC CGL Mock Test',
    message: ' added a new full-length live mock.',
    time: '5 min ago',
    hasActions: false,
  },
  {
    id: 2,
    name: 'Rahul Kumar',
    message: ' challenged you. Entry fee ',
    highlight: '50 Coins',
    time: '5 min ago',
    hasActions: false,
  },
  {
    id: 3,
    name: 'Aman Gupta',
    message: ' requested a mock duel... reward ',
    highlight: '100 Coins',
    time: '5 min ago',
    hasActions: true,
  },
  {
    id: 4,
    name: 'Priya Sharma',
    message: ' invited you to group study... entry ',
    highlight: '10 Coins',
    time: '5 min ago',
    hasActions: true,
  },
  {
    id: 5,
    name: 'Daily Quiz',
    message: ' mixed prep is ready to attempt.',
    time: '12 min ago',
    hasActions: true,
  },
  {
    id: 6,
    name: 'Mohit',
    message: ' sent you a friend request.',
    time: '1 hr ago',
    hasActions: true,
  },
];

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const bg = isDark ? '#0f172a' : '#fcfcfc';
  const card = isDark ? '#020617' : '#ffffff';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? '#1e293b' : '#f1f5f9';
  const primary = '#008080'; // A teal-ish color like in the design

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.headerIconWrap}>
          <Ionicons name="chevron-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Notification</Text>
        <Pressable hitSlop={8} style={styles.headerActionWrap}>
          <Text style={[styles.markReadText, { color: primary }]}>Mark all as read</Text>
        </Pressable>
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: border }]}>
        <View style={styles.tabContainer}>
          <Text style={[styles.tabTextActive, { color: primary }]}>All</Text>
          <View style={[styles.tabIndicator, { backgroundColor: primary }]} />
        </View>
        <View style={styles.tabContainer}>
          <Text style={[styles.tabText, { color: muted }]}>Unread</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NOTIFICATIONS.map((n, index) => (
          <View
            key={n.id}
            style={[
              styles.itemContainer,
              index !== NOTIFICATIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }
            ]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {n.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.itemContent}>
              <Text style={[styles.messageText, { color: text }]} numberOfLines={2}>
                <Text style={styles.nameBold}>{n.name}</Text>
                {n.message}
                {n.highlight && (
                  <Text style={[styles.highlightText, { color: '#ea580c' }]}>{n.highlight}</Text>
                )}
              </Text>
              <Text style={[styles.itemTime, { color: muted }]}>{n.time}</Text>

              {n.hasActions && (
                <View style={styles.actionButtonsRow}>
                  <Pressable style={[styles.actionBtnPrimary, { backgroundColor: primary }]}>
                    <Text style={styles.actionBtnPrimaryText}>Accept</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnSecondary}>
                    <Text style={[styles.actionBtnSecondaryText, { color: muted }]}>Decline</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={{ height: 32 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerIconWrap: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  headerActionWrap: { width: 100, alignItems: 'flex-end' },
  markReadText: { fontSize: 13, fontWeight: '600' },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  tabTextActive: { fontSize: 14, fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: -1,
    width: 60,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },
  itemContainer: {
    flexDirection: 'row',
    paddingVertical: 16,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0ea5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  itemContent: { flex: 1 },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  nameBold: { fontWeight: '700' },
  highlightText: { fontWeight: '700' },
  itemTime: { fontSize: 12 },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 12,
  },
  actionBtnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  actionBtnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

