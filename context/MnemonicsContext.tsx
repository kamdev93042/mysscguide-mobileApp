import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { mnemonicApi } from '../services/api';

export type MnemonicItem = {
  id: string;
  word: string;
  meaning: string;
  trick: string;
  author: string;
  likes: number;
  dislikes: number;
  isSaved: boolean;
  userVote: 'like' | 'dislike' | null;
  reportedReasons: string[];
};

type MnemonicsContextType = {
  mnemonics: MnemonicItem[];
  addMnemonic: (word: string, meaning: string, trick: string, author: string) => Promise<void>;
  toggleSave: (id: string) => void;
  deleteMnemonic: (id: string) => void;
  reportMnemonic: (id: string, reason: string) => Promise<void>;
  incrementLike: (id: string) => void;
  incrementDislike: (id: string) => void;
  refreshMnemonics: () => Promise<void>;
  isLoading: boolean;
};

const MnemonicsContext = createContext<MnemonicsContextType>({
  mnemonics: [],
  addMnemonic: async () => {},
  toggleSave: () => {},
  deleteMnemonic: async () => {},
  reportMnemonic: async () => {},
  incrementLike: async () => {},
  incrementDislike: async () => {},
  refreshMnemonics: async () => {},
  isLoading: true,
});

export const useMnemonics = () => useContext(MnemonicsContext);

export const MnemonicsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mnemonics, setMnemonics] = useState<MnemonicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMnemonics = useCallback(async () => {
    try {
      setIsLoading(true);
      const limit = 500; // default large limit to grab them all for local search
      const response = await mnemonicApi.getMnemonics(limit);
      if (response && response.data) {
        // Map backend to frontend schema
        const mapped: MnemonicItem[] = response.data.map((apiItem: any) => ({
          id: apiItem.id,
          word: apiItem.word,
          meaning: apiItem.meaning,
          trick: apiItem.mnemonic, // trick maps to mnemonic
          author: apiItem.user?.name || apiItem.user?.username || 'Anonymous',
          likes: apiItem.upvotes || 0,
          dislikes: apiItem.downvotes || 0,
          isSaved: false,
          userVote: apiItem.likedByMe ? 'like' : (apiItem.dislikedByMe ? 'dislike' : null),
          reportedReasons: [],
        }));
        setMnemonics(mapped);
      }
    } catch (error) {
      console.error('Failed to load mnemonics', error);
      setMnemonics([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMnemonics();
  }, [fetchMnemonics]);

  const refreshMnemonics = async () => {
    await fetchMnemonics();
  };

  const addMnemonic = async (word: string, meaning: string, trick: string, author: string) => {
    try {
      const response = await mnemonicApi.createMnemonic({
        word,
        meaning,
        mnemonic: trick,
      });

      if (response && response.data) {
        const apiItem = response.data;
        const newItem: MnemonicItem = {
          id: apiItem.id,
          word: apiItem.word,
          meaning: apiItem.meaning,
          trick: apiItem.mnemonic,
          author: apiItem.user?.name || apiItem.user?.username || author,
          likes: apiItem.upvotes || 0,
          dislikes: apiItem.downvotes || 0,
          isSaved: false,
          userVote: null,
          reportedReasons: [],
        };
        // Add new mnonics to the top of the list
        setMnemonics((prev) => [newItem, ...prev]);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (error) {
      console.error('Failed to create mnemonic:', error);
      throw error;
    }
  };

  const toggleSave = (id: string) => {
    setMnemonics((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSaved: !item.isSaved } : item
      )
    );
  };

  const deleteMnemonic = async (id: string) => {
    try {
      await mnemonicApi.deleteMnemonic(id);
      setMnemonics((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete mnemonic:', error);
    }
  };

  const reportMnemonic = async (id: string, reason: string) => {
    try {
      await mnemonicApi.reportMnemonic(id, reason);
      // Update local state to show it was reported (if desired)
      setMnemonics((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          return { ...item, reportedReasons: [...item.reportedReasons, reason] };
        })
      );
    } catch (error) {
      console.error('Failed to report mnemonic:', error);
      throw error;
    }
  };

  const incrementLike = async (id: string) => {
    // Optimistic update
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote = item.userVote;

        if (item.userVote === 'like') {
          newLikes -= 1;
          newVote = null;
        } else if (item.userVote === 'dislike') {
          newDislikes -= 1;
          newLikes += 1;
          newVote = 'like';
        } else {
          newLikes += 1;
          newVote = 'like';
        }
        
        return { ...item, likes: newLikes, dislikes: newDislikes, userVote: newVote };
      })
    );

    try {
      const res = await mnemonicApi.likeMnemonic(id);
      if (res && res.status === 'success') {
        setMnemonics((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, likes: res.upvotes, dislikes: res.downvotes } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to like mnemonic:', error);
    }
  };

  const incrementDislike = async (id: string) => {
    // Optimistic update
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote = item.userVote;

        if (item.userVote === 'dislike') {
          newDislikes -= 1;
          newVote = null;
        } else if (item.userVote === 'like') {
          newLikes -= 1;
          newDislikes += 1;
          newVote = 'dislike';
        } else {
          newDislikes += 1;
          newVote = 'dislike';
        }
        
        return { ...item, likes: newLikes, dislikes: newDislikes, userVote: newVote };
      })
    );

    try {
      const res = await mnemonicApi.dislikeMnemonic(id);
      if (res && res.status === 'success') {
        setMnemonics((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, likes: res.upvotes, dislikes: res.downvotes } : item
          )
        );
      }
    } catch (error) {
      console.error('Failed to dislike mnemonic:', error);
    }
  };

  return (
    <MnemonicsContext.Provider
      value={{
        mnemonics,
        addMnemonic,
        toggleSave,
        deleteMnemonic,
        reportMnemonic,
        incrementLike,
        incrementDislike,
        refreshMnemonics,
        isLoading,
      }}
    >
      {children}
    </MnemonicsContext.Provider>
  );
};
