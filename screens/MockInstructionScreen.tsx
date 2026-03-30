import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { isAuthSessionError, pyqApi } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MockInstructionScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();

  const mockData = route.params?.mockData || {
    title: 'SSC CGL Mock Test',
    questions: 100,
    duration: 60,
  };

  const [hasAgreed, setHasAgreed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const normalizedTitle = String(mockData?.title || '');
  const isCglTier2 = /cgl/i.test(normalizedTitle) && /tier\s*2/i.test(normalizedTitle);
  const isChslTier2 = /chsl/i.test(normalizedTitle) && /tier\s*2/i.test(normalizedTitle);
  const isMtsMode = /mts/i.test(normalizedTitle);
  const isCpoMode = /cpo/i.test(normalizedTitle);
  const isCpoTier2Mode = isCpoMode && /tier\s*2/i.test(normalizedTitle);
  const isTier2Instruction = isCglTier2 || isChslTier2 || isMtsMode || isCpoMode;
  const examTierLabel = isChslTier2 ? 'SSC CHSL Tier 2' : isCglTier2 ? 'SSC CGL Tier 2' : isMtsMode ? 'SSC MTS' : isCpoTier2Mode ? 'SSC CPO Tier 2' : isCpoMode ? 'SSC CPO Tier 1' : 'SSC Test';
  const markingScheme = isCglTier2
    ? { correct: 3, wrong: 1 }
    : isMtsMode
    ? { correct: 3, wrong: '0 for Session-I, 1 for Session-II' }
    : isCpoMode
    ? { correct: 1, wrong: 0.25 }
    : { correct: 2, wrong: 0.5 };

  const bg = isDark ? '#000000' : '#ffffff';
  const card = bg;
  const text = isDark ? '#f8fafc' : '#0f172a';
  const border = isDark ? '#334155' : '#cbd5e1';
  const tableHead = isDark ? '#3b82f6' : '#2563eb';
  const tableBorder = isDark ? '#1e293b' : '#e2e8f0';
  const footerBg = isDark ? '#0f172a' : '#f1f5f9';

  const handleContinue = async () => {
    if (!hasAgreed || isInitializing) return;

    if (route.params?.sourceTab === 'PYQ' && route.params?.testPaperId) {
      setIsInitializing(true);
      try {
        const res = await pyqApi.initPyq(route.params.testPaperId);
        const initTimeLimitRaw = Number(res?.timeLimit);
        const initDurationMinutes = Number.isFinite(initTimeLimitRaw) && initTimeLimitRaw > 0
          ? (initTimeLimitRaw < 300 ? initTimeLimitRaw : Math.round(initTimeLimitRaw / 60))
          : 0;
        const initQuestionCountRaw = Number(res?.questionCount ?? res?.totalQuestions);
        const initQuestionCount = Number.isFinite(initQuestionCountRaw) && initQuestionCountRaw > 0
          ? Math.round(initQuestionCountRaw)
          : 0;
        const fallbackDurationMinutes = Number(mockData.duration) || 60;
        const fallbackQuestionCount = Number(mockData.questions) || 100;
        
        const dynamicMockData = {
          ...mockData,
          questions: initQuestionCount || fallbackQuestionCount,
          duration: initDurationMinutes || fallbackDurationMinutes,
        };

        navigation.navigate('MockPractice', {
          mockData: dynamicMockData,
          sourceTab: route.params?.sourceTab,
          testKey: route.params?.testKey,
          testPaperId: route.params?.testPaperId,
        });
        
        setIsInitializing(false);
      } catch (error: any) {
        console.error('Failed to init PYQ:', error);

        if (isAuthSessionError(error)) {
          await Promise.all([
            AsyncStorage.removeItem('userToken'),
            AsyncStorage.removeItem('isLoggedIn'),
          ]);
          const msg = 'Your session expired. Please login again to continue.';
          if (Platform.OS === 'web') {
            window.alert(msg);
          } else {
            Alert.alert('Session Expired', msg);
          }
          navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          setIsInitializing(false);
          return;
        }
        
        let errorMsg = 'Failed to initialize test. Please try again.';
        if (error.message) {
           errorMsg = error.message;
        }

        if (Platform.OS === 'web') {
           window.alert(errorMsg);
        } else {
           Alert.alert('Error', errorMsg);
        }
        setIsInitializing(false);
      }
    } else {
      navigation.navigate('MockPractice', {
        mockData,
        sourceTab: route.params?.sourceTab,
        testKey: route.params?.testKey,
      });
    }
  };

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('PYQs');
  };

  const renderBullet = (idx: string | number, content: string) => (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletPoint, { color: text }]}>{idx}</Text>
      <Text style={[styles.bulletBody, { color: text }]}>{content}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Title */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: border }]}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={text} />
        </Pressable>
        <Text style={[styles.mainTitle, { color: text }]}>
          {isTier2Instruction ? `${examTierLabel} Instructions` : 'General Instructions'}
        </Text>
        <View style={styles.backBtnSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={true}>
        {/* Other Important Instructions */}
        <Text style={[styles.sectionHeading, { color: text }]}>Other Important Instructions:</Text>

        {renderBullet("1.", "The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time available for you to complete the examination. When the timer reaches zero, the examination will end by itself. You need not terminate the examination or submit your paper.")}
        {renderBullet("2.", "The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:")}

        {/* Legend Table */}
        <View style={[styles.table, { borderColor: tableBorder }]}>
          <View style={[styles.tableHeaderRow, { backgroundColor: tableHead, borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}><Text style={styles.tableHeaderText}>Symbol</Text></View>
            <View style={styles.tableColDesc}><Text style={styles.tableHeaderText}>Description</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.circleIcon, { backgroundColor: '#4b5563' }]} />
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Option Not chosen</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.circleIcon, { backgroundColor: 'transparent', borderWidth: 2, borderColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#3b82f6'}} />
              </View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Option chosen as correct (By clicking on it again you can delete your option and choose another option if desired.)</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.boxIcon, { backgroundColor: '#2563eb' }]}><Text style={styles.boxText}>12</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Question number shown in blue color indicates that you have not yet attempted the question.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.boxIcon, { backgroundColor: '#16a34a' }]}><Text style={styles.boxText}>15</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Question number shown in green color indicates that you have answered the question.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.boxIcon, { backgroundColor: '#dc2626' }]}>
                <Text style={styles.boxText}>14</Text>
                <Ionicons name="caret-up" size={10} color="#fff" style={{ position: 'absolute', bottom: -5, right: 3 }} />
              </View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>You have not yet answered the question, but marked it for coming back for review later, if time permits.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.boxIcon, { backgroundColor: '#eab308' }]}>
                <Text style={[styles.boxText, { color: '#000' }]}>15</Text>
                <Ionicons name="caret-up" size={10} color="#000" style={{ position: 'absolute', bottom: -5, right: 3 }} />
              </View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>You have answered the question, but marked it for review later, if time permits.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.btnIcon, { backgroundColor: '#3b82f6' }]}><Text style={styles.btnIconText}>Save & Next</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Clicking on this will take you to the next question.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.btnIcon, { backgroundColor: '#3b82f6' }]}><Text style={styles.btnIconText}>Previous</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>Clicking on this will take you to the previous question.</Text></View>
          </View>

          <View style={[styles.tableRow, { borderBottomColor: tableBorder }]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.btnIcon, { backgroundColor: '#3b82f6' }]}><Text style={styles.btnIconText}>Mark for Review</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>By clicking on this button, you can mark the question for review later. If you answer and mark for review, the question will be treated as answered and evaluated even if you do not review it.</Text></View>
          </View>

          <View style={[styles.tableRow]}>
            <View style={[styles.tableColIcon, { borderRightColor: tableBorder }]}>
              <View style={[styles.btnIcon, { backgroundColor: '#3b82f6' }]}><Text style={styles.btnIconText}>Unmark Review</Text></View>
            </View>
            <View style={styles.tableColDesc}><Text style={[styles.tableCellText, { color: text }]}>By clicking on this button, you can unmark the question for review.</Text></View>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: text, marginTop: 24 }]}>Navigating to a Question:</Text>
        {renderBullet("3.", "To answer a question, do the following:")}
        <View style={styles.indent}>
          {renderBullet("1.", "Click on the question number in the Question Palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.")}
          {renderBullet("2.", "Click on Save & Next to save your answer for the current question and then go to the next question.")}
          {renderBullet("3.", "Click on Mark for Review & Next to save your answer for the current question, mark it for review, and then go to the next question.")}
        </View>

        <Text style={[styles.sectionHeading, { color: text, marginTop: 24 }]}>Answering a Question:</Text>
        {renderBullet("4.", "Procedure for answering a multiple choice type question:")}
        <View style={styles.indent}>
          {renderBullet("a.", "To select your answer, click on the button of one of the options.")}
          {renderBullet("b.", "To deselect your chosen answer, click on the button of the chosen option again or click on the Clear Response button.")}
          {renderBullet("c.", "To change your chosen answer, click on the button of another option.")}
          {renderBullet("d.", "To save your answer, you MUST click on the Save & Next button.")}
        </View>
        {renderBullet("5.", "To mark the question for review, click on the Mark for Review & Next button. If an answer is selected for a question that is Marked for Review, that answer will be considered in the evaluation.")}

        <Text style={[styles.sectionHeading, { color: text, marginTop: 24 }]}>Navigating through Sections:</Text>
        {renderBullet("6.", "Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by clicking on the section name. The section you are currently viewing will be highlighted.")}
        {renderBullet("7.", "After clicking the Save & Next button on the last question for a section, you will automatically be taken to the first question of the next section.")}
        {renderBullet("8.", "You can shuffle between sections and questions anytime during the examination as per your convenience.")}
        {isTier2Instruction &&
          renderBullet(
            "8A.",
            `${examTierLabel} follows multi-phase section navigation in this app. After completing the current phase, the next phase starts automatically as per timer and section rules.`
          )}

        <Text style={[styles.sectionHeading, { color: text, marginTop: 24 }]}>Marking Scheme:</Text>
        {renderBullet("9.", "For each question, marks will be awarded as follows:")}
        <View style={styles.indent}>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: text }]} />
            <Text style={[styles.bulletBody, { color: text }]}>Each question carries <Text style={{fontWeight: 'bold'}}>{markingScheme.correct} marks</Text>.</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: text }]} />
            <Text style={[styles.bulletBody, { color: text }]}>For each correct answer, you will get <Text style={{fontWeight: 'bold'}}>{markingScheme.correct} marks</Text>.</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: text }]} />
            <Text style={[styles.bulletBody, { color: text }]}>For each wrong answer, <Text style={{fontWeight: 'bold'}}>{typeof markingScheme.wrong === 'number' ? `${markingScheme.wrong.toFixed(2)} marks` : `${markingScheme.wrong} marks`}</Text> will be deducted.</Text>
          </View>
          <View style={styles.bulletRow}>
            <View style={[styles.dot, { backgroundColor: text }]} />
            <Text style={[styles.bulletBody, { color: text }]}>Questions not answered / not attempted will receive <Text style={{fontWeight: 'bold'}}>no marks</Text> and there will be no negative marking for unanswered questions.</Text>
          </View>
        </View>

        <Text style={[styles.sectionHeading, { color: text, marginTop: 24 }]}>General:</Text>
        {renderBullet("10.", "The candidates are not allowed to use calculator or any electronic gadget during the examination.")}
        {renderBullet("11.", "No rough sheet will be provided by the Commission. The candidates can do rough work on the rough work space provided in the question paper itself.")}
        {renderBullet("12.", "The candidates are advised NOT to close the browser window before submitting the test. If the window is closed accidentally, the candidates can re-login and continue from the last saved response.")}
        {renderBullet("13.", "In case of any discrepancy in the English and Hindi version, the English version will be treated as final.")}
        {renderBullet("14.", "The Question Paper may contain questions in English / Hindi. If a question is given in both English and Hindi, you can switch between languages using the language toggle provided.")}
        {renderBullet("15.", "No candidate is allowed to leave the Examination Hall before the end of the examination.")}

        <Text style={[styles.warningText, { marginTop: 20 }]}>
          <Text style={{fontWeight: 'bold'}}>Note:</Text> All the questions are compulsory. There is no choice in the question paper.
        </Text>
        <Text style={[styles.warningText, { marginTop: 12, marginBottom: 24 }]}>
          <Text style={{fontWeight: 'bold'}}>Caution:</Text> Attempting to copy, share, or use any unfair means during the examination will lead to immediate disqualification and may result in a permanent ban from future Tests / Examinations conducted by the Commission.
        </Text>

      </ScrollView>

      {/* Fixed Footer */}
      <View style={[styles.footer, { backgroundColor: footerBg, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={styles.checkboxContainer}
          onPress={() => setHasAgreed(!hasAgreed)}
        >
          <View style={[styles.checkbox, { borderColor: border }, hasAgreed && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
            {hasAgreed && <Ionicons name="checkmark" size={16} color="#ffffff" />}
          </View>
          <Text style={[styles.consentText, { color: text }]}>
            I have read and understood the instructions. I agree that in case of not adhering to the instructions, I shall be liable to be debarred from this Test and/or to disciplinary action, which may include ban from future Tests / Examinations.
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.beginBtn, (!hasAgreed || isInitializing) && styles.beginBtnDisabled]}
          onPress={handleContinue}
          disabled={!hasAgreed || isInitializing}
        >
          <Text style={[styles.beginBtnText, (!hasAgreed || isInitializing) && styles.beginBtnTextDisabled]}>
            {isInitializing ? 'Initializing...' : 'I am ready to begin'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnSpacer: {
    width: 36,
    height: 36,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 8,
    width: 20,
  },
  bulletBody: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },
  indent: {
    paddingLeft: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 10,
  },
  
  // Table
  table: {
    borderWidth: 1,
    borderRadius: 0,
    width: '100%',
    marginBottom: 24,
    marginTop: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tableColIcon: {
    width: 120,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  tableColDesc: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  tableHeaderText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  tableCellText: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Icons in table
  circleIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  boxIcon: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative'
  },
  boxText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  btnIcon: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIconText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Warning text
  warningText: {
    color: '#dc2626',
    fontSize: 14,
    lineHeight: 22,
  },

  // Footer
  footer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    maxWidth: 800,
    alignSelf: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  beginBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  beginBtnDisabled: {
    backgroundColor: '#e2e8f0',
  },
  beginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  beginBtnTextDisabled: {
    color: '#94a3b8',
  },
});
