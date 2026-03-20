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
  TouchableOpacity,
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

const PASSAGES: Record<string, string[]> = {
  'History': [
    "The early phase of the Indian National Congress (INC), from its formation in 1885 to around 1905, was dominated by leaders who came to be known as the Moderates. Leaders like Dadabhai Naoroji, Pherozeshah Mehta, and Gopal Krishna Gokhale led this faction. They had immense faith in British justice and fair play and believed that India's political goals could be achieved through",
    "The Delhi Sultanate, a series of five successive dynasties that ruled over large parts of the Indian subcontinent from 1206 to 1526, established a new Turko-Persian culture and left a lasting impact on Indian administration and architecture. The first of these was the Mamluk or Slave Dynasty, founded by Qutb-ud-din Aibak.",
    "The Mughal Empire, at its peak, was one of the largest and most powerful empires in human history. Foundation laid by Babur in 1526, it reached its zenith under Akbar, who introduced the Din-i-Ilahi and refined the Mansabdari system. The empire saw significant architectural achievements, including the Taj Mahal during Shah Jahan's reign."
  ],
  'Science': [
    "Photosynthesis is a process used by plants and other organisms to convert light energy into chemical energy that, through cellular respiration, can later be released to fuel the organism's activities.",
    "Newton's Laws of Motion are three physical laws that, together, laid the foundation for classical mechanics. They describe the relationship between a body and the forces acting upon it, and its motion in response to those forces. The first law defines inertia, the second relates force to acceleration, and the third states every action has an opposite reaction.",
    "The cell is the basic structural, functional, and biological unit of all known organisms. Cells are the smallest units of life, and hence are often referred to as the 'building blocks of life'. The study of cells is called cell biology, cytology, or microbiology."
  ],
  'Vocabulary': [
    "Expanding your vocabulary is essential for effective communication and academic success. Learning root words, suffixes, and prefixes can help you decipher the meaning of unfamiliar words. Practicing synonyms and antonyms regularly ensures a deeper understanding of word nuances and prevents repetitive writing.",
    "Idioms and phrases add color and depth to the English language. Phrases like 'a blessing in disguise' or 'beat around the bush' carry meanings that aren't immediately obvious from the individual words. Mastering these expressions is key to achieving native-like fluency and scoring high in competitive language exams.",
    "Context clues are hints found within a sentence, paragraph, or passage that a reader can use to understand the meanings of new or unfamiliar words. Recognizing these clues—such as definitions, examples, or contrasts—is a vital skill for improving reading comprehension and overall verbal proficiency."
  ],
  'Polity': [
    "The Preamble to the Constitution of India is a brief introductory statement that sets out the guiding purpose, principles, and philosophy of the document. It declares India to be a Sovereign, Socialist, Secular, Democratic Republic and secures justice, liberty, equality, and fraternity for all its citizens.",
    "The Indian Parliamentary system is based on the Westminster model. It consists of two houses: the Lok Sabha (House of the People) and the Rajya Sabha (Council of States). The President is the titular head, while the Prime Minister and the Council of Ministers exercise real executive power, being collectively responsible to the Lok Sabha.",
    "Fundamental Rights in India are the basic human rights of all citizens, guaranteed by the Constitution under Part III. These rights—such as the Right to Equality and Right to Freedom—are enforceable by the courts and act as a check on the powers of the state, ensuring the dignity and liberty of every individual."
  ],
  'Geography': [
    "The Solar System consists of an average star we call the Sun, and the planets Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, and Neptune. It also includes the satellites of the planets; numerous comets, asteroids, and meteoroids; and the interplanetary medium. The planets are divided into terrestrial and gas giants.",
    "India is a land of great physical diversity. From the towering Himalayas in the north to the vast coastal plains in the south, the country features diverse landscapes like the Indo-Gangetic Plains, the Thar Desert, and the Deccan Plateau. These physical features significantly influence the climate, culture, and economy of different regions.",
    "Climate change refers to significant changes in global temperature, precipitation, wind patterns, and other measures of climate that occur over several decades or longer. The increasing concentration of greenhouse gases in the atmosphere, primarily due to human activities, is driving global warming and affecting ecosystems worldwide."
  ],
  'Economy': [
    "The Gross Domestic Product (GDP) is the total monetary or market value of all the finished goods and services produced within a country's borders in a specific time period. It serves as a comprehensive scorecard of a given country's economic health and is used by analysts to compare the productivity of different nations.",
    "The NITI Aayog is a policy think tank of the Government of India, established with the aim to achieve sustainable development goals with cooperative federalism. It replaced the Planning Commission and focuses on providing strategic and technical advice to the central and state governments on key economic and social policy issues.",
    "Inflation is the rate at which the general level of prices for goods and services is rising and, consequently, the purchasing power of currency is falling. Central banks attempt to limit inflation, and avoid deflation, in order to keep the economy running smoothly while managing interest rates and money supply."
  ],
  'PYQ': [
    "Previous Year Questions (PYQs) are an invaluable resource for candidates preparing for competitive exams. They provide insights into the recurring patterns, difficulty levels, and the specific topics emphasized by the examiners. Practicing with actual past passages helps build confidence and improves time management skills for the primary test.",
    "The Data Entry Speed Test (DEST) for SSC CGL typically involves typing a passage of about 2000 key depressions. Success requires not only speed but also extreme precision, as penalties are levied for both full and half mistakes. Regular practice with previous year scripts is the best way to familiarize oneself with the expected format.",
    "SSC Typing Tests emphasize accuracy over mere speed. Candidates must focus on minimizing errors like omissions, substitutions, and spelling mistakes. Using the spare time after completing a passage to review and correct mistakes is a strategy used by top scorers to ensure they meet the qualifying standards fixed by the Commission."
  ],
  'General': [
    "Sustainable development is the organizing principle for meeting human development goals while simultaneously sustaining the ability of natural systems to provide the natural resources and ecosystem services on which the economy and society depend.",
    "Digital India is a flagship program of the Government of India with a vision to transform India into a digitally empowered society and knowledge economy. It focuses on providing digital infrastructure as a utility to every citizen, governance and services on demand, and digital empowerment of all citizens.",
    "The Importance of Education cannot be overstated. It is a powerful tool for personal growth, social development, and economic prosperity. Education empowers individuals to think critically, solve problems, and contribute meaningfully to society, while fostering values of equality, tolerance, and global citizenship."
  ],
  'Environment': [
    "Environmental pollution is one of the most pressing problems facing the modern world. Air, water, and soil pollution caused by industrial activities, vehicular emissions, and improper waste disposal have serious consequences for human health and biodiversity. Sustainable practices and stringent regulations are essential to reverse this damage.",
    "Biodiversity refers to the variety of life on Earth at all its levels, from genes to ecosystems. It encompasses the evolutionary, ecological, and cultural processes that sustain life. The rapid loss of biodiversity due to habitat destruction, pollution, climate change, and overexploitation poses a critical threat to global ecosystems.",
    "The Paris Agreement is a landmark international accord adopted in 2015 to address climate change by limiting global warming to well below 2 degrees Celsius above pre-industrial levels. It requires all signatory nations to set nationally determined contributions and regularly report on their progress toward reducing emissions."
  ],
  'Current Affairs': [
    "Current affairs encompass the most recent and significant events happening around the world in politics, economics, science, sports, and culture. For competitive exam aspirants, staying updated with current affairs is crucial, as questions on recent events are a staple in papers like SSC CGL, CHSL, and various state-level examinations.",
    "The Union Budget of India is an annual financial statement presented by the Finance Minister in Parliament. It outlines the government's revenue and expenditure for the coming financial year and sets the economic agenda. Key highlights include allocations for defense, education, infrastructure, and social welfare schemes.",
    "India's space program, led by the Indian Space Research Organisation (ISRO), has achieved remarkable milestones in recent years. From the Chandrayaan missions to study the Moon to the Mangalyaan Mars orbiter, ISRO has established India as a major spacefaring nation, delivering complex missions at a fraction of the cost of its global counterparts."
  ],
  'Mathematics': [
    "Mathematics is the universal language of science and engineering. Its branches, including algebra, geometry, calculus, and statistics, form the backbone of modern computation, finance, and technology. Proficiency in mathematics is a key differentiator in competitive examinations and professional success in quantitative fields.",
    "Number theory is a branch of pure mathematics devoted primarily to the study of the integers and integer-valued functions. German mathematician Carl Friedrich Gauss said that mathematics is the queen of the sciences and number theory is the queen of mathematics. It has deep connections to cryptography and computer science.",
    "Statistics is the discipline that concerns the collection, organization, analysis, interpretation, and presentation of data. It is applicable to a wide variety of academic disciplines, from natural and social sciences to engineering and requires understanding of both descriptive and inferential statistical methods."
  ],
  'Computer': [
    "A computer is an electronic device that manipulates information or data. It has the ability to store, retrieve, and process data. Computers are used in various fields including education, research, business, healthcare, and entertainment. The development from vacuum tubes to microprocessors marked a revolution in computing technology.",
    "The Internet is a global network of interconnected computers that communicate using standardized protocols. It has transformed modern civilization by enabling instant communication, e-commerce, information sharing, and social networking on an unprecedented scale. Cloud computing further extends this by offering on-demand access to computing resources.",
    "Artificial Intelligence is the simulation of human intelligence processes by machines, especially computer systems. Specific applications include expert systems, natural language processing, speech recognition, and machine vision. AI is rapidly transforming industries from healthcare and finance to transportation and manufacturing."
  ],
};

