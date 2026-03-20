import React, { createContext, useContext, useState } from 'react';

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

const INITIAL_MNEMONICS: MnemonicItem[] = [
  {
    id: '1',
    word: 'Assiduous',
    meaning: 'Showing great care and perseverance',
    trick: `"Ass + iduous" -> like an ass doing nonstop hard work.`,
    author: 'Praveen Maurya',
    likes: 18,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '2',
    word: 'Assiduous',
    meaning: 'Diligent and persistent',
    trick: `"A city does work daily" -> Assiduous reminds me of consistent effort.`,
    author: 'Ritika Sharma',
    likes: 11,
    dislikes: 1,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '3',
    word: 'Belligerent',
    meaning: 'Hostile and aggressive',
    trick: `"Belly + grrr" -> always ready to fight.`,
    author: 'Yash Maurya',
    likes: 21,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '4',
    word: 'Belligerent',
    meaning: 'Warlike in attitude',
    trick: `"Bell rings, argument begins" -> Belligerent means quarrelsome.`,
    author: 'Aman Singh',
    likes: 7,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '5',
    word: 'Deference',
    meaning: 'Respect',
    trick: `"Difference in age -> deference in behavior".`,
    author: 'Nikhil Maurya',
    likes: 12,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '6',
    word: 'Deference',
    meaning: 'Humble submission and respect',
    trick: `"Dear-fence" -> keep a respectful boundary with seniors.`,
    author: 'Gauri S.',
    likes: 6,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '7',
    word: 'Alacrity',
    meaning: 'Brisk and cheerful readiness',
    trick: `"All + crity (city) -> All city people are ready with alacrity."`,
    author: 'Admin',
    likes: 10,
    dislikes: 1,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '8',
    word: 'Capricious',
    meaning: 'Given to sudden and unaccountable changes of mood or behavior',
    trick: `"Capri pants -> weather changes suddenly, so you wear capris."`,
    author: 'Student123',
    likes: 5,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
  {
    id: '9',
    word: 'Diligent',
    meaning: 'Careful and using a lot of effort',
    trick: `"Dilli + Gents -> Delhi gents are very hard working."`,
    author: 'SSC_Scorer',
    likes: 8,
    dislikes: 0,
    isSaved: false,
    userVote: null,
    reportedReasons: [],
  },
];

type MnemonicsContextType = {
  mnemonics: MnemonicItem[];
  addMnemonic: (word: string, meaning: string, trick: string, author: string) => void;
  toggleSave: (id: string) => void;
  deleteMnemonic: (id: string) => void;
  reportMnemonic: (id: string, reason: string) => void;
  incrementLike: (id: string) => void;
  incrementDislike: (id: string) => void;
};

const MnemonicsContext = createContext<MnemonicsContextType>({
  mnemonics: [],
  addMnemonic: () => {},
  toggleSave: () => {},
  deleteMnemonic: () => {},
  reportMnemonic: () => {},
  incrementLike: () => {},
  incrementDislike: () => {},
});

export const useMnemonics = () => useContext(MnemonicsContext);

export const MnemonicsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mnemonics, setMnemonics] = useState<MnemonicItem[]>(INITIAL_MNEMONICS);

  const addMnemonic = (word: string, meaning: string, trick: string, author: string) => {
    const newItem: MnemonicItem = {
      id: Date.now().toString(),
      word,
      meaning,
      trick,
      author,
      likes: 0,
      dislikes: 0,
      isSaved: false,
      userVote: null,
      reportedReasons: [],
    };
    // Add new mnonics to the top of the list
    setMnemonics((prev) => [newItem, ...prev]);
  };

  const toggleSave = (id: string) => {
    setMnemonics((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isSaved: !item.isSaved } : item
      )
    );
  };

  const deleteMnemonic = (id: string) => {
    setMnemonics((prev) => prev.filter((item) => item.id !== id));
  };

  const reportMnemonic = (id: string, reason: string) => {
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return { ...item, reportedReasons: [...item.reportedReasons, reason] };
      })
    );
  };

  const incrementLike = (id: string) => {
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote = item.userVote;

        if (item.userVote === 'like') {
          // Undo like
          newLikes -= 1;
          newVote = null;
        } else if (item.userVote === 'dislike') {
          // Switch vote from dislike to like
          newDislikes -= 1;
          newLikes += 1;
          newVote = 'like';
        } else {
          // First time voting
          newLikes += 1;
          newVote = 'like';
        }
        
        return { ...item, likes: newLikes, dislikes: newDislikes, userVote: newVote };
      })
    );
  };

  const incrementDislike = (id: string) => {
    setMnemonics((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        
        let newLikes = item.likes;
        let newDislikes = item.dislikes;
        let newVote = item.userVote;

        if (item.userVote === 'dislike') {
          // Undo dislike
          newDislikes -= 1;
          newVote = null;
        } else if (item.userVote === 'like') {
          // Switch vote from like to dislike
          newLikes -= 1;
          newDislikes += 1;
          newVote = 'dislike';
        } else {
          // First time voting
          newDislikes += 1;
          newVote = 'dislike';
        }
        
        return { ...item, likes: newLikes, dislikes: newDislikes, userVote: newVote };
      })
    );
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
      }}
    >
      {children}
    </MnemonicsContext.Provider>
  );
};
