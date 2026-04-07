import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { forumApi } from '../services/api';

export type Comment = {
  id: string;
  author: string;
  authorInitial: string;
  text: string;
  timestamp: string;
  replyTo?: string;
  replies: Comment[];
  edited?: boolean;
  ownedByMe?: boolean;
};

export type ForumPostData = {
  id: string;
  author: string;
  authorInitial: string;
  title: string;
  subtitle: string;
  tags: string[];
  likes: number;
  comments: Comment[];
  commentCount?: number;
  views: number;
  timestamp: string;
  userVote: 'like' | null;
};

type TopContributor = {
  name: string;
  count: number;
};

type ForumsContextType = {
  posts: ForumPostData[];
  loading: boolean;
  error: string | null;
  trendingTags: string[];
  topContributors: TopContributor[];
  totalPostsCount: number | null;
  hasMorePosts: boolean;
  refreshPosts: (force?: boolean) => Promise<void>;
  loadMorePosts: () => Promise<void>;
  loadReplies: (postId: string) => Promise<void>;
  addPost: (title: string, subtitle: string, tags: string[], author: string) => void;
  deletePost: (postId: string, actor: string) => void;
  addComment: (postId: string, text: string, author: string) => void;
  addReply: (postId: string, parentCommentId: string, text: string, author: string, replyTo: string) => void;
  editComment: (postId: string, commentId: string, text: string, actor: string) => void;
  deleteComment: (postId: string, commentId: string, actor: string) => Promise<boolean>;
  incrementLike: (postId: string) => void;
};

const ForumsContext = createContext<ForumsContextType>({
  posts: [],
  loading: false,
  error: null,
  trendingTags: [],
  topContributors: [],
  totalPostsCount: null,
  hasMorePosts: false,
  refreshPosts: async () => {},
  loadMorePosts: async () => {},
  loadReplies: async () => {},
  addPost: () => {},
  deletePost: () => {},
  addComment: () => {},
  addReply: () => {},
  editComment: () => {},
  deleteComment: async () => false,
  incrementLike: () => {},
});

export const useForums = () => useContext(ForumsContext);

const toArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.posts)) return data.posts;
  if (Array.isArray(data?.data?.posts)) return data.data.posts;
  const arr = Object.values(data || {}).find((item) => Array.isArray(item));
  return Array.isArray(arr) ? arr : [];
};

const toTimestamp = (value: any): string => {
  if (!value) return 'Just now';
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);

  const diffMs = Date.now() - dt.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return dt.toLocaleDateString();
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const isOwnedBy = (actor: string, owner: string) =>
  normalizeName(actor || 'Anonymous') === normalizeName(owner || 'Anonymous');

const isLikelyOwnedBy = (actor: string, owner: string) => {
  const normalizedActor = normalizeName(actor || '');
  const normalizedOwner = normalizeName(owner || '');
  if (!normalizedActor || !normalizedOwner) return false;
  if (normalizedActor === normalizedOwner) return true;
  if (normalizedOwner.startsWith(`${normalizedActor} `) || normalizedActor.startsWith(`${normalizedOwner} `)) return true;

  const compactActor = normalizedActor.replace(/[^a-z0-9]/g, '');
  const compactOwner = normalizedOwner.replace(/[^a-z0-9]/g, '');
  if (compactActor && compactOwner) {
    if (compactActor === compactOwner) return true;
    if (compactOwner.startsWith(compactActor) || compactActor.startsWith(compactOwner)) return true;
  }

  const actorFirst = normalizedActor.split(/\s+|_/).filter(Boolean)[0] || '';
  const ownerFirst = normalizedOwner.split(/\s+|_/).filter(Boolean)[0] || '';
  return Boolean(actorFirst && ownerFirst && actorFirst === ownerFirst);
};

const canManageCommentByActor = (actor: string, comment: Comment) =>
  Boolean(comment.ownedByMe) || isOwnedBy(actor, comment.author) || isLikelyOwnedBy(actor, comment.author);

