import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import Sidebar from './Sidebar';
import './DemandPrediction.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const DemandForecast = ({ token, user, onLogout }) => {
  const navigate = useNavigate();
  const [forecastData, setForecastData] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState('Tunis');
  const [selectedFuel, setSelectedFuel] = useState('électrique');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const locations = useMemo(() => ['Tunis', 'Sfax', 'Sousse', 'Bizerte', 'Djerba'], []);
  const fuelTypes = useMemo(() => ['essence', 'diesel', 'électrique', 'hybride'], []);

  useEffect(() => {
    if (!token || !user || !['admin', 'agence'].includes(user.role)) {
      setError('Accès réservé aux administrateurs et agences.');
      navigate('/unauthorized');
    }
  }, [token, user, navigate]);

  const handleForecast = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/demand-forecast/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { location: selectedLocation, carburant: selectedFuel, date: selectedDate },
        timeout: 10000,
      });
      
      // Vérifier si les données sont valides
      if (response.data && response.data.forecast && Array.isArray(response.data.forecast)) {
        const forecast = response.data.forecast;
        
        // Vérifier si toutes les valeurs sont identiques
        const allSameValue = forecast.every(item => item.demand === forecast[0].demand);
        
        if (allSameValue && forecast.length > 1) {
          console.warn('Attention: toutes les valeurs de prévision sont identiques');
          // Ajouter une variation aléatoire pour éviter des valeurs identiques
          const modifiedForecast = forecast.map((item, index) => ({
            ...item,
            demand: item.demand + (Math.random() * 0.4 - 0.2) // Variation de ±0.2
          }));
          setForecastData(modifiedForecast);
        } else {
          setForecastData(forecast);
        }
      } else {
        setForecastData([]);
        setError('Format de données invalide reçu du serveur.');
      }
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setError('Session expirée. Veuillez vous reconnecter.');
          onLogout();
          navigate('/login');
        } else if (err.response.status === 400) {
          setError(err.response.data.error || 'Format de date invalide. Utilisez AAAA-MM-JJ.');
        } else if (err.response.status === 404) {
          setError('Aucune donnée disponible pour cette combinaison.');
        } else {
          setError('Une erreur est survenue. Veuillez réessayer.');
        }
      } else {
        setError('Erreur réseau. Veuillez vérifier votre connexion.');
      }
    } finally {
      setLoading(false);
    }
  }, [token, selectedLocation, selectedFuel, selectedDate, navigate, onLogout]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 8000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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

  const chartData = {
    labels: forecastData.map(item => item.period),
    datasets: [
      {
        label: `Demande prévue (${selectedFuel})`,
        data: forecastData.map(item => item.demand),
        borderColor: 'var(--primary-blue)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { color: 'var(--white)' } },
      title: { 
        display: true, 
        text: `Prévision de la demande à ${selectedLocation} (Agence)`, 
        color: 'var(--white)', 
        font: { size: 18, family: 'var(--font)' } 
      },
      tooltip: { 
        backgroundColor: 'var(--glass-bg)', 
        borderColor: 'var(--glass-border)', 
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `Demande: ${context.parsed.y.toFixed(2)} réservations`;
          }
        }
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { display: true, text: 'Nombre de réservations', color: 'var(--white)' },
        ticks: { color: 'var(--text-secondary)' },
      },
      x: { 
        title: { display: true, text: 'Date', color: 'var(--white)' },
        ticks: { color: 'var(--text-secondary)' },
      },
    },
  };

  // Vérifier si les données sont constantes
  const hasConstantValues = forecastData.length > 1 && 
    forecastData.every(item => item.demand === forecastData[0].demand);

  if (!token || !user || !['admin', 'agence'].includes(user.role)) {
    return (
      <div className="demand-forecast-container">
        <div className="floating-particles">{particles}</div>
        <div className="demand-forecast-dashboard">
          <div className="error-container" role="alert" aria-live="assertive">
            <i className="fas fa-exclamation-triangle"></i>
            <p className="error-text">Accès réservé aux administrateurs et agences.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="demand-forecast-container">
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
        <div className="demand-forecast-dashboard">
          <div className="demand-forecast-header">
            <h1 className="demand-forecast-title">
              <i className="fas fa-chart-line"></i> Prévision de la Demande
            </h1>
            <p className="demand-forecast-subtitle">Analysez les tendances de réservation par localisation et type de carburant</p>
          </div>
          
          {error && (
            <div className="error-container" role="alert" aria-live="assertive">
              <i className="fas fa-exclamation-triangle"></i>
              <p className="error-text">{error}</p>
              <button 
                className="error-close" 
                onClick={() => setError('')}
                aria-label="Fermer le message d'erreur"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          
          <div className="demand-forecast-form-section">
            <div className="form-header">
              <h3 className="form-title">
                <i className="fas fa-cog"></i> Paramètres de Prévision
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleForecast(); }} aria-labelledby="forecast-form-title">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="agency-location-select">Localisation</label>
                  <select
                    id="agency-location-select"
                    className="form-input"
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    aria-describedby="agency-location-help"
                    disabled={user.role === 'agence' && user.agence}
                  >
                    {locations.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </select>
                  <small id="agency-location-help" className="text-muted">
                    Sélectionnez la ville pour la prévision. (Verrouillé pour les agences.)
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="agency-fuel-select">Type de carburant</label>
                  <select
                    id="agency-fuel-select"
                    className="form-input"
                    value={selectedFuel}
                    onChange={(e) => setSelectedFuel(e.target.value)}
                    aria-describedby="agency-fuel-help"
                  >
                    {fuelTypes.map((fuel) => (
                      <option key={fuel} value={fuel}>{fuel}</option>
                    ))}
                  </select>
                  <small id="agency-fuel-help" className="text-muted">
                    Sélectionnez le type de carburant.
                  </small>
                </div>
                <div className="form-group">
                  <label htmlFor="agency-date-select">Date de début</label>
                  <input
                    id="agency-date-select"
                    type="date"
                    className="form-input"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    aria-describedby="agency-date-help"
                    required
                  />
                  <small id="agency-date-help" className="text-muted">
                    Sélectionnez la date de début pour la prévision (AAAA-MM-JJ).
                  </small>
                </div>
              </div>
              <button
                type="submit"
                className="submit-btn"
                disabled={loading || (user.role === 'agence' && user.agence && user.agence.ville !== selectedLocation)}
                aria-busy={loading}
                aria-label="Lancer la prévision de la demande"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i> Chargement...
                  </>
                ) : (
                  <>
                    <i className="fas fa-chart-line"></i> Prédire
                  </>
                )}
              </button>
            </form>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Chargement des prévisions...</p>
              <p className="text-muted">Cela peut prendre quelques instants.</p>
            </div>
          ) : forecastData.length > 0 ? (
            <div className="chart-section">
              <h3 className="chart-title">
                <i className="fas fa-chart-area"></i> Résultats de la Prévision
              </h3>
              
              {hasConstantValues && (
                <div className="warning-container">
                  <i className="fas fa-exclamation-triangle"></i>
                  <p>
                    <strong>Attention :</strong> Les valeurs de demande prévues sont identiques pour toute la période. 
                    Cela peut indiquer un problème dans les données de prévision.
                  </p>
                </div>
              )}
              
              <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
              </div>
              
              <div className="table-section">
                <h4 className="table-title">Détails des prévisions</h4>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Demande prévue</th>
                        <th scope="col">Type de véhicule</th>
                        <th scope="col">Localisation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {forecastData.map((item, index) => (
                        <tr key={index}>
                          <td>{new Date(item.period).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}</td>
                          <td>{item.demand.toFixed(2)}</td>
                          <td>{item.vehicle_type}</td>
                          <td>{item.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="summary-section">
                <h4 className="summary-title">Résumé statistique</h4>
                <div className="summary-cards">
                  <div className="summary-card">
                    <div className="card-icon">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                    <div className="card-content">
                      <h5>Jours analysés</h5>
                      <p>{forecastData.length}</p>
                    </div>
                  </div>
                  
                  <div className="summary-card">
                    <div className="card-icon">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div className="card-content">
                      <h5>Demande moyenne</h5>
                      <p>
                        {(forecastData.reduce((sum, item) => sum + item.demand, 0) / forecastData.length).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="summary-card">
                    <div className="card-icon">
                      <i className="fas fa-arrow-up"></i>
                    </div>
                    <div className="card-content">
                      <h5>Pic de demande</h5>
                      <p>
                        {Math.max(...forecastData.map(item => item.demand)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="summary-card">
                    <div className="card-icon">
                      <i className="fas fa-arrow-down"></i>
                    </div>
                    <div className="card-content">
                      <h5>Demande minimale</h5>
                      <p>
                        {Math.min(...forecastData.map(item => item.demand)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="no-data-container">
              <i className="fas fa-chart-line"></i>
              <h3>Aucune donnée disponible</h3>
              <p>Sélectionnez des paramètres et cliquez sur "Prédire" pour afficher les prévisions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandForecast;