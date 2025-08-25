import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ethers } from 'ethers';
import debounce from 'lodash/debounce';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './VehiculeList.css'; // Your provided CSS file

// Static car images
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
  const [vehicles, setVehicles] = useState([]);
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    marque: '',
    carburant: '',
    prix_min: '',
    prix_max: '',
    places_min: '',
    localisation: '',
    statut: '',
    transmission: '',
  });
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationData, setReservationData] = useState({
    date_debut: '',
    date_fin: '',
    notes: '',
    assurance_complete: false,
    conducteur_supplementaire: false,
    gps: false,
    siege_enfant: false,
  });
  const [reservationLoading, setReservationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('prix_asc');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [vehiclesPerPage] = useState(12);
  const [showVehicleDetails, setShowVehicleDetails] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const getStaticCarImage = useCallback((marque = '') => {
    const marqueLower = marque.toLowerCase();
    return CAR_IMAGES[marqueLower] || CAR_IMAGES.default;
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);
        setSuccess('Portefeuille connecté avec succès !');
        showSuccessNotification('Portefeuille connecté !');
      } catch (err) {
        setError('Erreur lors de la connexion au portefeuille.');
        console.error('Wallet connection error:', err);
      }
    } else {
      setError('MetaMask non détecté. Veuillez installer MetaMask.');
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setIsWalletConnected(false);
    setSuccess('Portefeuille déconnecté.');
    showSuccessNotification('Portefeuille déconnecté.');
  };

  const debouncedSearch = useCallback(
    debounce((term) => {
      setSearchTerm(term);
      setCurrentPage(1);
    }, 300),
    []
  );

  const fetchVehicles = useCallback(async () => {
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
      });

      let vehiclesData = Array.isArray(response.data)
        ? response.data
        : response.data.results || [];

      vehiclesData = vehiclesData.map(vehicle => ({
        ...vehicle,
        image: getStaticCarImage(vehicle.marque)
      }));

      setVehicles(vehiclesData);
      setFilteredVehicles(vehiclesData);
      setRetryCount(0);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      let errorMsg = 'Erreur lors du chargement des véhicules';

      if (err.code === 'ECONNABORTED') {
        errorMsg = 'Le serveur met trop de temps à répondre. Veuillez vérifier votre connexion.';
        if (retryCount < 3) setRetryCount(prev => prev + 1);
        else errorMsg = 'Impossible de se connecter après plusieurs tentatives.';
      } else if (!err.response) {
        errorMsg = 'Impossible de se connecter au serveur.';
      } else {
        const status = err.response?.status;
        if (status === 401) {
          errorMsg = 'Session expirée. Veuillez vous reconnecter.';
          onLogout();
          navigate('/login');
        } else if (status === 403) {
          errorMsg = 'Accès non autorisé.';
        } else if (status === 500) {
          errorMsg = 'Erreur interne du serveur.';
        } else if (status === 404) {
          errorMsg = 'Service indisponible.';
        }
      }

      setError(errorMsg);
      setVehicles([]);
      setFilteredVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filters, token, onLogout, navigate, getStaticCarImage, retryCount]);

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

  const sortedVehicles = useMemo(() => sortVehicles(filteredVehicles, sortBy), [filteredVehicles, sortBy]);

  const paginatedVehicles = useMemo(() => {
    const startIndex = (currentPage - 1) * vehiclesPerPage;
    return sortedVehicles.slice(startIndex, startIndex + vehiclesPerPage);
  }, [sortedVehicles, currentPage, vehiclesPerPage]);

  const totalPages = Math.ceil(sortedVehicles.length / vehiclesPerPage);

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
      transmission: '',
    });
    setSearchTerm('');
    setCurrentPage(1);
    const searchInput = document.querySelector('.auto-search-input-hero');
    if (searchInput) searchInput.value = '';
  };

  const toggleFavorite = (vehicleId) => {
    setFavorites(prev =>
      prev.includes(vehicleId) ? prev.filter(id => id !== vehicleId) : [...prev, vehicleId]
    );
  };

  const openReservationModal = (vehicle) => {
    if (!token || !user?.id) {
      setError('Vous devez être connecté pour réserver un véhicule.');
      navigate('/login');
      return;
    }
    if (!isWalletConnected) {
      setError('Vous devez connecter votre portefeuille pour réserver.');
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
      siege_enfant: false,
    });
  };

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

    if (!isWalletConnected) {
      setError('Vous devez connecter votre portefeuille pour réserver.');
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

      // Simulate blockchain transaction (replace with actual smart contract interaction)
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = {
        to: '0xRecipientAddress', // Replace with actual contract address
        value: ethers.parseEther((calculateTotalPrice() / 1000).toString()), // Example conversion to ETH
      };
      // await signer.sendTransaction(tx); // Uncomment for actual transaction

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
          siege_enfant: reservationData.siege_enfant,
          wallet_address: walletAddress,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      setSuccess('Réservation effectuée avec succès !');
      closeReservationModal();
      await fetchVehicles();
      showSuccessNotification('Réservation confirmée sur la blockchain !');
    } catch (err) {
      console.error('Error during reservation:', err);
      let errorMessage = 'Erreur lors de la réservation';

      if (err.response) {
        const { status, data } = err.response;
        if (status === 401) {
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          onLogout();
          navigate('/login');
        } else if (status === 403) {
          errorMessage = 'Vous n\'êtes pas autorisé à effectuer cette action.';
        } else if (status === 400) {
          errorMessage = data.non_field_errors?.[0] ||
                         data.vehicule_id?.[0] ||
                         data.date_debut?.[0] ||
                         data.date_fin?.[0] ||
                         Object.values(data)[0]?.[0] ||
                         'Données invalides';
        } else if (status === 404) {
          errorMessage = 'Véhicule non trouvé.';
        } else if (status === 500) {
          errorMessage = 'Erreur serveur.';
        } else {
          errorMessage = data.detail || 'Erreur inconnue';
        }
      } else {
        errorMessage = 'Impossible de contacter le serveur.';
      }

      setError(errorMessage);
    } finally {
      setReservationLoading(false);
    }
  };

  const showSuccessNotification = (message) => {
    const notification = document.createElement('div');
    notification.className = 'auto-success-notification';
    notification.innerHTML = `
      <div class="auto-success-content">
        <i class="fas fa-check-circle auto-success-icon"></i>
        <span class="auto-success-text">${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setShowScrollTop(window.scrollY > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000);
    return () => clearInterval(interval);
  }, [fetchVehicles]);

  const handleSearch = (e) => debouncedSearch(e.target.value);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const ConnectionError = ({ message, onRetry }) => (
    <div className="auto-error-state">
      <div className="error-icon">
        <i className="fas fa-wifi-slash"></i>
      </div>
      <h2>Problème de connexion</h2>
      <p>{message}</p>
      <div className="error-actions">
        <button className="auto-retry-btn" onClick={onRetry}>
          <i className="fas fa-redo"></i> Réessayer
        </button>
        <button className="auto-retry-btn" onClick={() => window.location.reload()}>
          <i className="fas fa-sync"></i> Actualiser
        </button>
      </div>
    </div>
  );

  return (
    <div className="auto-container">
      {/* Header */}
      <header className={`auto-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="auto-header-container">
          <div className="auto-logo">
            <h1>Auto<span>Rent</span></h1>
          </div>
          <nav className="auto-nav">
            <ul className="auto-nav-menu">
              <li className="auto-nav-item"><a href="#" className="auto-nav-link">Accueil</a></li>
              <li className="auto-nav-item"><a href="#" className="auto-nav-link">Véhicules</a></li>
              <li className="auto-nav-item"><a href="#" className="auto-nav-link">Services</a></li>
              <li className="auto-nav-item"><a href="#" className="auto-nav-link">À propos</a></li>
              <li className="auto-nav-item"><a href="#" className="auto-nav-link">Contact</a></li>
            </ul>
          </nav>
          <div className="auto-header-actions">
            {user ? (
              <div className="auto-user-menu">
                <div className="auto-user-info">
                  <div className="auto-user-avatar">
                    {user.first_name ? user.first_name.charAt(0) : 'U'}
                  </div>
                  <span className="auto-user-name">
                    {user.first_name} {user.last_name}
                  </span>
                </div>
                <button className="auto-btn-secondary" onClick={onLogout}>
                  <i className="fas fa-sign-out-alt"></i> Déconnexion
                </button>
              </div>
            ) : (
              <div className="auto-auth-buttons">
                <button className="auto-btn-secondary" onClick={() => navigate('/login')}>
                  Connexion
                </button>
                <button className="auto-btn-primary" onClick={() => navigate('/register')}>
                  Inscription
                </button>
              </div>
            )}
            <button
              className={`auto-wallet-button ${isWalletConnected ? 'connected' : ''}`}
              onClick={isWalletConnected ? disconnectWallet : connectWallet}
            >
              <i className="fas fa-wallet"></i>
              {isWalletConnected ? 'Déconnecter' : 'Connecter Portefeuille'}
            </button>
            {isWalletConnected && (
              <span className="auto-wallet-address">{walletAddress}</span>
            )}
            <button
              className="auto-mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'}`}></i>
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="auto-mobile-menu">
            <ul className="auto-mobile-nav-menu">
              <li className="auto-mobile-nav-item"><a href="#" className="auto-mobile-nav-link">Accueil</a></li>
              <li className="auto-mobile-nav-item"><a href="#" className="auto-mobile-nav-link">Véhicules</a></li>
              <li className="auto-mobile-nav-item"><a href="#" className="auto-mobile-nav-link">Services</a></li>
              <li className="auto-mobile-nav-item"><a href="#" className="auto-mobile-nav-link">À propos</a></li>
              <li className="auto-mobile-nav-item"><a href="#" className="auto-mobile-nav-link">Contact</a></li>
            </ul>
            {!user && (
              <div className="auto-mobile-auth-buttons">
                <button className="auto-btn-secondary" onClick={() => navigate('/login')}>
                  Connexion
                </button>
                <button className="auto-btn-primary" onClick={() => navigate('/register')}>
                  Inscription
                </button>
              </div>
            )}
            <button
              className={`auto-wallet-button ${isWalletConnected ? 'connected' : ''}`}
              onClick={isWalletConnected ? disconnectWallet : connectWallet}
            >
              <i className="fas fa-wallet"></i>
              {isWalletConnected ? 'Déconnecter' : 'Connecter Portefeuille'}
            </button>
          </div>
        )}
      </header>

      {/* Hero Section with Background Image */}
      <section className="auto-hero" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1553440569-bcc63803a83d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')` }}>
        <div className="auto-hero-overlay"></div>
        <div className="auto-hero-content">
          <div className="auto-hero-text">
            <h1 className="auto-hero-title">
              <span className="auto-title-line">Louez la voiture</span>
              <span className="auto-title-line">de vos rêves</span>
            </h1>
            <p className="auto-hero-subtitle">
              Découvrez notre flotte de véhicules premium et réservez en quelques clics avec la blockchain
            </p>
            <div className="auto-hero-search">
              <div className="auto-search-bar-hero">
                <div className="auto-input-container">
                  <input
                    type="text"
                    placeholder="Rechercher une marque, un modèle..."
                    className="auto-search-input-hero"
                    onChange={handleSearch}
                    aria-label="Rechercher un véhicule"
                  />
                  <i className="fas fa-search auto-input-icon"></i>
                </div>
                <button
                  className="auto-btn-primary"
                  onClick={() => document.getElementById('vehicles-section').scrollIntoView({ behavior: 'smooth' })}
                >
                  Rechercher
                </button>
              </div>
            </div>
            {isWalletConnected && (
              <div className="auto-blockchain-info">
                <p>Portefeuille connecté : {walletAddress}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features-section" className="auto-features">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Pourquoi nous choisir?</h2>
            <p className="auto-section-subtitle">
              Une expérience de location sécurisée avec la technologie blockchain
            </p>
          </div>
          <div className="auto-features-grid">
            <div className="auto-feature-card">
              <div className="auto-feature-icon"><i className="fas fa-car"></i></div>
              <h3 className="auto-feature-title">Flotte Premium</h3>
              <p className="auto-feature-description">
                Véhicules modernes et bien entretenus pour votre confort et sécurité
              </p>
            </div>
            <div className="auto-feature-card">
              <div className="auto-feature-icon"><i className="fas fa-dollar-sign"></i></div>
              <h3 className="auto-feature-title">Paiements Blockchain</h3>
              <p className="auto-feature-description">
                Réservations sécurisées via smart contracts
              </p>
            </div>
            <div className="auto-feature-card">
              <div className="auto-feature-icon"><i className="fas fa-clock"></i></div>
              <h3 className="auto-feature-title">Disponibilité 24/7</h3>
              <p className="auto-feature-description">
                Service client disponible à tout moment pour vous assister
              </p>
            </div>
            <div className="auto-feature-card">
              <div className="auto-feature-icon"><i className="fas fa-shield-alt"></i></div>
              <h3 className="auto-feature-title">Transparence</h3>
              <p className="auto-feature-description">
                Historique des réservations vérifiable sur la blockchain
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vehicles Section */}
      <section id="vehicles-section" className="auto-vehicles">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Notre Flotte de Véhicules</h2>
            <p className="auto-section-subtitle">
              Découvrez notre sélection de véhicules de qualité
            </p>
          </div>
          {error && (
            <div className="auto-alert auto-alert-error">
              <div>
                <i className="fas fa-exclamation-triangle"></i>
                <span>{error}</span>
              </div>
              <button className="auto-alert-close" onClick={() => setError(null)}>
                ×
              </button>
            </div>
          )}
          {success && (
            <div className="auto-alert auto-alert-success">
              <div>
                <i className="fas fa-check-circle"></i>
                <span>{success}</span>
              </div>
              <button className="auto-alert-close" onClick={() => setSuccess(null)}>
                ×
              </button>
            </div>
          )}
          <div className="auto-filters-section">
            <div className="auto-filters-header">
              <h3 className="auto-filters-title">
                <i className="fas fa-filter"></i> Filtres et Tri
              </h3>
              <div className="auto-filters-actions">
                <button
                  className={`auto-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                  aria-label="Vue grille"
                >
                  <i className="fas fa-th-large"></i>
                </button>
                <button
                  className={`auto-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="Vue liste"
                >
                  <i className="fas fa-list"></i>
                </button>
                <button
                  className="auto-btn-secondary"
                  onClick={() => setShowFilters(!showFilters)}
                  aria-label={showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                >
                  <i className="fas fa-sliders-h"></i> Filtres
                </button>
                <button className="auto-btn-secondary" onClick={fetchVehicles}>
                  <i className="fas fa-sync-alt"></i> Actualiser
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="auto-filters-container">
                <div className="auto-form-grid">
                  <div className="auto-form-group">
                    <label className="auto-form-label">Marque</label>
                    <input
                      type="text"
                      className="auto-input"
                      placeholder="Ex: Toyota"
                      value={filters.marque}
                      onChange={(e) => handleFilterChange('marque', e.target.value)}
                    />
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Carburant</label>
                    <select
                      className="auto-select"
                      value={filters.carburant}
                      onChange={(e) => handleFilterChange('carburant', e.target.value)}
                    >
                      <option value="">Tous</option>
                      <option value="essence">Essence</option>
                      <option value="diesel">Diesel</option>
                      <option value="hybride">Hybride</option>
                      <option value="électrique">Électrique</option>
                    </select>
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Prix min</label>
                    <input
                      type="number"
                      className="auto-input"
                      placeholder="Prix min"
                      value={filters.prix_min}
                      onChange={(e) => handleFilterChange('prix_min', e.target.value)}
                    />
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Prix max</label>
                    <input
                      type="number"
                      className="auto-input"
                      placeholder="Prix max"
                      value={filters.prix_max}
                      onChange={(e) => handleFilterChange('prix_max', e.target.value)}
                    />
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Places min</label>
                    <input
                      type="number"
                      className="auto-input"
                      placeholder="Places min"
                      value={filters.places_min}
                      onChange={(e) => handleFilterChange('places_min', e.target.value)}
                    />
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Localisation</label>
                    <input
                      type="text"
                      className="auto-input"
                      placeholder="Ville ou région"
                      value={filters.localisation}
                      onChange={(e) => handleFilterChange('localisation', e.target.value)}
                    />
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Statut</label>
                    <select
                      className="auto-select"
                      value={filters.statut}
                      onChange={(e) => handleFilterChange('statut', e.target.value)}
                    >
                      <option value="">Tous les statuts</option>
                      <option value="disponible">Disponible</option>
                      <option value="loué">Loué</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="hors_service">Hors service</option>
                    </select>
                  </div>
                  <div className="auto-form-group">
                    <label className="auto-form-label">Transmission</label>
                    <select
                      className="auto-select"
                      value={filters.transmission}
                      onChange={(e) => handleFilterChange('transmission', e.target.value)}
                    >
                      <option value="">Tous</option>
                      <option value="manuelle">Manuelle</option>
                      <option value="automatique">Automatique</option>
                    </select>
                  </div>
                </div>
                <div className="auto-filter-actions">
                  <button className="auto-btn-secondary" onClick={resetFilters}>
                    <i className="fas fa-undo"></i> Réinitialiser
                  </button>
                </div>
              </div>
            )}
            <div className="auto-sort-section">
              <div className="auto-results-info">
                {loading
                  ? 'Chargement...'
                  : `${sortedVehicles.length} véhicule${sortedVehicles.length !== 1 ? 's' : ''} trouvé${sortedVehicles.length !== 1 ? 's' : ''}`}
              </div>
              <div className="auto-sort-controls">
                <label className="auto-sort-label">Trier par:</label>
                <select
                  className="auto-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="prix_asc">Prix croissant</option>
                  <option value="prix_desc">Prix décroissant</option>
                  <option value="marque">Marque</option>
                  <option value="carburant">Carburant</option>
                  <option value="places">Nombre de places</option>
                  <option value="recent">Plus récent</option>
                </select>
              </div>
            </div>
          </div>
          {loading && (
            <div className="auto-loading-state">
              <div className="auto-loading-spinner">
                <div className="auto-spinner-car">🚗</div>
                <div className="auto-spinner-text">Chargement des véhicules...</div>
              </div>
            </div>
          )}
          {error && !loading && (
            error.includes('connexion') || error.includes('timeout') || error.includes('serveur') ? (
              <ConnectionError message={error} onRetry={fetchVehicles} />
            ) : (
              <div className="auto-error-state">
                <h2>Erreur de chargement</h2>
                <p>{error}</p>
                <button className="auto-retry-btn" onClick={fetchVehicles}>
                  <i className="fas fa-redo"></i> Réessayer
                </button>
              </div>
            )
          )}
          {!loading && !error && (
            <>
              {paginatedVehicles.length > 0 ? (
                <div className={`auto-vehicles-grid ${viewMode === 'list' ? 'auto-list-view' : ''}`}>
                  {paginatedVehicles.map((vehicle) => (
                    <div key={vehicle.id} className="auto-vehicle-card">
                      <div className="auto-vehicle-image">
                        <img
                          src={vehicle.image}
                          alt={`${vehicle.marque} ${vehicle.modele}`}
                          className="auto-image"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="auto-vehicle-overlay">
                          <button
                            className={`auto-favorite-btn ${favorites.includes(vehicle.id) ? 'active' : ''}`}
                            onClick={() => toggleFavorite(vehicle.id)}
                            aria-label={favorites.includes(vehicle.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                          >
                            <i className="fas fa-heart"></i>
                          </button>
                          <button
                            className="auto-details-btn"
                            onClick={() => setShowVehicleDetails(vehicle)}
                            aria-label="Voir les détails"
                          >
                            <i className="fas fa-info-circle"></i>
                          </button>
                        </div>
                        <div className="auto-vehicle-badges">
                          <span className={`fuel-badge fuel-${vehicle.carburant?.toLowerCase() || 'essence'}`}>
                            {vehicle.carburant || 'Essence'}
                          </span>
                          <span className={`status-badge status-${vehicle.statut?.toLowerCase() || 'disponible'}`}>
                            {vehicle.statut || 'Disponible'}
                          </span>
                        </div>
                      </div>
                      <div className="auto-vehicle-content">
                        <div className="auto-vehicle-header">
                          <h3 className="auto-vehicle-title">
                            {vehicle.marque || 'Marque'} {vehicle.modele || 'Modèle'}
                          </h3>
                        </div>
                        <div className="auto-vehicle-specs">
                          <div className="auto-spec-item">
                            <i className="fas fa-users"></i>
                            <span>{vehicle.nombre_places || 'N/A'} places</span>
                          </div>
                          <div className="auto-spec-item">
                            <i className="fas fa-cog"></i>
                            <span>{vehicle.transmission || 'Manuelle'}</span>
                          </div>
                          <div className="auto-spec-item">
                            <i className="fas fa-map-marker-alt"></i>
                            <span>{vehicle.localisation || 'Non spécifié'}</span>
                          </div>
                          <div className="auto-spec-item">
                            <i className="fas fa-calendar"></i>
                            <span>{vehicle.annee || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="auto-vehicle-footer">
                          <div className="auto-vehicle-price">
                            <span className="auto-price-amount">{vehicle.prix_par_jour || 0}€</span>
                            <span className="auto-price-period">par jour</span>
                          </div>
                          <div className="auto-vehicle-actions">
                            <button
                              className="auto-btn-primary"
                              onClick={() => openReservationModal(vehicle)}
                              disabled={vehicle.statut !== 'disponible'}
                            >
                              <i className="fas fa-calendar-plus"></i> Réserver
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="auto-no-reservations">
                  <div className="auto-no-reservations-icon">🚗</div>
                  <h3 className="auto-no-reservations-title">Aucun véhicule trouvé</h3>
                  <p className="auto-no-reservations-text">
                    Essayez de modifier vos critères de recherche ou vos filtres
                  </p>
                  <button className="auto-btn-primary" onClick={resetFilters}>
                    <i className="fas fa-undo"></i> Réinitialiser les filtres
                  </button>
                </div>
              )}
              {totalPages > 1 && (
                <div className="auto-pagination">
                  <button
                    className="auto-pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    aria-label="Page précédente"
                  >
                    <i className="fas fa-chevron-left"></i> Précédent
                  </button>
                  <div className="auto-pagination-numbers">
                    {[...Array(totalPages)].map((_, index) => (
                      <button
                        key={index}
                        className={`auto-pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
                        onClick={() => setCurrentPage(index + 1)}
                        aria-label={`Page ${index + 1}`}
                        aria-current={currentPage === index + 1 ? 'page' : undefined}
                      >
                        {index + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    className="auto-pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    aria-label="Page suivante"
                  >
                    Suivant <i className="fas fa-chevron-right"></i>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="auto-testimonials">
        <div className="auto-container">
          <div className="auto-section-header">
            <h2 className="auto-section-title">Ce que disent nos clients</h2>
            <p className="auto-section-subtitle">
              Découvrez les témoignages de nos clients satisfaits
            </p>
          </div>
          <div className="auto-testimonials-grid">
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                </div>
                <p className="auto-testimonial-text">
                  "Service exceptionnel ! La réservation via blockchain est rapide et sécurisée."
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">J</div>
                <div className="auto-author-info">
                  <h4 className="auto-author-name">Jean Dupont</h4>
                  <p className="auto-author-title">Client satisfait</p>
                </div>
              </div>
            </div>
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                </div>
                <p className="auto-testimonial-text">
                  "Excellente expérience avec des véhicules de qualité et un paiement transparent."
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">M</div>
                <div className="auto-author-info">
                  <h4 className="auto-author-name">Marie Lambert</h4>
                  <p className="auto-author-title">Cliente fidèle</p>
                </div>
              </div>
            </div>
            <div className="auto-testimonial-card">
              <div className="auto-testimonial-content">
                <div className="auto-testimonial-rating">
                  {[...Array(5)].map((_, i) => <i key={i} className="fas fa-star"></i>)}
                </div>
                <p className="auto-testimonial-text">
                  "La blockchain rend la location tellement simple et fiable !"
                </p>
              </div>
              <div className="auto-testimonial-author">
                <div className="auto-author-avatar">P</div>
                <div className="auto-author-info">
                  <h4 className="auto-author-name">Pierre Martin</h4>
                  <p className="auto-author-title">Professionnel</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="auto-cta">
        <div className="auto-container">
          <div className="auto-cta-content">
            <h2 className="auto-cta-title">Prêt à partir ?</h2>
            <p className="auto-cta-subtitle">
              Réservez votre véhicule dès maintenant avec la sécurité de la blockchain
            </p>
            <div className="auto-cta-buttons">
              <button
                className="auto-btn-primary auto-btn-large"
                onClick={() => document.getElementById('vehicles-section').scrollIntoView({ behavior: 'smooth' })}
              >
                <i className="fas fa-car"></i> Réserver un véhicule
              </button>
              <button className="auto-btn-secondary auto-btn-large">
                <i className="fas fa-phone"></i> Nous contacter
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="auto-footer">
        <div className="auto-footer-content">
          <div className="auto-footer-section">
            <div className="auto-footer-logo">
              <h3>Auto<span>Rent</span></h3>
              <p className="auto-footer-description">
                Votre partenaire de confiance pour la location de véhicules premium avec blockchain
              </p>
              <div className="auto-social-links">
                <a href="#" className="auto-social-link"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="auto-social-link"><i className="fab fa-twitter"></i></a>
                <a href="#" className="auto-social-link"><i className="fab fa-instagram"></i></a>
                <a href="#" className="auto-social-link"><i className="fab fa-linkedin-in"></i></a>
              </div>
            </div>
          </div>
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Liens rapides</h4>
            <ul className="auto-footer-links">
              <li><a href="#" className="auto-footer-link">Accueil</a></li>
              <li><a href="#" className="auto-footer-link">Véhicules</a></li>
              <li><a href="#" className="auto-footer-link">Services</a></li>
              <li><a href="#" className="auto-footer-link">À propos</a></li>
              <li><a href="#" className="auto-footer-link">Contact</a></li>
            </ul>
          </div>
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Services</h4>
            <ul className="auto-footer-links">
              <li><a href="#" className="auto-footer-link">Location courte durée</a></li>
              <li><a href="#" className="auto-footer-link">Location longue durée</a></li>
              <li><a href="#" className="auto-footer-link">Véhicules de luxe</a></li>
              <li><a href="#" className="auto-footer-link">Véhicules utilitaires</a></li>
              <li><a href="#" className="auto-footer-link">Assurance</a></li>
            </ul>
          </div>
          <div className="auto-footer-section">
            <h4 className="auto-footer-title">Contact</h4>
            <ul className="auto-footer-contact">
              <li>
                <i className="fas fa-map-marker-alt"></i>
                <span>123 Avenue des Champs-Élysées, Paris, France</span>
              </li>
              <li>
                <i className="fas fa-phone"></i>
                <span>+33 1 23 45 67 89</span>
              </li>
              <li>
                <i className="fas fa-envelope"></i>
                <span>contact@autorent.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="auto-footer-bottom">
          <div className="auto-container">
            <div className="auto-footer-bottom-content">
              <p>&copy; 2025 AutoRent. Tous droits réservés.</p>
              <div className="auto-footer-legal">
                <a href="#" className="auto-footer-link">Mentions légales</a>
                <a href="#" className="auto-footer-link">Politique de confidentialité</a>
                <a href="#" className="auto-footer-link">Conditions d'utilisation</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button className="auto-scroll-top" onClick={scrollToTop} aria-label="Retour en haut">
          <i className="fas fa-arrow-up"></i>
        </button>
      )}

      {/* Reservation Modal */}
      {showReservationModal && selectedVehicle && (
        <div className="auto-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reservation-modal-title">
          <div className="auto-modal-content">
            <div className="auto-modal-header">
              <h3 id="reservation-modal-title" className="auto-modal-title">
                Réserver {selectedVehicle.marque} {selectedVehicle.modele}
              </h3>
              <button className="auto-close-btn" onClick={closeReservationModal} aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="auto-modal-body">
              <div className="auto-vehicle-info-modal">
                <div className="auto-info-item">
                  <span className="auto-info-label">Prix par jour:</span>
                  <span className="auto-info-value">{selectedVehicle.prix_par_jour}€</span>
                </div>
                <div className="auto-info-item">
                  <span className="auto-info-label">Carburant:</span>
                  <span className="auto-info-value">{selectedVehicle.carburant}</span>
                </div>
                <div className="auto-info-item">
                  <span className="auto-info-label">Places:</span>
                  <span className="auto-info-value">{selectedVehicle.nombre_places}</span>
                </div>
                <div className="auto-info-item">
                  <span className="auto-info-label">Transmission:</span>
                  <span className="auto-info-value">{selectedVehicle.transmission}</span>
                </div>
              </div>
              <div className="auto-form-grid">
                <div className="auto-form-group">
                  <label className="auto-form-label">
                    <i className="fas fa-calendar auto-label-icon"></i>
                    Date de début
                  </label>
                  <input
                    type="date"
                    className="auto-input"
                    value={reservationData.date_debut}
                    onChange={(e) =>
                      setReservationData(prev => ({ ...prev, date_debut: e.target.value }))
                    }
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="auto-form-group">
                  <label className="auto-form-label">
                    <i className="fas fa-calendar auto-label-icon"></i>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    className="auto-input"
                    value={reservationData.date_fin}
                    onChange={(e) =>
                      setReservationData(prev => ({ ...prev, date_fin: e.target.value }))
                    }
                    min={reservationData.date_debut || new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="auto-form-group">
                  <label className="auto-form-label">
                    <i className="fas fa-sticky-note auto-label-icon"></i>
                    Notes (optionnel)
                  </label>
                  <textarea
                    className="auto-input"
                    placeholder="Informations supplémentaires..."
                    value={reservationData.notes}
                    onChange={(e) =>
                      setReservationData(prev => ({ ...prev, notes: e.target.value }))
                    }
                    rows={3}
                  />
                </div>
                <div className="auto-form-group">
                  <label className="auto-form-label">Options supplémentaires</label>
                  <div className="auto-checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={reservationData.assurance_complete}
                        onChange={(e) =>
                          setReservationData(prev => ({ ...prev, assurance_complete: e.target.checked }))
                        }
                      />
                      Assurance complète (20€/jour)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={reservationData.conducteur_supplementaire}
                        onChange={(e) =>
                          setReservationData(prev => ({ ...prev, conducteur_supplementaire: e.target.checked }))
                        }
                      />
                      Conducteur supplémentaire (10€/jour)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={reservationData.gps}
                        onChange={(e) =>
                          setReservationData(prev => ({ ...prev, gps: e.target.checked }))
                        }
                      />
                      GPS (5€/jour)
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        checked={reservationData.siege_enfant}
                        onChange={(e) =>
                          setReservationData(prev => ({ ...prev, siege_enfant: e.target.checked }))
                        }
                      />
                      Siège enfant (8€/jour)
                    </label>
                  </div>
                </div>
              </div>
              {reservationData.date_debut && reservationData.date_fin && (
                <div className="auto-price-summary">
                  <h4>Résumé des coûts</h4>
                  <div className="auto-price-breakdown">
                    <div className="auto-price-item">
                      <span>Location ({Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))} jours)</span>
                      <span>{Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24)) * selectedVehicle.prix_par_jour}€</span>
                    </div>
                    {reservationData.assurance_complete && (
                      <div className="auto-price-item">
                        <span>Assurance complète</span>
                        <span>{20 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                      </div>
                    )}
                    {reservationData.conducteur_supplementaire && (
                      <div className="auto-price-item">
                        <span>Conducteur supplémentaire</span>
                        <span>{10 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                      </div>
                    )}
                    {reservationData.gps && (
                      <div className="auto-price-item">
                        <span>GPS</span>
                        <span>{5 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                      </div>
                    )}
                    {reservationData.siege_enfant && (
                      <div className="auto-price-item">
                        <span>Siège enfant</span>
                        <span>{8 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                      </div>
                    )}
                    <div className="auto-price-item auto-price-total">
                      <span>Total</span>
                      <span>{calculateTotalPrice()}€</span>
                    </div>
                  </div>
                </div>
              )}
              {isWalletConnected && (
                <div className="auto-blockchain-info">
                  <p>Réservation sécurisée avec votre portefeuille : {walletAddress}</p>
                </div>
              )}
            </div>
            <div className="auto-modal-footer">
              <button className="auto-btn-secondary" onClick={closeReservationModal}>
                Annuler
              </button>
              <button
                className="auto-btn-primary"
                onClick={handleReservation}
                disabled={reservationLoading || !reservationData.date_debut || !reservationData.date_fin}
              >
                {reservationLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Réservation...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i> Confirmer ({calculateTotalPrice()}€)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle Details Modal */}
      {showVehicleDetails && (
        <div className="auto-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="details-modal-title">
          <div className="auto-modal-content">
            <div className="auto-modal-header">
              <h3 id="details-modal-title" className="auto-modal-title">
                {showVehicleDetails.marque} {showVehicleDetails.modele}
              </h3>
              <button className="auto-close-btn" onClick={() => setShowVehicleDetails(null)} aria-label="Fermer">
                ×
              </button>
            </div>
            <div className="auto-modal-body">
              <div className="auto-vehicle-details-content">
                <div className="auto-vehicle-image-large">
                  <img
                    src={showVehicleDetails.image}
                    alt={`${showVehicleDetails.marque} ${showVehicleDetails.modele}`}
                    className="auto-image"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="auto-specs-grid">
                  <div className="auto-spec-detail">
                    <i className="fas fa-gas-pump"></i>
                    <div>
                      <strong>Carburant</strong>
                      <span>{showVehicleDetails.carburant || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <div className="auto-spec-detail">
                    <i className="fas fa-users"></i>
                    <div>
                      <strong>Places</strong>
                      <span>{showVehicleDetails.nombre_places || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <div className="auto-spec-detail">
                    <i className="fas fa-cog"></i>
                    <div>
                      <strong>Transmission</strong>
                      <span>{showVehicleDetails.transmission || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <div className="auto-spec-detail">
                    <i className="fas fa-calendar"></i>
                    <div>
                      <strong>Année</strong>
                      <span>{showVehicleDetails.annee || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <div className="auto-spec-detail">
                    <i className="fas fa-map-marker-alt"></i>
                    <div>
                      <strong>Localisation</strong>
                      <span>{showVehicleDetails.localisation || 'Non spécifié'}</span>
                    </div>
                  </div>
                  <div className="auto-spec-detail">
                    <i className="fas fa-euro-sign"></i>
                    <div>
                      <strong>Prix par jour</strong>
                      <span>{showVehicleDetails.prix_par_jour || 'Non spécifié'}€</span>
                    </div>
                  </div>
                </div>
                {showVehicleDetails.description && (
                  <div className="auto-vehicle-description-full">
                    <h4>Description</h4>
                    <p>{showVehicleDetails.description}</p>
                  </div>
                )}
                <div className="auto-vehicle-features">
                  <h4>Équipements</h4>
                  <div className="auto-features-list">
                    <div className="auto-feature-item"><i className="fas fa-snowflake"></i><span>Climatisation</span></div>
                    <div className="auto-feature-item"><i className="fas fa-wifi"></i><span>Bluetooth</span></div>
                    <div className="auto-feature-item"><i className="fas fa-shield-alt"></i><span>Airbags</span></div>
                    <div className="auto-feature-item"><i className="fas fa-lock"></i><span>Verrouillage centralisé</span></div>
                    <div className="auto-feature-item"><i className="fas fa-music"></i><span>Système audio</span></div>
                    <div className="auto-feature-item"><i className="fas fa-usb"></i><span>Port USB</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="auto-modal-footer">
              <button className="auto-btn-secondary" onClick={() => setShowVehicleDetails(null)}>
                Fermer
              </button>
              <button
                className="auto-btn-primary"
                onClick={() => {
                  setShowVehicleDetails(null);
                  openReservationModal(showVehicleDetails);
                }}
                disabled={showVehicleDetails.statut !== 'disponible'}
              >
                <i className="fas fa-calendar-plus"></i> Réserver ce véhicule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiculeList;