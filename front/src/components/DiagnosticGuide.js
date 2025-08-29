// DiagnosticGuide.js - Version adaptée au design BackendDiagnostic
import React, { useState } from 'react';
import './DiagnosticGuide.css';

const DiagnosticGuide = () => {
  const [activeSection, setActiveSection] = useState('usage');

  const sections = {
    usage: {
      title: "🚀 Comment utiliser l'assistant",
      content: (
        <div className="guide-content">
          <h3>Guide d'utilisation de l'Assistant IA</h3>
          <ol className="guide-steps">
            <li>
              <strong>Décrivez votre problème</strong>
              <p>Expliquez en langage naturel ce qui ne va pas avec votre véhicule</p>
            </li>
            <li>
              <strong>Donnez des détails</strong>
              <p>Mentionnez les bruits, les voyants, quand le problème survient</p>
            </li>
            <li>
              <strong>Recevez un diagnostic</strong>
              <p>L'assistant vous donnera des explications et des solutions</p>
            </li>
            <li>
              <strong>Consultez si nécessaire</strong>
              <p>En cas de doute ou problème de sécurité, contactez un mécanicien</p>
            </li>
          </ol>
        </div>
      )
    },
    examples: {
      title: "📝 Exemples de questions",
      content: (
        <div className="guide-content">
          <h3>Exemples de questions à poser</h3>
          <div className="examples-grid">
            <div className="example-category">
              <h4>🔧 Problèmes moteur</h4>
              <ul>
                <li>Ma voiture ne démarre pas</li>
                <li>Mon moteur fait du bruit</li>
                <li>Il y a de la fumée</li>
                <li>Le moteur surchauffe</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>🛞 Freins et roues</h4>
              <ul>
                <li>Grincement au freinage</li>
                <li>Pédale de frein molle</li>
                <li>Vibrations dans le volant</li>
                <li>Usure anormale des pneus</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>🔋 Système électrique</h4>
              <ul>
                <li>Batterie qui se décharge</li>
                <li>Voyants du tableau de bord</li>
                <li>Éclairage défaillant</li>
                <li>Problèmes de démarrage</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>❄️ Autres systèmes</h4>
              <ul>
                <li>Climatisation inefficace</li>
                <li>Problèmes de transmission</li>
                <li>Suspensions défaillantes</li>
                <li>Bruits anormaux</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    safety: {
      title: "🛡️ Conseils sécurité",
      content: (
        <div className="guide-content">
          <h3>Consignes de sécurité importantes</h3>
          <div className="safety-alerts">
            <div className="safety-alert critical">
              <h4>🚨 Urgence - Arrêt immédiat</h4>
              <ul>
                <li>Voyant température moteur rouge</li>
                <li>Pédale de frein qui s'enfonce complètement</li>
                <li>Fumée importante sous le capot</li>
                <li>Bruit métallique violent</li>
              </ul>
            </div>
            <div className="safety-alert warning">
              <h4>⚠️ Attention - Consultation recommandée</h4>
              <ul>
                <li>Voyants de sécurité allumés</li>
                <li>Vibrations anormales</li>
                <li>Bruits nouveaux persistants</li>
                <li>Changements dans le comportement</li>
              </ul>
            </div>
            <div className="safety-alert info">
              <h4>ℹ️ Information - Maintenance préventive</h4>
              <ul>
                <li>Respectez les intervalles de révision</li>
                <li>Vérifiez régulièrement les niveaux</li>
                <li>Surveillez l'usure des pneumatiques</li>
                <li>Écoutez votre véhicule</li>
              </ul>
            </div>
          </div>
        </div>
      )
    }
  };

  return (
    <div className="diagnostic-guide">
      <div className="guide-header">
        <h2>Guide d'utilisation</h2>
        <p>Apprenez à utiliser efficacement notre assistant diagnostic automobile</p>
      </div>

      <div className="guide-navigation">
        {Object.entries(sections).map(([key, section]) => (
          <button
            key={key}
            className={`nav-btn ${activeSection === key ? 'active' : ''}`}
            onClick={() => setActiveSection(key)}
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="guide-body">
        {sections[activeSection]?.content}
      </div>

      <div className="guide-footer">
        <div className="disclaimer">
          <p>
            <strong>Disclaimer :</strong> Ce service fournit des informations générales à titre éducatif.
            En cas de problème de sécurité ou de doute, consultez toujours un professionnel qualifié.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DiagnosticGuide;
