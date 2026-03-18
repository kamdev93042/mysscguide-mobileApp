import React, { createContext, useContext, useState } from 'react';

export type Comment = {
  id: string;
  author: string;
  authorInitial: string;
  text: string;
  timestamp: string;
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
  views: number;
  timestamp: string;
  userVote: 'like' | null;
};

const INITIAL_POSTS: ForumPostData[] = [
  {
    id: '1',
    author: 'Nikhil Maurya',
    authorInitial: 'N',
    title: 'CGL Maths Strategy For Beginners',
    subtitle: 'Preparing for the SSC CGL Quantitative Aptitude section as a beginner can feel like staring at a mountain, but the secret is that it\'s less about "higher math" and more about speed, accuracy, and pattern recognition. The CGL syllabus is broadly divided into Arithmetic and Advance Math. Here is a structured strategy to go from zero to exam-ready.',
    tags: ['quant', 'maths'],
    likes: 1,
    views: 2,
    timestamp: '5d ago',
    comments: [],
    userVote: null,
  },
  {
    id: '2',
    author: 'Prince Maurya',
    authorInitial: 'P',
    title: 'New in website',
    subtitle: "I'm sumit using prince email",
    tags: [],
    likes: 2,
    views: 4,
    timestamp: '28/02/2026',
    comments: [
      { id: 'c1', author: 'Vinay', authorInitial: 'V', text: 'Welcome to the platform!', timestamp: '28/02/2026' }
    ],
    userVote: null,
  },
  {
    id: '3',
    author: 'Anjali Sharma',
    authorInitial: 'A',
    title: 'How to tackle English Comprehension?',
    subtitle: "I always run out of time during the reading comprehension sections. Does anyone have tips for reading faster without losing accuracy?",
    tags: ['english', 'tips'],
    likes: 12,
    views: 45,
    timestamp: '1w ago',
    comments: [
      { id: 'c2', author: 'Rahul', authorInitial: 'R', text: 'Skim the questions first!', timestamp: '1w ago' }
    ],
    userVote: null,
  },
  {
    id: '4',
    author: 'Vikash Kumar',
    authorInitial: 'V',
    title: 'Best Mock Test Series for Tier 2',
    subtitle: 'Which platform provides the most relevant mocks for CGL Tier 2?',
    tags: ['mocks', 'tier2'],
    likes: 8,
    views: 30,
    timestamp: '2w ago',
    comments: [],
    userVote: null,
  }
];

type ForumsContextType = {
  posts: ForumPostData[];
  addPost: (title: string, subtitle: string, tags: string[], author: string) => void;
  addComment: (postId: string, text: string, author: string) => void;
  incrementLike: (postId: string) => void;
};

const ForumsContext = createContext<ForumsContextType>({
  posts: [],
  addPost: () => {},
  addComment: () => {},
  incrementLike: () => {},
});

export const useForums = () => useContext(ForumsContext);

export const ForumsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<ForumPostData[]>(INITIAL_POSTS);

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
  };

  const addComment = (postId: string, text: string, author: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      author,
      authorInitial: author.charAt(0).toUpperCase(),
      text,
      timestamp: 'Just now',
    };
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return { ...post, comments: [...post.comments, newComment] };
      }
      return post;
    }));
  };

  const incrementLike = (postId: string) => {
    setPosts((prev) =>
      prev.map((item) => {
        if (item.id !== postId) return item;
        let newLikes = item.likes;
        let newVote = item.userVote;

        if (item.userVote === 'like') {
          newLikes -= 1;
          newVote = null;
        } else {
          newLikes += 1;
          newVote = 'like';
        }
        
        return { ...item, likes: newLikes, userVote: newVote };
      })
    );
  };

  return (
    <ForumsContext.Provider value={{ posts, addPost, addComment, incrementLike }}>
      {children}
    </ForumsContext.Provider>
  );
};
