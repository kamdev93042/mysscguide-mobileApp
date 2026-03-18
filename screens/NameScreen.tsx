import { useState } from 'react';
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
import { useLoginModal } from '../context/LoginModalContext';
import { useSplash } from '../context/SplashContext';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function NameScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { setUserName, setHasLoggedIn, userEmail } = useLoginModal();
  const { showSplash } = useSplash();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    try {
      setLoading(true);
      const signupResponse = await authApi.signup(trimmed, userEmail || '');
      
      // Save session
      await AsyncStorage.setItem('userToken', signupResponse?.token || 'true');
      await AsyncStorage.setItem('isLoggedIn', 'true');

      setLoading(false);

      setUserName(trimmed);
      setHasLoggedIn(true);

      // Call splash screen for 2s before navigating
      await showSplash(2000);

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (error) {
      console.error('Signup Error in NameScreen:', error);
      setLoading(false);
      Alert.alert('Signup Error', error instanceof Error ? error.message : 'Could not create account');
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.card}>
          <Text style={styles.title}>What&apos;s your name?</Text>
          <Text style={styles.subtitle}>We&apos;ll use this to personalize your experience.</Text>

          <Text style={styles.label}>Full name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            value={name}
            onChangeText={setName}
          />

          <Pressable style={[styles.btn, loading && { opacity: 0.7 }]} onPress={handleContinue} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>Continue</Text>
            )}
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
    borderRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 18 },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
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
    marginBottom: 18,
  },
  btn: {
    borderRadius: 999,
    backgroundColor: '#059669',
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});

