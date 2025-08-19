import React, { useState } from 'react';
import CarDiagnosticChatBot from './CarDiagnosticChatBot';
import './FloatingChatWidget.css';

const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="floating-chat-widget">
      {/* Bouton flottant */}
      <button
        className={`chat-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? "Fermer l'assistant diagnostic" : "Ouvrir l'assistant diagnostic"}
      >
        {isOpen ? (
          <i className="fas fa-times"></i>
        ) : (
          <>
            <i className="fas fa-stethoscope"></i>
            <span className="pulse-indicator"></span>
          </>
        )}
      </button>

      {/* Widget de chat */}
      {isOpen && (
        <div className="chat-widget-container">
          <div className="chat-widget-header">
            <h4>🚗 Assistant Diagnostic</h4>
            <button
              className="close-widget-btn"
              onClick={toggleChat}
              aria-label="Fermer le chat"
            >
              <i className="fas fa-minus"></i>
            </button>
          </div>
          <div className="chat-widget-content">
            <CarDiagnosticChatBot />
          </div>
        </div>
      )}

      {/* Tooltip d'aide */}
      {!isOpen && (
        <div className="chat-tooltip">
          <span>Besoin d'aide ? Diagnostic auto gratuit !</span>
        </div>
      )}
    </div>
  );
};

export default FloatingChatWidget;
