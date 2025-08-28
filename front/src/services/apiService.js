// apiService.js - Version corrigée et optimisée

import axios from 'axios';

// Configuration de base
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Instance Axios principale
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // ✅ Réduit de 30s à 15s pour de meilleures performances
  headers: { 
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// ✅ Variable pour éviter les appels multiples de refresh
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

// ✅ Intercepteur de requête amélioré
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // ✅ Ajout d'un identifiant unique pour chaque requête
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// ✅ Intercepteur de réponse robuste avec gestion des files d'attente
api.interceptors.response.use(
  (response) => {
    // ✅ Log des performances optionnel
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
        // ✅ Si un refresh est déjà en cours, ajouter à la file d'attente
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
          
          // ✅ Traiter la file d'attente avec le nouveau token
          processQueue(null, newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          
          // ✅ Traiter la file d'attente avec erreur
          processQueue(refreshError, null);
          
          // ✅ Nettoyage sécurisé
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_data');
          
          if (!publicPages.includes(currentPath)) {
            // ✅ Utiliser un événement personnalisé au lieu de redirection forcée
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
          
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        // ✅ Pas de refresh token disponible
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        if (!publicPages.includes(currentPath)) {
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
        
        return Promise.reject(error);
      }
    }
    
    // ✅ Gestion spécifique des autres codes d'erreur
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.status, error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// ✅ Service EcoChallenges amélioré avec validation
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
      timeout: 30000 // ✅ Timeout plus long pour l'export
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
  }
};

// ✅ Service d'authentification amélioré
export const authService = {
  login: async (credentials) => {
    if (!credentials?.username || !credentials?.password) {
      throw new Error('Username et password sont requis');
    }
    
    try {
      const response = await api.post('/login/', credentials);
      
      // ✅ Stockage automatique des tokens
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
      // ✅ Nettoyage en cas d'échec
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
      // ✅ Nettoyage toujours effectué
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    // ✅ Vérification basique de l'expiration (optionnel)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return !!token; // Fallback si le token n'est pas JWT
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

// ✅ Utilitaires d'erreur étendus
export const errorUtils = {
  getErrorMessage: (error) => {
    // ✅ Gestion des erreurs de réseau
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
    
    // ✅ Gestion hiérarchique des messages d'erreur
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    
    if (data?.non_field_errors) {
      return Array.isArray(data.non_field_errors)
        ? data.non_field_errors.join(', ')
        : data.non_field_errors;
    }
    
    // ✅ Gestion des erreurs de validation de champs
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
    
    // ✅ Messages par défaut selon le code de statut
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

  // ✅ Fonction pour déterminer si une erreur est récupérable
  isRetryableError: (error) => {
    if (!error.response) return true; // Erreurs réseau
    const status = error.response.status;
    return status >= 500 || status === 429; // Erreurs serveur ou rate limiting
  }
};

// ✅ Export par défaut amélioré
export default {
  api,
  ecoChallengesService,
  authService,
  errorUtils
};
