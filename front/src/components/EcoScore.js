// EcoScore.js
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import VehicleSelector from './VehicleSelector';
import './EcoScore.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const EcoScore = ({ token, user, onLogout }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [ecoScore, setEcoScore] = useState(null);
    const [scoreDistribution, setScoreDistribution] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchWithRetry = async (fetchFn, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await fetchFn();
            } catch (err) {
                // Ne pas réessayer pour les erreurs client (4xx)
                if (err.response && err.response.status >= 400 && err.response.status < 500) {
                    throw err;
                }
                if (i === maxRetries - 1) throw err;
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    };

    // EcoScore.js
// EcoScore.js
const fetchEcoScore = useCallback(async () => {
    if (!selectedVehicleId || !token) return;
    
    setLoading(true);
    setError(null);
    try {
        console.log('Envoi de la requête pour le calcul de l\'éco-score:', { vehicle_id: selectedVehicleId });
        
        const response = await fetchWithRetry(() =>
            axios.post(
                `${API_BASE_URL}/api/eco-score/calculate_eco_score/`,  // Correction de l'URL
                { vehicle_id: selectedVehicleId },
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            )
        );
        
        console.log('Réponse de l\'API:', response.data);
        
        if (response.data && typeof response.data === 'object') {
            // S'assurer que les valeurs sont des nombres
            const score = parseFloat(response.data.score);
            const co2_emissions = parseFloat(response.data.co2_emissions);
            const energy_consumption = parseFloat(response.data.energy_consumption);
            
            if (
                !isNaN(score) && score >= 0 && score <= 100 &&
                !isNaN(co2_emissions) && co2_emissions >= 0 &&
                !isNaN(energy_consumption) && energy_consumption >= 0
            ) {
                setEcoScore({
                    ...response.data,
                    score: score,
                    co2_emissions: co2_emissions,
                    energy_consumption: energy_consumption
                });
                setLastUpdated(new Date(response.data.last_updated));
            } else {
                setError('Données d\'éco-score invalides');
            }
        } else {
            setError('Format de réponse invalide');
        }
    } catch (err) {
        let errorMessage = 'Échec du calcul de l\'éco-score';
        
        if (err.response) {
            console.error('Détails de l\'erreur:', err.response.data);
            
            if (err.response.status === 401) {
                errorMessage = 'Session expirée. Veuillez vous reconnecter.';
                onLogout();
            } else if (err.response.status === 403) {
                errorMessage = 'Vous n\'avez pas la permission d\'accéder à cette ressource.';
            } else if (err.response.status === 404) {
                errorMessage = 'Véhicule non trouvé ou aucune donnée IoT disponible';
            } else if (err.response.status === 500) {
                errorMessage = 'Erreur interne du serveur';
                if (err.response.data && err.response.data.error) {
                    errorMessage += `: ${err.response.data.error}`;
                }
            } else if (err.response.data && err.response.data.error) {
                errorMessage = err.response.data.error;
            }
        } else if (err.request) {
            errorMessage = 'Erreur réseau. Veuillez vérifier votre connexion.';
        } else {
            errorMessage = err.message;
        }
        
        setError(errorMessage);
        console.error('Erreur de calcul de l\'éco-score:', err);
    } finally {
        setLoading(false);
    }
}, [selectedVehicleId, token, onLogout]);

