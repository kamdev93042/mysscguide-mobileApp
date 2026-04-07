import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Animated, Easing, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useFonts, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';

function TopoTexture() {
  return null;
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
