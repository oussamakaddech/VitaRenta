import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler,
    ScatterController,
    BubbleController
} from 'chart.js';
import { Doughnut, Bar, Line, Radar, Scatter, Bubble, PolarArea } from 'react-chartjs-2';
import './Dashboard.css';

// Enregistrement des composants Chart.js étendus
ChartJS.register(
    ArcElement, 
    Tooltip, 
    Legend, 
    CategoryScale, 
    LinearScale, 
    BarElement, 
    Title, 
    PointElement, 
    LineElement, 
    RadialLinearScale,
    Filler,
    ScatterController,
    BubbleController
);

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Hook personnalisé pour les animations avec Intersection Observer
const useAdvancedAnimateOnMount = (threshold = 0.1, rootMargin = '0px') => {
    const [isVisible, setIsVisible] = useState(false);
    const elementRef = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold, rootMargin }
        );

        const currentElement = elementRef.current;
        if (currentElement) {
            observer.observe(currentElement);
        }

        return () => {
            if (currentElement) {
                observer.unobserve(currentElement);
            }
        };
    }, [threshold, rootMargin]);

    return [elementRef, isVisible];
};

// Fonction utilitaire pour générer des couleurs dynamiques
const generateDynamicColors = (count, baseHue = 200) => {
    const colors = [];
    const saturation = 70;
    const lightness = 60;
    
    for (let i = 0; i < count; i++) {
        const hue = (baseHue + (i * 360 / count)) % 360;
        colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
    }
    return colors;
};

// Fonction utilitaire pour les nombres sécurisés
const fleetSafeNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

// Hook personnalisé pour les animations simples (fallback)
const useFleetAnimateOnMount = (delay = 0, animationsEnabled = true) => {
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

// Composant Graphique Doughnut Avancé
const AdvancedDoughnutChart = ({ data, labels, title, colors }) => {
    const safeData = Array.isArray(data) ? data : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    const dynamicColors = colors || generateDynamicColors(safeData.length);

    const chartData = useMemo(() => ({
        labels: safeLabels,
        datasets: [
            {
                label: title,
                data: safeData,
                backgroundColor: dynamicColors.map(color => color + '80'),
                borderColor: dynamicColors,
                borderWidth: 3,
                hoverOffset: 15,
                hoverBorderWidth: 4,
            },
        ],
    }), [safeData, safeLabels, title, dynamicColors]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: '#fff',
                    font: { size: 14, weight: '600' },
                    padding: 20,
                    usePointStyle: true,
                    pointStyle: 'circle',
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 15,
                padding: 20,
                titleFont: { size: 16, weight: 'bold' },
                bodyFont: { size: 14 },
                displayColors: true,
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                    }
                }
            },
        },
        cutout: '65%',
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 2000,
            easing: 'easeOutQuart',
        },
        elements: {
            arc: {
                borderJoinStyle: 'round',
            }
        }
    }), []);

    if (safeData.length === 0) {
        return (
            <div className="fleet-chart-placeholder">
                <div className="placeholder-content">
                    <div className="placeholder-icon">📊</div>
                    <div className="placeholder-text">Aucune donnée disponible</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fleet-advanced-chart-container">
            <h3 className="chart-title">{title}</h3>
            <div className="chart-wrapper">
                <Doughnut data={chartData} options={options} />
                <div className="chart-center-info">
                    <div className="center-number">{safeData.reduce((a, b) => a + b, 0)}</div>
                    <div className="center-label">Total</div>
                </div>
            </div>
        </div>
    );
};