const fetchScoreDistribution = useCallback(async () => {
    if (!token) return;
    
    try {
        const response = await fetchWithRetry(() =>
            axios.get(`${API_BASE_URL}/api/eco-score/distribution/`, {  // Correction de l'URL
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
        );
        
        if (response.data && Array.isArray(response.data)) {
            setScoreDistribution(response.data);
        } else {
            console.error('Format de distribution invalide');
        }
    } catch (err) {
        console.error('Erreur de distribution:', err);
    }
}, [token]);

    useEffect(() => {
        if (selectedVehicleId && token) {
            fetchEcoScore();
            fetchScoreDistribution();
            
            const interval = setInterval(() => {
                fetchEcoScore();
                fetchScoreDistribution();
            }, 5 * 60 * 1000);
            
            return () => clearInterval(interval);
        }
    }, [fetchEcoScore, fetchScoreDistribution, selectedVehicleId, token]);

    const handleRefresh = () => {
        fetchEcoScore();
        fetchScoreDistribution();
    };

    // High-contrast palette
    const COLORS = ['#10b981', '#e5e7eb']; // green + light gray
    const BAR_COLOR = '#2563eb'; // strong blue

    if (!token) {
        return <div className="error">Token d'authentification manquant</div>;
    }
    
    return (
        <div className="eco-score-container">
            <h3>Éco Score</h3>
            
            <VehicleSelector 
                token={token} 
                user={user} 
                onVehicleSelect={setSelectedVehicleId}
                selectedVehicleId={selectedVehicleId}
            />
            
            {!selectedVehicleId ? (
                <div className="no-vehicle-selected">
                    <p>Veuillez sélectionner un véhicule pour afficher le score écologique</p>
                </div>
            ) : (
                <>
                    <div className="refresh-container">
                        <button onClick={handleRefresh} disabled={loading}>
                            {loading ? 'Calcul en cours...' : 'Actualiser le score'}
                        </button>
                        {lastUpdated && (
                            <span className="last-updated">
                                Dernière mise à jour: {lastUpdated.toLocaleString()}
                            </span>
                        )}
                    </div>
                    
                    {loading && (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <span>Calcul de l'éco-score...</span>
                        </div>
                    )}
                    
                    {error && (
                        <div className="error-state">
                            <span className="error-message">⚠️ {error}</span>
                            <button onClick={handleRefresh} className="retry-button">Réessayer</button>
                        </div>
                    )}
                    
                    {!loading && !error && !ecoScore && (
                        <div className="no-data">Aucune donnée d'éco-score disponible</div>
                    )}
                    
                    {!loading && !error && ecoScore && (
                        <>
                            <div className="results">
                                <div className="score-display">
                                    <div
                                        className="score-circle"
                                        style={{ backgroundColor: getScoreColor(ecoScore.score) }}
                                    >
                                        <span>{ecoScore.score.toFixed(1)}/100</span>
                                    </div>
                                    <p className="score-label">{getScoreLabel(ecoScore.score)}</p>
                                </div>
                                
                                <div className="charts-container">
                                    <div className="card chart-section--light">
                                        <h4>Distribution du score</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <PieChart>
                                                <Pie
                                                    data={[
                                                        { name: 'Score', value: ecoScore.score },
                                                        { name: 'Restant', value: 100 - ecoScore.score }
                                                    ]}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    outerRadius={80}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {COLORS.map((color, index) => (
                                                        <Cell key={`cell-${index}`} fill={color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    <div className="card chart-section--light">
                                        <h4>Impact environnemental</h4>
                                        <ResponsiveContainer width="100%" height={200}>
                                            <BarChart data={[
                                                { name: 'CO2', value: ecoScore.co2_emissions, unit: 'g/km' },
                                                { name: 'Énergie', value: ecoScore.energy_consumption, unit: 'kWh/100km' }
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="name" />
                                                <YAxis />
                                                <Tooltip
                                                    formatter={(value, name, props) => [`${value} ${props.payload.unit}`, name]}
                                                />
                                                <Legend />
                                                <Bar dataKey="value" fill={BAR_COLOR} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    
                                    {scoreDistribution.length > 0 && (
                                        <div className="card chart-section--light">
                                            <h4>Distribution des scores de la flotte</h4>
                                            <ResponsiveContainer width="100%" height={200}>
                                                <BarChart data={scoreDistribution}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="range" />
                                                    <YAxis />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar
                                                        dataKey="count"
                                                        fill={BAR_COLOR}
                                                        name="Nombre de véhicules"
                                                    />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="details">
                                    <div className="card">
                                        <h4>Émissions CO2</h4>
                                        <p>{ecoScore.co2_emissions} g/km</p>
                                    </div>
                                    <div className="card">
                                        <h4>Consommation d'énergie</h4>
                                        <p>{ecoScore.energy_consumption} kWh/100km</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

const getScoreColor = (score) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFC107';
    return '#F44336';
};

const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    return 'À améliorer';
};

export default EcoScore;