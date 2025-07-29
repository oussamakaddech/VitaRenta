import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import './RecommendationResults.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const RecommendationResults = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [nItems, setNItems] = useState(5);
  const [vehicleType, setVehicleType] = useState('');
  const [marque, setMarque] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [animateCards, setAnimateCards] = useState(false);

  const vehicleTypes = useMemo(() => [
    { value: '', label: 'Tous' },
    { value: 'berline', label: 'Berline' },
    { value: 'suv', label: 'SUV' },
    { value: 'utilitaire', label: 'Utilitaire' },
    { value: 'citadine', label: 'Citadine' }
  ], []);

  const brandOptions = useMemo(() => [
    { value: '', label: 'Toutes' },
    { value: 'Kia', label: 'Kia' },
    { value: 'Fiat', label: 'Fiat' },
    { value: 'Citroën', label: 'Citroën' },
    { value: 'Volkswagen', label: 'Volkswagen' }
  ], []);

  const itemOptions = useMemo(() => [3, 5, 10, 15, 20], []);

  const particles = useMemo(() => {
    const particlesArray = [];
    for (let i = 0; i < 20; i++) {
      particlesArray.push(
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${10 + Math.random() * 5}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }}
        />
      );
    }
    return particlesArray;
  }, []);

  const fetchRecommendations = useCallback(async (retry = true) => {
    if (!token || !user) {
      setError('Veuillez vous connecter pour voir les recommandations.');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const params = {
        n_items: nItems,
        ...(vehicleType && { type_vehicule: vehicleType }),
        ...(marque && { marque }),
      };

      const response = await axios.get(`${API_BASE_URL}/api/recommendations/`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 60000,
      });

      if (response.data && Array.isArray(response.data.recommendations)) {
        setRecommendations(response.data.recommendations);
        setTimeout(() => setAnimateCards(true), 100);
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      if (err.code === 'ECONNABORTED') {
        setError('La génération des recommandations prend trop de temps. Veuillez réessayer.');
      } else if (err.response?.status === 401 && retry) {
        try {
          const refresh = localStorage.getItem('refresh_token');
          if (!refresh) {
            throw new Error('No refresh token available');
          }
          const refreshResponse = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
          const newAccessToken = refreshResponse.data.access;
          localStorage.setItem('access_token', newAccessToken);
          window.dispatchEvent(new Event('storage'));
          return fetchRecommendations(false);
        } catch (refreshError) {
          setError('Session expirée. Veuillez vous reconnecter.');
          onLogout();
          navigate('/login');
        }
      } else if (err.response?.status === 503) {
        setError('Le service de recommandations est temporairement indisponible. Veuillez réessayer plus tard.');
      } else if (err.response?.status >= 500) {
        setError('Erreur serveur lors de la génération des recommandations. Veuillez réessayer.');
      } else {
        const errorMessage = err.response?.data?.error || err.response?.data?.detail || err.message || 'Erreur inconnue';
        setError(`Erreur lors de la récupération des recommandations : ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  }, [token, user, nItems, vehicleType, marque, navigate, onLogout]);

  useEffect(() => {
    let timeoutId = setTimeout(() => {
      fetchRecommendations();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [fetchRecommendations]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleRefresh = useCallback(() => {
    fetchRecommendations();
    setAnimateCards(false);
  }, [fetchRecommendations]);

  const formatPrice = useCallback((price) => {
    return new Intl.NumberFormat('fr-TN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }, []);

  const formatEcoScore = useCallback((score) => {
    return (score * 100).toFixed(1);
  }, []);

  if (!token || !user) {
    return (
      <div className="recommendation-container">
        <div className="floating-particles">{particles}</div>
        <div className="recommendation-dashboard">
          <div className="error-container" role="alert" aria-live="assertive">
            <i className="fas fa-exclamation-triangle"></i>
            <p className="error-text">Veuillez vous connecter pour voir les recommandations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-container">
      <div className="floating-particles">{particles}</div>
      
      <Sidebar
        token={token}
        user={user}
        setToken={() => {}}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className="dashboard-content">
        <div className="recommendation-dashboard">
          <div className="recommendation-header">
            <h1 className="recommendation-title">
              <i className="fas fa-car"></i> Recommandations de Véhicules
            </h1>
            <p className="recommendation-subtitle">Découvrez les véhicules adaptés à vos besoins</p>
          </div>

          {error && (
            <div className="error-container" role="alert" aria-live="assertive">
              <i className="fas fa-exclamation-triangle"></i>
              <p className="error-text">{error}</p>
              <button
                onClick={handleRefresh}
                className="retry-button"
                disabled={loading}
                aria-label="Réessayer la récupération des recommandations"
              >
                Réessayer
              </button>
            </div>
          )}

          <div className="controls-section">
            <div className="controls-header">
              <h3 className="controls-title">
                <i className="fas fa-filter"></i> Filtres
              </h3>
              <button
                onClick={handleRefresh}
                className="refresh-btn"
                disabled={loading}
                aria-label="Actualiser les recommandations"
              >
                {loading ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-sync"></i>
                )}
                Actualiser
              </button>
            </div>
            <div className="controls-grid">
              <div className="form-group">
                <label htmlFor="n-items-select">Nombre de recommandations</label>
                <select
                  id="n-items-select"
                  className="form-input"
                  value={nItems}
                  onChange={(e) => setNItems(Number(e.target.value))}
                  disabled={loading}
                  aria-describedby="n-items-help"
                >
                  {itemOptions.map((num) => (
                    <option key={num} value={num}>{num} véhicules</option>
                  ))}
                </select>
                <small id="n-items-help" className="text-muted">
                  Choisissez le nombre de véhicules à afficher.
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="vehicle-type-select">Type de véhicule</label>
                <select
                  id="vehicle-type-select"
                  className="form-input"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  disabled={loading}
                  aria-describedby="vehicle-type-help"
                >
                  {vehicleTypes.map((type) => (
                    <option key={type.value || 'all'} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <small id="vehicle-type-help" className="text-muted">
                  Filtrez par type de véhicule (optionnel).
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="brand-select">Marque</label>
                <select
                  id="brand-select"
                  className="form-input"
                  value={marque}
                  onChange={(e) => setMarque(e.target.value)}
                  disabled={loading}
                  aria-describedby="brand-help"
                >
                  {brandOptions.map((brand) => (
                    <option key={brand.value || 'all'} value={brand.value}>
                      {brand.label}
                    </option>
                  ))}
                </select>
                <small id="brand-help" className="text-muted">
                  Filtrez par marque (optionnel).
                </small>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Génération des recommandations en cours...</p>
              <p className="text-muted">Cela peut prendre quelques instants.</p>
            </div>
          ) : (
            <>
              {recommendations.length > 0 ? (
                <>
                  <p className="text-muted">
                    {recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''} trouvée{recommendations.length > 1 ? 's' : ''}
                    {vehicleType && ` (type: ${vehicleTypes.find(t => t.value === vehicleType)?.label})`}
                    {marque && ` (marque: ${brandOptions.find(b => b.value === marque)?.label})`}
                  </p>
                  <div className="vehicle-grid" role="list" aria-label="Liste des véhicules recommandés">
                    {recommendations.map((vehicle, index) => (
                      <div
                        key={vehicle.id || Math.random()}
                        className={`vehicle-item ${animateCards ? 'animate-in' : ''}`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                        role="listitem"
                      >
                        <div className="vehicle-icon">
                          <i className="fas fa-car"></i>
                        </div>
                        <h5 className="vehicle-name">{vehicle.marque} {vehicle.modele}</h5>
                        <div className="vehicle-eco">
                          <span className={`badge ${vehicle.eco_score > 0.7 ? 'bg-success' : vehicle.eco_score > 0.4 ? 'bg-warning' : 'bg-danger'}`}>
                            Éco {formatEcoScore(vehicle.eco_score)}%
                          </span>
                        </div>
                        <div className="vehicle-price">{formatPrice(vehicle.prix_par_jour)} TND/jour</div>
                        <div className="vehicle-fuel">Carburant: {vehicle.carburant || 'N/A'}</div>
                        <div className="vehicle-type">Type: {vehicle.type_vehicule || 'N/A'}</div>
                        <div className="vehicle-location">Localisation: {vehicle.localisation || 'N/A'}</div>
                        <button className="vehicle-link" aria-label={`Voir les détails du véhicule ${vehicle.marque} ${vehicle.modele}`}>
                          <i className="fas fa-eye"></i> Voir détails
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <i className="fas fa-car empty-icon" aria-hidden="true"></i>
                  <h4 className="empty-title">Aucune recommandation disponible</h4>
                  <p className="text-muted">
                    Aucun véhicule correspondant à vos critères n'est disponible. Essayez une autre marque ou type de véhicule.
                  </p>
                  <button
                    className="retry-button"
                    onClick={handleRefresh}
                    aria-label="Réessayer la récupération des recommandations"
                  >
                    <i className="fas fa-sync"></i> Réessayer
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecommendationResults;