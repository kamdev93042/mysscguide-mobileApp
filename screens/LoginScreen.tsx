import { useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useLoginModal } from '../context/LoginModalContext';
import { authApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path } from 'react-native-svg';
import { SvgUri } from 'react-native-svg';
import { Asset } from 'expo-asset';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import Constants from 'expo-constants';

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

function TopoTexture() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 370" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Path d="M18 34c35-30 82-30 114 4s31 83-4 113-83 30-113-5-32-81 3-112z" stroke="rgba(231,255,242,0.38)" strokeWidth="2" fill="none" />
      <Path d="M44 62c22-18 52-19 72 1 22 21 21 53-1 73-21 19-52 18-72-2-20-20-21-52 1-72z" stroke="rgba(231,255,242,0.38)" strokeWidth="2" fill="none" />
      <Path d="M248 22c40-22 92-12 119 22 26 33 18 84-23 115-39 29-92 22-122-11-30-33-19-95 26-126z" stroke="rgba(231,255,242,0.34)" strokeWidth="2" fill="none" />
      <Path d="M268 52c27-14 61-8 79 15 18 22 11 56-17 76-28 20-63 15-82-8-20-24-11-64 20-83z" stroke="rgba(231,255,242,0.34)" strokeWidth="2" fill="none" />
      <Path d="M146 164c47-22 101-10 129 25 28 35 19 83-22 108-43 26-101 18-132-17-31-36-20-92 25-116z" stroke="rgba(231,255,242,0.3)" strokeWidth="2" fill="none" />
      <Path d="M182 192c27-11 55-5 71 13 15 18 10 45-14 59-25 15-56 9-72-10-16-20-10-50 15-62z" stroke="rgba(231,255,242,0.32)" strokeWidth="2" fill="none" />
      <Path d="M0 190c43 19 86 16 122-7 28-18 51-37 84-42 33-5 64 6 95 11 30 5 61 3 89-7" stroke="rgba(231,255,242,0.22)" strokeWidth="2" fill="none" />
    </Svg>
  );
}

