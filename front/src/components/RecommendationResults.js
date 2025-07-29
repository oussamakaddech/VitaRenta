// frontend/src/components/RecommendationResults.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RecommendationResults = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [nItems, setNItems] = useState(5);
  const [vehicleType, setVehicleType] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const vehicleTypes = ['', 'berline', 'suv', 'utilitaire', 'citadine'];

  useEffect(() => {
    if (!token || !user) {
      navigate('/login');
    } else {
      fetchRecommendations();
    }
  }, [token, user, navigate, nItems, vehicleType]);

  const fetchRecommendations = async () => {
    setError('');
    setLoading(true);
    try {
      const params = { n_items: nItems };
      if (vehicleType) params.type_vehicule = vehicleType;
      const response = await axios.get('http://localhost:8000/api/recommendations/', {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      setRecommendations(response.data.recommendations);
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          onLogout();
        } else if (err.response.status === 400) {
          setError(err.response.data.error || 'Paramètres invalides.');
        } else {
          setError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setError('Erreur réseau. Veuillez vérifier votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Recommandations de véhicules</h1>
      <div className="mb-3">
        <label htmlFor="n-items-select" className="form-label">Nombre de recommandations</label>
        <select
          id="n-items-select"
          className="form-select"
          value={nItems}
          onChange={(e) => setNItems(Number(e.target.value))}
          aria-describedby="n-items-help"
        >
          {[3, 5, 10, 15, 20].map((num) => (
            <option key={num} value={num}>{num}</option>
          ))}
        </select>
        <small id="n-items-help" className="form-text text-muted">
          Choisissez le nombre de véhicules à afficher.
        </small>
      </div>
      <div className="mb-3">
        <label htmlFor="vehicle-type-select" className="form-label">Type de véhicule</label>
        <select
          id="vehicle-type-select"
          className="form-select"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          aria-describedby="vehicle-type-help"
        >
          {vehicleTypes.map((type) => (
            <option key={type || 'all'} value={type}>{type || 'Tous'}</option>
          ))}
        </select>
        <small id="vehicle-type-help" className="form-text text-muted">
          Filtrez par type de véhicule (optionnel).
        </small>
      </div>
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="text-center" aria-busy="true">
          Chargement...
        </div>
      ) : recommendations.length > 0 ? (
        <div className="row" role="list" aria-label="Liste des véhicules recommandés">
          {recommendations.map((vehicle, index) => (
            <div key={vehicle.id} className="col-md-4 mb-4" role="listitem">
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{vehicle.marque} {vehicle.modele}</h5>
                  <p className="card-text">
                    <strong>Carburant:</strong> {vehicle.carburant}<br />
                    <strong>Prix par jour:</strong> {vehicle.prix_par_jour.toFixed(2)} TND<br />
                    <strong>Localisation:</strong> {vehicle.localisation}<br />
                    <strong>Type:</strong> {vehicle.type_vehicule || 'N/A'}<br />
                    <strong>Score éco:</strong> {(vehicle.eco_score * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="alert alert-info" role="alert">
          Aucune recommandation disponible.
        </div>
      )}
    </div>
  );
};

export default RecommendationResults;