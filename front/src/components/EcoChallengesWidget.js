import React, { useState, useEffect } from 'react';
import { ecoChallengesService } from '../services/apiService';
import './EcoChallengesWidget.css';

const NeuralEcoWidget = ({
  maxChallenges = 3,
  showStats = true,
  onViewAll = null,
  className = ''
}) => {
  const [challenges, setChallenges] = useState([]);
  const [userChallenges, setUserChallenges] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [particleSystem, setParticleSystem] = useState([]);

  // Système de particules visuel (décoratif)
  useEffect(() => {
    const generateParticles = () => {
      const arr = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        color: i % 3 === 0 ? '#00d4ff' : i % 3 === 1 ? '#8b5cf6' : '#10b981',
        opacity: Math.random() * 0.6 + 0.4,
      }));
      setParticleSystem(arr);
    };
    generateParticles();
    const interval = setInterval(generateParticles, 8000);
    return () => clearInterval(interval);
  }, []);

  // Récupération des challenges/APIs
  const loadNeuralWidgetData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [available, user] = await Promise.all([
        ecoChallengesService.getAvailable(),
        ecoChallengesService.getUserChallenges({ status: 'active' })
      ]);

      // Gestion des différents formats possibles (backend)
      const availableList = Array.isArray(available.data.challenges)
        ? available.data.challenges
        : Array.isArray(available.data)
          ? available.data
          : [];
      setChallenges(availableList.slice(0, maxChallenges));
      
      const userList = Array.isArray(user.data.results)
        ? user.data.results
        : Array.isArray(user.data)
          ? user.data
          : [];
      setUserChallenges(userList);

      // Statistiques utilisateur
      if (showStats) {
        const completed = userList.filter(uc => uc.status === 'completed').length;
        const totalPoints = userList.reduce((sum, uc) => sum + (uc.reward_points || 0), 0);
        const active = userList.filter(uc => uc.status === 'active').length;
        setStats({
          completed_challenges: completed,
          total_points_earned: totalPoints,
          active_challenges: active,
        });
      }
    } catch (err) {
      // Gestion d’erreur détaillée :
      if (err.response?.status === 401) {
        setError('Vous devez être connecté pour voir les éco-missions.');
      } else {
        setError('Connexion neural impossible.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Accepter un défi
  const acceptNeuralChallenge = async (challengeId) => {
    try {
      await ecoChallengesService.joinChallenge({ challenge_id: challengeId });
      await loadNeuralWidgetData();
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Connexion requise pour accepter un défi.');
      } else {
        setError('Échec de l’acceptation du défi.');
      }
    }
  };

  // Formatage des types pour affichage
  const formatChallengeType = (type) => {
    const text = {
      eco_driving: '🧠 Neural Drive',
      co2_reduction: '⚛️ Carbon Zero',
      fuel_efficiency: '🔮 Energy Matrix',
      eco_score: '📊 Quantum Score',
      low_emission: '💨 Clean Air',
      distance_reduction: '📏 Distance Opt',
      alternative_transport: '🚲 Alt Mode',
    };
    return text[type] || type;
  };

  // Chargement initial
  useEffect(() => {
    loadNeuralWidgetData();
    // eslint-disable-next-line
  }, []);

  // --- Rendu UI ---

  if (loading) {
    return (
      <div className={`neural-eco-widget ${className}`}>
        <div className="neural-particle-background">
          {particleSystem.map(p => (
            <div
              key={p.id}
              className="neural-micro-particle"
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                background: p.color,
                opacity: p.opacity,
                animationDelay: `${p.id * 0.2}s`
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
      {/* Particules décoratives */}
      <div className="neural-particle-background">
        {particleSystem.map(p => (
          <div
            key={p.id}
            className="neural-micro-particle"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.color,
              opacity: p.opacity,
              animationDelay: `${p.id * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Header */}
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

      {/* Statistiques */}
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

      {/* Liste des challenges */}
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
                    {formatChallengeType(challenge.type)}
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

      {/* Défis actifs */}
      {userChallenges.length > 0 && (
        <div className="neural-widget-active">
          <div className="neural-section-header">
            <span>⚡ Active Missions</span>
          </div>
          {userChallenges.slice(0, 2).map(userChallenge => (
            <div key={userChallenge.id} className="neural-active-challenge">
              <div className="neural-active-info">
                <span className="neural-active-title">{userChallenge.challenge?.title}</span>
                <div className="neural-progress-bar">
                  <div
                    className="neural-progress-fill"
                    style={{ width: `${Math.min(userChallenge.progress_percentage || 0, 100)}%` }}
                  ></div>
                </div>
              </div>
              <span className="neural-progress-text">
                {(userChallenge.progress_percentage || 0).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer du widget */}
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
