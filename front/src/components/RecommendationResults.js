// frontend/src/components/RecommendationResults.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RecommendationResults.css';

const RecommendationResults = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [nItems, setNItems] = useState(5);
  const [vehicleType, setVehicleType] = useState('');
  const [marque, setMarque] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  const fetchRecommendations = useCallback(async (retry = true) => {
    if (!token || !user) {
      setError('Veuillez vous connecter pour voir les recommandations.');
      navigate('/login');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      console.log('Fetching recommendations...', { nItems, vehicleType, marque, userId: user?.id });
      
      const params = {
        n_items: nItems,
        ...(vehicleType && { type_vehicule: vehicleType }),
        ...(marque && { marque }),
      };

      const response = await axios.get('http://localhost:8000/api/recommendations/', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params,
        timeout: 60000,
      });

      if (response.data && Array.isArray(response.data.recommendations)) {
        setRecommendations(response.data.recommendations);
        console.log(`Received ${response.data.recommendations.length} recommendations`);
      } else {
        console.warn('Unexpected response format:', response.data);
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
          const refreshResponse = await axios.post('http://localhost:8000/api/token/refresh/', { refresh });
          const newAccessToken = refreshResponse.data.access;
          localStorage.setItem('access_token', newAccessToken);
          window.dispatchEvent(new Event('storage'));
          console.log('Token refreshed, retrying...');
          return fetchRecommendations(false);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
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
    let timeoutId;
    timeoutId = setTimeout(() => {
      fetchRecommendations();
    }, 500);
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [fetchRecommendations]);

  const handleRefresh = useCallback(() => {
    fetchRecommendations();
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
      <div className="recommendation-wrapper">
        <div className="recommendation-card">
          <div className="alert alert-warning" role="alert">
            Veuillez vous connecter pour voir les recommandations.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendation-wrapper" style={{ marginLeft: '250px' }}>
      <div className="recommendation-card">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="recommendation-title">Recommandations de véhicules</h1>
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={handleRefresh}
            disabled={loading}
            title="Actualiser les recommandations"
          >
            {loading ? (
              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            ) : (
              <i className="bi bi-arrow-clockwise me-1"></i>
            )}
            Actualiser
          </button>
        </div>

        <div className="row mb-4">
          <div className="col-md-4">
            <label htmlFor="n-items-select" className="form-label">
              Nombre de recommandations
            </label>
            <select
              id="n-items-select"
              className="form-select"
              value={nItems}
              onChange={(e) => setNItems(Number(e.target.value))}
              disabled={loading}
              aria-describedby="n-items-help"
            >
              {itemOptions.map((num) => (
                <option key={num} value={num}>{num} véhicules</option>
              ))}
            </select>
            <small id="n-items-help" className="form-text text-muted">
              Choisissez le nombre de véhicules à afficher.
            </small>
          </div>

          <div className="col-md-4">
            <label htmlFor="vehicle-type-select" className="form-label">
              Type de véhicule
            </label>
            <select
              id="vehicle-type-select"
              className="form-select"
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
            <small id="vehicle-type-help" className="form-text text-muted">
              Filtrez par type de véhicule (optionnel).
            </small>
          </div>

          <div className="col-md-4">
            <label htmlFor="brand-select" className="form-label">
              Marque
            </label>
            <select
              id="brand-select"
              className="form-select"
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
            <small id="brand-help" className="form-text text-muted">
              Filtrez par marque (optionnel).
            </small>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger d-flex align-items-center" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>
              {error}
              <button 
                className="btn btn-sm btn-outline-danger ms-2"
                onClick={handleRefresh}
                disabled={loading}
              >
                Réessayer
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-5 empty-state">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <p className="text-muted">
              Génération des recommandations en cours...<br />
              <small>Cela peut prendre quelques instants.</small>
            </p>
          </div>
        )}

        {!loading && (
          <>
            {recommendations.length > 0 ? (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className="text-muted mb-0">
                    {recommendations.length} recommandation{recommendations.length > 1 ? 's' : ''} trouvée{recommendations.length > 1 ? 's' : ''}
                    {vehicleType && ` (type: ${vehicleTypes.find(t => t.value === vehicleType)?.label})`}
                    {marque && ` (marque: ${brandOptions.find(b => b.value === marque)?.label})`}
                  </p>
                </div>
                
                <div className="vehicle-grid" role="list" aria-label="Liste des véhicules recommandés">
                  {recommendations.map((vehicle) => (
                    <div key={vehicle.id || Math.random()} className="vehicle-item" role="listitem">
                      <i className="bi bi-car-front vehicle-icon"></i>
                      <h5 className="vehicle-name">
                        {vehicle.marque} {vehicle.modele}
                      </h5>
                      <span className={`badge ${vehicle.eco_score > 0.7 ? 'bg-success' : vehicle.eco_score > 0.4 ? 'bg-warning' : 'bg-danger'}`}>
                        Éco {formatEcoScore(vehicle.eco_score)}%
                      </span>
                      <div className="vehicle-price">
                        {formatPrice(vehicle.prix_par_jour)} TND/jour
                      </div>
                      <div className="vehicle-fuel">{vehicle.carburant || 'N/A'}</div>
                      <div className="vehicle-fuel">Type: {vehicle.type_vehicule || 'N/A'}</div>
                      <div className="vehicle-fuel">Localisation: {vehicle.localisation || 'N/A'}</div>
                      <button className="vehicle-link">
                        <i className="bi bi-eye me-1"></i>
                        Voir détails
                      </button>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-5 empty-state">
                <i className="bi bi-car-front display-1 text-muted mb-3"></i>
                <h4 className="text-muted">Aucune recommandation disponible</h4>
                <p className="text-muted">
                  Aucun véhicule correspondant à vos critères n'est disponible. Essayez une autre marque ou type de véhicule.
                </p>
                <button 
                  className="back-button"
                  onClick={handleRefresh}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Réessayer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RecommendationResults;