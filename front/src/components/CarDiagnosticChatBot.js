import React, { useState, useRef, useEffect } from 'react';
import './CarDiagnosticChatBot.css';
import './Web3Effects.css';

// Base de connaissances des problèmes de voitures
const carProblems = {
  // Problèmes moteur
  'moteur': {
    keywords: ['moteur', 'ralenti', 'démarre pas', 'toussote', 'cale', 'puissance', 'accélération', 'fume', 'huile', 'surchauffe'],
    problems: {
      'ne_demarre_pas': {
        symptoms: ['moteur ne démarre pas', 'ne démarre pas', 'démarre pas', 'ne tourne pas'],
        explanation: "Si votre moteur ne démarre pas, plusieurs causes sont possibles :",
        causes: [
          "🔋 **Batterie déchargée** : La cause la plus fréquente. Vérifiez les voyants du tableau de bord.",
          "⛽ **Manque de carburant** : Vérifiez le niveau de carburant.",
          "🔌 **Problème d'allumage** : Bougies d'allumage défectueuses ou bobines d'allumage.",
          "🔧 **Démarreur défaillant** : Si vous entendez un clic sans rotation du moteur.",
          "🛢️ **Problème de pompe à carburant** : Le carburant n'arrive pas au moteur."
        ],
        solutions: [
          "Vérifiez d'abord la batterie avec un multimètre (12,6V à l'arrêt)",
          "Contrôlez le niveau de carburant",
          "Essayez de faire démarrer avec des câbles de démarrage",
          "Si le problème persiste, consultez un mécanicien"
        ]
      },
      'ralenti_irregulier': {
        symptoms: ['ralenti irrégulier', 'moteur toussote', 'ralenti instable', 'moteur cale', 'à-coups'],
        explanation: "Un ralenti irrégulier peut indiquer plusieurs problèmes :",
        causes: [
          "🌪️ **Filtre à air encrassé** : Limite l'arrivée d'air au moteur.",
          "⛽ **Système d'injection sale** : Injecteurs encrassés.",
          "🔌 **Bougies d'allumage usées** : Combustion incomplète.",
          "🔧 **Capteur de débit d'air défaillant** : Mesure incorrecte de l'air entrant.",
          "💨 **Fuite d'air** : Dans le système d'admission."
        ],
        solutions: [
          "Remplacez le filtre à air si nécessaire",
          "Nettoyez le système d'injection avec un additif spécialisé",
          "Vérifiez et remplacez les bougies d'allumage",
          "Faites diagnostiquer par un professionnel si le problème persiste"
        ]
      },
      'perte_puissance': {
        symptoms: ['perte de puissance', 'manque de puissance', 'accélération faible', 'moteur mou', 'n\'accélère pas'],
        explanation: "Une perte de puissance peut avoir plusieurs origines :",
        causes: [
          "🌪️ **Filtre à air bouché** : Réduit l'efficacité du moteur.",
          "⛽ **Filtre à carburant encrassé** : Limite l'arrivée de carburant.",
          "🔧 **Turbo défaillant** : Pour les moteurs turbocompressés.",
          "💨 **Système d'échappement bouché** : Catalyseur défaillant.",
          "🔌 **Problème d'allumage** : Bobines ou bougies défectueuses."
        ],
        solutions: [
          "Vérifiez et remplacez les filtres (air et carburant)",
          "Contrôlez le système d'échappement",
          "Faites vérifier le turbo si équipé",
          "Diagnostic électronique recommandé"
        ]
      },
      'surchauffe': {
        symptoms: ['moteur surchauffe', 'température élevée', 'voyant température', 'vapeur sous le capot'],
        explanation: "La surchauffe moteur est un problème grave qui nécessite une action immédiate :",
        causes: [
          "💧 **Fuite de liquide de refroidissement** : Radiateur, durites ou joint de culasse.",
          "🌪️ **Thermostat défaillant** : Ne s'ouvre pas correctement.",
          "⚙️ **Pompe à eau défectueuse** : Circulation insuffisante du liquide.",
          "🔧 **Radiateur bouché** : Accumulation de dépôts.",
          "🌀 **Ventilateur en panne** : Refroidissement insuffisant à l'arrêt."
        ],
        solutions: [
          "⚠️ **ARRÊTEZ IMMÉDIATEMENT le moteur**",
          "Laissez refroidir avant d'ouvrir le capot",
          "Vérifiez le niveau de liquide de refroidissement",
          "Consultez un mécanicien en urgence"
        ]
      },
      'consommation_excessive': {
        symptoms: ['consomme trop', 'consommation élevée', 'boit de l\'essence', 'autonomie réduite'],
        explanation: "Une consommation excessive peut avoir plusieurs causes :",
        causes: [
          "🔧 **Capteurs défaillants** : Sonde lambda, débitmètre d'air.",
          "🌪️ **Filtre à air sale** : Mélange air/carburant déséquilibré.",
          "⛽ **Injecteurs encrassés** : Mauvaise pulvérisation du carburant.",
          "🚗 **Style de conduite** : Accélérations brutales, vitesse élevée.",
          "🔩 **Problème mécanique** : Embrayage qui patine, freins qui traînent."
        ],
        solutions: [
          "Adoptez une conduite souple et économique",
          "Vérifiez et remplacez le filtre à air",
          "Faites nettoyer les injecteurs",
          "Contrôlez la pression des pneus régulièrement"
        ]
      }
    }
  },
  
  // Problèmes de freinage
  'freins': {
    keywords: ['freins', 'freine mal', 'pédale', 'grincement', 'vibration freinage', 'liquide frein'],
    problems: {
      'grincement_freins': {
        symptoms: ['grincement au freinage', 'bruit métallique', 'crissement', 'couinement'],
        explanation: "Un grincement au freinage indique généralement :",
        causes: [
          "🔧 **Plaquettes de frein usées** : Le témoin d'usure touche le disque.",
          "💧 **Disques de frein rayés** : Surface de freinage dégradée.",
          "🌧️ **Humidité/rouille** : Après stationnement prolongé ou pluie.",
          "🧱 **Corps étranger** : Caillou ou débris entre plaquette et disque."
        ],
        solutions: [
          "Inspectez visuellement l'épaisseur des plaquettes",
          "Remplacez les plaquettes si elles sont fines (<3mm)",
          "Vérifiez l'état des disques de frein",
          "Intervention urgente si le bruit persiste"
        ]
      },
      'pedale_molle': {
        symptoms: ['pédale de frein molle', 'pédale qui s\'enfonce', 'freinage inefficace', 'pédale spongieuse'],
        explanation: "Une pédale de frein molle est un problème de sécurité critique :",
        causes: [
          "💧 **Fuite de liquide de frein** : Maître-cylindre ou étriers défaillants.",
          "🌪️ **Air dans le circuit** : Après intervention sur le système de freinage.",
          "🔧 **Maître-cylindre défaillant** : Joint interne usé.",
          "⚠️ **Plaquettes trop usées** : Contact métal sur métal."
        ],
        solutions: [
          "⚠️ **ARRÊTEZ DE CONDUIRE IMMÉDIATEMENT**",
          "Vérifiez le niveau de liquide de frein",
          "Consultez un mécanicien en urgence",
          "Ne pas utiliser le véhicule tant que le problème n'est pas résolu"
        ]
      },
      'vibrations_freinage': {
        symptoms: ['vibrations au freinage', 'volant qui tremble', 'pédale qui vibre'],
        explanation: "Les vibrations au freinage indiquent un problème de disques :",
        causes: [
          "💿 **Disques de frein voilés** : Déformation due à la chaleur.",
          "🔧 **Plaquettes mal montées** : Installation incorrecte.",
          "⚙️ **Étriers grippés** : Pression inégale sur les plaquettes.",
          "🔩 **Fixation desserrée** : Roue ou étrier mal fixé."
        ],
        solutions: [
          "Faites rectifier ou remplacer les disques",
          "Vérifiez le serrage des roues",
          "Contrôlez l'état des étriers de frein",
          "Intervention nécessaire pour la sécurité"
        ]
      }
    }
  },
  
  // Problèmes électriques
  'electrique': {
    keywords: ['batterie', 'alternateur', 'voyant', 'éclairage', 'décharge', 'démarreur', 'fusible'],
    problems: {
      'batterie_decharge': {
        symptoms: ['batterie se décharge', 'voyant batterie', 'démarrage difficile', 'phares faibles'],
        explanation: "Une batterie qui se décharge peut avoir plusieurs causes :",
        causes: [
          "🔋 **Batterie en fin de vie** : Après 4-5 ans d'utilisation.",
          "⚡ **Alternateur défaillant** : Ne recharge plus la batterie.",
          "🔌 **Consommation parasite** : Équipement qui reste allumé.",
          "🌡️ **Conditions météo** : Le froid réduit la capacité de la batterie."
        ],
        solutions: [
          "Testez la tension de la batterie (12,6V moteur arrêté)",
          "Vérifiez la charge de l'alternateur (14V moteur tournant)",
          "Recherchez les consommations parasites",
          "Remplacez la batterie si nécessaire"
        ]
      },
      'alternateur_defaillant': {
        symptoms: ['voyant batterie allumé', 'éclairage faible', 'batterie se vide en roulant'],
        explanation: "Un alternateur défaillant ne recharge plus correctement la batterie :",
        causes: [
          "🔧 **Courroie d'alternateur cassée** : Plus d'entraînement.",
          "⚡ **Bobinages internes grillés** : Alternateur en panne.",
          "🔌 **Régulateur de tension défaillant** : Charge incorrecte.",
          "🧲 **Balais d'alternateur usés** : Contact électrique défaillant."
        ],
        solutions: [
          "Vérifiez l'état et la tension de la courroie",
          "Testez la charge de l'alternateur (14V moteur tournant)",
          "Remplacez l'alternateur si défaillant",
          "Vérifiez les connexions électriques"
        ]
      }
    }
  },
  
  // Problèmes de transmission
  'transmission': {
    keywords: ['boite', 'vitesse', 'embrayage', 'transmission', 'patine', 'claquement'],
    problems: {
      'embrayage_patine': {
        symptoms: ['embrayage patine', 'perte de transmission', 'régime moteur monte', 'odeur de brûlé'],
        explanation: "Un embrayage qui patine nécessite une attention immédiate :",
        causes: [
          "🔧 **Disque d'embrayage usé** : Garnitures trop fines.",
          "🔩 **Réglage incorrect** : Pédale d'embrayage mal réglée.",
          "💧 **Fuite d'huile** : Contamination du disque d'embrayage.",
          "⚙️ **Ressort de diaphragme fatigué** : Pression insuffisante."
        ],
        solutions: [
          "Évitez de rester le pied sur la pédale d'embrayage",
          "Faites vérifier le réglage de la pédale",
          "Remplacement de l'embrayage si usé",
          "Intervention rapide pour éviter d'endommager le volant moteur"
        ]
      },
      'boite_vitesse_difficile': {
        symptoms: ['passage de vitesse difficile', 'craque en passant les vitesses', 'vitesse qui saute'],
        explanation: "Des difficultés de passage de vitesse peuvent indiquer :",
        causes: [
          "🛢️ **Huile de boîte usée** : Viscosité insuffisante.",
          "🔧 **Synchroniseurs usés** : Égalisation des vitesses défaillante.",
          "🔩 **Câblage d'embrayage mal réglé** : Débrayage incomplet.",
          "⚙️ **Usure interne de la boîte** : Fourchettes ou baladeurs usés."
        ],
        solutions: [
          "Vidangez l'huile de boîte de vitesses",
          "Vérifiez le réglage de l'embrayage",
          "Consultez un spécialiste transmission",
          "Évitez de forcer sur le levier de vitesse"
        ]
      }
    }
  },

  // Problèmes de climatisation
  'climatisation': {
    keywords: ['clim', 'climatisation', 'air conditionné', 'froid', 'chaud', 'buée'],
    problems: {
      'clim_ne_refroidit_pas': {
        symptoms: ['climatisation ne refroidit pas', 'air pas froid', 'clim inefficace'],
        explanation: "Une climatisation qui ne refroidit pas peut avoir plusieurs causes :",
        causes: [
          "🌡️ **Manque de gaz réfrigérant** : Fuite dans le circuit.",
          "🔧 **Compresseur défaillant** : N'assure plus la compression.",
          "🌪️ **Filtre habitacle encrassé** : Circulation d'air réduite.",
          "⚡ **Problème électrique** : Capteurs ou relais défaillants."
        ],
        solutions: [
          "Vérifiez le niveau de gaz réfrigérant",
          "Remplacez le filtre habitacle",
          "Faites diagnostiquer le système par un professionnel",
          "Contrôlez les fusibles de climatisation"
        ]
      }
    }
  },

  // Problèmes de pneus et suspension
  'pneus_suspension': {
    keywords: ['pneu', 'suspension', 'amortisseur', 'vibration', 'usure', 'direction'],
    problems: {
      'usure_irreguliere_pneus': {
        symptoms: ['usure irrégulière des pneus', 'pneus usés d\'un côté', 'usure anormale'],
        explanation: "Une usure irrégulière des pneus révèle souvent un problème de géométrie :",
        causes: [
          "🔧 **Parallélisme déréglé** : Roues non alignées.",
          "⚙️ **Amortisseurs usés** : Mauvais contact pneu/route.",
          "🔩 **Pression incorrecte** : Sur ou sous-gonflage.",
          "🔧 **Problème de suspension** : Rotules ou silent-blocs usés."
        ],
        solutions: [
          "Faites vérifier et régler la géométrie",
          "Contrôlez régulièrement la pression des pneus",
          "Remplacez les amortisseurs si nécessaire",
          "Effectuez une rotation des pneus régulièrement"
        ]
      },
      'vibrations_volant': {
        symptoms: ['volant qui vibre', 'vibrations en roulant', 'tremblement volant'],
        explanation: "Les vibrations au volant peuvent avoir plusieurs origines :",
        causes: [
          "⚙️ **Équilibrage des roues** : Masses d'équilibrage perdues.",
          "🔧 **Pneus déformés** : Méplat ou hernie sur le pneu.",
          "💿 **Disques de frein voilés** : Déformation des disques.",
          "🔩 **Fixation de roue desserrée** : Écrous mal serrés."
        ],
        solutions: [
          "Faites équilibrer les roues",
          "Vérifiez l'état et la pression des pneus",
          "Contrôlez le serrage des écrous de roue",
          "Inspectez les disques de frein"
        ]
      }
    }
  }
};

