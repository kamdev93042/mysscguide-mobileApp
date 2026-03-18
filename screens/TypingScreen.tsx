import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';

const GOAL_CARDS = [
  {
    title: 'Set Realistic Goals',
    desc: 'Aim for 2-3 WPM improvement weekly. Track progress via the dashboard.',
    icon: 'medal',
    color: '#f59e0b',
  },
  {
    title: 'Practice Different Topics',
    desc: 'Type on various topics like GK and Science to improve adaptability.',
    icon: 'flash',
    color: '#0d9488',
  },
  {
    title: 'Review Your Mistakes',
    desc: 'Analyze errors after tests to identify and fix recurring patterns.',
    icon: 'trending-up',
    color: '#db2777',
  },
];

const PASSAGES: Record<string, string> = {
  'History': 'The Delhi Sultanate, a series of five successive dynasties that ruled over large parts of the Indian subcontinent from 1206 to 1526, established a new Turko-Persian culture and left a lasting impact on Indian administration and architecture. The first of these was the Mamluk or Slave Dynasty, founded by Qutb-ud-din Aibak.',
  'Science': 'Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that, through cellular respiration, can later be released to fuel the organism\'s activities.',
  'General': 'Sustainable development is the organizing principle for meeting human development goals while simultaneously sustaining the ability of natural systems to provide the natural resources and ecosystem services on which the economy and society depend.',
};

const EXAM_TOPICS = [
  { id: 'History', title: 'History', sub: 'Modern India, Ancient & Medieval', icon: 'business' },
  { id: 'Science', title: 'Science', sub: 'Biology, Physics & Chemistry', icon: 'beaker' },
  { id: 'Vocabulary', title: 'Vocabulary', sub: 'High Frequency Words & Phrases', icon: 'book' },
  { id: 'Polity', title: 'Polity', sub: 'Constitution & Governance', icon: 'balance-scale' },
  { id: 'Geography', title: 'Geography', sub: 'Solar System, Physical Features', icon: 'globe' },
  { id: 'Economy', title: 'Economy', sub: 'Indian Economy & Budget', icon: 'stats-chart' },
  { id: 'PYQ', title: 'Previous Year Typing Question', sub: 'Practice with actual past exam questions', icon: 'time' },
];

const RECENT_SESSIONS = [
  {
    id: 1,
    title: 'Administration and Architecture of the Delh...',
    sub: 'Incomplete session on history topics.',
    score: 0,
    accuracy: '0.0%',
    time: '0m 0s',
    date: '3/15/2026',
    color: '#10b981', // emerald
  }
];

