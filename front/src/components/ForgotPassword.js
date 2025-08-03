import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './ForgotPassword.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const navigate = useNavigate();
    
    // Créer une instance axios configurée
    const apiClient = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        timeout: 15000,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });

    // Validation de l'email
    const validateEmail = (email) => {
        if (!email.trim()) return "L'email est requis";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Format d'email invalide";
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const emailError = validateEmail(email);
        if (emailError) {
            setError(emailError);
            return;
        }
        
        setMessage('');
        setError('');
        setIsLoading(true);
        
        try {
            const response = await apiClient.post('/api/password-reset-request/', { email });
            setMessage(response.data.message);
            setIsSuccess(true);
            setEmail('');
            
            // Redirection après 3 secondes
            const redirectTimer = setTimeout(() => {
                navigate('/login');
            }, 3000);
            
            // Nettoyage du timer si le composant est démonté
            return () => clearTimeout(redirectTimer);
        } catch (err) {
            console.error('Erreur lors de la demande de réinitialisation:', err);
            const errorMessage = err.response?.data?.error || 
                              err.response?.data?.message || 
                              'Une erreur est survenue. Veuillez réessayer.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-password-container" role="main">
            <div className="forgot-password-form">
                <h2>🔑 Réinitialiser le mot de passe</h2>
                <p>Entrez votre adresse email pour recevoir un lien de réinitialisation.</p>
                
                {message && (
                    <div className={`alert ${isSuccess ? 'alert-success' : 'alert-info'}`} role="alert">
                        {isSuccess ? '✅ ' : 'ℹ️ '}{message}
                    </div>
                )}
                
                {error && (
                    <div className="alert alert-error" role="alert">
                        ⚠️ {error}
                    </div>
                )}
                
                {!isSuccess ? (
                    <form onSubmit={handleSubmit} aria-label="Formulaire de réinitialisation du mot de passe">
                        <div className="form-group">
                            <label htmlFor="email">📧 Adresse Email</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value.trim())}
                                required
                                placeholder="votre@email.com"
                                aria-required="true"
                                disabled={isLoading}
                                className={error ? 'input-error' : ''}
                            />
                            {error && <span className="error-message">{error}</span>}
                        </div>
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={isLoading}
                            aria-label="Envoyer le lien de réinitialisation"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span> Envoi en cours...
                                </>
                            ) : (
                                '📤 Envoyer le lien'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="success-message">
                        <p>📧 Vous allez recevoir un email avec les instructions de réinitialisation.</p>
                        <p>Redirection vers la page de connexion...</p>
                    </div>
                )}
                
                <div className="form-links">
                    <Link to="/login" aria-label="Retour à la connexion">
                        🔙 Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;