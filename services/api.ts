import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator/Web
// For a real physical device, this would need to be your computer's local network IP (e.g. 192.168.1.x)
const getBaseUrl = () => {
  // We're now using the live deployed backend server provided by your friend
  return 'https://api.mysscguide.com/api/v1';
};

export const API_BASE_URL = getBaseUrl();

const isLikelyAuthErrorMessage = (message: string) =>
  /unauthori[sz]ed|token\s+is\s+expired|invalid\s+claims|jwt|forbidden|invalid\s+token/i.test(message || '');

export const isAuthSessionError = (error: any) => {
  if (!error) return false;
  const msg = String(error?.message || '');
  return Boolean(error?.isAuthError) || Number(error?.status) === 401 || isLikelyAuthErrorMessage(msg);
};

/**
 * Helper function for making API requests.
 */
async function fetchApi(endpoint: string, options: RequestInit = {}) {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.message || data.error || `API request failed with status ${response.status}`;
      const err: any = new Error(message);
      err.status = response.status;
      err.code = data.code || data.errorCode;
      err.isAuthError = response.status === 401 || isLikelyAuthErrorMessage(String(message));
      throw err;
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
}

export const authApi = {
  /**
   * 1. Send OTP (Signup)
   * Sends an OTP for a NEW user registration.
   */
  async sendOtp(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });
  },

  /**
   * 1b. Send Login OTP
   * Sends an OTP to an EXISTING user for login.
   */
  async sendLoginOtp(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/send-login-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });
  },

  /**
   * 2. Verify OTP (Signup)
   * Verifies the OTP sent to the email for a new user.
   */
  async verifyOtp(email: string, otp: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, otp }),
    });
  },

  /**
   * 2b. Verify Login OTP (Login)
   * Verifies the OTP sent to an existing user and returns a token.
   */
  async loginOtp(email: string, otp: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/login-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, otp }),
    });
  },

  getDummyPassword(email: string) {
    // Create a deterministic password for the user based on their email so we can re-login later
    return `dummy_${email.toLowerCase().trim()}_SSC123!`;
  },

  /**
   * 3. Signup
   * Registers a new user. Backend expects 'password', so we use our deterministic dummy password.
   */
  async signup(fullName: string, email: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        fullName,
        email: cleanEmail,
        password: this.getDummyPassword(cleanEmail),
      }),
    });
  },

  /**
   * 4. Login
   * Authenticates an existing user. 
   * Tries multiple historical dummy passwords sequentially to support legacy app accounts 
   * as well as newly standardized postman schema accounts.
   */
  async login(email: string) {
    const cleanEmail = email.toLowerCase().trim();

    // Ordered list of known dummy passwords to attempt silently
    const passwordsToTry = [
      this.getDummyPassword(cleanEmail), // Try the deterministic one (used by native app signups)
      'securepassword123',               // Try the static one (used by postman schema signups)
    ];

    let lastError: any;

    for (const password of passwordsToTry) {
      try {
        const response = await fetchApi('/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            email: cleanEmail,
            password,
          }),
        });
        return response; // Success! Return immediately.
      } catch (error: any) {
        lastError = error;

        // If the error explicitly mentions invalid credentials, continue to the next password
        const msg = (error.message || '').toLowerCase();
        if (!msg.includes('invalid credentials') && !msg.includes('400') && !msg.includes('401')) {
          // If it's a network timeout or major server crash, fail immediately without looping
          throw error;
        }
      }
    }

    // If all passwords failed, rethrow the final credential error
    throw lastError;
  },
};

export const userApi = {
  /**
   * Get logged-in user profile
   */
  async getProfile() {
    return fetchApi('/user/profile', {
      method: 'GET',
    });
  },
};

