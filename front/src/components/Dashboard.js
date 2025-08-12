import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './Dashboard.css';

// Enregistrement des composants Chart.js
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Hook pour les animations
const useAnimateOnMount = (delay = 0, animationsEnabled = true) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!animationsEnabled || reduceMotion) {
            setIsVisible(true);
            return;
        }
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay, animationsEnabled]);
    
    return isVisible;
};

// Fonction utilitaire pour les nombres sécurisés
const SafeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

// Composant pour les particules flottantes
const FloatingParticles = ({ animationsEnabled }) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animationsEnabled || reduceMotion) return null;
    
    const particles = useMemo(() => 
        Array.from({ length: 30 }, (_, i) => ({
            id: i,
            delay: Math.random() * 15,
            left: Math.random() * 100,
            size: Math.random() * 3 + 2,
        }))
    , []);
    
    return (
        <div className="floating-particles">
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="particle"
                    style={{
                        left: `${particle.left}%`,
                        animationDelay: `${particle.delay}s`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                    }}
                />
            ))}
        </div>
    );
};
FloatingParticles.propTypes = {
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant pour les étincelles
const Sparkle = ({ top, left, delay, animationsEnabled }) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animationsEnabled || reduceMotion) return null;
    
    return (
        <div
            className="sparkle"
            style={{
                top: `${top}%`,
                left: `${left}%`,
                animationDelay: `${delay}s`,
            }}
        />
    );
};
Sparkle.propTypes = {
    top: PropTypes.number.isRequired,
    left: PropTypes.number.isRequired,
    delay: PropTypes.number.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant pour la barre de progression
const ProgressBar = ({ percentage, color, label }) => {
    const safePercentage = useMemo(() => {
        const value = SafeNumber(percentage, 0);
        return Math.min(Math.max(value, 0), 100);
    }, [percentage]);
    
    return (
        <div className="progress-bar" role="progressbar" aria-valuenow={safePercentage} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
            <div
                className="progress-fill"
                style={{
                    width: `${safePercentage}%`,
                    background: color,
                }}
            />
        </div>
    );
};
ProgressBar.propTypes = {
    percentage: PropTypes.number,
    color: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
};

// Composant pour le graphique interactif
const InteractiveChart = ({ data, label, color }) => {
    const safeData = useMemo(() => 
        Array.isArray(data) ? data.map(d => SafeNumber(d, 0)) : []
    , [data]);
    
    if (safeData.length === 0) {
        return <div className="chart-placeholder">Pas de données disponibles</div>;
    }
    
    const chartData = useMemo(() => ({
        labels: safeData.map((_, index) => `Jour ${index + 1}`),
        datasets: [
            {
                label,
                data: safeData,
                borderColor: color,
                backgroundColor: `${color}33`,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    }), [safeData, label, color]);
    
    const options = useMemo(() => ({
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#fff', font: { size: 14 } },
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
            },
            title: {
                display: true,
                text: label,
                color: '#fff',
                font: { size: 16 },
            },
        },
        scales: {
            x: { ticks: { color: '#fff' }, grid: { display: false } },
            y: { ticks: { color: '#fff' }, grid: { color: 'rgba(255, 255, 255, 0.2)' } },
        },
        maintainAspectRatio: false,
    }), [label]);
    
    return (
        <div className="chart-container" style={{ height: '150px' }} role="region" aria-label={`Graphique des tendances pour ${label}`}>
            <Line data={chartData} options={options} />
        </div>
    );
};
InteractiveChart.propTypes = {
    data: PropTypes.array,
    label: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
};

// Composant pour les cartes de statistiques
const StatCard = ({
    icon,
    number,
    label,
    description,
    trend,
    trendValue,
    color,
    progress,
    chartData,
    index,
    animationsEnabled,
}) => {
    const isVisible = useAnimateOnMount(index * 150, animationsEnabled);
    const safeNumber = useMemo(() => SafeNumber(number, 0), [number]);
    const safeTrendValue = useMemo(() => SafeNumber(trendValue, 0), [trendValue]);
    const safeProgress = useMemo(() => SafeNumber(progress, 0), [progress]);
    
    const getTrendIcon = useCallback(() => {
        if (trend === 'up') return '↗️';
        if (trend === 'down') return '↘️';
        return '→';
    }, [trend]);
    
    const getTrendClass = useCallback(() => {
        if (trend === 'up') return 'trend-up';
        if (trend === 'down') return 'trend-down';
        return 'trend-stable';
    }, [trend]);
    
    const sparkles = useMemo(() => 
        Array.from({ length: 5 }, (_, i) => ({
            id: i,
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 3,
        }))
    , []);
    
    return (
        <div
            className={`stat-card ${isVisible ? 'animate-in' : ''}`}
            role="region"
            aria-labelledby={`stat-card-${index}`}
            aria-describedby={`stat-desc-${index}`}
        >
            {sparkles.map(sparkle => (
                <Sparkle key={sparkle.id} {...sparkle} animationsEnabled={animationsEnabled} />
            ))}
            <div className={`stat-trend ${getTrendClass()}`} aria-hidden="true">
                {getTrendIcon()}
            </div>
            <div className={`stat-icon ${color}`} aria-hidden="true">
                {icon}
            </div>
            <div className="stat-content">
                <div className="stat-number" id={`stat-card-${index}`}>
                    {safeNumber}
                    {safeTrendValue !== 0 && (
                        <span style={{ fontSize: '1rem', opacity: 0.8 }} aria-label={`Tendance: ${safeTrendValue}%`}>
                            {safeTrendValue > 0 ? '+' : ''}{safeTrendValue.toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="stat-label">{label}</div>
                <div className="stat-description" id={`stat-desc-${index}`}>{description}</div>
                {safeProgress > 0 && (
                    <ProgressBar
                        percentage={safeProgress}
                        color="linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))"
                        label={`Progression pour ${label}`}
                    />
                )}
                {Array.isArray(chartData) && chartData.length > 0 && (
                    <InteractiveChart
                        data={chartData}
                        label={label}
                        color="rgba(255, 255, 255, 0.8)"
                    />
                )}
            </div>
        </div>
    );
};
StatCard.propTypes = {
    icon: PropTypes.element.isRequired,
    number: PropTypes.number,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    trend: PropTypes.string,
    trendValue: PropTypes.number,
    color: PropTypes.string.isRequired,
    progress: PropTypes.number,
    chartData: PropTypes.array,
    index: PropTypes.number.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant pour les cartes de métriques
const MetricCard = ({ value, label, index, animationsEnabled }) => {
    const isVisible = useAnimateOnMount(index * 100, animationsEnabled);
    const displayValue = useMemo(() => 
        value !== undefined && value !== null ? value : 'N/A'
    , [value]);
    
    return (
        <div
            className={`metric-card ${isVisible ? 'animate-in' : ''}`}
            role="region"
            aria-labelledby={`metric-card-${index}`}
        >
            <div className="metric-value" id={`metric-card-${index}`}>
                {displayValue}
            </div>
            <div className="metric-label">{label}</div>
        </div>
    );
};
MetricCard.propTypes = {
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    label: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant pour les alertes de maintenance
const MaintenanceAlerts = ({ alerts, onDismiss, onSendEmail, animationsEnabled }) => {
    const isVisible = useAnimateOnMount(300, animationsEnabled);
    
    const safeAlerts = useMemo(() => 
        Array.isArray(alerts) ? alerts : []
    , [alerts]);
    
    if (safeAlerts.length === 0) {
        return null;
    }
    
    return (
        <div className={`maintenance-alerts ${isVisible ? 'animate-in' : ''}`}>
            <h2>Alertes de Maintenance</h2>
            <div className="alerts-container">
                {safeAlerts.map((alert) => (
                    <div key={alert.id} className="alert-toast">
                        <div className="alert-content">
                            <strong>{alert.vehicleName || 'Véhicule inconnu'}</strong>
                            <p>{alert.message || 'Maintenance requise'}</p>
                            <p>Prochaine maintenance: {alert.nextMaintenanceDate || 'À définir'}</p>
                        </div>
                        <div className="alert-actions">
                            <button 
                                className="send-email-button"
                                onClick={() => onSendEmail(alert)}
                                aria-label={`Envoyer un email pour ${alert.vehicleName || 'ce véhicule'}`}
                            >
                                Envoyer un email
                            </button>
                            <button 
                                className="dismiss-button"
                                onClick={() => onDismiss(alert.id)}
                                aria-label={`Ignorer l'alerte pour ${alert.vehicleName || 'ce véhicule'}`}
                            >
                                Ignorer
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
MaintenanceAlerts.propTypes = {
    alerts: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
        vehicleName: PropTypes.string,
        message: PropTypes.string,
        nextMaintenanceDate: PropTypes.string,
    })),
    onDismiss: PropTypes.func.isRequired,
    onSendEmail: PropTypes.func.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant pour la section des revenus
const RevenueSection = ({ revenueData, onGenerateBilling, animationsEnabled }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const isVisible = useAnimateOnMount(500, animationsEnabled);
    
    const handlePeriodChange = useCallback((e) => {
        setSelectedPeriod(e.target.value);
    }, []);
    
    const safeRevenueData = useMemo(() => revenueData || { total: 0, details: [] }, [revenueData]);
    const safeTotal = useMemo(() => SafeNumber(safeRevenueData.total, 0), [safeRevenueData.total]);
    const safeDetails = useMemo(() => 
        Array.isArray(safeRevenueData.details) ? safeRevenueData.details : []
    , [safeRevenueData.details]);
    
    return (
        <div className={`revenue-section ${isVisible ? 'animate-in' : ''}`}>
            <h2>Revenus</h2>
            <div>
                <h3>Total: {safeTotal.toFixed(2)}€</h3>
                <select value={selectedPeriod} onChange={handlePeriodChange} aria-label="Sélectionner la période pour les revenus">
                    <option value="day">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="year">Cette année</option>
                </select>
            </div>
            
            <table className="revenue-table">
                <thead>
                    <tr>
                        <th>Véhicule</th>
                        <th>Agence</th>
                        <th>Jours de location</th>
                        <th>Revenu</th>
                    </tr>
                </thead>
                <tbody>
                    {safeDetails.length > 0 ? (
                        safeDetails.map((item, index) => (
                            <tr key={index}>
                                <td>{item.vehicleName || 'N/A'}</td>
                                <td>{item.agenceName || 'N/A'}</td>
                                <td>{SafeNumber(item.days, 0)}</td>
                                <td>{SafeNumber(item.revenue, 0).toFixed(2)}€</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center' }}>Aucune donnée disponible</td>
                        </tr>
                    )}
                </tbody>
            </table>
            
            <button 
                className="billing-button"
                onClick={() => onGenerateBilling(selectedPeriod)}
                aria-label={`Générer une facture pour ${selectedPeriod}`}
            >
                Générer une facture pour {selectedPeriod === 'day' ? 'aujourd\'hui' : 
                  selectedPeriod === 'week' ? 'cette semaine' : 
                  selectedPeriod === 'month' ? 'ce mois' : 'cette année'}
            </button>
        </div>
    );
};
RevenueSection.propTypes = {
    revenueData: PropTypes.shape({
        total: PropTypes.number,
        details: PropTypes.arrayOf(PropTypes.shape({
            vehicleName: PropTypes.string,
            agenceName: PropTypes.string,
            days: PropTypes.number,
            revenue: PropTypes.number,
        })),
    }),
    onGenerateBilling: PropTypes.func.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

// Composant principal du tableau de bord
const StatsDashboard = ({ token, user, onLogout, settings = { animationsEnabled: true } }) => {
    const [stats, setStats] = useState({
        totalVehicles: 0,
        disponibles: 0,
        loues: 0,
        maintenance: 0,
        reservations: 0,
        revenue: 0,
        utilisation: 0,
    });
    const [trends, setTrends] = useState({
        vehiclesTrend: [],
        disponiblesTrend: [],
        louesTrend: [],
        maintenanceTrend: [],
        revenueTrend: [],
        utilizationTrend: [],
    });
    const [agences, setAgences] = useState([]);
    const [maintenanceAlerts, setMaintenanceAlerts] = useState([]);
    const [revenueData, setRevenueData] = useState({
        total: 0,
        details: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState({ 
        period: 'week', 
        agenceId: null  // Modification: Les agences voient maintenant toutes les agences par défaut
    });
    
    // Utiliser des refs pour éviter les dépendances changeantes
    const filterRef = useRef(filter);
    const tokenRef = useRef(token);
    const userRef = useRef(user);
    
    // Mettre à jour les refs quand les valeurs changent
    useEffect(() => {
        filterRef.current = filter;
        tokenRef.current = token;
        userRef.current = user;
    }, [filter, token, user]);
    
    // Vérification de l'authentification et du rôle
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }
    
    // Modification: Autoriser les agences à accéder au tableau de bord
    if (!['admin', 'agence'].includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }
    
    // Fonction pour rafraîchir le token
    const refreshToken = useCallback(async () => {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) throw new Error('No refresh token available');
            
            const response = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh: refreshToken });
            const newToken = response.data.access;
            localStorage.setItem('access_token', newToken);
            return newToken;
        } catch (error) {
            console.error('Erreur lors du rafraîchissement du token:', error);
            setError('Session expirée. Veuillez vous reconnecter.');
            onLogout();
            return null;
        }
    }, [onLogout]);
    
    // Calcul des tendances dynamiques
    const calculateTrend = useCallback((data) => {
        if (!Array.isArray(data) || data.length < 2 || data.some(val => !Number.isFinite(val))) {
            return { trend: 'stable', trendValue: 0 };
        }
        
        const last = data[data.length - 1];
        const secondLast = data[data.length - 2];
        const change = secondLast !== 0 ? ((last - secondLast) / secondLast) * 100 : 0;
        
        return {
            trend: Number.isFinite(change) && change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
            trendValue: Number.isFinite(change) ? Math.round(change * 10) / 10 : 0,
        };
    }, []);
    
    // Chargement des agences pour le filtre
    const fetchAgences = useCallback(async (accessToken) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/agences/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setAgences(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Erreur lors du chargement des agences:', error);
            setError('Impossible de charger la liste des agences.');
        }
    }, []);
    
    const fetchMaintenanceAlerts = useCallback(async (accessToken) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/vehicules/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { statut: 'maintenance' },
            });
            const alerts = (response.data || []).map(vehicle => ({
                id: vehicle.id || Math.random(),
                vehicleName: `${vehicle.marque || 'N/A'} ${vehicle.modele || 'N/A'}`,
                message: 'Maintenance préventive nécessaire',
                nextMaintenanceDate: vehicle.prochaine_maintenance || '2025-08-15',
            }));
            setMaintenanceAlerts(alerts);
        } catch (error) {
            console.error('Erreur lors du chargement des alertes de maintenance:', error);
            setMaintenanceAlerts([]);
        }
    }, []);
    
    const fetchRevenueData = useCallback(async (accessToken, period) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/reservations/stats/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { period },
            });
            const reservationsData = response.data.stats || {};
            
            const detailsResponse = await axios.get(`${API_BASE_URL}/api/reservations/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { period },
            });
            
            const details = (detailsResponse.data || []).map(reservation => {
                const startDate = new Date(reservation.date_debut);
                const endDate = new Date(reservation.date_fin);
                const days = isNaN(startDate) || isNaN(endDate) ? 0 : 
                    Math.max(0, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
                
                return {
                    vehicleName: reservation.vehicule_display?.marque 
                        ? `${reservation.vehicule_display.marque} ${reservation.vehicule_display.modele}` 
                        : 'Véhicule inconnu',
                    agenceName: reservation.vehicule_display?.agence?.nom || 'Agence inconnue',
                    days,
                    revenue: SafeNumber(reservation.montant_total, 0),
                };
            });
            
            setRevenueData({
                total: SafeNumber(reservationsData.revenus_total, 0),
                details,
            });
        } catch (error) {
            console.error('Erreur lors du chargement des données de revenus:', error);
            setRevenueData({ total: 0, details: [] });
        }
    }, []);
    
    const fetchStats = useCallback(async (retryCount = 0, maxRetries = 3) => {
        try {
            setLoading(true);
            setError(null);
            let accessToken = tokenRef.current;
            const params = { period: filterRef.current.period };
            if (filterRef.current.agenceId) params.agence_id = filterRef.current.agenceId;
            const defaultStats = {
                total: 0,
                disponibles: 0,
                loues: 0,
                maintenance: 0,
                hors_service: 0,
                par_carburant: {},
                prix_moyen: 0,
                taux_utilisation: 0,
            };
            const defaultReservationStats = {
                total: 0,
                en_attente: 0,
                confirmees: 0,
                terminees: 0,
                annulees: 0,
                revenus_total: 0,
                moyenne_duree: 0,
                taux_succes: 0,
            };
            const vehiculesResponse = await axios.get(`${API_BASE_URL}/api/vehicules/stats/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
            }).catch(async error => {
                if (error.response?.status === 401 && retryCount < maxRetries) {
                    accessToken = await refreshToken();
                    if (!accessToken) return { data: defaultStats };
                    return fetchStats(retryCount + 1, maxRetries);
                }
                return { data: defaultStats };
            });
            const reservationsResponse = await axios.get(`${API_BASE_URL}/api/reservations/stats/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
            }).catch(error => {
                return { data: { stats: defaultReservationStats } };
            });
            
            const vehiculesData = vehiculesResponse.data || defaultStats;
            const reservationsData = reservationsResponse.data.stats || defaultReservationStats;
            setStats({
                totalVehicles: SafeNumber(vehiculesData.total, 0),
                disponibles: SafeNumber(vehiculesData.disponibles, 0),
                loues: SafeNumber(vehiculesData.loues, 0),
                maintenance: SafeNumber(vehiculesData.maintenance, 0),
                reservations: SafeNumber(reservationsData.total, 0),
                revenue: SafeNumber(reservationsData.revenus_total, 0),
                utilisation: SafeNumber(vehiculesData.taux_utilisation, 0),
            });
            const generateTrendData = (baseValue, variance = 0.2) => {
                const safeBaseValue = SafeNumber(baseValue, 10);
                return Array(7).fill(0).map(() =>
                    Math.max(0, Math.round(safeBaseValue * (1 + (Math.random() - 0.5) * variance)))
                );
            };
            setTrends({
                vehiclesTrend: generateTrendData(vehiculesData.total),
                disponiblesTrend: generateTrendData(vehiculesData.disponibles),
                louesTrend: generateTrendData(vehiculesData.loues),
                maintenanceTrend: generateTrendData(vehiculesData.maintenance),
                revenueTrend: generateTrendData(reservationsData.revenus_total, 0.3),
                utilizationTrend: generateTrendData(vehiculesData.taux_utilisation, 0.1),
            });
            await Promise.all([
                fetchMaintenanceAlerts(accessToken),
                fetchRevenueData(accessToken, filterRef.current.period),
                // Modification: Charger les agences pour les admins et les agences
                ['admin', 'agence'].includes(userRef.current?.role) && agences.length === 0 ? fetchAgences(accessToken) : Promise.resolve(),
            ]);
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            const status = error.response?.status;
            let errorMessage = 'Impossible de charger les statistiques. Vérifiez votre connexion.';
            if (status === 404) {
                errorMessage = 'Données non disponibles pour les filtres sélectionnés.';
            } else if (status === 500) {
                errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
            } else if (status === 429) {
                errorMessage = 'Trop de requêtes. Veuillez attendre un moment.';
            }
            setError(errorMessage);
            if (retryCount < maxRetries && status !== 401) {
                setTimeout(() => fetchStats(retryCount + 1, maxRetries), Math.pow(2, retryCount) * 1000);
            }
        } finally {
            setLoading(false);
        }
    }, [refreshToken, fetchAgences, fetchMaintenanceAlerts, fetchRevenueData, agences.length]);
    
    useEffect(() => {
        let intervalId;
        const startFetching = () => {
            fetchStats();
            intervalId = setInterval(fetchStats, 300000); // 5 minutes
        };
        
        if (document.visibilityState === 'visible') {
            startFetching();
        }
        
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchStats();
                if (!intervalId) {
                    startFetching();
                }
            } else {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            if (intervalId) clearInterval(intervalId);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchStats]);
    
    const handleFilterChange = useCallback((newFilter) => {
        setFilter(prev => ({ ...prev, ...newFilter }));
    }, []);
    
    const handleDismissAlert = useCallback((alertId) => {
        setMaintenanceAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }, []);
    
    const handleSendEmail = useCallback(async (alert) => {
        try {
            await axios.post(`${API_BASE_URL}/api/send-email/`, { 
                alert,
                vehicleId: alert.id 
            }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('Email envoyé pour la maintenance de ' + (alert.vehicleName || 'ce véhicule'));
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            alert('Erreur lors de l\'envoi de l\'email.');
        }
    }, [token]);
    
    const handleGenerateBilling = useCallback(async (period) => {
        try {
            await axios.post(`${API_BASE_URL}/api/generate-billing/`, { period }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('Facture générée pour la période: ' + period);
        } catch (error) {
            console.error('Erreur lors de la génération de la facture:', error);
            alert('Erreur lors de la génération de la facture.');
        }
    }, [token]);
    
    const FilterControls = useMemo(() => (
        <div className="filter-controls">
            <select
                value={filter.period}
                onChange={(e) => handleFilterChange({ period: e.target.value })}
                aria-label="Sélectionner la période pour les statistiques"
            >
                <option value="day">Dernier jour</option>
                <option value="week">Dernière semaine</option>
                <option value="month">Dernier mois</option>
            </select>
            
            {/* Modification: Autoriser les agences à sélectionner des agences */}
            {['admin', 'agence'].includes(user.role) && (
                <select
                    value={filter.agenceId || ''}
                    onChange={(e) => handleFilterChange({ agenceId: e.target.value || null })}
                    aria-label="Sélectionner une agence"
                >
                    <option value="">Toutes les agences</option>
                    {agences.map((agence) => (
                        <option key={agence.id} value={agence.id}>{agence.nom}</option>
                    ))}
                </select>
            )}
        </div>
    ), [filter, user.role, agences, handleFilterChange]);
    
    const mainStats = useMemo(() => [
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h10v8H6a4 4 0 0 1-4-4V8z" />
            </svg>,
            number: stats.totalVehicles,
            label: 'Total Véhicules',
            description: 'Flotte complète disponible',
            ...calculateTrend(trends.vehiclesTrend),
            color: 'icon-vehicles',
            progress: 100,
            chartData: trends.vehiclesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
            </svg>,
            number: stats.disponibles,
            label: 'Disponibles',
            description: 'Prêts à être loués',
            ...calculateTrend(trends.disponiblesTrend),
            color: 'icon-available',
            progress: stats.totalVehicles > 0 ? (stats.disponibles / stats.totalVehicles) * 100 : 0,
            chartData: trends.disponiblesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>,
            number: stats.loues,
            label: 'En Location',
            description: 'Actuellement loués',
            ...calculateTrend(trends.louesTrend),
            color: 'icon-rented',
            progress: stats.totalVehicles > 0 ? (stats.loues / stats.totalVehicles) * 100 : 0,
            chartData: trends.louesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>,
            number: stats.maintenance,
            label: 'Maintenance',
            description: 'En cours de réparation',
            ...calculateTrend(trends.maintenanceTrend),
            color: 'icon-maintenance',
            progress: stats.totalVehicles > 0 ? (stats.maintenance / stats.totalVehicles) * 100 : 0,
            chartData: trends.maintenanceTrend,
        },
    ], [stats, trends, calculateTrend]);
    
    const secondaryMetrics = useMemo(() => [
        { value: stats.reservations, label: 'Réservations' },
        { value: `${SafeNumber(stats.revenue, 0).toFixed(2)}€`, label: 'Revenus' },
        { value: `${SafeNumber(stats.utilisation, 0)}%`, label: "Taux d'utilisation" },
        { value: '4.8⭐', label: 'Note moyenne' },
        { value: '24h', label: 'Délai moyen' },
        { value: '98%', label: 'Satisfaction client' },
    ], [stats]);
    
    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="stats-dashboard">
                    <div className="dashboard-header">
                        <div className="loading-spinner" role="status" aria-live="polite"></div>
                        <h1>Chargement des statistiques...</h1>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="dashboard-container">
                <div className="stats-dashboard">
                    <div className="dashboard-header">
                        <h1>❌ Erreur</h1>
                        <p>{error}</p>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchStats();
                            }}
                            aria-label="Réessayer le chargement des statistiques"
                            className="retry-button"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="dashboard-container" role="main">
            <FloatingParticles animationsEnabled={settings.animationsEnabled} />
            <div className="stats-dashboard">
                <header className="dashboard-header">
                    <h1 className="dashboard-title">📊 Statistiques Véhicules</h1>
                    <p className="dashboard-subtitle">
                        Tableau de bord moderne et interactif - Mise à jour en temps réel
                    </p>
                    {FilterControls}
                </header>
                
                <div className="stats-grid">
                    {mainStats.map((stat, index) => (
                        <StatCard
                            key={index}
                            {...stat}
                            index={index}
                            animationsEnabled={settings.animationsEnabled}
                        />
                    ))}
                </div>
                
                <div className="secondary-metrics">
                    {secondaryMetrics.map((metric, index) => (
                        <MetricCard
                            key={index}
                            {...metric}
                            index={index}
                            animationsEnabled={settings.animationsEnabled}
                        />
                    ))}
                </div>
                
                <MaintenanceAlerts 
                    alerts={maintenanceAlerts}
                    onDismiss={handleDismissAlert}
                    onSendEmail={handleSendEmail}
                    animationsEnabled={settings.animationsEnabled}
                />
                
                <RevenueSection 
                    revenueData={revenueData}
                    onGenerateBilling={handleGenerateBilling}
                    animationsEnabled={settings.animationsEnabled}
                />
            </div>
        </div>
    );
};
StatsDashboard.propTypes = {
    token: PropTypes.string,
    user: PropTypes.shape({
        role: PropTypes.string,
        email: PropTypes.string,
        agence: PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
        }),
    }),
    onLogout: PropTypes.func.isRequired,
    settings: PropTypes.shape({
        animationsEnabled: PropTypes.bool,
    }),
};
export default StatsDashboard;