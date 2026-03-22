import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setUserEmail, setUserName, setHasLoggedIn } = useLoginModal();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setUserEmail(trimmedEmail);

    try {
      setLoading(true);
      
      // Attempt to send an OTP via the native existing user route
      try {
        await authApi.sendLoginOtp(trimmedEmail);
        
        // Success! User exists. Route to OTP screen in "Login" mode.
        setLoading(false);
        (navigation as any).navigate('OTP', { isLoginFlow: true });
        return;
      } catch (loginError) {
        console.log('User not registered in login flow, falling back to signup flow.');
      }

      // If the above fails, it means the user is new. Send standard signup OTP.
      await authApi.sendOtp(trimmedEmail);
      setLoading(false);
      (navigation as any).navigate('OTP', { isLoginFlow: false });
    } catch (error) {
      setLoading(false);
      Alert.alert('Login Error', error instanceof Error ? error.message : 'Failed to send OTP');
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>
            My<Text style={styles.appTitleHighlight}>SSC</Text>guide
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>
            Login to continue your SSC exam preparation
          </Text>

          <Text style={styles.label}>Email / Mobile number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email or mobile"
            placeholderTextColor="#9ca3af"
            keyboardType="default"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <Pressable style={styles.otpLink} onPress={handleLogin}>
            <Text style={styles.otpText}>Login with OTP</Text>
          </Pressable>

          <Pressable style={[styles.loginBtn, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginText}>Login</Text>
            )}
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or Continue with</Text>
            <View style={styles.orLine} />
          </View>

          <Pressable style={styles.socialBtn}>
            <Ionicons name="logo-google" size={20} color="#111827" />
            <Text style={styles.socialText}>Google</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f4f4f5', paddingHorizontal: 16 },
  flex: { flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 16 },
  appTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  appTitleHighlight: { color: '#059669' },
  card: {
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  otpLink: { marginTop: 10 },
  otpText: { fontSize: 13, color: '#059669', fontWeight: '600' },
  loginBtn: {
    marginTop: 18,
    borderRadius: 999,
    backgroundColor: '#059669',
    paddingVertical: 14,
    alignItems: 'center',
  },
  loginText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  orText: {
    marginHorizontal: 10,
    fontSize: 11,
    fontWeight: '600',
    color: '#9ca3af',
  },
  socialBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  socialText: { fontSize: 14, fontWeight: '600', color: '#111827' },
});