// Composant Graphique Line Avancé avec Gradients CORRIGÉ
const AdvancedLineChart = ({ data, labels, title, color = '#00d4ff' }) => {
    const chartRef = useRef(null);
    const [gradient, setGradient] = useState(null);
    const safeData = Array.isArray(data) ? data : [];
    const safeLabels = Array.isArray(labels) ? labels : [];

    // Créer le gradient après le montage du composant
    useEffect(() => {
        if (chartRef.current && chartRef.current.canvas) {
            const canvas = chartRef.current.canvas;
            const ctx = canvas.getContext('2d');
            
            if (ctx && typeof ctx.createLinearGradient === 'function') {
                const newGradient = ctx.createLinearGradient(0, 0, 0, 400);
                newGradient.addColorStop(0, color + '80');
                newGradient.addColorStop(1, color + '00');
                setGradient(newGradient);
            }
        }
    }, [color]);

    const chartData = useMemo(() => ({
        labels: safeLabels,
        datasets: [
            {
                label: title,
                data: safeData,
                borderColor: color,
                backgroundColor: gradient || (color + '20'), // Fallback si gradient pas prêt
                borderWidth: 4,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: color,
                pointBorderColor: '#fff',
                pointBorderWidth: 3,
                pointRadius: 8,
                pointHoverRadius: 12,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: color,
                pointHoverBorderWidth: 4,
            },
        ],
    }), [safeData, safeLabels, title, color, gradient]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 15,
                padding: 20,
                titleFont: { size: 16, weight: 'bold' },
                bodyFont: { size: 14 },
                borderColor: 'rgba(255, 255, 255, 0.3)',
                borderWidth: 1,
                mode: 'index',
                intersect: false,
                position: 'nearest',
            },
        },
        scales: {
            x: {
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    font: { size: 12, weight: '500' } 
                },
                grid: { 
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false,
                },
                border: {
                    display: false,
                }
            },
            y: {
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    font: { size: 12, weight: '500' } 
                },
                grid: { 
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false,
                },
                border: {
                    display: false,
                }
            },
        },
        animation: {
            duration: 2500,
            easing: 'easeOutQuart',
            tension: {
                duration: 2500,
                easing: 'easeOutQuart',
                from: 1,
                to: 0.4,
            }
        },
        interaction: {
            intersect: false,
            mode: 'index',
        },
        elements: {
            line: {
                borderCapStyle: 'round',
                borderJoinStyle: 'round',
            }
        }
    }), []);

    if (safeData.length === 0) {
        return (
            <div className="fleet-chart-placeholder">
                <div className="placeholder-content">
                    <div className="placeholder-icon">📈</div>
                    <div className="placeholder-text">Aucune donnée de tendance</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fleet-advanced-chart-container">
            <h3 className="chart-title">{title}</h3>
            <div className="chart-wrapper">
                <Line ref={chartRef} data={chartData} options={options} />
            </div>
        </div>
    );
};

// Composant Graphique Radar Avancé
const AdvancedRadarChart = ({ data, labels, title, colors }) => {
    const safeData = Array.isArray(data) ? data : [];
    const safeLabels = Array.isArray(labels) ? labels : [];
    const dynamicColors = colors || ['#00d4ff', '#8b5cf6', '#10b981'];

    const chartData = useMemo(() => ({
        labels: safeLabels,
        datasets: safeData.map((dataset, index) => ({
            label: dataset.label || `Dataset ${index + 1}`,
            data: Array.isArray(dataset.data) ? dataset.data : dataset,
            backgroundColor: (dynamicColors[index % dynamicColors.length] || '#00d4ff') + '20',
            borderColor: dynamicColors[index % dynamicColors.length] || '#00d4ff',
            borderWidth: 3,
            pointBackgroundColor: dynamicColors[index % dynamicColors.length] || '#00d4ff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: dynamicColors[index % dynamicColors.length] || '#00d4ff',
            pointHoverBorderWidth: 3,
        })),
    }), [safeData, safeLabels, dynamicColors]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: { size: 14, weight: '600' },
                    padding: 20,
                    usePointStyle: true,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 15,
                padding: 20,
                titleFont: { size: 16, weight: 'bold' },
                bodyFont: { size: 14 },
            },
        },
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    lineWidth: 2,
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.2)',
                    circular: true,
                },
                pointLabels: {
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: { size: 12, weight: '600' },
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    backdropColor: 'transparent',
                    font: { size: 10 },
                },
                min: 0,
            },
        },
        animation: {
            duration: 2000,
            easing: 'easeOutQuart',
        },
        elements: {
            line: {
                borderJoinStyle: 'round',
            },
            point: {
                borderJoinStyle: 'round',
            }
        }
    }), []);

    if (safeData.length === 0) {
        return (
            <div className="fleet-chart-placeholder">
                <div className="placeholder-content">
                    <div className="placeholder-icon">🎯</div>
                    <div className="placeholder-text">Aucune donnée radar</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fleet-advanced-chart-container">
            <h3 className="chart-title">{title}</h3>
            <div className="chart-wrapper">
                <Radar data={chartData} options={options} />
            </div>
        </div>
    );
};

