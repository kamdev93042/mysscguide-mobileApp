import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Attempt, MockChallenge, useMocks } from '../context/MocksContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

type ChallengeTab = 'my' | 'public';
type HistoryFilter = 'all' | 'public' | 'private';

type UiChallenge = {
  id: string;
  name: string;
  scope: ChallengeTab;
  visibility: 'Private' | 'Public';
  questions: number;
  durationMinutes: number;
  created: string;
  topics: string[];
  score: string;
  accuracy: string;
  time: string;
  source: MockChallenge;
  linkedAttempt?: Attempt | null;
};

type UiHistory = {
  id: string;
  name: string;
  mode: string;
  date: string;
  visibility: 'Private' | 'Public';
  participants: string;
  score: string;
  accuracy: string;
  time: string;
  attempt: Attempt;
};

type ActionName =
  | 'start'
  | 'schedule'
  | 'analysis'
  | 'review'
  | 'share'
  | 'leaderboard'
  | 'retake'
  | 'locked';

type QuickAction = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  locked?: boolean;
  onPress: () => void;
};

const ACTION_MESSAGES: Record<ActionName, string> = {
  start: 'Starting a new mock...',
  schedule: 'Schedule your next mock.',
  analysis: 'Opening analysis...',
  review: 'Opening mistake review...',
  share: 'Share link copied.',
  leaderboard: 'Opening leaderboard...',
  retake: 'Retake started.',
  locked: 'Unlock Selection Key to access this.',
};

const HERO_FALLBACK = {
  title: 'No attempts yet',
  score: '--',
  accuracy: '--',
  time: '--',
};

const DEFAULT_CHALLENGE_TOPICS = ['General'];

const getInitials = (value?: string) => {
  const safe = String(value || '').trim();
  if (!safe) return 'U';

  const parts = safe.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const clean = parts[0].replace(/[^a-zA-Z0-9]/g, '');
    return (clean.slice(0, 2) || 'U').toUpperCase();
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const formatDateOnly = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toISOString().slice(0, 10);
};

const formatDurationText = (minutes?: number) => {
  const safeMinutes = Number(minutes);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return '--';
  return `${safeMinutes} mins`;
};

