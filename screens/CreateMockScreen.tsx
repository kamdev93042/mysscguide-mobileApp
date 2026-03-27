import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useMocks } from '../context/MocksContext';

/* ─── SUBJECT & TOPIC DATA ─── */
const SUBJECTS = [
  { id: 'english', title: 'English', topicsCount: 12, icon: 'chatbubble-ellipses', color: '#ec4899' },
  { id: 'ga', title: 'General Awareness', topicsCount: 13, icon: 'globe', color: '#a855f7' },
  { id: 'reasoning', title: 'Logical Reasoning', topicsCount: 18, icon: 'hardware-chip', color: '#3b82f6' },
  { id: 'quant', title: 'Quant', topicsCount: 20, icon: 'calculator', color: '#eab308' },
];

const TOPICS_BY_SUBJECT: Record<string, string[]> = {
  english: [
    'Active & Passive Voice', 'Antonyms', 'Cloze Passage', 'Direct & Indirect Speech',
    'Fill in the Blanks', 'Idioms & Phrases', 'One Word Substitution', 'Para Jumbles',
    'Sentence Improvement', 'Spelling Detection', 'Spot the Error', 'Synonyms'
  ].sort(),
  ga: [
    'Arts & Culture', 'Awards & Honors', 'Biology', 'Chemistry', 'Computer Knowledge',
    'Current Affairs', 'Economics', 'Geography', 'History', 'Physics', 'Polity',
    'Sports', 'Static GK'
  ].sort(),
  quant: [
    'Algebra', 'Average', 'Boats & Streams', 'Compound Interest', 'Coordinate Geometry',
    'Data Interpretation', 'Fractions & Decimals', 'Geometry', 'Mensuration',
    'Mixture & Alligation', 'Number System', 'Partnership', 'Percentage',
    'Pipes & Cisterns', 'Profit, Loss & Discount', 'Ratio & Proportion',
    'Simple Interest', 'Time & Work', 'Time, Speed & Distance', 'Trigonometry'
  ].sort(),
  reasoning: [
    'Analogy', 'Blood Relations', 'Classification', 'Coding-Decoding', 'Counting of Figures',
    'Dice & Cubes', 'Dictionary Order', 'Direction Sense Test', 'Embedded Figures',
    'Figure Completion', 'Mathematical Operations', 'Mirror & Water Images',
    'Missing Number', 'Paper Folding & Cutting', 'Series', 'Syllogism',
    'Venn Diagrams', 'Word Formation'
  ].sort()
};

const STEP_LABELS = ['Name', 'Subjects', 'Topics', 'Review'];