const isClientGeneratedCommentId = (commentId: string) => /^\d{13}-[a-z0-9]{6}$/i.test(String(commentId || ''));

const mapReplyFromApi = (raw: any): Comment => {
  const author =
    raw?.authorName ||
    raw?.userName ||
    raw?.author?.fullName ||
    raw?.author?.name ||
    raw?.user?.fullName ||
    raw?.user?.name ||
    'Anonymous';

  // Consider a comment edited if updatedAt is present and different from createdAt
  const created = raw?.createdAt || raw?.timestamp;
  const updated = raw?.updatedAt;
  const edited = !!(updated && created && updated !== created);

  return {
    id: String(raw?.id || raw?._id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
    author,
    authorInitial: author.charAt(0).toUpperCase(),
    text: String(raw?.content || raw?.text || ''),
    timestamp: toTimestamp(updated || created),
    replyTo: raw?.replyTo || raw?.replyToName,
    replies: [],
    edited,
    ownedByMe: Boolean(
      raw?.ownedByMe ??
        raw?.isMine ??
        raw?.isOwner ??
        raw?.mine ??
        raw?.myReply ??
        raw?.myComment ??
        raw?.isMyReply ??
        raw?.isMyComment ??
        raw?.createdByMe ??
        raw?.isAuthor ??
        raw?.canEdit ??
        raw?.canDelete ??
        raw?.author?.isMe ??
        raw?.author?.isCurrentUser ??
        raw?.user?.isMe ??
        raw?.user?.isCurrentUser
    ),
  };
};

const buildReplyTree = (items: any[]): Comment[] => {
  const mapped = items.map((item) => ({
    ...mapReplyFromApi(item),
    parentId: item?.parentId ? String(item.parentId) : undefined,
  }));

  const mapById = new Map<string, Comment & { parentId?: string }>();
  mapped.forEach((item) => mapById.set(item.id, item));

  const roots: Array<Comment & { parentId?: string }> = [];
  mapped.forEach((item) => {
    if (item.parentId && mapById.has(item.parentId)) {
      mapById.get(item.parentId)!.replies.push(item);
    } else {
      roots.push(item);
    }
  });

  return roots;
};

const findCommentById = (comments: Comment[], commentId: string): Comment | null => {
  for (const comment of comments) {
    if (comment.id === commentId) return comment;
    const nested = findCommentById(comment.replies, commentId);
    if (nested) return nested;
  }
  return null;
};

const updateCommentInTree = (comments: Comment[], commentId: string, updater: (comment: Comment) => Comment): Comment[] => {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return updater(comment);
    }

    if (comment.replies.length === 0) return comment;

    return {
      ...comment,
      replies: updateCommentInTree(comment.replies, commentId, updater),
    };
  });
};

const removeCommentFromTree = (comments: Comment[], commentId: string): Comment[] => {
  return comments
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: removeCommentFromTree(comment.replies, commentId),
    }));
};

const mapPostFromApi = (raw: any): ForumPostData => {
  const author =
    raw?.authorName ||
    raw?.userName ||
    raw?.author?.fullName ||
    raw?.author?.name ||
    raw?.user?.fullName ||
    raw?.user?.name ||
    raw?.creatorName ||
    'Anonymous';

  const tags = Array.isArray(raw?.tags)
    ? raw.tags.map((tag: any) => String(tag))
    : Array.isArray(raw?.tagList)
    ? raw.tagList.map((tag: any) => String(tag))
    : [];

  const replyArray = toArray(raw?.replies);

  return {
    id: String(raw?.id || raw?._id || Date.now()),
    author,
    authorInitial: author.charAt(0).toUpperCase(),
    title: String(raw?.title || 'Untitled post'),
    subtitle: String(raw?.subtitle || raw?.content || ''),
    tags,
    likes: Number(raw?.likes ?? raw?.likeCount ?? raw?.stats?.likes ?? 0),
    views: Number(raw?.views ?? raw?.viewCount ?? raw?.stats?.views ?? 0),
    commentCount: Number(raw?.commentCount ?? raw?.repliesCount ?? raw?.stats?.comments ?? (Array.isArray(raw?.replies) ? raw.replies.length : 0)),
    timestamp: toTimestamp(raw?.createdAt || raw?.updatedAt || raw?.timestamp),
    comments: buildReplyTree(replyArray),
    userVote: raw?.likedByMe || raw?.userVote === 'like' ? 'like' : null,
  };
};

