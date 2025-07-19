import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

const Login = ({ setToken }) => {
    // ===== ÉTATS PRINCIPAUX =====
    const [formData, setFormData] = useState({ email: '', mot_de_passe: '' });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState({});
    const [isVisible, setIsVisible] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [touchedFields, setTouchedFields] = useState({});
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimer, setBlockTimer] = useState(0);
    const [selectedDemo, setSelectedDemo] = useState(0);
    const [passwordStrength, setPasswordStrength] = useState(0);

    // ===== HOOKS =====
    const navigate = useNavigate();
    const location = useLocation();
    const blockTimerRef = useRef(null);
    const messageTimeoutRef = useRef(null);

    // ===== CONFIGURATION API =====
    const apiClient = useMemo(() => {
        return axios.create({
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }, []);

    // ===== COMPTES DÉMO =====
    const demoAccounts = useMemo(() => [
        { email: 'client@vitarenta.com', password: 'Demo1234', role: 'Client' },
        { email: 'agence@vitarenta.com', password: 'Demo1234', role: 'Agence' },
        { email: 'admin@vitarenta.com', password: 'Admin1234', role: 'Admin' }
    ], []);

    // ===== FONCTIONS UTILITAIRES =====
    const calculatePasswordStrength = useCallback((password) => {
        let strength = 0;
        if (password.length >= 8) strength += 25;
        if (/[a-z]/.test(password)) strength += 25;
        if (/[A-Z]/.test(password)) strength += 25;
        if (/[0-9]/.test(password)) strength += 25;
        return strength;
    }, []);

    const formatBlockTime = useCallback((seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, []);

    const showToast = useCallback((message, type = 'info') => {
        setMessage(message);
        if (messageTimeoutRef.current) {
            clearTimeout(messageTimeoutRef.current);
        }
        messageTimeoutRef.current = setTimeout(() => setMessage(''), 5000);
    }, []);

    // ===== VALIDATION =====
    const validateField = useCallback((name, value) => {
        switch (name) {
            case 'email':
                if (!value) return "L'email est requis";
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Format d'email invalide";
                if (value.length > 254) return "Email trop long";
                return '';
            case 'mot_de_passe':
                if (!value) return 'Le mot de passe est requis';
                if (value.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères';
                if (value.length > 128) return 'Mot de passe trop long';
                return '';
            default:
                return '';
        }
    }, []);

    const validateForm = useCallback(() => {
        const newErrors = {};

        const emailError = validateField('email', formData.email);
        const passwordError = validateField('mot_de_passe', formData.mot_de_passe);

        if (emailError) newErrors.email = emailError;
        if (passwordError) newErrors.mot_de_passe = passwordError;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData, validateField]);

    // ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouchedFields(prev => ({ ...prev, [name]: true }));

        const error = validateField(name, formData[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    }, [formData, validateField]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Calculer la force du mot de passe
        if (name === 'mot_de_passe') {
            setPasswordStrength(calculatePasswordStrength(value));
        }

        // Validation en temps réel si le champ a été touché
        if (touchedFields[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [touchedFields, validateField, calculatePasswordStrength]);

    const togglePasswordVisibility = useCallback(() => {
        setShowPassword(prev => !prev);
    }, []);

    const handleDemoLogin = useCallback(() => {
        if (isBlocked || loading || isSuccess) return;

        const demo = demoAccounts[selectedDemo];
        setFormData({ email: demo.email, mot_de_passe: demo.password });
        showToast(`🚀 Compte démo ${demo.role} sélectionné`);

        // Effacer les erreurs
        setErrors({});
        setTouchedFields({});
    }, [selectedDemo, demoAccounts, isBlocked, loading, isSuccess, showToast]);

    // ===== GESTION DE LA SOUMISSION =====
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (isBlocked) {
            showToast(`🔒 Trop de tentatives. Réessayez dans ${formatBlockTime(blockTimer)}`, 'error');
            return;
        }

        if (!validateForm()) return;

        setLoading(true);
        setMessage('');

        try {
            const loginData = {
                email: formData.email.toLowerCase().trim(),
                mot_de_passe: formData.mot_de_passe
            };

            const response = await apiClient.post('/api/login/', loginData);

            const token = response.data.access;
            const userData = response.data.user;

            // Stockage sécurisé
            localStorage.setItem('token', token);

            if (userData) {
                localStorage.setItem('userData', JSON.stringify(userData));
            }

            // Gestion du "Se souvenir de moi"
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            // Réinitialiser les tentatives
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastLoginAttempt');
            setLoginAttempts(0);

            setToken(token);
            setIsSuccess(true);

            showToast(`🎉 Bienvenue ${userData?.nom || userData?.prenom || 'pilote'} !`, 'success');

            // Redirection avec délai
            setTimeout(() => {
                const redirectTo = location.state?.from?.pathname || '/profile';
                navigate(redirectTo, { replace: true });
            }, 1500);

        } catch (error) {
            console.error('Login error:', error);

            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            localStorage.setItem('loginAttempts', newAttempts.toString());
            localStorage.setItem('lastLoginAttempt', Date.now().toString());

            // Gestion des erreurs spécifiques
            if (error.response?.status === 401) {
                showToast(`🚫 Email ou mot de passe incorrect (${newAttempts}/5 tentatives)`, 'error');
                if (newAttempts >= 5) {
                    setIsBlocked(true);
                    setBlockTimer(5 * 60); // 5 minutes
                    showToast('🔒 Trop de tentatives. Compte bloqué pendant 5 minutes.', 'error');
                }
            } else if (error.response?.status === 429) {
                showToast('⏰ Trop de tentatives. Veuillez réessayer plus tard', 'error');
            } else if (error.response?.status === 403) {
                showToast('🚫 Compte désactivé. Contactez le support.', 'error');
            } else if (error.code === 'ECONNABORTED') {
                showToast('⏰ Timeout - Le serveur met trop de temps à répondre', 'error');
            } else if (error.response?.status >= 500) {
                showToast('🔧 Erreur serveur. Veuillez réessayer plus tard.', 'error');
            } else if (!navigator.onLine) {
                showToast('📡 Pas de connexion internet', 'error');
            } else {
                showToast(error.response?.data?.error || '❌ Erreur lors de la connexion', 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [
        formData, validateForm, rememberMe, isBlocked, blockTimer, loginAttempts,
        apiClient, setToken, navigate, location.state, showToast, formatBlockTime
    ]);

    // ===== EFFETS =====
    useEffect(() => {
        // Message depuis la navigation
        if (location.state?.message) {
            showToast(location.state.message);
            if (location.state.email) {
                setFormData(prev => ({ ...prev, email: location.state.email }));
            }
        }
    }, [location.state, showToast]);

    useEffect(() => {
        // Animation d'apparition
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Gestion des tentatives de connexion
        const savedAttempts = parseInt(localStorage.getItem('loginAttempts') || '0');
        const lastAttemptTime = parseInt(localStorage.getItem('lastLoginAttempt') || '0');
        const now = Date.now();
        const lockoutDuration = 5 * 60 * 1000; // 5 minutes

        if (now - lastAttemptTime > lockoutDuration) {
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastLoginAttempt');
            setLoginAttempts(0);
        } else {
            setLoginAttempts(savedAttempts);
            if (savedAttempts >= 5) {
                setIsBlocked(true);
                const remainingTime = Math.ceil((lockoutDuration - (now - lastAttemptTime)) / 1000);
                setBlockTimer(remainingTime);

                blockTimerRef.current = setInterval(() => {
                    setBlockTimer(prev => {
                        if (prev <= 1) {
                            setIsBlocked(false);
                            setLoginAttempts(0);
                            localStorage.removeItem('loginAttempts');
                            localStorage.removeItem('lastLoginAttempt');
                            clearInterval(blockTimerRef.current);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            }
        }

        return () => {
            if (blockTimerRef.current) {
                clearInterval(blockTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Email mémorisé
        const savedEmail = localStorage.getItem('rememberedEmail');
        if (savedEmail) {
            setFormData(prev => ({ ...prev, email: savedEmail }));
            setRememberMe(true);
        }
    }, []);

    useEffect(() => {
        // Nettoyage des timeouts
        return () => {
            if (messageTimeoutRef.current) {
                clearTimeout(messageTimeoutRef.current);
            }
            if (blockTimerRef.current) {
                clearInterval(blockTimerRef.current);
            }
        };
    }, []);

    // ===== VALEURS CALCULÉES =====
    const canSubmit = useMemo(() => {
        return !loading && !isSuccess && !isBlocked &&
            formData.email && formData.mot_de_passe &&
            !errors.email && !errors.mot_de_passe;
    }, [loading, isSuccess, isBlocked, formData, errors]);

    const getPasswordStrengthClass = useMemo(() => {
        if (passwordStrength <= 25) return 'strength-weak';
        if (passwordStrength <= 50) return 'strength-medium';
        if (passwordStrength <= 75) return 'strength-strong';
        return 'strength-very-strong';
    }, [passwordStrength]);

    const attemptDots = useMemo(() => {
        return Array.from({ length: 5 }, (_, i) => ({
            id: i,
            used: i < loginAttempts
        }));
    }, [loginAttempts]);

    // ===== RENDU =====
    return (
        <div className={`login-container-desktop ${isVisible ? 'visible' : ''}`}>
            {/* Arrière-plan animé */}
            <div className="login-background-desktop">
                <div className="floating-cars-desktop">
                    {['🚗', '🚙', '🚕', '🏎️', '🚐', '🚓', '🚌', '🚑', '🏁', '⚡'].map((car, i) => (
                        <div
                            key={i}
                            className="floating-car-desktop"
                            style={{
                                left: `${5 + i * 9}%`,
                                animationDelay: `${i * 1.5}s`,
                                fontSize: `${2 + Math.random() * 0.5}rem`
                            }}
                            aria-hidden="true"
                        >
                            {car}
                        </div>
                    ))}
                </div>
                <div className="background-shapes-desktop">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className={`background-shape-desktop shape-${i + 1}`} aria-hidden="true"></div>
                    ))}
                </div>
            </div>

            <div className="desktop-layout">
                {/* Sidebar gauche */}
                <div className="login-sidebar">
                    <div className="sidebar-content">
                        <div className="sidebar-header">
                            <div className="sidebar-logo">
                                <span className="logo-icon" role="img" aria-label="Logo VitaRenta">🚗</span>
                                <h1 className="logo-text">VitaRenta</h1>
                                <p className="logo-tagline">Location Premium</p>
                            </div>
                        </div>

                        <div className="sidebar-features">
                            <h3 className="features-title">Pourquoi choisir VitaRenta ?</h3>
                            <div className="feature-list">
                                <div className="feature-item">
                                    <span className="feature-icon" role="img" aria-label="Véhicules">🚗</span>
                                    <div className="feature-content">
                                        <h4>500+ Véhicules</h4>
                                        <p>Large gamme de véhicules premium</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon" role="img" aria-label="Rapidité">⚡</span>
                                    <div className="feature-content">
                                        <h4>Réservation Rapide</h4>
                                        <p>Réservez en moins de 2 minutes</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon" role="img" aria-label="Assurance">🛡️</span>
                                    <div className="feature-content">
                                        <h4>Assurance Incluse</h4>
                                        <p>Protection complète garantie</p>
                                    </div>
                                </div>
                                <div className="feature-item">
                                    <span className="feature-icon" role="img" aria-label="Service">🌟</span>
                                    <div className="feature-content">
                                        <h4>Service 24/7</h4>
                                        <p>Support client disponible</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="sidebar-stats">
                            <div className="stat-item-sidebar">
                                <span className="stat-number-sidebar">10k+</span>
                                <span className="stat-label-sidebar">Clients Satisfaits</span>
                            </div>
                            <div className="stat-item-sidebar">
                                <span className="stat-number-sidebar">4.9/5</span>
                                <span className="stat-label-sidebar">Note Moyenne</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Zone principale de connexion */}
                <div className="login-main-area">
                    <div className={`login-card-desktop ${isSuccess ? 'success-animation' : ''}`}>
                        {/* Overlay de blocage */}
                        {isBlocked && (
                            <div className="blocked-overlay">
                                <div className="blocked-message">
                                    <h3>🔒 Accès Temporairement Bloqué</h3>
                                    <div className="blocked-timer">{formatBlockTime(blockTimer)}</div>
                                    <p>Trop de tentatives de connexion. Veuillez patienter.</p>
                                </div>
                            </div>
                        )}

                        {/* En-tête */}
                        <div className="login-header-desktop">
                            <div className="login-icon-desktop">
                                <div className="icon-glow-desktop"></div>
                                <span className="car-emoji-desktop" role="img" aria-label="Voiture">🏎️</span>
                                <div className="speed-lines-desktop">
                                    <div className="speed-line-desktop"></div>
                                    <div className="speed-line-desktop"></div>
                                    <div className="speed-line-desktop"></div>
                                </div>
                            </div>
                            <h2 className="login-title-desktop">
                                {isSuccess ? '🎉 Connexion Réussie!' : isBlocked ? '🔒 Accès Temporairement Bloqué' : 'Bon Retour!'}
                            </h2>
                            <p className="login-subtitle-desktop">
                                {isSuccess
                                    ? 'Redirection vers votre garage...'
                                    : isBlocked
                                        ? `Réessayez dans ${formatBlockTime(blockTimer)}`
                                        : 'Connectez-vous à votre compte VitaRenta'
                                }
                            </p>
                        </div>

                        {/* Message d'alerte */}
                        {message && (
                            <div className={`alert-desktop ${
                                isSuccess || message.includes('🎉') || message.includes('Bienvenue')
                                    ? 'alert-success-desktop'
                                    : 'alert-error-desktop'
                            }`} role="alert">
                                <svg className="alert-icon-desktop" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d={isSuccess || message.includes('🎉')
                                              ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                              : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                          }
                                    />
                                </svg>
                                {message}
                            </div>
                        )}

                        {/* Indicateur de tentatives */}
                        {loginAttempts > 0 && (
                            <div className="login-attempts-indicator">
                                <p>Tentatives de connexion: {loginAttempts}/5</p>
                                <div className="attempts-dots">
                                    {attemptDots.map(dot => (
                                        <div
                                            key={dot.id}
                                            className={`attempt-dot ${dot.used ? 'used' : ''}`}
                                            aria-label={`Tentative ${dot.id + 1} ${dot.used ? 'utilisée' : 'disponible'}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Formulaire */}
                        <form onSubmit={handleSubmit} className="login-form-desktop" noValidate>
                            {/* Champ Email */}
                            <div className="form-group-desktop">
                                <label className="form-label-desktop" htmlFor="email">
                                    📧 Adresse Email
                                </label>
                                <div className="input-container-desktop">
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        placeholder="votre@email.com"
                                        autoComplete="email"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={`form-input-desktop ${errors.email && touchedFields.email ? 'input-error-desktop' : ''}`}
                                        required
                                        disabled={loading || isSuccess || isBlocked}
                                        aria-describedby={errors.email && touchedFields.email ? "email-error" : undefined}
                                        aria-invalid={errors.email && touchedFields.email ? "true" : "false"}
                                    />
                                    <span className="input-icon-desktop" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                        </svg>
                                    </span>
                                    <div className="input-glow-desktop"></div>
                                </div>
                                {errors.email && touchedFields.email && (
                                    <span id="email-error" className="error-message-desktop" role="alert">
                                        ⚠️ {errors.email}
                                    </span>
                                )}
                            </div>

                            {/* Champ Mot de passe */}
                            <div className="form-group-desktop">
                                <label className="form-label-desktop" htmlFor="mot_de_passe">
                                    🔐 Mot de Passe
                                </label>
                                <div className="input-container-desktop">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="mot_de_passe"
                                        name="mot_de_passe"
                                        value={formData.mot_de_passe}
                                        placeholder="Votre mot de passe"
                                        autoComplete="current-password"
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={`form-input-desktop ${errors.mot_de_passe && touchedFields.mot_de_passe ? 'input-error-desktop' : ''}`}
                                        required
                                        disabled={loading || isSuccess || isBlocked}
                                        aria-describedby={errors.mot_de_passe && touchedFields.mot_de_passe ? "password-error" : undefined}
                                        aria-invalid={errors.mot_de_passe && touchedFields.mot_de_passe ? "true" : "false"}
                                    />
                                    <span className="input-icon-desktop" aria-hidden="true">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                        </svg>
                                    </span>
                                    <button
                                        type="button"
                                        className="password-toggle-desktop"
                                        onClick={togglePasswordVisibility}
                                        disabled={loading || isSuccess || isBlocked}
                                        aria-label={showPassword ? "Cacher le mot de passe" : "Afficher le mot de passe"}
                                    >
                                        {showPassword ? '👁️' : '🙈'}
                                    </button>
                                    <div className="input-glow-desktop"></div>
                                </div>

                                {/* Indicateur de force du mot de passe */}
                                {formData.mot_de_passe && (
                                    <div className="password-strength-indicator">
                                        <div className={`password-strength-bar ${getPasswordStrengthClass}`}></div>
                                    </div>
                                )}

                                {errors.mot_de_passe && touchedFields.mot_de_passe && (
                                    <span id="password-error" className="error-message-desktop" role="alert">
                                        ⚠️ {errors.mot_de_passe}
                                    </span>
                                )}
                            </div>

                            {/* Options du formulaire */}
                            <div className="form-options-desktop">
                                <label className="checkbox-container-desktop">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        disabled={loading || isSuccess || isBlocked}
                                        aria-describedby="remember-me-desc"
                                    />
                                    <span className="checkmark-desktop" aria-hidden="true">✓</span>
                                    <span className="checkbox-text-desktop" id="remember-me-desc">
                                        💾 Se souvenir de moi
                                    </span>
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="forgot-password-desktop"
                                    aria-label="Récupérer votre mot de passe oublié"
                                >
                                    🤔 Mot de passe oublié ?
                                </Link>
                            </div>

                            {/* Bouton de soumission */}
                            <button
                                type="submit"
                                className={`login-button-desktop ${isSuccess ? 'success-button-desktop' : ''} ${!canSubmit ? 'disabled' : ''}`}
                                disabled={!canSubmit}
                                aria-label="Se connecter à votre compte"
                            >
                                {loading ? (
                                    <>
                                        <div className="spinner-desktop" aria-hidden="true">🌀</div>
                                        🚗 Connexion en cours...
                                    </>
                                ) : isSuccess ? (
                                    <>
                                        <span className="success-icon-desktop" aria-hidden="true">🎉</span>
                                        ✅ Connexion réussie!
                                    </>
                                ) : isBlocked ? (
                                    <>
                                        🔒 Bloqué ({formatBlockTime(blockTimer)})
                                    </>
                                ) : (
                                    <>
                                        <svg className="button-icon-desktop" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        🚗 Accéder à Mon Garage
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Pied de page */}
                        <div className="login-footer-desktop">
                            <p>
                                🏁 Nouveau conducteur ?{' '}
                                <Link
                                    to="/signup"
                                    className="signup-link-desktop"
                                    aria-label="Créer un nouveau compte"
                                >
                                    ✨ Inscrivez-vous gratuitement
                                </Link>
                            </p>
                        </div>

                        {/* Section démo */}
                        <div className="demo-section-desktop">
                            <p className="demo-title-desktop">🚀 Test Drive Rapide</p>
                            <div className="demo-selector">
                                <select
                                    value={selectedDemo}
                                    onChange={(e) => setSelectedDemo(parseInt(e.target.value))}
                                    className="demo-select"
                                    disabled={loading || isSuccess || isBlocked}
                                    aria-label="Sélectionner un compte de démonstration"
                                >
                                    {demoAccounts.map((account, index) => (
                                        <option key={index} value={index}>
                                            {account.role} - {account.email}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="demo-button-desktop"
                                    onClick={handleDemoLogin}
                                    disabled={loading || isSuccess || isBlocked}
                                    aria-label="Utiliser le compte de démonstration sélectionné"
                                >
                                    🏎️ Utiliser ce Compte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
