// apiService.js - VERSION CORRIGÉE AVEC GESTION AUTH ROBUSTE

import axios from 'axios';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Instance axios principale
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ✅ CORRECTION : Intercepteur amélioré pour ajouter le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    console.log('🔐 Request config:', {
      url: config.url,
      method: config.method,
      hasAuth: !!config.headers.Authorization
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ CORRECTION : Intercepteur de réponse amélioré
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response success:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    console.log('❌ Response error:', {
      status: error.response?.status,
      url: originalRequest.url,
      hasToken: !!localStorage.getItem('access_token')
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      const publicPages = ['/login', '/signup', '/reset-password', '/'];
      const currentPath = window.location.pathname;

      if (refreshToken && !publicPages.includes(currentPath)) {
        try {
          console.log('🔄 Attempting token refresh...');
          
          const response = await axios.post(
            `${API_BASE_URL}/api/token/refresh/`,
            { refresh: refreshToken }
          );

          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          // Mettre à jour l'en-tête de la requête originale
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          
          console.log('✅ Token refreshed successfully');
          return api(originalRequest);
          
        } catch (refreshError) {
          console.error('❌ Token refresh failed:', refreshError);
          
          // Nettoyage et redirection
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          
          if (!publicPages.includes(currentPath)) {
            window.location.href = '/login';
          }
        }
      } else {
        console.log('🔄 No refresh token or on public page, redirecting to login');
        
        // Pas de refresh token ou page publique
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        
        if (!publicPages.includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ✅ CORRECTION : Service ecoChallenges amélioré
export const ecoChallengesService = {
  // Défis (Admin/Agence)
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/eco-challenges/${queryString ? `?${queryString}` : ''}`;
    console.log('📡 Fetching challenges:', url);
    return api.get(url);
  },

  getById: (id) => api.get(`/api/eco-challenges/${id}/`),
  create: (data) => api.post('/api/eco-challenges/', data),
  update: (id, data) => api.put(`/api/eco-challenges/${id}/`, data),
  partialUpdate: (id, data) => api.patch(`/api/eco-challenges/${id}/`, data),
  delete: (id) => api.delete(`/api/eco-challenges/${id}/`),

  // Actions système Challenge
  getAvailable: () => api.get('/api/eco-challenges/available/'),
  getFeatured: () => api.get('/api/eco-challenges/featured/'),
  getAnalytics: () => api.get('/api/eco-challenges/analytics/'),
  getParticipants: (id) => api.get(`/api/eco-challenges/${id}/participants/`),
  duplicate: (id) => api.post(`/api/eco-challenges/${id}/duplicate/`),
  bulkAction: (data) => api.post('/api/eco-challenges/bulk_action/', data),
  exportData: (id) =>
    api.get(`/api/eco-challenges/${id}/export_data/`, { responseType: 'blob' }),

  // Défis Utilisateur
  getUserChallenges: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/api/user-eco-challenges/${queryString ? `?${queryString}` : ''}`);
  },
  joinChallenge: (data) => api.post('/api/user-eco-challenges/join_challenge/', data),
  abandonChallenge: (id) => api.post(`/api/user-eco-challenges/${id}/abandon/`),
  getProgressHistory: (id) => api.get(`/api/user-eco-challenges/${id}/progress_history/`),

  // Progression
  createProgress: (data) => api.post('/api/eco-challenge-progress/', data),
  getProgress: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/api/eco-challenge-progress/${queryString ? `?${queryString}` : ''}`);
  },

  // Récompenses
  getMyRewards: () => api.get('/api/eco-challenge-rewards/my_rewards/'),
  claimReward: (id) => api.post(`/api/eco-challenge-rewards/${id}/claim/`),
  getRewards: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/api/eco-challenge-rewards/${queryString ? `?${queryString}` : ''}`);
  },
};

// ✅ CORRECTION : Service d'authentification amélioré
export const authService = {
  login: (credentials) => api.post('/login/', credentials),
  register: (userData) => api.post('/inscription/', userData),
  refreshToken: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    return api.post('/api/token/refresh/', { refresh: refreshToken });
  },
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return api.post('/logout/');
  },
  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    console.log('🔍 Auth check - has token:', !!token);
    return !!token;
  },
  getCurrentUser: () => api.get('/profile/'),
  
  // ✅ AJOUT : Fonction pour vérifier la validité du token
  validateToken: async () => {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  },
};

// Utilitaires pour la gestion des erreurs
export const errorUtils = {
  getErrorMessage: (error) => {
    console.log('🔍 Processing error:', error);
    
    if (error.response?.data?.error) return error.response.data.error;
    if (error.response?.data?.message) return error.response.data.message;
    if (error.response?.data?.detail) return error.response.data.detail;
    if (error.response?.data?.non_field_errors) {
      return Array.isArray(error.response.data.non_field_errors)
        ? error.response.data.non_field_errors.join(', ')
        : error.response.data.non_field_errors;
    }

    if (error.response?.data && typeof error.response.data === 'object') {
      const messages = [];
      for (const [field, errors] of Object.entries(error.response.data)) {
        if (Array.isArray(errors)) {
          messages.push(`${field}: ${errors.join(', ')}`);
        } else if (typeof errors === 'string') {
          messages.push(`${field}: ${errors}`);
        }
      }
      if (messages.length > 0) return messages.join('; ');
    }

    if (error.message) return error.message;
    return "Une erreur inattendue s'est produite";
  },

  isAuthError: (error) => error.response?.status === 401,
  isPermissionError: (error) => error.response?.status === 403,
  isValidationError: (error) => error.response?.status === 400,
  isServerError: (error) => error.response?.status >= 500,
};

export default {
  api,
  ecoChallengesService,
  authService,
  errorUtils,
};