function WaveSeparator() {
  return (
    <Svg width="100%" height="136" viewBox="0 0 390 136" preserveAspectRatio="none" style={styles.waveSvg}>
      <Path
        d="M0 56 C 64 30, 122 60, 168 94 C 210 124, 252 126, 306 108 C 340 96, 364 90, 390 82 L390 136 L0 136 Z"
        fill="#FAF9F6"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { setUserEmail, setUserName, setHasLoggedIn } = useLoginModal();

  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isLoginFlow, setIsLoginFlow] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [focusedOtpIndex, setFocusedOtpIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<Array<TextInput | null>>([]);
  const googleSvgUri = Asset.fromModule(require('../assets/google.svg')).uri;
  const waveTranslateY = useRef(new Animated.Value(34)).current;
  const headingOpacity = useRef(new Animated.Value(0)).current;
  const fieldsOpacity = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
  const googleWebClientId = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  const googleAndroidClientId = Constants.expoConfig?.extra?.googleAndroidClientId as string | undefined;
  const googleIosClientId = Constants.expoConfig?.extra?.googleIosClientId as string | undefined;
  const firstConfiguredGoogleClientId = [googleWebClientId, googleAndroidClientId, googleIosClientId].find(
    (id) => !!id && !id.startsWith('YOUR_')
  );

  const handleGoogleLoginPress = async () => {
    try {
      setLoading(true);

      const platformGoogleClientId =
        Platform.OS === 'web' ? googleWebClientId : Platform.OS === 'android' ? googleAndroidClientId : googleIosClientId;
      const googleClientId = platformGoogleClientId && !platformGoogleClientId.startsWith('YOUR_')
        ? platformGoogleClientId
        : firstConfiguredGoogleClientId;

      if (!googleClientId) {
        const msg = 'Google OAuth is not configured. Add client IDs in app.json -> expo.extra.';
        Alert.alert('Google Login Not Configured', msg);
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert(msg);
        }
        return;
      }
      
      const redirectUri = AuthSession.makeRedirectUri({
        ...(Platform.OS === 'web' ? {} : { scheme: 'mysscguide' })
      });

      // Google OAuth configuration
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(googleClientId)}` + 
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email')}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.alert('Google sign-in popup was closed or blocked. Allow popups and try again.');
        }
        return;
      }

      if (result.type === 'success' && result.url) {
        const params = new URLSearchParams(result.url.split('#')[1] || result.url.split('?')[1]);
        const token = params.get('access_token');
        if (token) {
          await handleGoogleLogin(token);
          return;
        }
        Alert.alert('Google Login Error', 'No access token returned by Google.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open Google Login');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (token: string | undefined) => {
    if (!token) return;

    try {
      setLoading(true);
      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = await userInfoResponse.json();

      if (user.email) {
        // Here you would typically call your own backend authApi.googleLogin(token)
        // For now, we'll simulate a successful login with the email received
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('isLoggedIn', 'true');
        await AsyncStorage.setItem('userEmail', user.email);
        await AsyncStorage.setItem('userName', user.name || user.given_name || 'Google User');

        setUserEmail(user.email);
        setUserName(user.name || user.given_name || 'Google User');
        setHasLoggedIn(true);

        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Google Login Error', 'Failed to sign in with Google');
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(waveTranslateY, {
        toValue: 0,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(headingOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(fieldsOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [fieldsOpacity, headingOpacity, waveTranslateY]);

  const handleSendOtp = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setUserEmail(trimmedEmail);

    try {
      setLoading(true);
      
      try {
        await authApi.sendLoginOtp(trimmedEmail);
        setIsLoginFlow(true);
        setIsOtpStep(true);
        setLoading(false);
        setTimeout(() => otpRefs.current[0]?.focus(), 80);
        return;
      } catch (_loginError) {
        setIsLoginFlow(false);
      }

      await authApi.sendOtp(trimmedEmail);
      setIsOtpStep(true);
      setLoading(false);
      setTimeout(() => otpRefs.current[0]?.focus(), 80);
    } catch (error) {
      setLoading(false);
      Alert.alert('Login Error', error instanceof Error ? error.message : 'Failed to send OTP');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const next = [...otpDigits];
    next[index] = value.slice(-1).replace(/[^0-9]/g, '');
    setOtpDigits(next);

    if (value && index < otpDigits.length - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = ({ nativeEvent }: any, index: number) => {
    if (nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otpDigits.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter all 6 digits.');
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
      setLoading(true);

      if (isLoginFlow) {
        const loginResponse = await authApi.loginOtp(trimmedEmail, otpCode);

        await AsyncStorage.setItem('userToken', loginResponse?.token || 'true');
        await AsyncStorage.setItem('isLoggedIn', 'true');

        const fetchedName = loginResponse?.user?.username || loginResponse?.user?.fullName || loginResponse?.username;
        if (fetchedName) {
          setUserName(fetchedName);
        }

        setHasLoggedIn(true);
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
      } else {
        await authApi.verifyOtp(trimmedEmail, otpCode);
        setLoading(false);
        navigation.navigate('Name');
      }
    } catch (error) {
      setLoading(false);
      Alert.alert('Verification Error', error instanceof Error ? error.message : 'Invalid OTP');
    }
  };

  const handleDevBypassLogin = async () => {
    try {
      setLoading(true);
      await AsyncStorage.setItem('userToken', 'true');
      await AsyncStorage.setItem('isLoggedIn', 'true');
      await AsyncStorage.setItem('userEmail', 'dev@mysscguide.com');
      await AsyncStorage.setItem('userName', 'Developer');

      setUserEmail('dev@mysscguide.com');
      setUserName('Developer');
      setHasLoggedIn(true);

      setLoading(false);
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      setLoading(false);
      Alert.alert('Dev Login Error', error instanceof Error ? error.message : 'Could not bypass login');
    }
  };

  const regularFamily = fontsLoaded ? 'DMSans_400Regular' : undefined;
  const mediumFamily = fontsLoaded ? 'DMSans_500Medium' : undefined;
  const boldFamily = fontsLoaded ? 'DMSans_700Bold' : undefined;

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <TopoTexture />
          <Animated.View style={{ transform: [{ translateY: waveTranslateY }] }}>
            <WaveSeparator />
          </Animated.View>
        </View>

        <Animated.View style={[styles.sheet, { opacity: fieldsOpacity }]}> 
          <Animated.View style={{ opacity: headingOpacity }}>
            <Text style={[styles.title, { fontFamily: boldFamily }]}>Sign in</Text>
            <View style={styles.titleUnderline} />
          </Animated.View>

          <Text style={[styles.label, { fontFamily: boldFamily }]}>Email</Text>
          <View style={[styles.inputRow, isEmailFocused && styles.inputRowFocused]}>
            <Ionicons name="mail-outline" size={16} color="#8E949A" style={styles.inputIcon} />
            <TextInput
              placeholder="demo@email.com"
              placeholderTextColor="#B5B8BD"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isOtpStep}
              value={email}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              onChangeText={setEmail}
              style={[styles.input, { fontFamily: regularFamily }]}
            />
          </View>

          {!isOtpStep ? (
            <>
              <Pressable style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleSendOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={[styles.primaryBtnText, { fontFamily: boldFamily }]}>Send OTP</Text>}
              </Pressable>

              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={[styles.orText, { fontFamily: mediumFamily }]}>or</Text>
                <View style={styles.orLine} />
              </View>

              <Pressable 
                style={[styles.googleBtn, loading && { opacity: 0.6 }]} 
                onPress={handleGoogleLoginPress} 
                disabled={loading}
              >
                <SvgUri width={18} height={18} uri={googleSvgUri} />
                <Text style={[styles.googleBtnText, { fontFamily: mediumFamily }]}>Login with Google</Text>
              </Pressable>
            </>
          ) : (
            <>
              <View style={styles.otpWrap}>
                {otpDigits.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => {
                      otpRefs.current[index] = ref;
                    }}
                    style={[styles.otpInput, focusedOtpIndex === index && styles.otpInputFocused]}
                    keyboardType="number-pad"
                    maxLength={1}
                    value={digit}
                    onFocus={() => setFocusedOtpIndex(index)}
                    onBlur={() => setFocusedOtpIndex((current) => (current === index ? null : current))}
                    onChangeText={(value) => handleOtpChange(value, index)}
                    onKeyPress={(event) => handleOtpKeyPress(event, index)}
                    selectionColor="#6BBF93"
                  />
                ))}
              </View>

              <Pressable style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleVerifyOtp} disabled={loading}>
                {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={[styles.primaryBtnText, { fontFamily: boldFamily }]}>Verify OTP</Text>}
              </Pressable>
            </>
          )}

          

          {__DEV__ ? (
            <Pressable style={styles.devBypassBtn} onPress={handleDevBypassLogin}>
              <Text style={[styles.devBypassText, { fontFamily: boldFamily }]}>Dev: Bypass Login</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#6BBF93',
  },
  flex: {
    flex: 1,
  },
  hero: {
    flex: 0.45,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  waveSvg: {
    width: '100%',
  },
  sheet: {
    flex: 1,
    backgroundColor: '#FAF9F6',
    marginTop: -1,
    paddingTop: 20,
    paddingHorizontal: 26,
    paddingBottom: 18,
  },
  title: {
    fontSize: 49,
    fontFamily: 'DMSans_700Bold',
    color: '#2E2F33',
  },
  titleUnderline: {
    width: 58,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#6BBF93',
    marginTop: 4,
    marginBottom: 20,
  },
  label: {
    fontSize: 24,
    fontFamily: 'DMSans_700Bold',
    color: '#686D73',
    marginBottom: 4,
  },
  inputRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#7EC8A1',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#6BBF93',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  inputRowFocused: {
    borderBottomColor: '#5AAA82',
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  inputIcon: {
    marginRight: 8,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#555B61',
    fontFamily: 'DMSans_400Regular',
  },
  primaryBtn: {
    backgroundColor: '#6BBF93',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D6DADF',
  },
  orText: {
    marginHorizontal: 10,
    color: '#A0A5AB',
    fontFamily: 'DMSans_500Medium',
    fontSize: 13,
  },
  googleBtn: {
    borderWidth: 1,
    borderColor: '#D8DCE1',
    borderRadius: 999,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    color: '#5D646B',
    fontSize: 15,
    fontFamily: 'DMSans_500Medium',
  },
  otpWrap: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginTop: 4,
  },
  otpInput: {
    width: 44,
    height: 52,
    textAlign: 'center',
    fontSize: 24,
    color: '#2F353A',
    fontFamily: 'DMSans_700Bold',
    borderBottomWidth: 2,
    borderBottomColor: '#6BBF93',
  },
  otpInputFocused: {
    borderBottomColor: '#4E9E76',
    shadowColor: '#6BBF93',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  devBypassBtn: {
    marginTop: 14,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6BBF93',
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(107,191,147,0.12)',
  },
  devBypassText: {
    color: '#2E6D4B',
    fontSize: 12,
    fontFamily: 'DMSans_700Bold',
  },
  signupRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupHint: {
    fontSize: 14,
    color: '#A4AAB0',
    fontFamily: 'DMSans_500Medium',
  },
  signupLink: {
    fontSize: 14,
    color: '#6BBF93',
    fontFamily: 'DMSans_700Bold',
  },
});

