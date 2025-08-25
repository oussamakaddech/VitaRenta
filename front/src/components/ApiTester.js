import React, { useState } from 'react';
import axios from 'axios';

const ApiTester = ({ token, user }) => {
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testJoinEndpoint = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Test avec un ID de défi aléatoire
      const testChallengeId = '68a754c99d2ab0a939ee24a7';
      
      console.log('🧪 Test direct de l\'API join...');
      const response = await axios.post(
        `http://localhost:8000/api/eco-challenges/${testChallengeId}/join/`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      setTestResult({
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      });

    } catch (error) {
      console.log('🔥 Erreur lors du test API:', error);
      
      setTestResult({
        success: false,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
    }

    setLoading(false);
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #e74c3c', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#fff5f5'
    }}>
      <h3>🧪 Testeur API - Debug Erreur 500</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Token:</strong> {token ? '✅ Présent' : '❌ Absent'}</p>
        <p><strong>Utilisateur:</strong> {user?.nom || 'Non défini'} ({user?.role})</p>
      </div>

      <button 
        onClick={testJoinEndpoint}
        disabled={!token || loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#bdc3c7' : '#e74c3c',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? '🔄 Test en cours...' : '🧪 Tester endpoint /join/'}
      </button>

      {testResult && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: testResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '5px'
        }}>
          <h4>{testResult.success ? '✅ Succès' : '❌ Erreur'}</h4>
          <p><strong>Status:</strong> {testResult.status} {testResult.statusText}</p>
          
          <h5>📊 Données de réponse:</h5>
          <pre style={{
            backgroundColor: '#f8f9fa',
            padding: '10px',
            borderRadius: '4px',
            overflow: 'auto',
            fontSize: '12px'
          }}>
            {JSON.stringify(testResult.data, null, 2)}
          </pre>

          {testResult.headers && (
            <>
              <h5>📋 Headers de réponse:</h5>
              <pre style={{
                backgroundColor: '#f8f9fa',
                padding: '10px',
                borderRadius: '4px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(testResult.headers, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ApiTester;
