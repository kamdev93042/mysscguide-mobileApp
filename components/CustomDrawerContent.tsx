import { View, Text, StyleSheet, Pressable } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';

const NAV_ITEMS = [
  { name: 'Home', icon: 'home' },
  { name: 'SSC Exams', icon: 'school' },
  { name: 'Features', icon: 'flash' },
  { name: 'Exams', icon: 'school' },
  { name: 'Stats', icon: 'trophy' },
  { name: 'Comparison', icon: 'git-compare' },
  { name: 'How it Works', icon: 'bulb' },
  { name: 'Reviews', icon: 'chatbubble-ellipses' },
];

export default function CustomDrawerContent(props) {
  const { state, navigation } = props;
  const { openLogin } = useLoginModal();
  const currentRoute = state?.routes?.[state.index]?.name ?? 'Home';

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.container}
      style={styles.drawer}
    >
      <View style={styles.logoRow}>
        <View style={styles.logoIcon}>
          <Ionicons name="book" size={28} color="#059669" />
        </View>
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
                name={item.icon as any}
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
        <Pressable style={styles.iconBtn}>
          <Ionicons name="sunny" size={22} color="#94a3b8" />
        </Pressable>
        <Pressable
          style={styles.loginBtn}
          onPress={() => {
            navigation.closeDrawer();
            openLogin();
          }}
        >
          <Text style={styles.loginBtnText}>Login</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 48, paddingHorizontal: 16 },
  drawer: { backgroundColor: '#0f172a' },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logoIcon: { marginRight: 10 },
  logoText: { fontSize: 20, fontWeight: '700', color: '#fff' },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  iconBtn: { padding: 8 },
  loginBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loginBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
