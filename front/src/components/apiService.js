// apiService.js - VERSION CORRIGÉE ET COMPLÈTE AVEC POINTS ET COUPONS

import axios from 'axios';

// ✅ Configuration de base corrigée
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
console.log('🌐 API Base URL configuré:', API_BASE_URL);

// ✅ Instance axios principale avec configuration étendue
export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// ✅ Intercepteur de requête amélioré avec debug
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // 🔍 Debug détaillé de la requête
        console.log('🔐 Request config:', {
            url: `${config.baseURL}${config.url}`,
            method: config.method?.toUpperCase(),
            hasAuth: !!config.headers.Authorization,
            params: config.params,
            data: config.data
        });
        
        return config;
    },
    (error) => {
        console.error('❌ Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// ✅ Intercepteur de réponse amélioré avec gestion complète d'erreurs
api.interceptors.response.use(
    (response) => {
        console.log('✅ Response success:', {
            status: response.status,
            url: response.config.url,
            data: response.data
        });
        return response;
    },
    async (error) => {
        const originalRequest = error.config;
        
        // 🔍 Debug détaillé de l'erreur
        console.log('❌ Response error:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: originalRequest?.url,
            method: originalRequest?.method,
            hasToken: !!localStorage.getItem('access_token'),
            errorData: error.response?.data,
            errorMessage: error.message
        });

        // Gestion du refresh token pour erreurs 401
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
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    console.log('✅ Token refreshed successfully');
                    
                    return api(originalRequest);
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    localStorage.removeItem('user_data');
                    
                    if (!publicPages.includes(currentPath)) {
                        window.location.href = '/login';
                    }
                }
            } else {
                console.log('🔄 No refresh token or on public page, redirecting to login');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('user_data');
                
                if (!publicPages.includes(currentPath)) {
                    window.location.href = '/login';
                }
            }
        }
        
        return Promise.reject(error);
    }
);

// ✅ Service ecoChallenges existant (conservé et amélioré)
export const ecoChallengesService = {
    // Défis (Admin/Agence)
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/eco-challenges/${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching challenges:', url);
        return api.get(url);
    },

    updateProgress: (data) => {
        console.log('📊 Envoi de la progression:', data);
        
        // Validation côté client renforcée
        if (!data.user_challenge_id) {
            throw new Error('user_challenge_id est requis');
        }
        if (!data.progress_value || data.progress_value <= 0) {
            throw new Error('progress_value doit être supérieur à 0');
        }
        
        return api.post('/api/eco-challenge-progress/', {
            user_challenge: data.user_challenge_id,
            value: data.progress_value,
            entry_type: data.entry_type || 'manual'
        });
    },

    // CRUD de base
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
    exportData: (id) => api.get(`/api/eco-challenges/${id}/export_data/`, { responseType: 'blob' }),

    // Défis Utilisateur
    getUserChallenges: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/user-eco-challenges/${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching user challenges:', url);
        return api.get(url);
    },
    
    joinChallenge: (data) => {
        console.log('🔄 ecoChallengesService.joinChallenge appelé avec:', data);
        if (!data?.challenge_id) {
            throw new Error('challenge_id est requis');
        }
        return api.post('/api/user-eco-challenges/join_challenge/', data);
    },
    
    abandonChallenge: (id) => api.post(`/api/user-eco-challenges/${id}/abandon/`),
    getProgressHistory: (id) => api.get(`/api/user-eco-challenges/${id}/progress_history/`),

    // Progression
    createProgress: (data) => api.post('/api/eco-challenge-progress/', data),
    getProgress: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/eco-challenge-progress/${queryString ? `?${queryString}` : ''}`;
        return api.get(url);
    },

    // Récompenses
    getMyRewards: () => api.get('/api/eco-challenge-rewards/my_rewards/'),
    claimReward: (id) => api.post(`/api/eco-challenge-rewards/${id}/claim/`),
    getRewards: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/eco-challenge-rewards/${queryString ? `?${queryString}` : ''}`;
        return api.get(url);
    },
};

