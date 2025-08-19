import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import AgencyMap from './AgencyMap';
import './AgencyLocator.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AgencyLocator = ({ token, user, onLogout }) => {
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [showMap, setShowMap] = useState(true); // Affichage carte par défaut pour clients
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredAgencies, setFilteredAgencies] = useState([]);
    
    // États pour la géolocalisation et recommandations
    const [userLocation, setUserLocation] = useState(null);
    const [nearbyAgencies, setNearbyAgencies] = useState([]);
    const [locationStatus, setLocationStatus] = useState('pending'); // 'pending', 'granted', 'denied', 'error'
    
    const handleLogout = useCallback(() => {
        onLogout();
        setIsSidebarOpen(false);
    }, [onLogout]);

    // Coordonnées approximatives des principales villes tunisiennes
    const getCityCoordinates = useCallback((ville) => {
        const coordinates = {
            'tunis': { lat: 36.8065, lng: 10.1815 },
            'sfax': { lat: 34.7405, lng: 10.7603 },
            'sousse': { lat: 35.8256, lng: 10.6089 },
            'kairouan': { lat: 35.6781, lng: 10.0963 },
            'bizerte': { lat: 37.2744, lng: 9.8739 },
            'gabes': { lat: 33.8815, lng: 10.0982 },
            'ariana': { lat: 36.8625, lng: 10.1647 },
            'monastir': { lat: 35.7643, lng: 10.8113 },
            'nabeul': { lat: 36.4561, lng: 10.7376 },
            'beja': { lat: 36.7256, lng: 9.1816 },
            'mahdia': { lat: 35.5047, lng: 11.0622 },
            'tozeur': { lat: 33.9197, lng: 8.1335 },
            'kasserine': { lat: 35.1675, lng: 8.8362 },
            'djerba': { lat: 33.8076, lng: 10.8451 },
            'zarzis': { lat: 33.5044, lng: 11.1122 }
        };
        
        const normalizedCity = ville.toLowerCase().trim();
        return coordinates[normalizedCity] || { lat: 34.0, lng: 9.0 }; // Centre de la Tunisie par défaut
    }, []);

    // Calculer la distance entre deux points (formule de Haversine)
    const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
        const R = 6371; // Rayon de la Terre en kilomètres
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }, []);

    // Obtenir la géolocalisation de l'utilisateur
    const getUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            console.log('Géolocalisation non supportée');
            return;
        }

        setLocationStatus('pending');
        console.log('🌍 Demande de géolocalisation...');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                setUserLocation(location);
                setLocationStatus('granted');
                console.log('✅ Position obtenue:', location);
            },
            (error) => {
                console.error('❌ Erreur géolocalisation:', error.message);
                setLocationStatus('denied');
                // Utiliser Tunis comme position par défaut
                setUserLocation({ latitude: 36.8065, longitude: 10.1815 });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            }
        );
    }, []);

    // Trouver les agences les plus proches
    const findNearbyAgencies = useCallback(() => {
        if (!userLocation || agencies.length === 0) return;

        const agenciesWithDistance = agencies.map(agency => {
            const cityCoords = getCityCoordinates(agency.ville);
            const distance = calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                cityCoords.lat,
                cityCoords.lng
            );
            return { ...agency, distance: Math.round(distance * 10) / 10 };
        });

        // Trier par distance et prendre les 3 plus proches
        const nearby = agenciesWithDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3);

        setNearbyAgencies(nearby);
        console.log(`📍 ${nearby.length} agences proches trouvées`);
    }, [userLocation, agencies, getCityCoordinates, calculateDistance]);
    
    // Récupérer toutes les agences actives
    const fetchAgencies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/agences/?active=true`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            
            const data = Array.isArray(response.data.results) ? response.data.results : 
                        Array.isArray(response.data) ? response.data : [];
            
            setAgencies(data);
            setFilteredAgencies(data);
        } catch (err) {
            console.error('Erreur lors du chargement des agences:', err);
            setError('Impossible de charger les agences. Veuillez réessayer.');
            setAgencies([]);
            setFilteredAgencies([]);
        } finally {
            setLoading(false);
        }
    }, [token]);
    
    useEffect(() => {
        fetchAgencies();
    }, [fetchAgencies]);

    // Démarrer la géolocalisation au chargement
    useEffect(() => {
        getUserLocation();
    }, [getUserLocation]);

    // Rechercher les agences proches quand la position ou les agences changent
    useEffect(() => {
        findNearbyAgencies();
    }, [findNearbyAgencies]);
    
    // Filtrer les agences selon la recherche
    useEffect(() => {
        if (searchTerm.trim()) {
            const filtered = agencies.filter(agency => 
                agency.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agency.ville?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                agency.adresse?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredAgencies(filtered);
        } else {
            setFilteredAgencies(agencies);
        }
    }, [searchTerm, agencies]);
    
    const handleMapAgencySelect = useCallback((agency) => {
        setSelectedAgency(agency);
    }, []);
    
    const toggleView = useCallback(() => {
        setShowMap(prev => !prev);
        setSelectedAgency(null);
    }, []);
    
    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);
    
    const clearSelection = useCallback(() => {
        setSelectedAgency(null);
    }, []);
    
    return (
        <div className="agency-locator-container">
            <Sidebar
                token={token}
                user={user}
                setToken={() => {}}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            
            <div className={`main-content ${isSidebarOpen ? 'with-sidebar' : ''}`}>
                <div className="stats-dashboard">
                    {/* Header */}
                    <div className="dashboard-header">
                        <h1 className="dashboard-title">
                            <i className="fas fa-map-marked-alt"></i>
                            Trouvez nos Agences
                        </h1>
                        <p className="dashboard-subtitle">
                            Découvrez toutes nos agences VitaRenta près de chez vous
                        </p>
                    </div>
                    
                    {/* Barre de recherche */}
                    <div className="search-section">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Rechercher par ville, nom d'agence ou adresse..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                className="search-input"
                            />
                            <i className="fas fa-search search-icon" aria-hidden="true"></i>
                        </div>
                    </div>
                    
                    {/* Section Recommandations d'agences proches */}
                    {nearbyAgencies.length > 0 && (
                        <div className="nearby-recommendations">
                            <div className="recommendations-header">
                                <h3>
                                    <i className="fas fa-map-marker-alt"></i>
                                    Agences recommandées près de vous
                                </h3>
                                <div className="location-status">
                                    {locationStatus === 'granted' && (
                                        <span className="status-granted">
                                            <i className="fas fa-check-circle"></i>
                                            Position actuelle détectée
                                        </span>
                                    )}
                                    {locationStatus === 'denied' && (
                                        <span className="status-denied">
                                            <i className="fas fa-map-pin"></i>
                                            Position par défaut (Tunis)
                                            <button onClick={getUserLocation} className="retry-location-btn">
                                                <i className="fas fa-location-arrow"></i>
                                                Autoriser la géolocalisation
                                            </button>
                                        </span>
                                    )}
                                    {locationStatus === 'pending' && (
                                        <span className="status-pending">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            Détection de votre position...
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            <div className="recommendations-list">
                                {nearbyAgencies.map((agency, index) => (
                                    <div key={agency.id} className="recommendation-item">
                                        <div className="recommendation-rank">#{index + 1}</div>
                                        <div className="recommendation-info">
                                            <h4>{agency.nom}</h4>
                                            <div className="recommendation-details">
                                                <div className="detail-item">
                                                    <i className="fas fa-route"></i>
                                                    <span>{agency.distance} km</span>
                                                </div>
                                                <div className="detail-item">
                                                    <i className="fas fa-map-marker-alt"></i>
                                                    <span>{agency.ville}</span>
                                                </div>
                                                <div className="detail-item">
                                                    <i className="fas fa-phone"></i>
                                                    <span>{agency.telephone}</span>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    setSelectedAgency(agency);
                                                    setShowMap(true);
                                                }}
                                                className="view-agency-btn"
                                            >
                                                <i className="fas fa-eye"></i>
                                                Voir sur la carte
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {/* Statistiques rapides */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--success-green)' }}>
                                <i className="fas fa-building"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">{filteredAgencies.length}</div>
                                <div className="stat-label">Agences Disponibles</div>
                                <div className="stat-description">
                                    {searchTerm ? 'Correspondant à votre recherche' : 'Dans tout le réseau'}
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--primary-blue)' }}>
                                <i className="fas fa-map-marker-alt"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">{agencies.filter(a => a.ville).length}</div>
                                <div className="stat-label">Villes Couvertes</div>
                                <div className="stat-description">À travers la Tunisie</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon" style={{ background: 'var(--warning-yellow)' }}>
                                <i className="fas fa-clock"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">24/7</div>
                                <div className="stat-label">Service Client</div>
                                <div className="stat-description">Support disponible</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Bouton de basculement de vue */}
                    <div className="view-toggle">
                        <button
                            onClick={toggleView}
                            className="toggle-btn"
                            disabled={loading}
                        >
                            <i className={`fas fa-${showMap ? 'list' : 'map-marker-alt'}`}></i>
                            {showMap ? 'Vue Liste' : 'Vue Carte'}
                        </button>
                        {selectedAgency && (
                            <button
                                onClick={clearSelection}
                                className="clear-selection-btn"
                            >
                                <i className="fas fa-times"></i>
                                Effacer la sélection
                            </button>
                        )}
                    </div>
                    
                    {error && (
                        <div className="error-container" role="alert">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p className="error-text">{error}</p>
                            <button onClick={fetchAgencies} className="retry-btn">
                                <i className="fas fa-redo"></i> Réessayer
                            </button>
                        </div>
                    )}
                    
                    {loading ? (
                        <div className="loading-container">
                            <div className="loading-spinner"></div>
                            <p>Chargement des agences...</p>
                        </div>
                    ) : (
                        <>
                            {/* Carte des agences */}
                            {showMap && (
                                <AgencyMap
                                    agencies={filteredAgencies}
                                    onAgencySelect={handleMapAgencySelect}
                                    selectedAgency={selectedAgency}
                                    showDemo={filteredAgencies.length === 0}
                                />
                            )}
                            
                            {/* Liste des agences */}
                            {!showMap && (
                                <div className="agencies-list-section">
                                    <h3 className="list-title">
                                        <i className="fas fa-list"></i>
                                        Liste des Agences
                                        <span className="agency-count">({filteredAgencies.length})</span>
                                    </h3>
                                    
                                    {filteredAgencies.length === 0 ? (
                                        <div className="empty-state">
                                            <i className="fas fa-search empty-icon"></i>
                                            <h4>Aucune agence trouvée</h4>
                                            <p>
                                                {searchTerm 
                                                    ? `Aucune agence ne correspond à "${searchTerm}"`
                                                    : "Aucune agence disponible pour le moment"
                                                }
                                            </p>
                                            {searchTerm && (
                                                <button
                                                    onClick={() => setSearchTerm('')}
                                                    className="clear-search-btn"
                                                >
                                                    <i className="fas fa-times"></i>
                                                    Effacer la recherche
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="agencies-grid">
                                            {filteredAgencies.map((agency) => (
                                                <div
                                                    key={agency.id}
                                                    className={`agency-card ${selectedAgency?.id === agency.id ? 'selected' : ''}`}
                                                    onClick={() => setSelectedAgency(agency)}
                                                >
                                                    <div className="agency-header">
                                                        <h4 className="agency-name">{agency.nom}</h4>
                                                        <span className="agency-status active">
                                                            <i className="fas fa-check-circle"></i>
                                                            Ouvert
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="agency-details">
                                                        <p className="agency-address">
                                                            <i className="fas fa-map-marker-alt"></i>
                                                            {agency.adresse}, {agency.ville} {agency.code_postal}
                                                        </p>
                                                        
                                                        {agency.telephone && (
                                                            <p className="agency-phone">
                                                                <i className="fas fa-phone"></i>
                                                                <a href={`tel:${agency.telephone}`}>
                                                                    {agency.telephone}
                                                                </a>
                                                            </p>
                                                        )}
                                                        
                                                        {agency.email && (
                                                            <p className="agency-email">
                                                                <i className="fas fa-envelope"></i>
                                                                <a href={`mailto:${agency.email}`}>
                                                                    {agency.email}
                                                                </a>
                                                            </p>
                                                        )}
                                                        
                                                        {agency.description && (
                                                            <p className="agency-description">
                                                                {agency.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="agency-actions">
                                                        <button 
                                                            className="contact-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (agency.telephone) {
                                                                    window.open(`tel:${agency.telephone}`);
                                                                }
                                                            }}
                                                        >
                                                            <i className="fas fa-phone"></i>
                                                            Appeler
                                                        </button>
                                                        <button 
                                                            className="locate-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowMap(true);
                                                                setSelectedAgency(agency);
                                                            }}
                                                        >
                                                            <i className="fas fa-map-marker-alt"></i>
                                                            Localiser
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AgencyLocator;