export default function TypingScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { userName } = useLoginModal();

  // Mode Management
  const [activeMode, setActiveMode] = useState<'LOBBY' | 'PRACTICE' | 'EXAM_INSTRUCTIONS' | 'EXAM_PRACTICE'>('LOBBY');
  const [analysisSession, setAnalysisSession] = useState<any>(null);
  const [currentTopic, setCurrentTopic] = useState('History');
  const [passage, setPassage] = useState(PASSAGES['History']);
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 1:00
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [fontSize, setFontSize] = useState(24);
  const [isStarted, setIsStarted] = useState(false);

  const inputRef = useRef<TextInput>(null);

  const bg = isDark ? '#020617' : '#f8fafc';
  const cardBg = isDark ? '#0f172a' : '#fff';
  const text = isDark ? '#fff' : '#1e293b';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const emerald = '#10b981'; // Brighter emerald for the hero
  const screenWidth = Dimensions.get('window').width;

  const displayName = userName || 'Ashutosh';

  // Timer Logic
  useEffect(() => {
    let interval: any;
    if (isStarted && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsStarted(false);
    }
    return () => clearInterval(interval);
  }, [isStarted, timeLeft]);

  // WPM & Accuracy Logic
  useEffect(() => {
    if (typedText.length === 0) {
      setWpm(0);
      setAccuracy(100);
      return;
    }

    const isExam = activeMode === 'EXAM_PRACTICE';

    // Split into words for CW/RW calculation
    const typedWords = typedText.trim().split(/\s+/);
    const passageWords = passage.trim().split(/\s+/);

    let cw = 0; // Correct words
    let rw = 0; // Wrong words

    typedWords.forEach((word, index) => {
      if (index < passageWords.length) {
        if (word === passageWords[index]) {
          cw++;
        } else {
          rw++;
        }
      }
    });

    const tw = cw + rw;
    const initialTime = isExam ? 900 : 60;
    const timeElapsed = (initialTime - timeLeft) / 60; // in minutes

    if (timeElapsed > 0) {
      // SSC Formula: WPM = CW / Time
      setWpm(Math.round(cw / timeElapsed));
    }

    if (tw > 0) {
      // SSC Formula: Accuracy = (CW / TW) * 100
      setAccuracy(Math.round((cw / tw) * 100));
    }
  }, [typedText, timeLeft, passage, activeMode]);

  const handleStartPractice = () => {
    setActiveMode('PRACTICE');
    resetPractice();
  };

  const handleStartExamMode = () => {
    setActiveMode('EXAM_INSTRUCTIONS');
    setCurrentTopic('History'); // Default to History
  };

  const handleStartRealExam = () => {
    setActiveMode('EXAM_PRACTICE');
    resetPractice();
    setTimeLeft(900); // 15:00 for SSC Exam
  };

  const resetPractice = () => {
    setTypedText('');
    setTimeLeft(60);
    setWpm(0);
    setAccuracy(100);
    setIsStarted(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextPassage = () => {
    resetPractice();
    // Logic for next passage can be added here
  };

  const renderAnalysisDetails = () => {
    if (!analysisSession) return null;
    const session = analysisSession;

    return (
      <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: '#020617' }]}>
        <View style={[styles.header, { borderBottomColor: '#1e293b' }]}>
          <Pressable onPress={() => setAnalysisSession(null)} style={styles.analysisBackBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={[styles.practiceTitle, { color: '#fff', fontSize: 16, fontWeight: '700' }]}>Typing Attempt Analysis</Text>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.analysisScrollContent}>
          {/* Attempt Meta Info */}
          <View style={{ marginBottom: 32 }}>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 4 }}>
              {session.title || 'Practice Session'} - {session.date || new Date().toLocaleString()}
            </Text>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 12 }}>Your Typing Summary</Text>
            <Text style={{ color: '#94a3b8', fontSize: 14, marginTop: 4 }}>
              Detailed performance breakdown for this attempt.
            </Text>
          </View>

          {/* Main Stat Cards Grid 1 */}
          <View style={styles.analysisMainGrid}>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="flash-outline" size={20} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.netWpm || 0}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>NET WPM</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="locate-outline" size={20} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.accuracy}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>ACCURACY</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="stats-chart-outline" size={20} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.grossWpm || 0}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>GROSS WPM</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="pulse-outline" size={20} color="#10b981" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.consistency || '0%'}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>CONSISTENCY</Text>
            </View>
          </View>

          {/* Stat Cards Grid 2 */}
          <View style={styles.analysisMainGrid}>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="bar-chart-outline" size={20} color="#fbbf24" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.time}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>TIME TAKEN</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="text-outline" size={20} color="#3b82f6" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.totalWords || 282}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>TOTAL WORDS</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="alert-circle-outline" size={20} color="#ef4444" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.mistakes || 0}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>MISTAKES</Text>
            </View>
            <View style={[styles.analysisMainCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
              <Ionicons name="pulse-outline" size={20} color="#8b5cf6" style={{ marginBottom: 12 }} />
              <Text style={[styles.analysisMainValue, { color: '#fff', fontSize: 24 }]}>{session.keystrokes || 0}</Text>
              <Text style={[styles.analysisMainLabel, { color: '#94a3b8' }]}>KEYSTROKES</Text>
            </View>
          </View>

          {/* Speed Progression Chart */}
          <View style={[styles.analysisChartCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
            <Text style={[styles.analysisChartTitle, { color: '#fff', opacity: 0.9 }]}>SPEED PROGRESSION (WPM)</Text>
            <View style={styles.chartContainer}>
              {session.performance ? (
                <View style={styles.sparkline}>
                  {session.performance.map((val: number, i: number) => (
                    <View 
                      key={i} 
                      style={[
                        styles.sparkBar, 
                        { height: (val / 100) * 100, backgroundColor: emerald }
                      ]} 
                    />
                  ))}
                </View>
              ) : (
                <Text style={{ color: '#64748b', fontSize: 13 }}>No speed data</Text>
              )}
            </View>
          </View>

          {/* Accuracy Breakdown */}
          <View style={[styles.analysisChartCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
            <Text style={[styles.analysisChartTitle, { color: '#fff', opacity: 0.9 }]}>ACCURACY BREAKDOWN</Text>
            <View style={styles.donutContainer}>
              <View style={[styles.donutInner, { borderColor: emerald }]}>
                <Text style={[styles.donutValue, { color: '#fff' }]}>{session.accuracy}</Text>
              </View>
              <View style={styles.donutLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.legendText, { color: '#94a3b8' }]}>Incorrect</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Detailed Review Section */}
          <View style={[styles.analysisChartCard, { backgroundColor: '#0f172a', borderColor: '#1e293b', marginBottom: 100 }]}>
            <Text style={[styles.analysisChartTitle, { color: '#fff', opacity: 0.9 }]}>DETAILED REVIEW</Text>
            <View style={styles.detailedReviewBox}>
              <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>
                Administration and Architecture of the Delhi Sultanate - history - medium - 282 words
              </Text>
              <Text style={styles.detailedReviewText}>
                <Text style={{ color: emerald }}>The Delhi Sultanate, a series of five successive dynasties that ruled over large parts of the Indian subcontinent from 1206 to 1526, established a new Turko-Persian culture and left a lasting impact on Indian administration and architecture. </Text>
                <Text style={{ color: emerald }}>The first of these was the Mamluk or Slave Dynasty, founded by Qutb-ud-din Aibak. However, it was his successor, Iltutmish, who is considered the real consolidator of the Sultanate. </Text>
                <Text style={{ color: emerald }}>He saved the nascent kingdom from internal rebellions and external threats, introduced a uniform currency with the silver 'Tanka' and copper 'Jital', and organized a group of forty loyal Turkish nobles known as the 'Turkan-i-Chihalgani' or 'Chalisa'. </Text>
                <Text style={{ color: emerald }}>After him, Ghiyasuddin Balban strengthened the monarchy's power by breaking the influence of the Chalisa and establishing a sophisticated espionage system. </Text>
                <Text style={{ color: emerald }}>He emphasized the theory of kingship, promoting courtly decorum and the practices of 'sijda' (prostration) and 'paibos' (kissing the monarch's feet). </Text>
                <Text style={{ color: emerald }}>The Khalji dynasty, particularly under Alauddin Khalji, marked a high point of the Sultanate's power. He is renowned for his extensive administrative and economic reforms. </Text>
                <Text style={{ color: emerald }}>To maintain a large standing army, he introduced market control policies, fixing the prices of essential commodities. He also implemented the 'dagh' (branding of horses) and 'chehra' (descriptive roll of soldiers) systems to prevent corruption. </Text>
                <Text style={{ color: emerald }}>The Tughlaq dynasty followed, with rulers like Muhammad bin Tughlaq, known for his ambitious but ill-fated experiments like the transfer of the capital from Delhi to Daulatabad and the introduction of token currency. </Text>
                <Text style={{ color: emerald }}>Firoz Shah Tughlaq, his successor, focused on public works, building canals, hospitals, and founding new towns. The architectural style developed during this period, known as Indo-Islamic architecture, combined Indian and Islamic features, as seen in structures like the Qutub Minar and the Alai Darwaza.</Text>
              </Text>
            </View>
          </View>
          {/* Accuracy Heatmap */}
          <View style={[styles.analysisChartCard, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}>
            <Text style={[styles.analysisChartTitle, { color: '#fff', opacity: 0.9 }]}>ACCURACY HEATMAP</Text>
            <View style={styles.heatmapWrapper}>
              <View style={styles.heatmapRow}>
                {['1','2','3','4','5','6','7','8','9','0','-','='].map(k => <View key={k} style={styles.heatmapKey}><Text style={styles.heatmapKeyText}>{k}</Text></View>)}
              </View>
              <View style={styles.heatmapRow}>
                {['Q','W','E','R','T','Y','U','I','O','P','[',']'].map(k => <View key={k} style={styles.heatmapKey}><Text style={styles.heatmapKeyText}>{k}</Text></View>)}
              </View>
              <View style={styles.heatmapRow}>
                {['A','S','D','F','G','H','J','K','L',':','\''].map(k => <View key={k} style={styles.heatmapKey}><Text style={styles.heatmapKeyText}>{k}</Text></View>)}
              </View>
              <View style={styles.heatmapRow}>
                {['Z','X','C','V','B','N','M',',','.','/'].map(k => <View key={k} style={styles.heatmapKey}><Text style={styles.heatmapKeyText}>{k}</Text></View>)}
              </View>
              <View style={styles.heatmapSpace}><Text style={styles.heatmapKeyText}>SPACE</Text></View>
            </View>
          </View>

          {/* Hand Load Distribution */}
          <View style={[styles.analysisChartCard, { backgroundColor: '#0f172a', borderColor: '#1e293b', marginBottom: 120 }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: '#1e293b', paddingBottom: 16, marginBottom: 24 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1, textAlign: 'center' }}>HAND LOAD DISTRIBUTION</Text>
            </View>
            <View style={styles.handLoadRow}>
              <View style={styles.handLoadItem}>
                <Text style={{ color: emerald, fontSize: 32, fontWeight: '800' }}>0.0%</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 1 }}>LEFT HAND</Text>
              </View>
              <View style={styles.handLoadItem}>
                <Text style={{ color: '#3b82f6', fontSize: 32, fontWeight: '800' }}>0.0%</Text>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 1 }}>RIGHT HAND</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.analysisFooter, { backgroundColor: '#0f172a', borderTopColor: '#1e293b' }]}>
          <Pressable style={styles.backBtnFull} onPress={() => setAnalysisSession(null)}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
            <Text style={styles.backBtnFullText}>Back to Typing Test</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (analysisSession) {
    return renderAnalysisDetails();
  }

  if (activeMode === 'PRACTICE' || activeMode === 'EXAM_PRACTICE') {
    const isExam = activeMode === 'EXAM_PRACTICE';
    return (
      <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={styles.practiceHeaderLeft}>
            <Pressable onPress={() => setActiveMode(isExam ? 'EXAM_INSTRUCTIONS' : 'LOBBY')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={muted} />
            </Pressable>
            <Text style={[styles.practiceTitle, { color: text }]}>{isExam ? 'SSC Exam Mode' : 'Practice Mode'}</Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>TIME</Text>
              <Text style={styles.statValueGreen}>{formatTime(timeLeft)}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>WPM</Text>
              <Text style={[styles.statValue, { color: text }]}>{wpm}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>ACC</Text>
              <Text style={[styles.statValue, { color: text }]}>{accuracy}%</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.practiceScrollContent}
        >
          {/* Controls - Hide some controls in exam mode and show key depression goal */}
          <View style={styles.controlsRow}>
            <View style={styles.topicSelector}>
              <Text style={[styles.topicLabel, { color: text }]}>TOPIC:</Text>
              <View style={[styles.topicDropdown, { borderColor: border, backgroundColor: cardBg }]}>
                <Text style={[styles.topicText, { color: text }]}>{currentTopic}</Text>
                <Ionicons name="chevron-down" size={16} color={muted} />
              </View>
              {!isExam && (
                <Pressable style={styles.nextBtn} onPress={handleNextPassage}>
                  <Text style={styles.nextBtnText}>Next passage</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.rightControls}>
              {isExam ? (
                <View style={styles.keyDepressionBox}>
                  <Text style={[styles.keyDepressionLabel, { color: muted }]}>KEY DEPRESSIONS:</Text>
                  <Text style={[styles.keyDepressionValue, { color: text }]}>{typedText.length} / 2000</Text>
                </View>
              ) : (
                <View style={[styles.fontControls, { borderColor: border, backgroundColor: cardBg }]}>
                  <Pressable onPress={() => setFontSize(Math.max(12, fontSize - 2))}>
                    <Ionicons name="remove" size={16} color={muted} />
                  </Pressable>
                  <Text style={[styles.fontSizeText, { color: muted }]}>{fontSize}px</Text>
                  <Pressable onPress={() => setFontSize(Math.min(48, fontSize + 2))}>
                    <Ionicons name="add" size={16} color={muted} />
                  </Pressable>
                </View>
              )}
              <Pressable style={styles.clockBtn}>
                <Ionicons name="time-outline" size={20} color={text} />
              </Pressable>
            </View>
          </View>

          {/* Typing Area */}
          <Pressable
            style={styles.typingContent}
            onPress={() => inputRef.current?.focus()}
          >
            <View style={styles.passageContainer}>
              <Text style={[styles.passageText, { fontSize, color: muted }]}>
                {passage.split('').map((char, index) => {
                  let color = muted;
                  if (index < typedText.length) {
                    color = typedText[index] === char ? (isDark ? '#fff' : '#000') : '#ef4444';
                  }
                  return (
                    <Text key={index} style={{ color }}>{char}</Text>
                  );
                })}
              </Text>

              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                value={typedText}
                onChangeText={(val) => {
                  if (!isStarted && val.length > 0) setIsStarted(true);
                  setTypedText(val);
                }}
                autoFocus
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  if (activeMode === 'EXAM_INSTRUCTIONS') {
    return (
      <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={styles.practiceHeaderLeft}>
            <Pressable onPress={() => setActiveMode('LOBBY')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={muted} />
            </Pressable>
            <Text style={[styles.practiceTitle, { color: text }]}>SSC Exam Mode</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.examScrollContent}>
          <Pressable style={styles.examHeaderRow} onPress={() => setActiveMode('LOBBY')}>
            <Ionicons name="arrow-back" size={20} color={text} />
            <Text style={[styles.examHeaderTitle, { color: text }]}>SSC CGL Online Typing Test</Text>
          </Pressable>

          <Text style={[styles.selectTopicLabel, { color: muted }]}>Select Topic</Text>

          <View style={styles.topicGrid}>
            {EXAM_TOPICS.map((topic) => (
              <Pressable
                key={topic.id}
                style={[
                  styles.examTopicCard,
                  { backgroundColor: cardBg, borderColor: currentTopic === topic.id ? '#059669' : border }
                ]}
                onPress={() => setCurrentTopic(topic.id)}
              >
                <View style={styles.topicItemLeft}>
                  <Text style={[styles.examTopicTitle, { color: text }]}>{topic.title}</Text>
                  <Text style={[styles.examTopicSub, { color: muted }]} numberOfLines={1}>{topic.sub}</Text>
                </View>
                <View style={[styles.topicIconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  <Ionicons name={topic.icon as any} size={18} color={currentTopic === topic.id ? '#059669' : muted} />
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.selectTopicBox}>
            <Text style={styles.selectTopicText}>Select a topic above</Text>
          </View>

          <View style={styles.instructionContainer}>
            <Text style={[styles.instructionTitle, { color: muted }]}>Formula to Calculate Speed Test:</Text>
            <View style={styles.formulaRow}>
              <Text style={[styles.formulaText, { color: muted }]}><Text style={{ fontWeight: '800' }}>CW</Text> = Total correct typed words</Text>
              <Text style={[styles.formulaText, { color: muted }]}><Text style={{ fontWeight: '800' }}>RW</Text> = Total Wrong typed words</Text>
              <Text style={[styles.formulaText, { color: muted }]}><Text style={{ fontWeight: '800' }}>TW</Text> = Total Typed Word ( CW + RW )</Text>
              <Text style={[styles.formulaText, { color: muted }]}><Text style={{ fontWeight: '800' }}>Typing Speed (WPM)</Text> = [CW] / Time</Text>
              <Text style={[styles.formulaText, { color: muted }]}><Text style={{ fontWeight: '800' }}>Accuracy</Text> = (CW / TW) x 100</Text>
            </View>

            <Text style={[styles.instructionTitle, { color: muted, marginTop: 32 }]}>Instruction for Proficiency Test/Skill Test:</Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              In the Combined Graduate Level Examination, posts of Assistant (CSS) and Tax Assistant for CBEC and CBDT are included. Skill Test in Data Entry (DEST) with speed of 8000 (eight thousand) key depressions per hour on computer for the post of Tax Assistant (Central Excise and Income Tax) is prescribed. For the post of Assistant (CSS), Computer Proficiency Test has been prescribed. DEST and CPT are of qualifying nature. While DEST will be administered using SSC-NIC software, Excel and PowerPoint modules of CPT will be administered in M.S. Office 2007. Word Processing Module of CPT will be administered using SSC-NIC software.
            </Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              The skill test will be administered for duration of 15 minutes on passages containing text of 2000 key depressions.
            </Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              The actual skill test will be preceded by a test passage for 5 minutes in order to enable the candidates to adjust to the system and key board provided by the Commission.
            </Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              The candidates are not required to re-enter the text on completion of the passage and, therefore, should utilize the spare time to correct mistakes, if any.
            </Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              Commission will decide at its discretion qualifying standard in entry of the text for different categories of candidates taking into consideration overall performance of the candidates in the skill test and available vacancies, subject to the standards not falling below limits fixed by the Commission.
            </Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              The skill test will be of qualifying nature.
            </Text>

            <Text style={[styles.instructionTitle, { color: muted, marginTop: 32 }]}>Getting Acquainted with the typing test for ssc cgl</Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              Typing test for ssc cgl evaluates a candidate's typing proficiency, assessing both speed and accuracy. It's imperative for aspirants to achieve the required typing speed while maintaining minimal errors. Our simulation offers a precise replica of this test, giving candidates an edge by familiarizing them with the format, time constraints, and difficulty level.
            </Text>
          </View>

        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>

      <View style={[styles.header, { borderBottomColor: border }]}>
        <View style={styles.logoRow}>
          <Image
            source={require('../assets/sscguidelogo.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: text }]}>
            My<Text style={{ color: '#059669' }}>SSC</Text>guide
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <Ionicons name="moon-outline" size={20} color={muted} style={{ marginRight: 15 }} />
          <Ionicons name="mail-outline" size={20} color={muted} style={{ marginRight: 15 }} />
          <Ionicons name="notifications-outline" size={20} color={muted} />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: text }]}>
            Welcome back, {displayName}! 🚀
          </Text>
          <Text style={[styles.welcomeSub, { color: muted }]}>
            Let's crush your goals today.
          </Text>
        </View>

        {/* Hero Section (From Screenshot 8) */}
        <View style={[styles.heroCard, { backgroundColor: '#059669' }]}>
          <View style={styles.heroContent}>
            <View style={styles.heroLeft}>
              <View style={styles.heroBadgeRow}>
                <View style={styles.heroBadge}>
                  <Ionicons name="trending-up" size={12} color="#fff" />
                  <Text style={styles.heroBadgeText}>Your progress</Text>
                </View>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>SSC mode</Text>
                  <Ionicons name="chevron-down" size={12} color="#fff" />
                </View>
              </View>

              <Text style={styles.heroTitle}>Your typing results.</Text>

              <View style={styles.heroStatsBadgesRow}>
                <View style={styles.miniStatBadge}>
                  <Text style={styles.miniStatLabel}>BEST WPM</Text>
                  <Text style={styles.miniStatValue}>0</Text>
                </View>
                <View style={styles.miniStatBadge}>
                  <Text style={styles.miniStatLabel}>ACCURACY</Text>
                  <Text style={styles.miniStatValue}>0%</Text>
                </View>
                <View style={styles.miniStatBadge}>
                  <Text style={styles.miniStatLabel}>TESTS</Text>
                  <Text style={styles.miniStatValue}>0</Text>
                </View>
              </View>

              <View style={styles.heroActionsRow}>
                <Pressable style={styles.heroBtnSolid} onPress={handleStartPractice}>
                  <Ionicons name="create-outline" size={18} color="#059669" />
                  <Text style={styles.heroBtnSolidText}>Start Practice Mode {'>'}</Text>
                </Pressable>
                <Pressable style={styles.heroBtnOutline} onPress={handleStartExamMode}>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={styles.heroBtnOutlineText}>Try SSC Exam Mode {'>'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Practice Analytics Header */}
        <View style={styles.analyticsHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bar-chart" size={20} color={'#059669'} style={styles.headerIcon} />
            <Text style={[styles.sectionTitle, { color: text }]}>Practice Performance Analytics</Text>
          </View>
          <Text style={[styles.subTitle, { color: muted }]}>
            Track your practice test progress and identify areas for improvement.
          </Text>
          <View style={styles.analyticsLayout}>
            {/* Stats Cards Column */}
            <View style={styles.statsColumn}>
              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#3b82f620' }]}>
                  <Ionicons name="flash" size={16} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>BEST SPEED</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>0 <Text style={styles.analysisUnit}>WPM</Text></Text>
                </View>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#8b5cf620' }]}>
                  <Ionicons name="disc-outline" size={16} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>AVG ACCURACY</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>0%</Text>
                </View>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#94a3b820' }]}>
                  <Ionicons name="time-outline" size={16} color={muted} />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>TESTS TAKEN</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>2</Text>
                </View>
              </View>
            </View>

            {/* Performance Graph Card */}
            <View style={[styles.graphCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.graphHeader}>
                <Text style={[styles.graphTitle, { color: text }]}>Recent Performance</Text>
                <Text style={styles.graphBadge}>Last 2 Tests</Text>
              </View>

              <View style={styles.graphArea}>
                {/* Stylized Graph Representation */}
                <View style={styles.yAxis}>
                  <Text style={styles.axisLabel}>10</Text>
                  <Text style={styles.axisLabel}>6</Text>
                  <Text style={styles.axisLabel}>3</Text>
                  <Text style={styles.axisLabel}>0</Text>
                </View>
                <View style={styles.chartArea}>
                  <View style={[styles.gridLine, { top: '0%' }]} />
                  <View style={[styles.gridLine, { top: '33%' }]} />
                  <View style={[styles.gridLine, { top: '66%' }]} />
                  <View style={[styles.gridLine, { bottom: 0 }]} />

                  {/* Line and Points */}
                  <View style={styles.linePlaceholder} />
                  <View style={[styles.chartPoint, { left: '10%', bottom: '10%' }]} />
                  <View style={[styles.chartPoint, { right: '10%', bottom: '15%' }]} />
                </View>
              </View>
              <View style={styles.xAxis}>
                <Text style={styles.axisLabel}>3/15/2026</Text>
                <Text style={styles.axisLabel}>3/15/2026</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SSC Performance Analytics (From SS 9) */}
        <View style={styles.analyticsHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="document-text" size={20} color={'#059669'} style={styles.headerIcon} />
            <Text style={[styles.sectionTitle, { color: text }]}>SSC Performance Analytics</Text>
          </View>
          <Text style={[styles.subTitle, { color: muted }]}>
            Your SSC exam-style test stats and recent performance.
          </Text>
          <View style={[styles.analyticsEmpty, { borderColor: border, backgroundColor: cardBg }]}>
            <View style={styles.statsCircle}>
              <Ionicons name="stats-chart" size={30} color={muted} style={{ opacity: 0.5 }} />
            </View>
            <Text style={[styles.analyticsEmptyTitle, { color: text }]}>No Analytics Yet</Text>
            <Text style={[styles.cardPlaceholder, { color: muted, marginTop: 8, paddingHorizontal: 20 }]}>
              Complete your first Knowledge Typing test to see your performance graph.
            </Text>
          </View>
        </View>

        {/* Tips to Excel in Typing Tests (From SS 11) */}
        <View style={styles.analyticsHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="bulb" size={20} color={'#059669'} style={styles.headerIcon} />
            <Text style={[styles.sectionTitle, { color: text }]}>Tips to Excel in Typing Tests</Text>
          </View>
          <Text style={[styles.subTitle, { color: muted }]}>
            Follow these proven strategies to improve your typing speed and accuracy.
          </Text>

          <View style={styles.tipsList}>
            <View style={[styles.tipCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.tipIconWrap, { backgroundColor: '#10b98120' }]}>
                <Ionicons name="disc-outline" size={20} color="#10b981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: text }]}>Focus on Accuracy First</Text>
                <Text style={[styles.tipDesc, { color: muted }]}>Priority accuracy over speed. Aim for 95%+ accuracy before trying to type faster.</Text>
              </View>
            </View>
            <View style={[styles.tipCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.tipIconWrap, { backgroundColor: '#3b82f620' }]}>
                <Ionicons name="time-outline" size={20} color="#3b82f6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: text }]}>Practice Daily</Text>
                <Text style={[styles.tipDesc, { color: muted }]}>Practice 15-20 mins daily. Regular practice builds muscle memory & speed.</Text>
              </View>
            </View>
            <View style={[styles.tipCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.tipIconWrap, { backgroundColor: '#8b5cf620' }]}>
                <Ionicons name="keypad-outline" size={20} color="#8b5cf6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.tipTitle, { color: text }]}>Use Proper Posture</Text>
                <Text style={[styles.tipDesc, { color: muted }]}>Keep wrists straight & fingers on home row keys for optimal performance.</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Goal Cards (From SS 11 - Following Posture Tip) */}
        <View style={styles.goalVerticalList}>
          {GOAL_CARDS.map((card, i) => (
            <View key={i} style={[styles.goalVerticalCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={[styles.goalIconWrap, { backgroundColor: card.color + '20' }]}>
                <Ionicons name={card.icon as any} size={20} color={card.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.goalTitle, { color: text }]}>{card.title}</Text>
                <Text style={[styles.goalDesc, { color: muted }]}>{card.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Section: Recent Practice Sessions */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="trending-up" size={20} color={'#059669'} style={styles.headerIcon} />
                <Text style={[styles.sectionTitle, { color: text }]}>Recent Practice Sessions</Text>
              </View>
              <Text style={[styles.subTitle, { color: muted }]}>
                Review your last attempts and see how you're performing.
              </Text>
            </View>
            <View style={styles.paginationRow}>
              <Pressable style={[styles.paginationBtn, { borderColor: border }]}>
                <Ionicons name="chevron-back" size={16} color={muted} />
              </Pressable>
              <View style={[styles.pageNumber, { backgroundColor: '#059669' }]}>
                <Text style={styles.pageNumberText}>1</Text>
              </View>
              <Pressable style={[styles.paginationBtn, { borderColor: border }]}>
                <Ionicons name="chevron-forward" size={16} color={muted} />
              </Pressable>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionsScrollContent}
        >
          {RECENT_SESSIONS.map((session) => (
            <View key={session.id} style={[styles.sessionCard, { backgroundColor: cardBg, borderColor: border }]}>
              <View style={styles.sessionHeaderRow}>
                <View style={[styles.sessionIconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  <Ionicons name={session.id % 2 === 0 ? 'document-text' : 'keypad'} size={18} color="#10b981" />
                </View>
                <Ionicons name="people-outline" size={14} color={muted} style={{ opacity: 0.5 }} />
              </View>

              <Text style={[styles.sessionTitle, { color: text }]} numberOfLines={1}>{session.title}</Text>
              <Text style={[styles.sessionSub, { color: muted }]}>{session.sub}</Text>

              <View style={[styles.sessionStatsGrid, { backgroundColor: isDark ? '#020617' : '#f8fafc' }]}>
                <View style={styles.sessionStatItem}>
                  <Text style={styles.sessionStatLabel}>SCORE</Text>
                  <Text style={[styles.sessionStatValue, { color: '#10b981' }]}>{session.score}</Text>
                </View>
                <View style={styles.sessionStatItem}>
                  <Text style={styles.sessionStatLabel}>ACCURACY</Text>
                  <Text style={[styles.sessionStatValue, { color: '#3b82f6' }]}>{session.accuracy}</Text>
                </View>
                <View style={styles.sessionStatItem}>
                  <Text style={styles.sessionStatLabel}>TIME</Text>
                  <Text style={[styles.sessionStatValue, { color: '#f59e0b' }]}>{session.time}</Text>
                </View>
              </View>

              <View style={styles.sessionCardFooter}>
                <Text style={[styles.sessionDate, { color: muted }]}>{session.date}</Text>
                <Pressable 
                  style={[styles.viewAnalysisBtn, { backgroundColor: session.color }]}
                  onPress={() => setAnalysisSession(session)}
                >
                  <Text style={styles.viewAnalysisText}>View Analysis</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={{ height: 32 }} />

        {/* Section: My Real Tests (SSC) */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="document-text" size={20} color={'#059669'} style={styles.headerIcon} />
              <Text style={[styles.sectionTitle, { color: text }]}>My Real Tests (SSC)</Text>
            </View>
            <Text style={[styles.subTitle, { color: muted }]}>
              Your SSC exam-style attempts. Topic-based tests with random passages.
            </Text>
          </View>
          <Pressable style={styles.topBtn} onPress={handleStartExamMode}>
            <Ionicons name="document-text" size={16} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.topBtnText}>Try SSC Exam Mode</Text>
          </Pressable>
        </View>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor: border, paddingVertical: 48 }]}>
          <Text style={[styles.cardPlaceholder, { color: muted, marginBottom: 20 }]}>
            No real tests yet. Take an SSC exam-style test by topic.
          </Text>
          <Pressable style={styles.mainBtn} onPress={handleStartExamMode}>
            <Text style={styles.mainBtnText}>Try SSC Exam Mode</Text>
          </Pressable>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 44, height: 44 },
  logoText: { fontSize: 18, fontWeight: '700', marginLeft: -4 },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  welcomeSection: { marginBottom: 24 },
  welcomeText: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  welcomeSub: { fontSize: 14 },
  heroCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
  },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1 },
  heroRight: { marginLeft: 10, marginTop: 10 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', marginLeft: 4, textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 20, lineHeight: 34 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  heroStatsBadgesRow: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  miniStatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    gap: 6,
  },
  miniStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800' },
  miniStatValue: { color: '#fbbf24', fontSize: 13, fontWeight: '900' },
  heroActionsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  heroBtnSolid: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  heroBtnSolidText: { color: '#059669', fontWeight: '800', fontSize: 14 },
  heroBtnOutline: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  heroBtnOutlineText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  analyticsHeader: { marginBottom: 32 },
  analyticsEmpty: {
    paddingVertical: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statsEmptyText: { fontSize: 14, fontWeight: '600', opacity: 0.6 },
  analyticsEmptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  tipsList: { marginTop: 16, gap: 12 },
  tipCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  tipDesc: { fontSize: 12, lineHeight: 18 },
  goalVerticalList: { gap: 12, marginBottom: 32 },
  goalVerticalCard: {
    flexDirection: 'row',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 16,
  },
  goalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  goalDesc: { fontSize: 14, lineHeight: 20 },
  sectionHeader: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  headerIcon: { marginRight: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  subTitle: { fontSize: 13, lineHeight: 18 },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  cardPlaceholder: { fontSize: 14, textAlign: 'center' },
  sectionHeaderRow: {
    flexDirection: 'column',
    marginBottom: 16,
    gap: 12,
  },
  topBtn: {
    flexDirection: 'row',
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    alignItems: 'center',
  },
  topBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  mainBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  mainBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Practice Mode Styles
  practiceHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 },
  practiceTitle: { fontSize: 18, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 20 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800' },
  statValueGreen: { fontSize: 14, fontWeight: '800', color: '#10b981' },
  practiceScrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  topicSelector: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topicLabel: { fontSize: 12, fontWeight: '800' },
  topicDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  topicText: { fontSize: 13, fontWeight: '700' },
  nextBtn: {
    backgroundColor: '#064e3b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  nextBtnText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  fontControls: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  fontSizeText: { fontSize: 12, fontWeight: '700' },
  clockBtn: { padding: 4 },
  typingContent: { flex: 1, minHeight: 400 },
  passageContainer: { position: 'relative' },
  passageText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 36,
    letterSpacing: 0.5,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0, // Keep it hidden but functional
    textAlignVertical: 'top',
  },
  examScrollContent: { padding: 24, paddingBottom: 60 },
  selectTopicBox: {
    backgroundColor: '#33415540',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  selectTopicText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  instructionContainer: { marginBottom: 40 },
  instructionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  formulaRow: { gap: 8 },
  formulaText: { fontSize: 14, lineHeight: 22 },
  instructionBody: { fontSize: 14, lineHeight: 22, color: '#94a3b8', marginTop: 16 },
  startExamBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  startExamBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  keyDepressionBox: { alignItems: 'flex-end' },
  keyDepressionLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
  keyDepressionValue: { fontSize: 13, fontWeight: '800' },
  examHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  examHeaderTitle: { fontSize: 18, fontWeight: '700' },
  selectTopicLabel: { fontSize: 14, fontWeight: '600', marginBottom: 20 },
  topicGrid: { flexDirection: 'column', gap: 12, marginBottom: 32 },
  examTopicCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 80,
  },
  topicItemLeft: { flex: 1, marginRight: 8 },
  examTopicTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  examTopicSub: { fontSize: 11, lineHeight: 14 },
  topicIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Analytics Styles
  analyticsLayout: { flexDirection: 'column', gap: 16, marginTop: 16 },
  statsColumn: { gap: 12 },
  analysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  analysisIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  analysisLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 2 },
  analysisValue: { fontSize: 16, fontWeight: '800' },
  analysisUnit: { fontSize: 10, fontWeight: '600', color: '#94a3b8' },

  graphCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  graphTitle: { fontSize: 14, fontWeight: '700' },
  graphBadge: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  graphArea: { flexDirection: 'row', height: 120, gap: 12 },
  yAxis: { justifyContent: 'space-between', paddingVertical: 4 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingLeft: 24 },
  axisLabel: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  chartArea: { flex: 1, position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(148, 163, 184, 0.1)' },
  linePlaceholder: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    bottom: '12%',
    height: 2,
    backgroundColor: '#10b981',
    opacity: 0.5
  },
  chartPoint: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Recent Sessions Styles
  paginationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  paginationBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  sessionsScrollContent: { gap: 16, paddingRight: 16 },
  sessionCard: {
    width: Dimensions.get('window').width - 32,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  sessionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  sessionSub: { fontSize: 12, lineHeight: 16 },
  sessionStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
  },
  sessionStatItem: { alignItems: 'center', flex: 1 },
  sessionStatLabel: { fontSize: 8, fontWeight: '800', color: '#94a3b8', marginBottom: 6 },
  sessionStatValue: { fontSize: 14, fontWeight: '800' },
  sessionCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { fontSize: 11, fontWeight: '600' },
  viewAnalysisBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewAnalysisText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  analysisBackBtn: { padding: 4, marginRight: 8 },
  analysisScrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 120 },
  analysisMainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  analysisMainCard: {
    width: '48.2%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'flex-start',
  },
  analysisMainLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  analysisMainValue: { fontSize: 24, fontWeight: '800' },
  analysisCardIcon: { marginBottom: 12 },
  
  analysisSecondaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  
  analysisChartCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  analysisChartTitle: { fontSize: 13, fontWeight: '800', marginBottom: 24, letterSpacing: 1 },
  chartContainer: { height: 120, justifyContent: 'center', alignItems: 'center' },
  chartEmptyText: { fontSize: 12, marginTop: 12, opacity: 0.6 },
  
  donutContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  donutInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 15,
    borderTopColor: '#ef4444', // Just for visual similarity
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutValue: { fontSize: 24, fontWeight: '800' },
  donutLegend: { marginTop: 24, flexDirection: 'row', justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 12, fontWeight: '600' },
  
  detailedReviewBox: {
    padding: 20,
    backgroundColor: '#00000030',
    borderRadius: 16,
  },
  detailedReviewText: { fontSize: 16, lineHeight: 28, letterSpacing: 0.5 },
  
  heatmapWrapper: { gap: 8, alignItems: 'center' },
  heatmapRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
  heatmapKey: {
    width: 24,
    height: 32,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapKeyText: { color: '#475569', fontSize: 9, fontWeight: '700' },
  heatmapSpace: {
    width: 120,
    height: 32,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  
  handLoadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  handLoadItem: { alignItems: 'center' },
  handLoadValue: { fontSize: 28, fontWeight: '800', marginBottom: 4 },
  handLoadLabel: { fontSize: 9, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  progressBar: {
    height: 6,
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    width: '100%',
    height: 60,
    paddingHorizontal: 10,
  },
  sparkBar: {
    width: '8%',
    borderRadius: 4,
  },
  
  analysisFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
  },
  backBtnFull: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  backBtnFullText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
