import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EcoChallengesWidget.css';

// Configuration axios pour le widget
const neuralApi = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'Content-Type': 'application/json',
  }
});

// Intercepteur pour ajouter le token JWT
neuralApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const NeuralEcoWidget = ({
  maxChallenges = 3,
  showStats = true,
  onViewAll = null,
  className = ''
}) => {
  const [challenges, setChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [particleSystem, setParticleSystem] = useState([]);

  // Système de particules neural pour le widget
  useEffect(() => {
    const generateMicroParticles = () => {
      const particles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#8b5cf6' : '#10b981',
        opacity: Math.random() * 0.6 + 0.4,
      }));
      setParticleSystem(particles);
    };

    generateMicroParticles();
    const interval = setInterval(generateMicroParticles, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadNeuralWidgetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadNeuralWidgetData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [challengesRes, statsRes] = await Promise.all([
        neuralApi.get('/api/eco-challenges/available/'),
        showStats ? neuralApi.get('/api/eco-challenges/stats/') : Promise.resolve({ data: null })
      ]);

      // Limiter le nombre de défis affichés
      const limitedChallenges = Array.isArray(challengesRes.data)
        ? challengesRes.data.slice(0, maxChallenges)
        : [];

      setChallenges(limitedChallenges);

      if (showStats && statsRes.data) {
        setStats(statsRes.data);
      }

    } catch (error) {
      console.error('Erreur widget neural eco-challenges:', error);
      if (error.response?.status !== 401) {
        setError('Neural connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const acceptNeuralChallenge = async (challengeId) => {
    try {
      await neuralApi.post(`/api/eco-challenges/${challengeId}/accept/`);
      // Recharger les données après acceptation
      await loadNeuralWidgetData();
    } catch (error) {
      console.error('Erreur acceptation défi neural:', error);
      setError('Neural challenge acceptance failed');
    }
  };

  const formatNeuralChallengeType = (type) => {
    const types = {
      'eco_driving': '🧠 Neural Drive',
      'co2_reduction': '⚛️ Carbon Zero',
      'fuel_efficiency': '🔮 Energy Matrix',
      'eco_score': '📊 Quantum Score'
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className={`neural-eco-widget ${className}`}>
        <div className="neural-particle-background">
          {particleSystem.map(particle => (
            <div
              key={particle.id}
              className="neural-micro-particle"
              style={{
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                background: particle.color,
                opacity: particle.opacity,
                animationDelay: `${particle.id * 0.2}s`
              }}
            />
          ))}
        </div>
        <div className="neural-widget-loading">
          <div className="neural-ai-spinner">
            <div className="neural-core-loader"></div>
            <div className="neural-waves">
              <div className="neural-wave neural-wave-1"></div>
              <div className="neural-wave neural-wave-2"></div>
            </div>
          </div>
          <span className="neural-loading-text">Neural Sync...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`neural-eco-widget ${className}`}>
        <div className="neural-widget-error">
          <div className="neural-error-hologram">⚠️</div>
          <span className="neural-error-text">{error}</span>
          <button onClick={loadNeuralWidgetData} className="neural-retry-btn">
            <span>↻</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`neural-eco-widget ${className}`}>
      {/* Système de particules en arrière-plan */}
      <div className="neural-particle-background">
        {particleSystem.map(particle => (
          <div
            key={particle.id}
            className="neural-micro-particle"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: particle.color,
              opacity: particle.opacity,
              animationDelay: `${particle.id * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Header du widget neural */}
      <div className="neural-widget-header">
        <div className="neural-header-glow">
          <h3 className="neural-title-gradient">🧠 Neural Eco</h3>
          <div className="neural-title-pulse"></div>
        </div>
        {onViewAll && (
          <button onClick={onViewAll} className="neural-view-all-btn">
            <span>View Matrix →</span>
            <div className="neural-btn-spark"></div>
          </button>
        )}
      </div>

      {/* Statistiques rapides neurales */}
      {showStats && stats && (
        <div className="neural-widget-stats">
          <div className="neural-quick-stat">
            <div className="neural-stat-core">
              <span className="neural-stat-value">{stats.completed_challenges}</span>
              <div className="neural-stat-ring"></div>
            </div>
            <span className="neural-stat-label">Completed</span>
          </div>
          <div className="neural-quick-stat">
            <div className="neural-stat-core">
              <span className="neural-stat-value">{stats.total_points_earned}</span>
              <div className="neural-stat-ring"></div>
            </div>
            <span className="neural-stat-label">Neural Points</span>
          </div>
          <div className="neural-quick-stat">
            <div className="neural-stat-core">
              <span className="neural-stat-value">{stats.active_challenges}</span>
              <div className="neural-stat-ring"></div>
            </div>
            <span className="neural-stat-label">Active</span>
          </div>
        </div>
      )}

      {/* Liste des défis neuraux */}
      <div className="neural-widget-challenges">
        {challenges.length === 0 ? (
          <div className="neural-no-challenges">
            <div className="neural-empty-hologram">
              <span>🎯</span>
              <div className="neural-hologram-rings">
                <div className="neural-ring neural-ring-1"></div>
                <div className="neural-ring neural-ring-2"></div>
              </div>
            </div>
            <span className="neural-empty-text">No Neural Missions Available</span>
          </div>
        ) : (
          challenges.map(challenge => (
            <div key={challenge.id} className="neural-widget-challenge">
              <div className="neural-challenge-glow"></div>
              <div className="neural-challenge-info">
                <div className="neural-challenge-title">
                  {challenge.title}
                </div>
                <div className="neural-challenge-meta">
                  <span className="neural-challenge-type-badge">
                    {formatNeuralChallengeType(challenge.challenge_type || challenge.type)}
                  </span>
                  <span className="neural-challenge-reward">
                    🏆 {challenge.reward_points}pts
                  </span>
                </div>
              </div>
              <button
                onClick={() => acceptNeuralChallenge(challenge.id)}
                className="neural-widget-accept-btn"
                title="Initialize Neural Mission"
              >
                <span>+</span>
                <div className="neural-btn-ripple"></div>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Footer du widget neural */}
      {challenges.length > 0 && (
        <div className="neural-widget-footer">
          <button onClick={loadNeuralWidgetData} className="neural-refresh-btn">
            <span>🔄 Sync Neural Data</span>
            <div className="neural-btn-glow"></div>
          </button>
        </div>
      )}
    </div>
  );
};

export default NeuralEcoWidget;
