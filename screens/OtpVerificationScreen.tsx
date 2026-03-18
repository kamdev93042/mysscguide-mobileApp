import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OtpVerificationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { userEmail, setUserName, setHasLoggedIn } = useLoginModal();

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputs = useRef<any>([]);

  // Use the same light look and feel as the name screen (no dark theme here)
  const bg = '#f4f4f5';
  const card = '#ffffff';
  const text = '#111827';
  const muted = '#6b7280';
  const border = '#e5e7eb';

  const handleChange = (value: string, index: number) => {
    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);

    if (value && index < 5) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }: any, index: number) => {
    if (nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleConfirm = async () => {
    const otpString = code.join('');
    if (otpString.length !== 6) {
      Alert.alert('Error', 'Please enter a 6-digit OTP');
      return;
    }
    
    try {
      setLoading(true);
      await authApi.verifyOtp(userEmail, otpString);

      // Attempt to login seamlessly using our deterministic dummy password
      try {
        const loginResponse = await authApi.login(userEmail);
        
        // If login succeeded, they are an existing user! 
        // Save the session and go to Main.
        await AsyncStorage.setItem('userToken', loginResponse?.token || 'true');
        await AsyncStorage.setItem('isLoggedIn', 'true');
        
        const fetchedName = loginResponse?.user?.username || loginResponse?.user?.fullName || loginResponse?.username;
        if (fetchedName) {
           setUserName(fetchedName);
        }
        setHasLoggedIn(true);

        setLoading(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
        return; // Don't proceed to Name Screen

      } catch (loginError) {
        console.error('Login Error during OTP verification (Proceeding to Signup fallback):', loginError);
        // Login failed, which means they are a new user and need to signup.
        // Proceed to Name screen.
        console.log('User not registered yet, sending to NameScreen');
      }

      setLoading(false);
      navigation.navigate('Name');
    } catch (error) {
      setLoading(false);
      Alert.alert('Verification Error', error instanceof Error ? error.message : 'Invalid OTP');
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.card, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={30} color="#059669" />
          </View>
          <Text style={[styles.title, { color: text }]}>Verification code</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            Enter the verification code we've sent to your email {userEmail || ''}.
          </Text>

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={(ref) => { inputs.current[i] = ref; }}
                style={[styles.codeInput, { borderColor: border, color: text }]}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(v) => handleChange(v, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
              />
            ))}
          </View>

          <Pressable style={[styles.confirmBtn, loading && { opacity: 0.7 }]} onPress={handleConfirm} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmText}>Confirm</Text>
            )}
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
    width: '100%',
    marginBottom: 24,
  },
  codeInput: {
    width: 44,
    height: 52,
    borderRadius: 12,
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

