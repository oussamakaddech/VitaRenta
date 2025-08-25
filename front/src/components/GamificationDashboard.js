// components/GamificationDashboard.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GamificationDashboard.css';

const GamificationDashboard = ({ token, user }) => {
  const [profilData, setProfilData] = useState(null);
  const [defisDisponibles, setDefisDisponibles] = useState([]);
  const [classement, setClassement] = useState([]);
  const [activeTab, setActiveTab] = useState('profil');
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const headers = { Authorization: `Bearer ${token}` };
      
      // Récupérer le profil
      const profilResponse = await axios.get(`${API_BASE_URL}/api/gamification/profil/`, { headers });
      setProfilData(profilResponse.data);
      
      // Récupérer les défis disponibles
      const defisResponse = await axios.get(`${API_BASE_URL}/api/gamification/defis_disponibles/`, { headers });
      setDefisDisponibles(defisResponse.data);
      
      // Récupérer le classement
      const classementResponse = await axios.get(`${API_BASE_URL}/api/gamification/classement/`, { headers });
      setClassement(classementResponse.data);
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const accepterDefi = async (defiId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_BASE_URL}/api/gamification/accepter_defi/`, 
        { defi_id: defiId }, 
        { headers }
      );
      
      // Recharger les données
      fetchData();
      
    } catch (error) {
      console.error('Erreur lors de l\'acceptation du défi:', error);
    }
  };

  const utiliserCredit = async (montant, reservationId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(`${API_BASE_URL}/api/gamification/utiliser_credit/`, 
        { montant, reservation_id: reservationId }, 
        { headers }
      );
      
      alert(`Crédit de ${montant}€ appliqué avec succès !`);
      fetchData(); // Recharger
      
    } catch (error) {
      alert('Erreur lors de l\'utilisation du crédit');
    }
  };

  if (loading) {
    return <div className="gamification-loading">Chargement...</div>;
  }

  return (
    <div className="gamification-container">
      <div className="gamification-header">
        <h1>🏆 Espace Gamification</h1>
        <p>Relevez des défis éco-responsables et gagnez des récompenses !</p>
      </div>

      {/* Navigation tabs */}
      <div className="gamification-tabs">
        <button 
          className={activeTab === 'profil' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('profil')}
        >
          🏅 Mon Profil
        </button>
        <button 
          className={activeTab === 'defis' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('defis')}
        >
          🎯 Défis
        </button>
        <button 
          className={activeTab === 'classement' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('classement')}
        >
          🏆 Classement
        </button>
        <button 
          className={activeTab === 'boutique' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('boutique')}
        >
          🛍️ Boutique
        </button>
      </div>

      {/* Profil Tab */}
      {activeTab === 'profil' && profilData && (
        <div className="profile-section">
          <div className="profile-stats">
            <div className="stat-card level-card">
              <div className="stat-icon">🌟</div>
              <div className="stat-info">
                <h3>Niveau {profilData.profil.niveau}</h3>
                <p>{profilData.profil.points_totaux} points</p>
                {profilData.profil.points_pour_niveau_suivant > 0 && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${((profilData.profil.niveau_suivant_points - profilData.profil.points_pour_niveau_suivant) / profilData.profil.niveau_suivant_points) * 100}%` 
                      }}
                    ></div>
                    <span>Encore {profilData.profil.points_pour_niveau_suivant} pts</span>
                  </div>
                )}
              </div>
            </div>

            <div className="stat-card credit-card">
              <div className="stat-icon">💰</div>
              <div className="stat-info">
                <h3>{profilData.profil.credit_euros}€</h3>
                <p>Crédit disponible</p>
              </div>
            </div>

            <div className="stat-card eco-card">
              <div className="stat-icon">🌱</div>
              <div className="stat-info">
                <h3>{profilData.profil.km_eco_totaux.toFixed(1)} km</h3>
                <p>Parcourus en éco</p>
              </div>
            </div>

            <div className="stat-card emissions-card">
              <div className="stat-icon">🌍</div>
              <div className="stat-info">
                <h3>{profilData.profil.emissions_economisees.toFixed(1)} kg</h3>
                <p>CO₂ économisés</p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="badges-section">
            <h3>🏅 Mes Badges ({profilData.badges.length})</h3>
            <div className="badges-grid">
              {profilData.badges.map((badgeUser) => (
                <div key={badgeUser.id} className="badge-card">
                  <div className="badge-icon" style={{ backgroundColor: badgeUser.badge.couleur }}>
                    <i className={`fas fa-${badgeUser.badge.icone}`}></i>
                  </div>
                  <h4>{badgeUser.badge.nom}</h4>
                  <p>{badgeUser.badge.description}</p>
                  <small>Obtenu le {new Date(badgeUser.date_obtention).toLocaleDateString()}</small>
                </div>
              ))}
            </div>
          </div>

          {/* Défis actifs */}
          <div className="active-challenges">
            <h3>🎯 Défis en cours ({profilData.defis_actifs.length})</h3>
            {profilData.defis_actifs.map((defiUser) => (
              <div key={defiUser.id} className="challenge-card active">
                <div className="challenge-header">
                  <h4>{defiUser.defi.nom}</h4>
                  <span className="challenge-reward">+{defiUser.defi.points_recompense} pts</span>
                </div>
                <p>{defiUser.defi.description}</p>
                <div className="challenge-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${defiUser.pourcentage}%` }}
                    ></div>
                  </div>
                  <span>{defiUser.progres.toFixed(1)} / {defiUser.defi.objectif_valeur} {defiUser.defi.unite}</span>
                </div>
                <div className="challenge-footer">
                  <span>⏰ {defiUser.temps_restant} jours restants</span>
                  {defiUser.defi.credit_euros > 0 && (
                    <span>💰 +{defiUser.defi.credit_euros}€</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Historique */}
          <div className="history-section">
            <h3>📜 Historique récent</h3>
            <div className="history-list">
              {profilData.historique.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="history-icon">
                    {item.type === 'badge' && '🏅'}
                    {item.type === 'points' && '⭐'}
                    {item.type === 'credit' && '💰'}
                    {item.type === 'reduction' && '🎫'}
                  </div>
                  <div className="history-content">
                    <p>{item.description}</p>
                    <small>{new Date(item.date_obtention).toLocaleString()}</small>
                  </div>
                  <div className="history-value">{item.valeur}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Défis Tab */}
      {activeTab === 'defis' && (
        <div className="challenges-section">
          <h3>🎯 Défis disponibles</h3>
          <div className="challenges-grid">
            {defisDisponibles.map((defi) => (
              <div key={defi.id} className="challenge-card available">
                <div className="challenge-type">{defi.type.replace('_', ' ')}</div>
                <h4>{defi.nom}</h4>
                <p>{defi.description}</p>
                <div className="challenge-objective">
                  <strong>Objectif:</strong> {defi.objectif_valeur} {defi.unite}
                </div>
                <div className="challenge-rewards">
                  <div className="reward-item">
                    ⭐ {defi.points_recompense} points
                  </div>
                  {defi.credit_euros > 0 && (
                    <div className="reward-item">
                      💰 {defi.credit_euros}€ de crédit
                    </div>
                  )}
                  {defi.reduction_pourcentage > 0 && (
                    <div className="reward-item">
                      🎫 -{defi.reduction_pourcentage}% de réduction
                    </div>
                  )}
                  {defi.badge_recompense && (
                    <div className="reward-item">
                      🏅 Badge "{defi.badge_recompense.nom}"
                    </div>
                  )}
                </div>
                <button 
                  className="btn-accept-challenge"
                  onClick={() => accepterDefi(defi.id)}
                >
                  Accepter le défi
                </button>
                <div className="challenge-duration">
                  ⏰ {defi.duree_limite} jours pour compléter
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classement Tab */}
      {activeTab === 'classement' && classement && (
        <div className="leaderboard-section">
          <h3>🏆 Classement général</h3>
          
          {/* Position de l'utilisateur */}
          <div className="user-position">
            <h4>Votre position</h4>
            <div className="position-card">
              <div className="position-rank">#{classement.position_utilisateur}</div>
              <div className="position-info">
                <p>Niveau {classement.profil_utilisateur.niveau}</p>
                <p>{classement.profil_utilisateur.points} points</p>
                <p>{classement.profil_utilisateur.km_eco} km éco</p>
              </div>
            </div>
          </div>

          {/* Top 50 */}
          <div className="leaderboard-list">
            {classement.classement.map((profil) => (
              <div 
                key={profil.rang} 
                className={`leaderboard-item ${profil.rang <= 3 ? 'top-3' : ''}`}
              >
                <div className="rank">
                  {profil.rang === 1 && '🥇'}
                  {profil.rang === 2 && '🥈'}
                  {profil.rang === 3 && '🥉'}
                  {profil.rang > 3 && `#${profil.rang}`}
                </div>
                <div className="user-info">
                  <h4>{profil.nom}</h4>
                  <p>Niveau {profil.niveau} • {profil.badges_count} badges</p>
                </div>
                <div className="user-stats">
                  <div className="stat">
                    <span className="value">{profil.points}</span>
                    <span className="label">points</span>
                  </div>
                  <div className="stat">
                    <span className="value">{profil.km_eco}</span>
                    <span className="label">km éco</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Boutique Tab */}
      {activeTab === 'boutique' && profilData && (
        <div className="shop-section">
          <h3>🛍️ Boutique de récompenses</h3>
          <p>Crédit disponible: <strong>{profilData.profil.credit_euros}€</strong></p>
          
          <div className="shop-grid">
            <div className="shop-item">
              <div className="shop-icon">🎫</div>
              <h4>Réduction 5%</h4>
              <p>Utilisable sur votre prochaine location</p>
              <div className="shop-price">5€</div>
              <button 
                className="btn-shop"
                disabled={profilData.profil.credit_euros < 5}
                onClick={() => utiliserCredit(5)}
              >
                Acheter
              </button>
            </div>

            <div className="shop-item">
              <div className="shop-icon">🎟️</div>
              <h4>Réduction 10%</h4>
              <p>Utilisable sur votre prochaine location</p>
              <div className="shop-price">10€</div>
              <button 
                className="btn-shop"
                disabled={profilData.profil.credit_euros < 10}
                onClick={() => utiliserCredit(10)}
              >
                Acheter
              </button>
            </div>

            <div className="shop-item">
              <div className="shop-icon">🎁</div>
              <h4>Réduction 20%</h4>
              <p>Réduction importante sur location premium</p>
              <div className="shop-price">25€</div>
              <button 
                className="btn-shop"
                disabled={profilData.profil.credit_euros < 25}
                onClick={() => utiliserCredit(25)}
              >
                Acheter
              </button>
            </div>

            <div className="shop-item special">
              <div className="shop-icon">🚗</div>
              <h4>Location gratuite 1 jour</h4>
              <p>Une journée de location entièrement gratuite</p>
              <div className="shop-price">50€</div>
              <button 
                className="btn-shop"
                disabled={profilData.profil.credit_euros < 50}
                onClick={() => utiliserCredit(50)}
              >
                Acheter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamificationDashboard;