const extractNextCursor = (raw: any): string | null => {
  const candidates = [
    raw?.nextCursor,
    raw?.cursor,
    raw?.pagination?.nextCursor,
    raw?.pagination?.cursor,
    raw?.pagination?.next,
    raw?.pageInfo?.nextCursor,
    raw?.pageInfo?.next,
    raw?.meta?.nextCursor,
    raw?.meta?.cursor,
    raw?.data?.nextCursor,
    raw?.data?.cursor,
    raw?.data?.pagination?.nextCursor,
    raw?.data?.pagination?.cursor,
    raw?.data?.pageInfo?.nextCursor,
    raw?.data?.pageInfo?.next,
  ];
  const match = candidates.find((value) => typeof value === 'string' && value.trim().length > 0);
  return typeof match === 'string' ? match : null;
};

const extractHasMore = (raw: any): boolean | null => {
  const candidates = [
    raw?.hasMore,
    raw?.pagination?.hasMore,
    raw?.pagination?.hasNextPage,
    raw?.pageInfo?.hasMore,
    raw?.pageInfo?.hasNextPage,
    raw?.meta?.hasMore,
    raw?.meta?.hasNextPage,
    raw?.data?.hasMore,
    raw?.data?.hasNextPage,
    raw?.data?.pagination?.hasMore,
    raw?.data?.pagination?.hasNextPage,
    raw?.data?.pageInfo?.hasMore,
    raw?.data?.pageInfo?.hasNextPage,
  ];
  const match = candidates.find((value) => typeof value === 'boolean');
  return typeof match === 'boolean' ? match : null;
};

const extractTotalCount = (raw: any): number | null => {
  const candidates = [
    raw?.total,
    raw?.totalCount,
    raw?.count,
    raw?.pagination?.total,
    raw?.pagination?.count,
    raw?.pageInfo?.total,
    raw?.pageInfo?.count,
    raw?.meta?.total,
    raw?.meta?.count,
    raw?.data?.total,
    raw?.data?.totalCount,
    raw?.data?.count,
    raw?.data?.pagination?.total,
    raw?.data?.pagination?.count,
    raw?.data?.pageInfo?.total,
    raw?.data?.pageInfo?.count,
  ];
  const match = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
  return typeof match === 'number' ? match : null;
};

const normalizeCursor = (value: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const fromQuery = url.searchParams.get('cursor');
      return fromQuery && fromQuery.trim() ? fromQuery.trim() : trimmed;
    } catch {
      return trimmed;
    }
  }

  const cursorParam = /(?:^|[?&])cursor=([^&]+)/i.exec(trimmed);
  if (cursorParam?.[1]) {
    try {
      return decodeURIComponent(cursorParam[1]);
    } catch {
      return cursorParam[1];
    }
  }

  return trimmed;
};

const resolvePostVotePayload = (res: any) => {
  const payloadCandidates = [
    res?.data?.data,
    res?.data?.post,
    res?.data,
    res?.post,
    res,
  ];

  const payload =
    payloadCandidates.find(
      (item) =>
        item &&
        typeof item === 'object' &&
        (item.likes != null ||
          item.likeCount != null ||
          item?.stats?.likes != null ||
          typeof item.likedByMe === 'boolean' ||
          item.userVote === 'like' ||
          item.userVote === null)
    ) ||
    res?.data ||
    res;

  const likes = Number(payload?.likes ?? payload?.likeCount ?? payload?.stats?.likes);
  const hasLikes = Number.isFinite(likes);

  const rawUserVote = payload?.userVote;
  const likedByMe =
    typeof payload?.likedByMe === 'boolean'
      ? payload.likedByMe
      : rawUserVote === 'like'
      ? true
      : rawUserVote === null
      ? false
      : undefined;

  const hasVote =
    typeof likedByMe === 'boolean' || rawUserVote === 'like' || rawUserVote === null;

  return {
    hasLikes,
    likes,
    hasVote,
    userVote: likedByMe === true ? ('like' as const) : null,
  };
};

const toContributorsArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.contributors)) return data.contributors;
  if (Array.isArray(data?.topContributors)) return data.topContributors;
  if (Array.isArray(data?.data?.contributors)) return data.data.contributors;
  if (Array.isArray(data?.data?.topContributors)) return data.data.topContributors;
  return toArray(data);
};

export const ForumsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<ForumPostData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);
  const [totalPostsCount, setTotalPostsCount] = useState<number | null>(null);
  const [postsCursor, setPostsCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);
  const postLikeInFlightRef = useRef<Set<string>>(new Set());
  const postsRef = useRef<ForumPostData[]>([]);
  const lastLoadedAtRef = useRef(0);
  const fallbackLimitRef = useRef(3);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const createComment = (text: string, author: string, replyTo?: string): Comment => {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author,
      authorInitial: author.charAt(0).toUpperCase(),
      text,
      timestamp: 'Just now',
      replyTo,
      replies: [],
      ownedByMe: true,
    };
  };

  const addReplyToTree = (comments: Comment[], parentCommentId: string, reply: Comment): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentCommentId) {
        return { ...comment, replies: [...comment.replies, reply] };
      }

      if (comment.replies.length === 0) {
        return comment;
      }

      return {
        ...comment,
        replies: addReplyToTree(comment.replies, parentCommentId, reply),
      };
    });
  };

  const refreshPosts = useCallback(async (force = false) => {
    if (!force && postsRef.current.length > 0 && Date.now() - lastLoadedAtRef.current < 45000) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [postsRes, tagsRes, contributorsRes] = await Promise.allSettled([
        forumApi.listPosts({ limit: 3 }),
        forumApi.getTrendingTags(10),
        forumApi.getTopContributors(10),
      ]);

      if (postsRes.status === 'fulfilled') {
        const postList = toArray(postsRes.value).map(mapPostFromApi);
        const nextCursor = normalizeCursor(extractNextCursor(postsRes.value));
        const hasMoreFlag = extractHasMore(postsRes.value);
        const totalCount = extractTotalCount(postsRes.value);

        setPosts(postList);
        setPostsCursor(nextCursor);
        setHasMorePosts(
          Boolean(nextCursor) ||
            (hasMoreFlag === true) ||
            (typeof totalCount === 'number' ? postList.length < totalCount : false)
        );
        if (typeof totalCount === 'number') {
          setTotalPostsCount(totalCount);
        } else if (!nextCursor && hasMoreFlag !== true) {
          setTotalPostsCount(postList.length);
        } else {
          setTotalPostsCount(null);
        }
        fallbackLimitRef.current = Math.max(3, postList.length || 3);
        lastLoadedAtRef.current = Date.now();
      } else {
        setError(postsRes.reason?.message || 'Could not load forum posts.');
        setPostsCursor(null);
        setHasMorePosts(false);
        setTotalPostsCount(null);
      }

      if (tagsRes.status === 'fulfilled') {
        const tagsRaw = toArray(tagsRes.value);
        const tagList = tagsRaw
          .map((item) => {
            if (typeof item === 'string') return item;
            return item?.tag || item?.name || item?.word;
          })
          .filter((item): item is string => Boolean(item))
          .slice(0, 10);
        setTrendingTags(tagList);
      } else {
        setTrendingTags([]);
      }

      if (contributorsRes.status === 'fulfilled') {
        const contributorsRaw = toContributorsArray(contributorsRes.value);
        const contributors = contributorsRaw
          .map((item) => ({
            name: String(
              item?.name ||
                item?.fullName ||
                item?.userName ||
                item?.username ||
                item?.authorName ||
                item?.creatorName ||
                item?.user?.name ||
                item?.user?.fullName ||
                item?.user?.userName ||
                item?.user?.username ||
                'Unknown'
            ),
            count: Number(item?.count ?? item?.posts ?? item?.postCount ?? item?.totalPosts ?? item?.createdPosts ?? 0),
          }))
          .filter((item) => item.name.trim().length > 0)
          .slice(0, 10);
        setTopContributors(contributors);
      } else {
        setTopContributors([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load forum data.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMorePosts = useCallback(async () => {
    if (loadingMorePosts) {
      return;
    }

    setLoadingMorePosts(true);
    try {
      const previousPosts = postsRef.current;
      let nextPosts = previousPosts;
      let nextCursor: string | null = null;
      let hasMore = false;
      let resolvedTotalCount: number | null = null;

      if (postsCursor) {
        let response: any;
        try {
          response = await forumApi.listPosts({ limit: 3, cursor: postsCursor });
        } catch {
          // If cursor token becomes invalid/stale, fallback to limit-based pagination.
          const fallbackLimit = Math.max(fallbackLimitRef.current + 3, previousPosts.length + 3);
          const fallbackResponse = await forumApi.listPosts({ limit: fallbackLimit });
          const fallbackPosts = toArray(fallbackResponse).map(mapPostFromApi);

          nextPosts = fallbackPosts.slice(0, fallbackLimit);
          nextCursor = normalizeCursor(extractNextCursor(fallbackResponse));
          const hasMoreFlag = extractHasMore(fallbackResponse);
          const totalCount = extractTotalCount(fallbackResponse);
          if (typeof totalCount === 'number') {
            resolvedTotalCount = totalCount;
          }
          hasMore =
            Boolean(nextCursor) ||
            (hasMoreFlag === true) ||
            (typeof totalCount === 'number' ? nextPosts.length < totalCount : fallbackPosts.length >= fallbackLimit);
          fallbackLimitRef.current = fallbackLimit;

          setPosts(nextPosts);
          setPostsCursor(nextCursor);
          setHasMorePosts(hasMore);
          if (typeof resolvedTotalCount === 'number') {
            setTotalPostsCount(resolvedTotalCount);
          } else if (!hasMore) {
            setTotalPostsCount(nextPosts.length);
          }
          lastLoadedAtRef.current = Date.now();
          return;
        }

        const nextBatch = toArray(response).map(mapPostFromApi);
        nextCursor = normalizeCursor(extractNextCursor(response));

        const seen = new Set(previousPosts.map((item) => item.id));
        const merged = [...previousPosts];
        nextBatch.forEach((item) => {
          if (!seen.has(item.id)) {
            merged.push(item);
            seen.add(item.id);
          }
        });

        // If cursor paging returns duplicates/no growth, fallback to incremental limit pagination.
        if (merged.length === previousPosts.length) {
          const fallbackLimit = previousPosts.length + 3;
          const fallbackResponse = await forumApi.listPosts({ limit: fallbackLimit });
          const fallbackPosts = toArray(fallbackResponse).map(mapPostFromApi);
          nextPosts = fallbackPosts.slice(0, fallbackLimit);
          nextCursor = normalizeCursor(extractNextCursor(fallbackResponse));
          const hasMoreFlag = extractHasMore(fallbackResponse);
          const totalCount = extractTotalCount(fallbackResponse);
          if (typeof totalCount === 'number') {
            resolvedTotalCount = totalCount;
          }
          hasMore =
            Boolean(nextCursor) ||
            (hasMoreFlag === true) ||
            (typeof totalCount === 'number' ? nextPosts.length < totalCount : fallbackPosts.length >= fallbackLimit);
          fallbackLimitRef.current = fallbackLimit;
        } else {
          nextPosts = merged;
          const hasMoreFlag = extractHasMore(response);
          const totalCount = extractTotalCount(response);
          if (typeof totalCount === 'number') {
            resolvedTotalCount = totalCount;
          }
          hasMore =
            Boolean(nextCursor) ||
            (hasMoreFlag === true) ||
            (typeof totalCount === 'number' ? nextPosts.length < totalCount : false);
        }
      } else {
        const fallbackLimit = Math.max(fallbackLimitRef.current + 3, previousPosts.length + 3);
        const response = await forumApi.listPosts({ limit: fallbackLimit });
        const list = toArray(response).map(mapPostFromApi);

        nextPosts = list.slice(0, fallbackLimit);
        nextCursor = normalizeCursor(extractNextCursor(response));
        const hasMoreFlag = extractHasMore(response);
        const totalCount = extractTotalCount(response);
        if (typeof totalCount === 'number') {
          resolvedTotalCount = totalCount;
        }
        hasMore =
          Boolean(nextCursor) ||
          (hasMoreFlag === true) ||
          (typeof totalCount === 'number' ? nextPosts.length < totalCount : list.length >= fallbackLimit);
        fallbackLimitRef.current = fallbackLimit;
      }

      setPosts(nextPosts);
      setPostsCursor(nextCursor);
      setHasMorePosts(hasMore);
      if (typeof resolvedTotalCount === 'number') {
        setTotalPostsCount(resolvedTotalCount);
      } else if (!hasMore) {
        setTotalPostsCount(nextPosts.length);
      }
      lastLoadedAtRef.current = Date.now();
    } catch (e: any) {
      setError(e?.message || 'Could not load more forum posts. Please try again.');
    } finally {
      setLoadingMorePosts(false);
    }
  }, [loadingMorePosts, postsCursor]);

  useEffect(() => {
    void refreshPosts(true);
  }, [refreshPosts]);

  const loadReplies = useCallback(async (postId: string) => {
    try {
      const response = await forumApi.listReplies(postId, { limit: 200 });
      const replies = buildReplyTree(toArray(response));

      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;
          return { ...post, comments: replies };
        })
      );
    } catch {
      // Keep UI usable even when replies endpoint fails.
    }
  }, []);

  const addPost = (title: string, subtitle: string, tags: string[], author: string) => {
    void (async () => {
      try {
        await forumApi.createPost({ title, subtitle, tags });
        await refreshPosts(true);
      } catch {
        // Keep existing feed unchanged when API create fails.
      }
    })();
  };

  const deletePost = (postId: string, actor: string) => {
    let canDelete = false;

    const target = posts.find((post) => post.id === postId);
    if (!target || !isOwnedBy(actor, target.author)) return;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        await forumApi.deletePost(postId);
        setPosts((prev) => prev.filter((post) => post.id !== postId));
      } catch (e: any) {
        setError(e?.message || 'Failed to delete post.');
      } finally {
        setLoading(false);
        await refreshPosts(true);
      }
    })();
  };

  const addComment = (postId: string, text: string, author: string) => {
    const newComment = createComment(text, author);
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comments: [...post.comments, newComment] };
      }
      return post;
    }));

    void (async () => {
      try {
        await forumApi.addReply(postId, text);
        await loadReplies(postId);
      } finally {
        await refreshPosts(true);
      }
    })();
  };

  const addReply = (postId: string, parentCommentId: string, text: string, author: string, replyTo: string) => {
    const newReply = createComment(text, author, replyTo);
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comments: addReplyToTree(post.comments, parentCommentId, newReply) };
      }
      return post;
    }));

    void (async () => {
      try {
        await forumApi.addReply(postId, text, parentCommentId);
        await loadReplies(postId);
      } finally {
        await refreshPosts(true);
      }
    })();
  };

  const editComment = (postId: string, commentId: string, text: string, actor: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let foundTarget = false;
    let didOptimisticUpdate = false;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const target = findCommentById(post.comments, commentId);
        if (!target) return post;

        foundTarget = true;

        // If ownership flags are ambiguous, still allow backend update attempt below.
        if (!canManageCommentByActor(actor, target)) {
          return post;
        }

        didOptimisticUpdate = true;
        return {
          ...post,
          comments: updateCommentInTree(post.comments, commentId, (comment) => ({
            ...comment,
            text: trimmed,
            edited: true,
            timestamp: 'Just now',
          })),
        };
      })
    );

    if (!foundTarget || isClientGeneratedCommentId(commentId)) {
      return;
    }

    void (async () => {
      try {
        await forumApi.updateReply(postId, commentId, trimmed);
      } catch (e: any) {
        if (didOptimisticUpdate) {
          setError(e?.message || 'Failed to update comment.');
        }
      } finally {
        await loadReplies(postId);
      }
    })();
  };

  const deleteComment = async (postId: string, commentId: string, actor: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    let shouldSyncFromServer = false;

    try {
      const post = postsRef.current.find((p) => p.id === postId);
      const target = post ? findCommentById(post.comments, commentId) : null;
      if (!post || !target) {
        setError('Comment not found.');
        return false;
      }

      const likelyOwner = canManageCommentByActor(actor, target);
      const isClientOnly = isClientGeneratedCommentId(commentId);

      if (likelyOwner || isClientOnly) {
        setPosts((prev) =>
          prev.map((postItem) => {
            if (postItem.id !== postId) return postItem;
            return {
              ...postItem,
              comments: removeCommentFromTree(postItem.comments, commentId),
            };
          })
        );
      }

      if (isClientOnly) {
        return true;
      }

      shouldSyncFromServer = true;
      await forumApi.deleteReply(postId, commentId);

      // In case ownership heuristics were false-negative, remove after successful API response.
      if (!likelyOwner) {
        setPosts((prev) =>
          prev.map((postItem) => {
            if (postItem.id !== postId) return postItem;
            return {
              ...postItem,
              comments: removeCommentFromTree(postItem.comments, commentId),
            };
          })
        );
      }

      return true;
    } catch (e: any) {
      setError(e?.message || 'Failed to delete comment.');
      return false;
    } finally {
      setLoading(false);
      if (shouldSyncFromServer) {
        await loadReplies(postId);
        await refreshPosts(true);
      }
    }
  };

  const incrementLike = (postId: string) => {
    if (postLikeInFlightRef.current.has(postId)) {
      return;
    }

    const currentPost = postsRef.current.find((item) => item.id === postId);
    if (!currentPost) {
      return;
    }

    postLikeInFlightRef.current.add(postId);
    const action: 'like' | 'unlike' = currentPost.userVote === 'like' ? 'unlike' : 'like';

    // Optimistically update UI
    setPosts((prev) =>
      prev.map((item) => {
        if (item.id !== postId) return item;
        let newLikes = item.likes;
        let newVote = item.userVote;
        if (item.userVote === 'like') {
          newLikes = Math.max(0, newLikes - 1);
          newVote = null;
        } else {
          newLikes = newLikes + 1;
          newVote = 'like';
        }
        return { ...item, likes: newLikes, userVote: newVote };
      })
    );
    // Sync with backend
    void (async () => {
      try {
        let response: any;
        if (action === 'unlike') {
          response = await forumApi.unlikePost(postId);
        } else {
          response = await forumApi.likePost(postId);
        }

        const votePayload = resolvePostVotePayload(response);
        if (votePayload.hasLikes || votePayload.hasVote) {
          setPosts((prev) =>
            prev.map((item) => {
              if (item.id !== postId) return item;
              return {
                ...item,
                likes: votePayload.hasLikes ? votePayload.likes : item.likes,
                userVote: votePayload.hasVote ? votePayload.userVote : item.userVote,
              };
            })
          );
        }
      } catch {
        await refreshPosts(true);
      } finally {
        postLikeInFlightRef.current.delete(postId);
        setTimeout(() => {
          void refreshPosts(true);
        }, 500);
      }
    })();
  };

  return (
    <ForumsContext.Provider
      value={{
        posts,
        loading,
        error,
        trendingTags,
        topContributors,
        totalPostsCount,
        hasMorePosts,
        refreshPosts,
        loadMorePosts,
        loadReplies,
        addPost,
        deletePost,
        addComment,
        addReply,
        editComment,
        deleteComment,
        incrementLike,
      }}
    >
      {children}
    </ForumsContext.Provider>
  );
};
