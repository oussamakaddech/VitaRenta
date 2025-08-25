import axios from 'axios';
import { useState } from 'react';

// Configuration de base pour tous les appels API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Instance axios principale
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Augmenté pour les requêtes lentes
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter automatiquement le token JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Erreur dans la requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les réponses et erreurs
api.interceptors.response.use(
  (response) => {
    // Log des réponses en mode développement
    if (process.env.NODE_ENV === 'development') {
      console.log('API Response:', {
        url: response.config.url,
        method: response.config.method,
        status: response.status,
        data: response.data
      });
    }
    return response;
  },
  async (error) => {
    console.error('Erreur API:', error);
    
    // Gestion automatique des erreurs d'authentification
    if (error.response?.status === 401) {
      // Ne rediriger que si on n'est pas déjà sur une page publique
      const publicPages = ['/login', '/signup', '/reset-password', '/'];
      const currentPath = window.location.pathname;
      
      // Vérifier si on a un refresh token valide
      const refreshToken = localStorage.getItem('refresh_token');
      
      if (refreshToken && !publicPages.includes(currentPath)) {
        try {
          // Tenter de rafraîchir le token avant de rediriger
          const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { 
            refresh: refreshToken 
          });
          
          localStorage.setItem('access_token', response.data.access);
          
          // Retry la requête originale avec le nouveau token
          error.config.headers.Authorization = `Bearer ${response.data.access}`;
          return api.request(error.config);
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          // Si le refresh échoue, alors nettoyer et rediriger
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          if (!publicPages.includes(currentPath)) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      } else {
        // Pas de refresh token ou déjà sur une page publique
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (!publicPages.includes(currentPath)) {
          window.location.href = '/login';
        }
      }
    }
    
    // Gestion des erreurs serveur
    if (error.response?.status >= 500) {
      console.error('Erreur serveur:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Service d'authentification
export const authService = {
  // Connexion
  login: (credentials) => api.post('/login/', credentials),
  
  // Inscription
  register: (userData) => api.post('/inscription/', userData),
  
  // Rafraîchir le token
  refreshToken: () => {
    const refreshToken = localStorage.getItem('refresh_token');
    return api.post('/api/token/refresh/', { refresh: refreshToken });
  },
  
  // Déconnexion
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    return api.post('/logout/');
  },
  
  // Vérifier si l'utilisateur est connecté
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
  
  // Récupérer les informations de l'utilisateur connecté
  getCurrentUser: () => api.get('/profile/'),
  
  // Vérifier si le token est valide
  isTokenValid: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return false;
      
      await api.post('/api/token/verify/', { token });
      return true;
    } catch (error) {
      return false;
    }
  },

  // Rafraîchir automatiquement le token si nécessaire
  ensureValidToken: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;

    try {
      // Vérifier si le token actuel est valide
      await api.post('/api/token/verify/', { token });
      return true;
    } catch (error) {
      // Token invalide, essayer de le rafraîchir
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await api.post('/api/token/refresh/', { 
            refresh: refreshToken 
          });
          localStorage.setItem('access_token', response.data.access);
          return true;
        }
      } catch (refreshError) {
        // Nettoyage si le refresh échoue
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return false;
      }
      return false;
    }
  }
};

// Service pour les défis éco-responsables
export const ecoChallengesService = {
  // Récupérer les défis disponibles
  getAvailable: () => api.get('/api/eco-challenges/available/'),
  
  // Récupérer les défis complétés par l'utilisateur
  getCompleted: () => api.get('/api/eco-challenges/completed/'),
  
  // Récupérer les statistiques utilisateur
  getStats: () => api.get('/api/eco-challenges/stats/'),
  
  // Accepter un défi
  accept: (challengeId) => api.post(`/api/eco-challenges/${challengeId}/accept/`),
  
  // Abandonner un défi
  abandon: (challengeId) => api.post(`/api/eco-challenges/${challengeId}/abandon/`),
  
  // Health check
  healthCheck: () => api.get('/api/eco-challenges/health_check/'),
  
  // Récupérer les défis actifs
  getActive: () => api.get('/api/eco-challenges/active/'),
  
  // Récupérer les participants d'un défi (admin)
  getParticipants: (challengeId) => api.get(`/api/eco-challenges/${challengeId}/participants/`),
};

// Service pour les utilisateurs
export const userService = {
  // Récupérer le profil utilisateur
  getProfile: () => api.get('/profile/'),
  
  // Mettre à jour le profil
  updateProfile: (userData) => api.patch('/profile/', userData),
  
  // Changer le mot de passe
  changePassword: (passwordData) => api.post('/api/users/change-password/', passwordData),
};

// Utilitaires pour la gestion des erreurs
export const errorUtils = {
  // Extraire le message d'erreur principal
  getErrorMessage: (error) => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.response?.data?.message) {
      return error.response.data.message;
    }
    if (error.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error.response?.data?.non_field_errors) {
      return Array.isArray(error.response.data.non_field_errors) 
        ? error.response.data.non_field_errors.join(', ')
        : error.response.data.non_field_errors;
    }
    if (error.message) {
      return error.message;
    }
    return 'Une erreur inattendue s\'est produite';
  },
  
  // Vérifier si c'est une erreur de réseau
  isNetworkError: (error) => {
    return !error.response && error.code === 'NETWORK_ERROR';
  },
  
  // Vérifier si c'est une erreur d'authentification
  isAuthError: (error) => {
    return error.response?.status === 401;
  },
  
  // Vérifier si c'est une erreur de permissions
  isPermissionError: (error) => {
    return error.response?.status === 403;
  },
};

// Hook personnalisé pour les appels API avec gestion d'état
export const useApiCall = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const execute = async (apiCall) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiCall();
      setData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = errorUtils.getErrorMessage(err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setLoading(false);
    setError(null);
    setData(null);
  };

  return { loading, error, data, execute, reset };
};

// Configuration des constantes - TOUS LES ENDPOINTS
export const API_ENDPOINTS = {
  ECO_CHALLENGES: {
    BASE: '/api/eco-challenges/',
    AVAILABLE: '/api/eco-challenges/available/',
    COMPLETED: '/api/eco-challenges/completed/',
    STATS: '/api/eco-challenges/stats/',
    HEALTH_CHECK: '/api/eco-challenges/health_check/',
    ACTIVE: '/api/eco-challenges/active/',
    TEMPLATES: '/api/eco-challenges/templates/',
    ANALYTICS: '/api/eco-challenges/analytics/',
    BULK_ACTION: '/api/eco-challenges/bulk_action/',
    ACCEPT: (id) => `/api/eco-challenges/${id}/accept/`,
    ABANDON: (id) => `/api/eco-challenges/${id}/abandon/`,
    PARTICIPANTS: (id) => `/api/eco-challenges/${id}/participants/`,
    DUPLICATE: (id) => `/api/eco-challenges/${id}/duplicate/`,
    EXPORT: (id) => `/api/eco-challenges/${id}/export_data/`,
  },
  AUTH: {
    LOGIN: '/login/',
    REGISTER: '/inscription/',
    REFRESH: '/api/token/refresh/',
    VERIFY: '/api/token/verify/',
    LOGOUT: '/logout/',
    USER: '/profile/',
  },
  USERS: {
    PROFILE: '/profile/',
    CHANGE_PASSWORD: '/api/users/change-password/',
  },
};

// Export par défaut
export default {
  api,
  ecoChallengesService,
  authService,
  userService,
  errorUtils,
  API_ENDPOINTS,
};