const CarDiagnosticChatBot = () => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: "🚗 Bonjour ! Je suis votre assistant spécialisé dans le diagnostic automobile. Décrivez-moi le problème que vous rencontrez avec votre véhicule, et je vous aiderai à le comprendre et le résoudre.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fonction pour analyser le message de l'utilisateur
  const analyzeUserMessage = (message) => {
    const normalizedMessage = message.toLowerCase();
    let matchedProblems = [];

    // Parcourir toutes les catégories et problèmes
    Object.entries(carProblems).forEach(([category, categoryData]) => {
      // Vérifier les mots-clés de la catégorie
      const categoryMatch = categoryData.keywords.some(keyword => 
        normalizedMessage.includes(keyword.toLowerCase())
      );

      if (categoryMatch) {
        // Chercher les problèmes spécifiques dans cette catégorie
        Object.entries(categoryData.problems).forEach(([problemKey, problemData]) => {
          const symptomMatch = problemData.symptoms.some(symptom =>
            normalizedMessage.includes(symptom.toLowerCase())
          );

          if (symptomMatch) {
            matchedProblems.push({
              category,
              problem: problemKey,
              data: problemData,
              relevance: symptomMatch ? 2 : 1
            });
          }
        });

        // Si aucun problème spécifique n'est trouvé, suggérer les problèmes de la catégorie
        if (matchedProblems.length === 0) {
          Object.entries(categoryData.problems).forEach(([problemKey, problemData]) => {
            matchedProblems.push({
              category,
              problem: problemKey,
              data: problemData,
              relevance: 0.5
            });
          });
        }
      }
    });

    return matchedProblems.sort((a, b) => b.relevance - a.relevance).slice(0, 2);
  };

  // Fonction pour générer une réponse du bot
  const generateBotResponse = (userMessage) => {
    const matchedProblems = analyzeUserMessage(userMessage);

    if (matchedProblems.length === 0) {
      return {
        type: 'bot',
        content: "🤔 Je n'ai pas pu identifier le problème spécifique. Pourriez-vous me donner plus de détails ? Par exemple :\n\n• Quel type de bruit entendez-vous ?\n• Le problème survient-il au démarrage, en roulant, ou à l'arrêt ?\n• Y a-t-il des voyants allumés sur le tableau de bord ?\n• Depuis quand avez-vous remarqué ce problème ?",
        timestamp: new Date()
      };
    }

    const mainProblem = matchedProblems[0];
    let response = `🔧 **${mainProblem.data.explanation}**\n\n`;

    // Ajouter les causes possibles
    response += "**🔍 Causes possibles :**\n";
    mainProblem.data.causes.forEach(cause => {
      response += `${cause}\n`;
    });

    response += "\n**💡 Solutions recommandées :**\n";
    mainProblem.data.solutions.forEach(solution => {
      response += `• ${solution}\n`;
    });

    // Ajouter un avertissement de sécurité si nécessaire
    if (mainProblem.category === 'freins' || mainProblem.problem === 'ne_demarre_pas') {
      response += "\n⚠️ **Important :** En cas de doute, consultez immédiatement un professionnel. La sécurité est primordiale !";
    }

    // Suggestions de problèmes connexes
    if (matchedProblems.length > 1) {
      response += "\n\n🔗 **Vous pourriez aussi être intéressé par :**\n";
      response += `• ${matchedProblems[1].data.explanation}`;
    }

    return {
      type: 'bot',
      content: response,
      timestamp: new Date()
    };
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    // Ajouter le message de l'utilisateur
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simuler le temps de réflexion du bot
    setTimeout(() => {
      const botResponse = generateBotResponse(userMessage.content);
      botResponse.id = messages.length + 2;
      
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "Ma voiture ne démarre pas",
    "J'entends un grincement au freinage",
    "Mon moteur a des ratés",
    "La pédale de frein est molle",
    "Ma batterie se décharge",
    "Mon moteur surchauffe",
    "Ma climatisation ne fonctionne pas",
    "Mes pneus s'usent bizarrement",
    "J'ai des vibrations au volant",
    "Ma voiture consomme trop"
  ];

  const handleQuickQuestion = (question) => {
    setInputValue(question);
  };

  return (
    <div className="web3-chatbot-container">
      <div className="web3-background-effects">
        <div className="floating-particles"></div>
        <div className="neon-grid"></div>
        <div className="hologram-overlay"></div>
      </div>
      
      <div className="chatbot-container web3-glass">
        <div className="chatbot-header web3-header">
          <div className="chatbot-header-info">
            <div className="chatbot-avatar web3-avatar">
              <div className="avatar-inner">
                🚗
              </div>
              <div className="avatar-pulse"></div>
            </div>
            <div className="chatbot-title">
              <h3 className="web3-title">Assistant Diagnostic Auto</h3>
              <span className="chatbot-status web3-status">
                <span className="status-dot"></span>
                IA Connectée
              </span>
            </div>
          </div>
          <div className="web3-header-effects">
            <div className="energy-bar"></div>
          </div>
        </div>

        <div className="chatbot-messages web3-messages" ref={chatContainerRef}>
          {messages.map((message) => (
            <div key={message.id} className={`message ${message.type} web3-message`}>
              <div className="message-content web3-message-content">
                {message.content.split('\n').map((line, index) => (
                  <div key={index}>
                    {line.includes('**') ? (
                      <span dangerouslySetInnerHTML={{
                        __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="web3-bold">$1</strong>')
                      }} />
                    ) : (
                      line
                    )}
                  </div>
                ))}
              </div>
              <div className="message-time web3-time">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message bot web3-message">
              <div className="message-content typing web3-typing">
                <div className="typing-indicator web3-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <span className="typing-text">IA en cours d'analyse...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="quick-questions web3-quick-questions">
          <p className="web3-quick-title">Questions fréquentes :</p>
          <div className="quick-questions-grid web3-grid">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="quick-question-btn web3-quick-btn"
                onClick={() => handleQuickQuestion(question)}
              >
                <span className="btn-text">{question}</span>
                <div className="btn-glow"></div>
              </button>
            ))}
          </div>
        </div>

        <div className="chatbot-input web3-input">
          <div className="input-container web3-input-container">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Décrivez votre problème automobile..."
              rows="2"
              className="message-input web3-textarea"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="web3-button web3-button-primary"
            >
              📤 Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDiagnosticChatBot;
