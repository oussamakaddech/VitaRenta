import React, { useState, useEffect } from 'react';
import CarDiagnosticChatBot from './CarDiagnosticChatBot';
import './DiagnosticPage.css';

const DiagnosticGuide = () => {
  return (
    <div className="diagnostic-guide web3-guide">
      <h3>Guide d'utilisation du diagnostic automobile</h3>
      <div className="guide-content">
        <div className="guide-section">
          <h4>🔍 Comment utiliser le diagnostic IA</h4>
          <ol>
            <li>Décrivez votre problème automobile en détail</li>
            <li>Mentionnez les symptômes observés</li>
            <li>Précisez le modèle et l'année de votre véhicule si possible</li>
            <li>Suivez les recommandations de l'IA</li>
          </ol>
        </div>
        
        <div className="guide-section">
          <h4>🚗 Types de problèmes diagnostiqués</h4>
          <ul>
            <li><strong>Moteur :</strong> Problèmes de démarrage, surchauffe, bruits anormaux</li>
            <li><strong>Freins :</strong> Grincements, vibrations, témoins lumineux</li>
            <li><strong>Transmission :</strong> Changements de vitesse difficiles</li>
            <li><strong>Électrique :</strong> Batterie, alternateur, éclairage</li>
            <li><strong>Climatisation :</strong> Refroidissement, chauffage</li>
          </ul>
        </div>
        
        <div className="guide-section">
          <h4>⚠️ Conseils de sécurité</h4>
          <ul>
            <li>En cas de problème de freins ou direction, arrêtez-vous immédiatement</li>
            <li>Ne conduisez pas si vous voyez de la fumée</li>
            <li>Consultez un professionnel pour les réparations complexes</li>
            <li>Vérifiez régulièrement les niveaux (huile, liquide de frein, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const DiagnosticPage = () => {
  const [activeTab, setActiveTab] = useState('chatbot');
  const [particles, setParticles] = useState([]);

  // Generate floating particles
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 8; i++) {
        newParticles.push({
          id: i,
          left: Math.random() * 100,
          animationDelay: Math.random() * 8,
          size: Math.random() * 2 + 1,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  // Mouse tracking for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty('--mouse-x', `${x}%`);
      document.documentElement.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="diagnostic-page web3-diagnostic">
      {/* Floating Particles */}
      <div className="web3-particles">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="particle"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.animationDelay}s`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
            }}
          />
        ))}
      </div>

      <div className="diagnostic-page-header web3-header-container">
        <div className="diagnostic-header-content">
          <h1>🔧 Diagnostic Automobile IA</h1>
          <p>
            Assistant intelligent pour diagnostiquer vos problèmes de voiture rapidement et efficacement.
          </p>
        </div>
      </div>
      
      <div className="diagnostic-page-content">
        <div className="features-grid web3-features">
          <div className="feature-card web3-card" data-tilt>
            <div className="feature-icon web3-icon">🧠</div>
            <h3>Diagnostic IA</h3>
            <p>Analyse intelligente et rapide de vos problèmes automobiles</p>
          </div>
          
          <div className="feature-card web3-card" data-tilt>
            <div className="feature-icon web3-icon">⚡</div>
            <h3>Réponse Instantanée</h3>
            <p>Obtenez des solutions immédiates 24h/24</p>
          </div>
          
          <div className="feature-card web3-card" data-tilt>
            <div className="feature-icon web3-icon">🔧</div>
            <h3>Solutions Pratiques</h3>
            <p>Guides étape par étape pour résoudre vos pannes</p>
          </div>
          
          <div className="feature-card web3-card" data-tilt>
            <div className="feature-icon web3-icon">🛡️</div>
            <h3>Conseils Sécurité</h3>
            <p>Alertes importantes pour votre protection</p>
          </div>
        </div>
        
        <div className="diagnostic-tabs web3-tabs">
          <div className="tab-navigation web3-nav">
            <button
              className={`tab-btn web3-tab-btn ${activeTab === 'chatbot' ? 'active' : ''}`}
              onClick={() => setActiveTab('chatbot')}
            >
              🤖 Assistant Diagnostic
            </button>
            <button
              className={`tab-btn web3-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
              onClick={() => setActiveTab('guide')}
            >
              📖 Guide d'utilisation
            </button>
          </div>
          
          <div className="tab-content">
            {activeTab === 'chatbot' && (
              <div className="chatbot-section">
                <CarDiagnosticChatBot />
              </div>
            )}
            
            {activeTab === 'guide' && (
              <div className="guide-section">
                <DiagnosticGuide />
              </div>
            )}
          </div>
        </div>
        
        <div className="disclaimer web3-disclaimer">
          <div className="disclaimer-content">
            <h4>⚠️ Avertissement Important</h4>
            <p>
              Ce système d'IA fournit des informations générales à titre éducatif. 
              Pour les systèmes critiques (freins, direction, sécurité), consultez un professionnel.
            </p>
            <p>
              VitaRenta décline toute responsabilité en cas de dommages résultant 
              de l'utilisation de ces informations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticPage;
