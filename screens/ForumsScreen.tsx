import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useLoginModal } from '../context/LoginModalContext';
import { Comment as ForumComment, useForums } from '../context/ForumsContext';
import { useHasUnreadNotifications } from '../hooks/useHasUnreadNotifications';

type FeedTab = 'all' | 'announcements' | 'discussion';

const AVATAR_COLORS = ['#ec4899', '#10b981', '#8b5cf6', '#f59e0b', '#3b82f6'];

export default function ForumsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { userName } = useLoginModal();
  const hasUnreadNotifications = useHasUnreadNotifications();
  const { posts, loading, error, refreshPosts, loadMorePosts, hasMorePosts, addPost, deletePost, incrementLike, trendingTags, topContributors, totalPostsCount } = useForums();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FeedTab>('all');

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const heroGradientId = useMemo(() => `forumHero-${Math.random().toString(36).slice(2, 8)}`, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPosts(true);
      return () => {
        setModalVisible(false);
      };
    }, [refreshPosts])
  );

  const displayName = (userName || 'User').trim() || 'User';
  const avatarText = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

  const normalizeName = (value: string) => value.trim().toLowerCase();
  const isMyPost = (author: string) => normalizeName(userName || 'Anonymous') === normalizeName(author || 'Anonymous');

  const getTotalComments = useCallback((comments: ForumComment[]): number => {
    return comments.reduce((total, comment) => total + 1 + getTotalComments(comment.replies), 0);
  }, []);

  const toCategory = (post: any): string => {
    if (Array.isArray(post.tags) && post.tags.length > 0) {
      return String(post.tags[0]);
    }

    const text = `${post.title || ''} ${post.subtitle || ''}`.toLowerCase();
    if (text.includes('announce') || text.includes('notice') || text.includes('update')) {
      return 'Announcements';
    }
    if (text.includes('discussion') || text.includes('doubt') || text.includes('query') || text.includes('help')) {
      return 'General Discussion';
    }
    return 'Mock Analysis';
  };

  const matchesTab = (post: any) => {
    if (activeTab === 'all') return true;
    const category = toCategory(post).toLowerCase();

    if (activeTab === 'announcements') {
      return category.includes('announcement') || category.includes('notice') || category.includes('update');
    }

    return category.includes('discussion') || category.includes('general') || category.includes('doubt') || category.includes('query');
  };

  const visiblePosts = useMemo(() => {
    const lowerSearch = searchQuery.trim().toLowerCase();

    return posts.filter((post) => {
      if (!matchesTab(post)) return false;
      if (!lowerSearch) return true;

      return (
        post.title.toLowerCase().includes(lowerSearch) ||
        post.subtitle.toLowerCase().includes(lowerSearch) ||
        post.author.toLowerCase().includes(lowerSearch) ||
        post.tags.some((tag) => tag.toLowerCase().includes(lowerSearch))
      );
    });
  }, [posts, searchQuery, activeTab]);

  const tagsToRender = trendingTags;

  const contributorsToRender = topContributors.map((item, index) => ({
    name: item.name,
    posts: Number(item.count || 0),
    rank: index + 1,
  }));

  const forumsCountLabel =
    typeof totalPostsCount === 'number'
      ? `Total forums: ${totalPostsCount} | Loaded: ${posts.length}`
      : `Loaded forums: ${posts.length}`;

  const renderedPosts = visiblePosts;

  const canShowLoadMore = hasMorePosts && !loadingMorePosts;

  const handleLoadMoreForums = async () => {
    if (!hasMorePosts) return;

    setLoadingMorePosts(true);
    try {
      await loadMorePosts();
    } finally {
      setLoadingMorePosts(false);
    }
  };

  const webNoScrollbar = Platform.OS === 'web' ? ({ scrollbarWidth: 'none', overflowX: 'auto', overflowY: 'hidden' } as any) : undefined;
  const webNoWrap = Platform.OS === 'web' ? ({ display: 'flex', flexWrap: 'nowrap' } as any) : undefined;

  const handleShare = async (title: string) => {
    try {
      await Share.share({ message: `Check out this discussion: ${title}` });
    } catch {
      // no-op
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(postId);
          try {
            await deletePost(postId, userName || 'Anonymous');
          } catch {
            Alert.alert('Error', 'Failed to delete post.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const canSubmit = newTitle.trim().length > 0;

  const handlePostSubmit = () => {
    if (!canSubmit) return;
    const authorName = userName || 'Anonymous';
    const tagArray = newTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    addPost(newTitle.trim(), newSubtitle.trim(), tagArray, authorName);
    setModalVisible(false);
    setNewTitle('');
    setNewSubtitle('');
    setNewTags('');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.appHeader}>
        <View style={styles.headerTopRow}>
          <View style={styles.logoRow}>
            <Image source={require('../assets/sscguidelogo.png')} style={styles.headerLogo} resizeMode="contain" />
            <Text style={styles.logoText}>
              My<Text style={styles.logoHighlight}>SSC</Text>guide
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable style={styles.iconBtn} hitSlop={8} onPress={() => navigation.navigate('Notifications' as never)}>
              <Ionicons name="notifications" size={18} color="#f59e0b" />
              {hasUnreadNotifications ? <View style={styles.notificationDot} /> : null}
            </Pressable>
            <Pressable style={styles.avatar} onPress={() => navigation.navigate('MenuDrawer' as never)}>
              <Text style={styles.avatarText}>{avatarText}</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 360 220" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id={heroGradientId} x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#19b38d" />
                <Stop offset="100%" stopColor="#0d8f74" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="360" height="220" rx="16" fill={`url(#${heroGradientId})`} />
            <Circle cx="320" cy="26" r="56" fill="rgba(255,255,255,0.14)" />
            <Circle cx="32" cy="196" r="40" fill="rgba(255,255,255,0.1)" />
          </Svg>

          <View style={styles.communityPill}>
            <Text style={styles.communityPillText}>Community First</Text>
          </View>

          <Text style={styles.heroTitle}>
            CONNECT, DISCUSS, AND {'\n'}
            <Text style={styles.heroTitleAccent}>SUCCEED TOGETHER.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>Join the fastest growing community of SSC aspirants.</Text>

          <Pressable style={styles.heroCta}>
            <Text style={styles.heroCtaText}>Start Discussing →</Text>
          </Pressable>
        </View>

        <View style={styles.blogsCard}>
          <View style={styles.blogsHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.blogsTitle}>Community Blogs</Text>
              <Text style={styles.blogsSub}>Share strategies, mock analysis, and exam tips with the community.</Text>
            </View>
            <Pressable style={styles.writeBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.writeBtnText}>+ Write Blog</Text>
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#94a3b8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search blogs, tags, or users..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>
        </View>

        <View style={[styles.sectionHeaderSimple, { marginTop: 24 }]}>
          <View style={styles.sectionTitleIconRow}>
            <Ionicons name="trending-up" size={17} color="#ea580c" />
            <Text style={styles.sectionTitle}>Trending Tags</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          style={webNoScrollbar}
          contentContainerStyle={[styles.tagsScrollRow, webNoWrap]}
          showsHorizontalScrollIndicator={false}
        >
          {tagsToRender.map((tag, index) => {
            return (
              <View key={`${tag}-${index}`} style={styles.tagChip}>
                <Text style={styles.tagText}># {tag}</Text>
              </View>
            );
          })}
        </ScrollView>
        {tagsToRender.length === 0 ? <Text style={styles.emptyInlineText}>No trending tags available yet.</Text> : null}

        <View style={[styles.sectionTopRow, { marginTop: 24 }]}>
          <View style={styles.sectionTitleIconRow}>
            <Ionicons name="people" size={17} color="#1a9e75" />
            <Text style={styles.sectionTitle}>Top Contributors</Text>
          </View>
        </View>
        <ScrollView
          horizontal
          style={webNoScrollbar}
          contentContainerStyle={[styles.contributorsRow, webNoWrap]}
          showsHorizontalScrollIndicator={false}
        >
          {contributorsToRender.map((item, index) => {
            const initials = (item.name || 'U')
              .split(/\s+|_/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part.charAt(0).toUpperCase())
              .join('') || 'U';

            return (
              <View key={`${item.name}-${index}`} style={styles.contributorCard}>
                <View style={[styles.contributorAvatar, { backgroundColor: AVATAR_COLORS[index % AVATAR_COLORS.length] }]}>
                  <Text style={styles.contributorAvatarText}>{initials}</Text>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankBadgeText}>{item.rank}</Text>
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.contributorName}>{item.name}</Text>
                <Text style={styles.contributorPoints}>{item.posts} posts</Text>
              </View>
            );
          })}
        </ScrollView>
        {contributorsToRender.length === 0 ? <Text style={styles.emptyInlineText}>No contributors found yet.</Text> : null}

        <Text style={styles.forumsCountText}>{forumsCountLabel}</Text>

        <View style={styles.feedTabsRow}>
          <Pressable style={[styles.feedTab, activeTab === 'all' && styles.feedTabActive]} onPress={() => setActiveTab('all')}>
            <Text style={[styles.feedTabText, activeTab === 'all' && styles.feedTabTextActive]}>All Posts</Text>
          </Pressable>
          <Pressable style={[styles.feedTab, activeTab === 'announcements' && styles.feedTabActive]} onPress={() => setActiveTab('announcements')}>
            <Text style={[styles.feedTabText, activeTab === 'announcements' && styles.feedTabTextActive]}>Announcements</Text>
          </Pressable>
          <Pressable style={[styles.feedTab, activeTab === 'discussion' && styles.feedTabActive]} onPress={() => setActiveTab('discussion')}>
            <Text style={[styles.feedTabText, activeTab === 'discussion' && styles.feedTabTextActive]}>General Discussion</Text>
          </Pressable>
        </View>

        {loading && posts.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="small" color="#1a9e75" />
            <Text style={styles.centerStateText}>Loading posts...</Text>
          </View>
        ) : null}

        {error === 'LOGIN_REQUIRED' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Login Required</Text>
            <Text style={styles.errorText}>Please log in to access Community Forums and create posts.</Text>
            <Pressable style={styles.loginBtn} onPress={() => navigation.navigate('Profile' as never)}>
              <Text style={styles.loginBtnText}>Log In</Text>
            </Pressable>
          </View>
        ) : null}

        {error && error !== 'LOGIN_REQUIRED' ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Could not load posts</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.loginBtn} onPress={() => void refreshPosts(true)}>
              <Text style={styles.loginBtnText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {renderedPosts.map((post) => {
          const category = toCategory(post);
          const heading = post.title.trim().length > 0 ? post.title : category;
          const rawBody = post.subtitle || '';
          const hasAttachmentTag = /\[(pdf|img|image|file)\]/i.test(rawBody);
          const body = rawBody
            .replace(/\[(pdf|img|image|file)\]([\s\S]*?)\[\/\1\]/gi, ' ')
            .replace(/\[(pdf|img|image|file)\][\s\S]*/i, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim();
          const bodyToShow = body || (hasAttachmentTag ? 'Attachment included. Open post to view/download.' : '');
          return (
            <Pressable key={post.id} style={styles.postCard} onPress={() => navigation.navigate('ForumPost', { post })}>
              <View style={styles.postTopRow}>
                <View style={styles.postAuthorWrap}>
                  <View style={styles.postAvatar}>
                    <Text style={styles.postAvatarText}>{post.authorInitial || 'U'}</Text>
                  </View>
                  <View>
                    <Text style={styles.postAuthor}>{post.author}</Text>
                    <Text style={styles.postTime}>{post.timestamp}</Text>
                  </View>
                </View>
                <View style={styles.postTopActions}>
                  {isMyPost(post.author) ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeletePost(post.id);
                      }}
                      hitSlop={10}
                      disabled={deletingId === post.id}
                    >
                      {deletingId === post.id ? (
                        <ActivityIndicator size={16} color="#ef4444" />
                      ) : (
                        <Ionicons name="trash-outline" size={17} color="#ef4444" />
                      )}
                    </Pressable>
                  ) : null}
                  <Ionicons name="ellipsis-horizontal" size={18} color="#94a3b8" />
                </View>
              </View>

              <Text style={styles.postCategory}>{heading}</Text>

              {bodyToShow ? (
                <View style={styles.quoteWrap}>
                  <Text numberOfLines={3} style={styles.quoteText}>{bodyToShow}</Text>
                </View>
              ) : null}

              <View style={styles.postFooter}>
                <View style={styles.footerStatsRow}>
                  <Pressable
                    style={styles.statAction}
                    onPress={(e) => {
                      e.stopPropagation();
                      incrementLike(post.id);
                    }}
                  >
                    <Ionicons name={post.userVote === 'like' ? 'heart' : 'heart-outline'} size={19} color={post.userVote === 'like' ? '#ec4899' : '#94a3b8'} />
                    <Text style={styles.statText}>{post.likes}</Text>
                  </Pressable>

                  <View style={styles.statAction}>
                    <Ionicons name="chatbubble-outline" size={19} color="#94a3b8" />
                    <Text style={styles.statText}>{typeof post.commentCount === 'number' ? post.commentCount : getTotalComments(post.comments)}</Text>
                  </View>

                  <View style={styles.statAction}>
                    <Ionicons name="eye-outline" size={19} color="#94a3b8" />
                    <Text style={styles.statText}>{post.views}</Text>
                  </View>
                </View>

                <Pressable
                  style={styles.shareBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    void handleShare(post.title);
                  }}
                >
                  <Ionicons name="share-social" size={18} color="#64748b" />
                </Pressable>
              </View>
            </Pressable>
          );
        })}

        {canShowLoadMore ? (
          <Pressable style={styles.loadMoreBtn} onPress={() => void handleLoadMoreForums()} disabled={loadingMorePosts}>
            <Text style={styles.loadMoreBtnText}>{loadingMorePosts ? 'Loading...' : 'Load More'}</Text>
          </Pressable>
        ) : null}

        {visiblePosts.length === 0 && !loading && !error ? <Text style={styles.emptyText}>No posts found for this filter.</Text> : null}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Write Blog</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBodyContent}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="What's on your mind?"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
              />

              <Text style={styles.inputLabel}>Subtitle</Text>
              <TextInput
                value={newSubtitle}
                onChangeText={setNewSubtitle}
                placeholder="Brief post preview..."
                placeholderTextColor="#94a3b8"
                style={[styles.modalInput, styles.modalTextArea]}
                multiline
              />

              <Text style={styles.inputLabel}>Tags (comma separated)</Text>
              <TextInput
                value={newTags}
                onChangeText={setNewTags}
                placeholder="mock analysis, gk, strategy"
                placeholderTextColor="#94a3b8"
                style={styles.modalInput}
              />

              <View style={styles.modalFooterRow}>
                <Pressable onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.postBtn, !canSubmit && { opacity: 0.5 }]} disabled={!canSubmit} onPress={handlePostSubmit}>
                  <Text style={styles.postBtnText}>Post</Text>
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
  container: { flex: 1, backgroundColor: '#ffffff' },
  appHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerLogo: { width: 44, height: 44 },
  logoText: { fontSize: 18, fontWeight: '700', marginLeft: -4, color: '#0f172a' },
  logoHighlight: { color: '#1a9e75' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  notificationDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ef4444',
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1a9e75',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 10, fontWeight: '800', color: '#ffffff' },

  scrollContent: { padding: 14, paddingBottom: 28 },

  heroCard: {
    borderRadius: 16,
    padding: 14,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: '#0d8f74',
  },
  communityPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },
  communityPillText: { color: '#e8fff8', fontSize: 11, fontWeight: '700' },
  heroTitle: { color: '#ffffff', fontSize: 22, lineHeight: 28, fontWeight: '800', maxWidth: 420 },
  heroTitleAccent: { color: '#b8ffd8' },
  heroSubtitle: { marginTop: 8, color: '#eafff5', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  heroCta: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  heroCtaText: { color: '#1a9e75', fontSize: 13, fontWeight: '800' },

  blogsCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
    marginBottom: 12,
  },
  blogsHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  blogsTitle: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
  blogsSub: { marginTop: 2, color: '#64748b', fontSize: 12, fontWeight: '600' },
  writeBtn: {
    backgroundColor: '#1a9e75',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  writeBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 12 },
  searchWrap: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d8e1ea',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0f172a', paddingVertical: 8 },

  sectionHeaderSimple: { marginTop: 4, marginBottom: 10 },
  sectionTopRow: { marginTop: 14, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },

  tagsScrollRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingBottom: 2,
  },
  tagChip: {
    borderWidth: 1,
    borderColor: '#d8e1ea',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagText: { color: '#334155', fontSize: 13, fontWeight: '700' },
  emptyInlineText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },

  contributorsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  contributorCard: {
    minWidth: 112,
    width: 118,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  contributorAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  contributorAvatarText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  rankBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#f59e0b',
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeText: { color: '#ffffff', fontSize: 9, fontWeight: '900' },
  contributorName: { color: '#0f172a', fontSize: 11, fontWeight: '800' },
  contributorPoints: { color: '#1a9e75', fontSize: 12, fontWeight: '800', marginTop: 3 },
  forumsCountText: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 12 },

  feedTabsRow: { flexDirection: 'row', gap: 7, marginTop: 14, marginBottom: 10 },
  feedTab: {
    borderWidth: 1,
    borderColor: '#d8e1ea',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#ffffff',
  },
  feedTabActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  feedTabText: { color: '#475569', fontWeight: '700', fontSize: 12 },
  feedTabTextActive: { color: '#ffffff' },

  centerState: { paddingVertical: 16, alignItems: 'center' },
  centerStateText: { marginTop: 8, color: '#64748b', fontWeight: '600' },

  postCard: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 12,
    marginBottom: 10,
  },
  postTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  postAuthorWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2f7ef',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: { color: '#1a9e75', fontWeight: '900', fontSize: 14 },
  postAuthor: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  postTime: { color: '#64748b', fontWeight: '600', fontSize: 12, marginTop: 1 },
  postTopActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  postCategory: { marginTop: 10, color: '#0f172a', fontSize: 15, fontWeight: '800' },
  quoteWrap: {
    marginTop: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#d8e1ea',
    paddingLeft: 10,
  },
  quoteText: { color: '#475569', fontSize: 13, lineHeight: 20, fontWeight: '600' },

  postFooter: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#64748b', fontSize: 13, fontWeight: '700' },
  shareBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },

  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 14, fontWeight: '600' },
  loadMoreBtn: {
    marginTop: 10,
    marginBottom: 8,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  loadMoreBtnText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '700',
  },

  errorCard: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff1f2',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  errorTitle: { color: '#be123c', fontWeight: '800', fontSize: 16 },
  errorText: { color: '#9f1239', marginTop: 4, fontWeight: '600' },
  loginBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#1a9e75',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  loginBtnText: { color: '#ffffff', fontWeight: '800' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    maxHeight: '72%',
    width: '92%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  modalBodyContent: { paddingBottom: 6 },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 16, color: '#0f172a', fontWeight: '800' },
  inputLabel: { color: '#334155', fontWeight: '700', marginBottom: 8, marginTop: 4 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d8e1ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    marginBottom: 12,
  },
  modalTextArea: { minHeight: 76, textAlignVertical: 'top' },
  modalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  postBtn: {
    backgroundColor: '#1a9e75',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  postBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
});
