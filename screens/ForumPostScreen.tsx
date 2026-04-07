import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable, KeyboardAvoidingView, Platform, Alert, Linking, Image } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLoginModal } from '../context/LoginModalContext';
import { useForums, ForumPostData, Comment } from '../context/ForumsContext';
import { API_BASE_URL } from '../services/api';

type ReplyTarget = {
  commentId: string;
  author: string;
};

type ForumAttachment = {
  name: string;
  url: string;
  kind: 'pdf' | 'image' | 'file';
};

const safeDecode = (value: string) => {
  let current = value || '';
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(current);
      if (decoded === current) break;
      current = decoded;
    } catch {
      break;
    }
  }
  return current;
};

const normalizeForumFileUrl = (rawUrl: string): string => {
  const candidate = safeDecode((rawUrl || '').trim());
  if (!candidate) return '';

  try {
    const maybeUrl = /^https?:\/\//i.test(candidate) ? new URL(candidate) : null;
    if (maybeUrl) {
      const isS3FilePath = maybeUrl.pathname.endsWith('/api/v1/s3/file') || maybeUrl.pathname.endsWith('/s3/file');
      if (isS3FilePath) {
        const resolved = new URL(`${API_BASE_URL}/s3/file`);
        const key = maybeUrl.searchParams.get('key');
        if (key) resolved.searchParams.set('key', safeDecode(key));
        maybeUrl.searchParams.forEach((value, keyName) => {
          if (keyName !== 'key') {
            resolved.searchParams.set(keyName, value);
          }
        });
        return resolved.toString();
      }
      return maybeUrl.toString();
    }
  } catch {
    // fall through to relative URL handling
  }

  if (candidate.startsWith('/api/v1/s3/file')) {
    return `${API_BASE_URL}${candidate.replace(/^\/api\/v1/, '')}`;
  }

  if (candidate.startsWith('/s3/file')) {
    return `${API_BASE_URL}${candidate}`;
  }

  return candidate;
};

