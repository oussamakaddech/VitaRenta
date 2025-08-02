import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import './Dashboard.css';

// Enregistrement des composants Chart.js
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Title, Tooltip, Legend, Filler);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Hook pour les animations d'entrée avec support de prefers-reduced-motion
const useAnimateOnMount = (delay = 0, animationsEnabled = true) => {
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const reduceMotion = typeof window !== 'undefined' 
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
            : true;
        
        if (!animationsEnabled || reduceMotion) {
            setIsVisible(true);
            return;
        }
        
        const timer = setTimeout(() => setIsVisible(true), delay);
        return () => clearTimeout(timer);
    }, [delay, animationsEnabled]);
    
    return isVisible;
};

// Composant pour les particules flottantes
const FloatingParticles = ({ animationsEnabled }) => {
    const reduceMotion = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
        : true;
    
    if (!animationsEnabled || reduceMotion) return null;
    
    const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        delay: Math.random() * 15,
        left: Math.random() * 100,
        size: Math.random() * 3 + 2,
    }));
    
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

// Composant Sparkle pour effets visuels
const Sparkle = ({ top, left, delay, animationsEnabled }) => {
    const reduceMotion = typeof window !== 'undefined' 
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
        : true;
    
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

// Composant pour barre de progression
const ProgressBar = ({ percentage, color, label }) => (
    <div className="progress-bar" role="progressbar" aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100" aria-label={label}>
        <div
            className="progress-fill"
            style={{
                width: `${Math.min(Math.max(percentage, 0), 100)}%`,
                background: color,
            }}
        />
    </div>
);

// Composant pour graphique interactif avec Chart.js
const InteractiveChart = ({ data, label, color }) => {
    const chartData = {
        labels: data.map((_, index) => `Jour ${index + 1}`),
        datasets: [
            {
                label,
                data,
                borderColor: color,
                backgroundColor: `${color}33`,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
        ],
    };
    
    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: '#fff',
                    font: { size: 14 },
                },
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
            x: {
                ticks: { color: '#fff' },
                grid: { display: false },
            },
            y: {
                ticks: { color: '#fff' },
                grid: { color: 'rgba(255, 255, 255, 0.2)' },
            },
        },
        maintainAspectRatio: false,
    };
    
    return (
        <div className="chart-container" style={{ height: '150px' }} role="region" aria-label={`Graphique des tendances pour ${label}`}>
            <Line data={chartData} options={options} />
        </div>
    );
};

