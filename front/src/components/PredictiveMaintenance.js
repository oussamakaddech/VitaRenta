import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import VehicleSelector from './VehicleSelector';
import './PredictiveMaintenance.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PredictiveMaintenance = ({ token, user }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [predictions, setPredictions] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [daysAhead, setDaysAhead] = useState(30);
    
    // Utiliser useRef pour éviter les dépendances changeantes
    const daysAheadRef = useRef(daysAhead);
    const tokenRef = useRef(token);
    const selectedVehicleIdRef = useRef(selectedVehicleId);
    
    // Mettre à jour les refs quand les valeurs changent
    useEffect(() => {
        daysAheadRef.current = daysAhead;
        tokenRef.current = token;
        selectedVehicleIdRef.current = selectedVehicleId;
    }, [daysAhead, token, selectedVehicleId]);
    
    // Configuration axios
    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };
    
    // Récupération des prédictions
    const fetchPredictions = useCallback(async () => {
        if (!selectedVehicleIdRef.current || !tokenRef.current) return;
        
        setLoading(true);
        setError(null);
        
        try {
            const response = await axios.post(
                `${API_BASE_URL}/api/iot-data/predict_maintenance/`,
                { 
                    vehicle_id: selectedVehicleIdRef.current, 
                    days_ahead: daysAheadRef.current 
                },
                axiosConfig
            );
            
            setPredictions(response.data);
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Erreur lors de la prédiction';
            setError(errorMessage);
            console.error('Prediction error:', err);
        } finally {
            setLoading(false);
        }
    }, [API_BASE_URL]); // Seule dépendance stable
    
    // Récupération des données historiques
    const fetchHistoricalData = useCallback(async () => {
        if (!selectedVehicleIdRef.current || !tokenRef.current) return;
        
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/iot-data/`,
                { 
                    params: { vehicle_id: selectedVehicleIdRef.current },
                    ...axiosConfig 
                }
            );
            
            if (response.data && Array.isArray(response.data)) {
                const formattedData = response.data
                    .slice(-30) // Derniers 30 points
                    .map(item => ({
                        date: new Date(item.timestamp).toLocaleDateString(),
                        temperature: parseFloat(item.temperature) || 0,
                        vibration: parseFloat(item.vibration) || 0,
                        battery_health: parseFloat(item.battery_health) || 0
                    }));
                
                setHistoricalData(formattedData);
            }
        } catch (err) {
            console.error('Historical data error:', err);
        }
    }, [API_BASE_URL]); // Seule dépendance stable
    
    // Génération de données de test
    const generateTestData = useCallback(async () => {
        if (!selectedVehicleIdRef.current) return;
        
        setLoading(true);
        try {
            await axios.post(
                `${API_BASE_URL}/api/iot-data/generate_test_data/`,
                { vehicle_id: selectedVehicleIdRef.current, days: 30 },
                axiosConfig
            );
            
            // Rafraîchir les données après génération
            await fetchHistoricalData();
            await fetchPredictions();
            alert('Données de test générées avec succès');
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Erreur lors de la génération';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [fetchHistoricalData, fetchPredictions, API_BASE_URL]);
    
    // Effects - Utiliser un useEffect simple avec des dépendances stables
    useEffect(() => {
        if (selectedVehicleId && token) {
            fetchPredictions();
            fetchHistoricalData();
        }
    }, [selectedVehicleId, token, fetchPredictions, fetchHistoricalData]);
    
    // Fonction pour obtenir la couleur selon la confiance
    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.7) return '#f44336'; // Rouge - Risque élevé
        if (confidence >= 0.4) return '#ff9800'; // Orange - Attention
        return '#4caf50'; // Vert - OK
    };
    
    // Fonction pour obtenir le niveau de priorité
    const getPriorityLevel = (confidence) => {
        if (confidence >= 0.7) return 'ÉLEVÉE';
        if (confidence >= 0.4) return 'MOYENNE';
        return 'FAIBLE';
    };
    
    if (!token) {
        return <div className="error">Authentification requise</div>;
    }
    
    return (
        <div className="maintenance-container">
            <h3>Maintenance Prédictive</h3>
            
            <VehicleSelector 
                token={token} 
                user={user} 
                onVehicleSelect={setSelectedVehicleId}
                selectedVehicleId={selectedVehicleId}
            />
            
            {!selectedVehicleId ? (
                <div className="no-vehicle-selected">
                    <p>Veuillez sélectionner un véhicule pour afficher les prédictions</p>
                </div>
            ) : (
                <>
                    <div className="controls">
                        <label>
                            Période de prédiction (jours):
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={daysAhead}
                                onChange={(e) => setDaysAhead(parseInt(e.target.value) || 30)}
                            />
                        </label>
                        
                        <button 
                            onClick={fetchPredictions} 
                            disabled={loading}
                            className="predict-button"
                        >
                            {loading ? 'Analyse...' : 'Analyser'}
                        </button>
                        
                        <button 
                            onClick={generateTestData} 
                            disabled={loading}
                            className="generate-button"
                        >
                            Générer données test
                        </button>
                    </div>
                    
                    {error && (
                        <div className="error-message">
                            {error}
                        </div>
                    )}
                    
                    {loading && (
                        <div className="loading">
                            <div className="spinner"></div>
                            <p>Analyse en cours...</p>
                        </div>
                    )}
                    
                    {predictions && !loading && (
                        <div className="results">
                            <div className="prediction-summary">
                                <div className="prediction-card">
                                    <h4>Type de maintenance</h4>
                                    <p className="failure-type">{predictions.failure_type}</p>
                                </div>
                                <div className="prediction-card">
                                    <h4>Date prédite</h4>
                                    <p className="predicted-date">
                                        {new Date(predictions.predicted_failure_date).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="prediction-card">
                                    <h4>Niveau de confiance</h4>
                                    <div className="confidence-display">
                                        <div 
                                            className="confidence-bar"
                                            style={{ backgroundColor: getConfidenceColor(predictions.confidence) }}
                                        >
                                            <div 
                                                className="confidence-fill"
                                                style={{ width: `${predictions.confidence * 100}%` }}
                                            />
                                        </div>
                                        <span className="confidence-text">
                                            {(predictions.confidence * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <p className="priority-level">
                                        Priorité: {getPriorityLevel(predictions.confidence)}
                                    </p>
                                </div>
                                <div className="prediction-card recommendation">
                                    <h4>Recommandation</h4>
                                    <p>{predictions.recommendation}</p>
                                </div>
                            </div>
                            
                            {/* Ajouter l'affichage des tendances si disponible */}
                            {predictions.trends && (
                                <div className="trends-section">
                                    <h4>Tendances actuelles</h4>
                                    <div className="trends-grid">
                                        <div className="trend-item">
                                            <h5>Température</h5>
                                            <p className="trend-value">{predictions.trends.temperature.current}°C</p>
                                            <p className="trend-threshold">Seuil: {predictions.trends.temperature.threshold}°C</p>
                                            <p className={`trend-indicator ${predictions.trends.temperature.trend > 0 ? 'positive' : 'negative'}`}>
                                                {predictions.trends.temperature.trend > 0 ? '↑' : '↓'} {Math.abs(predictions.trends.temperature.trend * 100).toFixed(2)}%
                                            </p>
                                            <div className="risk-meter">
                                                <div className="risk-label">Risque:</div>
                                                <div className="risk-bar">
                                                    <div 
                                                        className="risk-fill"
                                                        style={{ 
                                                            width: `${Math.min(100, predictions.trends.temperature.risk * 100)}%`,
                                                            backgroundColor: predictions.trends.temperature.risk > 0.7 ? '#f44336' : 
                                                                             predictions.trends.temperature.risk > 0.4 ? '#ff9800' : '#4caf50'
                                                        }}
                                                    />
                                                </div>
                                                <span className="risk-value">{(predictions.trends.temperature.risk * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="trend-item">
                                            <h5>Vibration</h5>
                                            <p className="trend-value">{predictions.trends.vibration.current} m/s²</p>
                                            <p className="trend-threshold">Seuil: {predictions.trends.vibration.threshold} m/s²</p>
                                            <p className={`trend-indicator ${predictions.trends.vibration.trend > 0 ? 'positive' : 'negative'}`}>
                                                {predictions.trends.vibration.trend > 0 ? '↑' : '↓'} {Math.abs(predictions.trends.vibration.trend * 100).toFixed(2)}%
                                            </p>
                                            <div className="risk-meter">
                                                <div className="risk-label">Risque:</div>
                                                <div className="risk-bar">
                                                    <div 
                                                        className="risk-fill"
                                                        style={{ 
                                                            width: `${Math.min(100, predictions.trends.vibration.risk * 100)}%`,
                                                            backgroundColor: predictions.trends.vibration.risk > 0.7 ? '#f44336' : 
                                                                             predictions.trends.vibration.risk > 0.4 ? '#ff9800' : '#4caf50'
                                                        }}
                                                    />
                                                </div>
                                                <span className="risk-value">{(predictions.trends.vibration.risk * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                        <div className="trend-item">
                                            <h5>Batterie</h5>
                                            <p className="trend-value">{predictions.trends.battery.current}%</p>
                                            <p className="trend-threshold">Seuil: {predictions.trends.battery.threshold}%</p>
                                            <p className={`trend-indicator ${predictions.trends.battery.trend < 0 ? 'positive' : 'negative'}`}>
                                                {predictions.trends.battery.trend < 0 ? '↓' : '↑'} {Math.abs(predictions.trends.battery.trend * 100).toFixed(2)}%
                                            </p>
                                            <div className="risk-meter">
                                                <div className="risk-label">Risque:</div>
                                                <div className="risk-bar">
                                                    <div 
                                                        className="risk-fill"
                                                        style={{ 
                                                            width: `${Math.min(100, predictions.trends.battery.risk * 100)}%`,
                                                            backgroundColor: predictions.trends.battery.risk > 0.7 ? '#f44336' : 
                                                                             predictions.trends.battery.risk > 0.4 ? '#ff9800' : '#4caf50'
                                                        }}
                                                    />
                                                </div>
                                                <span className="risk-value">{(predictions.trends.battery.risk * 100).toFixed(0)}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {historicalData.length > 0 && (
                                <div className="chart-section">
                                    <h4>Évolution des paramètres</h4>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <LineChart data={historicalData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis yAxisId="left" />
                                            <YAxis yAxisId="right" orientation="right" />
                                            <Tooltip />
                                            <Legend />
                                            
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="temperature"
                                                stroke="#ff6b6b"
                                                strokeWidth={2}
                                                name="Température (°C)"
                                            />
                                            <Line
                                                yAxisId="left"
                                                type="monotone"
                                                dataKey="vibration"
                                                stroke="#4ecdc4"
                                                strokeWidth={2}
                                                name="Vibration (m/s²)"
                                            />
                                            <Line
                                                yAxisId="right"
                                                type="monotone"
                                                dataKey="battery_health"
                                                stroke="#45b7d1"
                                                strokeWidth={2}
                                                name="Batterie (%)"
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default PredictiveMaintenance;