import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
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
  const { posts, loadReplies, addComment, addReply, editComment, deleteComment, deletePost, incrementLike } = useForums();

  const passedPost = route.params?.post as ForumPostData;
  const post = posts.find(p => p.id === passedPost.id) || passedPost;

  useEffect(() => {
    void loadReplies(post.id);
  }, [loadReplies, post.id]);

  const [commentText, setCommentText] = useState('');
  const [replyTarget, setReplyTarget] = useState<ReplyTarget | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');

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

  const normalizeName = (value: string) => value.trim().toLowerCase();
  const isMyContent = (owner: string) => normalizeName(userName || 'Anonymous') === normalizeName(owner || 'Anonymous');

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

  const beginEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditComment = (comment: Comment) => {
    const next = editingCommentText.trim();
    if (!next) return;
    editComment(post.id, comment.id, next, userName || 'Anonymous');
    cancelEditComment();
  };

  const askDeleteComment = (comment: Comment) => {
    Alert.alert('Delete Comment', 'Are you sure you want to delete this comment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteComment(post.id, comment.id, userName || 'Anonymous');
          if (editingCommentId === comment.id) {
            cancelEditComment();
          }
        },
      },
    ]);
  };

  const askDeletePost = () => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this forum post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deletePost(post.id, userName || 'Anonymous');
          navigation.goBack();
        },
      },
    ]);
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.commentTime, { color: muted }]}>{comment.timestamp}</Text>
                {comment.edited && (
                  <Text style={{ color: '#059669', fontSize: 11, marginLeft: 6, fontWeight: '600' }}>
                    (edited)
                  </Text>
                )}
              </View>
            </View>
            <Text style={[styles.commentText, { color: text }]}>
              {comment.replyTo ? <Text style={styles.replyToHandle}>@{comment.replyTo} </Text> : null}
              {comment.text}
            </Text>

            {editingCommentId === comment.id ? (
              <View style={styles.editComposerWrap}>
                <TextInput
                  style={[styles.editInput, { borderColor: border, color: text }]}
                  value={editingCommentText}
                  onChangeText={setEditingCommentText}
                  multiline
                />
                <View style={styles.commentActionRow}>
                  <Pressable onPress={() => saveEditComment(comment)} hitSlop={8}>
                    <Text style={styles.replyBtnText}>Save</Text>
                  </Pressable>
                  <Pressable onPress={cancelEditComment} hitSlop={8}>
                    <Text style={[styles.replyBtnText, { color: '#64748b' }]}>Cancel</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.commentActionRow}>
                <Pressable onPress={() => handleReplyPress(comment)} style={styles.replyBtn} hitSlop={8}>
                  <Text style={styles.replyBtnText}>Reply</Text>
                </Pressable>
                {isMyContent(comment.author) && (
                  <>
                    <Pressable onPress={() => beginEditComment(comment)} style={styles.replyBtn} hitSlop={8}>
                      <Text style={styles.replyBtnText}>Edit</Text>
                    </Pressable>
                    <Pressable onPress={() => askDeleteComment(comment)} style={styles.replyBtn} hitSlop={8}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}
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
        {isMyContent(post.author) ? (
          <Pressable onPress={askDeletePost} style={{ padding: 8 }} hitSlop={8}>
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        ) : (
          <View style={{width: 40}} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Post Details */}
        <View style={[styles.postArea, styles.postCard, { backgroundColor: cardBg, borderColor: border }]}> 
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
            <Text style={[styles.postSub, { color: muted }]}>{post.subtitle}</Text>
            
            {post.tags.length > 0 && (
                <View style={styles.tagsRow}>
                {post.tags.map((tag, idx) => (
                    <View key={idx} style={[styles.tagPill, { backgroundColor: isDark ? '#05966930' : '#dcfce7' }]}>
                    <Text style={[styles.tagText, { color: '#059669' }]}>#{tag}</Text>
                    </View>
                ))}
                </View>
            )}

            <View style={[styles.actionsRow, { borderTopColor: border }]}> 
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
  postArea: { marginHorizontal: 14, marginTop: 12, marginBottom: 8, padding: 14 },
  postCard: {
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 1,
  },
  postAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  authorAvatar: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  authorInitial: { color: '#059669', fontWeight: '800', fontSize: 14 },
  postAuthorName: { fontSize: 16, fontWeight: '700' },
  postTime: { fontSize: 12 },
  postTitle: { fontSize: 24, fontWeight: '800', marginBottom: 10, lineHeight: 32, letterSpacing: 0.1 },
  postSub: { fontSize: 16, lineHeight: 26, marginBottom: 16 },
  tagsRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12, fontWeight: '700' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 2,
    borderTopWidth: 1,
    gap: 20,
  },
  actionIcon: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actionNum: { fontSize: 13, fontWeight: '700' },
  commentsArea: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  commentsTitle: { fontSize: 20, fontWeight: '800', marginBottom: 14 },
  commentBlock: { marginBottom: 12 },
  commentItem: { flexDirection: 'row', marginBottom: 4 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2 },
  commentBubble: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderTopLeftRadius: 4 },
  commentAuthor: { fontSize: 13, fontWeight: '800' },
  commentTime: { fontSize: 12 },
  commentText: { fontSize: 14, lineHeight: 20, marginTop: 3 },
  replyToHandle: { color: '#059669', fontWeight: '800' },
  commentActionRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  replyBtn: { marginTop: 8, alignSelf: 'flex-start' },
  replyBtnText: { color: '#059669', fontWeight: '700', fontSize: 13 },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },
  editComposerWrap: { marginTop: 10 },
  editInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 44,
    textAlignVertical: 'top',
  },
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
