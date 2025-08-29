// apiService.js - Version corrigée et optimisée avec fonctionnalités ADMIN
import axios from 'axios';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Instance Axios principale
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Variable pour éviter les appels multiples de refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercepteur de requête amélioré
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Intercepteur de réponse robuste avec gestion des files d'attente
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`API Call: ${response.config.method?.toUpperCase()} ${response.config.url} - ${duration}ms`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        }).catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      const publicPages = ['/login', '/signup', '/reset-password', '/', '/about', '/contact'];
      const currentPath = window.location.pathname;

      if (refreshToken && !publicPages.includes(currentPath)) {
        try {
          const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { 
            refresh: refreshToken 
          });
          
          const newAccessToken = response.data.access;
          localStorage.setItem('access_token', newAccessToken);
          
          processQueue(null, newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          processQueue(refreshError, null);
          
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_data');
          
          if (!publicPages.includes(currentPath)) {
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        if (!publicPages.includes(currentPath)) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        
        return Promise.reject(error);
      }
    }
    
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Service EcoChallenges amélioré avec validation et fonctionnalités ADMIN
export const ecoChallengesService = {
  // Récupérer tous les défis avec pagination
  getAll: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get('/api/eco-challenges/', { params: cleanParams });
  },

  // Mise à jour du progrès avec validation stricte
  updateProgress: (data) => {
    if (!data?.user_challenge_id) {
      throw new Error('user_challenge_id est requis');
    }
    if (!data.progress_value || data.progress_value <= 0) {
      throw new Error('progress_value doit être supérieur à 0');
    }
    
    return api.post('/api/eco-challenge-progress/', {
      user_challenge: data.user_challenge_id,
      value: parseFloat(data.progress_value),
      entry_type: data.entry_type || 'manual',
      unit: data.unit || 'km'
    });
  },

  // CRUD operations
  getById: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.get(`/api/eco-challenges/${id}/`);
  },

  create: (data) => {
    if (!data?.title || !data?.target_value) {
      throw new Error('Titre et valeur cible sont requis');
    }
    return api.post('/api/eco-challenges/', data);
  },

  update: (id, data) => {
    if (!id) throw new Error('ID est requis');
    return api.put(`/api/eco-challenges/${id}/`, data);
  },

  partialUpdate: (id, data) => {
    if (!id) throw new Error('ID est requis');
    return api.patch(`/api/eco-challenges/${id}/`, data);
  },

  delete: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.delete(`/api/eco-challenges/${id}/`);
  },

  // Endpoints spécialisés
  getAvailable: () => api.get('/api/eco-challenges/available/'),
  getFeatured: () => api.get('/api/eco-challenges/featured/'),
  getAnalytics: () => api.get('/api/eco-challenges/analytics/'),

  getParticipants: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.get(`/api/eco-challenges/${id}/participants/`);
  },

  duplicate: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.post(`/api/eco-challenges/${id}/duplicate/`);
  },

  bulkAction: (data) => {
    if (!data?.challenge_ids?.length || !data?.action) {
      throw new Error('challenge_ids et action sont requis');
    }
    return api.post('/api/eco-challenges/bulk_action/', data);
  },

  exportData: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.get(`/api/eco-challenges/${id}/export_data/`, { 
      responseType: 'blob',
      timeout: 30000
    });
  },

  // Gestion des défis utilisateur
  getUserChallenges: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get('/api/user-eco-challenges/', { params: cleanParams });
  },

  joinChallenge: (data) => {
    if (!data?.challenge_id) {
      throw new Error('challenge_id est requis');
    }
    return api.post('/api/user-eco-challenges/join_challenge/', {
      challenge_id: String(data.challenge_id)
    });
  },

  abandonChallenge: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.post(`/api/user-eco-challenges/${id}/abandon/`);
  },

  getProgressHistory: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.get(`/api/user-eco-challenges/${id}/progress_history/`);
  },

  // Gestion des progrès
  createProgress: (data) => {
    if (!data?.user_challenge || !data?.value) {
      throw new Error('user_challenge et value sont requis');
    }
    return api.post('/api/eco-challenge-progress/', data);
  },

  getProgress: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get('/api/eco-challenge-progress/', { params: cleanParams });
  },

  // Gestion des récompenses
  getMyRewards: () => api.get('/api/eco-challenge-rewards/my_rewards/'),
  
  claimReward: (id) => {
    if (!id) throw new Error('ID est requis');
    return api.post(`/api/eco-challenge-rewards/${id}/claim/`);
  },

  getRewards: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get('/api/eco-challenge-rewards/', { params: cleanParams });
  },

  // ✅ NOUVELLES FONCTIONNALITÉS ADMIN
  // ==========================================

  // Récupérer tous les utilisateurs (ADMIN seulement)
  getAllUsers: () => {
    return api.get('/api/admin/users/');
  },

  // Récupérer tous les défis de tous les utilisateurs (ADMIN seulement)
  getAllUsersChallenges: (params = {}) => {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get('/api/admin/user-challenges/', { params: cleanParams });
  },

  // Ajouter des points à un utilisateur spécifique (ADMIN seulement)
  addPointsToUser: (userId, points, reason = 'Bonus administrateur') => {
    if (!userId) throw new Error('userId est requis');
    if (!points || points <= 0) throw new Error('points doit être supérieur à 0');
    
    return api.post('/api/admin/add-points/', {
      user_id: userId,
      points: parseInt(points),
      reason: reason,
      source: 'admin'
    });
  },

  // Récupérer les statistiques détaillées d'un utilisateur (ADMIN seulement)
  getUserStats: (userId) => {
    if (!userId) throw new Error('userId est requis');
    return api.get(`/api/admin/users/${userId}/stats/`);
  },

  // Récupérer l'historique des points d'un utilisateur (ADMIN seulement)
  getUserPointsHistory: (userId, params = {}) => {
    if (!userId) throw new Error('userId est requis');
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get(`/api/admin/users/${userId}/points-history/`, { params: cleanParams });
  },

  // Réinitialiser les points d'un utilisateur (ADMIN seulement)
  resetUserPoints: (userId, reason = 'Réinitialisation admin') => {
    if (!userId) throw new Error('userId est requis');
    return api.post(`/api/admin/users/${userId}/reset-points/`, {
      reason: reason
    });
  },

  // Forcer la complétion d'un défi pour un utilisateur (ADMIN seulement)
  forceCompleteUserChallenge: (userChallengeId, reason = 'Complétion forcée admin') => {
    if (!userChallengeId) throw new Error('userChallengeId est requis');
    return api.post(`/api/admin/user-challenges/${userChallengeId}/force-complete/`, {
      reason: reason
    });
  },

  // Récupérer les statistiques globales de la plateforme (ADMIN seulement)
  getPlatformStats: () => {
    return api.get('/api/admin/platform-stats/');
  },

  // Récupérer les défis d'un utilisateur spécifique avec détails admin
  getUserChallengesAdmin: (userId, params = {}) => {
    if (!userId) throw new Error('userId est requis');
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== null && value !== undefined && value !== '')
    );
    return api.get(`/api/admin/users/${userId}/challenges/`, { params: cleanParams });
  },

  // Modifier le statut d'un défi utilisateur (ADMIN seulement)
  updateUserChallengeStatus: (userChallengeId, status, reason = '') => {
    if (!userChallengeId) throw new Error('userChallengeId est requis');
    if (!status) throw new Error('status est requis');
    
    const validStatuses = ['active', 'paused', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Status doit être l'un de: ${validStatuses.join(', ')}`);
    }
    
    return api.patch(`/api/admin/user-challenges/${userChallengeId}/status/`, {
      status: status,
      reason: reason
    });
  },

  // Créer un utilisateur (ADMIN seulement)
  createUser: (userData) => {
    if (!userData?.username || !userData?.email) {
      throw new Error('username et email sont requis');
    }
    return api.post('/api/admin/users/', userData);
  },

  // Modifier un utilisateur (ADMIN seulement)
  updateUser: (userId, userData) => {
    if (!userId) throw new Error('userId est requis');
    return api.patch(`/api/admin/users/${userId}/`, userData);
  },

  // Désactiver/activer un utilisateur (ADMIN seulement)
  toggleUserStatus: (userId, isActive) => {
    if (!userId) throw new Error('userId est requis');
    return api.patch(`/api/admin/users/${userId}/toggle-status/`, {
      is_active: Boolean(isActive)
    });
  },

  // Export des données utilisateur (ADMIN seulement)
  exportUserData: (userId, format = 'csv') => {
    if (!userId) throw new Error('userId est requis');
    return api.get(`/api/admin/users/${userId}/export/`, {
      params: { format },
      responseType: 'blob',
      timeout: 30000
    });
  },

  // Export des données globales (ADMIN seulement)
  exportAllUsersData: (format = 'csv') => {
    return api.get('/api/admin/export/users/', {
      params: { format },
      responseType: 'blob',
      timeout: 60000 // Plus long timeout pour l'export global
    });
  }
};

