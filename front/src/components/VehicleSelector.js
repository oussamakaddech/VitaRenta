import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VehicleSelector.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const VehicleSelector = ({ token, user, onVehicleSelect, selectedVehicleId }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fonction pour récupérer les véhicules
    const fetchVehicles = async () => {
        if (!token) {
            setError('Token d\'authentification manquant');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log('Fetching vehicles with token:', token ? 'Token present' : 'No token');
            
            const response = await axios.get(
                `${API_BASE_URL}/api/vehicules/`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10 secondes de timeout
                }
            );

            console.log('Vehicles response:', response.data);

            if (response.data && Array.isArray(response.data)) {
                setVehicles(response.data);
            } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
                // Si l'API retourne un format paginé
                setVehicles(response.data.results);
            } else {
                setError('Format de données invalide');
            }

        } catch (err) {
            console.error('Fetch vehicles error:', err);
            
            let errorMessage = 'Erreur lors du chargement des véhicules';
            
            if (err.response) {
                switch (err.response.status) {
                    case 401:
                        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                        // Optionnel: déclencher une déconnexion automatique
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.reload();
                        break;
                    case 403:
                        errorMessage = 'Accès non autorisé';
                        break;
                    case 404:
                        errorMessage = 'Service non trouvé';
                        break;
                    case 500:
                        errorMessage = 'Erreur serveur';
                        break;
                    default:
                        errorMessage = `Erreur ${err.response.status}: ${err.response.statusText}`;
                }
            } else if (err.request) {
                errorMessage = 'Impossible de contacter le serveur';
            } else {
                errorMessage = err.message;
            }
            
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    // Effect pour charger les véhicules
    useEffect(() => {
        if (token) {
            fetchVehicles();
        }
    }, [token]);

    // Gestion du changement de véhicule
    const handleVehicleChange = (event) => {
        const vehicleId = event.target.value;
        if (onVehicleSelect) {
            onVehicleSelect(vehicleId);
        }
    };

    // Fonction pour reformater les données du véhicule
    const formatVehicleDisplay = (vehicle) => {
        return `${vehicle.marque} ${vehicle.modele} (${vehicle.immatriculation})`;
    };

    // Fonction de retry
    const handleRetry = () => {
        fetchVehicles();
    };

    if (!token) {
        return (
            <div className="vehicle-selector-error">
                <p>Authentification requise</p>
            </div>
        );
    }

    return (
        <div className="vehicle-selector">
            <div className="selector-header">
                <label htmlFor="vehicle-select">Sélectionner un véhicule :</label>
                {error && (
                    <button 
                        onClick={handleRetry} 
                        className="retry-button"
                        disabled={loading}
                    >
                        🔄 Réessayer
                    </button>
                )}
            </div>

            {loading && (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <span>Chargement des véhicules...</span>
                </div>
            )}

            {error && (
                <div className="error-state">
                    <span className="error-message">⚠️ {error}</span>
                </div>
            )}

            <select
                id="vehicle-select"
                value={selectedVehicleId || ''}
                onChange={handleVehicleChange}
                disabled={loading || !!error}
                className={`vehicle-select ${error ? 'error' : ''}`}
            >
                <option value="">
                    {loading ? 'Chargement...' : 'Choisir un véhicule'}
                </option>
                
                {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                        {formatVehicleDisplay(vehicle)}
                    </option>
                ))}
            </select>

            {vehicles.length === 0 && !loading && !error && (
                <div className="no-vehicles">
                    <p>Aucun véhicule disponible</p>
                </div>
            )}

            {vehicles.length > 0 && (
                <div className="vehicles-count">
                    {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''} disponible{vehicles.length > 1 ? 's' : ''}
                </div>
            )}
        </div>
    );
};

export default VehicleSelector;