import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useForums, ForumPostData } from '../context/ForumsContext';

export default function ForumPostScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { userName } = useLoginModal();
  const { posts, addComment, incrementLike } = useForums();

  const passedPost = route.params?.post as ForumPostData;
  const post = posts.find(p => p.id === passedPost.id) || passedPost;

  const [commentText, setCommentText] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc'; 
  const cardBg = isDark ? '#1e293b' : '#fff'; 
  const text = isDark ? '#fff' : '#1e293b'; 
  const muted = isDark ? '#94a3b8' : '#64748b'; 
  const border = isDark ? '#1e293b' : '#e2e8f0';

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    const author = userName || 'Anonymous';
    addComment(post.id, commentText.trim(), author);
    setCommentText('');
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: bg, paddingTop: insets.top, paddingBottom: insets.bottom }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { borderBottomColor: border, backgroundColor: cardBg }]}>
        <Pressable onPress={() => navigation.goBack()} style={{padding: 8}}>
          <Ionicons name="arrow-back" size={24} color={text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: text }]} numberOfLines={1}>Discussion</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Post Details */}
        <View style={styles.postArea}>
            <View style={styles.postAuthorRow}>
                <View style={[styles.authorAvatar, { backgroundColor: cardBg }]}>
                <Text style={styles.authorInitial}>{post.authorInitial}</Text>
                </View>
                <View>
                <Text style={[styles.postAuthorName, { color: text }]}>{post.author}</Text>
                <Text style={[styles.postTime, { color: muted }]}>{post.timestamp}</Text>
                </View>
            </View>
            
            <Text style={[styles.postTitle, { color: text }]}>{post.title}</Text>
            <Text style={[styles.postSub, { color: text }]}>{post.subtitle}</Text>
            
            {post.tags.length > 0 && (
                <View style={styles.tagsRow}>
                {post.tags.map((tag, idx) => (
                    <View key={idx} style={[styles.tagPill, { backgroundColor: cardBg }]}>
                    <Text style={[styles.tagText, { color: muted }]}>#{tag}</Text>
                    </View>
                ))}
                </View>
            )}

            <View style={[styles.actionsRow, { borderBottomColor: border }]}>
                <Pressable style={styles.actionIcon} onPress={() => incrementLike(post.id)}>
                    <Ionicons name={post.userVote === 'like' ? 'heart' : 'heart-outline'} size={20} color={post.userVote === 'like' ? '#ec4899' : muted} />
                    <Text style={[styles.actionNum, { color: muted }]}>{post.likes} Likes</Text>
                </Pressable>
                <View style={styles.actionIcon}>
                    <Ionicons name="chatbubble-outline" size={20} color={muted} />
                    <Text style={[styles.actionNum, { color: muted }]}>{post.comments.length} Comments</Text>
                </View>
            </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsArea}>
            <Text style={[styles.commentsTitle, { color: text }]}>Comments</Text>
            
            {post.comments.length === 0 && (
                <Text style={{color: muted, textAlign: 'center', marginTop: 20}}>No comments yet. Be the first to start the discussion!</Text>
            )}

            {post.comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentAvatar}>
                       <Text style={{color: '#fff', fontSize: 12, fontWeight: '700'}}>{comment.authorInitial}</Text>
                    </View>
                    <View style={[styles.commentBubble, { backgroundColor: cardBg }]}>
                        <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4}}>
                            <Text style={[styles.commentAuthor, { color: text }]}>{comment.author}</Text>
                            <Text style={[styles.commentTime, { color: muted }]}>{comment.timestamp}</Text>
                        </View>
                        <Text style={[styles.commentText, { color: text }]}>{comment.text}</Text>
                    </View>
                </View>
            ))}
        </View>
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputRow, { backgroundColor: cardBg, borderTopColor: border }]}>
        <TextInput 
          style={[styles.inputField, { borderColor: border, color: text }]}
          placeholder="Write a comment..."
          placeholderTextColor={muted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <Pressable 
            style={[styles.sendBtn, !commentText.trim() && { opacity: 0.5 }]} 
            onPress={handleSendComment}
            disabled={!commentText.trim()}
        >
          <Ionicons name="send" size={18} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { paddingBottom: 24 },
  postArea: { padding: 16 },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  authorAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  authorInitial: { color: '#10b981', fontWeight: '800', fontSize: 18 },
  postAuthorName: { fontSize: 15, fontWeight: '700' },
  postTime: { fontSize: 12 },
  postTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, lineHeight: 30 },
  postSub: { fontSize: 15, lineHeight: 24, marginBottom: 16 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 13, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, gap: 24 },
  actionIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionNum: { fontSize: 14, fontWeight: '600' },
  commentsArea: { padding: 16 },
  commentsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16 },
  commentItem: { flexDirection: 'row', marginBottom: 16 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  commentBubble: { flex: 1, padding: 12, borderRadius: 12, borderTopLeftRadius: 2 },
  commentAuthor: { fontSize: 13, fontWeight: '700' },
  commentTime: { fontSize: 11 },
  commentText: { fontSize: 14, lineHeight: 20 },
  inputRow: { flexDirection: 'row', padding: 16, borderTopWidth: 1, alignItems: 'flex-end' },
  inputField: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, minHeight: 44, maxHeight: 100, fontSize: 14, marginRight: 12 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }
});