// Composant Graphique Bubble pour analyses avancées
const AdvancedBubbleChart = ({ data, title }) => {
    const safeData = Array.isArray(data) ? data : [];

    const chartData = useMemo(() => ({
        datasets: safeData.map((dataset, index) => ({
            label: dataset.label || `Dataset ${index + 1}`,
            data: dataset.data || [],
            backgroundColor: generateDynamicColors(1, 200 + index * 60)[0] + '80',
            borderColor: generateDynamicColors(1, 200 + index * 60),
            borderWidth: 2,
            hoverRadius: 8,
            hoverBorderWidth: 3,
        })),
    }), [safeData]);

    const options = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: { size: 14, weight: '600' },
                    padding: 20,
                    usePointStyle: true,
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: '#fff',
                bodyColor: '#fff',
                cornerRadius: 15,
                padding: 20,
                callbacks: {
                    label: function(context) {
                        const point = context.parsed;
                        return `${context.dataset.label}: (${point.x}, ${point.y}, Taille: ${context.parsed.r})`;
                    }
                }
            },
        },
        scales: {
            x: {
                type: 'linear',
                position: 'bottom',
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    font: { size: 12 } 
                },
                grid: { 
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false,
                },
                title: {
                    display: true,
                    text: 'Performance',
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: { size: 14, weight: 'bold' }
                }
            },
            y: {
                ticks: { 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    font: { size: 12 } 
                },
                grid: { 
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false,
                },
                title: {
                    display: true,
                    text: 'Utilisation',
                    color: 'rgba(255, 255, 255, 0.9)',
                    font: { size: 14, weight: 'bold' }
                }
            },
        },
        animation: {
            duration: 2500,
            easing: 'easeOutQuart',
        },
    }), []);

    if (safeData.length === 0) {
        return (
            <div className="fleet-chart-placeholder">
                <div className="placeholder-content">
                    <div className="placeholder-icon">🫧</div>
                    <div className="placeholder-text">Aucune donnée bubble</div>
                </div>
            </div>
        );
    }

    return (
        <div className="fleet-advanced-chart-container">
            <h3 className="chart-title">{title}</h3>
            <div className="chart-wrapper">
                <Bubble data={chartData} options={options} />
            </div>
        </div>
    );
};

// Composant pour les particules flottantes
const FleetFloatingParticles = ({ animationsEnabled }) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animationsEnabled || reduceMotion) return null;
    
    const particles = useMemo(() => 
        Array.from({ length: 25 }, (_, i) => ({
            id: i,
            delay: Math.random() * 20,
            left: Math.random() * 100,
            size: Math.random() * 6 + 3,
            color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#8b5cf6' : '#10b981',
        }))
    , []);
    
    return (
        <div className="fleet-floating-particles">
            {particles.map(particle => (
                <div
                    key={particle.id}
                    className="fleet-particle"
                    style={{
                        left: `${particle.left}%`,
                        animationDelay: `${particle.delay}s`,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        background: `radial-gradient(circle, ${particle.color}80 0%, transparent 70%)`,
                    }}
                />
            ))}
        </div>
    );
};

