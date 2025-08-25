import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './EcoChallenges.css';

const EcoChallenges = ({ token, user, onLogout }) => {
  // États pour les données
  const [challenges, setChallenges] = useState([]);
  const [completedChallenges, setCompletedChallenges] = useState([]);
  const [activeChallenges, setActiveChallenges] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  
  // Configuration API cohérente avec les autres composants
  const apiClient = useMemo(() => {
    const client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Intercepteur de requête
    client.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token utilisé pour EcoChallenges');
      }
      return config;
    });
    
    // ✅ Intercepteur de réponse pour gérer les erreurs globalement
    client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('❌ Erreur API interceptée:', error.response?.status, error.response?.data);
        return Promise.reject(error);
      }
    );
    
    return client;
  }, [token]);
  
  // Charger des données mockées pour démonstration
  const loadMockData = () => {
    console.log('📊 Chargement des données de démonstration EcoChallenges...');
    setIsUsingMockData(true);
    
    // ✅ Défis mockés avec des ObjectId MongoDB RÉELS du backend
    setChallenges([
      {
        id: "68a754c99d2ab0a939ee24a6",  // ✅ ObjectId réel: Éco-Conducteur Débutant
        title: "Éco-Conducteur Débutant",
        description: "Votre premier pas vers l'éco-conduite",
        type: "eco_driving",
        difficulty: "beginner",
        reward_points: 100,
        reward_credit: 5,
        duration_days: 30,
        max_participants: 100,
        current_participants: 45,
        is_active: true,
        icon: "🌱"
      },
      {
        id: "68a754c99d2ab0a939ee24a7",  // ✅ ObjectId réel: Champion du CO₂
        title: "Champion du CO₂",
        description: "Réduisez vos émissions de CO₂",
        type: "co2_reduction",
        difficulty: "intermediate", 
        reward_points: 300,
        reward_credit: 20,
        duration_days: 45,
        max_participants: 75,
        current_participants: 28,
        is_active: true,
        icon: "�"
      },
      {
        id: "68a754c99d2ab0a939ee24a8",  // ✅ ObjectId réel: Économe en Énergie
        title: "Économe en Énergie",
        description: "Optimisez votre consommation énergétique",
        type: "efficiency",
        difficulty: "beginner",
        reward_points: 150,
        reward_credit: 8,
        duration_days: 21,
        max_participants: 150,
        current_participants: 67,
        is_active: true,
        icon: "⚡"
      },
      {
        id: "68a754c99d2ab0a939ee24a9",  // ✅ ObjectId réel: Score Parfait
        title: "Score Parfait",
        description: "Atteignez un éco-score optimal",
        type: "efficiency",
        difficulty: "advanced",
        reward_points: 500,
        reward_credit: 30,
        duration_days: 60,
        max_participants: 50,
        current_participants: 19,
        is_active: true,
        icon: "🎯"
      },
      {
        id: "68a754c99d2ab0a939ee24aa",  // ✅ ObjectId réel: Marathon Vert
        title: "Marathon Vert",
        description: "Défi d'endurance éco-responsable",
        type: "eco_driving",
        difficulty: "expert",
        reward_points: 750,
        reward_credit: 45,
        duration_days: 90,
        max_participants: 25,
        current_participants: 12,
        is_active: true,
        icon: "�‍♂️"
      }
    ]);
    
    // Défis complétés mockés avec ObjectId
    setCompletedChallenges([
      {
        id: "68a754c99d2ab0a939ee24a6",
        title: "Éco-Conducteur Débutant",
        description: "Premier trajet éco-responsable réussi",
        type: "eco_driving",
        difficulty: "beginner",
        reward_points: 100,
        completed_at: "2025-01-15T10:00:00Z",
        progress: 100,
        performance: 85,
        icon: "🌱",
        user_challenge_id: 1
      },
      {
        id: "68a754c99d2ab0a939ee24a7",
        title: "Champion du CO₂",
        description: "5kg de CO₂ économisés en une semaine",
        type: "co2_reduction", 
        difficulty: "beginner",
        reward_points: 150,
        completed_at: "2025-01-20T15:30:00Z",
        progress: 100,
        performance: 92,
        icon: "🌍",
        user_challenge_id: 2
      }
    ]);
    
    // ✅ Défis actifs mockés
    setActiveChallenges([
      {
        id: "mock-active-1",
        title: "Défi en Cours",
        description: "Votre défi actuel en progression",
        type: "eco_driving",
        difficulty: "intermediate",
        reward_points: 200,
        progress: 65,
        joined_at: "2025-08-15T09:00:00Z",
        user_challenge_id: 3,
        status: "active"
      }
    ]);
    
    // ✅ Stats mockées conformes au backend
    setUserStats({
      total_points: 625,
      total_credit: 30,
      challenges_completed: 5,
      challenges_active: 3,
      co2_saved: 48.7,
      eco_score: 86,
      rank: "Éco-Expert",
      level: 4,
      next_level_points: 375,
      total_challenges: 8,
      completion_rate: 62.5
    });
    
    setLoading(false);
  };
  
  // ✅ Charger toutes les données avec gestion d'erreur améliorée
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    // ✅ Si pas de token, charger les données mockées ET les défis disponibles publics
    if (!token) {
      console.log('🎭 Aucun token - Chargement données mockées + défis publics');
      try {
        // Essayer de charger les défis disponibles même sans token (AllowAny)
        await loadAvailableChallenges();
        setIsUsingMockData(false);
        console.log('✅ Défis publics chargés depuis le backend');
      } catch (error) {
        console.log('❌ Backend non disponible, utilisation de données mockées');
        loadMockData();
      }
      setLoading(false);
      return;
    }
    
    try {
      console.log('🔄 Tentative de chargement des données réelles...');
      await Promise.all([
        loadAvailableChallenges(),
        loadCompletedChallenges(),
        loadActiveChallenges(),
        loadUserStats()
      ]);
      setIsUsingMockData(false);
      console.log('✅ Données réelles chargées depuis le backend');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };
  
  // ✅ Charger les défis disponibles (accessible sans token)
  const loadAvailableChallenges = async () => {
    try {
      console.log('🔄 Chargement des défis disponibles...');
      const response = await apiClient.get('/api/eco-challenges/available/');
      console.log('📊 Réponse défis disponibles:', response.data);
      
      // ✅ Le backend retourne un array direct
      const challengesData = Array.isArray(response.data) ? response.data : [];
      setChallenges(challengesData);
      console.log('📊 Défis disponibles chargés:', challengesData.length);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des défis disponibles:', error);
      if (error.response?.status === 404) {
        console.log('ℹ️ Endpoint défis disponibles non trouvé');
      }
      setChallenges([]);
      throw error; // Re-throw pour déclencher le fallback
    }
  };
  
  // ✅ Charger les défis complétés (nécessite authentification)
  const loadCompletedChallenges = async () => {
    try {
      console.log('🔄 Chargement des défis complétés...');
      const response = await apiClient.get('/api/eco-challenges/completed/');
      console.log('✅ Réponse défis complétés:', response.data);
      
      const completedData = Array.isArray(response.data) ? response.data : [];
      setCompletedChallenges(completedData);
      console.log('✅ Défis complétés chargés:', completedData.length);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des défis complétés:', error);
      setCompletedChallenges([]);
    }
  };
  
  // ✅ Charger les défis actifs (nécessite authentification)
  const loadActiveChallenges = async () => {
    try {
      console.log('🔄 Chargement des défis actifs...');
      const response = await apiClient.get('/api/eco-challenges/active_challenges/');
      console.log('🔄 Réponse défis actifs:', response.data);
      
      const activeData = Array.isArray(response.data) ? response.data : [];
      setActiveChallenges(activeData);
      console.log('🔄 Défis actifs chargés:', activeData.length);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des défis actifs:', error);
      setActiveChallenges([]);
    }
  };
  
  // ✅ Charger les statistiques utilisateur (nécessite authentification)
  const loadUserStats = async () => {
    try {
      console.log('🔄 Chargement des statistiques utilisateur...');
      const response = await apiClient.get('/api/eco-challenges/stats/');
      console.log('📈 Réponse stats:', response.data);
      
      setUserStats(response.data);
      console.log('📈 Stats utilisateur chargées');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des statistiques:', error);
      setUserStats(null);
    }
  };
  
  // ✅ Rejoindre un défi avec gestion d'erreur améliorée
  const joinChallenge = async (challengeId) => {
    if (!challengeId) {
      alert('ID de défi manquant');
      return;
    }

    // ✅ Validation du format ID (UUID ou ObjectId MongoDB)
    if (!isValidChallengeId(challengeId)) {
      console.warn(`⚠️ Format d'ID incorrect: ${challengeId} (${challengeId.length} caractères)`);
      alert(`❌ Format d'ID invalide: ${challengeId}. L'ID doit être soit un UUID soit un ObjectId MongoDB.`);
      return;
    }
    
    if (!token) {
      alert('Veuillez vous connecter pour participer à un défi');
      return;
    }
    
    try {
      console.log(`🔄 Tentative de participation au défi ID: ${challengeId}`);
      console.log(`👤 Informations utilisateur:`, user);
      console.log(`🔑 Token présent:`, !!token);
      
      // ✅ Utiliser le endpoint /accept/ que nous avons réparé
      const response = await apiClient.post(`/api/eco-challenges/${challengeId}/accept/`);
      console.log('✅ Réponse participation défi:', response.data);
      
      // ✅ Gestion de la réponse selon le statut d'authentification
      if (response.data.message) {
        if (response.data.user_challenge_id) {
          // Utilisateur authentifié - participation réussie
          alert(`🎉 Félicitations ! ${response.data.message}`);
        } else {
          // Utilisateur non authentifié - juste info
          alert(`ℹ️ ${response.data.message}. ${response.data.note || ''}`);
        }
      }
      
      // Recharger les données pour mettre à jour l'interface
      await loadData();
    } catch (error) {
      console.error('❌ Erreur lors de la participation au défi:', error);
      
      // ✅ Gestion des erreurs spécifiques améliorée
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data;
        
        console.log(`❌ Erreur HTTP ${status}:`, errorData);
        
        if (status === 401) {
          alert('🔐 Session expirée. Veuillez vous reconnecter.');
          if (onLogout) onLogout();
        } else if (status === 400) {
          alert(`⚠️ ${errorData.error || 'Erreur lors de la participation au défi'}`);
        } else if (status === 404) {
          alert(`❌ Le défi avec l'ID "${challengeId}" n'existe pas ou a été supprimé.\n\nVérifiez que l'ID est correct.`);
        } else if (status === 500) {
          alert('🔧 Une erreur est survenue sur le serveur. Veuillez réessayer plus tard.');
        } else {
          alert(`❌ Erreur inattendue (${status}): ${errorData.error || 'Erreur inconnue'}`);
        }
      } else if (error.request) {
        alert('🌐 Erreur de connexion. Veuillez vérifier votre connexion internet.');
      } else {
        alert('❌ Une erreur inattendue s\'est produite.');
      }
    }
  };
  
  // ✅ Charger les données au montage du composant
  useEffect(() => {
    loadData();
  }, [token]); // Re-charger quand le token change
  
  // ✅ Fonction helper pour valider les UUID
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // ✅ Fonction helper pour valider les ObjectId MongoDB  
  const isValidObjectId = (id) => {
    const objectIdRegex = /^[0-9a-f]{24}$/i;
    return objectIdRegex.test(id);
  };

  // ✅ Fonction helper pour valider les IDs de défi (UUID ou ObjectId)
  const isValidChallengeId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return isValidUUID(id) || isValidObjectId(id);
  };

  // ✅ Fonction helper pour formater les dates
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Date invalide';
    }
  };

  // ✅ Fonction helper pour formater la difficulté
  const getDifficultyLabel = (difficulty) => {
    const labels = {
      'beginner': 'Débutant',
      'intermediate': 'Intermédiaire', 
      'advanced': 'Avancé',
      'expert': 'Expert'
    };
    return labels[difficulty] || difficulty;
  };  // Interface de chargement
  if (loading) {
    return (
      <div className="eco-challenges">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Chargement des défis éco-responsables...</p>
        </div>
      </div>
    );
  }
  
  // Interface d'erreur
  if (error) {
    return (
      <div className="eco-challenges">
        <div className="error-container">
          <h3>❌ Erreur</h3>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            🔄 Réessayer
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="eco-challenges">
      {/* ✅ Indicateur de statut amélioré */}
      <div className={`status-indicator ${isUsingMockData ? 'mock' : 'real'}`}>
        {isUsingMockData ? (
          <>
            🎭 <strong>Mode Démonstration</strong> - 
            <small>{!token ? 'Connectez-vous pour accéder aux vraies données' : 'Backend non disponible'}</small>
          </>
        ) : (
          <>
            ✅ <strong>Données Réelles</strong> - 
            <small>Connecté à la base de données Django</small>
          </>
        )}
      </div>
      
      {/* En-tête */}
      <div className="challenges-header">
        <h2>🌱 Défis Éco-Responsables</h2>
        <p>Participez aux défis et gagnez des points pour une conduite plus verte !</p>
        {user && (
          <div className="user-welcome">
            Bonjour <strong>{user.nom || user.prenom || user.username || 'Conducteur'}</strong> ! 
            {user.role && <span className="user-role"> • {user.role}</span>}
          </div>
        )}
      </div>
      
      {/* ✅ Statistiques utilisateur améliorées */}
      {userStats && (
        <div className="user-stats">
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.total_points || 0}</span>
              <span className="stat-label">Points</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.total_credit || 0}€</span>
              <span className="stat-label">Crédits</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🌍</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.co2_saved || 0}kg</span>
              <span className="stat-label">CO₂ économisé</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.eco_score || 0}%</span>
              <span className="stat-label">Éco-Score</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏅</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.rank || 'Novice'}</span>
              <span className="stat-label">Rang</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="stat-value">{userStats.challenges_completed || 0}/{userStats.total_challenges || 0}</span>
              <span className="stat-label">Défis complétés</span>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ Défis actifs (nouveauté) */}
      {activeChallenges && activeChallenges.length > 0 && (
        <div className="challenges-section">
          <h3>🔥 Défis en Cours</h3>
          <div className="challenges-grid">
            {activeChallenges.map(challenge => (
              <div key={challenge.id || challenge.user_challenge_id} className="challenge-card active">
                <div className="challenge-header">
                  <div className="challenge-icon">
                    {challenge.icon || '🔥'}
                  </div>
                  <div className="challenge-title-section">
                    <h4>{challenge.title}</h4>
                    <span className="progress-label">
                      Progression: {challenge.progress || 0}%
                    </span>
                  </div>
                </div>
                <p className="challenge-description">{challenge.description}</p>
                <div className="challenge-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill active"
                      style={{ width: `${challenge.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="progress-text">{challenge.progress || 0}%</span>
                </div>
                <div className="challenge-meta">
                  <span className="joined-date">
                    🗓️ Commencé le {formatDate(challenge.joined_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Défis disponibles */}
      <div className="challenges-section">
        <h3>💫 Défis Disponibles</h3>
        <div className="challenges-grid">
          {(challenges || []).length === 0 ? (
            <div className="empty-state">
              <h4>✨ Aucun défi disponible</h4>
              <p>De nouveaux défis seront bientôt disponibles !</p>
            </div>
          ) : (
            (challenges || []).map(challenge => (
              <div key={challenge.id} className={`challenge-card ${challenge.difficulty}`}>
                <div className="challenge-header">
                  <div className="challenge-icon">
                    {challenge.icon || '🌱'}
                  </div>
                  <div className="challenge-title-section">
                    <h4>{challenge.title}</h4>
                    <span className={`difficulty ${challenge.difficulty}`}>
                      {getDifficultyLabel(challenge.difficulty)}
                    </span>
                  </div>
                </div>
                <p className="challenge-description">{challenge.description}</p>
                <div className="challenge-rewards">
                  <span className="reward points">🏆 {challenge.reward_points || 0} pts</span>
                  {challenge.reward_credit && (
                    <span className="reward credit">💰 {challenge.reward_credit}€</span>
                  )}
                </div>
                {(challenge.duration_days || challenge.max_participants) && (
                  <div className="challenge-info">
                    {challenge.duration_days && (
                      <span className="duration">⏱️ {challenge.duration_days} jours</span>
                    )}
                    {challenge.max_participants && (
                      <span className="participants">
                        👥 {challenge.current_participants || 0}/{challenge.max_participants}
                      </span>
                    )}
                  </div>
                )}
                {challenge.max_participants && (
                  <div className="challenge-progress">
                    <div className="progress-bar">
                      <div 
                        className="progress-fill"
                        style={{ 
                          width: `${((challenge.current_participants || 0) / challenge.max_participants) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                )}
                <button 
                  className="join-button"
                  onClick={() => joinChallenge(challenge.id)}
                  disabled={!challenge.is_active}
                >
                  {!challenge.is_active ? 'Défi fermé' : 
                   !token ? 'Connectez-vous pour participer' : 
                   'Participer'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* ✅ Défis terminés améliorés */}
      <div className="challenges-section">
        <h3>✅ Défis Terminés</h3>
        <div className="challenges-grid">
          {(completedChallenges || []).length === 0 ? (
            <div className="empty-state">
              <h4>🎯 Aucun défi terminé</h4>
              <p>Commencez votre premier défi pour voir vos accomplissements !</p>
            </div>
          ) : (
            (completedChallenges || []).map(challenge => (
              <div key={challenge.id || challenge.user_challenge_id} className="challenge-card completed">
                <div className="challenge-header">
                  <div className="challenge-icon">
                    {challenge.icon || '✅'}
                  </div>
                  <div className="challenge-title-section">
                    <h4>{challenge.title}</h4>
                    <span className="completion-date">
                      ✅ {formatDate(challenge.completed_at)}
                    </span>
                  </div>
                </div>
                <p className="challenge-description">{challenge.description}</p>
                <div className="challenge-performance">
                  <div className="performance-meter">
                    <span className="performance-label">Performance:</span>
                    <div className="performance-bar">
                      <div 
                        className="performance-fill"
                        style={{ width: `${challenge.performance || challenge.progress || 0}%` }}
                      ></div>
                    </div>
                    <span className="performance-value">{challenge.performance || challenge.progress || 0}%</span>
                  </div>
                  <span className="reward earned">🏆 +{challenge.reward_points || 0} pts</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* ✅ Actions améliorées */}
      <div className="challenges-actions">
        <button onClick={loadData} className="refresh-button">
          🔄 Actualiser les données
        </button>
        {isUsingMockData && (
          <div className="auth-prompt">
            <p>💡 <strong>Astuce:</strong> {!token ? 'Connectez-vous' : 'Vérifiez que le backend Django est démarré'} pour accéder aux vrais défis !</p>
            {!token && (
              <a href="/login" className="login-link">
                🔐 Se connecter
              </a>
            )}
          </div>
        )}
        {!isUsingMockData && (
          <div className="backend-status">
            <span className="status-icon">✅</span>
            <span>Connecté au backend Django REST Framework</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default EcoChallenges;
