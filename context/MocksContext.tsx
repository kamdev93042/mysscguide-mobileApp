import React, { createContext, useContext, useState } from 'react';

export interface MockChallenge {
  id: string;
  title: string;
  meta: string;
  author: string;
}

interface MocksContextType {
  myChallenges: MockChallenge[];
  addChallenge: (challenge: MockChallenge) => void;
}

const MocksContext = createContext<MocksContextType | null>(null);

export const useMocks = () => {
  const context = useContext(MocksContext);
  if (!context) {
    throw new Error('useMocks must be used within a MocksProvider');
  }
  return context;
};

export function MocksProvider({ children }: { children: React.ReactNode }) {
  const [myChallenges, setMyChallenges] = useState<MockChallenge[]>([]);

  const addChallenge = (challenge: MockChallenge) => {
    setMyChallenges((prev) => [challenge, ...prev]);
  };

  return (
    <MocksContext.Provider value={{ myChallenges, addChallenge }}>
      {children}
    </MocksContext.Provider>
  );
}
