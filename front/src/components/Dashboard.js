import React, { useState, useEffect, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import './Dashboard.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Hook pour les animations d'entrée
const useAnimateOnMount = (delay = 0) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, delay);

        return () => clearTimeout(timer);
    }, [delay]);

    return isVisible;
};

// Composant pour les particules flottantes
const FloatingParticles = () => {
    const particles = Array.from({ length: 50 }, (_, i) => ({
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
const Sparkle = ({ top, left, delay }) => (
    <div
        className="sparkle"
        style={{
            top: `${top}%`,
            left: `${left}%`,
            animationDelay: `${delay}s`,
        }}
    />
);

// Composant pour mini graphique
const MiniChart = ({ data, color }) => {
    const points = data.map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - (value / Math.max(...data)) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg className="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                style={{ filter: 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.3))' }}
            />
        </svg>
    );
};

// Composant pour barre de progression
const ProgressBar = ({ percentage, color }) => (
    <div className="progress-bar">
        <div
            className="progress-fill"
            style={{
                width: `${percentage}%`,
                background: color,
            }}
        />
    </div>
);

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
                      index
                  }) => {
    const isVisible = useAnimateOnMount(index * 150);

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

    // Sparkles aléatoires pour effet visuel
    const sparkles = Array.from({ length: 5 }, (_, i) => ({
        id: i,
        top: Math.random() * 100,
        left: Math.random() * 100,
        delay: Math.random() * 3,
    }));

    return (
        <div className={`stat-card ${isVisible ? 'animate-in' : ''}`}>
            {sparkles.map(sparkle => (
                <Sparkle key={sparkle.id} {...sparkle} />
            ))}

            <div className={`stat-trend ${getTrendClass()}`}>
                {getTrendIcon()}
            </div>

            <div className={`stat-icon ${color}`}>
                {icon}
            </div>

            <div className="stat-content">
                <div className="stat-number">
                    {number}
                    {trendValue && (
                        <span style={{ fontSize: '1rem', opacity: 0.8 }}>
              {trendValue > 0 ? '+' : ''}{trendValue}%
            </span>
                    )}
                </div>

                <div className="stat-label">{label}</div>
                <div className="stat-description">{description}</div>

                {progress && (
                    <ProgressBar
                        percentage={progress}
                        color="linear-gradient(90deg, rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.4))"
                    />
                )}

                {chartData && (
                    <MiniChart
                        data={chartData}
                        color="rgba(255, 255, 255, 0.8)"
                    />
                )}
            </div>
        </div>
    );
};

// Composant métrique secondaire
const MetricCard = ({ value, label, index }) => {
    const isVisible = useAnimateOnMount(index * 100);

    return (
        <div className={`metric-card ${isVisible ? 'animate-in' : ''}`}>
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
        </div>
    );
};

// Composant principal Dashboard
const StatsDashboard = ({ token, user, onLogout }) => {
    const [stats, setStats] = useState({
        totalVehicles: 0,
        disponibles: 0,
        loues: 0,
        maintenance: 0,
        reservations: 0,
        revenue: 0,
        utilisation: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Vérification de l'authentification
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    // Chargement des statistiques
    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // Simulation de données pour démonstration
                // Remplacez par vos vraies APIs
                const [vehiculesResponse, reservationsResponse] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/vehicules/stats/`, {
                        headers: { Authorization: `Token ${token}` }
                    }),
                    axios.get(`${API_BASE_URL}/api/reservations/stats/`, {
                        headers: { Authorization: `Token ${token}` }
                    }).catch(() => ({ data: { total: 0, revenue: 0 } }))
                ]);

                const vehiculesData = vehiculesResponse.data;
                const reservationsData = reservationsResponse.data;

                setStats({
                    totalVehicles: vehiculesData.total || 0,
                    disponibles: vehiculesData.disponibles || 0,
                    loues: vehiculesData.loues || 0,
                    maintenance: vehiculesData.maintenance || 0,
                    reservations: reservationsData.total || 0,
                    revenue: reservationsData.revenue || 0,
                    utilisation: vehiculesData.total > 0 ?
                        Math.round((vehiculesData.loues / vehiculesData.total) * 100) : 0
                });

            } catch (error) {
                console.error('Erreur lors du chargement des statistiques:', error);
                setError('Impossible de charger les statistiques');
            } finally {
                setLoading(false);
            }
        };

        fetchStats();

        // Actualisation automatique toutes les 30 secondes
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [token]);

    // Données simulées pour les graphiques
    const vehiclesTrend = [45, 48, 52, 49, 55, 58, 60];
    const revenueTrend = [1200, 1350, 1100, 1580, 1750, 1900, 2100];
    const utilizationTrend = [65, 70, 68, 75, 78, 82, 85];

    const mainStats = [
        {
            icon: '🚗',
            number: stats.totalVehicles,
            label: 'Total Véhicules',
            description: 'Flotte complète disponible',
            trend: 'up',
            trendValue: 8.5,
            color: 'icon-vehicles',
            progress: 100,
            chartData: vehiclesTrend
        },
        {
            icon: '✅',
            number: stats.disponibles,
            label: 'Disponibles',
            description: 'Prêts à être loués',
            trend: 'up',
            trendValue: 12.3,
            color: 'icon-available',
            progress: stats.totalVehicles > 0 ? (stats.disponibles / stats.totalVehicles) * 100 : 0,
            chartData: [25, 28, 30, 27, 32, 35, stats.disponibles]
        },
        {
            icon: '🔒',
            number: stats.loues,
            label: 'En Location',
            description: 'Actuellement loués',
            trend: 'stable',
            trendValue: -2.1,
            color: 'icon-rented',
            progress: stats.totalVehicles > 0 ? (stats.loues / stats.totalVehicles) * 100 : 0,
            chartData: [15, 18, 20, 22, 19, 21, stats.loues]
        },
        {
            icon: '🔧',
            number: stats.maintenance,
            label: 'Maintenance',
            description: 'En cours de réparation',
            trend: 'down',
            trendValue: -15.7,
            color: 'icon-maintenance',
            progress: stats.totalVehicles > 0 ? (stats.maintenance / stats.totalVehicles) * 100 : 0,
            chartData: [8, 6, 4, 7, 5, 3, stats.maintenance]
        }
    ];

    const secondaryMetrics = [
        { value: stats.reservations, label: 'Réservations' },
        { value: `${stats.revenue}€`, label: 'Revenus' },
        { value: `${stats.utilisation}%`, label: 'Taux d\'utilisation' },
        { value: '4.8⭐', label: 'Note moyenne' },
        { value: '24h', label: 'Délai moyen' },
        { value: '98%', label: 'Satisfaction client' }
    ];

    if (loading) {
        return (
            <div className="dashboard-container">
                <FloatingParticles />
                <div className="stats-dashboard">
                    <div className="dashboard-header">
                        <div className="loading-spinner"></div>
                        <h1>Chargement des statistiques...</h1>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboard-container">
                <FloatingParticles />
                <div className="stats-dashboard">
                    <div className="dashboard-header">
                        <h1>❌ Erreur</h1>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <FloatingParticles />
            <div className="stats-dashboard">
                <header className="dashboard-header">
                    <h1 className="dashboard-title">📊 Statistiques Véhicules</h1>
                    <p className="dashboard-subtitle">
                        Tableau de bord moderne et interactif - Mise à jour en temps réel
                    </p>
                </header>
                <div className="stats-grid">
                    {mainStats.map((stat, index) => (
                        <StatCard
                            key={index}
                            {...stat}
                            index={index}
                        />
                    ))}
                </div>
                <div className="secondary-metrics">
                    {secondaryMetrics.map((metric, index) => (
                        <MetricCard
                            key={index}
                            {...metric}
                            index={index}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StatsDashboard;