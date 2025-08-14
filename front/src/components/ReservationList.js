import React, { useState, useEffect, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import './ReservationList.css';

const ReservationList = ({ token, user }) => {
  // Configuration de l'API - alignée sur VehiculeList
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // États pour la gestion des réservations
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États pour les filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // États pour la vue
  const [viewMode, setViewMode] = useState('grid');

  // États pour les modales
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // États pour les formulaires de modification
  const [editData, setEditData] = useState({
    date_debut: '',
    date_fin: '',
    commentaires: '',
    assurance_complete: false,
    conducteur_supplementaire: false,
    gps: false,
    siege_enfant: false
  });

  // États pour les notifications
  const [notification, setNotification] = useState(null);

  // États pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Options de statut
  const statusOptions = [
    { value: 'en_attente', label: 'En attente', color: 'warning' },
    { value: 'confirmee', label: 'Confirmée', color: 'success' },
    { value: 'terminee', label: 'Terminée', color: 'info' },
    { value: 'annulee', label: 'Annulée', color: 'error' }
  ];

  // Fonction pour récupérer les réservations - CORRIGÉE
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Utilise le même token que App.js (clé 'token')
      const accessToken = localStorage.getItem('token');
      if (!accessToken) {
        setError('Vous devez être connecté pour voir les réservations');
        setLoading(false);
        return;
      }

      console.log('Token trouvé:', !!accessToken);
      console.log('URL appelée:', `${API_BASE_URL}/api/reservations/`);

      // Utilise l'URL complète comme VehiculeList
      const response = await fetch(`${API_BASE_URL}/api/reservations/`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('Response status:', response.status);

      if (response.status === 401) {
        // Token invalide/expiré
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Session expirée, veuillez vous reconnecter');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Data received:', data);

      // CORRECTION PRINCIPALE: Vérifier que data est un tableau
      let reservationsArray = [];
      if (Array.isArray(data)) {
        reservationsArray = data;
      } else if (data && Array.isArray(data.results)) {
        // Si l'API renvoie un objet avec pagination
        reservationsArray = data.results;
      } else if (data && Array.isArray(data.reservations)) {
        // Si l'API renvoie un objet avec une propriété reservations
        reservationsArray = data.reservations;
      } else {
        console.warn('Format de données inattendu:', data);
        reservationsArray = [];
      }

      setReservations(reservationsArray);
      setFilteredReservations(reservationsArray);
    } catch (err) {
      console.error('Erreur lors du chargement des réservations:', err);
      setError(err.message || 'Erreur lors du chargement des réservations');
      // S'assurer que les tableaux restent des tableaux même en cas d'erreur
      setReservations([]);
      setFilteredReservations([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  // Effet pour charger les données initiales
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Fonction de filtrage - SÉCURISÉE
  useEffect(() => {
    // S'assurer que reservations est un tableau
    if (!Array.isArray(reservations)) {
      console.warn('reservations n\'est pas un tableau:', reservations);
      setFilteredReservations([]);
      return;
    }

    let filtered = [...reservations]; // Créer une copie

    if (searchTerm) {
      filtered = filtered.filter(reservation =>
        reservation.vehicule_display?.marque?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.vehicule_display?.modele?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.user?.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reservation.user?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(reservation => reservation.statut === statusFilter);
    }

    setFilteredReservations(filtered);
    setCurrentPage(1);
  }, [reservations, searchTerm, statusFilter]);

  // Fonction pour modifier une réservation - CORRIGÉE
  const handleEditReservation = async (e) => {
    e.preventDefault();
    try {
      const accessToken = localStorage.getItem('token');
      if (!accessToken) {
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        return;
      }

      // Utilise l'URL complète
      const response = await fetch(`${API_BASE_URL}/api/reservations/${selectedReservation.id}/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editData,
          vehicule_id: selectedReservation.vehicule_display?.id || selectedReservation.vehicule_id
        })
      });

      if (response.status === 401) {
        localStorage.clear();
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Erreur lors de la modification');
      }

      showNotification('Réservation modifiée avec succès', 'success');
      setShowEditModal(false);
      setSelectedReservation(null);
      fetchReservations();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Fonction pour mettre à jour le statut - CORRIGÉE
  const handleUpdateStatus = async (reservationId, newStatus) => {
    try {
      const accessToken = localStorage.getItem('token');
      if (!accessToken) {
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        return;
      }

      // Utilise l'URL complète
      const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/update_status/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ statut: newStatus })
      });

      if (response.status === 401) {
        localStorage.clear();
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la mise à jour');
      }

      showNotification('Statut mis à jour avec succès', 'success');
      fetchReservations();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Fonction pour supprimer une réservation - CORRIGÉE
  const handleDeleteReservation = async (reservationId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) {
      return;
    }

    try {
      const accessToken = localStorage.getItem('token');
      if (!accessToken) {
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        return;
      }

      // Utilise l'URL complète
      const response = await fetch(`${API_BASE_URL}/api/reservations/${reservationId}/`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      });

      if (response.status === 401) {
        localStorage.clear();
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      showNotification('Réservation supprimée avec succès', 'success');
      fetchReservations();
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  // Fonction pour ouvrir le modal de modification
  const openEditModal = (reservation) => {
    setSelectedReservation(reservation);
    setEditData({
      date_debut: reservation.date_debut ? reservation.date_debut.split('T')[0] : '',
      date_fin: reservation.date_fin ? reservation.date_fin.split('T')[0] : '',
      commentaires: reservation.commentaires || '',
      assurance_complete: reservation.assurance_complete || false,
      conducteur_supplementaire: reservation.conducteur_supplementaire || false,
      gps: reservation.gps || false,
      siege_enfant: reservation.siege_enfant || false
    });
    setShowEditModal(true);
  };

  // Fonction pour afficher les notifications
  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Fonction pour formater les dates
  const formatDate = (dateString) => {
    try {
      return format(parseISO(dateString), 'dd MMM yyyy', { locale: fr });
    } catch {
      return 'Date invalide';
    }
  };

  // Calcul de la pagination - SÉCURISÉ
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  
  // S'assurer que filteredReservations est un tableau avant d'utiliser slice
  const safeFilteredReservations = Array.isArray(filteredReservations) ? filteredReservations : [];
  const currentReservations = safeFilteredReservations.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(safeFilteredReservations.length / itemsPerPage);

  return (
    <div className="reservation-container reservation-visible">
      {/* Background */}
      <div className="reservation-background">
        <div className="reservation-background-shapes">
          <div className="reservation-shape reservation-shape-1"></div>
          <div className="reservation-shape reservation-shape-2"></div>
          <div className="reservation-shape reservation-shape-3"></div>
        </div>
      </div>

      <div className="reservation-layout-fullwidth">
        {/* Header */}
        <header className="reservation-header">
          <div className="reservation-header-content">
            <h1 className="reservation-content-title">
              <i className="fas fa-calendar-check"></i>
              Mes Réservations
            </h1>
            <p className="reservation-content-subtitle">
              Gérez vos réservations de véhicules
            </p>
          </div>
          
          <div className="reservation-user-info-compact">
            <div className="reservation-user-avatar-small">
              {user?.nom ? user.nom.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="reservation-stats-compact">
              <div className="reservation-stat-compact">
                <i className="fas fa-car"></i>
                <span>{safeFilteredReservations.length}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="reservation-main-fullwidth">
          {/* Search and Filters Card */}
          <div className="reservation-card reservation-search-card">
            <div className="reservation-search-controls">
              <div className="reservation-search-bar">
                <div className="reservation-input-container">
                  <i className="fas fa-search reservation-input-icon"></i>
                  <input
                    type="text"
                    placeholder="Rechercher par véhicule, client..."
                    className="reservation-search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="reservation-controls">
                {/* NOUVEAUX BOUTONS DE VUE MODERNES */}
                <div className="reservation-view-controls">
                  <button
                    className={`reservation-view-btn-modern ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Vue grille"
                  >
                    <i className="fas fa-th"></i>
                  </button>
                  <button
                    className={`reservation-view-btn-modern ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Vue liste"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
                
                {/* NOUVEAU BOUTON DE FILTRE MODERNE */}
                <button
                  className={`reservation-filter-modern ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <i className="fas fa-filter"></i>
                  Filtres
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="reservation-filters-container">
                <div className="reservation-form-grid">
                  <div className="reservation-form-group">
                    <label className="reservation-form-label">
                      <i className="fas fa-info-circle reservation-label-icon"></i>
                      Statut
                    </label>
                    <select
                      className="reservation-sort-select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="reservation-filter-actions">
                  {/* NOUVEAU BOUTON NÉON */}
                  <button
                    className="reservation-btn-neon"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                    }}
                  >
                    <i className="fas fa-times"></i>
                    <span>Réinitialiser</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Results Header */}
          <div className="reservation-results-header">
            <div className="reservation-results-info">
              {safeFilteredReservations.length} réservation{safeFilteredReservations.length !== 1 ? 's' : ''} trouvée{safeFilteredReservations.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="reservation-loading-state">
              <div className="reservation-loading-spinner">
                <div className="reservation-spinner-car">🚗</div>
                <div className="reservation-spinner-text">Chargement des réservations...</div>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="reservation-error-state">
              <div className="error-icon">⚠️</div>
              <h2>Erreur de chargement</h2>
              <p>{error}</p>
              <div className="error-actions">
                <button
                  className="reservation-btn-neon reservation-btn-pulse"
                  onClick={fetchReservations}
                >
                  <i className="fas fa-redo"></i>
                  <span>Réessayer</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && safeFilteredReservations.length === 0 && (
            <div className="reservation-no-reservations">
              <div className="reservation-no-reservations-icon">📅</div>
              <h3 className="reservation-no-reservations-title">Aucune réservation trouvée</h3>
              <p className="reservation-no-reservations-text">
                {safeFilteredReservations.length === 0 && !searchTerm && !statusFilter
                  ? 'Vous n\'avez pas encore de réservations'
                  : 'Essayez de modifier vos critères de recherche'
                }
              </p>
              {(searchTerm || statusFilter) && (
                <button
                  className="reservation-btn-liquid"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('');
                  }}
                >
                  <span>
                    <i className="fas fa-times"></i>
                    Effacer les filtres
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Reservations Grid */}
          {!loading && !error && safeFilteredReservations.length > 0 && (
            <>
              <div className={`reservation-reservations-grid ${viewMode === 'list' ? 'reservation-list-view' : ''}`}>
                {currentReservations.map(reservation => (
                  <div key={reservation.id} className="reservation-reservation-card">
                    {/* NOUVEAU HEADER SANS ID */}
                    <div className="reservation-card-header-new">
                      <div className="reservation-vehicle-badge">
                        <i className="fas fa-car"></i>
                        {reservation.vehicule_display?.marque} {reservation.vehicule_display?.modele}
                      </div>
                      <div className="reservation-reservation-badges">
                        <span className={`status-badge status-${reservation.statut}`}>
                          {statusOptions.find(s => s.value === reservation.statut)?.label || reservation.statut}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="reservation-reservation-content">
                      {/* Vehicle Info */}
                      <div className="reservation-vehicle-info">
                        <div className="reservation-vehicle-type">
                          <i className="fas fa-car"></i>
                          {reservation.vehicule_display?.type_vehicule || 'Véhicule'}
                        </div>
                      </div>

                      {/* Client Info */}
                      <div className="reservation-client-info">
                        <div className="reservation-client-name">
                          <i className="fas fa-user"></i>
                          {reservation.user?.nom || 'Client inconnu'}
                        </div>
                        <div className="reservation-client-email">
                          <i className="fas fa-envelope"></i>
                          {reservation.user?.email || 'Email non disponible'}
                        </div>
                      </div>

                      {/* Dates */}
                      <div className="reservation-dates-info">
                        <div className="reservation-date-item">
                          <i className="fas fa-calendar-plus"></i>
                          Du {formatDate(reservation.date_debut)}
                        </div>
                        <div className="reservation-date-item">
                          <i className="fas fa-calendar-minus"></i>
                          Au {formatDate(reservation.date_fin)}
                        </div>
                      </div>

                      {/* Options */}
                      <div className="reservation-options-info">
                        {[
                          reservation.assurance_complete && { icon: 'shield-alt', label: 'Assurance complète' },
                          reservation.conducteur_supplementaire && { icon: 'user-plus', label: 'Conducteur supp.' },
                          reservation.gps && { icon: 'map-marked-alt', label: 'GPS' },
                          reservation.siege_enfant && { icon: 'baby', label: 'Siège enfant' }
                        ].filter(Boolean).map((option, index) => (
                          <div key={index} className="reservation-option-badge">
                            <i className={`fas fa-${option.icon}`}></i>
                            {option.label}
                          </div>
                        ))}
                        {![reservation.assurance_complete, reservation.conducteur_supplementaire, reservation.gps, reservation.siege_enfant].some(Boolean) && (
                          <div className="reservation-no-options">Aucune option</div>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="reservation-reservation-footer">
                      <div className="reservation-reservation-price">
                        <span className="reservation-price-amount">
                          {reservation.prix_total}€
                        </span>
                        <span className="reservation-price-period">total</span>
                      </div>
                      
                      {/* NOUVELLES ACTIONS MODERNES */}
                      <div className="reservation-reservation-actions">
                        <button
                          className="reservation-action-btn-modern reservation-view-action"
                          onClick={() => {
                            setSelectedReservation(reservation);
                            setShowDetailsModal(true);
                          }}
                          title="Voir les détails"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        
                        {reservation.statut === 'en_attente' && (
                          <>
                            <button
                              className="reservation-status-action-modern reservation-confirm-action"
                              onClick={() => handleUpdateStatus(reservation.id, 'confirmee')}
                            >
                              <i className="fas fa-check"></i>
                              Confirmer
                            </button>
                            <button
                              className="reservation-status-action-modern reservation-cancel-action"
                              onClick={() => handleUpdateStatus(reservation.id, 'annulee')}
                            >
                              <i className="fas fa-times"></i>
                              Annuler
                            </button>
                          </>
                        )}
                        
                        {reservation.statut === 'confirmee' && (
                          <button
                            className="reservation-status-action-modern reservation-complete-action"
                            onClick={() => handleUpdateStatus(reservation.id, 'terminee')}
                          >
                            <i className="fas fa-flag-checkered"></i>
                            Terminer
                          </button>
                        )}
                        
                        <button
                          className="reservation-action-btn-modern reservation-edit-action"
                          onClick={() => openEditModal(reservation)}
                          title="Modifier"
                        >
                          <i className="fas fa-edit"></i>
                        </button>

                        <button
                          className="reservation-action-btn-modern reservation-delete-action"
                          onClick={() => handleDeleteReservation(reservation.id)}
                          title="Supprimer"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* PAGINATION MODERNE */}
              {totalPages > 1 && (
                <div className="reservation-pagination-modern">
                  <button
                    className="reservation-nav-btn-modern"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <i className="fas fa-chevron-left"></i>
                    Précédent
                  </button>
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    if (
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={pageNumber}
                          className={`reservation-page-btn-modern ${currentPage === pageNumber ? 'active' : ''}`}
                          onClick={() => setCurrentPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return <span key={pageNumber} style={{ color: 'var(--text-secondary)' }}>...</span>;
                    }
                    return null;
                  })}
                  
                  <button
                    className="reservation-nav-btn-modern"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    Suivant
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </main>

        {/* Details Modal */}
        {showDetailsModal && selectedReservation && (
          <div className="reservation-modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="reservation-modal-content" onClick={e => e.stopPropagation()}>
              <div className="reservation-modal-header">
                <h2 className="reservation-modal-title">
                  Détails de la réservation
                </h2>
                {/* NOUVEAU BOUTON DE FERMETURE MODERNE */}
                <button
                  className="reservation-close-modern"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="reservation-modal-body">
                <div className="reservation-vehicle-info-modal">
                  <h4>Informations du véhicule</h4>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Véhicule:</span>
                    <span className="reservation-info-value">
                      {selectedReservation.vehicule_display?.marque} {selectedReservation.vehicule_display?.modele}
                    </span>
                  </div>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Type:</span>
                    <span className="reservation-info-value">
                      {selectedReservation.vehicule_display?.type_vehicule || 'Non spécifié'}
                    </span>
                  </div>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Client:</span>
                    <span className="reservation-info-value">
                      {selectedReservation.user?.nom || 'Inconnu'}
                    </span>
                  </div>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Email:</span>
                    <span className="reservation-info-value">
                      {selectedReservation.user?.email || 'Non disponible'}
                    </span>
                  </div>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Période:</span>
                    <span className="reservation-info-value">
                      Du {formatDate(selectedReservation.date_debut)} au {formatDate(selectedReservation.date_fin)}
                    </span>
                  </div>
                  <div className="reservation-info-item">
                    <span className="reservation-info-label">Statut:</span>
                    <span className="reservation-info-value">
                      <span className={`status-badge status-${selectedReservation.statut}`}>
                        {statusOptions.find(s => s.value === selectedReservation.statut)?.label || selectedReservation.statut}
                      </span>
                    </span>
                  </div>
                </div>

                {selectedReservation.commentaires && (
                  <div className="reservation-vehicle-info-modal">
                    <h4>Commentaires</h4>
                    <p>{selectedReservation.commentaires}</p>
                  </div>
                )}

                <div className="reservation-options-section">
                  <h4>Options sélectionnées</h4>
                  <div className="reservation-options-display">
                    {[
                      selectedReservation.assurance_complete && { icon: 'shield-alt', label: 'Assurance complète' },
                      selectedReservation.conducteur_supplementaire && { icon: 'user-plus', label: 'Conducteur supplémentaire' },
                      selectedReservation.gps && { icon: 'map-marked-alt', label: 'GPS' },
                      selectedReservation.siege_enfant && { icon: 'baby', label: 'Siège enfant' }
                    ].filter(Boolean).map((option, index) => (
                      <div key={index} className="reservation-option-badge">
                        <i className={`fas fa-${option.icon}`}></i>
                        {option.label}
                      </div>
                    ))}
                    {![selectedReservation.assurance_complete, selectedReservation.conducteur_supplementaire, selectedReservation.gps, selectedReservation.siege_enfant].some(Boolean) && (
                      <div className="reservation-no-options">Aucune option sélectionnée</div>
                    )}
                  </div>
                </div>

                <div className="reservation-price-summary">
                  <h4>Résumé des prix</h4>
                  <div className="reservation-price-breakdown">
                    <div className="reservation-price-item">
                      <span>Prix de base:</span>
                      <span>{selectedReservation.prix_base || 'N/A'}€</span>
                    </div>
                    <div className="reservation-price-item">
                      <span>Options:</span>
                      <span>{(selectedReservation.prix_total - (selectedReservation.prix_base || 0)) || 0}€</span>
                    </div>
                    <div className="reservation-price-item" style={{ fontWeight: 'bold', borderTop: '2px solid var(--primary-blue)' }}>
                      <span>Total:</span>
                      <span>{selectedReservation.prix_total}€</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="reservation-modal-footer">
                {/* NOUVEAUX BOUTONS DE MODAL */}
                <button
                  className="reservation-btn-neon"
                  onClick={() => setShowDetailsModal(false)}
                >
                  <i className="fas fa-times"></i>
                  <span>Fermer</span>
                </button>
                <button
                  className="reservation-btn-liquid"
                  onClick={() => {
                    setShowDetailsModal(false);
                    openEditModal(selectedReservation);
                  }}
                >
                  <span>
                    <i className="fas fa-edit"></i>
                    Modifier
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedReservation && (
          <div className="reservation-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="reservation-modal-content" onClick={e => e.stopPropagation()}>
              <div className="reservation-modal-header">
                <h2 className="reservation-modal-title">
                  Modifier la réservation
                </h2>
                <button
                  className="reservation-close-modern"
                  onClick={() => setShowEditModal(false)}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <form onSubmit={handleEditReservation}>
                <div className="reservation-modal-body">
                  <div className="reservation-form-grid">
                    <div className="reservation-form-group">
                      <label className="reservation-form-label">
                        <i className="fas fa-calendar-plus reservation-label-icon"></i>
                        Date de début
                      </label>
                      <input
                        type="date"
                        className="reservation-input"
                        value={editData.date_debut}
                        onChange={(e) => setEditData({ ...editData, date_debut: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="reservation-form-group">
                      <label className="reservation-form-label">
                        <i className="fas fa-calendar-minus reservation-label-icon"></i>
                        Date de fin
                      </label>
                      <input
                        type="date"
                        className="reservation-input"
                        value={editData.date_fin}
                        onChange={(e) => setEditData({ ...editData, date_fin: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="reservation-form-group">
                    <label className="reservation-form-label">
                      <i className="fas fa-comment reservation-label-icon"></i>
                      Commentaires
                    </label>
                    <textarea
                      className="reservation-input"
                      rows="3"
                      value={editData.commentaires}
                      onChange={(e) => setEditData({ ...editData, commentaires: e.target.value })}
                      placeholder="Commentaires additionnels..."
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                  
                  <div className="reservation-form-group">
                    <label className="reservation-form-label">
                      <i className="fas fa-plus-circle reservation-label-icon"></i>
                      Options
                    </label>
                    <div className="reservation-checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={editData.assurance_complete}
                          onChange={(e) => setEditData({ ...editData, assurance_complete: e.target.checked })}
                        />
                        <i className="fas fa-shield-alt"></i>
                        Assurance complète
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editData.conducteur_supplementaire}
                          onChange={(e) => setEditData({ ...editData, conducteur_supplementaire: e.target.checked })}
                        />
                        <i className="fas fa-user-plus"></i>
                        Conducteur supplémentaire
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editData.gps}
                          onChange={(e) => setEditData({ ...editData, gps: e.target.checked })}
                        />
                        <i className="fas fa-map-marked-alt"></i>
                        GPS
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={editData.siege_enfant}
                          onChange={(e) => setEditData({ ...editData, siege_enfant: e.target.checked })}
                        />
                        <i className="fas fa-baby"></i>
                        Siège enfant
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="reservation-modal-footer">
                  <button
                    type="button"
                    className="reservation-btn-neon"
                    onClick={() => setShowEditModal(false)}
                  >
                    <i className="fas fa-times"></i>
                    <span>Annuler</span>
                  </button>
                  <button
                    type="submit"
                    className="reservation-btn-liquid reservation-btn-pulse"
                  >
                    <span>
                      <i className="fas fa-save"></i>
                      Enregistrer
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="reservation-footer">
          <div className="reservation-footer-content">
            <div className="reservation-footer-links">
              <a href="#" className="reservation-footer-link">Aide</a>
              <a href="#" className="reservation-footer-link">Contact</a>
              <a href="#" className="reservation-footer-link">Mentions légales</a>
            </div>
            <p>&copy; 2024 Location de Véhicules. Tous droits réservés.</p>
          </div>
        </footer>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="reservation-success-notification">
          <div className={`reservation-alert reservation-alert-${notification.type}`}>
            <div>
              <i className={`fas ${notification.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} reservation-success-icon`}></i>
              <span className="reservation-success-text">{notification.message}</span>
            </div>
            <button
              className="reservation-alert-close"
              onClick={() => setNotification(null)}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationList;
