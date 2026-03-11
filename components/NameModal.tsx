import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLoginModal } from '../context/LoginModalContext';

export default function NameModal() {
  const { nameModalVisible, closeNameModal, setHasLoggedIn, setUserName } = useLoginModal();
  const navigation = useNavigation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [name, setNameInput] = useState('');

  const modalWidth = Math.min(windowWidth * 0.9, 400);
  const cardStyle = [styles.modalCard, { width: modalWidth }];

  const handleContinue = () => {
    const trimmed = name.trim() || 'User';
    setUserName(trimmed);
    setHasLoggedIn(true);
    closeNameModal();
    navigation.navigate('Main');
  };

  return (
    <Modal
      visible={nameModalVisible}
      transparent
      animationType="fade"
      onRequestClose={closeNameModal}
      statusBarTranslucent
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable
        style={[styles.overlay, { width: windowWidth, height: windowHeight }]}
        onPress={closeNameModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <Pressable style={cardStyle} onPress={(e) => e.stopPropagation()}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>What's your name?</Text>
              <Pressable onPress={closeNameModal} style={styles.closeBtn} hitSlop={12}>
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>
            <View style={styles.body}>
              <Text style={styles.label}>Enter your name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor="#64748b"
                autoCapitalize="words"
                value={name}
                onChangeText={setNameInput}
              />
              <Pressable style={styles.continueBtn} onPress={handleContinue}>
                <Text style={styles.continueBtnText}>Continue</Text>
              </Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: '100%',
  },
  modalCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(5, 150, 105, 0.35)',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#fff', flex: 1 },
  closeBtn: { padding: 4 },
  closeText: { fontSize: 20, color: '#94a3b8' },
  body: { paddingHorizontal: 24, paddingBottom: 24, paddingTop: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 8 },
  input: {
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 20,
  },
  continueBtn: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
