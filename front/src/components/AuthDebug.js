import React, { useState, useEffect } from 'react';

const AuthDebug = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token');
      const refreshToken = localStorage.getItem('refresh_token');
      
      setTokenInfo({
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? token.substring(0, 50) + '...' : 'Aucun token',
        hasRefreshToken: !!refreshToken,
        localStorage: Object.keys(localStorage),
      });
    };
    
    checkAuth();
  }, []);

  const createDemoToken = () => {
    // Créer un token de démonstration pour tester
    const demoToken = 'demo_token_' + Date.now();
    localStorage.setItem('access_token', demoToken);
    window.location.reload();
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.reload();
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px', borderRadius: '8px' }}>
      <h3>🔍 Debug Authentification</h3>
      
      {tokenInfo && (
        <div>
          <p><strong>Token présent:</strong> {tokenInfo.hasToken ? '✅ Oui' : '❌ Non'}</p>
          {tokenInfo.hasToken && (
            <>
              <p><strong>Longueur:</strong> {tokenInfo.tokenLength} caractères</p>
              <p><strong>Aperçu:</strong> <code>{tokenInfo.tokenPreview}</code></p>
            </>
          )}
          <p><strong>Refresh token:</strong> {tokenInfo.hasRefreshToken ? '✅ Oui' : '❌ Non'}</p>
          <p><strong>LocalStorage keys:</strong> {tokenInfo.localStorage.join(', ')}</p>
        </div>
      )}
      
      <div style={{ marginTop: '15px' }}>
        <button onClick={createDemoToken} style={{ marginRight: '10px', padding: '8px 15px' }}>
          🔑 Créer token demo
        </button>
        <button onClick={clearTokens} style={{ padding: '8px 15px' }}>
          🗑️ Supprimer tokens
        </button>
      </div>
      
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p><strong>Status:</strong> Les erreurs 401 indiquent que l'API requiert une authentification.</p>
        <p><strong>Solution:</strong> Soit vous connecter via l'interface de login, soit utiliser les données mockées.</p>
      </div>
    </div>
  );
};

export default AuthDebug;
