import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function PlaceholderScreen({ route }) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const name = route?.params?.name ?? route?.name ?? 'Page';
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: text }]}>{name}</Text>
        <Text style={[styles.subtitle, { color: muted }]}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 16 },
});
