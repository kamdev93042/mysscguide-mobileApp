import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';

export default function OtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userEmail } = useLoginModal();

  const [code, setCode] = useState(['', '', '', '']);

  // Use the same light look and feel as the name screen (no dark theme here)
  const bg = '#f4f4f5';
  const card = '#ffffff';
  const text = '#111827';
  const muted = '#6b7280';
  const border = '#e5e7eb';

  const handleChange = (value, index) => {
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
  };

  const handleConfirm = () => {
    // In real app, verify OTP with backend here
    navigation.navigate('Name');
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-open-outline" size={30} color="#059669" />
          </View>
          <Text style={[styles.title, { color: text }]}>Verification code</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            Enter the verification code we've sent to {userEmail || 'your email'}.
          </Text>

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                style={[styles.codeInput, { borderColor: border, color: text }]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
              />
            ))}
          </View>

          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirm</Text>
          </Pressable>

          <Pressable style={styles.resendRow}>
            <Text style={[styles.resendText, { color: muted }]}>
              Didn't receive the code?{' '}
              <Text style={styles.resendLink}>Resend</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f4f4f5', paddingHorizontal: 16 },
  flex: { flex: 1, justifyContent: 'center' },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(5,150,105,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '80%',
    marginBottom: 24,
  },
  codeInput: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    backgroundColor: 'rgba(148,163,184,0.08)',
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  resendRow: { marginTop: 4 },
  resendText: { fontSize: 13, textAlign: 'center' },
  resendLink: { color: '#059669', fontWeight: '600' },
});

