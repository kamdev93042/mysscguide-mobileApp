import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

const INITIAL_POSTS: ForumPostData[] = [
  {
    id: 'demo-1',
    author: 'Rahul Kapoor',
    authorInitial: 'R',
    title: 'Shortcut for percentage-based profit and loss problems in SSC CGL?',
    subtitle: 'I keep losing time in long-form calculations. Share your fastest method.',
    tags: ['Maths', 'ProfitLoss'],
    likes: 47,
    comments: [],
    commentCount: 12,
    views: 220,
    timestamp: '2h ago',
    userVote: null,
  },
  {
    id: 'demo-2',
    author: 'Priya Sharma',
    authorInitial: 'P',
    title: 'Best source for Static GK: Lucent or Arihant for 2026 exams?',
    subtitle: 'Need one source to revise multiple times instead of switching books.',
    tags: ['GK', 'Preparation'],
    likes: 83,
    comments: [],
    commentCount: 29,
    views: 340,
    timestamp: '5h ago',
    userVote: null,
  },
  {
    id: 'demo-3',
    author: 'Sneha Gupta',
    authorInitial: 'S',
    title: 'Failed 3 attempts. What changed for my 4th attempt and finally worked.',
    subtitle: 'Weekly revision plan, strict mock review, and fewer random resources.',
    tags: ['Motivation', 'Strategy'],
    likes: 134,
    comments: [],
    commentCount: 45,
    views: 620,
    timestamp: '1d ago',
    userVote: null,
  },
];

type ForumsContextType = {
  posts: ForumPostData[];
  loading: boolean;
  error: string | null;
  trendingTags: string[];
  topContributors: TopContributor[];
  refreshPosts: () => Promise<void>;
  loadReplies: (postId: string) => Promise<void>;
  addPost: (title: string, subtitle: string, tags: string[], author: string) => void;
  deletePost: (postId: string, actor: string) => void;
  addComment: (postId: string, text: string, author: string) => void;
  addReply: (postId: string, parentCommentId: string, text: string, author: string, replyTo: string) => void;
  editComment: (postId: string, commentId: string, text: string, actor: string) => void;
  deleteComment: (postId: string, commentId: string, actor: string) => void;
  incrementLike: (postId: string) => void;
};

const ForumsContext = createContext<ForumsContextType>({
  posts: [],
  loading: false,
  error: null,
  trendingTags: [],
  topContributors: [],
  refreshPosts: async () => {},
  loadReplies: async () => {},
  addPost: () => {},
  deletePost: () => {},
  addComment: () => {},
  addReply: () => {},
  editComment: () => {},
  deleteComment: () => {},
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

export const ForumsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<ForumPostData[]>(INITIAL_POSTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendingTags, setTrendingTags] = useState<string[]>([]);
  const [topContributors, setTopContributors] = useState<TopContributor[]>([]);

  const createComment = (text: string, author: string, replyTo?: string): Comment => {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author,
      authorInitial: author.charAt(0).toUpperCase(),
      text,
      timestamp: 'Just now',
      replyTo,
      replies: [],
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

  const refreshPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [postsRes, tagsRes, contributorsRes] = await Promise.allSettled([
        forumApi.listPosts({ limit: 50 }),
        forumApi.getTrendingTags(8),
        forumApi.getTopContributors(5),
      ]);

      if (postsRes.status === 'fulfilled') {
        const postList = toArray(postsRes.value).map(mapPostFromApi);
        if (postList.length > 0) {
          setPosts(postList);
        } else {
          setPosts((prev) => (prev.length > 0 ? prev : INITIAL_POSTS));
        }
      } else {
        setError(postsRes.reason?.message || 'Could not load forum posts.');
        setPosts((prev) => (prev.length > 0 ? prev : INITIAL_POSTS));
      }

      if (tagsRes.status === 'fulfilled') {
        const tagsRaw = toArray(tagsRes.value);
        const tagList = tagsRaw
          .map((item) => {
            if (typeof item === 'string') return item;
            return item?.tag || item?.name || item?.word;
          })
          .filter((item): item is string => Boolean(item))
          .slice(0, 8);
        setTrendingTags(tagList);
      }

      if (contributorsRes.status === 'fulfilled') {
        const contributorsRaw = toArray(contributorsRes.value);
        const contributors = contributorsRaw
          .map((item) => ({
            name: String(item?.name || item?.fullName || item?.userName || item?.authorName || 'Unknown'),
            count: Number(item?.count ?? item?.posts ?? item?.postCount ?? item?.score ?? 0),
          }))
          .slice(0, 5);
        setTopContributors(contributors);
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load forum data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPosts();
  }, []);

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
    const newPost: ForumPostData = {
      id: Date.now().toString(),
      author,
      authorInitial: author.charAt(0).toUpperCase(),
      title,
      subtitle,
      tags,
      likes: 0,
      views: 0,
      timestamp: 'Just now',
      comments: [],
      userVote: null,
    };
    setPosts(prev => [newPost, ...prev]);

    void (async () => {
      try {
        await forumApi.createPost({ title, subtitle, tags });
        await refreshPosts();
      } catch {
        // Keep optimistic local post even when API create fails.
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
        await refreshPosts();
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
        await refreshPosts();
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
        await refreshPosts();
      }
    })();
  };

  const editComment = (postId: string, commentId: string, text: string, actor: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    let canEdit = false;

    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;

        const target = findCommentById(post.comments, commentId);
        if (!target || !isOwnedBy(actor, target.author)) return post;

        canEdit = true;
        return {
          ...post,
          comments: updateCommentInTree(post.comments, commentId, (comment) => ({
            ...comment,
            text: trimmed,
            edited: true,
          })),
        };
      })
    );

    if (!canEdit) return;

    void (async () => {
      try {
        await forumApi.updateReply(postId, commentId, trimmed);
      } catch {
        await loadReplies(postId);
      }
    })();
  };

  const deleteComment = (postId: string, commentId: string, actor: string) => {
    let canDelete = false;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        // Check ownership before API call
        const post = posts.find((p) => p.id === postId);
        const target = post ? findCommentById(post.comments, commentId) : null;
        if (!post || !target || !isOwnedBy(actor, target.author)) return;

        await forumApi.deleteReply(postId, commentId);
        setPosts((prev) =>
          prev.map((post) => {
            if (post.id !== postId) return post;
            return {
              ...post,
              comments: removeCommentFromTree(post.comments, commentId),
            };
          })
        );
      } catch (e: any) {
        setError(e?.message || 'Failed to delete comment.');
      } finally {
        setLoading(false);
        await loadReplies(postId);
        await refreshPosts();
      }
    })();
  };

  const incrementLike = (postId: string) => {
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
        const post = posts.find((p) => p.id === postId);
        if (!post) return;
        if (post.userVote === 'like') {
          await forumApi.unlikePost(postId);
        } else {
          await forumApi.likePost(postId);
        }
      } finally {
        setTimeout(() => { refreshPosts(); }, 500); // slight delay to let backend update
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
        refreshPosts,
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