const formatSecondsAsMockTime = (raw?: number) => {
  const total = Number(raw);
  if (!Number.isFinite(total) || total <= 0) return '--';
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

const formatScore = (raw: any) => {
  const score = Number(raw);
  if (!Number.isFinite(score)) return '--';
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
};

const formatAccuracy = (raw: any) => {
  const accuracy = Number(raw);
  if (!Number.isFinite(accuracy)) return '--';
  return `${Math.round(accuracy)}%`;
};

const parseMeta = (meta?: string) => {
  if (!meta) {
    return { questions: 0, durationMinutes: 0 };
  }
  const qMatch = meta.match(/(\d+)\s*Questions?/i);
  const dMatch = meta.match(/(\d+)\s*Minutes?/i);
  return {
    questions: qMatch ? Number(qMatch[1]) : 0,
    durationMinutes: dMatch ? Number(dMatch[1]) : 0,
  };
};

const getAttemptTestRef = (attempt: Attempt): any => {
  if (attempt?.testId && typeof attempt.testId === 'object') {
    return attempt.testId;
  }
  return null;
};

const getAttemptTitle = (attempt: Attempt) => {
  const testRef = getAttemptTestRef(attempt);
  return String(testRef?.title || (attempt as any)?.title || 'Custom Mock Attempt');
};

const buildTopicsFromChallenge = (challenge: MockChallenge) => {
  const topics: string[] = [];
  const subjects = (challenge as any)?.subjects;

  if (Array.isArray(subjects)) {
    subjects.forEach((subject: any) => {
      if (Array.isArray(subject?.topics)) {
        subject.topics.forEach((topic: any) => {
          const name =
            typeof topic === 'string'
              ? topic
              : typeof topic?.name === 'string'
              ? topic.name
              : '';
          if (name) topics.push(name);
        });
      }
      if (typeof subject?.subject === 'string') {
        topics.push(subject.subject);
      }
    });
  }

  if (Array.isArray((challenge as any)?.topics)) {
    (challenge as any).topics.forEach((topic: any) => {
      if (typeof topic === 'string') topics.push(topic);
      if (typeof topic?.name === 'string') topics.push(topic.name);
    });
  }

  const unique = Array.from(new Set(topics.filter(Boolean)));
  return unique.length > 0 ? unique.slice(0, 3) : DEFAULT_CHALLENGE_TOPICS;
};

const mapChallengeToUi = (
  challenge: MockChallenge,
  scope: ChallengeTab,
  attemptsByTitle: Map<string, Attempt>
): UiChallenge => {
  const parsedMeta = parseMeta(challenge.meta);
  const title = String(challenge.title || 'Custom Challenge');
  const lookupKey = title.toLowerCase();
  const linkedAttempt = attemptsByTitle.get(lookupKey) || null;
  const questionCount = Number(challenge.questionCount) || parsedMeta.questions || 0;
  const timeLimit = Number(challenge.timeLimit) || parsedMeta.durationMinutes || 0;
  const visibility: 'Private' | 'Public' =
    typeof challenge.isPublic === 'boolean'
      ? challenge.isPublic
        ? 'Public'
        : 'Private'
      : scope === 'my'
      ? 'Private'
      : 'Public';

  return {
    id: String(challenge.id || challenge._id || `${scope}-${title}`),
    name: title,
    scope,
    visibility,
    questions: questionCount,
    durationMinutes: timeLimit,
    created: formatDateTime(challenge.createdAt),
    topics: buildTopicsFromChallenge(challenge),
    score: linkedAttempt ? formatScore(linkedAttempt.score) : '--',
    accuracy: linkedAttempt ? formatAccuracy(linkedAttempt.accuracy) : '--',
    time: linkedAttempt ? formatSecondsAsMockTime(linkedAttempt.totalTimeTaken) : '--',
    source: challenge,
    linkedAttempt,
  };
};

const buildAnalysisPayload = (attempt: Attempt) => {
  const testRef = getAttemptTestRef(attempt);
  const totalQuestionsRaw = Number(testRef?.questionCount || testRef?.totalQuestions || 0);
  const totalQuestions = Number.isFinite(totalQuestionsRaw) && totalQuestionsRaw > 0 ? totalQuestionsRaw : undefined;
  const accuracyRaw = Number(attempt.accuracy);
  const inferredAttempted =
    totalQuestions && Number.isFinite(accuracyRaw)
      ? Math.max(0, Math.min(totalQuestions, Math.round((accuracyRaw / 100) * totalQuestions)))
      : 0;

  return {
    sourceTab: 'RankMaker' as const,
    attemptId: attempt._id,
    testTitle: getAttemptTitle(attempt),
    attempted: inferredAttempted,
    correct: inferredAttempted,
    wrong: 0,
    unattempted: totalQuestions ? Math.max(0, totalQuestions - inferredAttempted) : 0,
    score: Number(attempt.score) || 0,
    totalQuestions,
    durationSeconds: Number(attempt.totalTimeTaken) || 0,
    submittedAt: String(attempt.createdAt || new Date().toISOString()),
  };
};

export default function MocksScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { userName, userEmail, userPhone } = useLoginModal();
  const hasUnreadNotifications = useHasUnreadNotifications();
  const {
    myChallenges,
    publicChallenges,
    recentAttempts,
    isLoading,
    fetchMyChallenges,
    fetchPublicChallenges,
    fetchRecentAttempts,
  } = useMocks();

  const [activeTab, setActiveTab] = useState<ChallengeTab>('my');
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const menuTranslateX = useRef(new Animated.Value(-300)).current;
  const menuOverlayOpacity = useRef(new Animated.Value(0)).current;

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(8)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toastMessage, setToastMessage] = useState('Action completed');

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const displayName = useMemo(() => {
    const safe = String(userName || '').trim();
    return safe || 'User';
  }, [userName]);
  const userInitials = useMemo(() => getInitials(displayName), [displayName]);
  const profileSubline = useMemo(() => {
    const safeEmail = String(userEmail || '').trim();
    const safePhone = String(userPhone || '').trim();
    return safeEmail || safePhone || 'SSC Aspirant';
  }, [userEmail, userPhone]);

  const attemptsByTitle = useMemo(() => {
    const map = new Map<string, Attempt>();
    recentAttempts.forEach((attempt) => {
      const key = getAttemptTitle(attempt).toLowerCase().trim();
      if (key && !map.has(key)) {
        map.set(key, attempt);
      }
    });
    return map;
  }, [recentAttempts]);

  const challengeCards = useMemo(() => {
    const mappedMy = myChallenges.map((item) => mapChallengeToUi(item, 'my', attemptsByTitle));
    const mappedPublic = publicChallenges.map((item) => mapChallengeToUi(item, 'public', attemptsByTitle));
    return [...mappedMy, ...mappedPublic];
  }, [myChallenges, publicChallenges, attemptsByTitle]);

  const filteredChallenges = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return challengeCards.filter((challenge) => {
      if (challenge.scope !== activeTab) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = `${challenge.name} ${challenge.topics.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [activeTab, challengeCards, searchQuery]);

  const historyCards = useMemo<UiHistory[]>(() => {
    return recentAttempts.map((attempt, index) => {
      const testRef = getAttemptTestRef(attempt);
      const visibility: 'Private' | 'Public' = testRef?.isPublic ? 'Public' : 'Private';
      const participantsRaw = Number(testRef?.participantCount || testRef?.participants || 0);
      const participants = visibility === 'Public' && participantsRaw > 0 ? String(participantsRaw) : '1/1';

      return {
        id: String(attempt._id || `attempt-${index}`),
        name: getAttemptTitle(attempt),
        mode: visibility === 'Public' ? 'Community' : 'Custom',
        date: formatDateOnly(attempt.createdAt),
        visibility,
        participants,
        score: formatScore(attempt.score),
        accuracy: formatAccuracy(attempt.accuracy),
        time: formatSecondsAsMockTime(attempt.totalTimeTaken),
        attempt,
      };
    });
  }, [recentAttempts]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') {
      return historyCards;
    }
    return historyCards.filter((item) => item.visibility.toLowerCase() === historyFilter);
  }, [historyCards, historyFilter]);

  const heroData = useMemo(() => {
    const latest = historyCards[0];
    if (!latest) {
      return HERO_FALLBACK;
    }
    return {
      title: latest.name,
      score: latest.score,
      accuracy: latest.accuracy,
      time: latest.time,
    };
  }, [historyCards]);

  const onRefresh = useCallback(() => {
    fetchMyChallenges();
    fetchPublicChallenges();
    fetchRecentAttempts();
  }, [fetchMyChallenges, fetchPublicChallenges, fetchRecentAttempts]);

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }

      toastTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: 8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 1800);
    },
    [toastOpacity, toastTranslateY]
  );

  const toggleMenu = useCallback(
    (force?: boolean) => {
      const shouldOpen = typeof force === 'boolean' ? force : !isMenuOpen;
      setIsMenuOpen(shouldOpen);

      if (shouldOpen) {
        setIsMenuMounted(true);
        Animated.parallel([
          Animated.timing(menuOverlayOpacity, {
            toValue: 1,
            duration: 220,
            useNativeDriver: true,
          }),
          Animated.timing(menuTranslateX, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }),
        ]).start();
        return;
      }

      Animated.parallel([
        Animated.timing(menuOverlayOpacity, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(menuTranslateX, {
          toValue: -300,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsMenuMounted(false);
        }
      });
    },
    [isMenuOpen, menuOverlayOpacity, menuTranslateX]
  );

  const startChallenge = useCallback(
    (challenge: UiChallenge) => {
      navigation.navigate('MockInstruction', {
        mockData: {
          title: challenge.name,
          questions: challenge.questions || 25,
          duration: challenge.durationMinutes || 15,
        },
      });
    },
    [navigation]
  );

  const openAnalysis = useCallback(
    (attempt?: Attempt | null) => {
      if (!attempt) {
        showToast(ACTION_MESSAGES.analysis);
        return;
      }
      navigation.navigate('TestAnalysis', {
        result: buildAnalysisPayload(attempt),
      });
    },
    [navigation, showToast]
  );

  const runAction = useCallback(
    (action: ActionName, options?: { name?: string; challenge?: UiChallenge; history?: UiHistory; attempt?: Attempt | null }) => {
      const { name, challenge, history, attempt } = options || {};

      if (action === 'start' && challenge) {
        startChallenge(challenge);
        return;
      }

      if (action === 'retake' && history) {
        navigation.navigate('MockInstruction', {
          mockData: {
            title: history.name,
            questions: Number(getAttemptTestRef(history.attempt)?.questionCount || 25),
            duration: Number(getAttemptTestRef(history.attempt)?.timeLimit || 15),
          },
        });
        return;
      }

      if (action === 'analysis') {
        openAnalysis(history?.attempt || attempt || challenge?.linkedAttempt || null);
        return;
      }

      let message = ACTION_MESSAGES[action] || 'Done';
      if (name && action === 'retake') {
        message = message.replace('...', ` for ${name}...`);
      }
      showToast(message);
    },
    [navigation, openAnalysis, showToast, startChallenge]
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        id: 'create',
        title: 'Create Challenge',
        subtitle: 'Pick topics, difficulty and time limit.',
        cta: 'Build Now',
        icon: 'options-outline',
        iconBg: '#0f9f7a',
        onPress: () => navigation.navigate('CreateMock'),
      },
      {
        id: 'pyq',
        title: 'PYQ Archives',
        subtitle: 'Previous year papers across shifts.',
        cta: 'Browse Papers',
        icon: 'copy-outline',
        iconBg: '#ec4899',
        onPress: () => navigation.navigate('PYQs', { activeTab: 'PYQ' }),
      },
      {
        id: 'rank',
        title: 'Rank Maker Archives',
        subtitle: 'Elite mock series for top ranks.',
        cta: 'Browse Series',
        icon: 'star-outline',
        iconBg: '#7c3aed',
        onPress: () => navigation.navigate('PYQs', { activeTab: 'RankMaker' }),
      },
      {
        id: 'sectional',
        title: 'Sectional Tests',
        subtitle: 'Topic-wise practice for every exam.',
        cta: 'Choose Exam',
        icon: 'layers-outline',
        iconBg: '#2563eb',
        onPress: () => navigation.navigate('PYQs', { activeTab: 'PYQ' }),
      },
      {
        id: 'chapter',
        title: 'Chapter-wise PYQs',
        subtitle: 'Chapter-level questions with solutions.',
        cta: 'Explore',
        icon: 'book-outline',
        iconBg: '#f59e0b',
        onPress: () => navigation.navigate('PYQs', { activeTab: 'PYQ' }),
      },
      {
        id: 'locked',
        title: 'Personal Study Plan',
        subtitle: 'Targeted plan based on your weak areas.',
        cta: 'Unlock Pro',
        icon: 'flask-outline',
        iconBg: '#64748b',
        locked: true,
        onPress: () => runAction('locked'),
      },
    ],
    [navigation, runAction]
  );

  const menuItemPress = useCallback(
    (routeName?: string, params?: any) => {
      toggleMenu(false);
      if (!routeName) return;
      navigation.navigate(routeName, params);
    },
    [navigation, toggleMenu]
  );

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top }]}> 
      <ScrollView
        style={styles.page}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + Math.max(insets.bottom, 8) }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#059669" />}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable style={styles.brand} onPress={() => toggleMenu(true)}>
              <Image source={require('../assets/sscguidelogo.png')} style={styles.brandLogo} resizeMode="contain" />
              <Text style={styles.brandText}>
                My<Text style={styles.brandTextAccent}>SSC</Text>guide
              </Text>
            </Pressable>

            <View style={styles.headerRight}>
              <Pressable
                style={styles.headerIconButton}
                onPress={() => navigation.navigate('Notifications')}
                hitSlop={10}
              >
                <Ionicons name="notifications" size={18} color="#f59e0b" />
                {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
              </Pressable>

              <Pressable style={styles.avatar} onPress={() => toggleMenu(true)}>
                <Text style={styles.avatarText}>{userInitials}</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroBubbleLarge} />
          <View style={styles.heroBubbleSmall} />

          <View style={styles.heroTagRow}>
            <Ionicons name="flash" size={12} color="#ffffff" />
            <Text style={styles.heroTag}>Previous Mock Result</Text>
          </View>

          <Text style={styles.heroTitle}>{heroData.title}</Text>
          <Text style={styles.heroSubtitle}>
            {historyCards.length > 0
              ? 'Review your last attempt and fix the weak spots before the next mock.'
              : 'Take your first mock to start tracking score, accuracy and timing.'}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{heroData.score}</Text>
              <Text style={styles.heroStatLabel}>Score</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{heroData.accuracy}</Text>
              <Text style={styles.heroStatLabel}>Accuracy</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{heroData.time}</Text>
              <Text style={styles.heroStatLabel}>Time</Text>
            </View>
          </View>

          <View style={styles.heroActions}>
            <Pressable
              style={[styles.heroButton, styles.heroButtonLight]}
              onPress={() => runAction('analysis', { name: heroData.title, attempt: historyCards[0]?.attempt || null })}
            >
              <Text style={styles.heroButtonLightText}>View Analysis</Text>
            </Pressable>
            <Pressable
              style={[styles.heroButton, styles.heroButtonGhost]}
              onPress={() => runAction('review', { name: heroData.title })}
            >
              <Text style={styles.heroButtonGhostText}>Review Mistakes</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={[styles.actionCard, action.locked ? styles.actionCardLocked : null]}
              onPress={action.onPress}
            >
              {action.locked ? <Text style={styles.lockChip}>Locked</Text> : null}
              <View style={[styles.actionIconWrap, { backgroundColor: action.iconBg }]}>
                <Ionicons name={action.icon} size={18} color="#ffffff" />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
              <View style={styles.actionCtaRow}>
                <Text style={[styles.actionCtaText, action.locked ? styles.actionCtaTextMuted : null]}>{action.cta}</Text>
                <Ionicons
                  name={action.locked ? 'lock-closed' : 'arrow-forward'}
                  size={12}
                  color={action.locked ? '#94a3b8' : '#059669'}
                />
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Challenges</Text>
        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tabButton, activeTab === 'my' ? styles.tabButtonOn : null]}
            onPress={() => setActiveTab('my')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'my' ? styles.tabButtonTextOn : null]}>
              My Challenges
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'public' ? styles.tabButtonOn : null]}
            onPress={() => setActiveTab('public')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'public' ? styles.tabButtonTextOn : null]}>
              Public Challenges
            </Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={14} color="#94a3b8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by name or topic"
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.challengeList}>
          {filteredChallenges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No challenges found for this filter.</Text>
            </View>
          ) : (
            filteredChallenges.map((challenge) => {
              const badgeStyle =
                challenge.visibility === 'Private' ? styles.badgePrivate : styles.badgePublic;
              const ctaLabel = challenge.score === '--' ? 'Start Now' : 'View Analysis';
              const ctaAction: ActionName = challenge.score === '--' ? 'start' : 'analysis';

              return (
                <View key={challenge.id} style={styles.challengeCard}>
                  <View style={styles.challengeTopRow}>
                    <Text style={styles.challengeTitle}>{challenge.name}</Text>
                    <View style={[styles.badge, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeStyle === styles.badgePrivate ? styles.badgePrivateText : styles.badgePublicText]}>
                        {challenge.visibility}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.challengeMetaRow}>
                    <Text style={styles.challengeMetaText}>{challenge.questions} Qs</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.challengeMetaText}>{formatDurationText(challenge.durationMinutes)}</Text>
                    <View style={styles.metaDot} />
                    <Text style={styles.challengeMetaText}>Created {challenge.created}</Text>
                  </View>

                  <View style={styles.topicRow}>
                    {challenge.topics.map((topic) => (
                      <View key={`${challenge.id}-${topic}`} style={styles.topicChip}>
                        <Text style={styles.topicChipText}>{topic}</Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.challengeStatsRow}>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{challenge.score}</Text>
                      <Text style={styles.statPillLabel}>Score</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{challenge.accuracy}</Text>
                      <Text style={styles.statPillLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{challenge.time}</Text>
                      <Text style={styles.statPillLabel}>Time</Text>
                    </View>
                  </View>

                  <View style={styles.challengeActionRow}>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => runAction('share', { name: challenge.name, challenge })}
                    >
                      <Ionicons name="share-social" size={14} color="#64748b" />
                    </Pressable>
                    <Pressable
                      style={styles.iconButton}
                      onPress={() => runAction('leaderboard', { name: challenge.name, challenge })}
                    >
                      <Ionicons name="trophy" size={14} color="#64748b" />
                    </Pressable>
                    <Pressable
                      style={[styles.challengeActionButton, ctaAction === 'analysis' ? styles.challengeActionButtonAlt : null]}
                      onPress={() => runAction(ctaAction, { name: challenge.name, challenge })}
                    >
                      <Text style={[styles.challengeActionButtonText, ctaAction === 'analysis' ? styles.challengeActionButtonTextAlt : null]}>
                        {ctaLabel}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.sectionLabel}>Recent History</Text>
        <View style={styles.filterRow}>
          {(['all', 'public', 'private'] as HistoryFilter[]).map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, historyFilter === filter ? styles.filterChipOn : null]}
              onPress={() => setHistoryFilter(filter)}
            >
              <Text style={[styles.filterChipText, historyFilter === filter ? styles.filterChipTextOn : null]}>
                {filter.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.historyList}>
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No history available for this filter.</Text>
            </View>
          ) : (
            filteredHistory.map((history) => {
              const badgeStyle = history.visibility === 'Private' ? styles.badgePrivate : styles.badgePublic;
              return (
                <View key={history.id} style={styles.historyCard}>
                  <View style={styles.historyHeadRow}>
                    <View style={styles.historyIconWrap}>
                      <Ionicons name="flash" size={16} color="#059669" />
                    </View>
                    <View style={styles.historyInfoWrap}>
                      <Text style={styles.historyTitle}>{history.name}</Text>
                      <Text style={styles.historyMeta}>{history.mode} - {history.date}</Text>
                    </View>
                    <View style={[styles.badge, badgeStyle]}>
                      <Text style={[styles.badgeText, badgeStyle === styles.badgePrivate ? styles.badgePrivateText : styles.badgePublicText]}>
                        {history.visibility}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.historyLine}>
                    <Ionicons name="people" size={12} color="#94a3b8" />
                    <Text style={styles.historyLineText}>{history.participants} participants</Text>
                  </View>

                  <View style={styles.challengeStatsRow}>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{history.score}</Text>
                      <Text style={styles.statPillLabel}>Score</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{history.accuracy}</Text>
                      <Text style={styles.statPillLabel}>Accuracy</Text>
                    </View>
                    <View style={styles.statPill}>
                      <Text style={styles.statPillValue}>{history.time}</Text>
                      <Text style={styles.statPillLabel}>Time</Text>
                    </View>
                  </View>

                  <View style={styles.historyActions}>
                    <Pressable
                      style={styles.historyActionPrimary}
                      onPress={() => runAction('analysis', { name: history.name, history })}
                    >
                      <Text style={styles.historyActionPrimaryText}>Analysis</Text>
                    </Pressable>
                    <Pressable
                      style={styles.historyActionSecondary}
                      onPress={() => runAction('retake', { name: history.name, history })}
                    >
                      <Text style={styles.historyActionSecondaryText}>Retake</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          {
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
            bottom: 88 + Math.max(insets.bottom, 0),
          },
        ]}
      >
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>

      {isMenuMounted ? (
        <View style={styles.menuRoot} pointerEvents="box-none">
          <Animated.View style={[styles.menuOverlay, { opacity: menuOverlayOpacity }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => toggleMenu(false)} />
          </Animated.View>

          <Animated.View style={[styles.menuDrawer, { transform: [{ translateX: menuTranslateX }] }]}> 
            <View style={styles.menuHead}>
              <Pressable style={styles.menuCloseBtn} onPress={() => toggleMenu(false)}>
                <Ionicons name="close" size={14} color="#ffffff" />
              </Pressable>

              <View style={styles.menuAvatar}><Text style={styles.menuAvatarText}>{userInitials}</Text></View>
              <Text style={styles.menuName}>{displayName}</Text>
              <Text style={styles.menuSub}>{profileSubline}</Text>

              <View style={styles.menuHeadMeta}>
                <Pressable
                  style={styles.menuProfileBtn}
                  onPress={() => menuItemPress('Profile')}
                >
                  <Text style={styles.menuProfileBtnText}>View Profile</Text>
                  <Ionicons name="chevron-forward" size={11} color="#ffffff" />
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.menuBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSection}>Prepare</Text>
              <Pressable style={styles.menuLink} onPress={goHome}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#059669' }]}>
                  <Ionicons name="home" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Home</Text>
              </Pressable>

              <View style={[styles.menuLink, styles.menuLinkActive]}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#2563eb' }]}>
                  <Ionicons name="document-text" size={14} color="#ffffff" />
                </View>
                <Text style={[styles.menuLinkText, styles.menuLinkTextActive]}>Mocks</Text>
              </View>

              <Pressable style={styles.menuLink} onPress={() => menuItemPress('PYQs')}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#ec4899' }]}>
                  <Ionicons name="copy" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Previous Year Papers</Text>
              </Pressable>

              <Pressable style={styles.menuLink} onPress={() => menuItemPress('Contests')}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#eab308' }]}>
                  <Ionicons name="trophy" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Live Contests</Text>
                <View style={[styles.menuBadge, styles.menuBadgeLive]}>
                  <Text style={styles.menuBadgeLiveText}>LIVE</Text>
                </View>
              </Pressable>

              <View style={styles.menuDivider} />

              <Text style={styles.menuSection}>Tools</Text>
              <Pressable style={styles.menuLink} onPress={() => menuItemPress('Typing')}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#0891b2' }]}>
                  <Ionicons name="keypad" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Typing Test</Text>
              </Pressable>

              <Pressable style={styles.menuLink} onPress={() => showToast('Mistake notebook coming soon.')}> 
                <View style={[styles.menuIconWrap, { backgroundColor: '#dc2626' }]}>
                  <Ionicons name="book" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Mistake Notebook</Text>
                <View style={[styles.menuBadge, styles.menuBadgeCount]}>
                  <Text style={styles.menuBadgeCountText}>5</Text>
                </View>
              </Pressable>

              <Pressable style={styles.menuLink} onPress={() => menuItemPress('Mnemonics')}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#7c3aed' }]}>
                  <Ionicons name="bulb" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Mnemonics</Text>
                <View style={[styles.menuBadge, styles.menuBadgeNew]}>
                  <Text style={styles.menuBadgeNewText}>NEW</Text>
                </View>
              </Pressable>

              <View style={styles.menuDivider} />

              <Text style={styles.menuSection}>Community</Text>
              <Pressable style={styles.menuLink} onPress={() => menuItemPress('Forums')}>
                <View style={[styles.menuIconWrap, { backgroundColor: '#10b981' }]}>
                  <Ionicons name="people" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Forums</Text>
              </Pressable>

              <View style={styles.menuDivider} />

              <Text style={styles.menuSection}>Account</Text>
              <Pressable style={styles.menuLink} onPress={() => showToast('Settings page coming soon.')}> 
                <View style={[styles.menuIconWrap, { backgroundColor: '#64748b' }]}>
                  <Ionicons name="settings" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Settings</Text>
              </Pressable>

              <Pressable style={styles.menuLink} onPress={() => showToast('Sign out is disabled in preview.')}> 
                <View style={[styles.menuIconWrap, { backgroundColor: '#94a3b8' }]}>
                  <Ionicons name="log-out" size={14} color="#ffffff" />
                </View>
                <Text style={styles.menuLinkText}>Sign Out</Text>
              </Pressable>

              <Pressable style={styles.menuUpgrade} onPress={() => runAction('locked')}>
                <View style={styles.menuUpgradeIcon}>
                  <Ionicons name="key" size={14} color="#ffffff" />
                </View>
                <View style={styles.menuUpgradeContent}>
                  <Text style={styles.menuUpgradeTitle}>Unlock Selection Key</Text>
                  <Text style={styles.menuUpgradeSubtitle}>Unlimited mocks, PYQs and contests</Text>
                </View>
                <Ionicons name="chevron-forward" size={12} color="#d97706" />
              </Pressable>

              <Text style={styles.menuFoot}>© {currentYear} MySSCguide - All rights reserved</Text>
            </ScrollView>
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  page: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogo: {
    width: 44,
    height: 44,
    marginRight: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginLeft: -4,
  },
  brandTextAccent: {
    color: '#059669',
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#f43f5e',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
  hero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: '#0d9488',
    padding: 16,
    overflow: 'hidden',
  },
  heroBubbleLarge: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroBubbleSmall: {
    position: 'absolute',
    bottom: -35,
    left: -25,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroTagRow: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTag: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#ffffff',
    marginLeft: 6,
  },
  heroTitle: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.9)',
  },
  heroStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatCard: {
    width: '31%',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroStatLabel: {
    marginTop: 2,
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  heroActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroButton: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flex: 1,
    alignItems: 'center',
  },
  heroButtonLight: {
    backgroundColor: '#ffffff',
    marginRight: 8,
  },
  heroButtonGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'transparent',
  },
  heroButtonLightText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0d9488',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroButtonGhostText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLabel: {
    marginTop: 18,
    marginBottom: 10,
    paddingHorizontal: 16,
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionGrid: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    minHeight: 120,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  actionCardLocked: {
    opacity: 0.75,
  },
  lockChip: {
    position: 'absolute',
    top: 10,
    right: 10,
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    backgroundColor: '#f1f5f9',
    color: '#94a3b8',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSubtitle: {
    marginTop: 4,
    fontSize: 10,
    lineHeight: 14,
    color: '#94a3b8',
  },
  actionCtaRow: {
    marginTop: 'auto',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCtaText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginRight: 6,
  },
  actionCtaTextMuted: {
    color: '#94a3b8',
  },
  tabRow: {
    marginHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    flexDirection: 'row',
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  tabButtonOn: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabButtonTextOn: {
    color: '#059669',
  },
  searchRow: {
    marginHorizontal: 16,
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#1e293b',
    fontSize: 13,
    paddingVertical: 0,
  },
  challengeList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  challengeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  challengeTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeTitle: {
    flex: 1,
    marginRight: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  badgePrivate: {
    backgroundColor: '#f3e8ff',
    borderColor: '#e9d5ff',
  },
  badgePrivateText: {
    color: '#7c3aed',
  },
  badgePublic: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  badgePublicText: {
    color: '#059669',
  },
  challengeMetaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  challengeMetaText: {
    fontSize: 10,
    color: '#94a3b8',
    marginRight: 6,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginRight: 6,
  },
  topicRow: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 6,
    marginBottom: 6,
  },
  topicChipText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  challengeStatsRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statPill: {
    width: '31%',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 6,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  statPillLabel: {
    marginTop: 2,
    fontSize: 8,
    color: '#94a3b8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  challengeActionRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  challengeActionButton: {
    marginLeft: 'auto',
    borderRadius: 10,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  challengeActionButtonAlt: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  challengeActionButtonText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  challengeActionButtonTextAlt: {
    color: '#059669',
  },
  filterRow: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
  },
  filterChipOn: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  filterChipText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#64748b',
  },
  filterChipTextOn: {
    color: '#059669',
  },
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  historyHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyInfoWrap: {
    flex: 1,
    marginRight: 8,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyMeta: {
    marginTop: 2,
    fontSize: 10,
    color: '#94a3b8',
  },
  historyLine: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyLineText: {
    marginLeft: 6,
    fontSize: 10,
    color: '#94a3b8',
  },
  historyActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyActionPrimary: {
    borderRadius: 10,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  historyActionPrimaryText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  historyActionSecondary: {
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  historyActionSecondaryText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  emptyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  toast: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 25,
  },
  toastText: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.25,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  bottomNav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 6,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    zIndex: 12,
  },
  bottomNavItem: {
    minWidth: 64,
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 2,
    marginVertical: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  bottomNavText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  menuRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 40,
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 282,
    backgroundColor: '#f8fafc',
  },
  menuHead: {
    backgroundColor: '#0d9488',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 22,
    position: 'relative',
  },
  menuCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  menuAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  menuName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  menuSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 10,
  },
  menuHeadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  menuProfileBtn: {
    marginLeft: 'auto',
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 11,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuProfileBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    marginRight: 4,
  },
  menuBody: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  menuSection: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#94a3b8',
  },
  menuLink: {
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 1,
  },
  menuLinkActive: {
    backgroundColor: '#ecfdf5',
  },
  menuLinkText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  menuLinkTextActive: {
    color: '#059669',
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadge: {
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  menuBadgeLive: {
    backgroundColor: '#fef2f2',
  },
  menuBadgeLiveText: {
    color: '#f43f5e',
    fontSize: 8,
    fontWeight: '800',
  },
  menuBadgeCount: {
    backgroundColor: '#fef2f2',
  },
  menuBadgeCountText: {
    color: '#f43f5e',
    fontSize: 8,
    fontWeight: '800',
  },
  menuBadgeNew: {
    backgroundColor: '#f0fdf4',
  },
  menuBadgeNewText: {
    color: '#15803d',
    fontSize: 8,
    fontWeight: '800',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 10,
    marginVertical: 8,
  },
  menuUpgrade: {
    marginHorizontal: 0,
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuUpgradeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#d97706',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuUpgradeContent: {
    flex: 1,
    marginLeft: 10,
    marginRight: 8,
  },
  menuUpgradeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#92400e',
  },
  menuUpgradeSubtitle: {
    marginTop: 1,
    fontSize: 10,
    color: '#b45309',
  },
  menuFoot: {
    paddingTop: 12,
    paddingBottom: 20,
    textAlign: 'center',
    fontSize: 10,
    color: '#94a3b8',
  },
});

