import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // ✅ Système de particules avec cleanup
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
    
    // ✅ Cleanup important
    return () => clearInterval(interval);
  }, []);

  // ✅ Fonction de chargement optimisée avec gestion d'erreur améliorée
  const loadNeuralWidgetData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [availableResponse, userResponse] = await Promise.all([
        ecoChallengesService.getAvailable(),
        ecoChallengesService.getUserChallenges({ status: 'active' })
      ]);

      // ✅ Gestion robuste des différents formats de réponse
      const availableList = availableResponse?.data?.challenges 
        || availableResponse?.data 
        || [];
      const validAvailable = Array.isArray(availableList) ? availableList : [];
      setChallenges(validAvailable.slice(0, maxChallenges));
      
      const userList = userResponse?.data?.results 
        || userResponse?.data 
        || [];
      const validUserList = Array.isArray(userList) ? userList : [];
      setUserChallenges(validUserList);

      // ✅ Calcul des statistiques optimisé
      if (showStats && validUserList.length > 0) {
        const stats = validUserList.reduce((acc, uc) => {
          if (uc.status === 'completed') acc.completed++;
          if (uc.status === 'active') acc.active++;
          acc.totalPoints += uc.reward_points || 0;
          return acc;
        }, { completed: 0, active: 0, totalPoints: 0 });

        setStats({
          completed_challenges: stats.completed,
          total_points_earned: stats.totalPoints,
          active_challenges: stats.active,
        });
      } else if (showStats) {
        setStats({
          completed_challenges: 0,
          total_points_earned: 0,
          active_challenges: 0,
        });
      }
    } catch (err) {
      console.error('Neural Widget Data Loading Error:', err);
      
      // ✅ Gestion d'erreur plus détaillée
      if (err.response?.status === 401) {
        setError('Connexion requise pour accéder aux éco-missions neurales.');
      } else if (err.response?.status === 403) {
        setError('Permissions insuffisantes pour accéder aux missions.');
      } else if (err.response?.status >= 500) {
        setError('Serveur neural temporairement indisponible.');
      } else if (!navigator.onLine) {
        setError('Connexion réseau requise.');
      } else {
        setError('Connexion neural impossible. Réessayez dans un moment.');
      }
    } finally {
      setLoading(false);
    }
  }, [maxChallenges, showStats]);

  // ✅ Fonction d'acceptation avec feedback amélioré
  const acceptNeuralChallenge = useCallback(async (challengeId) => {
    if (!challengeId) {
      setError('ID de défi invalide.');
      return;
    }

    try {
      setError(null);
      await ecoChallengesService.joinChallenge({ challenge_id: challengeId });
      
      // ✅ Recharger les données après acceptation
      await loadNeuralWidgetData();
      
      // ✅ Feedback positif (optionnel : vous pourriez ajouter un toast)
      console.log('Défi accepté avec succès');
    } catch (err) {
      console.error('Challenge Accept Error:', err);
      
      if (err.response?.status === 401) {
        setError('Connexion requise pour accepter un défi.');
      } else if (err.response?.status === 409) {
        setError('Vous participez déjà à ce défi.');
      } else if (err.response?.status === 400) {
        setError('Défi invalide ou non disponible.');
      } else {
        setError('Échec de l\'acceptation du défi. Réessayez.');
      }
    }
  }, [loadNeuralWidgetData]);

  // ✅ Formatage mémorisé pour éviter les re-calculs
  const formatChallengeType = useMemo(() => {
    const typeMap = {
      eco_driving: '🧠 Neural Drive',
      co2_reduction: '⚛️ Carbon Zero',
      fuel_efficiency: '🔮 Energy Matrix',
      eco_score: '📊 Quantum Score',
      low_emission: '💨 Clean Air',
      distance_reduction: '📏 Distance Opt',
      alternative_transport: '🚲 Alt Mode',
    };
    
    return (type) => typeMap[type] || type;
  }, []);

  // ✅ Chargement initial avec debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      loadNeuralWidgetData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [loadNeuralWidgetData]);

  // ✅ Composant de chargement optimisé
  const LoadingComponent = () => (
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

  // ✅ Composant d'erreur avec retry
  const ErrorComponent = () => (
    <div className={`neural-eco-widget ${className}`}>
      <div className="neural-widget-error">
        <div className="neural-error-hologram">⚠️</div>
        <span className="neural-error-text">{error}</span>
        <button 
          onClick={loadNeuralWidgetData} 
          className="neural-retry-btn"
          aria-label="Réessayer le chargement"
        >
          <span>↻</span>
        </button>
      </div>
    </div>
  );

  // ✅ Rendu conditionnel optimisé
  if (loading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;

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
          <button 
            onClick={onViewAll} 
            className="neural-view-all-btn"
            aria-label="Voir toutes les missions"
          >
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
                aria-label={`Accepter le défi ${challenge.title}`}
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
                <span className="neural-active-title">
                  {userChallenge.challenge?.title || 'Mission sans nom'}
                </span>
                <div className="neural-progress-bar">
                  <div
                    className="neural-progress-fill"
                    style={{ 
                      width: `${Math.min(userChallenge.progress_percentage || 0, 100)}%` 
                    }}
                  ></div>
                </div>
              </div>
              <span className="neural-progress-text">
                {Math.round(userChallenge.progress_percentage || 0)}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer du widget */}
      {challenges.length > 0 && (
        <div className="neural-widget-footer">
          <button 
            onClick={loadNeuralWidgetData} 
            className="neural-refresh-btn"
            aria-label="Synchroniser les données neurales"
          >
            <span>🔄 Sync Neural Data</span>
            <div className="neural-btn-glow"></div>
          </button>
        </div>
      )}
    </div>
  );
};

// ✅ Optimisation avec React.memo pour éviter les re-renders inutiles
export default React.memo(NeuralEcoWidget);