// Service d'authentification amélioré
export const authService = {
  login: async (credentials) => {
    if (!credentials?.username || !credentials?.password) {
      throw new Error('Username et password sont requis');
    }
    
    try {
      const response = await api.post('/login/', credentials);
      
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      if (response.data.refresh) {
        localStorage.setItem('refresh_token', response.data.refresh);
      }
      
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  register: (userData) => {
    if (!userData?.email || !userData?.password) {
      throw new Error('Email et password sont requis');
    }
    return api.post('/inscription/', userData);
  },

  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('Aucun refresh token disponible');
    }
    
    try {
      const response = await api.post('/api/token/refresh/', { refresh: refreshToken });
      
      if (response.data.access) {
        localStorage.setItem('access_token', response.data.access);
      }
      
      return response;
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.post('/logout/');
    } catch (error) {
      console.warn('Logout API call failed:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return !!token;
    }
  },

  getCurrentUser: () => api.get('/profile/'),

  validateToken: async () => {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return null;
    }
  }
};

// Utilitaires d'erreur étendus
export const errorUtils = {
  getErrorMessage: (error) => {
    if (!error.response) {
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        return 'Problème de connexion réseau. Vérifiez votre connexion internet.';
      }
      if (error.code === 'ECONNABORTED') {
        return 'La requête a pris trop de temps. Réessayez.';
      }
      return error.message || 'Erreur de connexion';
    }

    const data = error.response.data;
    
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    
    if (data?.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join(', ')
        : data.non_field_errors;
    }
    
    if (data && typeof data === 'object') {
      const fieldErrors = Object.entries(data)
        .filter(([field, _]) => field !== 'non_field_errors')
        .map(([field, errors]) => {
          const errorMsg = Array.isArray(errors) ? errors.join(', ') : String(errors);
          return `${field}: ${errorMsg}`;
        })
        .join('; ');
      
      if (fieldErrors) return fieldErrors;
    }
    
    switch (error.response.status) {
      case 400: return 'Données invalides';
      case 401: return 'Authentification requise';
      case 403: return 'Accès interdit';
      case 404: return 'Ressource non trouvée';
      case 429: return 'Trop de requêtes, veuillez patienter';
      case 500: return 'Erreur serveur interne';
      case 502: return 'Service temporairement indisponible';
      case 503: return 'Service en maintenance';
      default: return error.message || "Une erreur inattendue s'est produite";
    }
  },

  isAuthError: (error) => error.response?.status === 401,
  isPermissionError: (error) => error.response?.status === 403,
  isValidationError: (error) => error.response?.status === 400,
  isServerError: (error) => error.response?.status >= 500,
  isNetworkError: (error) => !error.response && error.code === 'NETWORK_ERROR',
  isTimeoutError: (error) => error.code === 'ECONNABORTED',

  isRetryableError: (error) => {
    if (!error.response) return true;
    const status = error.response.status;
    return status >= 500 || status === 429;
  }
};

export default {
  api,
  ecoChallengesService,
  authService,
  errorUtils
};