// Composant carte statistique principale
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
    
    const getTrendIcon = () => {
        if (trend === 'up') return '↗️';
        if (trend === 'down') return '↘️';
        return '→';
    };
    
    const getTrendClass = () => {
        if (trend === 'up') return 'trend-up';
        if (trend === 'down') return 'trend-down';
        return 'trend-stable';
    };
    
    const sparkles = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 3,
    }));
    
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
                    {Number.isFinite(number) ? number : 0}
                    {Number.isFinite(trendValue) && (
                        <span style={{ fontSize: '1rem', opacity: 0.8 }} aria-label={`Tendance: ${trendValue}%`}>
                            {trendValue > 0 ? '+' : ''}{trendValue.toFixed(1)}%
                        </span>
                    )}
                </div>
                <div className="stat-label">{label}</div>
                <div className="stat-description" id={`stat-desc-${index}`}>{description}</div>
                {Number.isFinite(progress) && (
                    <ProgressBar
                        percentage={progress}
                        color="linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))"
                        label={`Progression pour ${label}`}
                    />
                )}
                {chartData && chartData.length > 0 && (
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

// Composant métrique secondaire
const MetricCard = ({ value, label, index, animationsEnabled }) => {
    const isVisible = useAnimateOnMount(index * 100, animationsEnabled);
    return (
        <div
            className={`metric-card ${isVisible ? 'animate-in' : ''}`}
            role="region"
            aria-labelledby={`metric-card-${index}`}
        >
            <div className="metric-value" id={`metric-card-${index}`}>
                {value !== undefined && value !== null ? value : 'N/A'}
            </div>
            <div className="metric-label">{label}</div>
        </div>
    );
};

// Composant pour les alertes de maintenance
const MaintenanceAlerts = ({ alerts, onDismiss, onSendEmail, animationsEnabled }) => {
    const isVisible = useAnimateOnMount(300, animationsEnabled);
    
    if (!alerts || alerts.length === 0) {
        return null;
    }
    
    return (
        <div className={`maintenance-alerts ${isVisible ? 'animate-in' : ''}`}>
            <h2>Alertes de Maintenance</h2>
            <div className="alerts-container">
                {alerts.map((alert, index) => (
                    <div key={alert.id} className="alert-toast">
                        <div className="alert-content">
                            <strong>{alert.vehicleName}</strong>
                            <p>{alert.message}</p>
                            <p>Prochaine maintenance: {alert.nextMaintenanceDate}</p>
                        </div>
                        <div className="alert-actions">
                            <button 
                                className="send-email-button"
                                onClick={() => onSendEmail(alert)}
                                aria-label={`Envoyer un email pour ${alert.vehicleName}`}
                            >
                                Envoyer un email
                            </button>
                            <button 
                                className="dismiss-button"
                                onClick={() => onDismiss(alert.id)}
                                aria-label={`Ignorer l'alerte pour ${alert.vehicleName}`}
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

// Composant pour la section des revenus
const RevenueSection = ({ revenueData, onGenerateBilling, animationsEnabled }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const isVisible = useAnimateOnMount(500, animationsEnabled);
    
    const handlePeriodChange = (e) => {
        setSelectedPeriod(e.target.value);
    };
    
    return (
        <div className={`revenue-section ${isVisible ? 'animate-in' : ''}`}>
            <h2>Revenus</h2>
            <div>
                <h3>Total: {revenueData.total?.toFixed(2)}€</h3>
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
                    {revenueData.details?.map((item, index) => (
                        <tr key={index}>
                            <td>{item.vehicleName}</td>
                            <td>{item.agenceName}</td>
                            <td>{item.days}</td>
                            <td>{item.revenue?.toFixed(2)}€</td>
                        </tr>
                    ))}
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

// Composant principal Dashboard
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
        agenceId: user?.role === 'agence' ? user?.agence?.id : null 
    });
    
    // Vérification de l'authentification et du rôle
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }
    
    if (!['admin', 'agence'].includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }
    
    // Fonction pour rafraîchir le token
    const refreshToken = async () => {
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
    };
    
    // Calcul des tendances dynamiques
    const calculateTrend = (data) => {
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
    };
    
    // Chargement des agences pour le filtre
    const fetchAgences = async (accessToken) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/agences/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            setAgences(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error('Erreur lors du chargement des agences:', error);
            setError('Impossible de charger la liste des agences.');
        }
    };
    
    // Chargement des alertes de maintenance
    const fetchMaintenanceAlerts = async (accessToken) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/vehicules/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params: { statut: 'maintenance' },
            });
            
            const alerts = response.data.map(vehicle => ({
                id: vehicle.id,
                vehicleName: `${vehicle.marque} ${vehicle.modele}`,
                message: 'Maintenance préventive nécessaire',
                nextMaintenanceDate: vehicle.prochaine_maintenance || '2025-08-15',
            }));
            
            setMaintenanceAlerts(alerts);
        } catch (error) {
            console.error('Erreur lors du chargement des alertes de maintenance:', error);
            // Ne pas afficher d'erreur pour les alertes de maintenance car ce n'est pas critique
        }
    };
    
    // Chargement des données de revenus
    const fetchRevenueData = async (accessToken, period) => {
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
            
            const details = detailsResponse.data.map(reservation => ({
                vehicleName: reservation.vehicule_display?.marque 
                    ? `${reservation.vehicule_display.marque} ${reservation.vehicule_display.modele}` 
                    : 'Véhicule inconnu',
                agenceName: reservation.vehicule_display?.agence?.nom || 'Agence inconnue',
                days: Math.ceil((new Date(reservation.date_fin) - new Date(reservation.date_debut)) / (1000 * 60 * 60 * 24)),
                revenue: parseFloat(reservation.montant_total) || 0,
            }));
            
            setRevenueData({
                total: parseFloat(reservationsData.revenus_total) || 0,
                details,
            });
        } catch (error) {
            console.error('Erreur lors du chargement des données de revenus:', error);
            // Ne pas afficher d'erreur pour les revenus car ce n'est pas critique
        }
    };
    
    // Chargement des statistiques et tendances
    const fetchStats = useCallback(async (retryCount = 0, maxRetries = 3) => {
        try {
            setLoading(true);
            let accessToken = token;
            const params = { period: filter.period };
            if (filter.agenceId) params.agence_id = filter.agenceId;
            
            const defaultStats = {
                total: 0,
                disponibles: 0,
                loues: 0,
                maintenance: 0,
                hors_service: 0,
                par_carburant: {},
                prix_moyen: 0,
            };
            
            const defaultReservations = {
                total: 0,
                revenus_total: 0,
                en_attente: 0,
                confirmees: 0,
                terminees: 0,
                annulees: 0,
                moyenne_duree: 0,
            };
            
            // Récupération des données des véhicules
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
            
            // Récupération des données des réservations
            const reservationsResponse = await axios.get(`${API_BASE_URL}/api/reservations/stats/`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                params,
            }).catch(async error => {
                if (error.response?.status === 401 && retryCount < maxRetries) {
                    accessToken = await refreshToken();
                    if (!accessToken) return { data: defaultReservations };
                    return fetchStats(retryCount + 1, maxRetries);
                }
                return { data: defaultReservations };
            });
            
            const vehiculesData = vehiculesResponse.data || defaultStats;
            const reservationsData = reservationsResponse.data || defaultReservations;
            
            // Mise à jour des statistiques
            setStats({
                totalVehicles: Number.isFinite(vehiculesData.total) ? vehiculesData.total : 0,
                disponibles: Number.isFinite(vehiculesData.disponibles) ? vehiculesData.disponibles : 0,
                loues: Number.isFinite(vehiculesData.loues) ? vehiculesData.loues : 0,
                maintenance: Number.isFinite(vehiculesData.maintenance) ? vehiculesData.maintenance : 0,
                reservations: Number.isFinite(reservationsData.total) ? reservationsData.total : 0,
                revenue: Number.isFinite(parseFloat(reservationsData.revenus_total)) ? parseFloat(reservationsData.revenus_total) : 0,
                utilisation: vehiculesData.total > 0 ? Math.round((vehiculesData.loues / vehiculesData.total) * 100) : 0,
            });
            
            // Génération de données de tendance simulées
            const generateTrendData = (baseValue, variance = 0.2) => {
                return Array(7).fill(0).map((_, i) => {
                    const randomFactor = 1 + (Math.random() - 0.5) * variance;
                    return Math.max(0, Math.round(baseValue * randomFactor));
                });
            };
            
            setTrends({
                vehiclesTrend: generateTrendData(vehiculesData.total || 10),
                disponiblesTrend: generateTrendData(vehiculesData.disponibles || 5),
                louesTrend: generateTrendData(vehiculesData.loues || 3),
                maintenanceTrend: generateTrendData(vehiculesData.maintenance || 2),
                revenueTrend: generateTrendData(reservationsData.revenus_total || 1000, 0.3),
                utilizationTrend: generateTrendData(
                    vehiculesData.total > 0 ? (vehiculesData.loues / vehiculesData.total) * 100 : 50, 0.1
                ),
            });
            
            // Chargement des alertes de maintenance
            await fetchMaintenanceAlerts(accessToken);
            
            // Chargement des données de revenus
            await fetchRevenueData(accessToken, filter.period);
            
            // Chargement des agences si nécessaire
            if (user.role === 'admin' && agences.length === 0) {
                await fetchAgences(accessToken);
            }
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
    }, [token, user, onLogout, filter, agences.length]);
    
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
    
    // Gestion des filtres
    const handleFilterChange = (newFilter) => {
        setFilter((prev) => ({ ...prev, ...newFilter }));
        fetchStats();
    };
    
    // Gestion des alertes de maintenance
    const handleDismissAlert = (alertId) => {
        setMaintenanceAlerts(prev => prev.filter(alert => alert.id !== alertId));
    };
    
    const handleSendEmail = async (alert) => {
        try {
            // Implémentation fictive pour envoyer un email
            await axios.post(`${API_BASE_URL}/api/send-email/`, { alert }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('Email envoyé pour la maintenance de ' + alert.vehicleName);
        } catch (error) {
            console.error('Erreur lors de l\'envoi de l\'email:', error);
            alert('Erreur lors de l\'envoi de l\'email.');
        }
    };
    
    // Gestion de la génération de factures
    const handleGenerateBilling = async (period) => {
        try {
            // Implémentation fictive pour générer une facture
            await axios.post(`${API_BASE_URL}/api/generate-billing/`, { period }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            alert('Facture générée pour la période: ' + period);
        } catch (error) {
            console.error('Erreur lors de la génération de la facture:', error);
            alert('Erreur lors de la génération de la facture.');
        }
    };
    
    // Composant de filtre
    const FilterControls = () => (
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
            
            {user.role === 'admin' && (
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
    );
    
    // Données pour les cartes statistiques
    const mainStats = [
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
    ];
    
    const secondaryMetrics = [
        { value: stats.reservations, label: 'Réservations' },
        { value: `${stats.revenue.toFixed(2)}€`, label: 'Revenus' },
        { value: `${stats.utilisation}%`, label: "Taux d'utilisation" },
        { value: '4.8⭐', label: 'Note moyenne' },
        { value: '24h', label: 'Délai moyen' },
        { value: '98%', label: 'Satisfaction client' },
    ];
    
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
                    <FilterControls />
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

export default StatsDashboard;