// ✅ Service pour les Points (CORRIGÉ)
export const pointsService = {
    // ✅ Points utilisateur avec gestion d'erreur
    getMyPoints: () => {
        console.log('📡 Fetching user points...');
        return api.get('/api/user-points/my-points/')
            .catch(error => {
                console.error('❌ Erreur récupération points:', error);
                throw error;
            });
    },
    
    getPoints: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/user-points/${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching points list:', url);
        return api.get(url);
    },
    
    // ✅ Transactions avec gestion d'erreur
    getTransactions: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/points-transactions/${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching transactions:', url);
        return api.get(url);
    },
    
    // ✅ Statistiques des points
    getPointsStats: () => {
        console.log('📡 Fetching points stats...');
        return api.get('/api/user-points/stats/');
    },
    
    // ✅ Ajouter des points manuellement (admin)
    addPoints: (data) => {
        console.log('💎 Adding points:', data);
        return api.post('/api/user-points/add/', data);
    }
};

// ✅ Service pour les Coupons (CORRIGÉ)
export const couponsService = {
    // ✅ Coupons disponibles avec gestion d'erreur améliorée
    getAvailable: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        // ✅ CORRECTION: Enlever le slash final qui peut causer des problèmes
        const url = `/api/coupons/available${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching available coupons:', url);
        
        return api.get(url)
            .catch(error => {
                console.error('❌ Erreur récupération coupons disponibles:', {
                    url,
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                throw error;
            });
    },
    
    // ✅ Tous les coupons (admin)
    getAll: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/coupons${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching all coupons:', url);
        return api.get(url);
    },
    
    // CRUD de base pour coupons
    getById: (id) => {
        console.log('📡 Fetching coupon by ID:', id);
        return api.get(`/api/coupons/${id}/`);
    },
    
    create: (data) => {
        console.log('🎫 Creating coupon:', data);
        return api.post('/api/coupons/', data);
    },
    
    update: (id, data) => {
        console.log('🎫 Updating coupon:', id, data);
        return api.put(`/api/coupons/${id}/`, data);
    },
    
    delete: (id) => {
        console.log('🗑️ Deleting coupon:', id);
        return api.delete(`/api/coupons/${id}/`);
    },
    
    // ✅ Coupons utilisateur avec gestion d'erreur
    getMyCoupons: () => {
        console.log('📡 Fetching my coupons...');
        return api.get('/api/user-coupons/my-coupons/')
            .catch(error => {
                console.error('❌ Erreur récupération mes coupons:', error);
                throw error;
            });
    },
    
    // ✅ Réclamation de coupon avec validation
    claimCoupon: (data) => {
        console.log('🎫 Réclamation de coupon:', data);
        
        // Validation renforcée
        if (!data || typeof data !== 'object') {
            throw new Error('Données de réclamation invalides');
        }
        if (!data.coupon_id) {
            throw new Error('coupon_id est requis');
        }
        
        return api.post('/api/user-coupons/claim-coupon/', data)
            .catch(error => {
                console.error('❌ Erreur réclamation coupon:', {
                    data,
                    status: error.response?.status,
                    responseData: error.response?.data,
                    message: error.message
                });
                throw error;
            });
    },
    
    getUserCoupons: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const url = `/api/user-coupons/${queryString ? `?${queryString}` : ''}`;
        console.log('📡 Fetching user coupons:', url);
        return api.get(url);
    },
    
    // ✅ Utilisation d'un coupon
    useCoupon: (couponId, reservationData = {}) => {
        console.log('🎫 Using coupon:', couponId, reservationData);
        return api.post(`/api/user-coupons/${couponId}/use/`, reservationData);
    },
    
    // ✅ Validation d'un code coupon
    validateCoupon: (code) => {
        console.log('🔍 Validating coupon code:', code);
        if (!code || typeof code !== 'string') {
            throw new Error('Code coupon invalide');
        }
        return api.post('/api/user-coupons/validate/', { code });
    },
    
    // ✅ Statistiques des coupons utilisateur
    getMyCouponsStats: () => {
        console.log('📊 Fetching my coupons stats...');
        return api.get('/api/user-coupons/stats/');
    }
};

// ✅ Service d'authentification existant (conservé et amélioré)
export const authService = {
    login: (credentials) => {
        console.log('🔐 Attempting login...');
        return api.post('/login/', credentials);
    },
    
    register: (userData) => {
        console.log('📝 Attempting registration...');
        return api.post('/inscription/', userData);
    },
    
    refreshToken: () => {
        const refreshToken = localStorage.getItem('refresh_token');
        console.log('🔄 Refreshing token...');
        return api.post('/api/token/refresh/', { refresh: refreshToken });
    },
    
    logout: () => {
        console.log('👋 Logging out...');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        return api.post('/logout/');
    },
    
    isAuthenticated: () => {
        const token = localStorage.getItem('access_token');
        const isAuth = !!token;
        console.log('🔍 Auth check - has token:', isAuth);
        return isAuth;
    },
    
    getCurrentUser: () => {
        console.log('👤 Fetching current user...');
        return api.get('/profile/');
    },
    
    // ✅ Validation de token améliorée
    validateToken: async () => {
        try {
            console.log('🔍 Validating token with server...');
            const response = await api.get('/profile/');
            console.log('✅ Token validation successful');
            return response.data;
        } catch (error) {
            console.error('❌ Token validation failed:', error);
            return null;
        }
    },
    
    // ✅ Mise à jour du profil
    updateProfile: (data) => {
        console.log('👤 Updating profile:', data);
        return api.patch('/profile/', data);
    },
    
    // ✅ Changement de mot de passe
    changePassword: (data) => {
        console.log('🔐 Changing password...');
        return api.post('/auth/change-password/', data);
    }
};

// ✅ Utilitaires pour la gestion des erreurs (améliorés)
export const errorUtils = {
    getErrorMessage: (error) => {
        console.log('🔍 Processing error:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        
        // Gestion des erreurs par priorité
        if (error.response?.data?.error) return error.response.data.error;
        if (error.response?.data?.message) return error.response.data.message;
        if (error.response?.data?.detail) return error.response.data.detail;
        
        // Gestion des erreurs de validation
        if (error.response?.data?.non_field_errors) {
            return Array.isArray(error.response.data.non_field_errors)
                ? error.response.data.non_field_errors.join(', ')
                : error.response.data.non_field_errors;
        }
        
        // Gestion des erreurs de champs spécifiques
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
        
        // Messages par code d'erreur
        const statusMessages = {
            400: 'Données invalides',
            401: 'Non authentifié',
            403: 'Accès interdit',
            404: 'Ressource non trouvée',
            409: 'Conflit de données',
            422: 'Données non traitables',
            429: 'Trop de requêtes',
            500: 'Erreur serveur interne',
            502: 'Passerelle défaillante',
            503: 'Service indisponible',
            
        };
        
        if (error.response?.status && statusMessages[error.response.status]) {
            return `${statusMessages[error.response.status]} (${error.response.status})`;
        }
        
        // Message par défaut
        if (error.message) return error.message;
        return "Une erreur inattendue s'est produite";
    },
    
    // ✅ Helpers pour identifier les types d'erreurs
    isAuthError: (error) => error.response?.status === 401,
    isPermissionError: (error) => error.response?.status === 403,
    isValidationError: (error) => error.response?.status === 400,
    isNotFoundError: (error) => error.response?.status === 404,
    isConflictError: (error) => error.response?.status === 409,
    isServerError: (error) => error.response?.status >= 500,
    isNetworkError: (error) => !error.response && error.request,
    
    // ✅ Helper pour retry automatique
    shouldRetry: (error, retryCount = 0) => {
        const maxRetries = 3;
        const retryableStatuses = [429, 500, 502, 503, 504];
        
        return retryCount < maxRetries && 
               (errorUtils.isNetworkError(error) || 
                (error.response?.status && retryableStatuses.includes(error.response.status)));
    }
};

// ✅ Helper pour tester la connectivité API
export const apiHealthCheck = async () => {
    try {
        console.log('🏥 Checking API health...');
        const response = await api.get('/health/', { timeout: 5000 });
        console.log('✅ API is healthy:', response.data);
        return true;
    } catch (error) {
        console.error('❌ API health check failed:', error);
        return false;
    }
};

// ✅ Helper pour retry automatique d'une requête
export const apiRetry = async (requestFn, maxRetries = 3, delay = 1000) => {
    let lastError;
    
    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            lastError = error;
            
            if (i === maxRetries || !errorUtils.shouldRetry(error, i)) {
                throw error;
            }
            
            console.log(`⏳ Retry ${i + 1}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
        }
    }
    
    throw lastError;
};

// ✅ Export par défaut avec tous les services
export default {
    api,
    ecoChallengesService,
    pointsService,
    couponsService,
    authService,
    errorUtils,
    apiHealthCheck,
    apiRetry,
};
