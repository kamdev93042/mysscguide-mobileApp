import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLoginModal } from '../context/LoginModalContext';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { openLogin, hasLoggedIn } = useLoginModal();

  useEffect(() => {
    if (!hasLoggedIn) openLogin();
  }, [hasLoggedIn]);

  return (
    <View style={styles.wrapper}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.logoRow}>
          <Ionicons name="book" size={32} color="#059669" />
          <Text style={styles.logoText}>
            My<Text style={styles.logoHighlight}>SSC</Text>guide
          </Text>
        </View>
      </View>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoText: { fontSize: 24, fontWeight: '700', color: '#fff', marginLeft: 10 },
  logoHighlight: { color: '#059669' },
  placeholder: { flex: 1 },
});
