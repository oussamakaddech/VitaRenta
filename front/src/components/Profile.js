import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './Profile.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Profile = ({ token, setToken, setUser }) => {
  // ===== ÉTATS PRINCIPAUX =====
  const [userProfile, setUserProfile] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [saveLoading, setSaveLoading] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [reservations, setReservations] = useState([]);
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // ===== ÉTATS POUR LA PHOTO DE PROFIL =====
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  // ===== HOOKS =====
  const navigate = useNavigate();
  const messageTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // ===== CONFIGURATION API =====
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    client.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(
                `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/token/refresh/`,
                { refresh: refreshToken }
              );
              const newAccessToken = response.data.access;
              localStorage.setItem('access_token', newAccessToken);
              setToken(newAccessToken);
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return client(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('userData');
            setToken('');
            setUser(null);
            navigate('/login', { state: { message: 'Session expirée. Veuillez vous reconnecter.' } });
          }
        }
        return Promise.reject(error);
      }
    );

    return client;
  }, [token, setToken, setUser, navigate]);

  // ===== FONCTIONS UTILITAIRES =====
  const showMessage = useCallback((message, type = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setError('');
    } else {
      setError(message);
      setSuccessMessage('');
    }

    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    messageTimeoutRef.current = setTimeout(() => {
      setSuccessMessage('');
      setError('');
    }, 5000);
  }, []);

  // ===== VALIDATION =====
  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'email':
        return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'nom':
        return value && value.trim().length >= 2;
      case 'telephone':
        if (!value) return true;
        const cleanValue = value.replace(/[\s\-\.]/g, '');
        return /^\+?\d{10,15}$/.test(cleanValue);
      case 'budget_journalier':
        const budget = parseFloat(value);
        return value && !isNaN(budget) && budget >= 20 && budget <= 10000;
      case 'preference_carburant':
        return !value || ['électrique', 'hybride', 'essence', 'diesel'].includes(value);
      default:
        return true;
    }
  }, []);

  const getFieldError = useCallback((fieldName) => {
    if (!touchedFields[fieldName]) return null;
    const value = editData[fieldName];
    const isValid = validateField(fieldName, value);

    if (!isValid) {
      switch (fieldName) {
        case 'email':
          return 'Format d\'email invalide';
        case 'nom':
          return 'Le nom doit contenir au moins 2 caractères';
        case 'telephone':
          return 'Format de téléphone invalide (10-15 chiffres)';
        case 'budget_journalier':
          return 'Le budget doit être entre 20€ et 10 000€';
        case 'preference_carburant':
          return 'Préférence de carburant invalide';
        default:
          return 'Champ invalide';
      }
    }
    return null;
  }, [touchedFields, editData, validateField]);

  // ===== RÉCUPÉRATION DES DONNÉES =====
  const fetchUserProfile = useCallback(async () => {
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get('/api/profile/');
      setUserProfile(response.data);
      setEditData(response.data);
      setProfilePhoto(response.data.photo_url);
      setUser(response.data);
      setError('');
    } catch (error) {
      console.error('Profile fetch error:', error);
      showMessage(error.response?.data?.error || 'Erreur lors du chargement du profil', 'error');
    } finally {
      setLoading(false);
    }
  }, [token, navigate, apiClient, showMessage, setUser]);

  const fetchReservations = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingReservations(true);
      const response = await apiClient.get('/api/reservations/');
      setReservations(response.data.results || response.data || []);
    } catch (error) {
      console.error('Reservations fetch error:', error);
      setReservations([]);
      showMessage('Erreur lors du chargement des réservations', 'error');
    } finally {
      setLoadingReservations(false);
    }
  }, [token, apiClient, showMessage]);

  const fetchUserStats = useCallback(async () => {
    if (!token) return;

    try {
      setLoadingStats(true);
      const response = await apiClient.get('/api/profile/stats/');
      setUserStats(response.data || { totalReservations: 0, completedReservations: 0, totalSpent: 0, favoriteVehicle: 'N/A' });
    } catch (error) {
      console.error('Stats fetch error:', error);
      setUserStats({ totalReservations: 0, completedReservations: 0, totalSpent: 0, favoriteVehicle: 'N/A' });
      showMessage('Erreur lors du chargement des statistiques', 'error');
    } finally {
      setLoadingStats(false);
    }
  }, [token, apiClient, showMessage]);

  // ===== GESTION DE LA PHOTO DE PROFIL =====
  const handlePhotoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    if (!validTypes.includes(file.type)) {
      showMessage('Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.', 'error');
      return;
    }

    if (file.size > maxSize) {
      showMessage('Fichier trop volumineux. Taille maximale : 5MB.', 'error');
      return;
    }

    try {
      setPhotoLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('photo', file);

      const response = await apiClient.post('/api/profile/photo/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfilePhoto(response.data.photo_url);
      setUserProfile(prev => ({ ...prev, photo_url: response.data.photo_url }));
      setUser(prev => ({ ...prev, photo_url: response.data.photo_url }));
      showMessage('Photo de profil mise à jour avec succès !', 'success');
      setIsEditingPhoto(false);
    } catch (error) {
      console.error('Photo upload error:', error);
      showMessage(error.response?.data?.error || 'Erreur lors de l\'upload de la photo', 'error');
      setPhotoPreview(null);
    } finally {
      setPhotoLoading(false);
    }
  }, [apiClient, showMessage, setUser]);

  const handlePhotoDelete = useCallback(async () => {
    try {
      setPhotoLoading(true);
      await apiClient.delete('/api/profile/photo/');

      setProfilePhoto(null);
      setUserProfile(prev => ({ ...prev, photo_url: null }));
      setUser(prev => ({ ...prev, photo_url: null }));
      setPhotoPreview(null);
      showMessage('Photo de profil supprimée avec succès !', 'success');
      setIsEditingPhoto(false);
    } catch (error) {
      console.error('Photo delete error:', error);
      showMessage(error.response?.data?.error || 'Erreur lors de la suppression de la photo', 'error');
    } finally {
      setPhotoLoading(false);
    }
  }, [apiClient, showMessage, setUser]);

  const cancelPhotoEdit = useCallback(() => {
    setPhotoPreview(null);
    setIsEditingPhoto(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // ===== GESTION DES MODIFICATIONS =====
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
    setTouchedFields(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleSave = useCallback(async () => {
    const requiredFields = ['nom', 'email'];
    const invalidFields = requiredFields.filter(field => !validateField(field, editData[field]));

    if (invalidFields.length > 0) {
      showMessage('Veuillez corriger les champs requis', 'error');
      return;
    }

    try {
      setSaveLoading(true);

      const updateData = {
        nom: editData.nom?.trim(),
        email: editData.email?.trim().toLowerCase(),
        telephone: editData.telephone?.trim() || '',
        preference_carburant: editData.preference_carburant || '',
        budget_journalier: parseFloat(editData.budget_journalier) || 50
      };

      const response = await apiClient.put('/api/profile/', updateData);
      const { message, ...userData } = response.data;
      setUserProfile(userData);
      setEditData(userData);
      setUser(userData);
      setIsEditing(false);
      setTouchedFields({});

      showMessage('Profil mis à jour avec succès !', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      showMessage(error.response?.data?.error || 'Erreur lors de la mise à jour', 'error');
    } finally {
      setSaveLoading(false);
    }
  }, [editData, validateField, apiClient, showMessage, setUser]);

  // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setEditData({ ...userProfile });
    setTouchedFields({});
    setError('');
    setSuccessMessage('');
  }, [userProfile]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditData({ ...userProfile });
    setTouchedFields({});
    setError('');
    setSuccessMessage('');
  }, [userProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.post('/api/logout/', {});
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userData');
      setToken('');
      setUser(null);
      navigate('/login', { state: { message: 'Vous avez été déconnecté avec succès.' } });
    }
  }, [apiClient, setToken, setUser, navigate]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'reservations' && reservations.length === 0) {
      fetchReservations();
    }
    if (tab === 'stats' && !userStats) {
      fetchUserStats();
    }
  }, [reservations.length, userStats, fetchReservations, fetchUserStats]);

  // ===== FONCTIONS UTILITAIRES =====
  const generateCarParticles = useCallback(() => {
    const cars = ['🚗', '🚙', '🚕', '🏎️', '🚐', '🚓', '🚌', '⚡'];
    return cars.map((car, i) => ({
      car,
      style: {
        top: `${10 + i * 12}%`,
        animationDelay: `${i * 2}s`,
        fontSize: `${1.5 + (i % 3) * 0.3}rem`,
        animationDuration: `${20 + (i % 4) * 5}s`
      }
    }));
  }, []);

  const getRoleIcon = useCallback((role) => {
    const icons = {
      'client': '👤',
      'agence': '🏢',
      'admin': '👑'
    };
    return icons[role] || '👤';
  }, []);

  const getFuelIcon = useCallback((fuel) => {
    const icons = {
      'électrique': '⚡',
      'hybride': '🌱',
      'essence': '⛽',
      'diesel': '🚗'
    };
    return icons[fuel] || '🚗';
  }, []);

  const getStatusIcon = useCallback((status) => {
    const icons = {
      'active': '🟢',
      'completed': '✅',
      'cancelled': '❌',
      'pending': '🟡'
    };
    return icons[status] || '🟡';
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'Non défini';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  // ===== VALEURS CALCULÉES =====
  const canSave = useMemo(() => {
    const requiredFields = ['nom', 'email'];
    return requiredFields.every(field => validateField(field, editData[field])) && !saveLoading;
  }, [editData, validateField, saveLoading]);

  const carParticles = useMemo(() => generateCarParticles(), [generateCarParticles]);

  // Chart Data for Stats Tab
  const chartData = useMemo(() => {
    if (!reservations.length) return null;

    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return date.toLocaleString('fr-FR', { month: 'short' });
    });

    const reservationCounts = months.map((_, i) => {
      const month = new Date();
      month.setMonth(month.getMonth() - (11 - i));
      return reservations.filter(r => {
        const reservationDate = new Date(r.date_debut);
        return reservationDate.getMonth() === month.getMonth() &&
               reservationDate.getFullYear() === month.getFullYear();
      }).length;
    });

    return {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Réservations par mois',
          data: reservationCounts,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: '#3b82f6',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Réservations Mensuelles (Dernier 12 mois)' }
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Nombre de réservations' } },
          x: { title: { display: true, text: 'Mois' } }
        }
      }
    };
  }, [reservations]);

  // ===== EFFETS =====
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchUserStats(); // Fetch stats on mount
    } else {
      navigate('/login');
    }
  }, [token, navigate, fetchUserProfile, fetchUserStats]);

  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // ===== GESTION DES CAS D'ERREUR =====
  if (!token) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <h2>🔐 Accès Restreint</h2>
          <p>Vous devez être connecté pour accéder à votre profil.</p>
          <Link to="/login" className="login-btn">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-state">
          <div className="loading-spinner">
            <div className="spinner-car">🏎️</div>
            <div className="spinner-text">Chargement de votre garage...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !userProfile) {
    return (
      <div className="profile-container">
        <div className="error-state">
          <h2>❌ Erreur de Chargement</h2>
          <p>{error}</p>
          <button onClick={fetchUserProfile} className="retry-btn">
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }

  // ===== RENDU PRINCIPAL =====
  return (
    <div className={`profile-container ${isVisible ? 'visible' : ''}`}>
      {/* Arrière-plan animé */}
      <div className="profile-background">
        <div className="floating-cars">
          {carParticles.map((particle, i) => (
            <div key={i} className="floating-car" style={particle.style} aria-hidden="true">
              {particle.car}
            </div>
          ))}
        </div>
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="profile-layout">
        {/* Sidebar */}
        <aside className="profile-sidebar">
          <div className="sidebar-header">
            <div className="user-avatar">
              <div className="avatar-glow"></div>
              {profilePhoto || photoPreview ? (
                <img
                  src={photoPreview || profilePhoto}
                  alt="Photo de profil"
                  className="avatar-image"
                />
              ) : (
                <span className="avatar-emoji" role="img" aria-label="Avatar utilisateur">
                  {getRoleIcon(userProfile?.role)}
                </span>
              )}

              {/* Overlay pour l'édition de photo */}
              {isEditingPhoto && (
                <div className="photo-edit-overlay">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="photo-upload-input"
                    id="photo-upload"
                    disabled={photoLoading}
                  />
                  <div className="photo-edit-actions">
                    <label htmlFor="photo-upload" className="photo-upload-btn">
                      {photoLoading ? '⏳' : '📷'} Choisir
                    </label>
                    {(profilePhoto || photoPreview) && (
                      <button
                        onClick={handlePhotoDelete}
                        className="photo-delete-btn"
                        disabled={photoLoading}
                      >
                        {photoLoading ? '⏳' : '🗑️'} Supprimer
                      </button>
                    )}
                    <button onClick={cancelPhotoEdit} className="photo-cancel-btn">
                      ❌ Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              className="edit-photo-btn"
              onClick={() => setIsEditingPhoto(!isEditingPhoto)}
              disabled={photoLoading}
            >
              {isEditingPhoto ? '❌ Annuler' : '📷 Modifier photo'}
            </button>

            <h2 className="user-name">{userProfile?.nom || 'Utilisateur'}</h2>
            <p className="user-role">{userProfile?.role || 'Client'}</p>
            <div className="user-stats-mini">
              {loadingStats ? (
                <div className="loading-stats">
                  <div className="spinner-mini">🌀</div>
                  <span>Chargement...</span>
                </div>
              ) : (
                <>
                  <div className="stat-mini">
                    <span className="stat-icon">🚗</span>
                    <span className="stat-value">{userStats?.totalReservations ?? 0}</span>
                  </div>
                  <div className="stat-mini">
                    <span className="stat-icon">⭐</span>
                    <span className="stat-value">{userStats?.completedReservations ?? 0}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <nav className="sidebar-nav" role="navigation" aria-label="Navigation du profil">
            <button
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => handleTabChange('profile')}
              aria-label="Informations du profil"
            >
              <span className="nav-icon" aria-hidden="true">👤</span>
              Mon Profil
            </button>
            <button
              className={`nav-item ${activeTab === 'reservations' ? 'active' : ''}`}
              onClick={() => handleTabChange('reservations')}
              aria-label="Mes réservations"
            >
              <span className="nav-icon" aria-hidden="true">📋</span>
              Mes Réservations
              {reservations.length > 0 && (
                <span className="nav-badge">{reservations.length}</span>
              )}
            </button>
            <button
              className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => handleTabChange('stats')}
              aria-label="Mes statistiques"
            >
              <span className="nav-icon" aria-hidden="true">📊</span>
              Statistiques
            </button>
            <button
              className={`nav-item ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => handleTabChange('preferences')}
              aria-label="Mes préférences"
            >
              <span className="nav-icon" aria-hidden="true">⚙️</span>
              Préférences
            </button>
          </nav>

          <div className="sidebar-footer">
            <Link to="/vehicules" className="browse-vehicles-btn">
              <span className="btn-icon" aria-hidden="true">🚗</span>
              Explorer les Véhicules
            </Link>
            <button
              onClick={handleLogout}
              className="logout-btn"
              aria-label="Se déconnecter"
            >
              <span className="logout-icon" aria-hidden="true">🚪</span>
              Déconnexion
            </button>
          </div>
        </aside>

        {/* Contenu principal */}
        <main className="profile-main">
          {/* Messages d'alerte */}
          {error && (
            <div className="alert error-alert" role="alert">
              <span className="alert-icon" aria-hidden="true">⚠️</span>
              <span className="alert-text">{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="alert success-alert" role="alert">
              <span className="alert-icon" aria-hidden="true">✅</span>
              <span className="alert-text">{successMessage}</span>
            </div>
          )}

          {/* Contenu selon l'onglet actif */}
          {activeTab === 'profile' && (
            <div className="content-section">
              <div className="content-header">
                <h1 className="content-title">Mon Profil</h1>
                <p className="content-subtitle">Gérez vos informations personnelles</p>
              </div>

              <div className="profile-card">
                <div className="card-header">
                  <h2 className="card-title">Informations Personnelles</h2>
                  {!isEditing ? (
                    <button onClick={handleEdit} className="edit-btn" aria-label="Modifier le profil">
                      <span className="btn-icon" aria-hidden="true">✏️</span>
                      Modifier
                    </button>
                  ) : (
                    <div className="edit-actions">
                      <button
                        onClick={handleSave}
                        className={`save-btn ${!canSave ? 'disabled' : ''}`}
                        disabled={!canSave}
                        aria-label="Sauvegarder les modifications"
                      >
                        {saveLoading ? (
                          <>
                            <span className="spinner-mini" aria-hidden="true">🌀</span>
                            Sauvegarde...
                          </>
                        ) : (
                          <>
                            <span className="btn-icon" aria-hidden="true">💾</span>
                            Sauvegarder
                          </>
                        )}
                      </button>
                      <button onClick={handleCancel} className="cancel-btn" aria-label="Annuler les modifications">
                        <span className="btn-icon" aria-hidden="true">❌</span>
                        Annuler
                      </button>
                    </div>
                  )}
                </div>

                <form className="profile-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label" htmlFor="nom">
                        <span className="label-icon" aria-hidden="true">👤</span>
                        Nom complet *
                      </label>
                      <div className="input-container">
                        <input
                          type="text"
                          id="nom"
                          name="nom"
                          value={editData.nom || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`profile-input ${getFieldError('nom') ? 'input-error' : ''}`}
                          placeholder="Votre nom complet"
                          required
                          aria-describedby={getFieldError('nom') ? "nom-error" : undefined}
                          aria-invalid={getFieldError('nom') ? "true" : "false"}
                        />
                        <span className="input-icon" aria-hidden="true">👤</span>
                      </div>
                      {getFieldError('nom') && (
                        <span id="nom-error" className="field-error" role="alert">
                          {getFieldError('nom')}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="email">
                        <span className="label-icon" aria-hidden="true">📧</span>
                        Email *
                      </label>
                      <div className="input-container">
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={editData.email || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`profile-input ${getFieldError('email') ? 'input-error' : ''}`}
                          placeholder="votre@email.com"
                          required
                          aria-describedby={getFieldError('email') ? "email-error" : undefined}
                          aria-invalid={getFieldError('email') ? "true" : "false"}
                        />
                        <span className="input-icon" aria-hidden="true">📧</span>
                      </div>
                      {getFieldError('email') && (
                        <span id="email-error" className="field-error" role="alert">
                          {getFieldError('email')}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="telephone">
                        <span className="label-icon" aria-hidden="true">📱</span>
                        Téléphone
                      </label>
                      <div className="input-container">
                        <input
                          type="tel"
                          id="telephone"
                          name="telephone"
                          value={editData.telephone || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`profile-input ${getFieldError('telephone') ? 'input-error' : ''}`}
                          placeholder="+33 6 12 34 56 78"
                          aria-describedby={getFieldError('telephone') ? "telephone-error" : undefined}
                          aria-invalid={getFieldError('telephone') ? "true" : "false"}
                        />
                        <span className="input-icon" aria-hidden="true">📱</span>
                      </div>
                      {getFieldError('telephone') && (
                        <span id="telephone-error" className="field-error" role="alert">
                          {getFieldError('telephone')}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="preference_carburant">
                        <span className="label-icon" aria-hidden="true">{getFuelIcon(editData.preference_carburant)}</span>
                        Préférence Carburant
                      </label>
                      <div className="input-container">
                        <select
                          id="preference_carburant"
                          name="preference_carburant"
                          value={editData.preference_carburant || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className="profile-input"
                          aria-label="Sélectionner votre préférence de carburant"
                        >
                          <option value="">Sélectionner...</option>
                          <option value="électrique">⚡ Électrique</option>
                          <option value="hybride">🌱 Hybride</option>
                          <option value="essence">⛽ Essence</option>
                          <option value="diesel">🚗 Diesel</option>
                        </select>
                        <span className="input-icon" aria-hidden="true">{getFuelIcon(editData.preference_carburant)}</span>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="budget_journalier">
                        <span className="label-icon" aria-hidden="true">💰</span>
                        Budget Journalier
                      </label>
                      <div className="input-container">
                        <input
                          type="number"
                          id="budget_journalier"
                          name="budget_journalier"
                          value={editData.budget_journalier || ''}
                          onChange={handleChange}
                          disabled={!isEditing}
                          className={`profile-input ${getFieldError('budget_journalier') ? 'input-error' : ''}`}
                          placeholder="50"
                          min="20"
                          max="10000"
                          aria-describedby={getFieldError('budget_journalier') ? "budget-error" : undefined}
                          aria-invalid={getFieldError('budget_journalier') ? "true" : "false"}
                        />
                        <span className="input-icon" aria-hidden="true">💰</span>
                        <span className="input-suffix">€/jour</span>
                      </div>
                      {getFieldError('budget_journalier') && (
                        <span id="budget-error" className="field-error" role="alert">
                          {getFieldError('budget_journalier')}
                        </span>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'reservations' && (
            <div className="content-section">
              <div className="content-header">
                <h1 className="content-title">Mes Réservations</h1>
                <p className="content-subtitle">Historique de vos locations</p>
              </div>

              {loadingReservations ? (
                <div className="loading-reservations">
                  <div className="spinner-car">🚗</div>
                  <p>Chargement des réservations...</p>
                </div>
              ) : reservations.length > 0 ? (
                <div className="reservations-grid">
                  {reservations.map((reservation, index) => (
                    <div key={reservation.id || index} className="reservation-card">
                      <div className="reservation-header">
                        <span className="reservation-icon" aria-hidden="true">
                          {getStatusIcon(reservation.status)}
                        </span>
                        <div className="reservation-info">
                          <h3 className="reservation-title">
                            {reservation.vehicule?.marque} {reservation.vehicule?.modele}
                          </h3>
                          <p className="reservation-date">
                            {formatDate(reservation.date_debut)} - {formatDate(reservation.date_fin)}
                          </p>
                        </div>
                        <span className={`reservation-status status-${reservation.status}`}>
                          {reservation.status === 'active' && 'En cours'}
                          {reservation.status === 'completed' && 'Terminée'}
                          {reservation.status === 'cancelled' && 'Annulée'}
                          {reservation.status === 'pending' && 'En attente'}
                        </span>
                      </div>
                      <div className="reservation-details">
                        <div className="detail-item">
                          <span className="detail-label">Prix total:</span>
                          <span className="detail-value">{reservation.total_price || 0}€</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Durée:</span>
                          <span className="detail-value">{reservation.duree || 'N/A'} jours</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Carburant:</span>
                          <span className="detail-value">
                            {getFuelIcon(reservation.vehicule?.carburant)} {reservation.vehicule?.carburant}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-reservations">
                  <span className="no-reservations-icon" aria-hidden="true">🚗</span>
                  <h3 className="no-reservations-title">Aucune réservation</h3>
                  <p className="no-reservations-text">
                    Vous n'avez pas encore effectué de réservation.
                  </p>
                  <Link to="/vehicules" className="browse-btn">
                    <span className="btn-icon" aria-hidden="true">🔍</span>
                    Explorer les véhicules
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="content-section">
              <div className="content-header">
                <h1 className="content-title">Mes Statistiques</h1>
                <p className="content-subtitle">Votre activité sur VitaRenta</p>
              </div>

              {loadingStats ? (
                <div className="loading-stats">
                  <div className="spinner-car">📊</div>
                  <p>Chargement des statistiques...</p>
                </div>
              ) : (
                <>
                  <div className="stats-grid">
                    <div className="stat-card">
                      <span className="stat-icon" aria-hidden="true">📊</span>
                      <div className="stat-number">{userStats?.totalReservations ?? 0}</div>
                      <div className="stat-label">Réservations totales</div>
                    </div>
                    <div className="stat-card">
                      <span className="stat-icon" aria-hidden="true">✅</span>
                      <div className="stat-number">{userStats?.completedReservations ?? 0}</div>
                      <div className="stat-label">Locations terminées</div>
                    </div>
                    <div className="stat-card">
                      <span className="stat-icon" aria-hidden="true">💰</span>
                      <div className="stat-number">{userStats?.totalSpent ?? 0}€</div>
                      <div className="stat-label">Total dépensé</div>
                    </div>
                    <div className="stat-card">
                      <span className="stat-icon" aria-hidden="true">{getFuelIcon(userStats?.favoriteVehicle)}</span>
                      <div className="stat-number">{userStats?.favoriteVehicle ?? 'N/A'}</div>
                      <div className="stat-label">Carburant préféré</div>
                    </div>
                  </div>

                  {chartData && (
                    <div className="stats-chart">
                      <h3>Activité récente</h3>
                      <Bar data={chartData.data} options={chartData.options} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="content-section">
              <div className="content-header">
                <h1 className="content-title">Mes Préférences</h1>
                <p className="content-subtitle">Personnalisez votre expérience</p>
              </div>

              <div className="preferences-grid">
                <div className="preference-card">
                  <div className="preference-header">
                    <span className="preference-icon" aria-hidden="true">🔔</span>
                    <h3 className="preference-title">Notifications</h3>
                  </div>
                  <div className="preference-options">
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">✅</span>
                      <span className="option-text">Rappels de réservation</span>
                    </div>
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">✅</span>
                      <span className="option-text">Offres spéciales</span>
                    </div>
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">❌</span>
                      <span className="option-text">Newsletter</span>
                    </div>
                  </div>
                </div>

                <div className="preference-card">
                  <div className="preference-header">
                    <span className="preference-icon" aria-hidden="true">📍</span>
                    <h3 className="preference-title">Localisation</h3>
                  </div>
                  <div className="location-info">
                    <span className="location-icon" aria-hidden="true">📍</span>
                    <span className="location-text">Paris, France</span>
                  </div>
                  <button className="change-location-btn">
                    <span className="btn-icon" aria-hidden="true">🔄</span>
                    Changer de localisation
                  </button>
                </div>

                <div className="preference-card">
                  <div className="preference-header">
                    <span className="preference-icon" aria-hidden="true">🌍</span>
                    <h3 className="preference-title">Langue & Région</h3>
                  </div>
                  <div className="preference-options">
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">✅</span>
                      <span className="option-text">Français (France)</span>
                    </div>
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">❌</span>
                      <span className="option-text">English (US)</span>
                    </div>
                  </div>
                </div>

                <div className="preference-card">
                  <div className="preference-header">
                    <span className="preference-icon" aria-hidden="true">🎨</span>
                    <h3 className="preference-title">Apparence</h3>
                  </div>
                  <div className="preference-options">
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">✅</span>
                      <span className="option-text">Mode sombre automatique</span>
                    </div>
                    <div className="preference-option">
                      <span className="checkmark" aria-hidden="true">✅</span>
                      <span className="option-text">Animations réduites</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Profile;
