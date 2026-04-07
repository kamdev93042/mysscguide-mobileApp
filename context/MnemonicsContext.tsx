import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { mnemonicApi } from '../services/api';

export type MnemonicItem = {
  id: string;
  word: string;
  meaning: string;
  trick: string;
  author: string;
  ownedByMe?: boolean;
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
  deleteMnemonic: (id: string) => Promise<void>;
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
  const voteInFlightRef = useRef<Set<string>>(new Set());

  const resolveVotePayload = (res: any) => {
    const payloadCandidates = [
      res?.data?.data,
      res?.data?.mnemonic,
      res?.data,
      res?.mnemonic,
      res,
    ];
    const payload =
      payloadCandidates.find(
        (item) =>
          item &&
          typeof item === 'object' &&
          (item.upvotes != null ||
            item.downvotes != null ||
            item.likes != null ||
            item.dislikes != null ||
            item.likeCount != null ||
            item.dislikeCount != null ||
            typeof item.likedByMe === 'boolean' ||
            typeof item.dislikedByMe === 'boolean' ||
            item.userVote === 'like' ||
            item.userVote === 'dislike' ||
            item.userVote === null)
      ) ||
      res?.data ||
      res;

    const upvotes = Number(payload?.upvotes ?? payload?.likes ?? payload?.likeCount);
    const downvotes = Number(payload?.downvotes ?? payload?.dislikes ?? payload?.dislikeCount);
    const likedByMe = payload?.likedByMe;
    const dislikedByMe = payload?.dislikedByMe;
    const rawUserVote = payload?.userVote;

    const hasCounts = Number.isFinite(upvotes) && Number.isFinite(downvotes);
    const hasVoteFlags =
      typeof likedByMe === 'boolean' ||
      typeof dislikedByMe === 'boolean' ||
      rawUserVote === 'like' ||
      rawUserVote === 'dislike' ||
      rawUserVote === null;

    let userVote: 'like' | 'dislike' | null = null;
    if (likedByMe === true) userVote = 'like';
    else if (dislikedByMe === true) userVote = 'dislike';
    else if (rawUserVote === 'like' || rawUserVote === 'dislike' || rawUserVote === null) userVote = rawUserVote;

    return {
      hasCounts,
      upvotes,
      downvotes,
      hasVoteFlags,
      userVote,
    };
  };

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
          ownedByMe: Boolean(
            apiItem?.ownedByMe ??
              apiItem?.isMine ??
              apiItem?.isOwner ??
              apiItem?.mine ??
              apiItem?.myMnemonic ??
              apiItem?.canDelete ??
              apiItem?.user?.isMe ??
              apiItem?.creator?.isMe
          ),
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
          ownedByMe: true,
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
      throw error;
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
    if (voteInFlightRef.current.has(id)) return;

    const currentItem = mnemonics.find((item) => item.id === id);
    if (!currentItem) return;
    voteInFlightRef.current.add(id);

    const currentVote = currentItem.userVote;
    const action: 'like' | 'unlike' = currentVote === 'like' ? 'unlike' : 'like';

    // Optimistic update
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote: 'like' | 'dislike' | null = item.userVote;

        if (item.userVote === 'like') {
          newLikes = Math.max(0, newLikes - 1);
          newVote = null;
        } else if (item.userVote === 'dislike') {
          newDislikes = Math.max(0, newDislikes - 1);
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
      let res: any;
      if (action === 'unlike') {
        try {
          res = await mnemonicApi.unlikeMnemonic(id);
        } catch {
          // Some backends expose POST as toggle for like/unlike.
          res = await mnemonicApi.likeMnemonic(id);
        }
      } else {
        res = await mnemonicApi.likeMnemonic(id);
      }
      const votePayload = resolveVotePayload(res);
      if (votePayload.hasCounts || votePayload.hasVoteFlags) {
        setMnemonics((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;

            return {
              ...item,
              likes: votePayload.hasCounts ? votePayload.upvotes : item.likes,
              dislikes: votePayload.hasCounts ? votePayload.downvotes : item.dislikes,
              userVote: votePayload.hasVoteFlags ? votePayload.userVote : item.userVote,
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to like mnemonic:', error);
      await fetchMnemonics();
    } finally {
      voteInFlightRef.current.delete(id);
    }
  };

  const incrementDislike = async (id: string) => {
    if (voteInFlightRef.current.has(id)) return;

    const currentItem = mnemonics.find((item) => item.id === id);
    if (!currentItem) return;
    voteInFlightRef.current.add(id);

    const currentVote = currentItem.userVote;
    const action: 'dislike' | 'undislike' = currentVote === 'dislike' ? 'undislike' : 'dislike';

    // Optimistic update
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote: 'like' | 'dislike' | null = item.userVote;

        if (item.userVote === 'dislike') {
          newDislikes = Math.max(0, newDislikes - 1);
          newVote = null;
        } else if (item.userVote === 'like') {
          newLikes = Math.max(0, newLikes - 1);
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
      let res: any;
      if (action === 'undislike') {
        try {
          res = await mnemonicApi.undislikeMnemonic(id);
        } catch {
          // Some backends expose POST as toggle for dislike/undislike.
          res = await mnemonicApi.dislikeMnemonic(id);
        }
      } else {
        res = await mnemonicApi.dislikeMnemonic(id);
      }
      const votePayload = resolveVotePayload(res);
      if (votePayload.hasCounts || votePayload.hasVoteFlags) {
        setMnemonics((prev) =>
          prev.map((item) => {
            if (item.id !== id) return item;

            return {
              ...item,
              likes: votePayload.hasCounts ? votePayload.upvotes : item.likes,
              dislikes: votePayload.hasCounts ? votePayload.downvotes : item.dislikes,
              userVote: votePayload.hasVoteFlags ? votePayload.userVote : item.userVote,
            };
          })
        );
      }
    } catch (error) {
      console.error('Failed to dislike mnemonic:', error);
      await fetchMnemonics();
    } finally {
      voteInFlightRef.current.delete(id);
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
