import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// İki ayrı oturum vardır: salon sahibi (owner) ve üye (member).
// Token'lar ayrı localStorage anahtarlarında tutulur, böylece aynı cihazda
// bir salon sahibi ve bir üye hesabı karışmadan bir arada bulunabilir (test için pratik).
function getStoredTokens(role) {
  const raw = localStorage.getItem(`qrgym_${role}_tokens`);
  return raw ? JSON.parse(raw) : null;
}

function storeTokens(role, tokens) {
  localStorage.setItem(`qrgym_${role}_tokens`, JSON.stringify(tokens));
}

function clearTokens(role) {
  localStorage.removeItem(`qrgym_${role}_tokens`);
}

function createApiClient(role) {
  const instance = axios.create({ baseURL: `${API_URL}/api` });

  instance.interceptors.request.use((config) => {
    const tokens = getStoredTokens(role);
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && !original._retry) {
        original._retry = true;
        const tokens = getStoredTokens(role);
        if (tokens?.refreshToken) {
          try {
            const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {
              refreshToken: tokens.refreshToken,
            });
            storeTokens(role, { ...tokens, accessToken: data.accessToken });
            original.headers.Authorization = `Bearer ${data.accessToken}`;
            return instance(original);
          } catch (refreshErr) {
            clearTokens(role);
          }
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
}

export const ownerApi = createApiClient('owner');
export const memberApi = createApiClient('member');

export { getStoredTokens, storeTokens, clearTokens, API_URL };
