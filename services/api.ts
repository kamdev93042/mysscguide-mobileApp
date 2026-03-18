import { Platform } from 'react-native';

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
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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
   * 1. Send OTP
   * Sends an OTP to the specified email address.
   */
  async sendOtp(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail }),
    });
  },

  /**
   * 2. Verify OTP
   * Verifies the OTP sent to the email.
   */
  async verifyOtp(email: string, otp: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email: cleanEmail, otp }),
    });
  },

  getDummyPassword(email: string) {
    // Create a deterministic password for the user so we can re-login later
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
   * Authenticates an existing user using the deterministic dummy password.
   */
  async login(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    return fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: cleanEmail,
        password: this.getDummyPassword(cleanEmail),
      }),
    });
  },
};

export const userApi = {
  /**
   * Get logged-in user profile
   */
  async getProfile(token: string) {
    return fetchApi('/user/profile', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};