const EXAM_TOPICS = [
  { id: 'History', title: 'History', sub: 'Modern India, Ancient & Medieval', icon: 'business' },
  { id: 'Science', title: 'Science', sub: 'Biology, Physics & Chemistry', icon: 'beaker' },
  { id: 'Vocabulary', title: 'Vocabulary', sub: 'High Frequency Words & Phrases', icon: 'book' },
  { id: 'Polity', title: 'Polity', sub: 'Constitution & Governance', icon: 'balance-scale' },
  { id: 'Geography', title: 'Geography', sub: 'Solar System, Physical Features', icon: 'globe' },
  { id: 'Economy', title: 'Economy', sub: 'Indian Economy & Budget', icon: 'stats-chart' },
  { id: 'Environment', title: 'Environment', sub: 'Ecology, Pollution & Climate Change', icon: 'leaf' },
  { id: 'Current Affairs', title: 'Current Affairs', sub: 'Latest news & events for SSC', icon: 'newspaper' },
  { id: 'Mathematics', title: 'Mathematics', sub: 'Quantitative Aptitude & Number Theory', icon: 'calculator' },
  { id: 'Computer', title: 'Computer', sub: 'IT Fundamentals & Digital Literacy', icon: 'desktop' },
  { id: 'General', title: 'General', sub: 'Mixed topics & General Awareness', icon: 'globe-outline' },
  { id: 'PYQ', title: 'Previous Year Typing Question', sub: 'Practice with actual past exam questions', icon: 'time' },
];

