import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import debounce from 'lodash/debounce';
import './VehiculeList.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Images statiques de voitures
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
    
    // Fonction pour obtenir l'URL de l'image statique
    const getStaticCarImage = useCallback((marque = '', modele = '', vehicleId = null) => {
        // Convertir la marque en minuscules pour la recherche
        const marqueLower = marque.toLowerCase();
        
        // Chercher une image correspondant à la marque
        if (CAR_IMAGES[marqueLower]) {
            return CAR_IMAGES[marqueLower];
        }
        
        // Chercher des correspondances partielles
        for (const key in CAR_IMAGES) {
            if (marqueLower.includes(key)) {
                return CAR_IMAGES[key];
            }
        }
        
        // Image par défaut
        return CAR_IMAGES.default;
    }, []);
    
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
            
            const response = await axios(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
                timeout: 30000,
            });
            
            let vehiclesData = [];
            
            if (Array.isArray(response.data)) {
                vehiclesData = response.data.map(vehicle => ({
                    ...vehicle,
                    image: getStaticCarImage(vehicle.marque, vehicle.modele, vehicle.id)
                }));
            } else if (response.data.results && Array.isArray(response.data.results)) {
                vehiclesData = response.data.results.map(vehicle => ({
                    ...vehicle,
                    image: getStaticCarImage(vehicle.marque, vehicle.modele, vehicle.id)
                }));
            }
            
            setVehicles(vehiclesData);
            setFilteredVehicles(vehiclesData);
            setRetryCount(0);
        } catch (err) {
            console.error('Erreur lors du chargement des véhicules:', err.response?.data || err);
            
            let errorMsg = 'Erreur lors du chargement des véhicules';
            
            if (err.code === 'ECONNABORTED') {
                errorMsg = 'Le serveur met trop de temps à répondre. Veuillez vérifier votre connexion et réessayer.';
                setRetryCount(prev => prev + 1);
                
                if (retryCount >= 3) {
                    errorMsg = 'Impossible de se connecter au serveur après plusieurs tentatives. Veuillez réessayer plus tard.';
                }
            } else if (!err.response) {
                errorMsg = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.';
            } else {
                const status = err.response?.status;
                if (status === 401) {
                    errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                    onLogout();
                    navigate('/login');
                } else if (status === 403) {
                    errorMsg = 'Accès non autorisé.';
                } else if (status === 500) {
                    errorMsg = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
                } else if (status === 404) {
                    errorMsg = 'Service indisponible. Veuillez réessayer plus tard.';
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
    
    const sortedVehicles = useMemo(() => {
        return sortVehicles(filteredVehicles, sortBy);
    }, [filteredVehicles, sortBy, sortVehicles]);
    
    const paginatedVehicles = useMemo(() => {
        const startIndex = (currentPage - 1) * vehiclesPerPage;
        return sortedVehicles.slice(startIndex, startIndex + vehiclesPerPage);
    }, [sortedVehicles, currentPage, vehiclesPerPage]);
    
    const totalPages = Math.ceil(sortedVehicles.length / vehiclesPerPage);
    
    const handleFilterChange = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
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
        const searchInput = document.querySelector('.vehicule-search-input');
        if (searchInput) searchInput.value = '';
    };
    
    const toggleFavorite = (vehicleId) => {
        setFavorites((prev) =>
            prev.includes(vehicleId) ? prev.filter((id) => id !== vehicleId) : [...prev, vehicleId]
        );
    };
    
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
            siege_enfant: false,
        });
    };
    
    const calculateTotalPrice = () => {
        if (!selectedVehicle || !reservationData.date_debut || !reservationData.date_fin) {
            return 0;
        }
        const startDate = new Date(reservationData.date_debut);
        const endDate = new Date(reservationData.date_fin);
        const days = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
        let total = days * selectedVehicle.prix_par_jour;
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
            const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            if (diffDays > 30) errors.push('La réservation ne peut pas dépasser 30 jours');
        }
        return errors;
    };
    
    const handleReservation = async () => {
        if (!selectedVehicle || !selectedVehicle.id) {
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
            const reservationPayload = {
                vehicule_id: String(selectedVehicle.id),
                date_debut: new Date(reservationData.date_debut).toISOString(),
                date_fin: new Date(reservationData.date_fin).toISOString(),
                commentaires: reservationData.notes || '',
                assurance_complete: reservationData.assurance_complete,
                conducteur_supplementaire: reservationData.conducteur_supplementaire,
                gps: reservationData.gps,
                siege_enfant: reservationData.siege_enfant,
            };
            
            const response = await axios.post(`${API_BASE_URL}/api/reservations/`, reservationPayload, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            });
            
            setSuccess('Réservation effectuée avec succès !');
            closeReservationModal();
            await fetchVehicles();
            showSuccessNotification('Réservation confirmée !');
        } catch (err) {
            console.error('Erreur lors de la réservation:', err);
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
                        if (data.non_field_errors) {
                            errorMessage = data.non_field_errors[0];
                        } else if (data.vehicule_id) {
                            errorMessage = `Véhicule : ${data.vehicule_id[0]}`;
                        } else if (data.date_debut) {
                            errorMessage = `Date de début : ${data.date_debut[0]}`;
                        } else if (data.date_fin) {
                            errorMessage = `Date de fin : ${data.date_fin[0]}`;
                        } else {
                            errorMessage = Object.values(data)[0]?.[0] || 'Données invalides';
                        }
                        break;
                    case 404:
                        errorMessage = 'Véhicule non trouvé.';
                        break;
                    case 500:
                        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
                        break;
                    default:
                        errorMessage = data.detail || 'Erreur inconnue';
                }
            } else if (err.request) {
                errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
            }
            setError(errorMessage);
        } finally {
            setReservationLoading(false);
        }
    };
    
    const showSuccessNotification = (message) => {
        const notification = document.createElement('div');
        notification.className = 'vehicule-success-notification';
        notification.innerHTML = `
            <div class="vehicule-success-content">
                <i class="fas fa-check-circle vehicule-success-icon"></i>
                <span class="vehicule-success-text">${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    };
    
    // Effet pour détecter le défilement
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    
    useEffect(() => {
        fetchVehicles();
        const interval = setInterval(() => fetchVehicles(), 30000);
        return () => clearInterval(interval);
    }, [fetchVehicles]);
    
    useEffect(() => {
        const container = document.querySelector('.vehicule-container');
        if (container) container.classList.add('vehicule-visible');
    }, []);
    
    const handleSearch = (e) => debouncedSearch(e.target.value);
    
    const ConnectionError = ({ message, onRetry }) => (
        <div className="vehicule-error-state">
            <div className="error-icon">
                <i className="fas fa-wifi-slash"></i>
            </div>
            <h2>Problème de connexion</h2>
            <p>{message}</p>
            <div className="error-actions">
                <button className="vehicule-retry-btn" onClick={onRetry}>
                    <i className="fas fa-redo"></i> Réessayer
                </button>
                <button className="vehicule-retry-btn" onClick={() => window.location.reload()}>
                    <i className="fas fa-sync"></i> Actualiser la page
                </button>
            </div>
        </div>
    );
    
    return (
        <div className="vehicule-container">
            <div className="vehicule-background">
                <div className="vehicule-floating-cars">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="vehicule-floating-car"
                            style={{
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${i * 6}s`,
                                animationDuration: `${30 + Math.random() * 20}s`,
                            }}
                        >
                            🚗
                        </div>
                    ))}
                </div>
                <div className="vehicule-background-shapes">
                    <div className="vehicule-shape vehicule-shape-1"></div>
                    <div className="vehicule-shape vehicule-shape-2"></div>
                    <div className="vehicule-shape vehicule-shape-3"></div>
                </div>
            </div>
            
            <div className={`vehicule-layout-fullwidth ${isScrolled ? 'scrolled' : ''}`}>
                <header className={`vehicule-header ${isScrolled ? 'scrolled' : ''}`}>
                    <div className="vehicule-header-content">
                        <h1 className="vehicule-content-title">🚗 Location de Véhicules Premium</h1>
                        <p className="vehicule-content-subtitle">
                            Découvrez notre flotte de véhicules modernes et réservez en quelques clics
                        </p>
                    </div>
                    {user && (
                        <div className="vehicule-user-info-compact">
                            <div className="vehicule-user-avatar-small">
                                {user.first_name ? user.first_name.charAt(0) : 'U'}
                            </div>
                            <div className="vehicule-user-details">
                                <span className="vehicule-user-name">
                                    {user.first_name} {user.last_name}
                                </span>
                                <span className="vehicule-user-role">Client</span>
                            </div>
                            <div className="vehicule-stats-compact">
                                <div className="vehicule-stat-compact">
                                    <i className="fas fa-heart"></i>
                                    <span>{favorites.length}</span>
                                </div>
                                <div className="vehicule-stat-compact">
                                    <i className="fas fa-car"></i>
                                    <span>{vehicles.length}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </header>
                
                <main className="vehicule-main-fullwidth">
                    {error && (
                        <div className="vehicule-alert vehicule-alert-error">
                            <div>
                                <i className="fas fa-exclamation-triangle"></i>
                                <span>{error}</span>
                            </div>
                            <button className="vehicule-alert-close" onClick={() => setError(null)}>
                                ×
                            </button>
                        </div>
                    )}
                    {success && (
                        <div className="vehicule-alert vehicule-alert-success">
                            <div>
                                <i className="fas fa-check-circle"></i>
                                <span>{success}</span>
                            </div>
                            <button className="vehicule-alert-close" onClick={() => setSuccess(null)}>
                                ×
                            </button>
                        </div>
                    )}
                    
                    <div className="vehicule-card vehicule-search-card">
                        <div className="vehicule-card-header">
                            <h2 className="vehicule-card-title">
                                <i className="fas fa-search"></i> Recherche et Filtres
                            </h2>
                        </div>
                        <div className="vehicule-search-controls">
                            <div className="vehicule-search-bar">
                                <div className="vehicule-input-container">
                                    <input
                                        type="text"
                                        placeholder="Rechercher un véhicule..."
                                        className="vehicule-search-input"
                                        onChange={handleSearch}
                                    />
                                    <i className="fas fa-search vehicule-input-icon"></i>
                                </div>
                            </div>
                            <div className="vehicule-controls">
                                <div className="vehicule-view-controls">
                                    <button
                                        className={`vehicule-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                                        onClick={() => setViewMode('grid')}
                                        aria-label="Vue grille"
                                    >
                                        <i className="fas fa-th-large"></i>
                                    </button>
                                    <button
                                        className={`vehicule-view-btn ${viewMode === 'list' ? 'active' : ''}`}
                                        onClick={() => setViewMode('list')}
                                        aria-label="Vue liste"
                                    >
                                        <i className="fas fa-list"></i>
                                    </button>
                                </div>
                                <button
                                    className="vehicule-btn-secondary"
                                    onClick={() => setShowFilters(!showFilters)}
                                >
                                    <i className="fas fa-filter"></i> Filtres
                                </button>
                                <button className="vehicule-btn-secondary" onClick={fetchVehicles}>
                                    <i className="fas fa-redo"></i> Rafraîchir
                                </button>
                            </div>
                        </div>
                        
                        {showFilters && (
                            <div className="vehicule-filters-container">
                                <div className="vehicule-form-grid">
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-car vehicule-label-icon"></i>
                                            Marque
                                        </label>
                                        <input
                                            type="text"
                                            className="vehicule-input"
                                            placeholder="Ex: Toyota"
                                            value={filters.marque}
                                            onChange={(e) => handleFilterChange('marque', e.target.value)}
                                        />
                                    </div>
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-gas-pump vehicule-label-icon"></i>
                                            Carburant
                                        </label>
                                        <select
                                            className="vehicule-sort-select"
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
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-euro-sign vehicule-label-icon"></i>
                                            Prix minimum
                                        </label>
                                        <input
                                            type="number"
                                            className="vehicule-input"
                                            placeholder="Prix min"
                                            value={filters.prix_min}
                                            onChange={(e) => handleFilterChange('prix_min', e.target.value)}
                                        />
                                    </div>
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-euro-sign vehicule-label-icon"></i>
                                            Prix maximum
                                        </label>
                                        <input
                                            type="number"
                                            className="vehicule-input"
                                            placeholder="Prix max"
                                            value={filters.prix_max}
                                            onChange={(e) => handleFilterChange('prix_max', e.target.value)}
                                        />
                                    </div>
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-users vehicule-label-icon"></i>
                                            Nombre de places min
                                        </label>
                                        <input
                                            type="number"
                                            className="vehicule-input"
                                            placeholder="Places min"
                                            value={filters.places_min}
                                            onChange={(e) => handleFilterChange('places_min', e.target.value)}
                                        />
                                    </div>
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-map-marker-alt vehicule-label-icon"></i>
                                            Localisation
                                        </label>
                                        <input
                                            type="text"
                                            className="vehicule-input"
                                            placeholder="Ville ou région"
                                            value={filters.localisation}
                                            onChange={(e) => handleFilterChange('localisation', e.target.value)}
                                        />
                                    </div>
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-info-circle vehicule-label-icon"></i>
                                            Statut
                                        </label>
                                        <select
                                            className="vehicule-sort-select"
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
                                    <div className="vehicule-form-group">
                                        <label className="vehicule-form-label">
                                            <i className="fas fa-cog vehicule-label-icon"></i>
                                            Transmission
                                        </label>
                                        <select
                                            className="vehicule-sort-select"
                                            value={filters.transmission}
                                            onChange={(e) => handleFilterChange('transmission', e.target.value)}
                                        >
                                            <option value="">Tous</option>
                                            <option value="manuelle">Manuelle</option>
                                            <option value="automatique">Automatique</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="vehicule-filter-actions">
                                    <button className="vehicule-btn-secondary" onClick={resetFilters}>
                                        <i className="fas fa-undo"></i> Réinitialiser
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="vehicule-card">
                        <div className="vehicule-results-header">
                            <div className="vehicule-results-info">
                                {loading
                                    ? 'Chargement...'
                                    : `${sortedVehicles.length} véhicule${sortedVehicles.length > 1 ? 's' : ''} trouvé${sortedVehicles.length > 1 ? 's' : ''}`}
                            </div>
                            <div className="vehicule-form-group">
                                <select
                                    className="vehicule-sort-select"
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
                        
                        {loading && (
                            <div className="vehicule-loading-state">
                                <div className="vehicule-loading-spinner">
                                    <div className="vehicule-spinner-car">🚗</div>
                                    <div className="vehicule-spinner-text">Chargement des véhicules...</div>
                                </div>
                            </div>
                        )}
                        
                        {error && !loading && (
                            error.includes('connexion') || error.includes('timeout') || error.includes('serveur met trop de temps') ? (
                                <ConnectionError 
                                    message={error} 
                                    onRetry={fetchVehicles} 
                                />
                            ) : (
                                <div className="vehicule-error-state">
                                    <h2>Erreur de chargement</h2>
                                    <p>{error}</p>
                                    <button className="vehicule-retry-btn" onClick={fetchVehicles}>
                                        <i className="fas fa-redo"></i> Réessayer
                                    </button>
                                </div>
                            )
                        )}
                        
                        {!loading && !error && (
                            <>
                                {paginatedVehicles.length > 0 ? (
                                    <div className={`vehicule-vehicles-grid ${viewMode === 'list' ? 'vehicule-list-view' : ''}`}>
                                        {paginatedVehicles.map((vehicle) => (
                                            <div key={vehicle.id} className="vehicule-vehicle-card">
                                                <div className="vehicule-vehicle-image">
                                                    <img
                                                        src={getStaticCarImage(vehicle.marque, vehicle.modele, vehicle.id)}
                                                        alt={`${vehicle.marque} ${vehicle.modele}`}
                                                        className="vehicule-image loaded"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    <div className="vehicule-vehicle-overlay">
                                                        <button
                                                            className={`vehicule-favorite-btn ${favorites.includes(vehicle.id) ? 'active' : ''}`}
                                                            onClick={() => toggleFavorite(vehicle.id)}
                                                            aria-label={favorites.includes(vehicle.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                                                        >
                                                            <i className="fas fa-heart"></i>
                                                        <span className="sr-only">
                                                            {favorites.includes(vehicle.id) ? "Retirer des favoris" : "Ajouter aux favoris"}
                                                        </span>
                                                        </button>
                                                        <button
                                                            className="vehicule-details-btn"
                                                            onClick={() => setShowVehicleDetails(vehicle)}
                                                            aria-label="Voir les détails"
                                                        >
                                                            <i className="fas fa-info"></i>
                                                        </button>
                                                    </div>
                                                    <div className="vehicule-vehicle-badges">
                                                        <span className={`fuel-badge fuel-${vehicle.carburant?.toLowerCase() || 'essence'}`}>
                                                            {vehicle.carburant || 'Essence'}
                                                        </span>
                                                        <span className={`status-badge status-${vehicle.statut?.toLowerCase() || 'disponible'}`}>
                                                            {vehicle.statut || 'Disponible'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="vehicule-vehicle-content">
                                                    <div className="vehicule-vehicle-header">
                                                        <h3 className="vehicule-vehicle-title">
                                                            {vehicle.marque || 'Marque'} {vehicle.modele || 'Modèle'}
                                                        </h3>
                                                    </div>
                                                    <div className="vehicule-vehicle-specs">
                                                        <div className="vehicule-spec-item">
                                                            <i className="fas fa-users"></i>
                                                            <span>{vehicle.nombre_places || 'N/A'} places</span>
                                                        </div>
                                                        <div className="vehicule-spec-item">
                                                            <i className="fas fa-cog"></i>
                                                            <span>{vehicle.transmission || 'Manuelle'}</span>
                                                        </div>
                                                        <div className="vehicule-spec-item">
                                                            <i className="fas fa-map-marker-alt"></i>
                                                            <span>{vehicle.localisation || 'Non spécifié'}</span>
                                                        </div>
                                                        <div className="vehicule-spec-item">
                                                            <i className="fas fa-calendar"></i>
                                                            <span>{vehicle.annee || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="vehicule-vehicle-footer">
                                                        <div className="vehicule-vehicle-price">
                                                            <span className="vehicule-price-amount">{vehicle.prix_par_jour || 0}€</span>
                                                            <span className="vehicule-price-period">par jour</span>
                                                        </div>
                                                        <div className="vehicule-vehicle-actions">
                                                            <button
                                                                className="vehicule-btn-primary"
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
                                    <div className="vehicule-no-reservations">
                                        <div className="vehicule-no-reservations-icon">🚗</div>
                                        <h3 className="vehicule-no-reservations-title">Aucun véhicule trouvé</h3>
                                        <p className="vehicule-no-reservations-text">
                                            Essayez de modifier vos critères de recherche ou vos filtres
                                        </p>
                                        <button className="vehicule-btn-primary" onClick={resetFilters}>
                                            <i className="fas fa-undo"></i> Réinitialiser les filtres
                                        </button>
                                    </div>
                                )}
                                
                                {totalPages > 1 && (
                                    <div className="vehicule-pagination">
                                        <button
                                            className="vehicule-pagination-btn"
                                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1}
                                            aria-label="Page précédente"
                                        >
                                            <i className="fas fa-chevron-left"></i> Précédent
                                        </button>
                                        {[...Array(totalPages)].map((_, index) => (
                                            <button
                                                key={index}
                                                className={`vehicule-pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
                                                onClick={() => setCurrentPage(index + 1)}
                                                aria-label={`Page ${index + 1}`}
                                                aria-current={currentPage === index + 1 ? "page" : undefined}
                                            >
                                                {index + 1}
                                            </button>
                                        ))}
                                        <button
                                            className="vehicule-pagination-btn"
                                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
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
                    
                    {showReservationModal && selectedVehicle && (
                        <div className="vehicule-modal-overlay">
                            <div className="vehicule-modal-content">
                                <div className="vehicule-modal-header">
                                    <h3 className="vehicule-modal-title">
                                        Réserver {selectedVehicle.marque} {selectedVehicle.modele}
                                    </h3>
                                    <button className="vehicule-close-btn" onClick={closeReservationModal} aria-label="Fermer">
                                        ×
                                    </button>
                                </div>
                                <div className="vehicule-modal-body">
                                    <div className="vehicule-vehicle-info-modal">
                                        <div className="vehicule-info-item">
                                            <span className="vehicule-info-label">Prix par jour:</span>
                                            <span className="vehicule-info-value">{selectedVehicle.prix_par_jour}€</span>
                                        </div>
                                        <div className="vehicule-info-item">
                                            <span className="vehicule-info-label">Carburant:</span>
                                            <span className="vehicule-info-value">{selectedVehicle.carburant}</span>
                                        </div>
                                        <div className="vehicule-info-item">
                                            <span className="vehicule-info-label">Places:</span>
                                            <span className="vehicule-info-value">{selectedVehicle.nombre_places}</span>
                                        </div>
                                        <div className="vehicule-info-item">
                                            <span className="vehicule-info-label">Transmission:</span>
                                            <span className="vehicule-info-value">{selectedVehicle.transmission}</span>
                                        </div>
                                    </div>
                                    <div className="vehicule-form-grid">
                                        <div className="vehicule-form-group">
                                            <label className="vehicule-form-label">
                                                <i className="fas fa-calendar vehicule-label-icon"></i>
                                                Date de début
                                            </label>
                                            <input
                                                type="date"
                                                className="vehicule-input"
                                                value={reservationData.date_debut}
                                                onChange={(e) =>
                                                    setReservationData((prev) => ({
                                                        ...prev,
                                                        date_debut: e.target.value,
                                                    }))
                                                }
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="vehicule-form-group">
                                            <label className="vehicule-form-label">
                                                <i className="fas fa-calendar vehicule-label-icon"></i>
                                                Date de fin
                                            </label>
                                            <input
                                                type="date"
                                                className="vehicule-input"
                                                value={reservationData.date_fin}
                                                onChange={(e) =>
                                                    setReservationData((prev) => ({
                                                        ...prev,
                                                        date_fin: e.target.value,
                                                    }))
                                                }
                                                min={reservationData.date_debut || new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="vehicule-form-group">
                                            <label className="vehicule-form-label">
                                                <i className="fas fa-sticky-note vehicule-label-icon"></i>
                                                Notes (optionnel)
                                            </label>
                                            <textarea
                                                className="vehicule-input"
                                                placeholder="Informations supplémentaires..."
                                                value={reservationData.notes}
                                                onChange={(e) =>
                                                    setReservationData((prev) => ({
                                                        ...prev,
                                                        notes: e.target.value,
                                                    }))
                                                }
                                                rows={3}
                                            />
                                        </div>
                                        <div className="vehicule-form-group">
                                            <label className="vehicule-form-label">
                                                Options supplémentaires
                                            </label>
                                            <div className="vehicule-checkbox-group">
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={reservationData.assurance_complete}
                                                        onChange={(e) =>
                                                            setReservationData((prev) => ({
                                                                ...prev,
                                                                assurance_complete: e.target.checked,
                                                            }))
                                                        }
                                                    />
                                                    Assurance complète (20€/jour)
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={reservationData.conducteur_supplementaire}
                                                        onChange={(e) =>
                                                            setReservationData((prev) => ({
                                                                ...prev,
                                                                conducteur_supplementaire: e.target.checked,
                                                            }))
                                                        }
                                                    />
                                                    Conducteur supplémentaire (10€/jour)
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={reservationData.gps}
                                                        onChange={(e) =>
                                                            setReservationData((prev) => ({
                                                                ...prev,
                                                                gps: e.target.checked,
                                                            }))
                                                        }
                                                    />
                                                    GPS (5€/jour)
                                                </label>
                                                <label>
                                                    <input
                                                        type="checkbox"
                                                        checked={reservationData.siege_enfant}
                                                        onChange={(e) =>
                                                            setReservationData((prev) => ({
                                                                ...prev,
                                                                siege_enfant: e.target.checked,
                                                            }))
                                                        }
                                                    />
                                                    Siège enfant (8€/jour)
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    {reservationData.date_debut && reservationData.date_fin && (
                                        <div className="vehicule-price-summary">
                                            <h4>Résumé des coûts</h4>
                                            <div className="vehicule-price-breakdown">
                                                <div className="vehicule-price-item">
                                                    <span>Location ({Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))} jours)</span>
                                                    <span>{(Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24)) * selectedVehicle.prix_par_jour)}€</span>
                                                </div>
                                                {reservationData.assurance_complete && (
                                                    <div className="vehicule-price-item">
                                                        <span>Assurance complète</span>
                                                        <span>{20 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                                                    </div>
                                                )}
                                                {reservationData.conducteur_supplementaire && (
                                                    <div className="vehicule-price-item">
                                                        <span>Conducteur supplémentaire</span>
                                                        <span>{10 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                                                    </div>
                                                )}
                                                {reservationData.gps && (
                                                    <div className="vehicule-price-item">
                                                        <span>GPS</span>
                                                        <span>{5 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                                                    </div>
                                                )}
                                                {reservationData.siege_enfant && (
                                                    <div className="vehicule-price-item">
                                                        <span>Siège enfant</span>
                                                        <span>{8 * Math.ceil((new Date(reservationData.date_fin) - new Date(reservationData.date_debut)) / (1000 * 60 * 60 * 24))}€</span>
                                                    </div>
                                                )}
                                                <div className="vehicule-price-item vehicule-price-total">
                                                    <span>Total</span>
                                                    <span>{calculateTotalPrice()}€</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="vehicule-modal-footer">
                                    <button className="vehicule-btn-secondary" onClick={closeReservationModal}>
                                        Annuler
                                    </button>
                                    <button
                                        className="vehicule-btn-primary"
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
                    
                    {showVehicleDetails && (
                        <div className="vehicule-modal-overlay">
                            <div className="vehicule-modal-content">
                                <div className="vehicule-modal-header">
                                    <h3 className="vehicule-modal-title">
                                        {showVehicleDetails.marque} {showVehicleDetails.modele}
                                    </h3>
                                    <button className="vehicule-close-btn" onClick={() => setShowVehicleDetails(null)} aria-label="Fermer">
                                        ×
                                    </button>
                                </div>
                                <div className="vehicule-modal-body">
                                    <div className="vehicule-vehicle-details-content">
                                        <div className="vehicule-vehicle-image-large">
                                            <img
                                                src={getStaticCarImage(showVehicleDetails.marque, showVehicleDetails.modele, showVehicleDetails.id)}
                                                alt={`${showVehicleDetails.marque} ${showVehicleDetails.modele}`}
                                                className="vehicule-image loaded"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                        </div>
                                        <div className="vehicule-specs-grid">
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-gas-pump"></i>
                                                <div>
                                                    <strong>Carburant</strong>
                                                    <span>{showVehicleDetails.carburant || 'Non spécifié'}</span>
                                                </div>
                                            </div>
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-users"></i>
                                                <div>
                                                    <strong>Places</strong>
                                                    <span>{showVehicleDetails.nombre_places || 'Non spécifié'}</span>
                                                </div>
                                            </div>
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-cog"></i>
                                                <div>
                                                    <strong>Transmission</strong>
                                                    <span>{showVehicleDetails.transmission || 'Non spécifié'}</span>
                                                </div>
                                            </div>
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-calendar"></i>
                                                <div>
                                                    <strong>Année</strong>
                                                    <span>{showVehicleDetails.annee || 'Non spécifié'}</span>
                                                </div>
                                            </div>
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-map-marker-alt"></i>
                                                <div>
                                                    <strong>Localisation</strong>
                                                    <span>{showVehicleDetails.localisation || 'Non spécifié'}</span>
                                                </div>
                                            </div>
                                            <div className="vehicule-spec-detail">
                                                <i className="fas fa-euro-sign"></i>
                                                <div>
                                                    <strong>Prix par jour</strong>
                                                    <span>{showVehicleDetails.prix_par_jour || 'Non spécifié'}€</span>
                                                </div>
                                            </div>
                                        </div>
                                        {showVehicleDetails.description && (
                                            <div className="vehicule-vehicle-description-full">
                                                <h4>Description</h4>
                                                <p>{showVehicleDetails.description}</p>
                                            </div>
                                        )}
                                        <div className="vehicule-vehicle-features">
                                            <h4>Équipements</h4>
                                            <div className="vehicule-features-list">
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-snowflake"></i>
                                                    <span>Climatisation</span>
                                                </div>
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-wifi"></i>
                                                    <span>Bluetooth</span>
                                                </div>
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-shield-alt"></i>
                                                    <span>Airbags</span>
                                                </div>
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-lock"></i>
                                                    <span>Verrouillage centralisé</span>
                                                </div>
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-music"></i>
                                                    <span>Système audio</span>
                                                </div>
                                                <div className="vehicule-feature-item">
                                                    <i className="fas fa-usb"></i>
                                                    <span>Port USB</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="vehicule-modal-footer">
                                    <button className="vehicule-btn-secondary" onClick={() => setShowVehicleDetails(null)}>
                                        Fermer
                                    </button>
                                    <button
                                        className="vehicule-btn-primary"
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
                </main>
                
                <footer className="vehicule-footer">
                    <div className="vehicule-footer-content">
                        <p>© 2023 Location de Véhicules Premium. Tous droits réservés.</p>
                        <div className="vehicule-footer-links">
                            <a href="#" className="vehicule-footer-link">Mentions légales</a>
                            <a href="#" className="vehicule-footer-link">Politique de confidentialité</a>
                            <a href="#" className="vehicule-footer-link">Contact</a>
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default VehiculeList;