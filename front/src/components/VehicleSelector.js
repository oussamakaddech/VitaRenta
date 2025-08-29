import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import debounce from 'lodash/debounce';
import './VehicleSelector.css';

const VEHICLE_RENTAL_SELECTOR_API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const VEHICLE_RENTAL_SELECTOR_REQUEST_TIMEOUT = 15000;
const VEHICLE_RENTAL_SELECTOR_RETRY_DELAY = 2000;

// Configuration
const VEHICLE_RENTAL_SELECTOR_CONFIG = {
  DEBOUNCE_DELAY: 300,
  MAX_RETRIES: 3,
  VEHICLE_DISPLAY_FORMAT: {
    SIMPLE: 'simple',
    DETAILED: 'detailed',
    COMPACT: 'compact'
  },
  SORT_OPTIONS: {
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
    BRAND: 'brand',
    MODEL: 'model',
    YEAR: 'year'
  }
};

const VehicleRentalSelector = ({ 
  token, 
  user, 
  onVehicleSelect, 
  selectedVehicleId,
  className = '',
  placeholder = '-- Choisissez un véhicule --',
  displayFormat = VEHICLE_RENTAL_SELECTOR_CONFIG.VEHICLE_DISPLAY_FORMAT.DETAILED,
  sortBy = VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.BRAND,
  showPricing = true,
  showAvailabilityCount = true,
  filterByStatus = 'disponible',
  onError = null,
  onSuccess = null,
  disabled = false,
  autoRefresh = false,
  refreshInterval = 30000, // 30 seconds
  enableSearch = false,
  showVehicleImages = false,
  groupByBrand = false,
  maxVehicles = null
}) => {
  // États principaux avec préfixes spécifiques
  const [vehicleRentalSelectorVehicles, setVehicleRentalSelectorVehicles] = useState([]);
  const [vehicleRentalSelectorLoading, setVehicleRentalSelectorLoading] = useState(false);
  const [vehicleRentalSelectorError, setVehicleRentalSelectorError] = useState(null);
  const [vehicleRentalSelectorRetryCount, setVehicleRentalSelectorRetryCount] = useState(0);
  const [vehicleRentalSelectorSearchTerm, setVehicleRentalSelectorSearchTerm] = useState('');
  const [vehicleRentalSelectorIsDropdownOpen, setVehicleRentalSelectorIsDropdownOpen] = useState(false);
  const [vehicleRentalSelectorSelectedVehicle, setVehicleRentalSelectorSelectedVehicle] = useState(null);

  // Debounced search pour améliorer les performances
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setVehicleRentalSelectorSearchTerm(searchTerm);
    }, VEHICLE_RENTAL_SELECTOR_CONFIG.DEBOUNCE_DELAY),
    []
  );

  // Fonction pour récupérer les véhicules avec gestion d'erreur robuste
  const fetchVehicleRentalSelectorVehicles = useCallback(async (isRetry = false) => {
    if (!token) {
      const errorMsg = 'Token d\'authentification manquant';
      setVehicleRentalSelectorError(errorMsg);
      if (onError) onError(new Error(errorMsg));
      return;
    }

    if (!isRetry) {
      setVehicleRentalSelectorLoading(true);
      setVehicleRentalSelectorError(null);
    }

    try {
      console.log('VehicleRentalSelector: Fetching vehicles with token:', token ? 'Present' : 'Missing');
      
      const response = await axios.get(
        `${VEHICLE_RENTAL_SELECTOR_API_BASE_URL}/api/vehicules/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: VEHICLE_RENTAL_SELECTOR_REQUEST_TIMEOUT,
          params: {
            ...(filterByStatus && { statut: filterByStatus }),
            ...(maxVehicles && { limit: maxVehicles })
          }
        }
      );

      console.log('VehicleRentalSelector: Response received:', {
        status: response.status,
        dataType: Array.isArray(response.data) ? 'array' : 'object',
        length: response.data?.length || response.data?.results?.length || 0
      });

      let vehiclesData = [];

      if (response.data && Array.isArray(response.data)) {
        vehiclesData = response.data;
      } else if (response.data && response.data.results && Array.isArray(response.data.results)) {
        vehiclesData = response.data.results;
      } else if (response.data && typeof response.data === 'object') {
        // Gérer différents formats de réponse API
        vehiclesData = Object.values(response.data).filter(item => 
          typeof item === 'object' && item.id
        );
      } else {
        throw new Error('Format de données API invalide');
      }

      // Filtrage et tri des véhicules
      let processedVehicles = vehiclesData
        .filter(vehicle => vehicle && vehicle.id)
        .map(vehicle => ({
          ...vehicle,
          vehicleRentalSelectorId: `vrs_${vehicle.id}_${Date.now()}`,
          displayName: formatVehicleRentalSelectorDisplay(vehicle)
        }));

      // Filtrage par statut
      if (filterByStatus) {
        processedVehicles = processedVehicles.filter(
          vehicle => vehicle.statut === filterByStatus
        );
      }

      // Tri des véhicules
      processedVehicles = sortVehicleRentalSelectorVehicles(processedVehicles, sortBy);

      setVehicleRentalSelectorVehicles(processedVehicles);
      setVehicleRentalSelectorRetryCount(0);

      // Callback de succès
      if (onSuccess) {
        onSuccess({
          vehiclesCount: processedVehicles.length,
          availableCount: processedVehicles.filter(v => v.statut === 'disponible').length
        });
      }

      console.log('VehicleRentalSelector: Successfully loaded vehicles:', processedVehicles.length);

    } catch (err) {
      console.error('VehicleRentalSelector: Fetch error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        retryCount: vehicleRentalSelectorRetryCount
      });

      handleVehicleRentalSelectorFetchError(err);
    } finally {
      setVehicleRentalSelectorLoading(false);
    }
  }, [
    token, 
    filterByStatus, 
    maxVehicles, 
    sortBy, 
    onError, 
    onSuccess, 
    vehicleRentalSelectorRetryCount
  ]);

  // Gestion robuste des erreurs avec retry automatique
  const handleVehicleRentalSelectorFetchError = useCallback((err) => {
    let errorMessage = 'Erreur lors du chargement des véhicules';
    let shouldRetry = false;

    if (err.response) {
      const { status, statusText } = err.response;
      switch (status) {
        case 401:
          errorMessage = 'Session expirée. Veuillez vous reconnecter.';
          // Auto-cleanup sur erreur 401
          setTimeout(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (typeof window !== 'undefined' && window.location) {
              window.location.reload();
            }
          }, 2000);
          break;
        case 403:
          errorMessage = 'Accès non autorisé aux véhicules';
          break;
        case 404:
          errorMessage = 'Service de véhicules non trouvé';
          shouldRetry = true;
          break;
        case 429:
          errorMessage = 'Trop de requêtes. Veuillez patienter...';
          shouldRetry = true;
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          errorMessage = 'Erreur serveur temporaire';
          shouldRetry = true;
          break;
        default:
          errorMessage = `Erreur ${status}: ${statusText}`;
          shouldRetry = status >= 500;
      }
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = 'Délai d\'attente dépassé. Vérifiez votre connexion.';
      shouldRetry = true;
    } else if (err.request) {
      errorMessage = 'Impossible de contacter le serveur';
      shouldRetry = true;
    } else {
      errorMessage = err.message || 'Erreur inconnue';
    }

    setVehicleRentalSelectorError(errorMessage);

    // Retry automatique si approprié
    if (shouldRetry && vehicleRentalSelectorRetryCount < VEHICLE_RENTAL_SELECTOR_CONFIG.MAX_RETRIES) {
      const delay = VEHICLE_RENTAL_SELECTOR_RETRY_DELAY * Math.pow(2, vehicleRentalSelectorRetryCount);
      console.log(`VehicleRentalSelector: Retrying in ${delay}ms (attempt ${vehicleRentalSelectorRetryCount + 1})`);
      
      setTimeout(() => {
        setVehicleRentalSelectorRetryCount(prev => prev + 1);
        fetchVehicleRentalSelectorVehicles(true);
      }, delay);
    }

    // Callback d'erreur
    if (onError) {
      onError(new Error(errorMessage), {
        status: err.response?.status,
        retryCount: vehicleRentalSelectorRetryCount,
        canRetry: shouldRetry
      });
    }
  }, [vehicleRentalSelectorRetryCount, onError, fetchVehicleRentalSelectorVehicles]);

  // Formatage de l'affichage des véhicules
  const formatVehicleRentalSelectorDisplay = useCallback((vehicle) => {
    if (!vehicle) return '';

    const { marque = '', modele = '', immatriculation = '', prix_par_jour, annee } = vehicle;

    switch (displayFormat) {
      case VEHICLE_RENTAL_SELECTOR_CONFIG.VEHICLE_DISPLAY_FORMAT.SIMPLE:
        return `${marque} ${modele}`.trim();
      
      case VEHICLE_RENTAL_SELECTOR_CONFIG.VEHICLE_DISPLAY_FORMAT.COMPACT:
        return `${marque} ${modele}${prix_par_jour && showPricing ? ` - ${prix_par_jour}€/j` : ''}`.trim();
      
      case VEHICLE_RENTAL_SELECTOR_CONFIG.VEHICLE_DISPLAY_FORMAT.DETAILED:
      default:
        let display = `${marque} ${modele}`.trim();
        if (annee) display += ` (${annee})`;
        if (immatriculation) display += ` [${immatriculation}]`;
        if (prix_par_jour && showPricing) display += ` - ${prix_par_jour}€/jour`;
        return display;
    }
  }, [displayFormat, showPricing]);

  // Tri des véhicules
  const sortVehicleRentalSelectorVehicles = useCallback((vehicles, sortOption) => {
    if (!Array.isArray(vehicles)) return [];

    return [...vehicles].sort((a, b) => {
      switch (sortOption) {
        case VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.PRICE_ASC:
          return (a.prix_par_jour || 0) - (b.prix_par_jour || 0);
        case VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.PRICE_DESC:
          return (b.prix_par_jour || 0) - (a.prix_par_jour || 0);
        case VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.BRAND:
          return (a.marque || '').localeCompare(b.marque || '', 'fr', { sensitivity: 'base' });
        case VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.MODEL:
          return (a.modele || '').localeCompare(b.modele || '', 'fr', { sensitivity: 'base' });
        case VEHICLE_RENTAL_SELECTOR_CONFIG.SORT_OPTIONS.YEAR:
          return (b.annee || 0) - (a.annee || 0);
        default:
          return 0;
      }
    });
  }, []);

  // Filtrage par recherche
  const filteredVehicleRentalSelectorVehicles = useMemo(() => {
    if (!vehicleRentalSelectorSearchTerm) return vehicleRentalSelectorVehicles;

    const searchLower = vehicleRentalSelectorSearchTerm.toLowerCase();
    return vehicleRentalSelectorVehicles.filter(vehicle => 
      (vehicle.marque || '').toLowerCase().includes(searchLower) ||
      (vehicle.modele || '').toLowerCase().includes(searchLower) ||
      (vehicle.immatriculation || '').toLowerCase().includes(searchLower) ||
      vehicle.displayName.toLowerCase().includes(searchLower)
    );
  }, [vehicleRentalSelectorVehicles, vehicleRentalSelectorSearchTerm]);

  // Groupement par marque
  const groupedVehicleRentalSelectorVehicles = useMemo(() => {
    if (!groupByBrand) return null;

    return filteredVehicleRentalSelectorVehicles.reduce((groups, vehicle) => {
      const brand = vehicle.marque || 'Autres';
      if (!groups[brand]) groups[brand] = [];
      groups[brand].push(vehicle);
      return groups;
    }, {});
  }, [filteredVehicleRentalSelectorVehicles, groupByBrand]);

  // Gestion de la sélection de véhicule
  const handleVehicleRentalSelectorVehicleChange = useCallback((event) => {
    const vehicleId = event.target.value;
    const selectedVehicle = vehicleRentalSelectorVehicles.find(v => v.id?.toString() === vehicleId);
    
    setVehicleRentalSelectorSelectedVehicle(selectedVehicle);
    setVehicleRentalSelectorIsDropdownOpen(false);

    if (onVehicleSelect) {
      onVehicleSelect(vehicleId, selectedVehicle);
    }

    console.log('VehicleRentalSelector: Vehicle selected:', {
      id: vehicleId,
      vehicle: selectedVehicle ? `${selectedVehicle.marque} ${selectedVehicle.modele}` : 'None'
    });
  }, [vehicleRentalSelectorVehicles, onVehicleSelect]);

  // Gestion de la recherche
  const handleVehicleRentalSelectorSearchChange = useCallback((event) => {
    const value = event.target.value;
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Retry manuel
  const handleVehicleRentalSelectorRetry = useCallback(() => {
    setVehicleRentalSelectorRetryCount(0);
    fetchVehicleRentalSelectorVehicles();
  }, [fetchVehicleRentalSelectorVehicles]);

  // Actualisation manuelle
  const handleVehicleRentalSelectorRefresh = useCallback(() => {
    setVehicleRentalSelectorRetryCount(0);
    fetchVehicleRentalSelectorVehicles();
  }, [fetchVehicleRentalSelectorVehicles]);

  // Effect pour charger les véhicules
  useEffect(() => {
    if (token) {
      fetchVehicleRentalSelectorVehicles();
    }
  }, [token, fetchVehicleRentalSelectorVehicles]);

  // Effect pour l'auto-refresh
  useEffect(() => {
    if (!autoRefresh || !token) return;

    const interval = setInterval(() => {
      fetchVehicleRentalSelectorVehicles();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, token, fetchVehicleRentalSelectorVehicles]);

  // Effect pour synchroniser la sélection
  useEffect(() => {
    if (selectedVehicleId) {
      const vehicle = vehicleRentalSelectorVehicles.find(v => v.id?.toString() === selectedVehicleId?.toString());
      setVehicleRentalSelectorSelectedVehicle(vehicle || null);
    }
  }, [selectedVehicleId, vehicleRentalSelectorVehicles]);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Rendu conditionnel pour différents états
  if (!token) {
    return (
      <div className={`vehicle-rental-selector-container ${className}`}>
        <div className="vehicle-rental-selector-error">
          <div className="vehicle-rental-selector-error-icon">
            <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
          </div>
          <h3>Authentification requise</h3>
          <p>Veuillez vous connecter pour accéder aux véhicules disponibles</p>
          <div className="vehicle-rental-selector-error-actions">
            <button 
              className="vehicle-rental-selector-login-btn"
              onClick={() => window.location.href = '/login'}
              aria-label="Se connecter"
            >
              <i className="fas fa-sign-in-alt"></i>
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (vehicleRentalSelectorLoading && vehicleRentalSelectorVehicles.length === 0) {
    return (
      <div className={`vehicle-rental-selector-container ${className}`}>
        <div className="vehicle-rental-selector-loading">
          <div className="vehicle-rental-selector-loading-spinner">
            <i className="fas fa-car fa-spin" aria-hidden="true"></i>
          </div>
          <p>Chargement des véhicules disponibles...</p>
          <div className="vehicle-rental-selector-progress-bar">
            <div className="vehicle-rental-selector-progress-fill"></div>
          </div>
        </div>
      </div>
    );
  }

  if (vehicleRentalSelectorError && vehicleRentalSelectorVehicles.length === 0) {
    return (
      <div className={`vehicle-rental-selector-container ${className}`}>
        <div className="vehicle-rental-selector-error">
          <div className="vehicle-rental-selector-error-icon">
            <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
          </div>
          <h3>Erreur de chargement</h3>
          <p>{vehicleRentalSelectorError}</p>
          <div className="vehicle-rental-selector-error-actions">
            <button 
              className="vehicle-rental-selector-retry-btn"
              onClick={handleVehicleRentalSelectorRetry}
              disabled={vehicleRentalSelectorLoading}
              aria-label="Réessayer le chargement"
            >
              <i className={`fas ${vehicleRentalSelectorLoading ? 'fa-spinner fa-spin' : 'fa-redo'}`}></i>
              {vehicleRentalSelectorLoading ? 'Chargement...' : 'Réessayer'}
            </button>
          </div>
          {vehicleRentalSelectorRetryCount > 0 && (
            <div className="vehicle-rental-selector-retry-info">
              <small>Tentative {vehicleRentalSelectorRetryCount}/{VEHICLE_RENTAL_SELECTOR_CONFIG.MAX_RETRIES}</small>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (vehicleRentalSelectorVehicles.length === 0 && !vehicleRentalSelectorLoading) {
    return (
      <div className={`vehicle-rental-selector-container ${className}`}>
        <div className="vehicle-rental-selector-empty">
          <div className="vehicle-rental-selector-empty-icon">
            <i className="fas fa-car" aria-hidden="true"></i>
          </div>
          <h3>Aucun véhicule disponible</h3>
          <p>
            {filterByStatus === 'disponible' 
              ? 'Il n\'y a actuellement aucun véhicule disponible à la location'
              : 'Aucun véhicule ne correspond aux critères sélectionnés'
            }
          </p>
          <div className="vehicle-rental-selector-empty-actions">
            <button 
              className="vehicle-rental-selector-refresh-btn"
              onClick={handleVehicleRentalSelectorRefresh}
              disabled={vehicleRentalSelectorLoading}
              aria-label="Actualiser la liste"
            >
              <i className={`fas ${vehicleRentalSelectorLoading ? 'fa-spinner fa-spin' : 'fa-refresh'}`}></i>
              Actualiser
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Rendu principal du sélecteur
  const availableCount = filteredVehicleRentalSelectorVehicles.length;

  return (
    <div className={`vehicle-rental-selector-container ${className}`}>
      <div className="vehicle-rental-selector">
        {/* Label et actions de contrôle */}
        <div className="vehicle-rental-selector-header">
          <label 
            htmlFor="vehicle-rental-selector-select" 
            className="vehicle-rental-selector-label"
          >
            <i className="fas fa-car" aria-hidden="true"></i>
            <span>Sélectionner un véhicule</span>
            {vehicleRentalSelectorLoading && (
              <i className="fas fa-spinner fa-spin vehicle-rental-selector-loading-icon" aria-hidden="true"></i>
            )}
          </label>
          
          <div className="vehicle-rental-selector-controls">
            {autoRefresh && (
              <button 
                className="vehicle-rental-selector-control-btn"
                onClick={handleVehicleRentalSelectorRefresh}
                disabled={vehicleRentalSelectorLoading || disabled}
                title="Actualiser"
                aria-label="Actualiser la liste des véhicules"
              >
                <i className={`fas ${vehicleRentalSelectorLoading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`}></i>
              </button>
            )}
          </div>
        </div>

        {/* Barre de recherche */}
        {enableSearch && (
          <div className="vehicle-rental-selector-search">
            <div className="vehicle-rental-selector-search-input-wrapper">
              <i className="fas fa-search" aria-hidden="true"></i>
              <input
                type="text"
                className="vehicle-rental-selector-search-input"
                placeholder="Rechercher par marque, modèle..."
                onChange={handleVehicleRentalSelectorSearchChange}
                disabled={disabled}
                aria-label="Rechercher un véhicule"
              />
            </div>
          </div>
        )}

        {/* Dropdown principal */}
        <div className="vehicle-rental-selector-dropdown-wrapper">
          <select
            id="vehicle-rental-selector-select"
            className="vehicle-rental-selector-dropdown"
            value={selectedVehicleId || ''}
            onChange={handleVehicleRentalSelectorVehicleChange}
            disabled={disabled || vehicleRentalSelectorLoading}
            aria-describedby="vehicle-rental-selector-info"
          >
            <option value="">{placeholder}</option>
            
            {groupByBrand && groupedVehicleRentalSelectorVehicles ? (
              // Rendu groupé par marque
              Object.entries(groupedVehicleRentalSelectorVehicles).map(([brand, vehicles]) => (
                <optgroup key={brand} label={brand}>
                  {vehicles.map((vehicle) => (
                    <option 
                      key={vehicle.vehicleRentalSelectorId || vehicle.id} 
                      value={vehicle.id}
                      disabled={vehicle.statut !== 'disponible'}
                    >
                      {vehicle.displayName}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              // Rendu standard
              filteredVehicleRentalSelectorVehicles.map((vehicle) => (
                <option 
                  key={vehicle.vehicleRentalSelectorId || vehicle.id} 
                  value={vehicle.id}
                  disabled={vehicle.statut !== 'disponible'}
                  className={vehicle.statut !== 'disponible' ? 'vehicle-rental-selector-option-disabled' : ''}
                >
                  {vehicle.displayName}
                </option>
              ))
            )}
          </select>

          {/* Indicateur de statut */}
          <div className="vehicle-rental-selector-status-indicator">
            {vehicleRentalSelectorLoading && (
              <i className="fas fa-spinner fa-spin" aria-hidden="true"></i>
            )}
            {vehicleRentalSelectorError && (
              <i className="fas fa-exclamation-triangle vehicle-rental-selector-error-indicator" aria-hidden="true"></i>
            )}
          </div>
        </div>

        {/* Informations sur les véhicules */}
        {showAvailabilityCount && (
          <div 
            id="vehicle-rental-selector-info" 
            className="vehicle-rental-selector-info"
          >
            <div className="vehicle-rental-selector-info-content">
              <i className="fas fa-info-circle" aria-hidden="true"></i>
              <span>
                {enableSearch && vehicleRentalSelectorSearchTerm ? (
                  <>
                    {filteredVehicleRentalSelectorVehicles.length} résultat{filteredVehicleRentalSelectorVehicles.length !== 1 ? 's' : ''} 
                    {filteredVehicleRentalSelectorVehicles.length !== vehicleRentalSelectorVehicles.length && 
                      ` sur ${vehicleRentalSelectorVehicles.length}`}
                  </>
                ) : (
                  <>
                    {availableCount} véhicule{availableCount !== 1 ? 's' : ''} disponible{availableCount !== 1 ? 's' : ''}
                    {filterByStatus !== 'disponible' && ` (${vehicleRentalSelectorVehicles.filter(v => v.statut === 'disponible').length} en location)`}
                  </>
                )}
              </span>
            </div>
            
            {vehicleRentalSelectorError && (
              <div className="vehicle-rental-selector-error-message">
                <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                <span>{vehicleRentalSelectorError}</span>
              </div>
            )}
          </div>
        )}

        {/* Affichage du véhicule sélectionné */}
        {vehicleRentalSelectorSelectedVehicle && showVehicleImages && (
          <div className="vehicle-rental-selector-selected-preview">
            <div className="vehicle-rental-selector-selected-info">
              <h4>{vehicleRentalSelectorSelectedVehicle.marque} {vehicleRentalSelectorSelectedVehicle.modele}</h4>
              {vehicleRentalSelectorSelectedVehicle.prix_par_jour && showPricing && (
                <p className="vehicle-rental-selector-selected-price">
                  {vehicleRentalSelectorSelectedVehicle.prix_par_jour}€/jour
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Export des configurations pour utilisation externe
export const VehicleRentalSelectorConfig = VEHICLE_RENTAL_SELECTOR_CONFIG;
export default VehicleRentalSelector;
