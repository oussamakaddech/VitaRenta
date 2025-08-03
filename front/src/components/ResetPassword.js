import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom'; // Changement ici
import axios from 'axios';
import './ResetPassword.css';

const ResetPassword = () => {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState('');
    const navigate = useNavigate();
    
    // Utiliser useSearchParams pour récupérer les paramètres de l'URL
    const [searchParams] = useSearchParams();
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    
    // Créer une instance axios configurée
    const apiClient = axios.create({
        baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
        timeout: 15000,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
    });

    // Vérifier la validité du token au chargement
    useEffect(() => {
        if (!uid || !token) {
            setError('Lien de réinitialisation invalide.');
        }
    }, [uid, token]);

    // Calculer la force du mot de passe
    useEffect(() => {
        if (!newPassword) {
            setPasswordStrength('');
            return;
        }
        
        let strength = 0;
        if (newPassword.length >= 8) strength += 1;
        if (newPassword.length >= 12) strength += 1;
        if (/[A-Z]/.test(newPassword)) strength += 1;
        if (/[a-z]/.test(newPassword)) strength += 1;
        if (/[0-9]/.test(newPassword)) strength += 1;
        if (/[^A-Za-z0-9]/.test(newPassword)) strength += 1;
        
        if (strength <= 2) setPasswordStrength('weak');
        else if (strength <= 4) setPasswordStrength('medium');
        else setPasswordStrength('strong');
    }, [newPassword]);

    // Validation du mot de passe
    const validatePassword = () => {
        if (!newPassword) return "Le mot de passe est requis";
        if (newPassword.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
        if (!/[A-Z]/.test(newPassword)) return "Le mot de passe doit contenir au moins une majuscule";
        if (!/[a-z]/.test(newPassword)) return "Le mot de passe doit contenir au moins une minuscule";
        if (!/[0-9]/.test(newPassword)) return "Le mot de passe doit contenir au moins un chiffre";
        if (newPassword !== confirmPassword) return "Les mots de passe ne correspondent pas";
        return '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation
        const passwordError = validatePassword();
        if (passwordError) {
            setError(passwordError);
            return;
        }
        
        setMessage('');
        setError('');
        setIsLoading(true);
        
        try {
            const response = await apiClient.post('/api/password-reset-confirm/', {
                uid: uid,
                token: token,
                new_password: newPassword,
                confirm_new_password: confirmPassword,
            });
            
            setMessage(response.data.message);
            setIsSuccess(true);
            setNewPassword('');
            setConfirmPassword('');
            
            // Redirection après 3 secondes
            const redirectTimer = setTimeout(() => {
                navigate('/login');
            }, 3000);
            
            // Nettoyage du timer si le composant est démonté
            return () => clearTimeout(redirectTimer);
        } catch (err) {
            console.error('Erreur lors de la réinitialisation:', err);
            const errorMessage = err.response?.data?.error || 
                              err.response?.data?.message ||
                              err.response?.data?.non_field_errors?.[0] ||
                              'Une erreur est survenue. Veuillez réessayer.';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="reset-password-container" role="main">
            <div className="reset-password-form">
                <h2>🔐 Nouveau mot de passe</h2>
                <p>Entrez votre nouveau mot de passe ci-dessous.</p>
                
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
                    <form onSubmit={handleSubmit} aria-label="Formulaire de nouveau mot de passe">
                        <div className="form-group">
                            <label htmlFor="new-password">🔑 Nouveau mot de passe</label>
                            <div className="password-input-container">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="Entrez votre nouveau mot de passe"
                                    aria-required="true"
                                    disabled={isLoading}
                                    className={error ? 'input-error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            
                            {newPassword && (
                                <div className="password-strength">
                                    <div className={`strength-bar ${passwordStrength}`}></div>
                                    <span className="strength-text">
                                        {passwordStrength === 'weak' && 'Faible'}
                                        {passwordStrength === 'medium' && 'Moyen'}
                                        {passwordStrength === 'strong' && 'Fort'}
                                    </span>
                                </div>
                            )}
                            
                            <div className="password-requirements">
                                <p>Le mot de passe doit contenir:</p>
                                <ul>
                                    <li className={newPassword.length >= 8 ? 'valid' : ''}>Au moins 8 caractères</li>
                                    <li className={/[A-Z]/.test(newPassword) ? 'valid' : ''}>Au moins une majuscule</li>
                                    <li className={/[a-z]/.test(newPassword) ? 'valid' : ''}>Au moins une minuscule</li>
                                    <li className={/[0-9]/.test(newPassword) ? 'valid' : ''}>Au moins un chiffre</li>
                                </ul>
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="confirm-password">🔐 Confirmer le mot de passe</label>
                            <div className="password-input-container">
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirm-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="Confirmez votre nouveau mot de passe"
                                    aria-required="true"
                                    disabled={isLoading}
                                    className={error ? 'input-error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    aria-label={showConfirmPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                                >
                                    {showConfirmPassword ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {confirmPassword && newPassword !== confirmPassword && (
                                <span className="error-message">Les mots de passe ne correspondent pas</span>
                            )}
                        </div>
                        
                        <button 
                            type="submit" 
                            className="btn btn-primary" 
                            disabled={isLoading}
                            aria-label="Réinitialiser le mot de passe"
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner"></span> Réinitialisation...
                                </>
                            ) : (
                                '🔒 Réinitialiser le mot de passe'
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="success-message">
                        <p>✅ Votre mot de passe a été réinitialisé avec succès!</p>
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

export default ResetPassword;