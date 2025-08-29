import React, { useState, useRef, useEffect } from 'react';
import './CarDiagnosticChatBot.css';

// Base de connaissances des problèmes de voitures (inchangée)
const carProblems = {
  moteur: {
    keywords: ['moteur', 'ralenti', 'démarre pas', 'toussote', 'cale', 'puissance', 'accélération', 'fume', 'huile', 'surchauffe'],
    problems: {
      ne_demarre_pas: {
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
      ralenti_irregulier: {
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
      perte_puissance: {
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
      surchauffe: {
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
      consommation_excessive: {
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
  freins: {
    keywords: ['freins', 'freine mal', 'pédale', 'grincement', 'vibration freinage', 'liquide frein'],
    problems: {
      grincement_freins: {
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
      pedale_molle: {
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
      vibrations_freinage: {
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
  electrique: {
    keywords: ['batterie', 'alternateur', 'voyant', 'éclairage', 'décharge', 'démarreur', 'fusible'],
    problems: {
      batterie_decharge: {
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
      alternateur_defaillant: {
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
  transmission: {
    keywords: ['boite', 'vitesse', 'embrayage', 'transmission', 'patine', 'claquement'],
    problems: {
      embrayage_patine: {
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
      boite_vitesse_difficile: {
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
  climatisation: {
    keywords: ['clim', 'climatisation', 'air conditionné', 'froid', 'chaud', 'buée'],
    problems: {
      clim_ne_refroidit_pas: {
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
  pneus_suspension: {
    keywords: ['pneu', 'suspension', 'amortisseur', 'vibration', 'usure', 'direction'],
    problems: {
      usure_irreguliere_pneus: {
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
      vibrations_volant: {
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
      content: "🚗 Bonjour ! Je suis votre assistant IA spécialisé dans le diagnostic automobile cyberpunk. Décrivez-moi le problème que vous rencontrez avec votre véhicule, et je vous aiderai à le comprendre et le résoudre grâce à ma technologie neural avancée.",
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

  // Génération des particules neurales
  useEffect(() => {
    const createNeuralParticles = () => {
      const container = document.querySelector('.cdc-chatbot-container');
      if (!container) return;

      // Particules neurales
      const createParticle = (type) => {
        const particle = document.createElement('div');
        particle.className = type;
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 12 + 's';
        
        const particlesContainer = container.querySelector('.web3-neural-particles') || 
          (() => {
            const div = document.createElement('div');
            div.className = 'web3-neural-particles';
            container.appendChild(div);
            return div;
          })();
        
        particlesContainer.appendChild(particle);
        
        setTimeout(() => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        }, 12000);
      };

      // Créer différents types de particules
      createParticle('web3-neural-particle');
      
      if (Math.random() < 0.3) {
        createParticle('web3-data-sparkle');
      }
      
      // Connexions neurales occasionnelles
      if (Math.random() < 0.1) {
        const connection = document.createElement('div');
        connection.className = 'web3-neural-connection';
        connection.style.left = Math.random() * 80 + '%';
        connection.style.top = Math.random() * 80 + '%';
        connection.style.width = Math.random() * 200 + 50 + 'px';
        connection.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
        
        const particlesContainer = container.querySelector('.web3-neural-particles') || 
          (() => {
            const div = document.createElement('div');
            div.className = 'web3-neural-particles';
            container.appendChild(div);
            return div;
          })();
        
        particlesContainer.appendChild(connection);
        
        setTimeout(() => {
          if (connection.parentNode) {
            connection.parentNode.removeChild(connection);
          }
        }, 3000);
      }
    };

    const interval = setInterval(createNeuralParticles, 800);
    return () => clearInterval(interval);
  }, []);

  const analyzeUserMessage = (message) => {
    const normalizedMessage = message.toLowerCase();
    let matchedProblems = [];

    Object.entries(carProblems).forEach(([category, categoryData]) => {
      const categoryMatch = categoryData.keywords.some(keyword =>
        normalizedMessage.includes(keyword.toLowerCase())
      );

      if (categoryMatch) {
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

  const generateBotResponse = (userMessage) => {
    const matchedProblems = analyzeUserMessage(userMessage);

    if (matchedProblems.length === 0) {
      return {
        type: 'bot',
        content: "🤖 **Analyse Neural en cours...** Mon IA n'a pas pu identifier le problème spécifique. Pourriez-vous me donner plus de détails pour optimiser le diagnostic ?\n\n**🔍 Données requises :**\n• Quel type de bruit entendez-vous ?\n• Le problème survient-il au démarrage, en roulant, ou à l'arrêt ?\n• Y a-t-il des voyants allumés sur le tableau de bord ?\n• Depuis quand avez-vous remarqué ce problème ?\n\n**⚡ Système de diagnostic avancé prêt à analyser...**",
        timestamp: new Date()
      };
    }

    const mainProblem = matchedProblems[0];
    let response = `🚀 **Diagnostic IA Completed** - ${mainProblem.data.explanation}\n\n`;
    
    response += "**🔍 Analyse Neural - Causes détectées :**\n";
    mainProblem.data.causes.forEach(cause => {
      response += `${cause}\n`;
    });

    response += "\n**💡 Solutions recommandées par l'IA :**\n";
    mainProblem.data.solutions.forEach(solution => {
      response += `• ${solution}\n`;
    });

    if (mainProblem.category === 'freins' || mainProblem.problem === 'surchauffe') {
      response += "\n⚠️ **⚡ ALERTE SÉCURITÉ CRITIQUE ⚡** En cas de doute, consultez immédiatement un professionnel. Votre sécurité est la priorité absolue du système !";
    }

    if (matchedProblems.length > 1) {
      response += "\n\n🔗 **Diagnostic secondaire détecté :**\n";
      response += `• ${matchedProblems[1].data.explanation}`;
    }

    response += "\n\n**🤖 IA Diagnostic System v2.1 - Analyse terminée**";

    return {
      type: 'bot',
      content: response,
      timestamp: new Date()
    };
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateBotResponse(userMessage.content);
      botResponse.id = messages.length + 2;
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 2000);
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
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const botResponse = generateBotResponse(question);
      botResponse.id = messages.length + 2;
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 2000);
  };

  return (
    <div className="cdc-chatbot-container">
      <div className="cdc-container" ref={chatContainerRef}>
        <div className="cdc-header">
          <div className="cdc-header-info">
            <div className="cdc-avatar">
              🤖
            </div>
            <div className="cdc-title">
              <h3>CarDiag Neural AI</h3>
              <div className="cdc-status">
                <div className="cdc-status-dot"></div>
                <span>Système IA en ligne</span>
              </div>
            </div>
          </div>
        </div>

        <div className="cdc-messages">
          {messages.map((message) => (
            <div key={message.id} className={`cdc-message ${message.type}`}>
              <div className="cdc-message-content">
                {message.content}
              </div>
              <div className="cdc-message-time">
                {message.timestamp.toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="cdc-message bot">
              <div className="cdc-message-content cdc-typing">
                <div className="web3-ai-brain-loader">
                  <div className="web3-brain-core"></div>
                  <div className="web3-brain-waves">
                    <div className="wave wave-1"></div>
                    <div className="wave wave-2"></div>
                    <div className="wave wave-3"></div>
                  </div>
                </div>
                <span>IA analysant le diagnostic neural...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="cdc-quick-questions">
          <h4 className="cdc-quick-title">⚡ Diagnostics rapides Neural AI</h4>
          <div className="cdc-quick-questions-grid">
            {quickQuestions.map((question, index) => (
              <button
                key={index}
                className="cdc-quick-question-btn"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </button>
            ))}
          </div>
        </div>

        <div className="cdc-input">
          <div className="cdc-input-container">
            <textarea
              className="cdc-message-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Décrivez votre problème automobile... L'IA vous aidera ⚡"
              disabled={isTyping}
            />
            <button
              className="cdc-button-primary"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
            >
              {isTyping ? '🧠' : '🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarDiagnosticChatBot;
