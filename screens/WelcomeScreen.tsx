import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useFonts, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

function TopoTexture() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 440" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
      <Path d="M18 40c35-30 82-30 114 4s31 83-4 113-83 30-113-5-32-81 3-112z" stroke="rgba(231,255,242,0.38)" strokeWidth="2" fill="none" />
      <Path d="M44 68c22-18 52-19 72 1 22 21 21 53-1 73-21 19-52 18-72-2-20-20-21-52 1-72z" stroke="rgba(231,255,242,0.38)" strokeWidth="2" fill="none" />
      <Path d="M248 24c40-22 92-12 119 22 26 33 18 84-23 115-39 29-92 22-122-11-30-33-19-95 26-126z" stroke="rgba(231,255,242,0.34)" strokeWidth="2" fill="none" />
      <Path d="M268 54c27-14 61-8 79 15 18 22 11 56-17 76-28 20-63 15-82-8-20-24-11-64 20-83z" stroke="rgba(231,255,242,0.34)" strokeWidth="2" fill="none" />
      <Path d="M146 184c47-22 101-10 129 25 28 35 19 83-22 108-43 26-101 18-132-17-31-36-20-92 25-116z" stroke="rgba(231,255,242,0.3)" strokeWidth="2" fill="none" />
      <Path d="M182 212c27-11 55-5 71 13 15 18 10 45-14 59-25 15-56 9-72-10-16-20-10-50 15-62z" stroke="rgba(231,255,242,0.32)" strokeWidth="2" fill="none" />
      <Path d="M14 254c56-29 125-24 166 10 39 34 38 83-3 115-43 34-116 35-165 1-50-34-51-92 2-126z" stroke="rgba(231,255,242,0.28)" strokeWidth="2" fill="none" />
      <Path d="M48 286c31-15 68-13 91 6 22 18 21 45-1 64-24 20-64 22-92 4-27-18-28-53 2-74z" stroke="rgba(231,255,242,0.28)" strokeWidth="2" fill="none" />
      <Path d="M216 288c50-25 111-19 146 12 35 30 33 77-7 106-42 30-108 30-149 0-41-30-37-88 10-118z" stroke="rgba(231,255,242,0.26)" strokeWidth="2" fill="none" />
      <Path d="M248 318c27-12 58-9 77 8 18 16 16 41-4 57-21 17-55 18-77 2-21-15-20-49 4-67z" stroke="rgba(231,255,242,0.26)" strokeWidth="2" fill="none" />
      <Path d="M0 168c32 17 75 16 112-2 25-11 47-28 73-31 26-2 52 11 79 15 34 6 72-1 104-19" stroke="rgba(231,255,242,0.25)" strokeWidth="2" fill="none" />
      <Path d="M0 212c43 19 86 16 122-7 28-18 51-37 84-42 33-5 64 6 95 11 30 5 61 3 89-7" stroke="rgba(231,255,242,0.22)" strokeWidth="2" fill="none" />
    </Svg>
  );
}

function WaveSeparator() {
  return (
    <Svg width="100%" height="150" viewBox="0 0 390 150" preserveAspectRatio="none" style={styles.waveSvg}>
      <Path
        d="M0 58 C 68 38, 108 74, 154 104 C 200 136, 250 134, 304 112 C 340 98, 366 96, 390 88 L390 150 L0 150 Z"
        fill="#FAF9F6"
      />
    </Svg>
  );
}

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const waveTranslateY = useRef(new Animated.Value(34)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({ DMSans_500Medium, DMSans_700Bold });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(waveTranslateY, {
        toValue: 0,
        duration: 750,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 650,
        delay: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [contentOpacity, waveTranslateY]);

  const subtitleFontFamily = fontsLoaded ? 'DMSans_500Medium' : undefined;
  const continueFontFamily = fontsLoaded ? 'DMSans_700Bold' : undefined;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.hero, { paddingTop: insets.top + 10 }]}> 
        <TopoTexture />
        <Animated.View style={{ transform: [{ translateY: waveTranslateY }] }}>
          <WaveSeparator />
        </Animated.View>
      </View>

      <Animated.View style={[styles.sheet, { opacity: contentOpacity }]}> 
        <Text style={styles.title}> 
          Welcome to{`\n`}
          <Text style={styles.brandTitle}>My</Text>
          <Text style={[styles.brandTitle, styles.titleHighlight]}>SSC</Text>
          <Text style={styles.brandTitle}>guide</Text>
        </Text>
        <Text style={[styles.subtitle, { fontFamily: subtitleFontFamily }]}> 
          Daily mocks, revision, and quizzes for your{`\n`}SSC exam journey.
        </Text>

        <View style={styles.footerRow}>
          <Text style={[styles.continueLabel, { fontFamily: continueFontFamily }]}>Continue</Text>
          <Pressable
            style={styles.cta}
            onPress={() => navigation.navigate('Login')}
          >
            <Animated.View style={styles.ctaCircle}> 
              <Text style={styles.ctaIcon}>→</Text>
            </Animated.View>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  hero: {
    flex: 0.6,
    backgroundColor: '#6BBF93',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  waveSvg: {
    width: '100%',
  },
  sheet: {
    flex: 0.4,
    backgroundColor: '#FAF9F6',
    paddingHorizontal: 30,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontSize: 46,
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '800',
    color: '#2E2F33',
    marginBottom: 8,
  },
  brandTitle: {
    fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    fontWeight: '800',
  },
  titleHighlight: {
    color: '#10b981',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 23,
    color: '#B9BDC2',
    fontFamily: 'DMSans_500Medium',
    marginBottom: 24,
  },
  footerRow: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  continueLabel: {
    fontSize: 20,
    color: '#ADB2B8',
    fontFamily: 'DMSans_700Bold',
    marginRight: 8,
  },
  cta: {
    borderRadius: 999,
  },
  ctaCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6BBF93',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#387B5A',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  ctaIcon: {
    color: '#ffffff',
    fontFamily: 'DMSans_700Bold',
    fontSize: 23,
    marginTop: -1,
  },
});
