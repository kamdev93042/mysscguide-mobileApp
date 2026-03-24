import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Modal,
  Share,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useForums, Comment as ForumComment } from '../context/ForumsContext';

export default function ForumsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { isDark, toggleTheme } = useTheme();
  const { userName } = useLoginModal();
  const { posts, addPost, incrementLike } = useForums();

  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(3);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTags, setNewTags] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc'; 
  const cardBg = isDark ? '#1e293b' : '#fff'; 
  const text = isDark ? '#fff' : '#1e293b'; 
  const muted = isDark ? '#94a3b8' : '#64748b'; 
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const primary = '#059669';

  useFocusEffect(
    useCallback(() => {
      setVisibleCount(3);
    }, [])
  );

  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (!searchQuery) return true;
      const lowerSearch = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(lowerSearch) ||
        post.subtitle.toLowerCase().includes(lowerSearch) ||
        post.author.toLowerCase().includes(lowerSearch) ||
        post.tags.some(tag => tag.toLowerCase().includes(lowerSearch))
      );
    });
  }, [posts, searchQuery]);

  const visiblePosts = useMemo(() => {
    return filteredPosts.slice(0, visibleCount);
  }, [filteredPosts, visibleCount]);

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + 3);
  };

  const handleShare = async (title: string) => {
    try {
      await Share.share({
        message: `Check out this discussion: ${title}`,
      });
    } catch (error) {
      console.log('Error sharing', error);
    }
  };

  const canSubmit = newTitle.trim().length > 0;

  const getTotalComments = useCallback((comments: ForumComment[]): number => {
    return comments.reduce((total, comment) => total + 1 + getTotalComments(comment.replies), 0);
  }, []);

  const handlePostSubmit = () => {
    if (!canSubmit) return;
    const authorName = userName || 'Anonymous';
    const tagArray = newTags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    addPost(newTitle.trim(), newSubtitle.trim(), tagArray, authorName);
    setModalVisible(false);
    setNewTitle('');
    setNewSubtitle('');
    setNewTags('');
  };

  return (
    <View style={[styles.container, { backgroundColor: bg, paddingTop: insets.top }]}>
      {/* Shared Dashboard/App Header */}
      <View style={[styles.appHeader, { borderBottomColor: border }]}>
        <View style={styles.logoRow}>
          <Image 
            source={require('../assets/sscguidelogo.png')} 
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={[styles.logoText, { color: text }]}>
            My<Text style={styles.logoHighlight}>SSC</Text>guide
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={toggleTheme} style={styles.iconBtn} hitSlop={8}>
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={20}
              color="#059669"
            />
          </Pressable>
          <Pressable
            style={styles.iconBtn}
            hitSlop={8}
            onPress={() => navigation.navigate('Notifications' as never)}
          >
            <Ionicons name="notifications-outline" size={20} color="#059669" />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Banner */}
        <View style={styles.bannerWrap}>
          <View style={styles.bannerBanner}>
             <View style={styles.bannerLeft}>
               <View style={styles.communityPill}>
                 <Ionicons name="sparkles" size={12} color="#facc15" />
                 <Text style={styles.communityPillText}>Community First</Text>
               </View>
               <Text style={styles.bannerTitle}>CONNECT, DISCUSS, AND SUCCEED TOGETHER.</Text>
               <Text style={styles.bannerSub}>Join the fastest growing community of SSC aspirants.</Text>
               <View style={styles.bannerBtns}>
                 <Pressable style={styles.btnWhite}>
                   <Text style={styles.btnWhiteText}>Start Discussing →</Text>
                 </Pressable>
                 <Pressable style={styles.btnTranslucent}>
                   <Ionicons name="flash" size={14} color="#059669" />
                   <Text style={styles.btnTranslucentText}>Enter into Live Arena</Text>
                 </Pressable>
               </View>
             </View>
          </View>
        </View>

        {/* Forums Header Area */}
        <View style={styles.sectionHeaderWrap}>
          <View style={styles.titleRow}>
             <View style={styles.iconBox}>
               <Ionicons name="people" size={24} color="#fff" />
             </View>
             <View>
                <Text style={[styles.mainTitle, { color: text }]}>Community Forums</Text>
                <Text style={styles.mainSub}>Discuss, Learn, and Grow together.</Text>
             </View>
          </View>
        </View>

        {/* Search & Create */}
        <View style={[styles.searchRow, width > 600 && { flexDirection: 'row', alignItems: 'center' }]}>
           <View style={[styles.searchBox, { backgroundColor: cardBg, borderColor: border }, width > 600 && { flex: 1, marginRight: 16, marginBottom: 0 }]}>
              <Ionicons name="search" size={20} color="#10b981" style={{marginLeft: 12}} />
              <TextInput 
                placeholder="Search posts, topics, users, or anything..."
                placeholderTextColor={muted}
                style={[styles.searchInput, { color: text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
           </View>
           <Pressable style={styles.createBtn} onPress={() => setModalVisible(true)}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createBtnText}>Create Post</Text>
           </Pressable>
        </View>

        {/* Posts List */}
        <View style={styles.postsList}>
          {visiblePosts.map((post) => (
             <Pressable 
                key={post.id} 
                style={[
                  styles.postItem, 
                  { 
                    backgroundColor: isDark ? '#1e293b' : '#fff',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                  }
                ]}
                onPress={() => navigation.navigate('ForumPost', { post })}
             >
                <View style={styles.postAuthorRow}>
                  <View style={[styles.authorAvatar, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                    <Text style={styles.authorInitial}>{post.authorInitial}</Text>
                  </View>
                  <View>
                    <Text style={[styles.postAuthorName, { color: text }]}>{post.author}</Text>
                    <Text style={[styles.postTime, { color: muted }]}>{post.timestamp}</Text>
                  </View>
                </View>
                
                <Text style={[styles.postTitle, { color: text }]}>{post.title}</Text>
                <Text style={[styles.postSub, { color: muted }]} numberOfLines={3}>{post.subtitle}</Text>
                
                {post.tags.length > 0 && (
                  <View style={styles.tagsRow}>
                    {post.tags.map((tag, idx) => (
                      <View key={idx} style={[styles.tagPill, { backgroundColor: isDark ? '#05966930' : '#dcfce7' }]}>
                        <Text style={[styles.tagText, { color: '#059669' }]}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.postActions}>
                   <View style={styles.actionGroup}>
                     <Pressable style={styles.actionIcon} onPress={() => incrementLike(post.id)}>
                       <Ionicons name={post.userVote === 'like' ? 'heart' : 'heart-outline'} size={18} color={post.userVote === 'like' ? '#ec4899' : muted} />
                       <Text style={[styles.actionNum, { color: muted }]}>{post.likes}</Text>
                     </Pressable>
                     <Pressable style={styles.actionIcon}>
                       <Ionicons name="chatbubble-outline" size={18} color={muted} />
                       <Text style={[styles.actionNum, { color: muted }]}>{getTotalComments(post.comments)}</Text>
                     </Pressable>
                     <View style={styles.actionIcon}>
                       <Ionicons name="eye-outline" size={18} color={muted} />
                       <Text style={[styles.actionNum, { color: muted }]}>{post.views}</Text>
                     </View>
                   </View>
                   <Pressable onPress={() => handleShare(post.title)} hitSlop={12}>
                     <Ionicons name="share-social-outline" size={18} color={muted} />
                   </Pressable>
                </View>
             </Pressable>
          ))}
          
          {filteredPosts.length > visibleCount && (
            <Pressable style={styles.loadMoreBtn} onPress={handleLoadMore}>
              <Text style={styles.loadMoreText}>Load More</Text>
            </Pressable>
          )}

          {filteredPosts.length <= visibleCount && filteredPosts.length > 0 && (
            <Text style={{textAlign: 'center', color: muted, marginTop: 20}}>No more posts to load.</Text>
          )}

          {filteredPosts.length === 0 && (
            <Text style={{textAlign: 'center', color: muted, marginTop: 40}}>No posts found matching your search.</Text>
          )}

        </View>

      </ScrollView>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
           <View style={[styles.modalContent, { backgroundColor: cardBg, borderColor: border, borderWidth: 1 }]}>
              <View style={[styles.modalHeader, { borderBottomColor: border }]}>
                 <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <Ionicons name="create-outline" size={24} color="#10b981" style={{marginRight: 8}} />
                   <Text style={[styles.modalTitle, { color: text }]}>Create Post</Text>
                 </View>
                 <Pressable onPress={() => setModalVisible(false)}>
                   <Ionicons name="close" size={22} color={muted} />
                 </Pressable>
              </View>
              <ScrollView>
                 <View style={styles.inputGroup}>
                   <Text style={[styles.label, { color: text }]}>Title <Text style={{color: '#ef4444'}}>*</Text></Text>
                   <TextInput 
                     style={[styles.input, { borderColor: isDark ? primary + '50' : primary, color: text, backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                     placeholder="What's on your mind? (e.g. CGL Strategy)"
                     placeholderTextColor={muted}
                     value={newTitle}
                     onChangeText={setNewTitle}
                   />
                 </View>
                 <View style={styles.inputGroup}>
                   <Text style={[styles.label, { color: text }]}>Subtitle (optional)</Text>
                   <TextInput 
                     style={[styles.input, styles.textArea, { borderColor: isDark ? primary + '50' : primary, color: text, backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                     placeholder="Brief description or context..."
                     placeholderTextColor={muted}
                     multiline
                     value={newSubtitle}
                     onChangeText={setNewSubtitle}
                   />
                 </View>
                 <View style={styles.inputGroup}>
                   <Text style={[styles.label, { color: text }]}>
                     <Ionicons name="pricetag-outline" size={14} color={muted} /> Tags (comma separated, optional)
                   </Text>
                   <TextInput 
                     style={[styles.input, { borderColor: isDark ? primary + '50' : primary, color: text, backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}
                     placeholder="quant, reasoning, tips"
                     placeholderTextColor={muted}
                     value={newTags}
                     onChangeText={setNewTags}
                   />
                 </View>

                 <View style={[styles.modalFooter, { borderTopColor: border }]}>
                    <Pressable onPress={() => setModalVisible(false)} hitSlop={10} style={{marginRight: 16}}>
                      <Text style={{color: muted, fontWeight: '700', fontSize: 14}}>Cancel</Text>
                    </Pressable>
                    <Pressable 
                      style={[styles.postBtn, { backgroundColor: primary }, !canSubmit && { opacity: 0.5 }]} 
                      onPress={handlePostSubmit}
                      disabled={!canSubmit}
                    >
                      <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>Post</Text>
                    </Pressable>
                 </View>
              </ScrollView>
           </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  appHeader: {
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
  logoHighlight: { color: '#059669' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },
  bannerWrap: { padding: 16 },
  bannerBanner: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    flexDirection: 'row',
  },
  bannerLeft: { flex: 1 },
  communityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  communityPillText: { fontSize: 11, color: '#fff', fontWeight: '600', marginLeft: 4 },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginBottom: 20 },
  bannerBtns: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  btnWhite: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  btnWhiteText: { color: '#059669', fontWeight: '700', fontSize: 13 },
  btnTranslucent: { backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center' },
  btnTranslucentText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 6 },
  sectionHeaderWrap: { paddingHorizontal: 16, marginTop: 8, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  mainTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  mainSub: { fontSize: 13, color: '#94a3b8' },
  searchRow: { paddingHorizontal: 16, marginBottom: 24 },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, fontSize: 14 },
  createBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  postsList: { paddingHorizontal: 16 },
  postItem: { 
    borderWidth: 1, 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  authorAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  authorInitial: { color: '#10b981', fontWeight: '800', fontSize: 16 },
  postAuthorName: { fontSize: 14, fontWeight: '700' },
  postTime: { fontSize: 11 },
  postTitle: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  postSub: { fontSize: 14, lineHeight: 22, opacity: 0.8, marginBottom: 12 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionGroup: { flexDirection: 'row', gap: 16 },
  actionIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionNum: { fontSize: 13, fontWeight: '500' },
  loadMoreBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: '#10b981', borderRadius: 20, marginTop: 10, marginBottom: 20 },
  loadMoreText: { color: '#10b981', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalContent: { borderRadius: 12, paddingVertical: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  inputGroup: { marginBottom: 16, paddingHorizontal: 20 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, backgroundColor: 'transparent' },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 16, marginTop: 8, borderTopWidth: 1, alignItems: 'center', paddingHorizontal: 20 },
  postBtn: { backgroundColor: '#0f766e', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }
});
