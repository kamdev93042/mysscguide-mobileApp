import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useForums, ForumPostData, Comment } from '../context/ForumsContext';

type ReplyTarget = {
  commentId: string;
  author: string;
};

export default function ForumPostScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { userName } = useLoginModal();
  const { posts, addComment, addReply, incrementLike } = useForums();

  const passedPost = route.params?.post as ForumPostData;
  const post = posts.find(p => p.id === passedPost.id) || passedPost;

  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);

  const bg = isDark ? '#0f172a' : '#f8fafc'; 
  const cardBg = isDark ? '#1e293b' : '#fff'; 
  const text = isDark ? '#fff' : '#1e293b'; 
  const muted = isDark ? '#94a3b8' : '#64748b'; 
  const border = isDark ? '#1e293b' : '#e2e8f0';
  const primary = '#059669';

  const getTotalComments = (comments: Comment[]): number => {
    return comments.reduce((total, comment) => total + 1 + getTotalComments(comment.replies), 0);
  };

  const totalCommentCount = useMemo(() => getTotalComments(post.comments), [post.comments]);

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    const author = userName || 'Anonymous';

    if (replyTarget) {
      addReply(post.id, replyTarget.commentId, commentText.trim(), author, replyTarget.author);
    } else {
      addComment(post.id, commentText.trim(), author);
    }

    setCommentText('');
    setReplyTarget(null);
  };

  const handleReplyPress = (comment: Comment) => {
    setReplyTarget({ commentId: comment.id, author: comment.author });
  };

  const renderComment = (comment: Comment, depth = 0): React.ReactNode => {
    const indent = Math.min(depth, 4) * 16;

    return (
      <View key={comment.id} style={[styles.commentBlock, { marginLeft: indent }]}>
        <View style={styles.commentItem}>
          <View style={[styles.commentAvatar, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
            <Text style={{ color: primary, fontSize: 13, fontWeight: '800' }}>{comment.authorInitial}</Text>
          </View>
          <View style={[styles.commentBubble, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: isDark ? '#334155' : '#e2e8f0', borderWidth: 1 }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={[styles.commentAuthor, { color: text }]}>{comment.author}</Text>
              <Text style={[styles.commentTime, { color: muted }]}>{comment.timestamp}</Text>
            </View>
            <Text style={[styles.commentText, { color: text }]}>
              {comment.replyTo ? <Text style={styles.replyToHandle}>@{comment.replyTo} </Text> : null}
              {comment.text}
            </Text>
            <Pressable onPress={() => handleReplyPress(comment)} style={styles.replyBtn} hitSlop={8}>
              <Text style={styles.replyBtnText}>Reply</Text>
            </Pressable>
          </View>
        </View>

        {comment.replies.length > 0 && (
          <View style={styles.repliesWrap}>
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </View>
        )}
      </View>
    );
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
                <View style={[styles.authorAvatar, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                  <Text style={[styles.authorInitial, { color: primary }]}>{post.authorInitial}</Text>
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
                    <View key={idx} style={[styles.tagPill, { backgroundColor: isDark ? '#05966930' : '#dcfce7' }]}>
                    <Text style={[styles.tagText, { color: '#059669' }]}>#{tag}</Text>
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
                  <Text style={[styles.actionNum, { color: muted }]}>{totalCommentCount} Comments</Text>
                </View>
            </View>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsArea}>
            <Text style={[styles.commentsTitle, { color: text }]}>Comments</Text>
            
            {totalCommentCount === 0 && (
                <Text style={{color: muted, textAlign: 'center', marginTop: 20}}>No comments yet. Be the first to start the discussion!</Text>
            )}

            {post.comments.map((comment) => renderComment(comment))}
        </View>
      </ScrollView>

      {/* Input Area */}
      <View style={[styles.inputRow, { backgroundColor: cardBg, borderTopColor: border }]}>
        {replyTarget && (
          <View style={[styles.replyingBanner, { borderColor: border, backgroundColor: isDark ? '#0b1220' : '#f1f5f9' }]}>
            <Text style={[styles.replyingText, { color: text }]}>Replying to @{replyTarget.author}</Text>
            <Pressable onPress={() => setReplyTarget(null)}>
              <Text style={[styles.cancelReplyText, { color: muted }]}>Cancel</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.inputComposerRow}>
          <TextInput 
            style={[styles.inputField, { borderColor: border, color: text }]}
            placeholder={replyTarget ? `Reply to @${replyTarget.author}...` : 'Write a comment...'}
            placeholderTextColor={muted}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <Pressable 
              style={[styles.sendBtn, { backgroundColor: primary }, !commentText.trim() && { opacity: 0.5 }]} 
              onPress={handleSendComment}
              disabled={!commentText.trim()}
          >
            <Ionicons name="send" size={18} color="#fff" />
          </Pressable>
        </View>
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
  authorAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  authorInitial: { color: '#059669', fontWeight: '800', fontSize: 16 },
  postAuthorName: { fontSize: 15, fontWeight: '700' },
  postTime: { fontSize: 12 },
  postTitle: { fontSize: 24, fontWeight: '800', marginBottom: 12, lineHeight: 32 },
  postSub: { fontSize: 16, lineHeight: 26, marginBottom: 20, opacity: 0.9 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  tagText: { fontSize: 13, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, gap: 24 },
  actionIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionNum: { fontSize: 15, fontWeight: '700' },
  commentsArea: { padding: 16 },
  commentsTitle: { fontSize: 18, fontWeight: '800', marginBottom: 20 },
  commentBlock: { marginBottom: 16 },
  commentItem: { flexDirection: 'row', marginBottom: 4 },
  commentAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 4 },
  commentBubble: { flex: 1, padding: 16, borderRadius: 16, borderTopLeftRadius: 4 },
  commentAuthor: { fontSize: 14, fontWeight: '800' },
  commentTime: { fontSize: 12 },
  commentText: { fontSize: 15, lineHeight: 22, marginTop: 4 },
  replyToHandle: { color: '#059669', fontWeight: '800' },
  replyBtn: { marginTop: 10, alignSelf: 'flex-start' },
  replyBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },
  repliesWrap: { marginTop: 8 },
  inputRow: { padding: 16, borderTopWidth: 1, alignItems: 'stretch', paddingBottom: Platform.OS === 'ios' ? 24 : 16 },
  replyingBanner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  replyingText: { fontSize: 14, fontWeight: '700' },
  cancelReplyText: { fontSize: 13, fontWeight: '700' },
  inputComposerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  inputField: { flex: 1, borderWidth: 1, borderRadius: 24, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 14, minHeight: 48, maxHeight: 120, fontSize: 15, marginRight: 12 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' }
});
