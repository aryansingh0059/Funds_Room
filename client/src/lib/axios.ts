import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach JWT from localStorage to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('fr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Handle 401 — redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fr_token');
      localStorage.removeItem('fr_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default apiClient;
