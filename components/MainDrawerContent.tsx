import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';

const NAV_ITEMS = [
  { name: 'Dashboard', icon: 'home' },
  { name: 'Mocks', icon: 'document-text' },
  { name: 'PYQs', icon: 'document-text' },
  { name: 'Contests', icon: 'trophy' },
  { name: 'Typing', icon: 'keypad' },
  { name: 'MistakeBook', icon: 'eye' },
  { name: 'Mnemonics', icon: 'bulb' },
  { name: 'Forums', icon: 'people' },
  { name: 'Skill Boost', icon: 'rocket' },
];

export default function MainDrawerContent(props) {
  const { state, navigation } = props;
  const { userName, userPhone, userEmail } = useLoginModal();
  const currentRoute = state?.routes?.[state.index]?.name ?? 'Dashboard';
  const initial = (userName || 'U').charAt(0).toUpperCase();

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.container}
      style={styles.drawer}
    >
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.profileName}>{userName || 'User'}</Text>
        <Text style={styles.profileEmail}>{userEmail || 'user@mysscguide.com'}</Text>
        {userPhone ? (
          <View style={styles.phoneRow}>
            <Text style={styles.profilePhone}>{userPhone}</Text>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
          </View>
        ) : null}
        <Pressable style={styles.viewProfileBtn}>
          <Text style={styles.viewProfileText}>View Profile</Text>
        </Pressable>
      </View>

      <View style={styles.logoRow}>
        <Ionicons name="book" size={22} color="#059669" />
        <Text style={styles.logoText}>
          My<Text style={styles.logoHighlight}>SSC</Text>guide
        </Text>
      </View>

      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => {
          const isActive = currentRoute === item.name;
          return (
            <Pressable
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                navigation.navigate(item.name);
                navigation.closeDrawer();
              }}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? '#059669' : '#94a3b8'}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.collapseBtn}
          onPress={() => navigation.closeDrawer()}
        >
          <Ionicons name="chevron-back" size={20} color="#059669" />
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48, paddingHorizontal: 16 },
  drawer: { backgroundColor: '#0f172a' },
  profileSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#059669' },
  profileName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  profileEmail: { fontSize: 13, color: '#94a3b8', marginBottom: 4 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  profilePhone: { fontSize: 13, color: '#94a3b8' },
  viewProfileBtn: { alignSelf: 'flex-start' },
  viewProfileText: { fontSize: 14, color: '#059669', fontWeight: '600' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: { fontSize: 16, fontWeight: '700', color: '#fff', marginLeft: 8 },
  logoHighlight: { color: '#059669' },
  navSection: { flex: 1 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  navItemActive: { backgroundColor: 'rgba(5, 150, 105, 0.15)' },
  navLabel: { fontSize: 16, color: '#94a3b8', marginLeft: 12 },
  navLabelActive: { color: '#059669', fontWeight: '600' },
  footer: {
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    alignItems: 'flex-end',
  },
  collapseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(5, 150, 105, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