export default function CreateMockScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { isDark, toggleTheme } = useTheme();
  const { createNewChallenge, isLoading } = useMocks();
  const { width: screenWidth } = useWindowDimensions();

  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const [mockName, setMockName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [topicDifficulties, setTopicDifficulties] = useState<Record<string, ('E'|'M'|'H')[]>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  
  const [searchQuery, setSearchQuery] = useState('');
  const [numQuestions, setNumQuestions] = useState(25);
  const [timeLimit, setTimeLimit] = useState(15);
  const [isPublic, setIsPublic] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');

  // Theme
  const bg = isDark ? '#0f172a' : '#f8fafc';
  const card = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#f8fafc' : '#0f172a';
  const mutedText = isDark ? '#94a3b8' : '#64748b';
  const green = '#059669';
  const greenLight = isDark ? '#064e3b' : '#ecfdf5';

  // Topic specific theme matching user's image request
  const topicCardBg = isDark ? '#0B1120' : '#f8fafc'; // Very dark blue/black for cards
  const activeGreen = '#10B981'; // Bright green from reference
  const inactivePill = isDark ? '#1E293B' : '#E2E8F0';

  // Gather all topics for selected subjects
  const allAvailableTopics = useMemo(() => {
    const topics: { topic: string; subject: string; subjectId: string }[] = [];
    selectedSubjects.forEach((subId) => {
      const subjectTopics = TOPICS_BY_SUBJECT[subId] || [];
      const subjectObj = SUBJECTS.find((s) => s.id === subId);
      subjectTopics.forEach((t) => {
        topics.push({ topic: t, subject: subjectObj?.title || subId, subjectId: subId });
      });
    });
    return topics;
  }, [selectedSubjects]);

  // Filtered topics based on search
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return allAvailableTopics;
    const q = searchQuery.trim().toLowerCase();
    return allAvailableTopics.filter((t) => t.topic.toLowerCase().includes(q));
  }, [allAvailableTopics, searchQuery]);

  // Group filtered topics by subject
  const groupedTopics = useMemo(() => {
    const groups: Record<string, { topic: string; subject: string; subjectId: string }[]> = {};
    filteredTopics.forEach((t) => {
      if (!groups[t.subjectId]) groups[t.subjectId] = [];
      groups[t.subjectId].push(t);
    });
    return groups;
  }, [filteredTopics]);

  const toggleSubject = (id: string) => {
    if (selectedSubjects.includes(id)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== id));
      // Remove topics of that subject
      const subTopics = TOPICS_BY_SUBJECT[id] || [];
      const keptTopics = selectedTopics.filter((t) => !subTopics.includes(t));
      setSelectedTopics(keptTopics);
      
      // Clean up difficulties map
      const newDiffs = { ...topicDifficulties };
      subTopics.forEach(t => delete newDiffs[t]);
      setTopicDifficulties(newDiffs);
    } else {
      setSelectedSubjects([...selectedSubjects, id]);
    }
  };

  const toggleTopic = (topic: string) => {
    if (selectedTopics.includes(topic)) {
      setSelectedTopics(selectedTopics.filter((t) => t !== topic));
      const newDiffs = { ...topicDifficulties };
      delete newDiffs[topic];
      setTopicDifficulties(newDiffs);
    } else {
      setSelectedTopics([...selectedTopics, topic]);
      setTopicDifficulties({ ...topicDifficulties, [topic]: [] }); // Default to no specific difficulty
    }
  };

  const changeDifficulty = (topic: string, lvl: 'E'|'M'|'H') => {
    const current = topicDifficulties[topic] || [];
    let updated;
    if (current.includes(lvl)) {
      updated = current.filter(d => d !== lvl);
    } else {
      updated = [...current, lvl];
    }
    setTopicDifficulties({ ...topicDifficulties, [topic]: updated });
  };

  const selectAllTopics = () => {
    const all = allAvailableTopics.map((t) => t.topic);
    const newSelected = Array.from(new Set([...selectedTopics, ...all]));
    setSelectedTopics(newSelected);
    
    // Assign empty array to newly added topics
    const newDiffs = { ...topicDifficulties };
    all.forEach(t => {
      if (!newDiffs[t]) newDiffs[t] = [];
    });
    setTopicDifficulties(newDiffs);
  };
  
  const autoSelect5 = () => {
    const newDiffs = { ...topicDifficulties };
    const newlyPicked: string[] = [];
    const levels: ('E'|'M'|'H')[] = ['E', 'M', 'H'];

    selectedSubjects.forEach(subId => {
      // Get all available topics for this subject that are NOT yet selected
      const subjectTopics = TOPICS_BY_SUBJECT[subId] || [];
      const available = subjectTopics.filter(t => !selectedTopics.includes(t));
      
      const toPickCount = Math.min(5, available.length);
      if (toPickCount === 0) return;

      // Shuffle and pick
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, toPickCount);
      
      picked.forEach((t, idx) => {
        // Ensure different difficulty levels by cycling or randomizing
        // Using cycle based on index to guarantee a good mix:
        newDiffs[t] = [levels[idx % levels.length]];
        newlyPicked.push(t);
      });
    });

    if (newlyPicked.length > 0) {
      setSelectedTopics([...selectedTopics, ...newlyPicked]);
      setTopicDifficulties(newDiffs);
    }
  };

  const clearAllTopics = () => {
    setSelectedTopics([]);
    setTopicDifficulties({});
  };

  const handleCreate = async () => {
    const finalName = mockName.trim() || 'Custom Mock';
    
    // Map subjects and topics
    const mappedSubjects: any[] = [];
    selectedSubjects.forEach(subId => {
      const sub = SUBJECTS.find(s => s.id === subId);
      if (!sub) return;
      
      const subTopics: any[] = [];
      selectedTopics.forEach(t => {
         // if topic belongs to this subject
         if (TOPICS_BY_SUBJECT[subId]?.includes(t)) {
            const diffs = topicDifficulties[t] || [];
            const mappedDiffs = diffs.map(d => d === 'E' ? 'easy' : d === 'M' ? 'medium' : d === 'H' ? 'hard' : d);
            subTopics.push({
               name: t,
               difficulties: mappedDiffs.length > 0 ? mappedDiffs : ['medium'] // default to medium if none
            });
         }
      });
      
      if (subTopics.length > 0) {
         mappedSubjects.push({ subject: sub.title, topics: subTopics });
      }
    });
    
    try {
      await createNewChallenge({
        title: finalName,
        subjects: mappedSubjects,
        questionCount: numQuestions,
        timeLimit: timeLimit,
        isPublic: isPublic,
      });
      
      setStep(1);
      navigation.goBack();
    } catch (e) {
      console.error(e);
      // Let it fail silently or show alert if we had one
    }
  };

  const nextStep = () => {
    if (step < totalSteps) setStep(step + 1);
    else handleCreate();
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
    else navigation.goBack();
  };

  const isNextDisabled = () => {
    if (step === 1) return mockName.trim().length === 0;
    if (step === 2) return selectedSubjects.length === 0;
    if (step === 3) return selectedTopics.length === 0;
    return false;
  };

  /* ═══════════════════ HEADER ═══════════════════ */
  const renderHeader = () => (
    <View style={[s.header, { paddingTop: insets.top, backgroundColor: card, borderBottomColor: border }]}>
      <Pressable onPress={prevStep} style={s.headerBtn} hitSlop={8}>
        <View style={[s.headerBtnCircle, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
          <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={18} color={text} />
        </View>
      </Pressable>
      <View style={s.headerCenter}>
        <View style={s.logoRow}>
          <Image source={require('../assets/sscguidelogo.png')} style={s.logo} resizeMode="contain" />
          <Text style={[s.logoText, { color: text }]}>My<Text style={{ color: green }}>SSC</Text>guide</Text>
        </View>
        <Text style={[s.headerSub, { color: mutedText }]}>Step {step} of {totalSteps} · {STEP_LABELS[step - 1]}</Text>
      </View>
      <Pressable onPress={toggleTheme} style={s.headerBtn} hitSlop={8}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={16} color={green} />
      </Pressable>
    </View>
  );

  /* ═══════════════════ PROGRESS ═══════════════════ */
  const renderProgress = () => (
    <View style={[s.progressWrap, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
      <View style={s.progressTrack}>
        {[1, 2, 3, 4].map((n) => (
          <React.Fragment key={n}>
            <View style={[s.progressSeg, { backgroundColor: n <= step ? green : (isDark ? '#334155' : '#d1d5db'), opacity: n === step ? 0.65 : 1 }]} />
            {n < 4 && <View style={{ width: 3 }} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );

  /* ═══════════════════ STEP 1: NAME ═══════════════════ */
  const renderStep1 = () => (
    <View style={[s.stepWrap, s.step1Wrap]}>
      <View style={[s.card, { backgroundColor: card, borderColor: border }]}>
        <View style={[s.accentBar, { backgroundColor: green }]} />
        <View style={s.cardBody}>
          <View style={[s.iconCircle, { backgroundColor: greenLight }]}>
            <Ionicons name="create-outline" size={26} color={green} />
          </View>
          <Text style={[s.cardTitle, { color: text }]}>Name your challenge</Text>
          <Text style={[s.cardDesc, { color: mutedText }]}>
            Give your mock test a memorable name.
          </Text>
          <View style={s.inputWrap}>
            <Text style={[s.inputLabel, { color: green }]}>MOCK NAME</Text>
            <TextInput
              style={[s.textInput, { color: text, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: mockName.trim() ? green : border }]}
              placeholder="e.g. SSC CGL Mock #1"
              placeholderTextColor={mutedText}
              value={mockName}
              onChangeText={setMockName}
              autoFocus
            />
          </View>
          {mockName.trim().length > 0 && (
            <View style={[s.hint, { backgroundColor: greenLight }]}>
              <Ionicons name="checkmark-circle" size={14} color={green} />
              <Text style={[s.hintText, { color: green }]}>Looks good!</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  /* ═══════════════════ STEP 2: SUBJECTS ═══════════════════ */
  const renderStep2 = () => (
    <View style={s.stepWrap}>
      <View style={s.stepHeader}>
        <View style={[s.iconCircle, { backgroundColor: greenLight }]}>
          <Ionicons name="library" size={22} color={green} />
        </View>
        <Text style={[s.stepTitle, { color: text }]}>Choose Subjects</Text>
        <Text style={[s.stepDesc, { color: mutedText }]}>Select what you want to practice.</Text>
        {selectedSubjects.length > 0 && (
          <View style={[s.badge, { backgroundColor: green }]}>
            <Text style={s.badgeText}>{selectedSubjects.length} selected</Text>
          </View>
        )}
      </View>

      <View style={s.subGrid}>
        {SUBJECTS.map((sub) => {
          const sel = selectedSubjects.includes(sub.id);
          return (
            <Pressable
              key={sub.id}
              style={[s.subCard, {
                borderColor: sel ? green : border,
                backgroundColor: sel ? (isDark ? '#064e3b' : '#ecfdf5') : card,
                borderWidth: sel ? 2 : 1,
              }]}
              onPress={() => toggleSubject(sub.id)}
            >
              <View style={s.subCardTop}>
                <View style={[s.subIconCircle, { backgroundColor: sub.color + '20' }]}>
                  <Ionicons name={sub.icon as any} size={20} color={sub.color} />
                </View>
                <View style={[s.checkCircle, {
                  borderColor: sel ? green : border,
                  backgroundColor: sel ? green : 'transparent',
                }]}>
                  {sel && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </View>
              <Text style={[s.subName, { color: text }]} numberOfLines={2}>{sub.title}</Text>
              <View style={[s.subBadge, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Text style={[s.subBadgeText, { color: mutedText }]}>
                  {(TOPICS_BY_SUBJECT[sub.id] || []).length} topics
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedSubjects.length > 0 && (
        <View style={[s.selSubRow, { borderColor: border }]}>
          <Text style={[s.selSubLabel, { color: mutedText }]}>Selected:</Text>
          <View style={s.selSubChips}>
            {selectedSubjects.map((subId) => {
              const sub = SUBJECTS.find((s) => s.id === subId);
              return (
                <View key={subId} style={[s.selSubChip, { backgroundColor: greenLight }]}>
                  <Text style={[s.selSubChipText, { color: green }]}>{sub?.title}</Text>
                  <Pressable onPress={() => toggleSubject(subId)} hitSlop={6}>
                    <Ionicons name="close" size={12} color={green} />
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  /* ═══════════════════ STEP 3: TOPICS ═══════════════════ */
  const renderStep3 = () => {
    // Breakdown for summary chips
    let numE = 0, numM = 0, numH = 0;
    selectedTopics.forEach(t => {
      const diffs = topicDifficulties[t] || [];
      if (diffs.includes('E')) numE++;
      if (diffs.includes('M')) numM++;
      if (diffs.includes('H')) numH++;
    });

    return (
      <View style={[s.stepWrap, { flex: 1 }]}>
        <View style={s.stepHeader}>
          <View style={[s.iconCircle, { backgroundColor: greenLight }]}>
            <Ionicons name="list" size={22} color={green} />
          </View>
          <Text style={[s.stepTitle, { color: text }]}>Select Topics</Text>
          <Text style={[s.stepDesc, { color: mutedText }]}>
            Pick topics from your {selectedSubjects.length} subject(s).
          </Text>
        </View>

        {/* Selected topics stats */}
        {selectedTopics.length > 0 && (
          <View style={s.diffStatsRow}>
             <View style={[s.diffStatChip, { backgroundColor: green }]}>
                <Text style={s.diffStatChipText}>{selectedTopics.length} Total</Text>
             </View>
             {numE > 0 && <View style={[s.diffStatInd, { borderColor: '#F59E0B' }]}><Text style={[s.diffStatIndText, { color: '#F59E0B' }]}>{numE} Easy</Text></View>}
             {numM > 0 && <View style={[s.diffStatInd, { borderColor: '#F59E0B' }]}><Text style={[s.diffStatIndText, { color: '#F59E0B' }]}>{numM} Med</Text></View>}
             {numH > 0 && <View style={[s.diffStatInd, { borderColor: '#F59E0B' }]}><Text style={[s.diffStatIndText, { color: '#F59E0B' }]}>{numH} Hard</Text></View>}
          </View>
        )}

        {/* Mode Toggle Overlay */}
        <View
          style={[
            s.modeToggleWrap,
            {
              backgroundColor: isDark ? '#0F172A' : '#e2e8f0',
              borderColor: isDark ? '#1E293B' : '#cbd5e1',
            },
          ]}
        >
          <Pressable 
            style={[
              s.modeBtn,
              selectionMode === 'MANUAL' && [
                s.modeBtnActive,
                { backgroundColor: isDark ? '#1E293B' : '#ffffff' },
              ],
            ]}
            onPress={() => setSelectionMode('MANUAL')}
          >
            <Text style={[s.modeBtnText, selectionMode === 'MANUAL' ? { color: activeGreen } : { color: mutedText }]}>MANUAL</Text>
          </Pressable>
          <Pressable 
            style={[
              s.modeBtn,
              selectionMode === 'AUTO' && [
                s.modeBtnActive,
                { backgroundColor: isDark ? '#1E293B' : '#ffffff' },
              ],
            ]}
            onPress={() => setSelectionMode('AUTO')}
          >
            <Text
              style={[
                s.modeBtnText,
                selectionMode === 'AUTO'
                  ? { color: isDark ? '#fff' : activeGreen }
                  : { color: mutedText },
              ]}
            >
              AUTO-SELECT
            </Text>
          </Pressable>
        </View>

        {selectionMode === 'MANUAL' ? (
          <>
            {/* Search + actions */}
            <View style={s.searchRow}>
              <View style={[s.searchBar, { backgroundColor: card, borderColor: border }]}>
                <Ionicons name="search" size={16} color={mutedText} />
                <TextInput
                  style={[s.searchInput, { color: text }]}
                  placeholder="Search topics..."
                  placeholderTextColor={mutedText}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
                    <Ionicons name="close-circle" size={16} color={mutedText} />
                  </Pressable>
                )}
              </View>
              <Pressable style={[s.actionBtn, { backgroundColor: isDark ? '#334155' : '#e2e8f0' }]} onPress={selectAllTopics}>
                <Text style={[s.actionBtnText, { color: text }]}>All</Text>
              </Pressable>
              {selectedTopics.length > 0 && (
                <Pressable style={[s.actionBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: border }]} onPress={clearAllTopics}>
                  <Text style={[s.actionBtnTextMuted, { color: mutedText }]}>Clear</Text>
                </Pressable>
              )}
            </View>

            {/* Grouped topics list */}
            {Object.keys(groupedTopics).length === 0 && (
              <View style={s.emptyState}>
                <Ionicons name="search-outline" size={28} color={mutedText} />
                <Text style={[s.emptyText, { color: mutedText }]}>No topics found</Text>
              </View>
            )}

            {Object.keys(groupedTopics).map((subId) => {
              const sub = SUBJECTS.find((s) => s.id === subId);
              const topics = groupedTopics[subId];
              const isExpanded = expandedSubjects[subId] || searchQuery.length > 0;

              return (
                <View key={subId} style={s.topicGroup}>
                  <Pressable 
                    style={[s.topicGroupHeader, { backgroundColor: greenLight }]}
                    onPress={() => setExpandedSubjects({...expandedSubjects, [subId]: !isExpanded})}
                  >
                    <Ionicons name={sub?.icon as any || 'book'} size={14} color={green} />
                    <Text style={[s.topicGroupTitle, { color: green }]}>{sub?.title?.toUpperCase()}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[s.topicGroupCount, { color: green }]}>{topics.length}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={green} />
                    </View>
                  </Pressable>
                  
                  {isExpanded && topics.map(({ topic }) => {
                    const sel = selectedTopics.includes(topic);
                    const diffs = topicDifficulties[topic] || [];

                    return (
                      <Pressable
                        key={topic}
                        style={[
                          s.extendedTopicCard,
                          {
                            backgroundColor: sel ? topicCardBg : card,
                            borderColor: sel ? activeGreen : border,
                          }
                        ]}
                        onPress={() => toggleTopic(topic)}
                      >
                        {/* Top Row: Name and Checkmark */}
                        <View style={s.extTopicTop}>
                          <Text style={[s.extTopicName, { color: sel ? activeGreen : text }]} numberOfLines={1}>
                            {topic.toUpperCase()}
                          </Text>
                          <View style={[s.extTopicCheck, { backgroundColor: sel ? activeGreen : 'transparent', borderColor: sel ? activeGreen : border }]}>
                             {sel && <Ionicons name="checkmark" size={16} color="#fff" />}
                          </View>
                        </View>

                        {/* Bottom Row: E M H Segments only shown if selected */}
                        {sel && (
                          <View style={[s.extTopicDiffContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            {['E', 'M', 'H'].map((lvl) => {
                              const isLvlSel = diffs.includes(lvl as any);
                              let activeColor = '#F59E0B'; // Always Amber/Orange
                              
                              return (
                                <Pressable 
                                  key={lvl} 
                                  style={[
                                    s.extDiffSegment, 
                                    { backgroundColor: isLvlSel ? activeColor : inactivePill }
                                  ]}
                                  onPress={(e) => {
                                    e.stopPropagation(); // prevent toggling topic selection
                                    changeDifficulty(topic, lvl as any);
                                  }}
                                >
                                  <Text style={[s.extDiffText, { color: isLvlSel ? '#fff' : mutedText }]}>{lvl}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
          </>
        ) : (
           <View style={[s.autoSelectContainer, { backgroundColor: isDark ? '#1E293B' : '#ffffff', borderColor: border }]}>
             <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5', width: 80, height: 80, borderRadius: 40 }]}>
                <Ionicons name="flash" size={40} color={activeGreen} />
             </View>
             <Text style={[s.cardTitle, { color: text, marginTop: 16 }]}>Let us build it for you</Text>
             <Text style={[s.cardDesc, { color: mutedText, paddingHorizontal: 20 }]}>
                We'll automatically pick a balanced mix of topics spanning all your selected subjects.
             </Text>
             <Pressable style={[s.autoGenerateBtn, { backgroundColor: activeGreen }]} onPress={autoSelect5}>
                <Text style={s.autoGenerateBtnText}>Generate 5 Topics Per Subject</Text>
             </Pressable>
             {selectedTopics.length > 0 && (
                <Text style={[s.hintText, { color: mutedText, marginTop: 12 }]}>
                   Currently {selectedTopics.length} topics selected.
                </Text>
             )}
          </View>
        )}
      </View>
    );
  };

  /* ═══════════════════ STEP 4: REVIEW ═══════════════════ */
  const renderStep4 = () => {
    const selectedSubjectNames = selectedSubjects.map((id) => SUBJECTS.find((s) => s.id === id)?.title).filter(Boolean);
    return (
      <View style={s.stepWrap}>
        {/* Summary banner */}
        <View style={[s.summaryBanner, { backgroundColor: green }]}>
          <View style={s.summaryOverlay} />
          <View style={s.summaryInner}>
            <View style={s.summaryTopRow}>
              <View style={s.summaryIcon}>
                <Ionicons name="trophy" size={20} color={green} />
              </View>
              <Text style={s.summaryLabel}>CHALLENGE BLUEPRINT</Text>
            </View>
            <Text style={s.summaryTitle}>{mockName.trim() || 'Untitled Mock'}</Text>
            <View style={s.summaryStatsRow}>
              <View style={s.summaryStat}>
                <Ionicons name="folder" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.summaryStatText}>{selectedSubjects.length} Subj</Text>
              </View>
              <View style={s.summaryDot} />
              <View style={s.summaryStat}>
                <Ionicons name="document-text" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.summaryStatText}>{selectedTopics.length} Topics</Text>
              </View>
              <View style={s.summaryDot} />
              <View style={s.summaryStat}>
                <Ionicons name="help-circle" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.summaryStatText}>{numQuestions} Q's</Text>
              </View>
              <View style={s.summaryDot} />
              <View style={s.summaryStat}>
                <Ionicons name="time" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={s.summaryStatText}>{timeLimit} min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subjects & topics summary */}
        <Text style={[s.configLabel, { color: text }]}>Included Subjects</Text>
        <View style={s.configChips}>
          {selectedSubjectNames.map((name) => (
            <View key={name} style={[s.configChip, { backgroundColor: greenLight }]}>
              <Text style={[s.configChipText, { color: green }]}>{name}</Text>
            </View>
          ))}
        </View>

        <Text style={[s.configLabel, { color: text, marginTop: 12 }]}>Selected Topics ({selectedTopics.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={s.configChips}>
            {selectedTopics.slice(0, 8).map((t) => {
              const diffs = topicDifficulties[t] || [];
              return (
                <View key={t} style={[s.configChip, { backgroundColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                  {diffs.map((diffLevel) => {
                    let color = '#F59E0B'; // Always Amber/Orange
                    return (
                       <Text key={diffLevel} style={[s.configChipText, { color: color, fontWeight: '900' }]}>{diffLevel}</Text>
                    );
                  })}
                  <Text style={[s.configChipText, { color: text }]} numberOfLines={1}>{t}</Text>
                </View>
              );
            })}
            {selectedTopics.length > 8 && (
              <View style={[s.configChip, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Text style={[s.configChipText, { color: mutedText }]}>+{selectedTopics.length - 8} more</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Settings */}
        <Text style={[s.configLabel, { color: text }]}>Configure</Text>
        <View style={s.settingsRow}>
          <View style={[s.settingsBlock, { borderColor: border, backgroundColor: card }]}>
            <View style={[s.settingsIconW, { backgroundColor: greenLight }]}>
              <Ionicons name="list" size={16} color={green} />
            </View>
            <Text style={[s.settingsLbl, { color: mutedText }]}>QUESTIONS</Text>
            <Text style={[s.settingsVal, { color: text }]}>{numQuestions}</Text>
            <View style={s.stepperRow}>
              <Pressable onPress={() => setNumQuestions(Math.max(5, numQuestions - 5))} style={[s.stepperBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Ionicons name="remove" size={16} color={text} />
              </Pressable>
              <Pressable onPress={() => setNumQuestions(Math.min(100, numQuestions + 5))} style={[s.stepperBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Ionicons name="add" size={16} color={text} />
              </Pressable>
            </View>
          </View>
          <View style={[s.settingsBlock, { borderColor: border, backgroundColor: card }]}>
            <View style={[s.settingsIconW, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
              <Ionicons name="time" size={16} color="#3b82f6" />
            </View>
            <Text style={[s.settingsLbl, { color: mutedText }]}>TIME (MIN)</Text>
            <Text style={[s.settingsVal, { color: text }]}>{timeLimit}</Text>
            <View style={s.stepperRow}>
              <Pressable onPress={() => setTimeLimit(Math.max(5, timeLimit - 5))} style={[s.stepperBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Ionicons name="remove" size={16} color={text} />
              </Pressable>
              <Pressable onPress={() => setTimeLimit(Math.min(60, timeLimit + 5))} style={[s.stepperBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                <Ionicons name="add" size={16} color={text} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Visibility */}
        <View style={[s.visCard, { backgroundColor: card, borderColor: border }]}>
          <View style={s.visLeft}>
            <View style={[s.settingsIconW, { backgroundColor: greenLight, marginRight: 10 }]}>
              <Ionicons name={isPublic ? 'globe' : 'lock-closed'} size={16} color={green} />
            </View>
            <View>
              <Text style={[s.visTitle, { color: text }]}>Access</Text>
              <Text style={[s.visSub, { color: mutedText }]}>{isPublic ? 'Public' : 'Private'}</Text>
            </View>
          </View>
          <Pressable
            style={[s.toggle, { backgroundColor: isPublic ? green : (isDark ? '#334155' : '#d1d5db') }]}
            onPress={() => setIsPublic(!isPublic)}
          >
            <View style={[s.toggleKnob, { transform: [{ translateX: isPublic ? 18 : 0 }] }]} />
          </Pressable>
        </View>
      </View>
    );
  };

  /* ═══════════════════ MAIN ═══════════════════ */
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {renderHeader()}
      {renderProgress()}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.content}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 8) + 8, backgroundColor: card, borderTopColor: border }]}>
        <View style={s.footerDots}>
          {[1, 2, 3, 4].map((n) => (
            <View key={n} style={[s.footerDot, { backgroundColor: n <= step ? green : (isDark ? '#334155' : '#d1d5db'), width: n === step ? 20 : 6 }]} />
          ))}
        </View>
        <Pressable
          style={[s.nextBtn, { backgroundColor: green }, (isNextDisabled() || isLoading) && { opacity: 0.4 }]}
          onPress={nextStep}
          disabled={isNextDisabled() || isLoading}
        >
          {step === totalSteps && <Ionicons name="rocket" size={16} color="#fff" style={{ marginRight: 6 }} />}
          <Text style={s.nextBtnText}>{step === totalSteps ? (isLoading ? 'Creating...' : 'Create Challenge') : 'Continue'}</Text>
          {step < totalSteps && <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 6 }} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ═══════════════════ STYLES ═══════════════════ */
const s = StyleSheet.create({
  /* Header */
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8, borderBottomWidth: 1 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerBtnCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logo: { width: 28, height: 28 },
  logoText: { fontSize: 14, fontWeight: '700', marginLeft: -1 },
  headerSub: { fontSize: 10, fontWeight: '600', marginTop: 1 },

  /* Progress */
  progressWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  progressTrack: { flexDirection: 'row', height: 5 },
  progressSeg: { flex: 1, height: 5, borderRadius: 2.5 },

  /* Scroll */
  scrollContent: { paddingVertical: 16, paddingHorizontal: 14, flexGrow: 1 },
  content: { alignSelf: 'center', width: '100%', maxWidth: 520, flexGrow: 1 },
  stepWrap: {},
  step1Wrap: { flex: 1, justifyContent: 'center' },

  /* Shared */
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  accentBar: { height: 5 },
  cardBody: { padding: 22, alignItems: 'center' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  cardDesc: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  inputWrap: { width: '100%' },
  inputLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  textInput: { fontSize: 14, fontWeight: '600', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, width: '100%' },
  hintText: { fontSize: 11, fontWeight: '600' },
  stepHeader: { alignItems: 'center', marginBottom: 16 },
  stepTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  stepDesc: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  badge: { marginTop: 8, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  /* Step 2 */
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  subCard: { width: '48%', borderRadius: 16, padding: 12, marginBottom: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  subCardTop: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  subIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  checkCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  subName: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 6, lineHeight: 16 },
  subBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  subBadgeText: { fontSize: 9, fontWeight: '700' },
  selSubRow: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  selSubLabel: { fontSize: 10, fontWeight: '700', marginBottom: 6 },
  selSubChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  selSubChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  selSubChipText: { fontSize: 11, fontWeight: '700' },

  /* Step 3 */
  diffStatsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  diffStatChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  diffStatChipText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  diffStatInd: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  diffStatIndText: { fontSize: 9, fontWeight: '700' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, height: 38 },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '500' },
  actionBtn: { height: 38, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 4 },
  actionBtnText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  actionBtnTextMuted: { fontSize: 10, fontWeight: '800' },
  topicGroup: { marginBottom: 16 },
  topicGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginBottom: 8 },
  topicGroupTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, flex: 1 },
  topicGroupCount: { fontSize: 9, fontWeight: '800' },
  
  /* Customized Extended Topic Card */
  extendedTopicCard: {
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 8,
    padding: 12,
  },
  extTopicTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  extTopicName: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    flex: 1,
    paddingRight: 10
  },
  extTopicCheck: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  extTopicDiffContainer: {
    marginTop: 12,
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4
  },
  extDiffSegment: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extDiffText: {
    fontSize: 12,
    fontWeight: '900',
  },

  emptyState: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  emptyText: { fontSize: 12, fontWeight: '500' },

  /* Step 4 */
  summaryBanner: { borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  summaryOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.08)' },
  summaryInner: { padding: 18 },
  summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  summaryIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 9, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8 },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 10 },
  summaryStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  summaryStat: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  summaryStatText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  summaryDot: { width: 2, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.4)' },
  configLabel: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  configChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  configChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  configChipText: { fontSize: 10, fontWeight: '700' },
  settingsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  settingsBlock: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center' },
  settingsIconW: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  settingsLbl: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4, marginBottom: 4 },
  settingsVal: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  stepperRow: { flexDirection: 'row', gap: 6, width: '100%' },
  stepperBtn: { flex: 1, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  visCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16, borderWidth: 1 },
  visLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  visTitle: { fontSize: 13, fontWeight: '700' },
  visSub: { fontSize: 10, fontWeight: '500' },
  toggle: { width: 44, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },

  /* Footer */
  footer: { paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1 },
  footerDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginBottom: 8 },
  footerDot: { height: 5, borderRadius: 2.5 },
  nextBtn: { flexDirection: 'row', width: '100%', paddingVertical: 14, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { fontSize: 14, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },

  /* Mode Toggle */
  modeToggleWrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    backgroundColor: '#0F172A', // Very dark blue mapping to the image background
    borderRadius: 100,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  modeBtn: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#1E293B', // Dark grey/blue for active segment
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  autoSelectContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  autoGenerateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  autoGenerateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
