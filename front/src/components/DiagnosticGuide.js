import React, { useState } from 'react';
import './DiagnosticGuide.css';

const DiagnosticGuide = () => {
  const [activeSection, setActiveSection] = useState('usage');

  const sections = {
    usage: {
      title: "🚀 Comment utiliser l'assistant",
      content: (
        <div className="guide-content">
          <h3>Étapes simples pour obtenir de l'aide :</h3>
          <ol className="guide-steps">
            <li>
              <strong>Décrivez votre problème</strong>
              <p>Expliquez en langage naturel ce qui ne va pas avec votre véhicule</p>
            </li>
            <li>
              <strong>Soyez spécifique</strong>
              <p>Mentionnez les bruits, les voyants, quand le problème survient</p>
            </li>
            <li>
              <strong>Suivez les conseils</strong>
              <p>L'assistant vous donnera des explications et des solutions</p>
            </li>
            <li>
              <strong>Consultez un professionnel</strong>
              <p>En cas de doute ou problème de sécurité, contactez un mécanicien</p>
            </li>
          </ol>
        </div>
      )
    },
    examples: {
      title: "💬 Exemples de questions",
      content: (
        <div className="guide-content">
          <h3>Questions que vous pouvez poser :</h3>
          <div className="examples-grid">
            <div className="example-category">
              <h4>🔧 Problèmes moteur</h4>
              <ul>
                <li>"Ma voiture ne démarre pas le matin"</li>
                <li>"Le moteur toussote au ralenti"</li>
                <li>"J'ai perdu de la puissance"</li>
                <li>"Mon moteur surchauffe"</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>🛞 Freins et sécurité</h4>
              <ul>
                <li>"Mes freins grincent"</li>
                <li>"La pédale de frein est molle"</li>
                <li>"Le volant vibre au freinage"</li>
                <li>"Ma voiture tire à droite"</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>⚡ Problèmes électriques</h4>
              <ul>
                <li>"Ma batterie se décharge"</li>
                <li>"Les phares sont faibles"</li>
                <li>"Le voyant batterie est allumé"</li>
                <li>"Le démarreur fait des clics"</li>
              </ul>
            </div>
            <div className="example-category">
              <h4>🚗 Autres problèmes</h4>
              <ul>
                <li>"Ma climatisation ne fonctionne pas"</li>
                <li>"Mes pneus s'usent de travers"</li>
                <li>"L'embrayage patine"</li>
                <li>"La direction est dure"</li>
              </ul>
            </div>
          </div>
        </div>
      )
    },
    safety: {
      title: "⚠️ Conseils de sécurité",
      content: (
        <div className="guide-content">
          <h3>Votre sécurité avant tout :</h3>
          <div className="safety-alerts">
            <div className="safety-alert critical">
              <h4>🚨 Arrêtez immédiatement si :</h4>
              <ul>
                <li>Pédale de frein molle ou qui s'enfonce</li>
                <li>Voyant de température moteur rouge</li>
                <li>Perte totale de direction</li>
                <li>Fumée sous le capot</li>
                <li>Bruits métalliques violents</li>
              </ul>
            </div>
            <div className="safety-alert warning">
              <h4>⚠️ Consultez rapidement pour :</h4>
              <ul>
                <li>Grincements de freins persistants</li>
                <li>Vibrations anormales</li>
                <li>Voyants d'alerte allumés</li>
                <li>Changements dans le comportement du véhicule</li>
              </ul>
            </div>
            <div className="safety-alert info">
              <h4>💡 Bonnes pratiques :</h4>
              <ul>
                <li>Entretenez votre véhicule régulièrement</li>
                <li>Vérifiez les niveaux (huile, liquide de frein, etc.)</li>
                <li>Contrôlez la pression des pneus</li>
                <li>Soyez attentif aux bruits et changements</li>
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
        <h2>📖 Guide d'utilisation du diagnostic</h2>
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
        {sections[activeSection].content}
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
