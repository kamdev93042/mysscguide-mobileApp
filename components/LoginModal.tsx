import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useLoginModal } from '../context/LoginModalContext';

export default function LoginModal() {
  const navigation = useNavigation();
  const { isVisible, closeLogin, setUserPhone, setUserEmail } = useLoginModal();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const modalWidth = Math.min(windowWidth * 0.9, 400);
  const cardStyle = [styles.modalCard, { width: modalWidth, maxHeight: windowHeight * 0.9 }];

  const handleLogin = () => {
    setUserEmail(email.trim());
    setUserPhone(phone || '');
    closeLogin();
    navigation.navigate('OTP');
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={closeLogin}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable
        style={[styles.overlay, { width: windowWidth, height: windowHeight }]}
        onPress={closeLogin}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={cardStyle} onPress={(e) => e.stopPropagation()}>
            <View style={styles.headerRow}>
              <View style={styles.headerTextWrap}>
                <Text style={styles.title}>Welcome Back!</Text>
                <Text style={styles.subtitle}>
                  Login to continue your SSC exam preparation
                </Text>
              </View>
              <Pressable onPress={closeLogin} style={styles.closeBtn} hitSlop={12}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your mobile number"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
              />

              <Pressable style={styles.otpLink}>
                <Text style={styles.linkGreen}>Login with OTP</Text>
              </Pressable>

              <Pressable style={styles.loginBtn} onPress={handleLogin}>
                <Text style={styles.loginBtnText}>Login</Text>
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR CONTINUE WITH</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable style={styles.googleBtn}>
                <Ionicons name="logo-google" size={20} color="#fff" />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </Pressable>

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <Pressable>
                  <Text style={styles.signUpLink}>Sign Up</Text>
                </Pressable>
              </View>
            </ScrollView>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  modalCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.35)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerTextWrap: { flex: 1, marginRight: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#020617', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 20 },
  closeBtn: { padding: 4 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 28 },
  label: { fontSize: 14, fontWeight: '500', color: '#020617', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#020617',
  },
  otpLink: { marginTop: 12 },
  linkGreen: { fontSize: 14, color: '#059669', fontWeight: '600' },
  loginBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 12,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#475569' },
  orText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  googleBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    flexWrap: 'wrap',
  },
  footerText: { fontSize: 14, color: '#94a3b8' },
  signUpLink: { fontSize: 14, color: '#059669', fontWeight: '600' },
});
