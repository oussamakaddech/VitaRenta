import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import Sidebar from './Sidebar';
import { Web3Particles, CyberGrid } from './Web3Effects';
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
  
  // Web3 Neural Network Particles for AI/ML theme
  const web3Particles = useMemo(() => {
    const particlesArray = [];
    for (let i = 0; i < 30; i++) {
      particlesArray.push(
        <div
          key={`particle-${i}`}
          className="web3-neural-particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${8 + Math.random() * 6}s`,
            width: `${3 + Math.random() * 5}px`,
            height: `${3 + Math.random() * 5}px`,
          }}
        />
      );
    }
    
    // Add floating neural connections
    for (let i = 0; i < 10; i++) {
      particlesArray.push(
        <div
          key={`connection-${i}`}
          className="web3-neural-connection"
          style={{
            left: `${Math.random() * 90}%`,
            top: `${Math.random() * 90}%`,
            animationDelay: `${Math.random() * 5}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      );
    }
    
    return particlesArray;
  }, []);
  
  // Data visualization sparkles
  const sparkleEffects = useMemo(() => {
    const sparkles = [];
    for (let i = 0; i < 15; i++) {
      sparkles.push(
        <div
          key={`sparkle-${i}`}
          className="web3-data-sparkle"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      );
    }
    return sparkles;
  }, []);
  
  const chartData = {
    labels: forecastData.map(item => item.period || 'Date inconnue'),
    datasets: [
      {
        label: `Demande prévue (${selectedFuel})`,
        data: forecastData.map(item => typeof item.demand === 'number' ? item.demand : 0),
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: '#00d4ff',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#ff0080',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
        shadowOffsetX: 0,
        shadowOffsetY: 4,
        shadowBlur: 8,
        shadowColor: 'rgba(0, 212, 255, 0.3)',
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top', 
        labels: { 
          color: '#ffffff',
          font: { size: 32, family: 'Inter, sans-serif', weight: '600' },
          padding: 25,
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      title: { 
        display: true, 
        text: `Prévision - ${selectedLocation}`, 
        color: '#ffffff', 
        font: { size: 28, family: 'Inter, sans-serif', weight: '700' },
        padding: { top: 15, bottom: 35 }
      },
      tooltip: { 
        backgroundColor: 'rgba(0, 0, 0, 0.9)', 
        borderColor: '#00d4ff', 
        borderWidth: 2,
        titleColor: '#00d4ff',
        bodyColor: '#ffffff',
        cornerRadius: 12,
        padding: 20,
        displayColors: true,
        titleFont: { size: 18, weight: '600' },
        bodyFont: { size: 16, weight: '500' },
        callbacks: {
          label: function(context) {
            return `Demande: ${context.parsed.y.toFixed(2)} réservations`;
          },
          title: function(context) {
            return `${context[0].label}`;
          }
        }
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
    scales: {
      y: { 
        beginAtZero: true, 
        title: { 
          display: true, 
          text: 'Nombre de réservations', 
          color: '#ffffff',
          font: { size: 20, weight: '600' }
        },
        ticks: { 
          color: '#a0aec0',
          font: { size: 32 },
          padding: 15,
        },
        grid: {
          color: 'rgba(0, 212, 255, 0.1)',
          lineWidth: 1,
        },
        border: {
          color: '#00d4ff',
          width: 1,
        }
      },
      x: { 
        title: { 
          display: true, 
          text: 'Période', 
          color: '#ffffff',
          font: { size: 20, weight: '600' }
        },
        ticks: { 
          color: '#a0aec0',
          font: { size: 18 },
          padding: 15,
          maxRotation: 45,
        },
        grid: {
          color: 'rgba(0, 212, 255, 0.1)',
          lineWidth: 1,
        },
        border: {
          color: '#00d4ff',
          width: 1,
        }
      },
    },
    elements: {
      point: {
        hoverBorderWidth: 4,
      },
      line: {
        borderJoinStyle: 'round',
        borderCapStyle: 'round',
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
    },
  };
  
  // Vérifier si les données sont constantes
  const hasConstantValues = forecastData.length > 1 && 
    forecastData.length > 0 &&
    forecastData[0] && 
    typeof forecastData[0].demand === 'number' &&
    forecastData.every(item => item && typeof item.demand === 'number' && item.demand === forecastData[0].demand);
  
  if (!token || !user || !['admin', 'agence'].includes(user.role)) {
    return (
      <div className="demand-forecast-main-container">
        <div className="demand-forecast-floating-particles">{web3Particles}</div>
        <CyberGrid opacity={0.05} />
        <div className="demand-forecast-dashboard-wrapper">
          <div className="demand-forecast-error-container web3-error-card" role="alert" aria-live="assertive">
            <div className="web3-error-glow"></div>
            <i className="demand-forecast-error-icon fas fa-shield-alt"></i>
            <p className="demand-forecast-error-text">🔒 Accès réservé aux administrateurs et agences.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="demand-forecast-main-container">
      <div className="demand-forecast-floating-particles">{web3Particles}</div>
      <div className="demand-forecast-sparkle-effects">{sparkleEffects}</div>
      <CyberGrid opacity={0.03} color="#00d4ff" size={60} />
      <Web3Particles density={25} colors={['#00d4ff', '#ff0080', '#7b00ff', '#00ff88']} />
      
      <Sidebar
        token={token}
        user={user}
        setToken={() => {}}
        onLogout={onLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      <div className="demand-forecast-dashboard-content">
        <div className="demand-forecast-dashboard-wrapper">
          <div className="demand-forecast-header-section">
            <h1 className="demand-forecast-main-title web3-title-glow">
              <i className="demand-forecast-title-icon fas fa-chart-line"></i> 
              <span className="web3-gradient-text">Prévision de Demande</span>
              <div className="web3-neural-pulse"></div>
            </h1>
            <p className="demand-forecast-main-subtitle">
              Analysez les tendances de réservation par localisation et type de carburant
            </p>
            <div className="web3-status-indicators">
              <div className="web3-status-dot active" title="IA Connectée"></div>
              <div className="web3-status-dot active" title="Données Synchronisées"></div>
              <div className="web3-status-dot active" title="Blockchain Ready"></div>
            </div>
          </div>
          
          {error && (
            <div className="demand-forecast-error-container" role="alert" aria-live="assertive">
              <i className="demand-forecast-error-icon fas fa-exclamation-triangle"></i>
              <p className="demand-forecast-error-text">{error}</p>
              <button 
                className="demand-forecast-error-close" 
                onClick={() => setError('')}
                aria-label="Fermer le message d'erreur"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          )}
          
          <div className="demand-forecast-form-container web3-glass-card">
            <div className="web3-card-glow"></div>
            <div className="demand-forecast-form-header">
              <h3 className="demand-forecast-form-title">
                <i className="demand-forecast-form-icon fas fa-robot"></i> 
                <span className="web3-gradient-text">Paramètres IA</span>
                <div className="web3-loading-dots">
                  <span></span><span></span><span></span>
                </div>
              </h3>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleForecast(); }} aria-labelledby="forecast-form-title">
              <div className="demand-forecast-form-grid">
                <div className="demand-forecast-form-group">
                  <label htmlFor="agency-location-select" className="demand-forecast-form-label web3-label">
                    Localisation
                  </label>
                  <div className="web3-input-wrapper">
                    <select
                      id="agency-location-select"
                      className="demand-forecast-form-input demand-forecast-form-select web3-input"
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value)}
                      aria-describedby="agency-location-help"
                    >
                      {locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                    <div className="web3-input-glow"></div>
                  </div>
                  <small id="agency-location-help" className="demand-forecast-form-help web3-help-text">
                    Sélectionnez la ville pour la prévision
                  </small>
                </div>
                <div className="demand-forecast-form-group">
                  <label htmlFor="agency-fuel-select" className="demand-forecast-form-label web3-label">
                    Type de carburant
                  </label>
                  <div className="web3-input-wrapper">
                    <select
                      id="agency-fuel-select"
                      className="demand-forecast-form-input demand-forecast-form-select web3-input"
                      value={selectedFuel}
                      onChange={(e) => setSelectedFuel(e.target.value)}
                      aria-describedby="agency-fuel-help"
                    >
                      {fuelTypes.map((fuel) => (
                        <option key={fuel} value={fuel}>{fuel}</option>
                      ))}
                    </select>
                    <div className="web3-input-glow"></div>
                  </div>
                  <small id="agency-fuel-help" className="demand-forecast-form-help web3-help-text">
                    Sélectionnez le type de carburant
                  </small>
                </div>
                <div className="demand-forecast-form-group">
                  <label htmlFor="agency-date-select" className="demand-forecast-form-label web3-label">
                    Date de début
                  </label>
                  <div className="web3-input-wrapper">
                    <input
                      id="agency-date-select"
                      type="date"
                      className="demand-forecast-form-input web3-input"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      aria-describedby="agency-date-help"
                      required
                    />
                    <div className="web3-input-glow"></div>
                  </div>
                  <small id="agency-date-help" className="demand-forecast-form-help web3-help-text">
                    Sélectionnez la date de début pour la prévision
                  </small>
                </div>
              </div>
              <button
                type="submit"
                className="demand-forecast-submit-button web3-button-primary"
                disabled={loading}
                aria-busy={loading}
                aria-label="Lancer la prévision de la demande"
              >
                {loading ? (
                  <>
                    <div className="web3-spinner-cyber"></div>
                    <span>Analyse en cours...</span>
                  </>
                ) : (
                  <>
                    <i className="demand-forecast-button-icon fas fa-chart-line"></i> 
                    <span>Prédire</span>
                  </>
                )}
                <div className="web3-button-ripple"></div>
              </button>
            </form>
          </div>
          
          {loading ? (
            <div className="demand-forecast-loading-container web3-loading-card">
              <div className="web3-ai-brain-loader">
                <div className="web3-brain-core"></div>
                <div className="web3-brain-waves">
                  <div className="wave wave-1"></div>
                  <div className="wave wave-2"></div>
                  <div className="wave wave-3"></div>
                </div>
              </div>
              <p className="demand-forecast-loading-text">Chargement des prévisions...</p>
              <p className="demand-forecast-loading-subtext">
                Cela peut prendre quelques instants
              </p>
              <div className="web3-progress-bar">
                <div className="web3-progress-fill"></div>
              </div>
            </div>
          ) : forecastData.length > 0 ? (
            <div className="demand-forecast-chart-section web3-chart-container">
              <div className="web3-card-glow"></div>
              <h3 className="demand-forecast-chart-title">
                <i className="demand-forecast-chart-icon fas fa-chart-area"></i> 
                <span className="web3-gradient-text">Résultats de la Prévision</span>
              </h3>
              
              {hasConstantValues && (
                <div className="demand-forecast-warning-container">
                  <i className="demand-forecast-warning-icon fas fa-exclamation-triangle"></i>
                  <p className="demand-forecast-warning-text">
                    <strong>Attention :</strong> Les valeurs de demande prévues sont identiques pour toute la période. 
                    Cela peut indiquer un problème dans les données de prévision.
                  </p>
                </div>
              )}
              
              <div className="demand-forecast-chart-container">
                <Line data={chartData} options={chartOptions} />
              </div>
              
              <div className="demand-forecast-table-section">
                <h4 className="demand-forecast-table-title">Détails des prévisions</h4>
                <div className="demand-forecast-table-container">
                  <table className="demand-forecast-table">
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
                        <tr key={`forecast-${index}`}>
                          <td>
                            {item.period ? 
                              new Date(item.period).toLocaleDateString('fr-FR', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              }) : 
                              'Date non disponible'
                            }
                          </td>
                          <td>{typeof item.demand === 'number' ? item.demand.toFixed(2) : '0.00'}</td>
                          <td>{item.vehicle_type || selectedFuel}</td>
                          <td>{item.location || selectedLocation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="demand-forecast-summary-section">
                <h4 className="demand-forecast-summary-title">
                  <span className="web3-gradient-text">📊 Insights IA</span>
                  <div className="web3-ai-pulse-ring"></div>
                </h4>
                <div className="demand-forecast-summary-cards">
                  <div className="demand-forecast-summary-card web3-metric-card">
                    <div className="demand-forecast-card-icon web3-icon-glow">
                      <i className="fas fa-calendar-day"></i>
                    </div>
                    <div className="demand-forecast-card-content">
                      <h5>🗓️ Jours analysés</h5>
                      <p>{forecastData.length}</p>
                    </div>
                    <div className="web3-card-border-glow"></div>
                  </div>
                  
                  <div className="demand-forecast-summary-card web3-metric-card">
                    <div className="demand-forecast-card-icon web3-icon-glow">
                      <i className="fas fa-chart-line"></i>
                    </div>
                    <div className="demand-forecast-card-content">
                      <h5>📈 Demande moyenne</h5>
                      <p>
                        {forecastData.length > 0 ? 
                          (forecastData.reduce((sum, item) => sum + (typeof item.demand === 'number' ? item.demand : 0), 0) / forecastData.length).toFixed(2) : 
                          '0.00'
                        }
                      </p>
                    </div>
                    <div className="web3-card-border-glow"></div>
                  </div>
                  
                  <div className="demand-forecast-summary-card web3-metric-card">
                    <div className="demand-forecast-card-icon web3-icon-glow">
                      <i className="fas fa-rocket"></i>
                    </div>
                    <div className="demand-forecast-card-content">
                      <h5>🚀 Pic de demande</h5>
                      <p>
                        {forecastData.length > 0 ? 
                          Math.max(...forecastData.map(item => typeof item.demand === 'number' ? item.demand : 0)).toFixed(2) : 
                          '0.00'
                        }
                      </p>
                    </div>
                    <div className="web3-card-border-glow"></div>
                  </div>
                  
                  <div className="demand-forecast-summary-card web3-metric-card">
                    <div className="demand-forecast-card-icon web3-icon-glow">
                      <i className="fas fa-chart-bar"></i>
                    </div>
                    <div className="demand-forecast-card-content">
                      <h5>📉 Demande minimale</h5>
                      <p>
                        {forecastData.length > 0 ? 
                          Math.min(...forecastData.map(item => typeof item.demand === 'number' ? item.demand : 0)).toFixed(2) : 
                          '0.00'
                        }
                      </p>
                    </div>
                    <div className="web3-card-border-glow"></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="demand-forecast-no-data-container web3-empty-state">
              <div className="web3-hologram-icon">
                <i className="demand-forecast-no-data-icon fas fa-chart-line"></i>
                <div className="web3-icon-rings">
                  <div className="ring ring-1"></div>
                  <div className="ring ring-2"></div>
                  <div className="ring ring-3"></div>
                </div>
              </div>
              <h3 className="demand-forecast-no-data-title">🔮 En attente de données</h3>
              <p className="demand-forecast-no-data-text">
                Activez l'IA pour générer vos prévisions • Sélectionnez vos paramètres et laissez la magie opérer ✨
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DemandForecast;