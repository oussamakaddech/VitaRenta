import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel, Grid, Tabs, Tab,
  Checkbox, FormControlLabel, Alert, Snackbar, Card, CardContent, CardActions,
  Chip, IconButton, Tooltip, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import DownloadIcon from '@mui/icons-material/Download';
import StarIcon from '@mui/icons-material/Star';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import FilterListIcon from '@mui/icons-material/FilterList';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';

import { ecoChallengesService, errorUtils, authService } from '../services/apiService';
import './EcoChallenges.css';

const AdvancedEcoChallengeManager = React.memo(({ token, user }) => {
  const navigate = useNavigate();

  // ✅ États d'authentification
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authData, setAuthData] = useState({ token: null, user: null });

  // États du composant
  const [challenges, setChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [selectedChallenges, setSelectedChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [filters, setFilters] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(12);
  const [showFilters, setShowFilters] = useState(false);

  // 🆕 États pour la saisie manuelle
  const [manualEntry, setManualEntry] = useState({ 
    open: false, 
    challengeId: null, 
    challengeTitle: '',
    value: '',
    unit: 'km'
  });
  const [submitting, setSubmitting] = useState(false);

  // ✅ Vérification d'authentification améliorée
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('🔍 Checking authentication...', { token: !!token, user: !!user });

        // 1. Vérifier d'abord les props
        if (token && user) {
          console.log('✅ Auth via props');
          setAuthData({ token, user });
          localStorage.setItem('access_token', token);
          localStorage.setItem('user_data', JSON.stringify(user));
          setIsAuthChecking(false);
          return;
        }

        // 2. Vérifier localStorage
        const storedToken = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user_data');

        console.log('🔍 Checking localStorage...', { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser 
        });

        if (storedToken && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            console.log('✅ Auth via localStorage');
            setAuthData({ token: storedToken, user: userData });
            setIsAuthChecking(false);
            return;
          } catch (e) {
            console.error('❌ Erreur parsing user data:', e);
            localStorage.removeItem('user_data');
          }
        }

        // 3. Vérifier token avec le serveur
        if (storedToken) {
          try {
            console.log('🔍 Validating token with server...');
            const userData = await authService.validateToken();
            
            if (userData) {
              console.log('✅ Token valid from server');
              setAuthData({ token: storedToken, user: userData });
              localStorage.setItem('user_data', JSON.stringify(userData));
              setIsAuthChecking(false);
              return;
            }
          } catch (error) {
            console.error('❌ Token validation failed:', error);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user_data');
          }
        }

        // 4. Aucune authentification valide
        console.log('❌ No valid authentication found, redirecting to login');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        navigate('/login');
      } catch (error) {
        console.error('❌ Auth check error:', error);
        navigate('/login');
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuthentication();
  }, [token, user, navigate]);

  // Fonctions utilitaires pour les permissions
  const canManageChallenges = useCallback(() => {
    return authData.user?.role === 'admin' || authData.user?.role === 'agence';
  }, [authData.user]);

  const canParticipate = useCallback(() => {
    return authData.user?.role === 'client' || authData.user?.role === 'agence' || authData.user?.role === 'admin';
  }, [authData.user]);

  const canEditChallenge = useCallback((challenge) => {
    if (authData.user?.role === 'admin') return true;
    if (authData.user?.role === 'agence') {
      return !challenge.created_by || challenge.created_by === authData.user.id;
    }
    return false;
  }, [authData.user]);

  // Gestion des erreurs API améliorée
  const handleApiError = useCallback((error, defaultMessage) => {
    console.error('API Error:', error);
    
    // Gestion spécifique des codes d'erreur
    const errorHandlers = {
      401: () => {
        localStorage.clear();
        navigate('/login');
      },
      403: () => {
        setSnackbar({ 
          open: true,
          message: error.response?.data?.detail || 'Permissions insuffisantes pour cette action',
          severity: 'warning'
        });
      },
      429: () => {
        setSnackbar({
          open: true,
          message: 'Trop de requêtes. Veuillez patienter.',
          severity: 'warning'
        });
      },
      500: () => {
        setSnackbar({
          open: true,
          message: 'Erreur serveur. Veuillez réessayer plus tard.',
          severity: 'error'
        });
      }
    };

    const statusCode = error.response?.status;
    const handler = errorHandlers[statusCode];
    
    if (handler) {
      handler();
    } else {
      const message = errorUtils?.getErrorMessage?.(error) || defaultMessage;
      setSnackbar({ open: true, message, severity: 'error' });
    }
  }, [navigate]);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // ✅ ORDRE CORRIGÉ : Charger les défis utilisateur EN PREMIER
  const loadUserChallenges = useCallback(async () => {
    if (!canParticipate()) return;
    
    try {
      setLoading(true);
      const response = await ecoChallengesService.getUserChallenges();
      const data = Array.isArray(response.data.results) ? response.data.results : 
                   Array.isArray(response.data) ? response.data : [];
      setUserChallenges(data);
    } catch (error) {
      setUserChallenges([]);
      handleApiError(error, 'Erreur lors du chargement de vos défis');
    } finally {
      setLoading(false);
    }
  }, [handleApiError, canParticipate]);

  // Charger les défis
  const loadChallenges = useCallback(async () => {
    console.log('🔄 Loading challenges...');
    try {
      setLoading(true);
      const response = await ecoChallengesService.getAll(filters);
      console.log('✅ Challenges loaded:', response.data);
      
      const data = Array.isArray(response.data.results) ? response.data.results : 
                   Array.isArray(response.data) ? response.data : [];
      setChallenges(data);
    } catch (error) {
      console.error('❌ Error loading challenges:', error);
      setChallenges([]);
      handleApiError(error, 'Erreur lors du chargement des défis');
    } finally {
      setLoading(false);
    }
  }, [filters, handleApiError]);

  // Charger les récompenses
  const loadRewards = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ecoChallengesService.getMyRewards();
      const data = Array.isArray(response.data.rewards) ? response.data.rewards : 
                   Array.isArray(response.data) ? response.data : [];
      setRewards(data);
    } catch (error) {
      setRewards([]);
      handleApiError(error, 'Erreur lors du chargement des récompenses');
    } finally {
      setLoading(false);
    }
  }, [handleApiError]);

  // 🆕 Fonction de soumission des kilomètres manuels
  const handleSubmitProgress = useCallback(async (userChallengeId, value, unit = 'km') => {
    if (!value || value <= 0) {
      showSnackbar('Veuillez entrer une valeur valide', 'error');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const payload = {
        user_challenge_id: userChallengeId,
        progress_value: parseFloat(value),
        unit: unit,
        entry_type: 'manual'
      };
      
      console.log('📊 Soumission progress:', payload);
      
      // Appel API pour mettre à jour le progrès
      await ecoChallengesService.updateProgress(payload);
      
      showSnackbar('✅ Progrès mis à jour avec succès !', 'success');
      
      // Recharger les données utilisateur
      await loadUserChallenges();
      
      // Fermer le dialog
      setManualEntry({ open: false, challengeId: null, challengeTitle: '', value: '', unit: 'km' });
      
    } catch (error) {
      console.error('❌ Erreur mise à jour progrès:', error);
      handleApiError(error, 'Erreur lors de la mise à jour du progrès');
    } finally {
      setSubmitting(false);
    }
  }, [showSnackbar, handleApiError, loadUserChallenges]);

  // Effect pour charger les données selon l'onglet
  useEffect(() => {
    if (isAuthChecking || !authData.token) return;

    switch (currentTab) {
      case 0:
        loadChallenges();
        break;
      case 1:
        if (canParticipate()) {
          loadUserChallenges();
        } else {
          setCurrentTab(0);
        }
        break;
      case 2: // Récompenses
        loadRewards();
        break;
      default:
        break;
    }
  }, [currentTab, loadChallenges, loadUserChallenges, loadRewards, canParticipate, isAuthChecking, authData.token]);

  // Gestionnaire de changement d'onglet
  const handleTabChange = useCallback((event, newValue) => {
    if (newValue === 1 && !canParticipate()) {
      showSnackbar('Vous n\'avez pas accès à cette section', 'warning');
      return;
    }
    
    setCurrentTab(newValue);
    setPage(0);
  }, [canParticipate, showSnackbar]);

  // Créer un défi
  const handleCreateChallenge = useCallback(() => {
    if (!canManageChallenges()) {
      showSnackbar('Vous n\'avez pas les permissions pour créer des défis', 'warning');
      return;
    }
    
    setCurrentChallenge({
      title: '',
      description: '',
      type: 'eco_driving',
      difficulty: 'beginner',
      target_value: 100,
      unit: 'km',
      duration_days: 14,
      reward_points: 100,
      reward_credit_euros: 5.0,
      is_active: true,
      featured: false
    });
    setDialogMode('create');
    setOpenDialog(true);
  }, [canManageChallenges, showSnackbar]);

  // Modifier un défi
  const handleEditChallenge = useCallback((challenge) => {
    if (!canEditChallenge(challenge)) {
      showSnackbar('Vous ne pouvez pas modifier ce défi', 'warning');
      return;
    }
    
    setCurrentChallenge({ ...challenge });
    setDialogMode('edit');
    setOpenDialog(true);
  }, [canEditChallenge, showSnackbar]);

  // Sauvegarder un défi
  const handleSaveChallenge = useCallback(async () => {
    if (!currentChallenge?.title || currentChallenge?.target_value <= 0 || currentChallenge?.duration_days <= 0) {
      showSnackbar('Veuillez remplir tous les champs obligatoires correctement', 'error');
      return;
    }
    
    if (!canManageChallenges()) {
      showSnackbar('Permissions insuffisantes', 'error');
      return;
    }
    
    try {
      setLoading(true);
      let response;
      if (dialogMode === 'create') {
        response = await ecoChallengesService.create(currentChallenge);
        setChallenges(prev => [response.data, ...prev]);
      } else {
        response = await ecoChallengesService.update(currentChallenge.id, currentChallenge);
        setChallenges(prev => prev.map(c => c.id === currentChallenge.id ? response.data : c));
      }
      
      setOpenDialog(false);
      showSnackbar(
        `Défi ${dialogMode === 'create' ? 'créé' : 'modifié'} avec succès`,
        'success'
      );
    } catch (error) {
      handleApiError(error, `Erreur lors de la ${dialogMode === 'create' ? 'création' : 'modification'}`);
    } finally {
      setLoading(false);
    }
  }, [currentChallenge, dialogMode, handleApiError, showSnackbar, canManageChallenges]);

  // Rejoindre un défi
  const handleJoinChallenge = useCallback(async (challengeId) => {
    if (!canParticipate()) {
      showSnackbar('Vous ne pouvez pas participer aux défis', 'warning');
      return;
    }

    if (!challengeId) {
      showSnackbar('ID de défi manquant', 'error');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('🔄 Tentative de participation au défi:', challengeId);
      
      const payload = { 
        challenge_id: String(challengeId)
      };
      console.log('📡 Payload envoyé:', payload);
      
      await ecoChallengesService.joinChallenge(payload);
      
      showSnackbar('✅ Défi rejoint avec succès !', 'success');
      
      // Recharger les données
      if (currentTab === 1) {
        await loadUserChallenges();
      }
      await loadChallenges();
      
    } catch (error) {
      console.error('❌ Erreur lors de la participation:', error);
      
      let message = 'Une erreur est survenue lors de la participation au défi.';
      
      if (error.response?.status === 500) {
        message = 'Erreur serveur temporaire. Veuillez réessayer dans quelques instants.';
      } else if (error.response?.status === 400) {
        message = error.response.data?.detail || 'Données invalides. Vérifiez les informations.';
      } else if (error.response?.status === 409) {
        message = 'Vous participez déjà à ce défi.';
      } else if (error.response?.data?.detail) {
        message = error.response.data.detail;
      }
      
      showSnackbar(message, 'error');
      
    } finally {
      setLoading(false);
    }
  }, [canParticipate, showSnackbar, currentTab, loadUserChallenges, loadChallenges]);

  // Abandonner un défi
  const handleAbandonChallenge = useCallback(async (userChallengeId) => {
    try {
      setLoading(true);
      await ecoChallengesService.abandonChallenge(userChallengeId);
      showSnackbar('Défi abandonné', 'info');
      loadUserChallenges();
    } catch (error) {
      handleApiError(error, 'Erreur lors de l\'abandon du défi');
    } finally {
      setLoading(false);
    }
  }, [handleApiError, showSnackbar, loadUserChallenges]);

  // Réclamer une récompense
  const handleClaimReward = useCallback(async (rewardId) => {
    try {
      setLoading(true);
      await ecoChallengesService.claimReward(rewardId);
      setRewards(prev => prev.map(reward =>
        reward.id === rewardId ? { ...reward, claimed: true } : reward
      ));
      showSnackbar('Récompense réclamée avec succès !', 'success');
    } catch (error) {
      handleApiError(error, 'Erreur lors de la réclamation');
    } finally {
      setLoading(false);
    }
  }, [handleApiError, showSnackbar]);

  // Dupliquer un défi
  const handleDuplicateChallenge = useCallback(async (challengeId) => {
    if (!canManageChallenges()) {
      showSnackbar('Permissions insuffisantes pour dupliquer', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const response = await ecoChallengesService.duplicate(challengeId);
      setChallenges(prev => [response.data, ...prev]);
      showSnackbar('Défi dupliqué avec succès', 'success');
    } catch (error) {
      handleApiError(error, 'Erreur lors de la duplication');
    } finally {
      setLoading(false);
    }
  }, [handleApiError, showSnackbar, canManageChallenges]);

  // Actions en lot
  const handleBulkAction = useCallback(async (action) => {
    if (!canManageChallenges()) {
      showSnackbar('Permissions insuffisantes pour les actions groupées', 'warning');
      return;
    }
    
    if (selectedChallenges.length === 0) {
      showSnackbar('Veuillez sélectionner au moins un défi', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      await ecoChallengesService.bulkAction({
        challenge_ids: selectedChallenges,
        action
      });
      setSelectedChallenges([]);
      loadChallenges();
      showSnackbar(`Action '${action}' appliquée avec succès`, 'success');
    } catch (error) {
      handleApiError(error, `Erreur lors de l'action '${action}'`);
    } finally {
      setLoading(false);
    }
  }, [selectedChallenges, handleApiError, showSnackbar, loadChallenges, canManageChallenges]);

  // Exporter les données
  const handleExportData = useCallback(async (challengeId) => {
    if (!canManageChallenges()) {
      showSnackbar('Permissions insuffisantes pour l\'export', 'warning');
      return;
    }
    
    try {
      setLoading(true);
      const response = await ecoChallengesService.exportData(challengeId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `challenge_${challengeId}_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showSnackbar('Données exportées avec succès', 'success');
    } catch (error) {
      handleApiError(error, 'Erreur lors de l\'export des données');
    } finally {
      setLoading(false);
    }
  }, [handleApiError, showSnackbar, canManageChallenges]);

  // Fonctions utilitaires mémorisées
  const formatChallengeType = useMemo(() => (type) => {
    const types = {
      'eco_driving': '🚗 Éco-conduite',
      'co2_reduction': '🌱 Réduction CO₂',
      'fuel_efficiency': '⚡ Efficacité Énergétique',
      'eco_score': '📊 Score Écologique',
      'low_emission': '💨 Faibles Émissions',
      'distance_reduction': '📏 Réduction Distance',
      'alternative_transport': '🚲 Transport Alternatif'
    };
    return types[type] || type;
  }, []);

  const formatDifficulty = useMemo(() => (difficulty) => {
    const difficulties = {
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire', 
      'advanced': 'Avancé',
      'expert': 'Expert'
    };
    return difficulties[difficulty] || difficulty;
  }, []);

  const getDifficultyColor = useMemo(() => (difficulty) => {
    switch (difficulty) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'error';
      case 'expert': return 'secondary';
      default: return 'default';
    }
  }, []);

  // Données mémorisées pour les performances
  const paginatedChallenges = useMemo(() => {
    return challenges.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [challenges, page, rowsPerPage]);

  // État de chargement pendant la vérification d'auth avec design Web3
  if (isAuthChecking) {
    return (
      <div className="eco-challenges-main-container">
        {/* Particules neurales */}
        <div className="eco-challenges-floating-particles">
          {[...Array(15)].map((_, i) => (
            <div
              key={`neural-${i}`}
              className="eco-challenges-neural-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 12}s`
              }}
            />
          ))}
          {[...Array(5)].map((_, i) => (
            <div
              key={`connection-${i}`}
              className="eco-challenges-neural-connection"
              style={{
                top: `${20 + Math.random() * 60}%`,
                left: `${Math.random() * 80}%`,
                width: `${50 + Math.random() * 200}px`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          className="eco-challenges-dashboard-content"
        >
          <div className="eco-challenges-loading-container-web3">
            <div className="eco-challenges-ai-loader">
              <div className="eco-challenges-brain-core" />
              <div className="eco-challenges-brain-waves">
                <div className="eco-challenges-wave eco-challenges-wave-1" />
                <div className="eco-challenges-wave eco-challenges-wave-2" />
                <div className="eco-challenges-wave eco-challenges-wave-3" />
              </div>
            </div>
            <Typography className="eco-challenges-loading-text">
              🧠 Vérification de l'authentification
              <div className="web3-loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
              ⚡ Initialisation du système neural...
            </Typography>
          </div>
        </Box>
      </div>
    );
  }

  // Vérification finale après chargement
  if (!authData.token || !authData.user) {
    return (
      <div className="eco-challenges-main-container">
        <Box 
          display="flex" 
          justifyContent="center" 
          alignItems="center" 
          minHeight="100vh"
          className="eco-challenges-dashboard-content"
        >
          <Typography sx={{ color: 'white' }}>
            🔄 Redirection vers la connexion...
          </Typography>
        </Box>
      </div>
    );
  }

  return (
    <div className="eco-challenges-main-container">
      {/* Particules neurales flottantes */}
      <div className="eco-challenges-floating-particles">
        {[...Array(20)].map((_, i) => (
          <div
            key={`neural-${i}`}
            className="eco-challenges-neural-particle"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 12}s`
            }}
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <div
            key={`connection-${i}`}
            className="eco-challenges-neural-connection"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${Math.random() * 80}%`,
              width: `${50 + Math.random() * 200}px`,
              animationDelay: `${Math.random() * 3}s`
            }}
          />
        ))}
        {[...Array(10)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="eco-challenges-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 4}s`
            }}
          />
        ))}
      </div>

      <div className="eco-challenges-dashboard-content">
        <div className="eco-challenges-dashboard-wrapper">
          {/* En-tête avec effet holographique */}
          <div className="eco-challenges-header-section">
            <Typography variant="h3" component="h1" className="eco-challenges-main-title">
              <EmojiEventsIcon className="eco-challenges-title-icon" sx={{ fontSize: 48 }} />
              <span className="web3-gradient-text">Gestion des Défis Éco-Responsables</span>
            </Typography>
            <Typography variant="h6" className="eco-challenges-main-subtitle">
              {authData.user.role === 'admin' && '🔬 Interface administrateur - Accès complet au réseau neural'}
              {authData.user.role === 'agence' && '⚡ Interface agence - Contrôle des défis cybernétiques'}
              {authData.user.role === 'client' && '🌐 Participez aux défis environnementaux futuristes'}
            </Typography>
          </div>

          {/* Actions principales avec design Web3 */}
          {canManageChallenges() && (
            <div className="web3-glass-card eco-challenges-card">
              <CardContent>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="eco-challenge-btn-primary-web3"
                    onClick={handleCreateChallenge}
                  >
                    <AddIcon />
                    <span>Nouveau Défi Neural</span>
                  </button>
                  
                  {selectedChallenges.length > 0 && (
                    <>
                      <button
                        className="eco-challenge-btn-secondary web3-button-secondary"
                        onClick={() => handleBulkAction('activate')}
                      >
                        <PlayArrowIcon />
                        Activer ({selectedChallenges.length})
                      </button>
                      <button
                        className="eco-challenge-btn-secondary web3-button-secondary"
                        onClick={() => handleBulkAction('deactivate')}
                      >
                        <PauseIcon />
                        Désactiver
                      </button>
                      <button
                        className="eco-challenge-btn-secondary web3-button-secondary"
                        onClick={() => handleBulkAction('delete')}
                        style={{ borderColor: '#dc2626', color: '#dc2626' }}
                      >
                        <DeleteIcon />
                        Supprimer
                      </button>
                    </>
                  )}
                </Box>
              </CardContent>
            </div>
          )}

          {/* Onglets avec design cyberpunk */}
          <Box className="eco-challenges-tabs">
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              sx={{
                '& .MuiTab-root': { 
                  color: 'rgba(0, 212, 255, 0.7)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.05em'
                },
                '& .MuiTab-root.Mui-selected': { 
                  color: '#00d4ff',
                  textShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                },
                '& .MuiTabs-indicator': { 
                  backgroundColor: '#00d4ff',
                  boxShadow: '0 0 10px rgba(0, 212, 255, 0.5)'
                }
              }}
            >
              <Tab label="🌐 Réseau de Défis" className="eco-challenges-tab" />
              {canParticipate() && <Tab label="⚡ Mes Missions" className="eco-challenges-tab" />}
              <Tab label="🏆 Récompenses Cyber" className="eco-challenges-tab" />
            </Tabs>
          </Box>

          {/* Contenu des onglets */}
          {currentTab === 0 && (
            <Box>
              {/* Filtres Web3 */}
              <div className="web3-glass-card eco-challenges-filters">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" className="web3-label">
                      <FilterListIcon className="eco-challenges-card-icon" />
                      Filtres Neuraux
                    </Typography>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="eco-challenge-btn-secondary"
                    >
                      {showFilters ? 'Masquer' : 'Analyser'}
                    </button>
                  </Box>

                  {showFilters && (
                    <div className="eco-challenges-filters-grid">
                      <div className="eco-challenges-filter-group">
                        <label className="web3-label">Type de Mission</label>
                        <div className="web3-input-wrapper">
                          <select
                            className="web3-input eco-challenges-filter-select"
                            value={filters.type || ''}
                            onChange={(e) => setFilters({...filters, type: e.target.value})}
                          >
                            <option value="">Tous les Types</option>
                            <option value="eco_driving">🚗 Éco-conduite</option>
                            <option value="co2_reduction">🌱 Réduction CO₂</option>
                            <option value="fuel_efficiency">⚡ Efficacité Énergétique</option>
                            <option value="eco_score">📊 Score Écologique</option>
                          </select>
                          <div className="web3-input-glow" />
                        </div>
                      </div>
                      
                      <div className="eco-challenges-filter-group">
                        <label className="web3-label">Niveau Neural</label>
                        <div className="web3-input-wrapper">
                          <select
                            className="web3-input eco-challenges-filter-select"
                            value={filters.difficulty || ''}
                            onChange={(e) => setFilters({...filters, difficulty: e.target.value})}
                          >
                            <option value="">Tous Niveaux</option>
                            <option value="beginner">🟢 Initié</option>
                            <option value="intermediate">🔵 Avancé</option>
                            <option value="advanced">🟠 Expert</option>
                            <option value="expert">🔴 Maître</option>
                          </select>
                          <div className="web3-input-glow" />
                        </div>
                      </div>

                      <div className="eco-challenges-filter-group">
                        <label className="web3-label">État Système</label>
                        <div className="web3-input-wrapper">
                          <select
                            className="web3-input eco-challenges-filter-select"
                            value={filters.is_active || ''}
                            onChange={(e) => setFilters({...filters, is_active: e.target.value})}
                          >
                            <option value="">Tous États</option>
                            <option value="true">✅ En Ligne</option>
                            <option value="false">⏸️ Hors Ligne</option>
                          </select>
                          <div className="web3-input-glow" />
                        </div>
                      </div>

                      <div className="eco-challenges-filter-group">
                        <button
                          onClick={() => setFilters({})}
                          className="web3-button-primary"
                          style={{ width: '100%', padding: '12px' }}
                        >
                          🔄 Reset Neural
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Liste des défis avec design Web3 */}
              {loading ? (
                <div className="eco-challenges-loading-container-web3">
                  <div className="eco-challenges-ai-loader">
                    <div className="eco-challenges-brain-core" />
                    <div className="eco-challenges-brain-waves">
                      <div className="eco-challenges-wave eco-challenges-wave-1" />
                      <div className="eco-challenges-wave eco-challenges-wave-2" />
                      <div className="eco-challenges-wave eco-challenges-wave-3" />
                    </div>
                  </div>
                  <Typography className="eco-challenges-loading-text">
                    🧠 Analyse des défis neuraux
                    <div className="web3-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </Typography>
                </div>
              ) : challenges.length === 0 ? (
                <div className="web3-empty-state eco-challenges-empty-state">
                  <div className="web3-hologram-icon">
                    <EmojiEventsIcon className="eco-challenges-empty-icon" sx={{ fontSize: 64 }} />
                    <div className="web3-icon-rings">
                      <div className="ring ring-1" />
                      <div className="ring ring-2" />
                      <div className="ring ring-3" />
                    </div>
                  </div>
                  <Typography variant="h5" className="eco-challenges-empty-title web3-gradient-text">
                    Réseau Neural Inactif
                  </Typography>
                  <Typography className="eco-challenges-empty-text">
                    {canManageChallenges() 
                      ? '🚀 Initialisez le premier défi pour activer le réseau cybernétique.'
                      : '⏳ Les défis neuraux seront bientôt disponibles dans la matrice.'
                    }
                  </Typography>
                </div>
              ) : (
                <>
                  <div className="eco-challenges-grid">
                    {paginatedChallenges.map((challenge) => (
                      <div key={challenge.id} className="eco-challenge-item-web3">
                        {/* Points de données neuraux */}
                        <div className="eco-challenges-data-points">
                          <div className="eco-challenges-data-point" />
                          <div className="eco-challenges-data-point" />
                          <div className={`eco-challenges-data-point ${challenge.is_active ? '' : 'inactive'}`} />
                        </div>

                        {/* Checkbox pour admin/agence */}
                        {canManageChallenges() && (
                          <Box sx={{ position: 'absolute', top: 8, left: 8 }}>
                            <Checkbox
                              checked={selectedChallenges.includes(challenge.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChallenges(prev => [...prev, challenge.id]);
                                } else {
                                  setSelectedChallenges(prev => prev.filter(id => id !== challenge.id));
                                }
                              }}
                              sx={{ 
                                color: '#00d4ff',
                                '&.Mui-checked': { color: '#00d4ff' }
                              }}
                            />
                          </Box>
                        )}

                        <div className="eco-challenge-header">
                          <div>
                            <h3 className="eco-challenge-title-web3">
                              {challenge.title}
                            </h3>
                            <div className="eco-challenge-badges">
                              <span className={`eco-challenge-badge-web3 ${challenge.difficulty}`}>
                                {formatDifficulty(challenge.difficulty)}
                              </span>
                              <span className={`eco-challenge-badge-web3 ${challenge.is_active ? 'active' : 'inactive'}`}>
                                {challenge.is_active ? '🟢 En Ligne' : '🔴 Hors Ligne'}
                              </span>
                              {challenge.featured && (
                                <span className="eco-challenge-badge-web3 featured">
                                  ⭐ Premium
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="eco-challenge-description">
                          {challenge.description}
                        </p>

                        <div className="eco-challenge-meta">
                          <span className="eco-challenge-target">
                            🎯 Cible: {challenge.target_value} {challenge.unit}
                          </span>
                          <span className="eco-challenge-reward">
                            💎 {challenge.reward_points} pts
                          </span>
                        </div>

                        <p className="eco-challenge-type">
                          {formatChallengeType(challenge.type)}
                        </p>

                        {challenge.participant_count !== undefined && (
                          <div style={{ 
                            marginTop: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            color: 'rgba(0, 212, 255, 0.7)',
                            fontSize: '0.9rem'
                          }}>
                            🌐 {challenge.participant_count} connectés
                          </div>
                        )}

                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            {canParticipate() && challenge.is_active && (
                              <button
                                className="eco-challenge-btn-primary-web3"
                                onClick={() => handleJoinChallenge(challenge.id)}
                                disabled={loading}
                                style={{ width: 'auto', padding: '10px 20px', fontSize: '0.9rem' }}
                              >
                                <span>⚡ Se Connecter</span>
                              </button>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: '8px' }}>
                            {canEditChallenge(challenge) && (
                              <>
                                <Tooltip title="Modifier">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleEditChallenge(challenge)}
                                    sx={{ color: 'rgba(0, 212, 255, 0.7)', '&:hover': { color: '#00d4ff' } }}
                                  >
                                    <EditIcon />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cloner">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleDuplicateChallenge(challenge.id)}
                                    sx={{ color: 'rgba(0, 212, 255, 0.7)', '&:hover': { color: '#00d4ff' } }}
                                  >
                                    <FileCopyIcon />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {canManageChallenges() && (
                              <Tooltip title="Export Neural">
                                <IconButton
                                  size="small"
                                  onClick={() => handleExportData(challenge.id)}
                                  sx={{ color: 'rgba(0, 212, 255, 0.7)', '&:hover': { color: '#00d4ff' } }}
                                >
                                  <DownloadIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination Web3 */}
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <div className="web3-glass-card" style={{ padding: '16px', borderRadius: '12px' }}>
                      <TablePagination
                        component="div"
                        count={challenges.length}
                        page={page}
                        onPageChange={(event, newPage) => setPage(newPage)}
                        rowsPerPage={rowsPerPage}
                        onRowsPerPageChange={(event) => {
                          setRowsPerPage(parseInt(event.target.value, 10));
                          setPage(0);
                        }}
                        rowsPerPageOptions={[6, 12, 24, 48]}
                        sx={{
                          color: '#00d4ff',
                          '& .MuiTablePagination-select': { color: '#00d4ff' },
                          '& .MuiTablePagination-selectIcon': { color: '#00d4ff' },
                          '& .MuiIconButton-root': { 
                            color: '#00d4ff',
                            '&:hover': { backgroundColor: 'rgba(0, 212, 255, 0.1)' }
                          },
                        }}
                      />
                    </div>
                  </Box>
                </>
              )}
            </Box>
          )}

          {/* Onglet Mes Défis avec design Web3 et saisie manuelle */}
          {currentTab === 1 && canParticipate() && (
            <Box>
              {loading ? (
                <div className="eco-challenges-loading-container-web3">
                  <div className="eco-challenges-ai-loader">
                    <div className="eco-challenges-brain-core" />
                    <div className="eco-challenges-brain-waves">
                      <div className="eco-challenges-wave eco-challenges-wave-1" />
                      <div className="eco-challenges-wave eco-challenges-wave-2" />
                      <div className="eco-challenges-wave eco-challenges-wave-3" />
                    </div>
                  </div>
                  <Typography className="eco-challenges-loading-text">
                    🔄 Scan des missions actives
                    <div className="web3-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </Typography>
                </div>
              ) : userChallenges.length === 0 ? (
                <div className="web3-empty-state eco-challenges-empty-state">
                  <div className="web3-hologram-icon">
                    <EmojiEventsIcon className="eco-challenges-empty-icon" sx={{ fontSize: 64 }} />
                    <div className="web3-icon-rings">
                      <div className="ring ring-1" />
                      <div className="ring ring-2" />
                      <div className="ring ring-3" />
                    </div>
                  </div>
                  <Typography variant="h5" className="eco-challenges-empty-title web3-gradient-text">
                    Aucune Mission Active
                  </Typography>
                  <Typography className="eco-challenges-empty-text">
                    🚀 Connectez-vous au réseau neural pour débuter votre parcours cybernétique !
                  </Typography>
                </div>
              ) : (
                <div className="eco-challenges-grid">
                  {userChallenges.map((userChallenge) => (
                    <div key={userChallenge.id} className="eco-challenge-item-web3">
                      {/* Points de statut */}
                      <div className="eco-challenges-data-points">
                        <div className={`eco-challenges-data-point ${userChallenge.status === 'active' ? '' : 'inactive'}`} />
                        <div className={`eco-challenges-data-point ${userChallenge.progress_percentage > 50 ? '' : 'inactive'}`} />
                        <div className={`eco-challenges-data-point ${userChallenge.status === 'completed' ? '' : 'inactive'}`} />
                      </div>

                      <div className="eco-challenge-header">
                        <h3 className="eco-challenge-title-web3">
                          {userChallenge.challenge?.title}
                        </h3>
                        <div className="eco-challenge-badges">
                          <span className={`eco-challenge-badge-web3 ${
                            userChallenge.status === 'completed' ? 'success' : 
                            userChallenge.status === 'active' ? 'active' : 'default'
                          }`}>
                            {userChallenge.status === 'completed' ? '✅ Terminé' :
                             userChallenge.status === 'active' ? '⚡ En Cours' : '⏸️ Inactif'}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        <Typography variant="body2" sx={{ color: 'rgba(0, 212, 255, 0.8)', mb: 1, fontWeight: 600 }}>
                          🧠 Progression Neural: {userChallenge.progress_percentage?.toFixed(1)}%
                        </Typography>
                        
                        {/* 🆕 Indication du type de saisie */}
                        {userChallenge.last_entry_type === 'manual' && (
                          <Typography variant="caption" sx={{ color: 'rgba(0, 255, 136, 0.6)', display: 'block', mb: 0.5 }}>
                            📝 Dernière saisie manuelle
                          </Typography>
                        )}
                        
                        <div className="eco-challenge-progress-web3">
                          <div 
                            className="eco-challenge-progress-bar-web3"
                            style={{
                              width: `${Math.min(userChallenge.progress_percentage || 0, 100)}%`
                            }}
                          />
                        </div>
                      </div>

                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 1 }}>
                        📊 Données: {userChallenge.progress} / {userChallenge.target} {userChallenge.unit}
                        {userChallenge.manual_entries_count > 0 && (
                          <Typography component="span" sx={{ color: 'rgba(0, 255, 136, 0.7)', ml: 1 }}>
                            ({userChallenge.manual_entries_count} saisies manuelles)
                          </Typography>
                        )}
                      </Typography>

                      {userChallenge.days_remaining !== undefined && (
                        <Typography variant="body2" sx={{ color: 'rgba(0, 212, 255, 0.6)' }}>
                          ⏱️ Temps restant: {userChallenge.days_remaining} jours
                        </Typography>
                      )}

                      <div style={{ 
                        marginTop: '16px', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        flexWrap: 'wrap', 
                        gap: '8px' 
                      }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {userChallenge.status === 'active' && (
                            <>
                              {/* 🆕 Bouton saisie manuelle */}
                              <button
                                className="eco-challenge-btn-secondary web3-button-secondary"
                                onClick={() => setManualEntry({
                                  open: true,
                                  challengeId: userChallenge.id,
                                  challengeTitle: userChallenge.challenge?.title || '',
                                  value: '',
                                  unit: userChallenge.unit || 'km'
                                })}
                                style={{ 
                                  padding: '8px 16px',
                                  fontSize: '0.85rem',
                                  background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.1), rgba(0, 212, 255, 0.1))',
                                  borderColor: '#00ff88'
                                }}
                              >
                                <DirectionsCarIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                📊 Saisir {userChallenge.unit || 'données'}
                              </button>
                              
                              {/* Bouton abandon existant */}
                              <Button
                                size="small"
                                onClick={() => handleAbandonChallenge(userChallenge.id)}
                                sx={{ 
                                  color: '#dc2626',
                                  borderColor: '#dc2626',
                                  '&:hover': { 
                                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                                    borderColor: '#dc2626'
                                  }
                                }}
                                variant="outlined"
                              >
                                🔌 Déconnecter
                              </Button>
                            </>
                          )}
                        </div>
                        
                        {userChallenge.status === 'completed' && (
                          <Chip 
                            icon={<CheckCircleIcon />} 
                            label="🎉 Mission Accomplie !" 
                            sx={{
                              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                              color: 'black',
                              fontWeight: 'bold'
                            }}
                            size="small" 
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Box>
          )}

          {/* Onglet Récompenses avec design Web3 */}
          {currentTab === 2 && (
            <Box>
              {loading ? (
                <div className="eco-challenges-loading-container-web3">
                  <div className="eco-challenges-ai-loader">
                    <div className="eco-challenges-brain-core" />
                    <div className="eco-challenges-brain-waves">
                      <div className="eco-challenges-wave eco-challenges-wave-1" />
                      <div className="eco-challenges-wave eco-challenges-wave-2" />
                      <div className="eco-challenges-wave eco-challenges-wave-3" />
                    </div>
                  </div>
                  <Typography className="eco-challenges-loading-text">
                    💎 Scan des récompenses cyber
                    <div className="web3-loading-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </Typography>
                </div>
              ) : rewards.length === 0 ? (
                <div className="web3-empty-state eco-challenges-empty-state">
                  <div className="web3-hologram-icon">
                    <EmojiEventsIcon className="eco-challenges-empty-icon" sx={{ fontSize: 64 }} />
                    <div className="web3-icon-rings">
                      <div className="ring ring-1" />
                      <div className="ring ring-2" />
                      <div className="ring ring-3" />
                    </div>
                  </div>
                  <Typography variant="h5" className="eco-challenges-empty-title web3-gradient-text">
                    Coffre-Fort Cyber Vide
                  </Typography>
                  <Typography className="eco-challenges-empty-text">
                    💎 Participez aux défis neuraux pour débloquer des récompenses exclusives !
                  </Typography>
                </div>
              ) : (
                <div className="eco-challenges-grid">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="eco-challenge-item-web3 web3-metric-card">
                      {/* Points de données pour récompenses */}
                      <div className="eco-challenges-data-points">
                        <div className={`eco-challenges-data-point ${reward.claimed ? '' : 'inactive'}`} />
                        <div className="eco-challenges-data-point" />
                        <div className={`eco-challenges-data-point ${reward.points_awarded > 0 ? '' : 'inactive'}`} />
                      </div>

                      <div className="eco-challenge-header">
                        <h3 className="eco-challenge-title-web3">
                          {reward.title || '💎 Récompense Cyber'}
                        </h3>
                        <div className="eco-challenge-badges">
                          <span className={`eco-challenge-badge-web3 ${reward.claimed ? 'success' : 'warning'}`}>
                            {reward.claimed ? '✅ Réclamée' : '⚡ Disponible'}
                          </span>
                          <span className="eco-challenge-badge-web3 primary">
                            {reward.reward_type || '🎁 Bonus'}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '16px' }}>
                        {reward.points_awarded > 0 && (
                          <Typography sx={{ color: 'rgba(0, 255, 136, 0.9)', fontWeight: 600 }}>
                            💎 {reward.points_awarded} points neuraux
                          </Typography>
                        )}
                        {reward.credit_awarded > 0 && (
                          <Typography sx={{ color: 'rgba(0, 212, 255, 0.9)', fontWeight: 600 }}>
                            💰 {reward.credit_awarded}€ cyber-crédits
                          </Typography>
                        )}
                        {reward.badge_awarded && (
                          <Typography sx={{ color: 'rgba(255, 0, 110, 0.9)', fontWeight: 600 }}>
                            🏅 {reward.badge_awarded}
                          </Typography>
                        )}
                      </div>

                      {reward.description && (
                        <Typography variant="body2" className="eco-challenge-description">
                          {reward.description}
                        </Typography>
                      )}

                      <div style={{ marginTop: '16px' }}>
                        {!reward.claimed ? (
                          <button
                            className="eco-challenge-btn-primary-web3"
                            onClick={() => handleClaimReward(reward.id)}
                            disabled={loading}
                          >
                            <span>🔓 Déverrouiller</span>
                          </button>
                        ) : (
                          <Chip 
                            icon={<CheckCircleIcon />} 
                            label="🎉 Déverrouillée !" 
                            sx={{
                              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                              color: 'black',
                              fontWeight: 'bold'
                            }}
                            size="small" 
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Box>
          )}

          {/* 🆕 Dialog de saisie manuelle des kilomètres */}
          <Dialog
            open={manualEntry.open}
            onClose={() => setManualEntry({ open: false, challengeId: null, challengeTitle: '', value: '', unit: 'km' })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                backgroundColor: '#0a0a0a',
                color: 'white',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                borderRadius: '16px',
                boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)'
              }
            }}
          >
            <DialogTitle sx={{ 
              color: '#00d4ff', 
              borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
              textAlign: 'center',
              fontWeight: 700
            }}>
              📊 Saisie Manuelle - {manualEntry.challengeTitle}
            </DialogTitle>
            
            <DialogContent sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 3 }}>
                🚗 Entrez les données de votre défi pour mettre à jour votre progression automatiquement
              </Typography>
              
              <div className="web3-input-wrapper">
                <TextField
                  fullWidth
                  type="number"
                  label={`Valeur en ${manualEntry.unit}`}
                  value={manualEntry.value}
                  onChange={(e) => setManualEntry(prev => ({ ...prev, value: e.target.value }))}
                  placeholder={`ex: ${manualEntry.unit === 'km' ? '25.5' : '100'}`}
                  InputProps={{
                    endAdornment: <Typography sx={{ color: '#00d4ff', ml: 1 }}>{manualEntry.unit}</Typography>,
                    sx: { 
                      color: '#00d4ff',
                      '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                      '&:hover fieldset': { borderColor: '#00d4ff' },
                      '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                    }
                  }}
                  InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                />
                <div className="web3-input-glow" />
              </div>

              <Typography variant="caption" sx={{ color: 'rgba(0, 255, 136, 0.7)', mt: 2, display: 'block' }}>
                💡 Le système calculera automatiquement votre progression et mettra à jour le statut du défi
              </Typography>
            </DialogContent>

            <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 212, 255, 0.2)' }}>
              <Button
                onClick={() => setManualEntry({ open: false, challengeId: null, challengeTitle: '', value: '', unit: 'km' })}
                sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
              >
                🚫 Annuler
              </Button>
              <button
                onClick={() => handleSubmitProgress(manualEntry.challengeId, manualEntry.value, manualEntry.unit)}
                disabled={!manualEntry.value || parseFloat(manualEntry.value) <= 0 || submitting}
                className="web3-button-primary"
                style={{ padding: '12px 24px' }}
              >
                {submitting ? '⏳ Traitement...' : '📊 Enregistrer'}
              </button>
            </DialogActions>
          </Dialog>

          {/* Dialog de création/modification avec design Web3 */}
          {canManageChallenges() && (
            <Dialog
              open={openDialog}
              onClose={() => setOpenDialog(false)}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  backgroundColor: '#0a0a0a',
                  color: 'white',
                  border: '1px solid rgba(0, 212, 255, 0.3)',
                  borderRadius: '16px',
                  boxShadow: '0 0 50px rgba(0, 212, 255, 0.2)'
                }
              }}
            >
              <DialogTitle sx={{ 
                color: '#00d4ff', 
                borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
                textAlign: 'center',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.1em'
              }}>
                {dialogMode === 'create' ? '🚀 Créer Nouveau Défi Neural' : '⚡ Modifier Défi Cybernétique'}
              </DialogTitle>
              
              <DialogContent sx={{ p: 3 }}>
                <Grid container spacing={3} sx={{ mt: 0.5 }}>
                  <Grid item xs={12}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        label="Nom du Défi"
                        value={currentChallenge?.title || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, title: e.target.value })}
                        error={!currentChallenge?.title}
                        helperText={!currentChallenge?.title ? 'Le nom est requis pour activer le défi' : ''}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={12}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Description Neural"
                        value={currentChallenge?.description || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, description: e.target.value })}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: 'rgba(0, 212, 255, 0.7)' }}>Type de Mission</InputLabel>
                      <Select
                        value={currentChallenge?.type || 'eco_driving'}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, type: e.target.value })}
                        className="web3-input"
                        sx={{
                          color: '#00d4ff',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' }
                        }}
                      >
                        <MenuItem value="eco_driving">🚗 Éco-conduite</MenuItem>
                        <MenuItem value="co2_reduction">🌱 Réduction CO₂</MenuItem>
                        <MenuItem value="fuel_efficiency">⚡ Efficacité Énergétique</MenuItem>
                        <MenuItem value="eco_score">📊 Score Écologique</MenuItem>
                        <MenuItem value="low_emission">💨 Faibles Émissions</MenuItem>
                        <MenuItem value="distance_reduction">📏 Réduction Distance</MenuItem>
                        <MenuItem value="alternative_transport">🚲 Transport Alternatif</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={6}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: 'rgba(0, 212, 255, 0.7)' }}>Niveau Neural</InputLabel>
                      <Select
                        value={currentChallenge?.difficulty || 'beginner'}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, difficulty: e.target.value })}
                        className="web3-input"
                        sx={{
                          color: '#00d4ff',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#00d4ff' }
                        }}
                      >
                        <MenuItem value="beginner">🟢 Initié</MenuItem>
                        <MenuItem value="intermediate">🔵 Avancé</MenuItem>
                        <MenuItem value="advanced">🟠 Expert</MenuItem>
                        <MenuItem value="expert">🔴 Maître</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        type="number"
                        label="Valeur Cible"
                        value={currentChallenge?.target_value || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, target_value: parseFloat(e.target.value) || 0 })}
                        error={currentChallenge?.target_value <= 0}
                        helperText={currentChallenge?.target_value <= 0 ? 'Valeur > 0 requise' : ''}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        label="Unité"
                        value={currentChallenge?.unit || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, unit: e.target.value })}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={4}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        type="number"
                        label="Durée (jours)"
                        value={currentChallenge?.duration_days || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, duration_days: parseInt(e.target.value) || 0 })}
                        error={currentChallenge?.duration_days <= 0}
                        helperText={currentChallenge?.duration_days <= 0 ? 'Durée > 0 requise' : ''}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={6}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        type="number"
                        label="Points Neuraux"
                        value={currentChallenge?.reward_points || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, reward_points: parseInt(e.target.value) || 0 })}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={6}>
                    <div className="web3-input-wrapper">
                      <TextField
                        fullWidth
                        type="number"
                        label="Cyber-Crédits (€)"
                        value={currentChallenge?.reward_credit_euros || ''}
                        onChange={(e) => setCurrentChallenge({ ...currentChallenge, reward_credit_euros: parseFloat(e.target.value) || 0 })}
                        className="web3-input"
                        InputProps={{ 
                          sx: { 
                            color: '#00d4ff',
                            '& fieldset': { borderColor: 'rgba(0, 212, 255, 0.3)' },
                            '&:hover fieldset': { borderColor: '#00d4ff' },
                            '&.Mui-focused fieldset': { borderColor: '#00d4ff' }
                          } 
                        }}
                        InputLabelProps={{ sx: { color: 'rgba(0, 212, 255, 0.7)' } }}
                      />
                      <div className="web3-input-glow" />
                    </div>
                  </Grid>

                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={currentChallenge?.is_active || false}
                          onChange={(e) => setCurrentChallenge({ ...currentChallenge, is_active: e.target.checked })}
                          sx={{ 
                            color: '#00d4ff',
                            '&.Mui-checked': { color: '#00d4ff' }
                          }}
                        />
                      }
                      label="🟢 Défi En Ligne"
                      sx={{ color: '#00d4ff' }}
                    />
                  </Grid>

                  <Grid item xs={6}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={currentChallenge?.featured || false}
                          onChange={(e) => setCurrentChallenge({ ...currentChallenge, featured: e.target.checked })}
                          sx={{ 
                            color: '#00d4ff',
                            '&.Mui-checked': { color: '#00d4ff' }
                          }}
                        />
                      }
                      label="⭐ Défi Premium"
                      sx={{ color: '#00d4ff' }}
                    />
                  </Grid>
                </Grid>
              </DialogContent>

              <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 212, 255, 0.2)' }}>
                <Button
                  onClick={() => setOpenDialog(false)}
                  sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': { color: 'white' }
                  }}
                >
                  🚫 Annuler
                </Button>
                <button
                  onClick={handleSaveChallenge}
                  disabled={!currentChallenge?.title || currentChallenge?.target_value <= 0 || currentChallenge?.duration_days <= 0}
                  className="web3-button-primary"
                  style={{ padding: '12px 24px' }}
                >
                  {dialogMode === 'create' ? '🚀 Créer Mission' : '💾 Sauvegarder'}
                </button>
              </DialogActions>
            </Dialog>
          )}

          {/* Snackbar avec design Web3 */}
          <Snackbar
            open={snackbar.open}
            autoHideDuration={6000}
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert
              onClose={() => setSnackbar({ ...snackbar, open: false })}
              severity={snackbar.severity}
              sx={{ 
                width: '100%',
                backgroundColor: 'rgba(0, 10, 20, 0.9)',
                color: '#00d4ff',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                '& .MuiAlert-icon': { color: '#00d4ff' }
              }}
            >
              {snackbar.message}
            </Alert>
          </Snackbar>
        </div>
      </div>
    </div>
  );  
});

AdvancedEcoChallengeManager.displayName = 'AdvancedEcoChallengeManager';

export default AdvancedEcoChallengeManager;