export const forumApi = {
  async listPosts(query: { limit?: number; cursor?: string; tag?: string; category?: string; search?: string } = {}) {
    const params = new URLSearchParams();
    if (query.limit != null) params.append('limit', String(query.limit));
    if (query.cursor) params.append('cursor', query.cursor);
    if (query.tag) params.append('tag', query.tag);
    if (query.category) params.append('category', query.category);
    if (query.search) params.append('search', query.search);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/user/community/posts${queryString}`, { method: 'GET' });
  },

  async getPost(postId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}`, { method: 'GET' });
  },

  async createPost(payload: { title: string; subtitle?: string; tags?: string[]; category?: string }) {
    return fetchApi('/user/community/posts', {
      method: 'POST',
      body: JSON.stringify({
        title: payload.title.trim(),
        subtitle: payload.subtitle?.trim() || undefined,
        tags: payload.tags ?? [],
        category: payload.category,
      }),
    });
  },

  async deletePost(postId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  },

  async likePost(postId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/like`, { method: 'POST' });
  },

  async unlikePost(postId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/like`, { method: 'DELETE' });
  },

  async listReplies(postId: string, query: { parentId?: string; cursor?: string; limit?: number; sort?: string } = {}) {
    const params = new URLSearchParams();
    if (query.parentId) params.append('parentId', query.parentId);
    if (query.cursor) params.append('cursor', query.cursor);
    if (query.limit != null) params.append('limit', String(query.limit));
    if (query.sort) params.append('sort', query.sort);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/replies${queryString}`, { method: 'GET' });
  },

  async addReply(postId: string, content: string, parentId?: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content: content.trim(), parentId }),
    });
  },

  async updateReply(postId: string, replyId: string, content: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ content: content.trim() }),
    });
  },

  async deleteReply(postId: string, replyId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}`, {
      method: 'DELETE',
    });
  },

  async addView(postId: string) {
    return fetchApi(`/user/community/posts/${encodeURIComponent(postId)}/view`, { method: 'POST' });
  },

  async getTrendingTags(limit = 8) {
    return fetchApi(`/user/community/posts/trending-tags?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  },

  async getTopContributors(limit = 5) {
    return fetchApi(`/user/community/posts/top-contributors?limit=${encodeURIComponent(String(limit))}`, { method: 'GET' });
  },
};

export const mockApi = {
  // --- 1. Create & Manage Mock ---
  async initCustomTest() {
    return fetchApi('/user/custom-tests/init', { method: 'POST' });
  },

  async updateCustomTest(id: string, data: any) {
    return fetchApi(`/user/custom-tests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async launchCustomTest(id: string) {
    return fetchApi(`/user/custom-tests/${id}/launch`, { method: 'POST' });
  },

  async deleteCustomTest(id: string) {
    return fetchApi(`/user/custom-tests/${id}`, { method: 'DELETE' });
  },

  // --- 2. Get Mock ---
  async getCustomTestById(id: string) {
    return fetchApi(`/user/custom-tests/${id}`, { method: 'GET' });
  },

  async getMyCustomTests(query: { limit?: number; cursor?: string; type?: string; visibility?: string; history?: string } = {}) {
    const params = new URLSearchParams();
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.cursor) params.append('cursor', query.cursor);
    if (query.type) params.append('type', query.type);
    if (query.visibility) params.append('visibility', query.visibility);
    if (query.history) params.append('history', query.history);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/user/custom-tests${queryString}`, { method: 'GET' });
  },

  async startCustomTest(id: string) {
    return fetchApi(`/user/custom-tests/${id}/start`, { method: 'GET' });
  },

  // --- 3. Attempt & Results ---
  async submitCustomTest(id: string, data: any) {
    return fetchApi(`/user/custom-tests/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getCustomTestResults(id: string) {
    return fetchApi(`/user/custom-tests/${id}/results`, { method: 'GET' });
  },

  async getAttemptAnalysis(attemptId: string) {
    return fetchApi(`/user/attempts/${attemptId}/analysis`, { method: 'GET' });
  },

  async getAttemptResult(attemptId: string) {
    return fetchApi(`/user/attempts/${attemptId}/result`, { method: 'GET' });
  },

  // --- 4. Public Challenges ---
  async getPublicChallenges() {
    return fetchApi('/challenges/public?type=public', { method: 'GET' });
  },

  async getChallengeLeaderboard(id: string) {
    // Note: Publicly accessible but we pass token if available since fetchApi does it automatically
    return fetchApi(`/challenges/${id}/leaderboard`, { method: 'GET' });
  },

  // --- 5. History & Attempts ---
  async getAllAttempts() {
    return fetchApi('/user/attempts', { method: 'GET' });
  },
};

export const pyqApi = {
  // 0. Count Test Papers (Public)
  async countTestPapers() {
    return fetchApi('/test-papers/count', { method: 'GET' });
  },

  // 1 & 2. List Test Papers (With/Without Filters)
  async listTestPapers(query: {
    limit?: number;
    cursor?: string;
    examName?: string;
    examYear?: string;
    tier?: string;
    shift?: string;
    date?: string;
  } = {}) {
    const params = new URLSearchParams();
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.cursor) params.append('cursor', query.cursor);
    if (query.examName) params.append('examName', query.examName);
    if (query.examYear) params.append('examYear', query.examYear);
    if (query.tier) params.append('tier', query.tier);
    if (query.shift) params.append('shift', query.shift);
    if (query.date) params.append('date', query.date);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/test-papers${queryString}`, { method: 'GET' });
  },

  // 3. PYQ Init (Create/Load Paper Config)
  async initPyq(testPaperId: string) {
    return fetchApi(`/user/test-papers/${testPaperId}/init`, { method: 'POST' });
  },

  // 4. PYQ Start (Get Questions)
  async startPyq(testPaperId: string) {
    return fetchApi(`/user/test-papers/${testPaperId}/start`, { method: 'GET' });
  },

  // 5. PYQ Pause (Save Partial State)
  async pausePyq(testPaperId: string, data: {
    answers: any[];
    totalTimeTaken: number;
    nextQuestionIndex: number;
    skippedQuestionIds: string[];
  }) {
    return fetchApi(`/user/test-papers/${testPaperId}/pause`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 6. PYQ Resume (Restore Saved State)
  async resumePyq(testPaperId: string) {
    return fetchApi(`/user/test-papers/${testPaperId}/resume`, { method: 'GET' });
  },

  // 7. PYQ Submit (Final Submit)
  async submitPyq(testPaperId: string, data: {
    answers: any[];
    totalTimeTaken: number;
    sectionTimeSpent: any[];
  }) {
    return fetchApi(`/user/test-papers/${testPaperId}/submit`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 8. PYQ Result by Paper + Attempt Number
  async getPyqResult(testPaperId: string, attemptNumber?: number) {
    let url = `/user/test-papers/${testPaperId}/result`;
    if (attemptNumber) {
      url += `?attemptNumber=${attemptNumber}`;
    }
    return fetchApi(url, { method: 'GET' });
  },

  // 9. PYQ Attempts History (Cursor Pagination)
  async getPyqAttemptsHistory(query: { limit?: number; cursor?: string } = {}) {
    const params = new URLSearchParams();
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.cursor) params.append('cursor', query.cursor);

    const queryString = params.toString() ? `?${params.toString()}` : '';
    return fetchApi(`/user/test-paper-attempts${queryString}`, { method: 'GET' });
  },

  // 10. PYQ Result by AttemptId
  async getPyqAttemptResult(attemptId: string) {
    return fetchApi(`/user/attempts/${attemptId}/result`, { method: 'GET' });
  },

  // 11. PYQ Attempt Analysis by AttemptId
  async getPyqAttemptAnalysis(attemptId: string) {
    return fetchApi(`/user/attempts/${attemptId}/analysis`, { method: 'GET' });
  },
};

export const mnemonicApi = {
  async createMnemonic(data: { word: string; meaning: string; mnemonic: string }) {
    return fetchApi('/user/mnemonics', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMnemonics(limit: number = 100) {
    return fetchApi(`/user/mnemonics?limit=${limit}`, { method: 'GET' });
  },

  async likeMnemonic(id: string) {
    return fetchApi(`/user/mnemonics/${id}/like`, { method: 'POST' });
  },

  async dislikeMnemonic(id: string) {
    return fetchApi(`/user/mnemonics/${id}/dislike`, { method: 'POST' });
  },

  async deleteMnemonic(id: string) {
    return fetchApi(`/user/mnemonics/${id}`, { method: 'DELETE' });
  },

  async reportMnemonic(id: string, reason: string) {
    // Calling the generic reports endpoint as provided by the user.
    return fetchApi('/user/reports', {
      method: 'POST',
      body: JSON.stringify({
        targetId: id,
        type: 'Mnemonic', // Fixed from targetType based on backend error "type is required"
        reason,
      }),
    });
  },
};