// Composant de carte statistique amélioré
const EnhancedFleetStatCard = ({
    icon,
    number,
    label,
    description,
    color,
    chartData,
    chartType,
    trendData,
    index,
    animationsEnabled,
}) => {
    const [elementRef, isVisible] = useAdvancedAnimateOnMount();
    const [isHovered, setIsHovered] = useState(false);
    
    const safeNumber = useMemo(() => {
        return typeof number === 'number' && !isNaN(number) ? number : 0;
    }, [number]);

    const renderAdvancedChart = () => {
        if (!chartData || !Array.isArray(chartData) || chartData.length === 0) return null;

        switch (chartType) {
            case 'doughnut':
                return (
                    <AdvancedDoughnutChart
                        data={chartData}
                        labels={['Disponibles', 'En location', 'Maintenance']}
                        title="Répartition"
                        colors={['#10b981', '#f472b6', '#fbbf24']}
                    />
                );
            case 'line':
                return (
                    <AdvancedLineChart
                        data={trendData || chartData}
                        labels={Array.from({length: (trendData || chartData).length}, (_, i) => `J${i+1}`)}
                        title="Tendance 7 jours"
                        color="#00d4ff"
                    />
                );
            case 'radar':
                return (
                    <AdvancedRadarChart
                        data={[{
                            label: 'Métriques',
                            data: chartData.slice(0, 6)
                        }]}
                        labels={['Total', 'Disponible', 'Loué', 'Maintenance', 'Revenus', 'Utilisation']}
                        title="Vue d'ensemble"
                        colors={['#00d4ff']}
                    />
                );
            case 'bubble':
                return (
                    <AdvancedBubbleChart
                        data={[{
                            label: 'Performance',
                            data: chartData.map((value, idx) => ({
                                x: idx * 10,
                                y: value,
                                r: Math.max(5, value / 10)
                            }))
                        }]}
                        title="Analyse Performance"
                    />
                );
            default:
                return null;
        }
    };

    const animationDelay = useMemo(() => `${index * 150}ms`, [index]);

    return (
        <div
            ref={elementRef}
            className={`enhanced-fleet-stat-card ${isVisible ? 'enhanced-animate-in' : ''} ${isHovered ? 'enhanced-hovered' : ''}`}
            style={{ animationDelay }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            role="region"
            aria-labelledby={`enhanced-fleet-stat-card-${index}`}
            aria-describedby={`enhanced-fleet-stat-desc-${index}`}
        >
            <div className="enhanced-card-background"></div>
            <div className="enhanced-card-content">
                <div className={`enhanced-stat-icon ${color}`} aria-hidden="true">
                    {icon}
                </div>
                <div className="enhanced-stat-main">
                    <div className="enhanced-stat-number" id={`enhanced-fleet-stat-card-${index}`}>
                        <span className="number-animation">{safeNumber.toLocaleString()}</span>
                    </div>
                    <div className="enhanced-stat-label">{label}</div>
                    <div className="enhanced-stat-description" id={`enhanced-fleet-stat-desc-${index}`}>
                        {description}
                    </div>
                </div>
            </div>
            {renderAdvancedChart()}
            <div className="enhanced-card-glow"></div>
        </div>
    );
};

// Composants pour les métriques secondaires et alertes
const FleetMetricCard = ({ value, label, index, animationsEnabled }) => {
    const isVisible = useFleetAnimateOnMount(index * 100, animationsEnabled);
    const displayValue = useMemo(() => 
        value !== undefined && value !== null ? value : 'N/A'
    , [value]);
    
    return (
        <div
            className={`fleet-metric-card ${isVisible ? 'fleet-animate-in' : ''}`}
            role="region"
            aria-labelledby={`fleet-metric-card-${index}`}
        >
            <div className="fleet-metric-value" id={`fleet-metric-card-${index}`}>
                {displayValue}
            </div>
            <div className="fleet-metric-label">{label}</div>
        </div>
    );
};

const FleetMaintenanceAlerts = ({ alerts, onDismiss, onSendEmail, animationsEnabled }) => {
    const isVisible = useFleetAnimateOnMount(300, animationsEnabled);
    
    const safeAlerts = useMemo(() => 
        Array.isArray(alerts) ? alerts : []
    , [alerts]);
    
    if (safeAlerts.length === 0) {
        return null;
    }
    
    return (
        <div className={`fleet-maintenance-alerts ${isVisible ? 'fleet-animate-in' : ''}`}>
            <h2>🔧 Alertes de Maintenance</h2>
            <div className="fleet-alerts-container">
                {safeAlerts.map((alert) => (
                    <div key={alert.id} className="fleet-alert-toast">
                        <div className="fleet-alert-content">
                            <strong>{alert.vehicleName || 'Véhicule inconnu'}</strong>
                            <p>{alert.message || 'Maintenance requise'}</p>
                            <p>Prochaine maintenance: {alert.nextMaintenanceDate || 'À définir'}</p>
                        </div>
                        <div className="fleet-alert-actions">
                            <button 
                                className="fleet-send-email-button"
                                onClick={() => onSendEmail(alert)}
                                aria-label={`Envoyer un email pour ${alert.vehicleName || 'ce véhicule'}`}
                            >
                                Envoyer un email
                            </button>
                            <button 
                                className="fleet-dismiss-button"
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

const FleetRevenueSection = ({ revenueData, onGenerateBilling, animationsEnabled }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const isVisible = useFleetAnimateOnMount(500, animationsEnabled);
    
    const handlePeriodChange = useCallback((e) => {
        setSelectedPeriod(e.target.value);
    }, []);
    
    const safeRevenueData = useMemo(() => revenueData || { total: 0, details: [] }, [revenueData]);
    const safeTotal = useMemo(() => fleetSafeNumber(safeRevenueData.total, 0), [safeRevenueData.total]);
    const safeDetails = useMemo(() => 
        Array.isArray(safeRevenueData.details) ? safeRevenueData.details : []
    , [safeRevenueData.details]);
    
    return (
        <div className={`fleet-revenue-section ${isVisible ? 'fleet-animate-in' : ''}`}>
            <h2>💰 Revenus</h2>
            <div>
                <h3>Total: {safeTotal.toFixed(2)}€</h3>
                <select value={selectedPeriod} onChange={handlePeriodChange} aria-label="Sélectionner la période pour les revenus">
                    <option value="day">Aujourd'hui</option>
                    <option value="week">Cette semaine</option>
                    <option value="month">Ce mois</option>
                    <option value="year">Cette année</option>
                </select>
            </div>
            
            <table className="fleet-revenue-table">
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
                                <td>{fleetSafeNumber(item.days, 0)}</td>
                                <td>{fleetSafeNumber(item.revenue, 0).toFixed(2)}€</td>
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
                className="fleet-billing-button"
                onClick={() => onGenerateBilling(selectedPeriod)}
                aria-label={`Générer une facture pour ${selectedPeriod}`}
            >
                Générer une facture
            </button>
        </div>
    );
};

// COMPOSANT PRINCIPAL - FleetDashboard
const FleetDashboard = ({ token, user, onLogout, settings = { animationsEnabled: true } }) => {
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
        agenceId: null
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
                    revenue: fleetSafeNumber(reservation.montant_total, 0),
                };
            });
            
            setRevenueData({
                total: fleetSafeNumber(reservationsData.revenus_total, 0),
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
                totalVehicles: fleetSafeNumber(vehiculesData.total, 0),
                disponibles: fleetSafeNumber(vehiculesData.disponibles, 0),
                loues: fleetSafeNumber(vehiculesData.loues, 0),
                maintenance: fleetSafeNumber(vehiculesData.maintenance, 0),
                reservations: fleetSafeNumber(reservationsData.total, 0),
                revenue: fleetSafeNumber(reservationsData.revenus_total, 0),
                utilisation: fleetSafeNumber(vehiculesData.taux_utilisation, 0),
            });
            
            const generateTrendData = (baseValue, variance = 0.2) => {
                const safeBaseValue = fleetSafeNumber(baseValue, 10);
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
        <div className="fleet-filter-controls">
            <select
                value={filter.period}
                onChange={(e) => handleFilterChange({ period: e.target.value })}
                aria-label="Sélectionner la période pour les statistiques"
            >
                <option value="day">Dernier jour</option>
                <option value="week">Dernière semaine</option>
                <option value="month">Dernier mois</option>
            </select>
            
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
            color: 'fleet-icon-vehicles',
            chartType: 'radar',
            chartData: [
                stats.totalVehicles,
                stats.disponibles,
                stats.loues,
                stats.maintenance,
                Math.floor(stats.revenue / 100),
                stats.utilisation
            ],
            trendData: trends.vehiclesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" />
            </svg>,
            number: stats.disponibles,
            label: 'Disponibles',
            description: 'Prêts à être loués',
            color: 'fleet-icon-available',
            chartType: 'doughnut',
            chartData: [stats.disponibles, stats.loues, stats.maintenance],
            trendData: trends.disponiblesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>,
            number: stats.loues,
            label: 'En Location',
            description: 'Actuellement loués',
            color: 'fleet-icon-rented',
            chartType: 'line',
            chartData: trends.louesTrend,
            trendData: trends.louesTrend,
        },
        {
            icon: <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>,
            number: stats.maintenance,
            label: 'Maintenance',
            description: 'En cours de réparation',
            color: 'fleet-icon-maintenance',
            chartType: 'bubble',
            chartData: trends.maintenanceTrend,
            trendData: trends.maintenanceTrend,
        },
    ], [stats, trends]);
    
    const secondaryMetrics = useMemo(() => [
        { value: stats.reservations, label: 'Réservations' },
        { value: `${fleetSafeNumber(stats.revenue, 0).toFixed(2)}€`, label: 'Revenus' },
        { value: `${fleetSafeNumber(stats.utilisation, 0)}%`, label: "Taux d'utilisation" },
        { value: '4.8⭐', label: 'Note moyenne' },
        { value: '24h', label: 'Délai moyen' },
        { value: '98%', label: 'Satisfaction client' },
    ], [stats]);
    
    if (loading) {
        return (
            <div className="fleet-dashboard-container">
                <div className="fleet-stats-dashboard">
                    <div className="fleet-dashboard-header">
                        <div className="fleet-loading-spinner" role="status" aria-live="polite"></div>
                        <h1>Chargement des statistiques...</h1>
                    </div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="fleet-dashboard-container">
                <div className="fleet-stats-dashboard">
                    <div className="fleet-dashboard-header">
                        <h1>❌ Erreur</h1>
                        <p>{error}</p>
                        <button
                            onClick={() => {
                                setError(null);
                                fetchStats();
                            }}
                            aria-label="Réessayer le chargement des statistiques"
                            className="fleet-retry-button"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="fleet-dashboard-container" role="main">
            <FleetFloatingParticles animationsEnabled={settings.animationsEnabled} />
            <div className="fleet-stats-dashboard">
                <header className="fleet-dashboard-header">
                    <h1 className="fleet-dashboard-title">🚗 Tableau de Bord Flotte de Véhicules</h1>
                    <p className="fleet-dashboard-subtitle">
                        Gestion intelligente et analyse en temps réel de votre flotte automobile
                    </p>
                    {FilterControls}
                </header>
                
                <div className="fleet-stats-grid">
                    {mainStats.map((stat, index) => (
                        <EnhancedFleetStatCard
                            key={index}
                            {...stat}
                            index={index}
                            animationsEnabled={settings.animationsEnabled}
                        />
                    ))}
                </div>
                
                <div className="fleet-secondary-metrics">
                    {secondaryMetrics.map((metric, index) => (
                        <FleetMetricCard
                            key={index}
                            {...metric}
                            index={index}
                            animationsEnabled={settings.animationsEnabled}
                        />
                    ))}
                </div>
                
                <FleetMaintenanceAlerts 
                    alerts={maintenanceAlerts}
                    onDismiss={handleDismissAlert}
                    onSendEmail={handleSendEmail}
                    animationsEnabled={settings.animationsEnabled}
                />
                
                <FleetRevenueSection 
                    revenueData={revenueData}
                    onGenerateBilling={handleGenerateBilling}
                    animationsEnabled={settings.animationsEnabled}
                />
            </div>
        </div>
    );
};

// PropTypes pour tous les composants
FleetDashboard.propTypes = {
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

EnhancedFleetStatCard.propTypes = {
    icon: PropTypes.element.isRequired,
    number: PropTypes.number,
    label: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    color: PropTypes.string.isRequired,
    chartData: PropTypes.array,
    chartType: PropTypes.oneOf(['doughnut', 'line', 'radar', 'bubble']),
    trendData: PropTypes.array,
    index: PropTypes.number.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

FleetFloatingParticles.propTypes = {
    animationsEnabled: PropTypes.bool.isRequired,
};

AdvancedDoughnutChart.propTypes = {
    data: PropTypes.array,
    labels: PropTypes.array,
    title: PropTypes.string.isRequired,
    colors: PropTypes.array,
};

AdvancedLineChart.propTypes = {
    data: PropTypes.array,
    labels: PropTypes.array,
    title: PropTypes.string.isRequired,
    color: PropTypes.string,
};

AdvancedRadarChart.propTypes = {
    data: PropTypes.array,
    labels: PropTypes.array,
    title: PropTypes.string.isRequired,
    colors: PropTypes.array,
};

AdvancedBubbleChart.propTypes = {
    data: PropTypes.array,
    title: PropTypes.string.isRequired,
};

FleetMetricCard.propTypes = {
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    label: PropTypes.string.isRequired,
    index: PropTypes.number.isRequired,
    animationsEnabled: PropTypes.bool.isRequired,
};

FleetMaintenanceAlerts.propTypes = {
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

FleetRevenueSection.propTypes = {
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

// Export par défaut et exports nommés
export {
    AdvancedDoughnutChart,
    AdvancedLineChart,
    AdvancedRadarChart,
    AdvancedBubbleChart,
    EnhancedFleetStatCard,
    useAdvancedAnimateOnMount,
    generateDynamicColors
};

export default FleetDashboard;