// Practice mode topic selector - matches website topics
const PRACTICE_TOPICS = [
  { id: 'History', label: 'History' },
  { id: 'Geography', label: 'Geography' },
  { id: 'Polity', label: 'Polity' },
  { id: 'Science', label: 'Science' },
  { id: 'Economy', label: 'Economy' },
  { id: 'Environment', label: 'Environment' },
  { id: 'General', label: 'General' },
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
  const [activeMode, setActiveMode] = useState<'LOBBY' | 'PRACTICE' | 'EXAM_TOPICS' | 'EXAM_INSTRUCTIONS' | 'EXAM_PRACTICE'>('LOBBY');
  const [isReadyDecl, setIsReadyDecl] = useState(false);
  const [analysisSession, setAnalysisSession] = useState<any>(null);
  const [currentTopic, setCurrentTopic] = useState('History');
  const getRandomPassage = (topic: string) => {
    const list = PASSAGES[topic] || PASSAGES['General'];
    return list[Math.floor(Math.random() * list.length)];
  };
  const [passage, setPassage] = useState(getRandomPassage('History'));
  const [typedText, setTypedText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 1:00
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [fontSize, setFontSize] = useState(24);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitConfirmVisible, setIsSubmitConfirmVisible] = useState(false);
  const [backspacesCount, setBackspacesCount] = useState(0);
  const [wpmTrend, setWpmTrend] = useState<{time: number, wpm: number}[]>([]);
  const [showTopicDropdown, setShowTopicDropdown] = useState(false);

  // Keyboard heatmap sizing
  const [keyboardWidth, setKeyboardWidth] = useState(Dimensions.get('window').width - 56);
  const KEY_GAP = 3; // gap between keys
  // Rows: number row = 13, QWERTY = 10, ASDF = 9, ZXCV = 7
  const MAX_KEYS_IN_ROW = 13;
  const keySize = Math.max(18, Math.floor((keyboardWidth - KEY_GAP * (MAX_KEYS_IN_ROW - 1)) / MAX_KEYS_IN_ROW));
  const keyFontSize = Math.max(8, Math.floor(keySize * 0.42));

  const inputRef = useRef<TextInput>(null);

  const bg = '#020617';
  const cardBg = '#0f172a';
  const text = '#fff';
  const muted = '#94a3b8';
  const border = '#1e293b';
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
    
    // Track WPM Trend every 2 seconds
    const initialTime = activeMode === 'EXAM_PRACTICE' ? 900 : 60;
    if (isStarted && (initialTime - timeLeft) % 2 === 0 && timeLeft < initialTime) {
      const timeElapsedMin = (initialTime - timeLeft) / 60;
      const currentGrossWpm = Math.round((typedText.length / 5) / (timeElapsedMin || 1));
      
      // Only add if we don't already have this second recorded
      setWpmTrend((prev) => {
        const timeAt = initialTime - timeLeft;
        if (prev.length > 0 && prev[prev.length - 1].time === timeAt) return prev;
        return [...prev, { time: timeAt, wpm: currentGrossWpm }];
      });
    }

    return () => clearInterval(interval);
  }, [isStarted, timeLeft, typedText.length, activeMode]);

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
    setActiveMode('EXAM_TOPICS');
    setCurrentTopic('History'); // Default to History
  };

  const handleTopicSelect = (topicId: string) => {
    setCurrentTopic(topicId);
    setPassage(getRandomPassage(topicId));
    setActiveMode('EXAM_INSTRUCTIONS');
    setIsReadyDecl(false);
  };

  const handleStartRealExam = () => {
    if (!isReadyDecl) return;
    setActiveMode('EXAM_PRACTICE');
    resetPractice();
    setTimeLeft(900); // 15:00 as per screenshot duration logic
  };

  const handleSubmitTest = () => {
    setIsStarted(false);
    
    // Calculate final stats for the summary
    const typedWords = typedText.trim().split(/\s+/);
    const passageWords = passage.trim().split(/\s+/);
    let cw = 0;
    let rw = 0;

    typedWords.forEach((word, index) => {
      if (index < passageWords.length) {
        if (word === passageWords[index]) cw++;
        else rw++;
      }
    });

    const initialTime = activeMode === 'EXAM_PRACTICE' ? 900 : 60;
    const timeElapsedSec = initialTime - timeLeft;
    const timeElapsedMin = timeElapsedSec / 60;
    
    // Calculate WPMS
    const grossWpm = Math.round((typedText.length / 5) / (timeElapsedMin || 1));
    const netWpm = Math.round(cw / (timeElapsedMin || 1));
    
    const wpmValues = wpmTrend.map(t => t.wpm);
    const maxWpm = wpmValues.length > 0 ? Math.max(...wpmValues) : grossWpm;
    const minWpm = wpmValues.length > 0 ? Math.min(...wpmValues) : 0;
    const avgWpm = wpmValues.length > 0 ? Math.round(wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length) : grossWpm;

    const fullMistakes = rw;
    const halfMistakes = Math.floor(rw * 0.1); // may represent half penalties
    const totalMistakes = fullMistakes + halfMistakes;
    const allowedMistakes = Math.floor(totalMistakes * 0.1); // small allowance
    const finalPenalty = Math.max(totalMistakes - allowedMistakes, 0);

    const kspc = (typedText.length / (passage.length || 1)).toFixed(2);

    // Hand load + key errors
    const keyToHand: Record<string, 'left' | 'right' | 'thumb' | 'unknown'> = {
      q: 'left', w: 'left', e: 'left', r: 'left', t: 'left',
      a: 'left', s: 'left', d: 'left', f: 'left', g: 'left',
      z: 'left', x: 'left', c: 'left', v: 'left', b: 'left',
      y: 'right', u: 'right', i: 'right', o: 'right', p: 'right',
      h: 'right', j: 'right', k: 'right', l: 'right',
      n: 'right', m: 'right',
      ' ': 'thumb',
    };

    const fingerMap: Record<string, string> = {
      q: 'leftPinky', a: 'leftPinky', z: 'leftPinky',
      w: 'leftRing', s: 'leftRing', x: 'leftRing',
      e: 'leftMiddle', d: 'leftMiddle', c: 'leftMiddle',
      r: 'leftIndex', f: 'leftIndex', v: 'leftIndex', t: 'leftIndex', g: 'leftIndex', b: 'leftIndex',
      y: 'rightIndex', h: 'rightIndex', n: 'rightIndex',
      u: 'rightMiddle', j: 'rightMiddle', m: 'rightMiddle',
      i: 'rightRing', k: 'rightRing',
      o: 'rightPinky', l: 'rightPinky', p: 'rightPinky',
    };

    const handCounts = { left: 0, right: 0, thumb: 0, unknown: 0 };
    const fingerCounts: Record<string, number> = {
      leftPinky: 0,
      leftRing: 0,
      leftMiddle: 0,
      leftIndex: 0,
      rightIndex: 0,
      rightMiddle: 0,
      rightRing: 0,
      rightPinky: 0,
      thumb: 0,
    };

    const keyStats: Record<string, { correct: number; incorrect: number }> = {};
    const errorKeys: Record<string, number> = {};
    const typedChars = typedText.toLowerCase().split('');
    const passageChars = passage.toLowerCase().split('');

    typedChars.forEach((char, idx) => {
      const hand = keyToHand[char] ?? 'unknown';
      handCounts[hand] = (handCounts[hand] ?? 0) + 1;

      const finger = fingerMap[char] ?? 'thumb';
      fingerCounts[finger] = (fingerCounts[finger] ?? 0) + 1;

      const key = char.toUpperCase();
      if (!keyStats[key]) {
        keyStats[key] = { correct: 0, incorrect: 0 };
      }

      if (idx < passageChars.length && char === passageChars[idx]) {
        keyStats[key].correct += 1;
      } else {
        keyStats[key].incorrect += 1;
        errorKeys[char] = (errorKeys[char] || 0) + 1;
      }
    });

    const totalHandKeys = handCounts.left + handCounts.right;
    const leftHandPct = totalHandKeys > 0 ? Math.round((handCounts.left / totalHandKeys) * 1000) / 10 : 0;
    const rightHandPct = totalHandKeys > 0 ? Math.round((handCounts.right / totalHandKeys) * 1000) / 10 : 0;

    const failedKeys = Object.entries(errorKeys)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k.toUpperCase());

    const totalTypedKeys = typedChars.length;
    const fingerPerf = Object.entries(fingerCounts)
      .map(([finger, count]) => ({
        finger,
        percent: totalTypedKeys > 0 ? Math.round((count / totalTypedKeys) * 1000) / 10 : 0,
        avgMs: 0,
      }))
      .sort((a, b) => b.percent - a.percent);

    const reviewDiff = passageWords.map((word, idx) => {
      const typedWord = typedWords[idx] ?? '';
      return {
        expected: word,
        typed: typedWord,
        correct: word === typedWord,
      };
    });

    const finalSession = {
      id: Date.now(),
      title: activeMode === 'EXAM_PRACTICE' ? `SSC Exam - ${currentTopic}` : `Practice - ${currentTopic}`,
      sub: activeMode === 'EXAM_PRACTICE' ? `Completed SSC mock test on ${currentTopic}.` : `Completed practice session on ${currentTopic}.`,
      score: netWpm * 10,
      accuracy: `${Math.round((cw / (cw + rw || 1)) * 100)}%`,
      consistency: `${Math.round((1 - (Math.abs(wpm - avgWpm) / (avgWpm || 1))) * 100)}%`,
      timeTaken: formatTime(timeElapsedSec),
      totalWords: passageWords.length,
      mistakes: totalMistakes,
      fullMistakes,
      halfMistakes,
      allowedMistakes,
      finalPenalty,
      keystrokes: typedText.length,
      backspaces: backspacesCount,
      date: new Date().toLocaleDateString(),
      netWpm,
      grossWpm,
      maxWpm,
      minWpm,
      avgWpm,
      wastedTime: timeElapsedSec - Math.floor(typedText.length / 5),
      kspc,
      trendData: wpmTrend,
      performance: wpmValues,
      cw,
      rw,
      tw: cw + rw,
      handLoad: {
        left: leftHandPct,
        right: rightHandPct,
      },
      failedKeys,
      keyStats,
      fingerPerf,
      reviewDiff,
    };

    setAnalysisSession(finalSession);
    setIsSubmitConfirmVisible(false);
  };


  const resetPractice = () => {
    setTypedText('');
    setTimeLeft(60);
    setWpm(0);
    setAccuracy(100);
    setIsStarted(false);
    setBackspacesCount(0);
    setWpmTrend([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextPassage = () => {
    const newPassage = getRandomPassage(currentTopic);
    setPassage(newPassage);
    resetPractice();
  };

  // Change topic and load its passage atomically
  const handleTopicChange = (topicId: string) => {
    const newPassage = getRandomPassage(topicId);
    setCurrentTopic(topicId);
    setPassage(newPassage);
    setTypedText('');
    setTimeLeft(60);
    setWpm(0);
    setAccuracy(100);
    setIsStarted(false);
    setBackspacesCount(0);
    setWpmTrend([]);
    setShowTopicDropdown(false);
  };

  const renderAnalysisDetails = () => {
    if (!analysisSession) return null;
    const session = analysisSession;
    const keyStats: Record<string, { correct: number; incorrect: number }> = session.keyStats || {};
    const keyColor = (k: string) => {
      const stats = keyStats[k.toUpperCase()];
      if (stats?.incorrect > 0) return '#ef4444';
      if (stats?.correct > 0) return '#10b981';
      return 'rgba(255,255,255,0.3)';
    };

    // Standard QWERTY layout matching reference site (no overflow punctuation)
    const keyboardRows = [
      ['1','2','3','4','5','6','7','8','9','0','-','=','⌫'],
      ['Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
      ['A','S','D','F','G','H','J','K','L',";","'"],
      ['Z','X','C','V','B','N','M',',','.','/'],
    ];
    // Key sizes per row to fill full width evenly
    const rowKeyCounts = [13, 13, 11, 10];
    const getKeySize = (rowIdx: number) => {
      const count = rowKeyCounts[rowIdx] ?? MAX_KEYS_IN_ROW;
      return Math.max(18, Math.floor((keyboardWidth - KEY_GAP * (count - 1)) / count));
    };
    const getKeyFont = (rowIdx: number) => Math.max(7, Math.floor(getKeySize(rowIdx) * 0.42));

    return (
      <View style={[styles.analysisContainer, { backgroundColor: '#020617' }]}>
        <View style={styles.analysisHeader}>
          <TouchableOpacity 
            style={styles.analysisBackBtn} 
            onPress={() => {
              setAnalysisSession(null);
              setActiveMode('LOBBY');
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.analysisHeaderTitle}>SSC Typing Test Analysis</Text>
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{session.title} • {session.date}</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.analysisScrollContent}>
          {/* Header Info */}
          <View style={{ marginBottom: 32 }}>
            <Text style={styles.summaryTitle}>Your Typing Summary</Text>
            <Text style={styles.summarySubtitle}>Detailed performance breakdown for this attempt.</Text>
          </View>

          {/* 1. Stats Grid (2x4) */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flash" size={20} color="#10b981" />
              <Text style={styles.statValue}>{session.netWpm}</Text>
              <Text style={styles.statLabel}>NET WPM</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="compass" size={20} color="#10b981" />
              <Text style={styles.statValue}>{session.accuracy}</Text>
              <Text style={styles.statLabel}>ACCURACY</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="speedometer" size={20} color="#10b981" />
              <Text style={styles.statValue}>{session.grossWpm}</Text>
              <Text style={styles.statLabel}>GROSS WPM</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="trending-up" size={20} color="#a855f7" />
              <Text style={styles.statValue}>{session.consistency}</Text>
              <Text style={styles.statLabel}>CONSISTENCY</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="time" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>{session.timeTaken}</Text>
              <Text style={styles.statLabel}>TIME TAKEN</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="document-text" size={20} color="#3b82f6" />
              <Text style={styles.statValue}>{session.totalWords}</Text>
              <Text style={styles.statLabel}>TOTAL WORDS</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.statValue}>{session.mistakes}</Text>
              <Text style={styles.statLabel}>MISTAKES</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="pulse" size={20} color="#6366f1" />
              <Text style={styles.statValue}>{session.keystrokes}</Text>
              <Text style={styles.statLabel}>KEYSTROKES</Text>
            </View>
          </View>

          {/* 2. Speed Progression (Line Chart) */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>SPEED PROGRESSION (WPM)</Text>
            <View style={styles.chartContainerFull}>
              {/* Y Axis */}
              <View style={styles.chartYAxis}>
                {[100, 75, 50, 25, 0].map(v => <Text key={v} style={styles.axisText}>{v}</Text>)}
              </View>
              <View style={styles.chartArea}>
                {[0, 1, 2, 3, 4].map(i => <View key={i} style={[styles.gridLine, { top: `${i * 25}%` }]} />)}
                {session.trendData && session.trendData.map((pt, i) => (
                  <View key={i} style={[styles.chartDot, { 
                    left: `${(i / Math.max(1, session.trendData.length - 1)) * 100}%`, 
                    bottom: `${(pt.wpm / 100) * 100}%`,
                    backgroundColor: '#10b981'
                  }]} />
                ))}
              </View>
            </View>
            <View style={styles.chartXLabels}>
              {session.trendData && session.trendData.map((pt, i) => (
                i % 5 === 0 ? <Text key={i} style={styles.axisText}>{pt.time}s</Text> : null
              ))}
            </View>
          </View>

          {/* 3. Accuracy Breakdown */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>ACCURACY BREAKDOWN</Text>
            <View style={styles.donutBox}>
              {(() => {
                const correctCount = session.cw ?? 0;
                const incorrectCount = session.rw ?? 0;
                const totalCount = correctCount + incorrectCount;
                const correctPercent = totalCount > 0 ? correctCount / totalCount : 0;
                const correctAngle = correctPercent * 360;
                const firstSliceAngle = Math.min(correctAngle, 180);
                const secondSliceAngle = Math.max(correctAngle - 180, 0);

                return (
                  <View style={styles.donutSegments}>
                    {/* Base ring (incorrect portion) */}
                    <View style={[styles.donutBase, { backgroundColor: '#ef4444' }]} />

                    {/* Correct portion (first half) */}
                    <View style={[styles.donutHalf, styles.donutHalfRight]}>
                      <View
                        style={[
                          styles.donutPie,
                          { backgroundColor: '#10b981', transform: [{ rotate: `${firstSliceAngle}deg` }] },
                        ]}
                      />
                    </View>

                    {/* Correct portion (second half, only if > 50%) */}
                    {secondSliceAngle > 0 && (
                      <View style={[styles.donutHalf, styles.donutHalfLeft]}>
                        <View
                          style={[
                            styles.donutPie,
                            { backgroundColor: '#10b981', transform: [{ rotate: `${secondSliceAngle}deg` }] },
                          ]}
                        />
                      </View>
                    )}

                    <View style={[styles.donutHole, { backgroundColor: 'rgba(0,0,0,0.4)' }]}> 
                      <Text style={styles.donutValText}>{session.accuracy}</Text>
                    </View>
                  </View>
                );
              })()}

              <View style={styles.donutLegendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendMark, { backgroundColor: '#10b981' }]} />
                  <Text style={[styles.legendLabel, { color: '#94a3b8' }]}>Correct</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendMark, { backgroundColor: '#ef4444' }]} />
                  <Text style={[styles.legendLabel, { color: '#94a3b8' }]}>Incorrect</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 4. Detailed Review */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>DETAILED REVIEW</Text>
            <Text style={styles.reviewDesc}>
              Review your typed passage and compare it with the original to spot patterns in your mistakes.
            </Text>
            <View style={styles.reviewTextBox}>
              <Text style={styles.reviewText}>
                {session.reviewDiff?.map((item: any, idx: number) => (
                  <Text
                    key={`${item.expected}-${idx}`}
                    style={{
                      color: item.correct ? '#10b981' : '#ef4444',
                      textDecorationLine: item.correct ? 'none' : 'line-through',
                    }}
                  >
                    {item.correct ? `${item.expected} ` : `${item.expected} (typed: ${item.typed}) `}
                  </Text>
                ))}
              </Text>
            </View>
          </View>

          {/* 5. Accuracy Heatmap */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>ACCURACY HEATMAP</Text>
            <View
              style={styles.keyboardMock}
              onLayout={(event) => {
                const width = event.nativeEvent.layout.width;
                setKeyboardWidth(width);
              }}
            >
              {keyboardRows.map((row, rowIndex) => {
                const rKeySize = getKeySize(rowIndex);
                const rKeyFont = getKeyFont(rowIndex);
                return (
                  <View key={rowIndex} style={[styles.keyRow, { gap: KEY_GAP, marginBottom: KEY_GAP }]}>
                    {row.map((k) => (
                      <View
                        key={k}
                        style={[
                          styles.keyMock,
                          {
                            width: rKeySize,
                            height: rKeySize * 1.1,
                            borderColor: k === '⌫' ? 'rgba(255,255,255,0.3)' : keyColor(k),
                            backgroundColor: k === '⌫' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)',
                          },
                        ]}
                      >
                        <Text style={[styles.keyTextMock, { color: k === '⌫' ? 'rgba(255,255,255,0.5)' : keyColor(k), fontSize: rKeyFont }]}>{k}</Text>
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* Space bar row */}
              <View style={[styles.keyRow, { justifyContent: 'center', marginTop: KEY_GAP }]}>
                <View
                  style={[
                    styles.spaceKey,
                    {
                      width: Math.floor(keyboardWidth * 0.55),
                      height: getKeySize(3) * 1.1,
                      borderColor: keyColor(' '),
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                  ]}
                >
                  <Text style={[styles.keyTextMock, { color: keyColor(' '), fontSize: getKeyFont(3) }]}>SPACE</Text>
                </View>
              </View>
            </View>
            <View style={styles.failedKeysRow}>
              {session.failedKeys?.length ? session.failedKeys.map((k: string) => (
                <Text key={k} style={styles.failedKeysLabel}>Key: {k}</Text>
              )) : (
                <Text style={styles.failedKeysLabel}>All keys correct</Text>
              )}
            </View>
          </View>

          {/* 6. Hand Load Distribution */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>HAND LOAD DISTRIBUTION</Text>
            <View style={styles.handRow}>
              <View style={styles.handHalf}>
                <Text style={[styles.handValue, { color: '#10b981' }]}>{session.handLoad?.left ?? 0}%</Text>
                <Text style={styles.handLabel}>LEFT HAND</Text>
                <View style={styles.progressContainer}><View style={[styles.progressFill, { width: `${session.handLoad?.left ?? 0}%`, backgroundColor: '#ef4444' }]} /></View>
              </View>
              <View style={styles.handHalf}>
                <Text style={[styles.handValue, { color: '#3b82f6' }]}>{session.handLoad?.right ?? 0}%</Text>
                <Text style={styles.handLabel}>RIGHT HAND</Text>
                <View style={styles.progressContainer}><View style={[styles.progressFill, { width: `${session.handLoad?.right ?? 0}%`, backgroundColor: '#3b82f6' }]} /></View>
              </View>
            </View>
            <View style={styles.failedKeysRow}>
              {session.failedKeys?.length ? session.failedKeys.map((k: string) => (
                <Text key={k} style={styles.failedKeysLabel}>FAILED: {k}</Text>
              )) : (
                <Text style={styles.failedKeysLabel}>No repeated key mistakes</Text>
              )}
            </View>
          </View>

          {/* 7. Performance Summary */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>PERFORMANCE SUMMARY</Text>
            <View style={styles.summaryGridSmall}>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.grossWpm}</Text>
                <Text style={styles.summaryLabelSmall}>GROSS WPM</Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.keystrokes}</Text>
                <Text style={styles.summaryLabelSmall}>KEYSTROKES</Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.backspaces}</Text>
                <Text style={styles.summaryLabelSmall}>BACKSPACES</Text>
              </View>
            </View>
          </View>

          {/* 8. Mistake Calculation */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>MISTAKE CALCULATION</Text>
            <View style={styles.mistakeGrid}>
              <View style={styles.mistakeCardSub}>
                <Text style={styles.mistakeValSub}>{session.fullMistakes}</Text>
                <Text style={styles.mistakeLabelSub}>FULL MISTAKES</Text>
              </View>
              <View style={styles.mistakeCardSub}>
                <Text style={styles.mistakeValSub}>{session.halfMistakes}</Text>
                <Text style={styles.mistakeLabelSub}>HALF MISTAKES</Text>
              </View>
              <View style={styles.mistakeCardSub}>
                <Text style={styles.mistakeValSub}>{session.totalMistakes}</Text>
                <Text style={styles.mistakeLabelSub}>TOTAL MISTAKES</Text>
              </View>
              <View style={styles.mistakeCardSub}>
                <Text style={styles.mistakeValSub}>{session.allowedMistakes}</Text>
                <Text style={styles.mistakeLabelSub}>ALLOWED</Text>
              </View>
              <View style={styles.mistakeCardSub}>
                <Text style={[styles.mistakeValSub, { color: '#ef4444' }]}>{session.finalPenalty}</Text>
                <Text style={styles.mistakeLabelSub}>FINAL PENALTY</Text>
              </View>
            </View>
          </View>

          {/* 9. Pace Summary */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>PACE SUMMARY</Text>
            <View style={styles.summaryGridSmall}>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.maxWpm}</Text>
                <Text style={styles.summaryLabelSmall}>MAX WPM</Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.avgWpm}</Text>
                <Text style={styles.summaryLabelSmall}>AVG WPM</Text>
              </View>
              <View style={styles.summaryItemSmall}>
                <Text style={styles.summaryValSmall}>{session.minWpm}</Text>
                <Text style={styles.summaryLabelSmall}>MIN WPM</Text>
              </View>
            </View>
          </View>

          {/* 10. Consistency & Efficiency */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>CONSISTENCY & EFFICIENCY</Text>
            <View style={styles.efficiencyList}>
              <View style={styles.effRow}>
                <Text style={styles.effLabel}>Consistency Score</Text>
                <Text style={styles.effVal}>{session.consistency}</Text>
              </View>
              <View style={styles.effRow}>
                <Text style={styles.effLabel}>Wasted Time</Text>
                <Text style={styles.effVal}>{session.wastedTime}s</Text>
              </View>
              <View style={styles.effRow}>
                <Text style={styles.effLabel}>KSPC</Text>
                <Text style={styles.effVal}>{session.kspc}</Text>
              </View>
            </View>
          </View>

          {/* 11. Finger Performance */}
          <View style={styles.fullWidthCard}>
            <Text style={styles.cardHeaderTitle}>FINGER PERFORMANCE</Text>
            <View style={styles.handRow}>
              <View style={styles.handHalf}>
                <Text style={[styles.handValue, { color: '#10b981' }]}>64.5%</Text>
                <Text style={styles.handLabel}>LEFT HAND</Text>
              </View>
              <View style={styles.handHalf}>
                <Text style={[styles.handValue, { color: '#3b82f6' }]}>35.5%</Text>
                <Text style={styles.handLabel}>RIGHT HAND</Text>
              </View>
            </View>
            <View style={styles.fingerList}>
              {session.fingerPerf?.slice(0, 8).map((fp: any) => {
                const isLeftHand = ['leftPinky', 'leftRing', 'leftMiddle', 'leftIndex', 'leftThumb'].includes(fp.finger);
                const percentColor = isLeftHand ? '#10b981' : '#3b82f6';
                return (
                  <View key={fp.finger} style={styles.fingerBadgeFull}>
                    <Text style={styles.fingerTitle}>
                      {fp.finger.replace(/([A-Z])/g, ' $1').trim()}: <Text style={{ color: percentColor }}>{fp.percent}%</Text> · <Text style={{ color: '#94a3b8' }}>{fp.avgMs}ms</Text>
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <TouchableOpacity 
            style={styles.doneBtn} 
            onPress={() => {
              setAnalysisSession(null);
              setActiveMode('EXAM_TOPICS');
            }}
          >
            <Text style={styles.doneBtnText}>Back to SSC Topics</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  if (analysisSession) {
    return renderAnalysisDetails();
  }

  if (activeMode === 'PRACTICE' || activeMode === 'EXAM_PRACTICE') {
    const isExam = activeMode === 'EXAM_PRACTICE';
    const examBg = '#f8fafc'; // Forcing light/white background for exam
    const examText = '#1e293b';
    const examBorder = '#cbd5e1';

    if (isExam) {
      return (
        <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: examBg }]}>
          {/* Top Bar Stats */}
          <View style={[styles.examTopBar, { borderBottomColor: examBorder }]}>
            <View style={styles.examTopLeft}>
              <Text style={[styles.examMockLabel, { color: examText }]}>SSC-Mock Test</Text>
            </View>
            
            <View style={styles.examTopCenter}>
              <View style={styles.zoomControls}>
                <Text style={[styles.zoomLabel, { color: examText }]}>Zoom</Text>
                <Pressable style={styles.zoomBtn}><Text style={styles.zoomBtnText}>+</Text></Pressable>
                <Pressable style={styles.zoomBtn}><Text style={styles.zoomBtnText}>-</Text></Pressable>
              </View>
              <Text style={[styles.rollNoText, { color: examText }]}>Roll No : 2201005501 [User Name]</Text>
            </View>

            <View style={styles.examTopRight}>
              <View style={styles.timeLeftGroup}>
                <Text style={styles.timeLeftLabel}>Time Left</Text>
                <View style={styles.timeBox}>
                  <Text style={styles.timeBoxValue}>{Math.floor(timeLeft / 60)}</Text>
                  <Text style={styles.timeBoxColon}>:</Text>
                  <Text style={styles.timeBoxValue}>{(timeLeft % 60).toString().padStart(2, '0')}</Text>
                </View>
              </View>
              <View style={styles.userIconPlaceholder}><Ionicons name="person" size={16} color="#94a3b8" /></View>
              <View style={styles.userIconPlaceholder}><Ionicons name="desktop" size={16} color="#94a3b8" /></View>
            </View>
          </View>

          {/* Sub Header */}
          <View style={styles.examSubHeader}>
            <View style={styles.engTypingBadge}>
              <Text style={styles.engTypingText}>English Typing</Text>
            </View>
            <View style={styles.examMetaRow}>
              <Text style={styles.keystrokeText}>Keystrokes: <Text style={{fontWeight:'800'}}>{typedText.length}</Text></Text>
              <Text style={styles.durationText}>Duration <Text style={{color:'#ef4444', fontWeight:'800'}}>15 Minutes</Text></Text>
            </View>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.examPracticeScroll}>
            {/* Box 1: Test Passage */}
            <View style={[styles.examBoxOuter, { borderColor: examBorder }]}>
              <View style={styles.examBoxHeader}>
                <Text style={styles.examBoxHeaderText}>Test Passage</Text>
              </View>
              <ScrollView 
                style={styles.examPassageScroll} 
                contentContainerStyle={{ padding: 16 }}
                nestedScrollEnabled
              >
                <Text style={[styles.examPassageText, { fontSize: 16, color: '#334155' }]}>
                  {passage}
                </Text>
              </ScrollView>
            </View>

            {/* Box 2: Typing Area */}
            <Pressable 
              style={[styles.examBoxOuter, { borderColor: inputRef.current?.isFocused() ? '#059669' : examBorder, marginTop: 24 }]} 
              onPress={() => inputRef.current?.focus()}
            >
              <TextInput
                ref={inputRef}
                style={styles.examInputArea}
                placeholder="Start typing here..."
                placeholderTextColor="#94a3b8"
                value={typedText}
                onChangeText={(val) => {
                  if (!isStarted && val.length > 0) setIsStarted(true);
                  if (val.length < typedText.length) {
                    setBackspacesCount(prev => prev + (typedText.length - val.length));
                  }
                  setTypedText(val);
                }}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
              />
            </Pressable>
          </ScrollView>

          <View style={[styles.examFooterBar, { backgroundColor: '#e2e8f0', borderTopColor: examBorder }]}>
            <Text style={[styles.examFooterTitle, { color: '#475569' }]}>SSC CGL TIER-II (PAPER-I)</Text>
            <Pressable style={styles.submitBtn} onPress={() => setIsSubmitConfirmVisible(true)}>
              <Text style={styles.submitBtnText}>SUBMIT TEST</Text>
            </Pressable>
          </View>

          {/* Global Submit Confirmation Modal */}
          {isSubmitConfirmVisible && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: '#0f172a' }]}>
                <View style={styles.modalIconBox}>
                  <Ionicons name="shield-checkmark" size={40} color="#059669" />
                </View>
                <Text style={styles.modalTitle}>CONFIRM SUBMITTING TEST</Text>
                <Text style={styles.modalDesc}>
                  Are you sure you want to submit your typing test? You will not be able to make changes after submission.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable 
                    style={styles.modalBtnCancel} 
                    onPress={() => setIsSubmitConfirmVisible(false)}
                  >
                    <Text style={styles.modalBtnCancelText}>CANCEL</Text>
                  </Pressable>
                  <Pressable 
                    style={styles.modalBtnConfirm} 
                    onPress={handleSubmitTest}
                  >
                    <Text style={styles.modalBtnConfirmText}>CONFIRM SUBMIT</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      );
    }

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

        {/* Topic selector lives OUTSIDE ScrollView to avoid overflow clipping on web */}
        <View style={[styles.controlsRow, { paddingHorizontal: 16, paddingTop: 12, zIndex: 999 }]}>
          <View style={styles.topicSelector}>
            <Text style={[styles.topicLabel, { color: muted }]}>TOPIC:</Text>
            <View style={{ position: 'relative' }}>
              <Pressable
                style={[styles.topicDropdown, {
                  borderColor: showTopicDropdown ? '#059669' : border,
                  backgroundColor: cardBg,
                  maxWidth: 110,
                  flexShrink: 1,
                }]}
                onPress={() => !isExam && setShowTopicDropdown(v => !v)}
              >
                <Text style={[styles.topicText, { color: '#fff', flex: 1 }]}>{currentTopic}</Text>
                <Ionicons name={showTopicDropdown ? 'chevron-up' : 'chevron-down'} size={14} color={muted} />
              </Pressable>
              {showTopicDropdown && (
                <>
                  {/* Dismiss overlay */}
                  <Pressable
                    style={{ position: 'absolute', top: -1000, left: -1000, right: -2000, bottom: -2000, zIndex: 998 }}
                    onPress={() => setShowTopicDropdown(false)}
                  />
                  <View style={[styles.topicDropdownList, { backgroundColor: '#0a1628', borderColor: '#1e3a5f', zIndex: 999 }]}>
                    {PRACTICE_TOPICS.map((t) => {
                      const isSel = currentTopic === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          activeOpacity={0.7}
                          style={[styles.topicDropdownItem, isSel && styles.topicDropdownItemSelected]}
                          onPress={() => handleTopicChange(t.id)}
                        >
                          <Text style={[styles.topicDropdownItemText, { color: isSel ? '#10b981' : '#e2e8f0' }]}>
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
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

        {/* Passage + Input in its own ScrollView */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.practiceScrollContent}
        >
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
                    color = typedText[index] === char ? '#fff' : '#ef4444';
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

        {isExam && (
          <View style={[styles.examFooterBar, { backgroundColor: isDark ? '#0f172a' : '#f1f5f9', borderTopColor: border }]}>
            <Text style={[styles.examFooterTitle, { color: text }]}>SSC CGL TIER-II (PAPER-I)</Text>
            <Pressable style={styles.submitBtn} onPress={() => setIsSubmitConfirmVisible(true)}>
              <Text style={styles.submitBtnText}>SUBMIT TEST</Text>
            </Pressable>
          </View>
        )}

        {/* Global Submit Confirmation Modal */}
        {isSubmitConfirmVisible && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: '#0f172a' }]}>
              <View style={styles.modalIconBox}>
                <Ionicons name="shield-checkmark" size={40} color="#059669" />
              </View>
              <Text style={styles.modalTitle}>CONFIRM SUBMITTING TEST</Text>
              <Text style={styles.modalDesc}>
                Are you sure you want to submit your typing test? You will not be able to make changes after submission.
              </Text>
              <View style={styles.modalActions}>
                <Pressable 
                  style={styles.modalBtnCancel} 
                  onPress={() => setIsSubmitConfirmVisible(false)}
                >
                  <Text style={styles.modalBtnCancelText}>CANCEL</Text>
                </Pressable>
                <Pressable 
                  style={styles.modalBtnConfirm} 
                  onPress={handleSubmitTest}
                >
                  <Text style={styles.modalBtnConfirmText}>CONFIRM SUBMIT</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (activeMode === 'EXAM_TOPICS') {
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
                onPress={() => handleTopicSelect(topic.id)}
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

          <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 24 }}>
            <View style={{ backgroundColor: '#f8f8f8', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignSelf: 'flex-start' }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#64748b' }}>Select a topic above</Text>
            </View>
          </View>

          {/* Formula Section */}
          <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 20 }}>
            <Text style={[styles.instructionTitle, { color: text, marginBottom: 12 }]}>Formula to Calculate Speed Test</Text>
            <View style={styles.formulaRow}>
              <Text style={[styles.formulaText, { color: muted }]}>CW = Total correct typed words</Text>
              <Text style={[styles.formulaText, { color: muted }]}>RW = Total Wrong typed words</Text>
              <Text style={[styles.formulaText, { color: muted }]}>TW = Total Typed Word (CW + RW)</Text>
              <Text style={[styles.formulaText, { color: '#10b981', fontWeight: '600' }]}>Typing Speed (WPM) = CW / Time</Text>
              <Text style={[styles.formulaText, { color: '#10b981', fontWeight: '600' }]}>Accuracy = (CW / TW) × 100</Text>
            </View>
          </View>

          {/* Instructions Section */}
          <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
            <Text style={[styles.instructionTitle, { color: text, marginBottom: 12 }]}>Instructions for Proficiency Test/Skill Test</Text>
            <Text style={[styles.instructionBody, { color: muted }]}>
              On the combined Graduate Level examination, posts of Assistant (CSS) and Tax Assistant for CBIC and CDOT are included. Skill Test in Data Entry (DSST) with a speed of 8000 (Eight Thousand) key depressions per hour on computer for the post of Tax Assistant (Central Excise and Income Tax). is prescribed. For the post of Assistant (CSS), Computer Proficiency Test has been prescribed. DEST and CRT are of qualifying nature. While DEST will be administered using SSC NIC software used and superform modules of CPI will be administered in M.S. Office 2007. Word Processing Module of CPT will be administered using SSC NIC software.
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (activeMode === 'EXAM_INSTRUCTIONS') {
    return (
      <View style={[styles.wrapper, { paddingTop: insets.top, backgroundColor: bg }]}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <View style={styles.practiceHeaderLeft}>
            <Pressable onPress={() => setActiveMode('EXAM_TOPICS')} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={muted} />
            </Pressable>
            <Text style={[styles.practiceTitle, { color: text }]}>General Instructions</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.examScrollContent}>
          <View style={[styles.instructionsDetailedBox, { backgroundColor: cardBg, borderColor: border }]}>
            <Text style={[styles.instructionTitleMain, { color: text }]}>General Instructions:</Text>
            <View style={styles.instructionPoints}>
              <Text style={[styles.instructionPoint, { color: muted }]}>• The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself.</Text>
              <Text style={[styles.instructionPoint, { color: muted }]}>• You will be given 10 minutes (or specific test duration) to type the text.</Text>
              <Text style={[styles.instructionPoint, { color: muted }]}>• Type the text exactly as shown in the text box.</Text>
              <Text style={[styles.instructionPoint, { color: muted }]}>• You can use the Backspace key to correct your mistakes.</Text>
              <Text style={[styles.instructionPoint, { color: muted }]}>• Do not use any other keys or shortcuts not relevant to typing.</Text>
            </View>

            <Text style={[styles.instructionTitleMain, { color: text, marginTop: 24 }]}>Key Layout:</Text>
            <Text style={[styles.instructionPoint, { color: muted }]}>English Typing Test supports standard US QWERTY keyboard layout.</Text>

            <Text style={[styles.instructionTitleMain, { marginTop: 24, color: '#ef4444' }]}>Important:</Text>
            <Text style={[styles.instructionPoint, { color: muted }]}>Once you click "Start Test", the exam will begin in full-screen mode. Do not attempt to switch tabs or exit full screen, as this may result in disqualification or submission of the test.</Text>

            <View style={styles.declarationRow}>
              <Pressable 
                style={[styles.checkbox, { borderColor: border, backgroundColor: isReadyDecl ? '#059669' : 'transparent' }]} 
                onPress={() => setIsReadyDecl(!isReadyDecl)}
              >
                {isReadyDecl && <Ionicons name="checkmark" size={14} color="#fff" />}
              </Pressable>
              <Text style={[styles.declarationText, { color: text }]}>
                I have read and understood the Instructions. I declare that I am ready to begin the typing test and will adhere to the rules.
              </Text>
            </View>

            <View style={styles.examActionsRow}>
              <Pressable 
                style={[styles.readyBtn, { backgroundColor: isReadyDecl ? '#059669' : muted }]} 
                onPress={handleStartRealExam}
                disabled={!isReadyDecl}
              >
                <Text style={styles.readyBtnText}>I am Ready to Begin</Text>
              </Pressable>
              <Pressable style={[styles.cancelBtn, { borderColor: border }]} onPress={() => setActiveMode('EXAM_TOPICS')}>
                <Text style={[styles.cancelBtnText, { color: text }]}>Cancel</Text>
              </Pressable>
            </View>
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
          <View style={styles.analyticsLayout}>
            <View style={styles.statsColumn}>
              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#3b82f620' }]}>
                  <Ionicons name="flash" size={16} color="#3b82f6" />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>BEST SPEED</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>38 <Text style={styles.analysisUnit}>WPM</Text></Text>
                </View>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#8b5cf620' }]}>
                  <Ionicons name="disc-outline" size={16} color="#8b5cf6" />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>AVG ACCURACY</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>66%</Text>
                </View>
              </View>

              <View style={[styles.analysisCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={[styles.analysisIconWrap, { backgroundColor: '#94a3b820' }]}>
                  <Ionicons name="time-outline" size={16} color={muted} />
                </View>
                <View>
                  <Text style={styles.analysisLabel}>TESTS TAKEN</Text>
                  <Text style={[styles.analysisValue, { color: text }]}>17</Text>
                </View>
              </View>
            </View>

            <View style={[styles.analysisChartCard, { backgroundColor: cardBg, borderColor: border }]}>
              <Text style={[styles.analysisLabel, { marginBottom: 12, color: text }]}>Recent Performance</Text>
              <View style={styles.smallChart}>
                <View style={styles.gridLine} />
                <View style={[styles.gridLine, { top: '25%' }]} />
                <View style={[styles.gridLine, { top: '50%' }]} />
                <View style={[styles.gridLine, { top: '75%' }]} />
                <View style={styles.chartLinePlaceholder} />
              </View>
              <View style={styles.smallChartXAxis}>
                <Text style={styles.axisLabel}>3/18</Text>
                <Text style={styles.axisLabel}>3/19</Text>
                <Text style={styles.axisLabel}>3/20</Text>
              </View>
            </View>
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
          horizontal={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 6, gap: 8 }}
        >
          {RECENT_SESSIONS.map((session) => {
            const progress = Math.min(1, (session.score || 0) / 100);
            return (
              <View key={session.id} style={[styles.sessionCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={styles.sessionHeaderRow}>
                  <View style={[styles.sessionIconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}> 
                    <Ionicons name={session.id % 2 === 0 ? 'document-text' : 'keypad'} size={18} color="#10b981" />
                  </View>
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>0+</Text>
                  </View>
                </View>

                <Text style={[styles.sessionTitle, { color: text }]} numberOfLines={1}>{session.title}</Text>
                <Text style={[styles.sessionSub, { color: muted }]}>{session.sub}</Text>

                <View style={styles.sessionStatsRow}>
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

                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: '#10b981' }]} />
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
            );
          })}
        </ScrollView>

        <View style={styles.sectionHeader}>
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
          </View>
        </View>

        <View style={{ paddingHorizontal: 6, gap: 8 }}>
          {[
            { id: 1, title: 'Rise of Buddhism and Jainism', sub: 'SSC session • 0+ on history', score: 32, accuracy: '78.5%', time: '0m 16s', date: '3/18/2026', color: '#10b981' },
          ].map((session) => {
            const progress = Math.min(1, (session.score || 0) / 100);
            return (
              <View key={session.id} style={[styles.sessionCard, { backgroundColor: cardBg, borderColor: border }]}>
                <View style={styles.sessionHeaderRow}>
                  <View style={[styles.sessionIconBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}> 
                    <Ionicons name="document-text" size={18} color="#10b981" />
                  </View>
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>0+</Text>
                  </View>
                </View>

                <Text style={[styles.sessionTitle, { color: text }]} numberOfLines={1}>{session.title}</Text>
                <Text style={[styles.sessionSub, { color: muted }]}>{session.sub}</Text>

                <View style={styles.sessionStatsRow}>
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

                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: '#10b981' }]} />
                </View>

                <View style={styles.sessionCardFooter}>
                  <Text style={[styles.sessionDate, { color: muted }]}>{session.date}</Text>
                  <Pressable 
                    style={[styles.viewAnalysisBtn, { backgroundColor: session.color }]}
                    onPress={() => setAnalysisSession({
                      title: session.title,
                      date: session.date,
                      netWpm: session.score,
                      accuracy: parseInt(session.accuracy),
                      grossWpm: session.score + 5,
                      consistency: 85,
                      timeTaken: session.time,
                      totalWords: session.score,
                      mistakes: Math.floor(session.score * 0.15),
                      keystrokes: session.score * 5,
                      trendData: [{ time: 0, wpm: 0 }, { time: 30, wpm: session.score }, { time: 60, wpm: session.score }],
                      keyStats: {}
                    })}
                  >
                    <Text style={styles.viewAnalysisText}>View Analysis</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  welcomeSection: { marginBottom: 24 },
  welcomeText: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  welcomeSub: { fontSize: 14 },
  heroCard: { borderRadius: 20, padding: 24, marginBottom: 32 },
  heroContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroLeft: { flex: 1 },
  heroRight: { marginLeft: 10, marginTop: 10 },
  heroBadgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    gap: 4,
  },
  heroBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  heroTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 20, lineHeight: 34 },
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

  // Lobby/Generic
  sectionHeader: { marginTop: 32, marginBottom: 16 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  subTitle: { fontSize: 13, lineHeight: 18 },
  paginationRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paginationBtn: { padding: 4 },
  pageNumber: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  pageNumberText: { fontSize: 13, fontWeight: '700' },
  sessionsScrollContent: { gap: 12, paddingBottom: 20 },
  sessionCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  sessionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sessionIconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  sessionBadgeText: { fontSize: 10, fontWeight: '800', color: '#10b981' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  sessionSub: { fontSize: 11, color: '#94a3b8', marginBottom: 14 },
  sessionStatsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sessionStatItem: { flex: 1, alignItems: 'center' },
  sessionStatLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', marginBottom: 4 },
  sessionStatValue: { fontSize: 14, fontWeight: '800' },
  progressBarBackground: { height: 6, borderRadius: 4, backgroundColor: 'rgba(16, 185, 129, 0.15)', overflow: 'hidden', marginBottom: 14 },
  progressBarFill: { height: '100%', borderRadius: 4 },
  sessionCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sessionDate: { fontSize: 11, color: '#94a3b8' },
  viewAnalysisBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  viewAnalysisText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  topBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1 },
  topBtnText: { fontSize: 12, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardPlaceholder: { fontSize: 14 },
  prevYearCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  prevYearTitle: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  prevYearSubtitle: { fontSize: 13, color: '#94a3b8' },
  quickInstructions: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  instructionTitleSmall: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  instructionText: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  mainBtn: { backgroundColor: '#059669', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  mainBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Practice Mode
  practiceHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: { marginRight: 12 },
  practiceTitle: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  statsRow: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '800', color: '#fff' },
  statValueGreen: { fontSize: 14, fontWeight: '800', color: '#10b981' },
  practiceScrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 6 },
  topicSelector: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topicLabel: { fontSize: 10, fontWeight: '800' },
  topicDropdown: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, borderWidth: 1, gap: 4 },
  topicDropdownList: {
    position: 'absolute',
    top: 40,
    left: 0,
    minWidth: 160,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    overflow: 'hidden',
  },
  topicDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  topicDropdownItemSelected: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderLeftColor: '#10b981',
  },
  topicDropdownItemText: { fontSize: 13, fontWeight: '600' },
  topicText: { fontSize: 13, fontWeight: '700' },
  nextBtn: { backgroundColor: '#064e3b', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  nextBtnText: { color: '#10b981', fontSize: 12, fontWeight: '700' },
  rightControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fontControls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 3, borderRadius: 4, borderWidth: 1, gap: 4 },
  fontSizeText: { fontSize: 12, fontWeight: '700' },
  clockBtn: { padding: 2 },
  typingContent: { flex: 1, minHeight: 400 },
  passageContainer: { position: 'relative' },
  passageText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', lineHeight: 36, letterSpacing: 0.5 },
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0, textAlignVertical: 'top', ...Platform.select({ web: { outlineWidth: 0 } as any, default: {} }) },

  // Exam Mode
  examScrollContent: { padding: 24, paddingBottom: 60 },
  examHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  examHeaderTitle: { fontSize: 18, fontWeight: '700' },
  selectTopicLabel: { fontSize: 14, fontWeight: '600', marginBottom: 20 },
  topicGrid: { flexDirection: 'column', gap: 12, marginBottom: 32 },
  examTopicCard: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 16, borderWidth: 1, minHeight: 80 },
  topicItemLeft: { flex: 1, marginRight: 8 },
  examTopicTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  examTopicSub: { fontSize: 11, lineHeight: 14 },
  topicIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  instructionsDetailedBox: { padding: 24, borderRadius: 20, borderWidth: 1, marginBottom: 40 },
  instructionTitleMain: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  instructionPoints: { gap: 12 },
  instructionPoint: { fontSize: 14, lineHeight: 22 },
  declarationRow: { flexDirection: 'row', marginTop: 32, gap: 12, alignItems: 'flex-start' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  declarationText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '500' },
  examActionsRow: { flexDirection: 'row', marginTop: 40, gap: 12 },
  readyBtn: { flex: 2, paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  readyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700' },

  // Exam Full Interface
  examTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 8, borderBottomWidth: 1 },
  examTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  examMockLabel: { fontSize: 10, fontWeight: '700' },
  examTopCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  zoomControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoomLabel: { fontSize: 9, fontWeight: '700', marginRight: 2 },
  zoomBtn: { width: 22, height: 22, borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  zoomBtnText: { fontSize: 12, fontWeight: '700' },
  rollNoText: { fontSize: 9, fontWeight: '700', marginTop: 2, textAlign: 'center' },
  examTopRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeLeftGroup: { alignItems: 'center' },
  timeLeftLabel: { fontSize: 8, fontWeight: '700', marginBottom: 0 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  timeBoxValue: { fontSize: 14, fontWeight: '800' },
  timeBoxColon: { fontSize: 12, fontWeight: '700' },
  userIconPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  examSubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1 },
  engTypingBadge: { backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  engTypingText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  examMetaRow: { flexDirection: 'row', gap: 10 },
  keystrokeText: { fontSize: 10 },
  durationText: { fontSize: 10 },
  examPracticeScroll: { flex: 1 },
  examBoxOuter: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },
  examBoxHeader: { padding: 12, borderBottomWidth: 1 },
  examBoxHeaderText: { fontSize: 14, fontWeight: '700' },
  examPassageScroll: { height: 200, padding: 16 },
  examInputArea: { minHeight: 180, padding: 16, textAlignVertical: 'top', ...Platform.select({ web: { outlineWidth: 0 } as any, default: {} }) },
  examFooterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: 1 },
  examFooterTitle: { fontSize: 15, fontWeight: '800' },
  submitBtn: { backgroundColor: '#059669', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  submitBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Analysis Screen
  analysisContainer: { flex: 1 },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1 },
  analysisBackBtn: { marginRight: 8 },
  analysisHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  analysisScrollContent: { padding: 8, paddingBottom: 30 },
  summaryTitle: { fontSize: 19, fontWeight: '800', marginBottom: 2, color: '#fff' },
  summarySubtitle: { fontSize: 12, marginBottom: 14, color: '#94a3b8' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  statCard: { width: '48%', padding: 10, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(30, 41, 59, 0.5)', borderColor: 'rgba(51, 65, 85, 0.5)' },
  fullWidthCard: { width: '100%', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 12, backgroundColor: 'rgba(30, 41, 59, 0.3)', borderColor: 'rgba(51, 65, 85, 0.4)' },
  cardHeaderTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10, color: '#fff' },
  chartContainerFull: { height: 130, position: 'relative' },
  chartYAxis: { position: 'absolute', left: 0, top: 0, bottom: 30, justifyContent: 'space-between', zIndex: 1 },
  axisText: { fontSize: 9, fontWeight: '600', color: '#94a3b8' },
  chartDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: '#fff' },
  chartXLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 30, marginTop: 4 },
  analysisLayout: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', justifyContent: 'space-between' },
  statsColumn: { flex: 1, minWidth: 140, gap: 8 },
  analysisChartCard: { flex: 1, minWidth: 140, padding: 12, borderRadius: 14, borderWidth: 1 },
  smallChart: { height: 130, borderRadius: 12, backgroundColor: 'rgba(148, 163, 184, 0.08)', position: 'relative', overflow: 'hidden' },
  chartLinePlaceholder: { position: 'absolute', left: 12, right: 12, bottom: 16, height: 2, backgroundColor: '#10b981' },
  smallChartXAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  analysisUnit: { fontSize: 11, color: '#94a3b8' },
  donutBox: { alignItems: 'center', paddingVertical: 12 },
  donutSegments: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  donutBase: { width: 120, height: 120, borderRadius: 60, position: 'absolute' },
  donutHalf: { position: 'absolute', width: 60, height: 120, overflow: 'hidden' },
  donutHalfLeft: { left: 0, top: 0 },
  donutHalfRight: { right: 0, top: 0 },
  donutPie: { position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -60, top: 0 },
  donutHole: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  donutVisual: { width: 120, height: 120, borderRadius: 60, borderWidth: 10, alignItems: 'center', justifyContent: 'center' },
  donutValText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  donutLegendRow: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendMark: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { fontSize: 11, fontWeight: '700' },
  passageLabel: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 12 },
  reviewTextBox: { padding: 12, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(51, 65, 85, 0.2)' },
  reviewText: { fontSize: 12, lineHeight: 20, letterSpacing: 0.5, color: '#fff' },
  reviewDesc: { fontSize: 12, lineHeight: 18, color: '#94a3b8' },
  keyboardMock: { width: '100%', paddingVertical: 10, alignSelf: 'stretch' },
  keyRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'nowrap' },
  keyMock: { borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  spaceKey: { borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  keyTextMock: { fontSize: 9, fontWeight: '800', color: '#fff' },
  failedKeysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  failedKeysLabel: { fontSize: 12, fontWeight: '700', width: '100%', marginBottom: 8, color: '#fff' },
  handRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 },
  handHalf: { flex: 1, alignItems: 'center' },
  handValue: { fontSize: 22, fontWeight: '800', marginBottom: 2, color: '#fff' },
  handLabel: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 12 },
  progressContainer: { width: '100%', height: 4, borderRadius: 2, backgroundColor: 'rgba(148, 163, 184, 0.1)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  summaryGridSmall: { gap: 16 },
  summaryItemSmall: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabelSmall: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  summaryValSmall: { fontSize: 16, fontWeight: '800', color: '#fff' },
  mistakeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mistakeCardSub: { flex: 1, minWidth: '45%', padding: 12, borderRadius: 12, borderWidth: 1 },
  mistakeValSub: { fontSize: 20, fontWeight: '800', marginBottom: 2, color: '#fff' },
  mistakeLabelSub: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  efficiencyList: { gap: 10 },
  effRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  effLabel: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  effVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  fingerList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  fingerBadgeFull: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, color: '#fff' },
  fingerTitle: { fontSize: 13, fontWeight: '700', color: '#fff' },
  doneBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // Instructions/Alerts
  instructionContainer: { marginBottom: 40 },
  instructionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  formulaRow: { gap: 8 },
  formulaText: { fontSize: 14, lineHeight: 22 },
  instructionBody: { fontSize: 14, lineHeight: 22, color: '#94a3b8', marginTop: 16 },
  startExamBtn: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  startExamBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  keyDepressionBox: { alignItems: 'flex-end' },
  keyDepressionLabel: { fontSize: 9, fontWeight: '800', marginBottom: 2 },
  keyDepressionValue: { fontSize: 13, fontWeight: '800' },

  // Modals
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalContent: { width: '85%', maxWidth: 400, borderRadius: 16, padding: 32, alignItems: 'center' },
  modalIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(5, 150, 105, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  modalDesc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalBtnCancel: { flex: 1, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  modalBtnCancelText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  modalBtnConfirm: { flex: 1, paddingVertical: 14, borderRadius: 8, backgroundColor: '#059669', alignItems: 'center' },
  modalBtnConfirmText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  goalVerticalList: { gap: 12, marginBottom: 32 },
  goalVerticalCard: { flexDirection: 'row', padding: 24, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start', gap: 16 },
  goalIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  goalDesc: { fontSize: 14, lineHeight: 20 },

  analyticsHeader: { marginBottom: 32 },
  analyticsLayout: { flexDirection: 'column', gap: 16, marginTop: 16 },

  analysisCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },

  analysisIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  analysisLabel: { fontSize: 9, fontWeight: '800', color: '#94a3b8', marginBottom: 2 },
  analysisValue: { fontSize: 16, fontWeight: '800' },
  graphCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  graphTitle: { fontSize: 14, fontWeight: '700' },
  graphBadge: { fontSize: 10, fontWeight: '700', color: '#10b981' },
  graphArea: { flexDirection: 'row', height: 120, gap: 12 },
  yAxis: { justifyContent: 'space-between', paddingVertical: 4 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingLeft: 24 },
  chartArea: { flex: 1, position: 'relative', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(148, 163, 184, 0.2)' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(148, 163, 184, 0.1)' },
  linePlaceholder: { position: 'absolute', left: '10%', right: '10%', bottom: '12%', height: 2, backgroundColor: '#10b981', opacity: 0.5 },
  chartPoint: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
  analyticsEmpty: { paddingVertical: 40, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', marginTop: 16, alignItems: 'center', justifyContent: 'center' },
  statsCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(148, 163, 184, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  analyticsEmptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 12 },
  tipsList: { marginTop: 16, gap: 12 },
  tipCard: { flexDirection: 'row', padding: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center', gap: 16 },
  tipIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tipTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  tipDesc: { fontSize: 12, lineHeight: 18 },
  // Missing/Restored Styles
  selectTopicBox: { padding: 16, alignItems: 'flex-start' },
  selectTopicText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  headerIcon: { marginRight: 10 },
  axisLabel: { fontSize: 10, fontWeight: '500', color: '#94a3b8' },
  examPassageText: { fontSize: 16, lineHeight: 28, letterSpacing: 0.5 },
});
