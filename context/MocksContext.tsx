import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockApi } from '../services/api';
import { useLoginModal } from './LoginModalContext';

export interface MockChallenge {
  id?: string;
  _id?: string;
  title: string;
  meta?: string;
  author?: string;
  questionCount?: number;
  timeLimit?: number;
  isPublic?: boolean;
  subjects?: any[];
  status?: string;
  createdAt?: string;
}

export interface Attempt {
  _id?: string;
  testId?: string;
  score?: number;
  accuracy?: number;
  totalTimeTaken?: number;
  createdAt?: string;
  // mapped properties
  title?: string;
  meta?: string;
}

interface MocksContextType {
  myChallenges: MockChallenge[];
  publicChallenges: MockChallenge[];
  recentAttempts: Attempt[];
  isLoading: boolean;
  error: string | null;
  fetchMyChallenges: () => Promise<void>;
  fetchPublicChallenges: () => Promise<void>;
  fetchRecentAttempts: () => Promise<void>;
  createNewChallenge: (data: any) => Promise<any>;
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
  const { hasLoggedIn, userEmail, userName } = useLoginModal();
  const [myChallenges, setMyChallenges] = useState<MockChallenge[]>([]);
  const [publicChallenges, setPublicChallenges] = useState<MockChallenge[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<Attempt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accountIdentity = String(userEmail || userName || '').trim().toLowerCase();

  const extractArray = (res: any, type: string = ''): any[] => {
    console.log(`[API RESPONSE] ${type}:`, JSON.stringify(res, null, 2).substring(0, 300));
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.challenges)) return res.challenges;
    if (Array.isArray(res.attempts)) return res.attempts;
    if (Array.isArray(res.history)) return res.history;
    
    // Fallback: search for first array property directly on res
    let arrayProp = Object.values(res).find(val => Array.isArray(val));
    if (arrayProp) return arrayProp as any[];

    // Fallback: search for first array property inside res.data
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
      arrayProp = Object.values(res.data).find(val => Array.isArray(val));
      if (arrayProp) return arrayProp as any[];
    }
    
    console.warn(`[API WARNING] Could not extract array for ${type} from response.`);
    return [];
  };

  const fetchMyChallenges = async () => {
    try {
      setIsLoading(true);
      const res = await mockApi.getMyCustomTests();
      const dataArray = extractArray(res, 'MyChallenges');
      if (dataArray.length > 0) {
        // Map backend custom tests to UI challenges
        const mapped = dataArray.map((item: any) => ({
          ...item,
          id: item._id || item.id,
          title: item.title,
          meta: `${item.questionCount || 0} Questions · ${item.timeLimit || 0} Minutes`,
          author: `BY YOU · ${new Date(item.createdAt || Date.now()).toLocaleDateString()}`
        }));
        setMyChallenges(mapped);
      } else {
        setMyChallenges([]);
      }
    } catch (err: any) {
      console.error('fetchMyChallenges error', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublicChallenges = async () => {
    try {
      setIsLoading(true);
      const res = await mockApi.getPublicChallenges();
      const dataArray = extractArray(res, 'PublicChallenges');
      if (dataArray.length > 0) {
        const mapped = dataArray.map((item: any) => ({
          ...item,
          id: item._id || item.id,
          title: item.title,
          meta: `${item.questionCount || 0} Questions · ${item.timeLimit || 0} Minutes`,
          author: `BY ${item.creatorName?.toUpperCase() || item.creator?.fullName?.toUpperCase() || 'USER'} · ${new Date(item.createdAt || Date.now()).toLocaleDateString()}`
        }));
        setPublicChallenges(mapped);
      } else {
        setPublicChallenges([]);
      }
    } catch (err: any) {
      console.error('fetchPublicChallenges error', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentAttempts = async () => {
    try {
      setIsLoading(true);
      const res = await mockApi.getAllAttempts();
      const dataArray = extractArray(res, 'RecentAttempts');
      if (dataArray.length > 0) {
        setRecentAttempts(dataArray);
      } else {
        setRecentAttempts([]);
      }
    } catch (err: any) {
      console.error('fetchRecentAttempts error', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChallenge = async (data: any) => {
    try {
      setIsLoading(true);
      // 1. Init
      const initRes = await mockApi.initCustomTest();
      const testId = initRes.testId || initRes.data?._id || initRes.data?.id;
      
      if (!testId) throw new Error('Failed to initialize test');

      // 2. Update
      await mockApi.updateCustomTest(testId, data);
      
      // 3. Launch
      const launchRes = await mockApi.launchCustomTest(testId);
      
      // Refresh list
      await fetchMyChallenges();
      
      return launchRes;
    } catch (err: any) {
      console.error('createNewChallenge error', err);
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasLoggedIn) {
      setMyChallenges([]);
      setPublicChallenges([]);
      setRecentAttempts([]);
      setError(null);
      return;
    }

    setError(null);
    void Promise.allSettled([
      fetchMyChallenges(),
      fetchPublicChallenges(),
      fetchRecentAttempts(),
    ]);
  }, [hasLoggedIn, accountIdentity]);

  return (
    <MocksContext.Provider value={{
      myChallenges,
      publicChallenges,
      recentAttempts,
      isLoading,
      error,
      fetchMyChallenges,
      fetchPublicChallenges,
      fetchRecentAttempts,
      createNewChallenge
    }}>
      {children}
    </MocksContext.Provider>
  );
}
