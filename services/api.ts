import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use 10.0.2.2 for Android Emulator, localhost for iOS Simulator/Web
// For a real physical device, this would need to be your computer's local network IP (e.g. 192.168.1.x)
const getBaseUrl = () => {
  // We're now using the live deployed backend server provided by your friend
  return 'https://api.mysscguide.com/api/v1';
};

export const API_BASE_URL = getBaseUrl();

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
      throw new Error(data.message || data.error || `API request failed with status ${response.status}`);
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
