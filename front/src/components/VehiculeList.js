import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import debounce from 'lodash/debounce';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './VehiculeList.css';

// Configuration des images statiques par marque (amélioré avec fallback)
const CAR_IMAGES = {
  toyota: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  peugeot: 'https://images.unsplash.com/photo-1600501667514-3c0b0a0c7d5c?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  renault: 'https://images.unsplash.com/photo-1580273916550-e4bd757e8f4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  volkswagen: 'https://images.unsplash.com/photo-1554224712-d8560f709cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  bmw: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  mercedes: 'https://images.unsplash.com/photo-1618843479313-40f1970e3868?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  audi: 'https://images.unsplash.com/photo-1616788494707-75d33d9e4e4a?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  tesla: 'https://images.unsplash.com/photo-1560915479-3c0ca575e3b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  nissan: 'https://images.unsplash.com/photo-1609521005188-233b5c464c6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  ford: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80',
  default: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80'
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const VehiculeList = ({ token, user, onLogout }) => {
  const navigate = useNavigate();

  // États principaux
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // États des filtres
  const [filters, setFilters] = useState({
    marque: '',
    carburant: '',
    prix_min: '',
    prix_max: '',
    places_min: '',
    localisation: '',
    statut: '',
    transmission: ''
  });

  // États des modales et UI
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('prix_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorites')) || []);
  const [currentPage, setCurrentPage] = useState(1);
  const [vehiclesPerPage] = useState(12);
  const [showVehicleDetails, setShowVehicleDetails] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Données de réservation
  const [reservationData, setReservationData] = useState({
    date_debut: '',
    date_fin: '',
    notes: '',
    assurance_complete: false,
    conducteur_supplementaire: false,
    gps: false,
    siege_enfant: false
  });

  // Persistance des favoris
  useEffect(() => {
    localStorage.setItem('favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Fonction pour obtenir l'image de la voiture
  const getStaticCarImage = useCallback((marque = '') => {
    const marqueLower = marque.toLowerCase();
    return CAR_IMAGES[marqueLower] || CAR_IMAGES.default;
  }, []);

  // Recherche avec debounce
  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  // Récupération des véhicules
  const fetchVehicles = useCallback(async () => {
    const controller = new AbortController();
    try {
      setLoading(true);
      setError(null);

      let url = `${API_BASE_URL}/api/vehicules/`;
      const params = [];

      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (filters.marque) params.push(`marque=${encodeURIComponent(filters.marque)}`);
      if (filters.carburant) params.push(`carburant=${filters.carburant}`);
      if (filters.localisation) params.push(`localisation=${encodeURIComponent(filters.localisation)}`);
      if (filters.statut) params.push(`statut=${filters.statut}`);
      if (filters.prix_min) params.push(`prix_min=${filters.prix_min}`);
      if (filters.prix_max) params.push(`prix_max=${filters.prix_max}`);
      if (filters.places_min) params.push(`places_min=${filters.places_min}`);
      if (filters.transmission) params.push(`transmission=${filters.transmission}`);

      if (params.length) url += `?${params.join('&')}`;

      const response = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000,
        signal: controller.signal
      });

      let vehiclesData = Array.isArray(response.data) ? response.data : response.data.results || [];
      vehiclesData = vehiclesData.map(vehicle => ({
        ...vehicle,
        image: getStaticCarImage(vehicle.marque)
      }));

      setVehicles(vehiclesData);
      setFilteredVehicles(vehiclesData);

    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error('Error fetching vehicles:', err);
        handleApiError(err);
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [searchTerm, filters, token, getStaticCarImage]);

  // Gestion des erreurs API
  const handleApiError = (err) => {
    let errorMsg = 'Erreur lors du chargement des véhicules';
    
    if (err.code === 'ECONNABORTED') {
      errorMsg = 'Le serveur met trop de temps à répondre. Veuillez vérifier votre connexion.';
    } else if (!err.response) {
      errorMsg = 'Impossible de se connecter au serveur.';
    } else {
      const status = err.response?.status;
      switch (status) {
        case 401:
          errorMsg = 'Session expirée. Veuillez vous reconnecter.';
          onLogout();
          navigate('/login');
          break;
        case 403:
          errorMsg = 'Accès non autorisé.';
          break;
        case 500:
          errorMsg = 'Erreur interne du serveur.';
          break;
        case 404:
          errorMsg = 'Service indisponible.';
          break;
        default:
          break;
      }
    }
    
    setError(errorMsg);
    setVehicles([]);
    setFilteredVehicles([]);
  };

  // Tri des véhicules
  const sortVehicles = useCallback((vehiclesList, sortOption) => {
    if (!Array.isArray(vehiclesList)) return [];
    
    return [...vehiclesList].sort((a, b) => {
      switch (sortOption) {
        case 'prix_asc':
          return (a.prix_par_jour || 0) - (b.prix_par_jour || 0);
        case 'prix_desc':
          return (b.prix_par_jour || 0) - (a.prix_par_jour || 0);
        case 'marque':
          return (a.marque || '').localeCompare(b.marque || '');
        case 'carburant':
          return (a.carburant || '').localeCompare(b.carburant || '');
        case 'places':
          return (b.nombre_places || 0) - (a.nombre_places || 0);
        case 'recent':
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        default:
          return 0;
      }
    });
  }, []);

  // Véhicules triés et paginés
  const sortedVehicles = useMemo(() => 
    sortVehicles(filteredVehicles, sortBy), 
    [filteredVehicles, sortBy, sortVehicles]
  );

  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * vehiclesPerPage;
    return sortedVehicles.slice(startIndex, startIndex + vehiclesPerPage);
  }, [sortedVehicles, currentPage, vehiclesPerPage]);

  const totalPages = Math.ceil(sortedVehicles.length / vehiclesPerPage);

  // Gestion des filtres
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      marque: '',
      carburant: '',
      prix_min: '',
      prix_max: '',
      places_min: '',
      localisation: '',
      statut: '',
      transmission: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
    
    const searchInput = document.querySelector('.auto-search-input-hero');
    if (searchInput) searchInput.value = '';
  };

  // Gestion de la recherche
  const handleSearchChange = (event) => {
    const value = event.target.value;
    debouncedSearch(value);
  };

  // Gestion des favoris
  const toggleFavorite = (vehicleId) => {
    setFavorites(prev => 
      prev.includes(vehicleId) 
        ? prev.filter(id => id !== vehicleId)
        : [...prev, vehicleId]
    );
  };

  // Gestion des modales
  const openReservationModal = (vehicle) => {
    if (!token || !user?.id) {
      setError('Vous devez être connecté pour réserver un véhicule.');
      navigate('/login');
      return;
    }
    setSelectedVehicle(vehicle);
    setShowReservationModal(true);
  };

  const closeReservationModal = () => {
    setShowReservationModal(false);
    setSelectedVehicle(null);
    setReservationData({
      date_debut: '',
      date_fin: '',
      notes: '',
      assurance_complete: false,
      conducteur_supplementaire: false,
      gps: false,
      siege_enfant: false
    });
  };

  const openVehicleDetails = (vehicle) => {
    setShowVehicleDetails(vehicle);
  };

  const closeVehicleDetails = () => {
    setShowVehicleDetails(null);
  };

  // Calcul du prix total
  const calculateTotalPrice = () => {
    if (!selectedVehicle || !reservationData.date_debut || !reservationData.date_fin) return 0;
    
    const startDate = new Date(reservationData.date_debut);
    const endDate = new Date(reservationData.date_fin);
    const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    
    let total = days * (selectedVehicle.prix_par_jour || 0);
    
    if (reservationData.assurance_complete) total += 20 * days;
    if (reservationData.conducteur_supplementaire) total += 10 * days;
    if (reservationData.gps) total += 5 * days;
    if (reservationData.siege_enfant) total += 8 * days;
    
    return total;
  };

  // Validation des données de réservation
  const validateReservationData = (data, vehicle) => {
    const errors = [];
    
    if (!data.date_debut) errors.push('Date de début requise');
    if (!data.date_fin) errors.push('Date de fin requise');
    if (!vehicle?.id) errors.push('Véhicule requis');
    if (vehicle?.statut !== 'disponible') errors.push('Le véhicule n\'est pas disponible');
    
    const startDate = new Date(data.date_debut);
    const endDate = new Date(data.date_fin);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      errors.push('Dates invalides');
    } else {
      if (startDate < now) errors.push('La date de début ne peut pas être dans le passé');
      if (startDate >= endDate) errors.push('La date de fin doit être après la date de début');
      if (Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) > 30) {
        errors.push('La réservation ne peut pas dépasser 30 jours');
      }
    }
    
    return errors;
  };

  // Gestion de la réservation
  const handleReservation = async () => {
    if (!selectedVehicle?.id) {
      setError('Aucun véhicule sélectionné');
      return;
    }

    if (!token || !user?.id) {
      setError('Vous devez être connecté pour effectuer une réservation');
      onLogout();
      navigate('/login');
      return;
    }

    const errors = validateReservationData(reservationData, selectedVehicle);
    if (errors.length > 0) {
      setError(errors.join('; '));
      return;
    }

    try {
      setReservationLoading(true);
      setError(null);

      const response = await axios.post(
        `${API_BASE_URL}/api/reservations/`,
        {
          vehicule_id: String(selectedVehicle.id),
          date_debut: new Date(reservationData.date_debut).toISOString(),
          date_fin: new Date(reservationData.date_fin).toISOString(),
          commentaires: reservationData.notes || '',
          assurance_complete: reservationData.assurance_complete,
          conducteur_supplementaire: reservationData.conducteur_supplementaire,
          gps: reservationData.gps,
          siege_enfant: reservationData.siege_enfant
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      setSuccess('Réservation effectuée avec succès !');
      closeReservationModal();
      await fetchVehicles();
      showSuccessNotification('Réservation confirmée !');

    } catch (err) {
      console.error('Error during reservation:', err);
      handleReservationError(err);
    } finally {
      setReservationLoading(false);
    }
  };

  // Gestion des erreurs de réservation
  const handleReservationError = (err) => {
    let errorMessage = 'Erreur lors de la réservation';
    
    if (err.response) {
      const { status, data } = err.response;
      switch (status) {
        case 401:
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          onLogout();
          navigate('/login');
          break;
        case 403:
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer cette action.';
          break;
        case 400:
          errorMessage = data.non_field_errors?.[0] || 
                         data.vehicule_id?.[0] || 
                         data.date_debut?.[0] || 
                         data.date_fin?.[0] || 
                         Object.values(data)[0]?.[0] || 
                         'Données invalides';
          break;
        case 404:
          errorMessage = 'Véhicule non trouvé.';
          break;
        case 500:
          errorMessage = 'Erreur serveur.';
          break;
        default:
          errorMessage = data.detail || 'Erreur inconnue';
      }
    } else {
      errorMessage = 'Impossible de contacter le serveur.';
    }
    
    setError(errorMessage);
  };

  // Notification de succès
  const showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'auto-success-notification show';
    notification.innerHTML = `
      <div class="auto-notification-content">
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  // Gestion du scroll
  const handleScroll = useCallback(() => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setIsScrolled(scrollTop > 100);
    setShowScrollTop(scrollTop > 500);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gestion de la pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Effects
  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Composant Skeleton pour loading
  const SkeletonCard = () => (
    <div className="auto-vehicle-card skeleton" aria-hidden="true">
      <div className="auto-vehicle-image skeleton-img"></div>
      <div className="auto-vehicle-content">
        <h3 className="skeleton-text"></h3>
        <div className="auto-vehicle-specs">
          <div className="skeleton-spec"></div>
          <div className="skeleton-spec"></div>
          <div className="skeleton-spec"></div>
          <div className="skeleton-spec"></div>
        </div>
        <div className="auto-vehicle-footer skeleton-footer"></div>
      </div>
    </div>
  );

  return (
    <div className="auto-app-container">
      {/* Header */}
      <header className={`auto-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="auto-header-container">
          <div className="auto-logo">
            <h1>AutoRent</h1>
          </div>
          
          <nav className={`auto-nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
            <a href="#vehicles" className="auto-nav-link">Véhicules</a>
            <a href="#services" className="auto-nav-link">Services</a>
            <a href="#about" className="auto-nav-link">À propos</a>
            <a href="#contact" className="auto-nav-link">Contact</a>
          </nav>

          <div className="auto-user-section">
            {user ? (
              <div className="auto-user-avatar">
                {user.first_name?.[0] || user.username?.[0] || 'U'}
              </div>
            ) : (
              <button className="auto-btn auto-btn-primary" onClick={() => navigate('/login')}>
                Connexion
              </button>
            )}
            
            <button 
              className="auto-mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section avec recherche améliorée */}
      <section className="auto-hero">
        <div className="auto-hero-bg"></div>
        <div className="auto-hero-content">
          <div className="auto-hero-text">
            <h1 className="auto-hero-title">
              Trouvez votre <span>véhicule parfait</span>
            </h1>
            <p className="auto-hero-subtitle">
              Une expérience de location simple et efficace
            </p>
            
            <div className="auto-search-bar-hero">
              <i className="fas fa-search"></i>
              <input
                type="text"
                className="auto-search-input-hero"
                placeholder="Rechercher par marque, modèle ou localisation..."
                onChange={handleSearchChange}
                aria-label="Recherche de véhicules"
              />
              <button className="auto-btn auto-btn-primary" aria-label="Rechercher">
                <i className="fas fa-search"></i>
                Rechercher
              </button>
            </div>
          </div>
          
          <div className="auto-hero-visual">
            <i className="fas fa-car" style={{ fontSize: '6rem', color: 'rgba(255,255,255,0.8)' }}></i>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="auto-features">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Nos Services</h2>
            <p className="auto-section-subtitle">
              Découvrez nos services premium et notre engagement envers votre satisfaction
            </p>
          </div>
          
          <div className="auto-features-grid">
            <div className="auto-feature-card">
              <div className="auto-feature-icon">
                <i className="fas fa-car"></i>
              </div>
              <h3>Véhicules Premium</h3>
              <p>Véhicules modernes et bien entretenus pour votre confort et sécurité</p>
            </div>
            
            <div className="auto-feature-card">
              <div className="auto-feature-icon">
                <i className="fas fa-shield-alt"></i>
              </div>
              <h3>Réservation Sécurisée</h3>
              <p>Réservations sécurisées et paiements transparents</p>
            </div>
            
            <div className="auto-feature-card">
              <div className="auto-feature-icon">
                <i className="fas fa-headset"></i>
              </div>
              <h3>Support 24/7</h3>
              <p>Service client disponible à tout moment pour vous assister</p>
            </div>
            
            <div className="auto-feature-card">
              <div className="auto-feature-icon">
                <i className="fas fa-history"></i>
              </div>
              <h3>Historique</h3>
              <p>Historique des réservations accessible à tout moment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicles Section */}
      <section className="auto-vehicles" id="vehicles">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Nos Véhicules</h2>
          </div>

          {/* Messages d'erreur et de succès */}
          {error && (
            <div className="auto-error-message" role="alert">
              <i className="fas fa-exclamation-triangle"></i>
              {error}
              <button onClick={() => setError(null)} aria-label="Fermer l'erreur">
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}

          {success && (
            <div className="auto-success-message" role="alert">
              <i className="fas fa-check-circle"></i>
              {success}
            </div>
          )}

          {/* Filtres et tri */}
          <div className="auto-filters-section">
            <div className="auto-filters-header">
              <h3>Filtres de recherche</h3>
              <div className="auto-filters-actions">
                <button 
                  className="auto-btn auto-btn-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-expanded={showFilters}
                >
                  <i className="fas fa-filter"></i>
                  {showFilters ? 'Masquer' : 'Afficher'} les filtres
                </button>
                <button 
                  className="auto-btn auto-btn-secondary"
                  onClick={resetFilters}
                >
                  <i className="fas fa-undo"></i>
                  Réinitialiser
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="auto-filters-grid">
                <div className="auto-filter-group">
                  <label htmlFor="marque">Marque</label>
                  <select 
                    id="marque"
                    value={filters.marque} 
                    onChange={(e) => handleFilterChange('marque', e.target.value)}
                  >
                    <option value="">Toutes les marques</option>
                    <option value="Toyota">Toyota</option>
                    <option value="Peugeot">Peugeot</option>
                    <option value="Renault">Renault</option>
                    <option value="Volkswagen">Volkswagen</option>
                    <option value="BMW">BMW</option>
                    <option value="Mercedes">Mercedes</option>
                    <option value="Audi">Audi</option>
                    <option value="Tesla">Tesla</option>
                    <option value="Nissan">Nissan</option>
                    <option value="Ford">Ford</option>
                  </select>
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="carburant">Carburant</label>
                  <select 
                    id="carburant"
                    value={filters.carburant} 
                    onChange={(e) => handleFilterChange('carburant', e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="essence">Essence</option>
                    <option value="diesel">Diesel</option>
                    <option value="electrique">Électrique</option>
                    <option value="hybride">Hybride</option>
                  </select>
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="prix_min">Prix min (€/jour)</label>
                  <input
                    id="prix_min"
                    type="number"
                    value={filters.prix_min}
                    onChange={(e) => handleFilterChange('prix_min', e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="prix_max">Prix max (€/jour)</label>
                  <input
                    id="prix_max"
                    type="number"
                    value={filters.prix_max}
                    onChange={(e) => handleFilterChange('prix_max', e.target.value)}
                    placeholder="1000"
                    min="0"
                  />
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="places_min">Places minimum</label>
                  <select 
                    id="places_min"
                    value={filters.places_min} 
                    onChange={(e) => handleFilterChange('places_min', e.target.value)}
                  >
                    <option value="">Toutes</option>
                    <option value="2">2+</option>
                    <option value="4">4+</option>
                    <option value="5">5+</option>
                    <option value="7">7+</option>
                  </select>
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="transmission">Transmission</label>
                  <select 
                    id="transmission"
                    value={filters.transmission} 
                    onChange={(e) => handleFilterChange('transmission', e.target.value)}
                  >
                    <option value="">Toutes</option>
                    <option value="manuelle">Manuelle</option>
                    <option value="automatique">Automatique</option>
                  </select>
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="statut">Statut</label>
                  <select 
                    id="statut"
                    value={filters.statut} 
                    onChange={(e) => handleFilterChange('statut', e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="disponible">Disponible</option>
                    <option value="indisponible">Indisponible</option>
                  </select>
                </div>

                <div className="auto-filter-group">
                  <label htmlFor="localisation">Localisation</label>
                  <input
                    id="localisation"
                    type="text"
                    value={filters.localisation}
                    onChange={(e) => handleFilterChange('localisation', e.target.value)}
                    placeholder="Ville..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contrôles de tri et vue */}
          <div className="auto-sort-section">
            <div className="auto-sort-info">
              <span>{sortedVehicles.length} véhicule{sortedVehicles.length > 1 ? 's' : ''} trouvé{sortedVehicles.length > 1 ? 's' : ''}</span>
            </div>
            
            <div className="auto-sort-controls">
              <div className="auto-view-controls">
                <button 
                  className={`auto-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Vue grille"
                >
                  <i className="fas fa-th"></i>
                </button>
                <button 
                  className={`auto-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="Vue liste"
                >
                  <i className="fas fa-list"></i>
                </button>
              </div>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="auto-sort-select"
                aria-label="Trier par"
              >
                <option value="prix_asc">Prix croissant</option>
                <option value="prix_desc">Prix décroissant</option>
                <option value="marque">Marque A-Z</option>
                <option value="carburant">Type de carburant</option>
                <option value="places">Nombre de places</option>
                <option value="recent">Plus récents</option>
              </select>
            </div>
          </div>

          {/* États de chargement et d'erreur */}
          {!loading && error && (
            <div className="auto-error-state" role="alert">
              <i className="fas fa-exclamation-triangle"></i>
              <h2>Oups ! Une erreur s'est produite</h2>
              <p>{error}</p>
              <button className="auto-retry-btn" onClick={fetchVehicles}>
                <i className="fas fa-redo"></i>
                Réessayer
              </button>
              <div className="auto-error-help">
                <p>Essayez de modifier vos critères de recherche ou vos filtres</p>
              </div>
            </div>
          )}

          {/* Grille des véhicules */}
          {!loading && !error && (
            <>
              <div className={`auto-vehicles-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
                {paginatedVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="auto-vehicle-card">
                    <div className="auto-vehicle-image">
                      <img 
                        src={vehicle.image} 
                        alt={`${vehicle.marque} ${vehicle.modele}`}
                        onError={(e) => {
                          e.target.src = CAR_IMAGES.default;
                        }}
                      />
                      
                      <div className="auto-vehicle-overlay">
                        <button 
                          className={`auto-favorite-btn ${favorites.includes(vehicle.id) ? 'active' : ''}`}
                          onClick={() => toggleFavorite(vehicle.id)}
                          aria-label={favorites.includes(vehicle.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <i className={`fas fa-heart ${favorites.includes(vehicle.id) ? '' : 'far'}`}></i>
                        </button>
                        
                        <button 
                          className="auto-details-btn"
                          onClick={() => openVehicleDetails(vehicle)}
                          aria-label="Voir détails"
                        >
                          <i className="fas fa-info"></i>
                        </button>
                      </div>

                      <div className="auto-vehicle-badges">
                        <span className="fuel-badge">{vehicle.carburant}</span>
                        <span className={`status-badge ${vehicle.statut === 'disponible' ? 'available' : 'unavailable'}`}>
                          {vehicle.statut}
                        </span>
                      </div>
                    </div>

                    <div className="auto-vehicle-content">
                      <h3 className="auto-vehicle-title">
                        {vehicle.marque} {vehicle.modele}
                      </h3>

                      <div className="auto-vehicle-specs">
                        <div className="auto-spec-item">
                          <i className="fas fa-users"></i>
                          <span>{vehicle.nombre_places} places</span>
                        </div>
                        
                        <div className="auto-spec-item">
                          <i className="fas fa-gas-pump"></i>
                          <span>{vehicle.carburant}</span>
                        </div>
                        
                        <div className="auto-spec-item">
                          <i className="fas fa-cogs"></i>
                          <span>{vehicle.transmission || 'Manuelle'}</span>
                        </div>
                        
                        <div className="auto-spec-item">
                          <i className="fas fa-map-marker-alt"></i>
                          <span>{vehicle.localisation || 'Non spécifiée'}</span>
                        </div>
                      </div>

                      <div className="auto-vehicle-footer">
                        <div className="auto-vehicle-price">
                          <span className="auto-price-amount">{vehicle.prix_par_jour}€</span>
                          <span className="auto-price-period">/jour</span>
                        </div>
                        
                        <button 
                          className={`auto-btn auto-btn-primary ${vehicle.statut !== 'disponible' ? 'disabled' : ''}`}
                          onClick={() => openReservationModal(vehicle)}
                          disabled={vehicle.statut !== 'disponible'}
                          aria-label={vehicle.statut === 'disponible' ? 'Réserver' : 'Indisponible'}
                        >
                          <i className="fas fa-calendar-plus"></i>
                          {vehicle.statut === 'disponible' ? 'Réserver' : 'Indisponible'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="auto-pagination" role="navigation" aria-label="Pagination">
                  <button 
                    className="auto-pagination-btn"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                  >
                    <i className="fas fa-chevron-left"></i>
                    Précédent
                  </button>
                  
                  <div className="auto-pagination-numbers">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          className={`auto-pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                          onClick={() => handlePageChange(pageNum)}
                          aria-label={`Page ${pageNum}`}
                          aria-current={currentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button 
                    className="auto-pagination-btn"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                  >
                    Suivant
                    <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
              
              {paginatedVehicles.length === 0 && (
                <div className="auto-no-results">
                  <i className="fas fa-car"></i>
                  <h3>Aucun véhicule trouvé</h3>
                  <p>Essayez de modifier vos critères de recherche</p>
                </div>
              )}
            </>
          )}

          {/* Loading skeletons */}
          {loading && (
            <div className={`auto-vehicles-grid ${viewMode === 'list' ? 'list-view' : ''}`}>
              {Array.from({ length: vehiclesPerPage }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="auto-testimonials">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Ce que disent nos clients</h2>
          </div>
          
          <div className="auto-testimonials-grid">
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                </div>
                <p className="auto-testimonial-text">
                  "Service exceptionnel ! La réservation est rapide et sécurisée. Je recommande vivement cette plateforme."
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">M</div>
                <div>
                  <div className="auto-author-name">Marie Dubois</div>
                  <div className="auto-author-role">Cliente fidèle</div>
                </div>
              </div>
            </div>
            
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                </div>
                <p className="auto-testimonial-text">
                  "Excellente expérience avec des véhicules de qualité et un processus de paiement transparent."
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">P</div>
                <div>
                  <div className="auto-author-name">Pierre Martin</div>
                  <div className="auto-author-role">Professionnel</div>
                </div>
              </div>
            </div>
            
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                  <i className="fas fa-star" aria-hidden="true"></i>
                </div>
                <p className="auto-testimonial-text">
                  "La plateforme rend la location de voitures tellement simple et fiable ! Innovation remarquable."
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">S</div>
                <div>
                  <div className="auto-author-name">Sophie Laurent</div>
                  <div className="auto-author-role">Entrepreneuse</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="auto-cta">
        <div className="auto-cta-content">
          <h2 className="auto-cta-title">Prêt à partir ?</h2>
          <p className="auto-cta-subtitle">
            Rejoignez des milliers de clients satisfaits et découvrez une nouvelle façon de louer des véhicules.
          </p>
          <div className="auto-cta-buttons">
            <button className="auto-btn auto-btn-primary" onClick={() => navigate('/register')}>
              <i className="fas fa-user-plus"></i>
              Créer un compte
            </button>
            <button className="auto-btn auto-btn-secondary">
              <i className="fas fa-phone"></i>
              Nous contacter
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="auto-footer">
        <div className="auto-footer-content">
          <div className="auto-footer-section">
            <div className="auto-footer-logo">
              <h3>AutoRent</h3>
            </div>
            <p className="auto-footer-description">
              La plateforme de location de location de véhicules la plus fiable et innovante du marché.
            </p>
            <div className="auto-social-links">
              <a href="#" className="auto-social-link" aria-label="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="auto-social-link" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="auto-social-link" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="auto-social-link" aria-label="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
          
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Services</h4>
            <ul className="auto-footer-links">
              <li><a href="#" className="auto-footer-link">Location courte durée</a></li>
              <li><a href="#" className="auto-footer-link">Location longue durée</a></li>
              <li><a href="#" className="auto-footer-link">Véhicules de luxe</a></li>
              <li><a href="#" className="auto-footer-link">Assurance premium</a></li>
            </ul>
          </div>
          
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Support</h4>
            <ul className="auto-footer-links">
              <li><a href="#" className="auto-footer-link">Centre d'aide</a></li>
              <li><a href="#" className="auto-footer-link">FAQ</a></li>
              <li><a href="#" className="auto-footer-link">Nous contacter</a></li>
              <li><a href="#" className="auto-footer-link">Signaler un problème</a></li>
            </ul>
          </div>
          
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Contact</h4>
            <ul className="auto-footer-contact">
              <li>
                <i className="fas fa-phone"></i>
                <span>+33 1 23 45 67 89</span>
              </li>
              <li>
                <i className="fas fa-envelope"></i>
                <span>contact@autorent.fr</span>
              </li>
              <li>
                <i className="fas fa-map-marker-alt"></i>
                <span>123 Rue de la Location, Paris</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="auto-footer-bottom">
          <p>&copy; 2024 AutoRent. Tous droits réservés.</p>
          <div className="auto-footer-legal">
            <a href="#" className="auto-footer-link">Mentions légales</a>
            <a href="#" className="auto-footer-link">Politique de confidentialité</a>
            <a href="#" className="auto-footer-link">CGU</a>
          </div>
        </div>
      </footer>

      {/* Modal de réservation */}
      {showReservationModal && selectedVehicle && (
        <div className="auto-modal-overlay" onClick={closeReservationModal} role="presentation">
          <div className="auto-modal auto-modal-large" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="reservation-title">
            <div className="auto-modal-header">
              <h2 id="reservation-title">
                <i className="fas fa-calendar-plus"></i>
                Réserver ce véhicule
              </h2>
              <button className="auto-modal-close" onClick={closeReservationModal} aria-label="Fermer la modale">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="auto-modal-vehicle">
              <img src={selectedVehicle.image} alt={`${selectedVehicle.marque} ${selectedVehicle.modele}`} />
              <div>
                <h3>{selectedVehicle.marque} {selectedVehicle.modele}</h3>
                <p><strong>{selectedVehicle.prix_par_jour}€/jour</strong> • {selectedVehicle.carburant}</p>
                <span className={`auto-status-badge ${selectedVehicle.statut}`}>
                  {selectedVehicle.statut}
                </span>
              </div>
            </div>

            <form className="auto-modal-form" onSubmit={(e) => e.preventDefault()}>
              <div className="auto-form-row">
                <div className="auto-form-group">
                  <label htmlFor="date_debut">Date de début *</label>
                  <input
                    id="date_debut"
                    type="date"
                    value={reservationData.date_debut}
                    onChange={(e) => setReservationData(prev => ({ ...prev, date_debut: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div className="auto-form-group">
                  <label htmlFor="date_fin">Date de fin *</label>
                  <input
                    id="date_fin"
                    type="date"
                    value={reservationData.date_fin}
                    onChange={(e) => setReservationData(prev => ({ ...prev, date_fin: e.target.value }))}
                    min={reservationData.date_debut || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>

              <div className="auto-form-group">
                <label htmlFor="notes">Notes supplémentaires</label>
                <textarea
                  id="notes"
                  value={reservationData.notes}
                  onChange={(e) => setReservationData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Informations complémentaires..."
                  rows="3"
                />
              </div>

              <div className="auto-form-options">
                <h4>Options supplémentaires</h4>
                
                <label className="auto-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reservationData.assurance_complete}
                    onChange={(e) => setReservationData(prev => ({ ...prev, assurance_complete: e.target.checked }))}
                  />
                  <span>Assurance complète (+20€/jour)</span>
                </label>

                <label className="auto-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reservationData.conducteur_supplementaire}
                    onChange={(e) => setReservationData(prev => ({ ...prev, conducteur_supplementaire: e.target.checked }))}
                  />
                  <span>Conducteur supplémentaire (+10€/jour)</span>
                </label>

                <label className="auto-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reservationData.gps}
                    onChange={(e) => setReservationData(prev => ({ ...prev, gps: e.target.checked }))}
                  />
                  <span>GPS (+5€/jour)</span>
                </label>

                <label className="auto-checkbox-label">
                  <input
                    type="checkbox"
                    checked={reservationData.siege_enfant}
                    onChange={(e) => setReservationData(prev => ({ ...prev, siege_enfant: e.target.checked }))}
                  />
                  <span>Siège enfant (+8€/jour)</span>
                </label>
              </div>

              <div className="auto-total-price">
                <div>Prix total estimé</div>
                <div>{calculateTotalPrice()}€</div>
              </div>

              <div className="auto-modal-actions">
                <button
                  type="button"
                  className="auto-btn auto-btn-secondary"
                  onClick={closeReservationModal}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  className="auto-btn auto-btn-primary"
                  onClick={handleReservation}
                  disabled={reservationLoading}
                >
                  {reservationLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Traitement...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check"></i>
                      Confirmer la réservation
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de détails du véhicule */}
      {showVehicleDetails && (
        <div className="auto-modal-overlay" onClick={closeVehicleDetails} role="presentation">
          <div className="auto-modal auto-modal-large" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="details-title">
            <div className="auto-modal-header">
              <h2 id="details-title">
                <i className="fas fa-car"></i>
                Détails du véhicule
              </h2>
              <button className="auto-modal-close" onClick={closeVehicleDetails} aria-label="Fermer la modale">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <img 
              src={showVehicleDetails.image} 
              alt={`${showVehicleDetails.marque} ${showVehicleDetails.modele}`}
              className="auto-modal-vehicle-image"
            />

            <div className="auto-vehicle-details">
              <div className="auto-detail-item">
                <strong>Marque:</strong> {showVehicleDetails.marque}
              </div>
              <div className="auto-detail-item">
                <strong>Modèle:</strong> {showVehicleDetails.modele}
              </div>
              <div className="auto-detail-item">
                <strong>Immatriculation:</strong> {showVehicleDetails.immatriculation}
              </div>
              <div className="auto-detail-item">
                <strong>Année:</strong> {showVehicleDetails.annee || 'Non spécifiée'}
              </div>
              <div className="auto-detail-item">
                <strong>Carburant:</strong> {showVehicleDetails.carburant}
              </div>
              <div className="auto-detail-item">
                <strong>Transmission:</strong> {showVehicleDetails.transmission || 'Manuelle'}
              </div>
              <div className="auto-detail-item">
                <strong>Places:</strong> {showVehicleDetails.nombre_places}
              </div>
              <div className="auto-detail-item">
                <strong>Localisation:</strong> {showVehicleDetails.localisation || 'Non spécifiée'}
              </div>
              <div className="auto-detail-item">
                <strong>Prix:</strong> {showVehicleDetails.prix_par_jour}€/jour
              </div>
              <div className="auto-detail-item">
                <strong>Statut:</strong> 
                <span className={`auto-status-badge ${showVehicleDetails.statut === 'disponible' ? 'available' : 'unavailable'}`}>
                  {showVehicleDetails.statut}
                </span>
              </div>
            </div>

            {showVehicleDetails.description && (
              <div className="auto-vehicle-description">
                <h4>Description</h4>
                <p>{showVehicleDetails.description}</p>
              </div>
            )}

            <div className="auto-modal-actions">
              <button
                className="auto-btn auto-btn-secondary"
                onClick={closeVehicleDetails}
              >
                Fermer
              </button>
              <button
                className={`auto-btn auto-btn-primary ${showVehicleDetails.statut !== 'disponible' ? 'disabled' : ''}`}
                onClick={() => {
                  closeVehicleDetails();
                  openReservationModal(showVehicleDetails);
                }}
                disabled={showVehicleDetails.statut !== 'disponible'}
              >
                <i className="fas fa-calendar-plus"></i>
                Réserver ce véhicule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton scroll to top */}
      {showScrollTop && (
        <button className="auto-scroll-top visible" onClick={scrollToTop} aria-label="Retour en haut">
          <i className="fas fa-chevron-up"></i>
        </button>
      )}

      {/* Badge de sécurité */}
      <div className="auto-security-badge">
        <i className="fas fa-shield-alt"></i>
        <span>Paiements sécurisés</span>
      </div>
    </div>
  );
};

export default VehiculeList;