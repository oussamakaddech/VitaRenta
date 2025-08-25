import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Configuration axios pour les diagnostics
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Ajouter le token JWT si disponible
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const BackendDiagnostic = () => {
  const [diagnostics, setDiagnostics] = useState({
    healthCheck: { status: 'pending', data: null, error: null },
    available: { status: 'pending', data: null, error: null },
    completed: { status: 'pending', data: null, error: null },
    stats: { status: 'pending', data: null, error: null }
  });

  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setIsRunning(true);
    
    // Réinitialiser les diagnostics
    setDiagnostics({
      healthCheck: { status: 'running', data: null, error: null },
      available: { status: 'running', data: null, error: null },
      completed: { status: 'running', data: null, error: null },
      stats: { status: 'running', data: null, error: null }
    });

    // Test 1: Health Check
    try {
      const healthResponse = await api.get('/api/eco-challenges/health_check/');
      setDiagnostics(prev => ({
        ...prev,
        healthCheck: { 
          status: 'success', 
          data: healthResponse.data, 
          error: null,
          responseTime: healthResponse.headers['x-response-time'] || 'N/A'
        }
      }));
    } catch (error) {
      setDiagnostics(prev => ({
        ...prev,
        healthCheck: { 
          status: 'error', 
          data: null, 
          error: error.response?.data || error.message 
        }
      }));
    }

    // Test 2: Available Challenges
    try {
      const availableResponse = await api.get('/api/eco-challenges/available/');
      setDiagnostics(prev => ({
        ...prev,
        available: { 
          status: 'success', 
          data: availableResponse.data, 
          error: null,
          count: Array.isArray(availableResponse.data) ? availableResponse.data.length : 0
        }
      }));
    } catch (error) {
      setDiagnostics(prev => ({
        ...prev,
        available: { 
          status: 'error', 
          data: null, 
          error: error.response?.data || error.message 
        }
      }));
    }

    // Test 3: Completed Challenges
    try {
      const completedResponse = await api.get('/api/eco-challenges/completed/');
      setDiagnostics(prev => ({
        ...prev,
        completed: { 
          status: 'success', 
          data: completedResponse.data, 
          error: null,
          count: Array.isArray(completedResponse.data) ? completedResponse.data.length : 0
        }
      }));
    } catch (error) {
      setDiagnostics(prev => ({
        ...prev,
        completed: { 
          status: 'error', 
          data: null, 
          error: error.response?.data || error.message 
        }
      }));
    }

    // Test 4: User Stats
    try {
      const statsResponse = await api.get('/api/eco-challenges/stats/');
      setDiagnostics(prev => ({
        ...prev,
        stats: { 
          status: 'success', 
          data: statsResponse.data, 
          error: null 
        }
      }));
    } catch (error) {
      setDiagnostics(prev => ({
        ...prev,
        stats: { 
          status: 'error', 
          data: null, 
          error: error.response?.data || error.message 
        }
      }));
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'running': return '⏳';
      default: return '⏸️';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return '#4caf50';
      case 'error': return '#f44336';
      case 'running': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  const DiagnosticCard = ({ title, diagnostic, endpoint }) => (
    <div style={{
      border: `2px solid ${getStatusColor(diagnostic.status)}`,
      borderRadius: '8px',
      padding: '15px',
      margin: '10px 0',
      backgroundColor: diagnostic.status === 'success' ? '#f1f8e9' : 
                      diagnostic.status === 'error' ? '#ffebee' : '#fff3e0'
    }}>
      <h3 style={{ 
        margin: '0 0 10px 0', 
        color: getStatusColor(diagnostic.status),
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {getStatusIcon(diagnostic.status)} {title}
      </h3>
      
      <p style={{ margin: '5px 0', fontSize: '0.9rem', color: '#666' }}>
        <strong>Endpoint:</strong> <code>{endpoint}</code>
      </p>

      {diagnostic.status === 'success' && (
        <div>
          <p style={{ color: '#4caf50', fontWeight: 'bold', margin: '10px 0 5px 0' }}>
            ✅ Succès !
          </p>
          
          {diagnostic.count !== undefined && (
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Nombre d'éléments:</strong> {diagnostic.count}
            </p>
          )}

          {diagnostic.responseTime && (
            <p style={{ margin: '5px 0', color: '#666' }}>
              <strong>Temps de réponse:</strong> {diagnostic.responseTime}
            </p>
          )}

          <details style={{ marginTop: '10px' }}>
            <summary style={{ cursor: 'pointer', color: '#2d7d32', fontWeight: 'bold' }}>
              📄 Voir la réponse complète
            </summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '0.8rem',
              marginTop: '10px'
            }}>
              {JSON.stringify(diagnostic.data, null, 2)}
            </pre>
          </details>
        </div>
      )}

      {diagnostic.status === 'error' && (
        <div>
          <p style={{ color: '#f44336', fontWeight: 'bold', margin: '10px 0 5px 0' }}>
            ❌ Erreur
          </p>
          <pre style={{
            background: '#ffebee',
            padding: '10px',
            borderRadius: '4px',
            color: '#d32f2f',
            fontSize: '0.8rem',
            overflow: 'auto'
          }}>
            {JSON.stringify(diagnostic.error, null, 2)}
          </pre>
        </div>
      )}

      {diagnostic.status === 'running' && (
        <p style={{ color: '#ff9800', fontWeight: 'bold', margin: '10px 0' }}>
          ⏳ Test en cours...
        </p>
      )}
    </div>
  );

  const allSuccessful = Object.values(diagnostics).every(d => d.status === 'success');
  const hasErrors = Object.values(diagnostics).some(d => d.status === 'error');

  return (
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#2d7d32', marginBottom: '10px' }}>
          🔧 Diagnostic Backend Eco-Challenges
        </h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Test de connectivité et de fonctionnement des endpoints API
        </p>
      </div>

      {/* Résumé global */}
      <div style={{
        background: allSuccessful ? '#e8f5e8' : hasErrors ? '#ffebee' : '#fff3e0',
        border: `2px solid ${allSuccessful ? '#4caf50' : hasErrors ? '#f44336' : '#ff9800'}`,
        borderRadius: '8px',
        padding: '20px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ 
          margin: '0 0 10px 0',
          color: allSuccessful ? '#4caf50' : hasErrors ? '#f44336' : '#ff9800'
        }}>
          {allSuccessful ? '🎉 Tous les tests sont réussis !' : 
           hasErrors ? '⚠️ Certains tests ont échoué' : 
           '⏳ Tests en cours...'}
        </h2>
        <p style={{ margin: 0, color: '#666' }}>
          Backend Django opérationnel sur http://127.0.0.1:8000
        </p>
      </div>

      {/* Bouton de relance */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          style={{
            background: isRunning ? '#ccc' : 'linear-gradient(135deg, #4caf50 0%, #2d7d32 100%)',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          {isRunning ? '⏳ Tests en cours...' : '🔄 Relancer les tests'}
        </button>
      </div>

      {/* Diagnostics détaillés */}
      <DiagnosticCard 
        title="Health Check"
        diagnostic={diagnostics.healthCheck}
        endpoint="GET /api/eco-challenges/health_check/"
      />

      <DiagnosticCard 
        title="Défis Disponibles"
        diagnostic={diagnostics.available}
        endpoint="GET /api/eco-challenges/available/"
      />

      <DiagnosticCard 
        title="Défis Complétés"
        diagnostic={diagnostics.completed}
        endpoint="GET /api/eco-challenges/completed/"
      />

      <DiagnosticCard 
        title="Statistiques Utilisateur"
        diagnostic={diagnostics.stats}
        endpoint="GET /api/eco-challenges/stats/"
      />

      {/* Informations d'authentification */}
      <div style={{
        background: '#f5f5f5',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '15px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#333' }}>
          🔐 Informations d'authentification
        </h3>
        <p style={{ margin: '5px 0', color: '#666' }}>
          <strong>Token présent:</strong> {localStorage.getItem('access_token') ? '✅ Oui' : '❌ Non'}
        </p>
        <p style={{ margin: '5px 0', color: '#666', fontSize: '0.9rem' }}>
          Les endpoints nécessitent un token JWT valide dans localStorage sous la clé 'access_token'
        </p>
      </div>

      {/* Instructions */}
      <div style={{
        background: '#e3f2fd',
        border: '1px solid #90caf9',
        borderRadius: '8px',
        padding: '15px',
        marginTop: '20px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>
          📋 Instructions d'utilisation
        </h3>
        <ul style={{ color: '#666', fontSize: '0.9rem', lineHeight: '1.6' }}>
          <li>Assurez-vous que le serveur Django est démarré sur le port 8000</li>
          <li>Connectez-vous d'abord pour obtenir un token JWT valide</li>
          <li>Le diagnostic vérifiera automatiquement tous les endpoints</li>
          <li>Les réponses JSON sont affichées en détail pour le debugging</li>
        </ul>
      </div>
    </div>
  );
};

export default BackendDiagnostic;
