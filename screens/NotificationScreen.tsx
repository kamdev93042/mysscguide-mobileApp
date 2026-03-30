import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_STORAGE_KEY = 'notifications_state_v1';

type NotificationItem = {
  id: number;
  name: string;
  message: string;
  highlight?: string;
  time: string;
  hasActions: boolean;
  read: boolean;
  status?: 'pending' | 'accepted' | 'declined';
};

const NOTIFICATIONS: NotificationItem[] = [
  {
    id: 1,
    name: 'SSC CGL Mock Test',
    message: ' added a new full-length live mock.',
    time: '5 min ago',
    hasActions: false,
    read: false,
  },
  {
    id: 2,
    name: 'Rahul Kumar',
    message: ' challenged you. Entry fee ',
    highlight: '50 Coins',
    time: '5 min ago',
    hasActions: false,
    read: false,
  },
  {
    id: 3,
    name: 'Aman Gupta',
    message: ' requested a mock duel... reward ',
    highlight: '100 Coins',
    time: '5 min ago',
    hasActions: true,
    read: false,
    status: 'pending',
  },
  {
    id: 4,
    name: 'Priya Sharma',
    message: ' invited you to group study... entry ',
    highlight: '10 Coins',
    time: '5 min ago',
    hasActions: true,
    read: false,
    status: 'pending',
  },
  {
    id: 5,
    name: 'Daily Quiz',
    message: ' mixed prep is ready to attempt.',
    time: '12 min ago',
    hasActions: true,
    read: true,
    status: 'pending',
  },
  {
    id: 6,
    name: 'Mohit',
    message: ' sent you a friend request.',
    time: '1 hr ago',
    hasActions: true,
    read: true,
    status: 'pending',
  },
];

export default function NotificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const [tab, setTab] = useState<'All' | 'Unread'>('All');
  const [notifications, setNotifications] = useState<NotificationItem[]>(NOTIFICATIONS);
  const [hydrated, setHydrated] = useState(false);

  const bg = isDark ? '#0f172a' : '#fcfcfc';
  const text = isDark ? '#ffffff' : '#111827';
  const muted = isDark ? '#94a3b8' : '#6b7280';
  const border = isDark ? '#1e293b' : '#f1f5f9';
  const primary = '#008080'; // A teal-ish color like in the design

  const visibleNotifications = useMemo(
    () => (tab === 'Unread' ? notifications.filter((n) => !n.read) : notifications),
    [notifications, tab]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = async () => {
    try {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (!raw) {
        setNotifications(NOTIFICATIONS);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setNotifications(parsed);
      }
    } catch (error) {
      console.error('Failed to load notifications from storage', error);
    } finally {
      setHydrated(true);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useFocusEffect(
    useMemo(
      () => () => {
        loadNotifications();
      },
      []
    )
  );

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const persistNotifications = async () => {
      try {
        await AsyncStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      } catch (error) {
        console.error('Failed to persist notifications', error);
      }
    };

    persistNotifications();
  }, [notifications, hydrated]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('Home');
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleItemPress = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const resolveAction = (id: number, status: 'accepted' | 'declined') => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id
          ? {
              ...n,
              read: true,
              status,
            }
          : n
      )
    );
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack} hitSlop={8} style={styles.headerIconWrap}>
          <Ionicons name="chevron-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]}>Notification</Text>
        <Pressable hitSlop={8} style={styles.headerActionWrap} onPress={markAllAsRead}>
          <Text style={[styles.markReadText, { color: primary }]}>Mark all read</Text>
        </Pressable>
      </View>

      <View style={[styles.tabsRow, { borderBottomColor: border }]}>
        <Pressable style={styles.tabContainer} onPress={() => setTab('All')}>
          <Text style={[tab === 'All' ? styles.tabTextActive : styles.tabText, { color: tab === 'All' ? primary : muted }]}>All</Text>
          {tab === 'All' && <View style={[styles.tabIndicator, { backgroundColor: primary }]} />}
        </Pressable>
        <Pressable style={styles.tabContainer} onPress={() => setTab('Unread')}>
          <Text style={[tab === 'Unread' ? styles.tabTextActive : styles.tabText, { color: tab === 'Unread' ? primary : muted }]}>Unread ({unreadCount})</Text>
          {tab === 'Unread' && <View style={[styles.tabIndicator, { backgroundColor: primary }]} />}
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {visibleNotifications.map((n, index) => (
          <View
            key={n.id}
            style={[
              styles.itemContainer,
              index !== visibleNotifications.length - 1 && { borderBottomWidth: 1, borderBottomColor: border }
            ]}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {n.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Pressable style={styles.itemContent} onPress={() => handleItemPress(n.id)}>
              {!n.read && <View style={[styles.unreadDot, { backgroundColor: primary }]} />}
              <Text style={[styles.messageText, { color: text }]} numberOfLines={2}>
                <Text style={styles.nameBold}>{n.name}</Text>
                {n.message}
                {n.highlight && (
                  <Text style={[styles.highlightText, { color: '#ea580c' }]}>{n.highlight}</Text>
                )}
              </Text>
              <Text style={[styles.itemTime, { color: muted }]}>{n.time}</Text>

              {n.hasActions && n.status === 'pending' && (
                <View style={styles.actionButtonsRow}>
                  <Pressable style={[styles.actionBtnPrimary, { backgroundColor: primary }]} onPress={() => resolveAction(n.id, 'accepted')}>
                    <Text style={styles.actionBtnPrimaryText}>Accept</Text>
                  </Pressable>
                  <Pressable style={styles.actionBtnSecondary} onPress={() => resolveAction(n.id, 'declined')}>
                    <Text style={[styles.actionBtnSecondaryText, { color: muted }]}>Decline</Text>
                  </Pressable>
                </View>
              )}

              {n.hasActions && n.status !== 'pending' && (
                <Text style={[styles.resolvedText, { color: n.status === 'accepted' ? '#16a34a' : '#ef4444' }]}>
                  {n.status === 'accepted' ? 'Accepted' : 'Declined'}
                </Text>
              )}
            </Pressable>
          </View>
        ))}

        {visibleNotifications.length === 0 && (
          <View style={styles.emptyWrap}>
            <Ionicons name="notifications-off-outline" size={24} color={muted} />
            <Text style={[styles.emptyText, { color: muted }]}>No unread notifications.</Text>
          </View>
        )}
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
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    right: 0,
    top: 4,
  },
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
  resolvedText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