const inferAttachmentKind = (name: string, url: string, hintedType?: string): 'pdf' | 'image' | 'file' => {
  const merged = `${name} ${url}`.toLowerCase();
  if ((hintedType || '').toLowerCase() === 'pdf' || /\.pdf(?:$|\?|#)/i.test(merged)) {
    return 'pdf';
  }
  if ((hintedType || '').toLowerCase() === 'img' || (hintedType || '').toLowerCase() === 'image' || /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?|#)/i.test(merged)) {
    return 'image';
  }
  return 'file';
};

const parseForumMediaContent = (input: string): { cleanText: string; attachments: ForumAttachment[] } => {
  const source = input || '';
  const attachments: ForumAttachment[] = [];

  const addAttachment = (payloadText: string, hintedType?: string) => {
    const payload = (payloadText || '').trim();
    if (!payload) return;

    const decodedPayload = safeDecode(payload);
    let name = 'Attachment';
    let rawUrl = '';

    if (decodedPayload.includes('][')) {
      const [left, ...rest] = decodedPayload.split('][');
      name = safeDecode((left || '').replace(/^\[/, '').replace(/\]$/, '').trim()) || name;
      rawUrl = rest.join('][').replace(/^\[/, '').replace(/\]$/, '').trim();
    } else if (decodedPayload.includes('|')) {
      const [left, ...rest] = decodedPayload.split('|');
      name = safeDecode((left || '').trim()) || name;
      rawUrl = rest.join('|').trim();
    } else {
      const markdownUrl = decodedPayload.match(/\((https?:[^)]+)\)/i)?.[1];
      const plainUrl = decodedPayload.match(/https?:\/\/\S+/i)?.[0];
      const relativeUrl = decodedPayload.match(/\/(api\/v1\/)?s3\/file\?[^\s\]]+/i)?.[0];
      rawUrl = markdownUrl || plainUrl || relativeUrl || decodedPayload;
      const maybeName = decodedPayload
        .replace(/\(https?:[^)]+\)/i, '')
        .replace(/https?:\/\/\S+/i, '')
        .replace(/\/(api\/v1\/)?s3\/file\?[^\s\]]+/i, '')
        .trim();
      if (maybeName) name = safeDecode(maybeName);
    }

    const normalizedUrl = normalizeForumFileUrl(rawUrl.replace(/^\[/, '').replace(/\]$/, '').trim());
    if (!/^https?:\/\//i.test(normalizedUrl)) return;

    const finalName = (() => {
      const cleaned = name.replace(/^\[|\]$/g, '').trim();
      if (cleaned && cleaned.toLowerCase() !== 'pdf') return cleaned;
      try {
        const url = new URL(normalizedUrl);
        const key = url.searchParams.get('key');
        if (key) {
          const tail = safeDecode(key).split('/').filter(Boolean).pop();
          if (tail) return tail;
        }
      } catch {
        // ignore
      }
      return hintedType === 'pdf' ? 'Attachment.pdf' : 'Attachment';
    })();

    if (!attachments.some((item) => item.url === normalizedUrl)) {
      attachments.push({
        name: finalName,
        url: normalizedUrl,
        kind: inferAttachmentKind(finalName, normalizedUrl, hintedType),
      });
    }
  };

  let cleanText = source.replace(/\[(pdf|img|image|file)\]([\s\S]*?)\[\/\1\]/gi, (_full, tagType, payload) => {
    addAttachment(payload, String(tagType || ''));
    return ' ';
  });

  const danglingMatch = /\[(pdf|img|image|file)\]([\s\S]*)$/i.exec(cleanText);
  if (danglingMatch) {
    addAttachment(danglingMatch[2], String(danglingMatch[1] || ''));
    cleanText = cleanText.slice(0, danglingMatch.index);
  }

  cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
  return { cleanText, attachments };
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
  const parsedSubtitle = useMemo(() => parseForumMediaContent(post.subtitle || ''), [post.subtitle]);

  const normalizeName = (value: string) => value.trim().toLowerCase();
  const isMyContent = (owner: string) => {
    const me = normalizeName(userName || '');
    const author = normalizeName(owner || '');
    if (!me || !author) return false;
    if (me === author) return true;
    if (author.startsWith(`${me} `) || me.startsWith(`${author} `)) return true;

    const compactMe = me.replace(/[^a-z0-9]/g, '');
    const compactAuthor = author.replace(/[^a-z0-9]/g, '');
    if (compactMe && compactAuthor) {
      if (compactMe === compactAuthor) return true;
      if (compactAuthor.startsWith(compactMe) || compactMe.startsWith(compactAuthor)) return true;
    }

    const meFirst = me.split(/\s+|_/).filter(Boolean)[0] || '';
    const authorFirst = author.split(/\s+|_/).filter(Boolean)[0] || '';
    return Boolean(meFirst && authorFirst && meFirst === authorFirst);
  };
  const canManageComment = (comment: Comment) => Boolean(comment.ownedByMe) || isMyContent(comment.author);

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
          void (async () => {
            const deleted = await deleteComment(post.id, comment.id, userName || 'Anonymous');
            if (deleted && editingCommentId === comment.id) {
              cancelEditComment();
            }
            if (!deleted) {
              Alert.alert('Delete failed', 'You can only delete your own comment or the request failed.');
            }
          })();
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

  const openExternalUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Unable to open file', 'This file link is not supported on this device.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Unable to open file', 'Could not open this file. Please try again.');
    }
  };

  const handleViewAttachment = (url: string) => {
    void openExternalUrl(url);
  };

  const handleDownloadAttachment = (attachment: ForumAttachment) => {
    try {
      const url = new URL(attachment.url);
      url.searchParams.set('download', '1');
      if (attachment.name) {
        const fileName = attachment.name.toLowerCase().endsWith('.pdf') || attachment.kind !== 'pdf'
          ? attachment.name
          : `${attachment.name}.pdf`;
        url.searchParams.set('name', fileName);
      }
      void openExternalUrl(url.toString());
    } catch {
      void openExternalUrl(attachment.url);
    }
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
                {canManageComment(comment) && (
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
            {parsedSubtitle.cleanText ? <Text style={[styles.postSub, { color: muted }]}>{parsedSubtitle.cleanText}</Text> : null}

            {parsedSubtitle.attachments.length > 0 ? (
              <View style={[styles.attachmentCard, { borderColor: border, backgroundColor: isDark ? '#0b1220' : '#f8fafc' }]}>
                {parsedSubtitle.attachments.map((attachment, index) => (
                  <View key={`${attachment.url}-${index}`} style={styles.attachmentRow}>
                    <Text numberOfLines={1} style={[styles.attachmentName, { color: text }]}>{attachment.name}</Text>

                    {attachment.kind === 'image' ? (
                      <Image
                        source={{ uri: attachment.url }}
                        style={styles.attachmentPreview}
                        resizeMode="cover"
                      />
                    ) : null}

                    <View style={styles.attachmentActions}>
                      <Pressable style={[styles.attachmentBtn, { borderColor: '#10b981' }]} onPress={() => handleViewAttachment(attachment.url)}>
                        <Text style={styles.attachmentBtnText}>View</Text>
                      </Pressable>
                      <Pressable style={[styles.attachmentBtn, { borderColor: '#2563eb' }]} onPress={() => handleDownloadAttachment(attachment)}>
                        <Text style={[styles.attachmentBtnText, { color: '#2563eb' }]}>Download</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}
            
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
  attachmentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    gap: 10,
  },
  attachmentRow: { gap: 8 },
  attachmentName: { fontSize: 13, fontWeight: '700' },
  attachmentPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
  },
  attachmentActions: { flexDirection: 'row', gap: 8 },
  attachmentBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  attachmentBtnText: { color: '#059669', fontSize: 12, fontWeight: '700' },
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
