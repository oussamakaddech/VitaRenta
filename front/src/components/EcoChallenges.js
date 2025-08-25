import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Select, MenuItem,
  FormControl, InputLabel, Chip, Grid, Tab, Tabs,
  IconButton, Checkbox, FormControlLabel, Alert, Snackbar,
  CircularProgress, Tooltip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TablePagination
} from '@mui/material';
import {
  Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon,
  FileCopy as CopyIcon, Analytics as AnalyticsIcon,
  Download as ExportIcon, Star as StarIcon, PlayArrow as ActivateIcon,
  Pause as DeactivateIcon, FilterList as FilterIcon
} from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';

// IMPORT CORRIGÉ
import { api, errorUtils, API_ENDPOINTS } from '../services/apiService';

ChartJS.register(ArcElement, ChartTooltip, Legend);

const AdvancedEcoChallengeManager = ({ token, user }) => {
  const navigate = useNavigate();
  
  // États du composant (identiques)
  const [challenges, setChallenges] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [selectedChallenges, setSelectedChallenges] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('create');
  const [currentChallenge, setCurrentChallenge] = useState(null);
  const [filters, setFilters] = useState({});
  const [analytics, setAnalytics] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [dataLoaded, setDataLoaded] = useState({
    challenges: false,
    templates: false,
    analytics: false
  });

  // Vérification d'authentification SIMPLIFIÉE
  useEffect(() => {
    const checkAuth = () => {
      console.log('Vérification authentification...');
      
      if (!token || !user) {
        console.log('Pas de token ou d\'utilisateur, redirection vers login');
        navigate('/login');
        return;
      }

      const storedToken = localStorage.getItem('access_token');
      if (!storedToken && token && typeof token === 'string') {
        localStorage.setItem('access_token', token);
      }

      console.log('Authentification valide, prêt à charger les données');
      setAuthChecked(true);
    };

    checkAuth();
  }, [token, user, navigate]);

  // Gestion des erreurs API CORRIGÉE
  const handleApiError = useCallback((error, defaultMessage) => {
    console.error('Erreur API:', error);
    
    if (error.response?.status === 401) {
      console.log('Erreur 401, redirection vers login');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      navigate('/login');
      return;
    }
    
    let message = defaultMessage;
    if (errorUtils && errorUtils.getErrorMessage) {
      try {
        message = errorUtils.getErrorMessage(error);
      } catch (e) {
        console.warn('Erreur lors de l\'utilisation d\'errorUtils:', e);
      }
    }
    
    showSnackbar(message, 'error');
  }, [navigate]);

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  // CORRECTION PRINCIPALE : Charger les défis avec la bonne URL
  const loadChallenges = useCallback(async () => {
    if (!authChecked) return;
    
    try {
      setLoading(true);
      console.log('Chargement des défis...');
      
      // CORRECTION : Construction de l'URL correcte
      let url = '/api/eco-challenges/';
      const params = new URLSearchParams();
      
      // Ajouter les filtres aux paramètres
      if (filters.type) params.append('type', filters.type);
      if (filters.difficulty) params.append('difficulty', filters.difficulty);
      if (filters.is_active) params.append('is_active', filters.is_active);
      
      // Construire l'URL finale
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
      
      console.log('URL de requête:', url);
      
      const response = await api.get(url);
      console.log('Réponse brute:', response.data);
      
      // CORRECTION : Gestion de différents formats de réponse
      let data = [];
      if (response.data.results) {
        data = response.data.results;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      } else {
        console.warn('Format de réponse inattendu:', response.data);
        data = [];
      }
      
      setChallenges(Array.isArray(data) ? data : []);
      setDataLoaded(prev => ({ ...prev, challenges: true }));
      console.log('Défis chargés:', data);
      
    } catch (error) {
      console.error('Erreur lors du chargement des défis:', error);
      setChallenges([]);
      handleApiError(error, 'Erreur lors du chargement des défis');
    } finally {
      setLoading(false);
    }
  }, [authChecked, filters, handleApiError]);

  // Charger les templates CORRIGÉ
  const loadTemplates = useCallback(async () => {
    if (!authChecked || dataLoaded.templates) return;
    
    try {
      setLoading(true);
      console.log('Chargement des templates...');
      
      const response = await api.get('/api/eco-challenges/templates/');
      const data = Array.isArray(response.data) ? response.data : [];
      setTemplates(data);
      
      setDataLoaded(prev => ({ ...prev, templates: true }));
      console.log('Templates chargés:', data);
    } catch (error) {
      console.error('Erreur lors du chargement des templates:', error);
      setTemplates([]);
      handleApiError(error, 'Erreur lors du chargement des templates');
    } finally {
      setLoading(false);
    }
  }, [authChecked, dataLoaded.templates, handleApiError]);

  // Charger les analytics CORRIGÉ
  const loadAnalytics = useCallback(async () => {
    if (!authChecked || dataLoaded.analytics) return;
    
    try {
      console.log('Chargement des analytics...');
      
      const response = await api.get('/api/eco-challenges/analytics/');
      setAnalytics(response.data || null);
      
      setDataLoaded(prev => ({ ...prev, analytics: true }));
      console.log('Analytics chargées:', response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des analytics:', error);
      setAnalytics(null);
      handleApiError(error, 'Erreur lors du chargement des analytics');
    }
  }, [authChecked, dataLoaded.analytics, handleApiError]);

  // Charger les participants CORRIGÉ
  const loadParticipants = useCallback(async (challengeId) => {
    if (!authChecked || !challengeId) return;
    
    try {
      setLoading(true);
      console.log('Chargement des participants pour le défi:', challengeId);
      
      const response = await api.get(`/api/eco-challenges/${challengeId}/participants/`);
      const data = Array.isArray(response.data) ? response.data : [];
      setParticipants(data);
      
      console.log('Participants chargés:', data);
    } catch (error) {
      console.error('Erreur lors du chargement des participants:', error);
      setParticipants([]);
      handleApiError(error, 'Erreur lors du chargement des participants');
    } finally {
      setLoading(false);
    }
  }, [authChecked, handleApiError]);

  // Effect pour recharger quand les filtres changent
  useEffect(() => {
    if (authChecked && currentTab === 0) {
      loadChallenges();
    }
  }, [authChecked, currentTab, filters, loadChallenges]);

  // Effect pour charger les données selon l'onglet actif
  useEffect(() => {
    if (!authChecked) return;
    
    console.log('useEffect - currentTab changed:', currentTab);
    
    switch (currentTab) {
      case 0:
        if (!dataLoaded.challenges) {
          loadChallenges();
        }
        break;
      case 1:
        loadTemplates();
        break;
      case 2:
        loadAnalytics();
        break;
      case 3:
        // Les participants se chargent à la demande
        break;
      default:
        break;
    }
  }, [currentTab, authChecked]);

  // Gestionnaire d'onglet
  const handleTabChange = useCallback((event, newValue) => {
    setCurrentTab(newValue);
    if (currentTab === 3 && newValue !== 3) {
      setParticipants([]);
    }
  }, [currentTab]);

  // ACTIONS CORRIGÉES
  const handleCreateChallenge = useCallback(() => {
    setCurrentChallenge({
      title: '',
      description: '',
      type: 'eco_driving',
      difficulty: 'beginner',
      target_value: 100,
      unit: 'points',
      duration_days: 14,
      reward_points: 100,
      reward_credit_euros: 5,
      is_active: true
    });
    setDialogMode('create');
    setOpenDialog(true);
  }, []);

  const handleEditChallenge = useCallback((challenge) => {
    setCurrentChallenge({
      ...challenge
    });
    setDialogMode('edit');
    setOpenDialog(true);
  }, []);

  const handleSaveChallenge = useCallback(async () => {
    if (!currentChallenge?.title || currentChallenge?.target_value <= 0 || currentChallenge?.duration_days <= 0) {
      showSnackbar('Veuillez remplir tous les champs obligatoires correctement', 'error');
      return;
    }
    
    try {
      console.log('=== SAUVEGARDE DU DÉFI ===');
      console.log('Mode:', dialogMode);
      console.log('Données:', currentChallenge);
      
      let response;
      if (dialogMode === 'create') {
        response = await api.post('/api/eco-challenges/', currentChallenge);
      } else {
        response = await api.put(`/api/eco-challenges/${currentChallenge.id}/`, currentChallenge);
      }
      
      if (dialogMode === 'create') {
        setChallenges(prev => [response.data, ...prev]);
      } else {
        setChallenges(prev => prev.map(c => c.id === currentChallenge.id ? response.data : c));
      }
      
      setOpenDialog(false);
      showSnackbar(
        `Défi ${dialogMode === 'create' ? 'créé' : 'modifié'} avec succès`,
        'success'
      );
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      handleApiError(error, `Erreur lors de la ${dialogMode === 'create' ? 'création' : 'modification'}`);
    }
  }, [currentChallenge, dialogMode, handleApiError, showSnackbar]);

  const handleDuplicateChallenge = useCallback(async (challengeId) => {
    try {
      const response = await api.post(`/api/eco-challenges/${challengeId}/duplicate/`);
      setChallenges(prev => [response.data, ...prev]);
      showSnackbar('Défi dupliqué avec succès', 'success');
    } catch (error) {
      handleApiError(error, 'Erreur lors de la duplication');
    }
  }, [handleApiError, showSnackbar]);

  const handleBulkAction = useCallback(async (action) => {
    if (selectedChallenges.length === 0) {
      showSnackbar('Veuillez sélectionner au moins un défi', 'warning');
      return;
    }
    
    try {
      await api.post('/api/eco-challenges/bulk_action/', {
        challenge_ids: selectedChallenges,
        action
      });
      setSelectedChallenges([]);
      // Recharger les défis
      loadChallenges();
      showSnackbar(`Action '${action}' appliquée avec succès`, 'success');
    } catch (error) {
      handleApiError(error, `Erreur lors de l'action '${action}'`);
    }
  }, [selectedChallenges, handleApiError, showSnackbar, loadChallenges]);

  const handleExportData = useCallback(async (challengeId) => {
    try {
      const response = await api.get(`/api/eco-challenges/${challengeId}/export_data/`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `challenge_${challengeId}_data.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      showSnackbar('Données exportées avec succès', 'success');
    } catch (error) {
      handleApiError(error, 'Erreur lors de l\'export des données');
    }
  }, [handleApiError, showSnackbar]);

  const handleViewParticipants = useCallback((challengeId) => {
    setCurrentTab(3);
    loadParticipants(challengeId);
  }, [loadParticipants]);

  // Gestionnaires de filtres
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPage(0);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters({});
    setPage(0);
  }, []);

  // Gestionnaires de sélection
  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setSelectedChallenges(challenges.map((c) => c.id));
    } else {
      setSelectedChallenges([]);
    }
  }, [challenges]);

  const handleSelectChallenge = useCallback((challengeId, checked) => {
    setSelectedChallenges(prev => 
      checked
        ? [...prev, challengeId]
        : prev.filter((id) => id !== challengeId)
    );
  }, []);

  // Gestionnaires de pagination
  const handleChangePage = useCallback((event, newPage) => {
    setPage(newPage);
  }, []);

  const handleChangeRowsPerPage = useCallback((event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  }, []);

  // Configuration des colonnes
  const columns = useMemo(() => [
    {
      field: 'title',
      headerName: 'Titre',
      width: 250,
      renderCell: ({ row, value }) => (
        <Box display="flex" alignItems="center" gap={1}>
          {row.featured && <StarIcon color="primary" fontSize="small" />}
          <Typography variant="body2">{value}</Typography>
        </Box>
      )
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 150,
      renderCell: ({ value }) => (
        <Chip size="small" label={value} variant="outlined" />
      )
    },
    {
      field: 'difficulty',
      headerName: 'Difficulté',
      width: 120,
      renderCell: ({ value }) => {
        const colors = {
          beginner: 'success',
          intermediate: 'warning',
          advanced: 'error',
          expert: 'secondary'
        };
        return (
          <Chip
            size="small"
            label={value}
            color={colors[value] || 'default'}
          />
        );
      }
    },
    {
      field: 'target_value',
      headerName: 'Cible',
      width: 100,
      renderCell: ({ value }) => (
        <Typography variant="body2">{value}</Typography>
      )
    },
    {
      field: 'is_active',
      headerName: 'Statut',
      width: 100,
      renderCell: ({ value }) => (
        <Chip
          size="small"
          label={value ? 'Actif' : 'Inactif'}
          color={value ? 'success' : 'default'}
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 250,
      renderCell: ({ row }) => (
        <Box>
          <Tooltip title="Modifier">
            <IconButton
              size="small"
              onClick={() => handleEditChallenge(row)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Dupliquer">
            <IconButton
              size="small"
              onClick={() => handleDuplicateChallenge(row.id)}
            >
              <CopyIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Voir Participants">
            <IconButton
              size="small"
              onClick={() => handleViewParticipants(row.id)}
            >
              <AnalyticsIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Exporter les données">
            <IconButton
              size="small"
              onClick={() => handleExportData(row.id)}
            >
              <ExportIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )
    }
  ], [handleEditChallenge, handleDuplicateChallenge, handleViewParticipants, handleExportData]);

  // Ne pas rendre le composant si authentification pas vérifiée
  if (!authChecked || !token || !user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Vérification de l'authentification...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gestion des Défis Éco-Responsables
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateChallenge}
            disabled={user?.role !== 'admin' && user?.role !== 'agence'}
          >
            Nouveau Défi
          </Button>
          {selectedChallenges.length > 0 && (
            <>
              <Button
                variant="outlined"
                startIcon={<ActivateIcon />}
                onClick={() => handleBulkAction('activate')}
              >
                Activer ({selectedChallenges.length})
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeactivateIcon />}
                onClick={() => handleBulkAction('deactivate')}
              >
                Désactiver
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => handleBulkAction('delete')}
              >
                Supprimer
              </Button>
            </>
          )}
        </Box>
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Liste des Défis" />
          <Tab label="Templates" />
          <Tab label="Analytics" />
          <Tab label="Participants" />
        </Tabs>
      </Box>
      
      {/* Contenu des onglets - Onglet Défis */}
      {currentTab === 0 && (
        <Box sx={{ mt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
            </Button>
          </Box>
          
          {showFilters && (
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1, mb: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={filters.type || ''}
                      onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="eco_driving">Eco-conduite</MenuItem>
                      <MenuItem value="co2_reduction">Réduction CO₂</MenuItem>
                      <MenuItem value="fuel_efficiency">Efficacité Énergétique</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Difficulté</InputLabel>
                    <Select
                      value={filters.difficulty || ''}
                      onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                    >
                      <MenuItem value="">Toutes</MenuItem>
                      <MenuItem value="beginner">Débutant</MenuItem>
                      <MenuItem value="intermediate">Intermédiaire</MenuItem>
                      <MenuItem value="advanced">Avancé</MenuItem>
                      <MenuItem value="expert">Expert</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={filters.is_active || ''}
                      onChange={(e) => handleFilterChange('is_active', e.target.value)}
                    >
                      <MenuItem value="">Tous</MenuItem>
                      <MenuItem value="true">Actif</MenuItem>
                      <MenuItem value="false">Inactif</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    variant="outlined"
                    onClick={handleResetFilters}
                    fullWidth
                  >
                    Réinitialiser
                  </Button>
                </Grid>
              </Grid>
            </Box>
          )}
          
          <TableContainer component={Paper}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={selectedChallenges.length > 0 && selectedChallenges.length < challenges.length}
                      checked={challenges.length > 0 && selectedChallenges.length === challenges.length}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                    />
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell key={column.field} sx={{ fontWeight: 'bold' }}>
                      {column.headerName}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : challenges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} align="center">
                      <Typography>Aucun défi disponible</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  challenges
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                    <TableRow key={row.id}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedChallenges.includes(row.id)}
                          onChange={(e) => handleSelectChallenge(row.id, e.target.checked)}
                        />
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column.field}>
                          {column.renderCell({ row, value: row[column.field] })}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            component="div"
            count={challenges.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[5, 10, 25, 50]}
          />
        </Box>
      )}

      {/* Autres onglets - Templates, Analytics, Participants */}
      {currentTab === 1 && (
        <Box sx={{ mt: 2 }}>
          <Typography>Templates (en développement)</Typography>
        </Box>
      )}

      {currentTab === 2 && (
        <Box sx={{ mt: 2 }}>
          {analytics ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Total Défis</Typography>
                    <Typography variant="h4">{analytics.total_challenges || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography color="textSecondary" gutterBottom>Défis Actifs</Typography>
                    <Typography variant="h4">{analytics.active_challenges || 0}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Typography>Chargement des analytics...</Typography>
          )}
        </Box>
      )}

      {currentTab === 3 && (
        <Box sx={{ mt: 2 }}>
          <Typography>Participants : {participants.length} trouvés</Typography>
          {participants.length === 0 && (
            <Typography color="textSecondary" sx={{ mt: 2 }}>
              Cliquez sur "Voir Participants" d'un défi pour charger ses participants.
            </Typography>
          )}
        </Box>
      )}
      
      {/* Dialog de création/modification */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {dialogMode === 'create' ? 'Créer un nouveau défi' : 'Modifier le défi'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Titre"
                value={currentChallenge?.title || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, title: e.target.value })}
                error={!currentChallenge?.title}
                helperText={!currentChallenge?.title ? 'Le titre est requis' : ''}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={currentChallenge?.description || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={currentChallenge?.type || 'eco_driving'}
                  onChange={(e) => setCurrentChallenge({ ...currentChallenge, type: e.target.value })}
                >
                  <MenuItem value="eco_driving">Eco-conduite</MenuItem>
                  <MenuItem value="co2_reduction">Réduction CO₂</MenuItem>
                  <MenuItem value="fuel_efficiency">Efficacité Énergétique</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Difficulté</InputLabel>
                <Select
                  value={currentChallenge?.difficulty || 'beginner'}
                  onChange={(e) => setCurrentChallenge({ ...currentChallenge, difficulty: e.target.value })}
                >
                  <MenuItem value="beginner">Débutant</MenuItem>
                  <MenuItem value="intermediate">Intermédiaire</MenuItem>
                  <MenuItem value="advanced">Avancé</MenuItem>
                  <MenuItem value="expert">Expert</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Valeur cible"
                value={currentChallenge?.target_value || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, target_value: parseFloat(e.target.value) || 0 })}
                error={currentChallenge?.target_value <= 0}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                label="Unité"
                value={currentChallenge?.unit || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, unit: e.target.value })}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Durée (jours)"
                value={currentChallenge?.duration_days || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, duration_days: parseInt(e.target.value) || 0 })}
                error={currentChallenge?.duration_days <= 0}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Points récompense"
                value={currentChallenge?.reward_points || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, reward_points: parseInt(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Crédit (€)"
                value={currentChallenge?.reward_credit_euros || ''}
                onChange={(e) => setCurrentChallenge({ ...currentChallenge, reward_credit_euros: parseFloat(e.target.value) || 0 })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={currentChallenge?.is_active || false}
                    onChange={(e) => setCurrentChallenge({ ...currentChallenge, is_active: e.target.checked })}
                  />
                }
                label="Défi actif"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button
            onClick={handleSaveChallenge}
            variant="contained"
            color="primary"
            disabled={!currentChallenge?.title || currentChallenge?.target_value <= 0 || currentChallenge?.duration_days <= 0}
          >
            {dialogMode === 'create' ? 'Créer' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdvancedEcoChallengeManager;
