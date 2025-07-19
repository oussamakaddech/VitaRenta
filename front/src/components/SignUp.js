import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SignUp.css';

const SignUp = ({ setToken, setUser }) => {
    const [formData, setFormData] = useState({
        email: '',
        nom: '',
        mot_de_passe: '',
        confirmer_mot_de_passe: '',
        preference_carburant: '',
        budget_journalier: '',
        telephone: '',
        role: 'client',
    });
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSuccess, setIsSuccess] = useState(false);
    const [currentStep, setCurrentStep] = useState(1);
    const [touchedFields, setTouchedFields] = useState({});
    const navigate = useNavigate();

    const apiClient = useMemo(() => {
        const client = axios.create({
            baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
            timeout: 15000,
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
        });
        return client;
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => document.querySelector('.signup-container-desktop')?.classList.add('visible'), 100);
        return () => clearTimeout(timer);
    }, []);

    const validateField = useCallback((name, value) => {
        const newErrors = { ...errors };
        const safeValue = typeof value === 'string' ? value : String(value ?? '');

        switch (name) {
            case 'email':
                if (!safeValue.trim()) newErrors.email = "L'email est requis";
                else if (!/\S+@\S+\.\S+/.test(safeValue)) newErrors.email = "Format d'email invalide";
                else delete newErrors.email;
                break;
            case 'nom':
                if (!safeValue.trim()) newErrors.nom = 'Le nom est requis';
                else if (safeValue.trim().length < 2) newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
                else delete newErrors.nom;
                break;
            case 'mot_de_passe':
                if (!safeValue.trim()) newErrors.mot_de_passe = 'Le mot de passe est requis';
                else if (safeValue.length < 8) newErrors.mot_de_passe = 'Le mot de passe doit contenir au moins 8 caractères';
                else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(safeValue)) newErrors.mot_de_passe = 'Mot de passe faible : ajoutez une majuscule, une minuscule et un chiffre';
                else delete newErrors.mot_de_passe;
                break;
            case 'confirmer_mot_de_passe':
                if (!safeValue.trim()) newErrors.confirmer_mot_de_passe = 'La confirmation est requise';
                else if (safeValue !== formData.mot_de_passe) newErrors.confirmer_mot_de_passe = 'Les mots de passe ne correspondent pas';
                else delete newErrors.confirmer_mot_de_passe;
                break;
            case 'telephone':
                if (safeValue && !/^\+?\d{10,15}$/.test(safeValue.replace(/[\s\-\.]/g, ''))) {
                    newErrors.telephone = 'Format de téléphone invalide (10-15 chiffres)';
                } else {
                    delete newErrors.telephone;
                }
                break;
            case 'preference_carburant':
                if (!safeValue.trim()) newErrors.preference_carburant = 'La préférence est requise';
                else if (!['électrique', 'hybride', 'essence', 'diesel'].includes(safeValue)) newErrors.preference_carburant = 'Préférence invalide';
                else delete newErrors.preference_carburant;
                break;
            case 'budget_journalier':
                if (!safeValue.trim()) {
                    newErrors.budget_journalier = 'Le budget est requis';
                } else {
                    const budget = parseFloat(safeValue);
                    if (isNaN(budget)) newErrors.budget_journalier = 'Le budget doit être un nombre';
                    else if (budget < 20) newErrors.budget_journalier = 'Budget minimum : 20€';
                    else if (budget > 10000) newErrors.budget_journalier = 'Budget maximum : 10 000€';
                    else delete newErrors.budget_journalier;
                }
                break;
            case 'role':
                if (!['client', 'agence'].includes(safeValue)) newErrors.role = 'Rôle invalide';
                else delete newErrors.role;
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [errors, formData.mot_de_passe]);

    const handleBlur = useCallback((e) => {
        const { name } = e.target;
        setTouchedFields(prev => ({ ...prev, [name]: true }));
        validateField(name, formData[name]);
    }, [formData, validateField]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        const safeValue = typeof value === 'string' ? value.trim() : String(value ?? '');
        setFormData(prev => ({ ...prev, [name]: safeValue }));
        if (touchedFields[name]) validateField(name, safeValue);
    }, [touchedFields, validateField]);

    const validateForm = useCallback(() => {
        const requiredFields = ['email', 'nom', 'mot_de_passe', 'confirmer_mot_de_passe', 'role', 'preference_carburant', 'budget_journalier'];
        let isValid = true;
        requiredFields.forEach(field => {
            if (!validateField(field, formData[field])) isValid = false;
        });
        if (formData.telephone && !validateField('telephone', formData.telephone)) isValid = false;
        setTouchedFields(prev => ({ ...prev, ...requiredFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}) }));
        return isValid;
    }, [formData, validateField]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setMessage('Veuillez corriger les erreurs dans le formulaire');
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            const submitData = {
                email: formData.email.toLowerCase().trim(),
                nom: formData.nom.trim(),
                mot_de_passe: formData.mot_de_passe.trim(),
                confirmer_mot_de_passe: formData.confirmer_mot_de_passe.trim(),
                preference_carburant: formData.preference_carburant,
                budget_journalier: parseFloat(formData.budget_journalier),
                telephone: formData.telephone.trim() || null,
                role: formData.role
            };

            const response = await apiClient.post('/api/inscription/', submitData);
            const { access, refresh, user } = response.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('userData', JSON.stringify(user));

            setToken(access);
            setUser(user);
            setIsSuccess(true);
            setMessage('Inscription réussie ! Redirection...');

            setTimeout(() => navigate('/profile', { replace: true }), 2500);
        } catch (error) {
            console.error('Signup error details:', {
                message: error.message,
                code: error.code,
                response: error.response ? {
                    status: error.response.status,
                    data: error.response.data
                } : null
            });
            if (error.response?.status === 400) {
                const serverErrors = error.response.data.errors || {};
                setErrors(prev => ({ ...prev, ...serverErrors }));
                setMessage(Object.values(serverErrors).flat().join('; ') || 'Veuillez corriger les erreurs');
            } else if (error.response?.status === 409) {
                setErrors(prev => ({ ...prev, email: 'Email déjà utilisé' }));
                setMessage('Email déjà utilisé');
            } else if (error.code === 'ECONNABORTED') {
                setMessage('Timeout - Le serveur met trop de temps à répondre');
            } else if (error.response?.status >= 500) {
                setMessage('Erreur serveur - Veuillez réessayer');
            } else {
                setMessage(error.response?.data?.error || 'Erreur lors de l\'inscription');
            }
        } finally {
            setLoading(false);
        }
    }, [formData, validateForm, apiClient, setToken, setUser, navigate]);

    const canProceedToNextStep = useCallback(() => {
        switch (currentStep) {
            case 1:
                return formData.email && formData.nom && formData.mot_de_passe && formData.confirmer_mot_de_passe && formData.role &&
                    !errors.email && !errors.nom && !errors.mot_de_passe && !errors.confirmer_mot_de_passe && !errors.role;
            case 2:
                return formData.preference_carburant && !errors.preference_carburant &&
                    (!formData.telephone || !errors.telephone);
            case 3:
                return formData.budget_journalier && !errors.budget_journalier;
            default: return false;
        }
    }, [currentStep, formData, errors]);

    const nextStep = useCallback(() => {
        if (currentStep < 3 && canProceedToNextStep()) setCurrentStep(currentStep + 1);
    }, [currentStep, canProceedToNextStep]);

    const prevStep = useCallback(() => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    }, [currentStep]);

    const handleRoleSelect = useCallback((role) => {
        const safeRole = String(role ?? 'client');
        setFormData(prev => ({ ...prev, role: safeRole }));
        setTouchedFields(prev => ({ ...prev, role: true }));
        setErrors(prev => ({ ...prev, role: '' }));
        validateField('role', safeRole);
    }, [validateField]);

    const handleFuelSelect = useCallback((fuel) => {
        const safeFuel = String(fuel ?? '');
        setFormData(prev => ({ ...prev, preference_carburant: safeFuel }));
        setTouchedFields(prev => ({ ...prev, preference_carburant: true }));
        setErrors(prev => ({ ...prev, preference_carburant: '' }));
        validateField('preference_carburant', safeFuel);
    }, [validateField]);

    const togglePasswordVisibility = useCallback(() => setShowPassword(prev => !prev), []);
    const toggleConfirmPasswordVisibility = useCallback(() => setShowConfirmPassword(prev => !prev), []);

    const getFuelIcon = useCallback((fuel) => ({
        électrique: '⚡', hybride: '🌱', essence: '⛽', diesel: '🚗'
    }[fuel] || '🚗'), []);

    const getFuelColor = useCallback((fuel) => ({
        électrique: '#3b82f6', hybride: '#10b981', essence: '#ef4444', diesel: '#6b7280'
    }[fuel] || '#3b82f6'), []);

    const carParticles = useMemo(() => [...Array(10)].map((_, i) => ({
        car: ['🚗', '🚙', '🚕', '🏎️', '🚐', '🚓', '🚌', '🚑', '🏁', '⚡'][i % 10],
        style: { top: `${10 + i * 9}%`, animationDelay: `${i * 1.2}s`, fontSize: `${1.5 + Math.random() * 0.8}rem`, animationDuration: `${12 + Math.random() * 8}s` }
    })), []);

    return (
        <div className="signup-container-desktop">
            <div className="signup-background-desktop">
                <div className="floating-cars-desktop">
                    {carParticles.map((particle, i) => (
                        <div key={i} className="floating-car-desktop" style={particle.style}>
                            {particle.car}
                        </div>
                    ))}
                </div>
                <div className="background-shapes-desktop">
                    <div className="background-shape-desktop shape-1"></div>
                    <div className="background-shape-desktop shape-2"></div>
                    <div className="background-shape-desktop shape-3"></div>
                    <div className="background-shape-desktop shape-4"></div>
                    <div className="background-shape-desktop shape-5"></div>
                    <div className="background-shape-desktop shape-6"></div>
                </div>
            </div>

            <div className="desktop-layout">
                <div className="signup-sidebar">
                    <div className="signup-sidebar-content">
                        <div className="signup-sidebar-header">
                            <div className="signup-sidebar-logo">
                                <span className="signup-logo-icon">🏎️</span>
                                <h1 className="signup-logo-text">VitaRenta</h1>
                                <p className="signup-logo-tagline">Louez votre aventure</p>
                            </div>
                        </div>
                        <div className="signup-sidebar-features">
                            <h2 className="signup-features-title">Pourquoi choisir VitaRenta ?</h2>
                            <div className="signup-feature-list">
                                <div className="signup-feature-item">
                                    <span className="signup-feature-icon">🚗</span>
                                    <div className="signup-feature-content">
                                        <h4>Vaste choix</h4>
                                        <p>Plus de 500 véhicules disponibles</p>
                                    </div>
                                </div>
                                <div className="signup-feature-item">
                                    <span className="signup-feature-icon">⚡</span>
                                    <div className="signup-feature-content">
                                        <h4>Réservation rapide</h4>
                                        <p>Processus simple et intuitif</p>
                                    </div>
                                </div>
                                <div className="signup-feature-item">
                                    <span className="signup-feature-icon">🛡️</span>
                                    <div className="signup-feature-content">
                                        <h4>Assurance incluse</h4>
                                        <p>Protection complète pour votre voyage</p>
                                    </div>
                                </div>
                                <div className="signup-feature-item">
                                    <span className="signup-feature-icon">🌟</span>
                                    <div className="signup-feature-content">
                                        <h4>Support 24/7</h4>
                                        <p>Assistance à tout moment</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="signup-sidebar-stats">
                            <div className="signup-stat-item">
                                <span className="signup-stat-number">500+</span>
                                <span className="signup-stat-label">Véhicules</span>
                            </div>
                            <div className="signup-stat-item">
                                <span className="signup-stat-number">100K+</span>
                                <span className="signup-stat-label">Clients satisfaits</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="signup-main-area">
                    <div className={`signup-card-desktop ${isSuccess ? 'signup-success-animation' : ''}`}>
                        <div className="signup-header-desktop">
                            <div className="signup-icon-desktop">
                                <div className="signup-icon-glow-desktop"></div>
                                <span className="signup-car-emoji-desktop">🏁</span>
                                <div className="signup-speed-lines-desktop">
                                    <div className="signup-speed-line-desktop"></div>
                                    <div className="signup-speed-line-desktop"></div>
                                    <div className="signup-speed-line-desktop"></div>
                                </div>
                            </div>
                            <h2 className="signup-title-desktop">
                                {isSuccess ? "🎉 Bienvenue dans l'équipe!" : '🚗 Rejoindre VitaRenta'}
                            </h2>
                            <p className="signup-subtitle-desktop">
                                {isSuccess
                                    ? 'Votre compte a été créé avec succès!'
                                    : "Créez votre compte et commencez l'aventure"}
                            </p>
                        </div>

                        <div className="signup-progress-indicator">
                            <div className="signup-progress-bar">
                                <div
                                    className="signup-progress-fill"
                                    style={{ width: `${(currentStep / 3) * 100}%` }}
                                ></div>
                            </div>
                            <div className="signup-progress-steps">
                                <div className={`signup-step ${currentStep >= 1 ? 'active' : ''}`}>1</div>
                                <div className={`signup-step ${currentStep >= 2 ? 'active' : ''}`}>2</div>
                                <div className={`signup-step ${currentStep >= 3 ? 'active' : ''}`}>3</div>
                            </div>
                        </div>

                        {message && (
                            <div className={`signup-alert-desktop ${isSuccess ? 'signup-alert-success-desktop' : 'signup-alert-error-desktop'}`}>
                                <div className="signup-alert-icon-desktop">{isSuccess ? '✅' : '⚠️'}</div>
                                <div>{message}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="signup-form-desktop">
                            {currentStep === 1 && (
                                <div className="signup-form-step">
                                    <h3 className="signup-step-title">📝 Informations Personnelles</h3>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">📧 Email</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                placeholder="votre@email-racing.com"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.email && touchedFields.email ? 'input-error-desktop' : ''}`}
                                                required
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">📧</span>
                                        </div>
                                        {errors.email && touchedFields.email && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.email}</span>
                                        )}
                                    </div>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">👤 Nom Complet</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type="text"
                                                name="nom"
                                                value={formData.nom}
                                                placeholder="Votre nom de pilote"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.nom && touchedFields.nom ? 'input-error-desktop' : ''}`}
                                                required
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">👤</span>
                                        </div>
                                        {errors.nom && touchedFields.nom && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.nom}</span>
                                        )}
                                    </div>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">🔐 Mot de Passe Sécurisé</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                name="mot_de_passe"
                                                value={formData.mot_de_passe}
                                                placeholder="Votre code secret"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.mot_de_passe && touchedFields.mot_de_passe ? 'input-error-desktop' : ''}`}
                                                required
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">🔐</span>
                                            <button
                                                type="button"
                                                className="signup-password-toggle-desktop"
                                                onClick={togglePasswordVisibility}
                                                disabled={loading || isSuccess}
                                            >
                                                {showPassword ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                        {errors.mot_de_passe && touchedFields.mot_de_passe && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.mot_de_passe}</span>
                                        )}
                                        {formData.mot_de_passe && (
                                            <div className="signup-password-strength-indicator">
                                                <div className={`signup-password-strength-bar strength-${
    formData.mot_de_passe.length < 8 ? 'weak' :
        formData.mot_de_passe.length < 10 ? 'medium' :
            formData.mot_de_passe.length < 12 ? 'strong' : 'very-strong'
}`}></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">🔐 Confirmer le Mot de Passe</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmer_mot_de_passe"
                                                value={formData.confirmer_mot_de_passe}
                                                placeholder="Confirmez votre mot de passe"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.confirmer_mot_de_passe && touchedFields.confirmer_mot_de_passe ? 'input-error-desktop' : ''}`}
                                                required
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">🔐</span>
                                            <button
                                                type="button"
                                                className="signup-password-toggle-desktop"
                                                onClick={toggleConfirmPasswordVisibility}
                                                disabled={loading || isSuccess}
                                            >
                                                {showConfirmPassword ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                        {errors.confirmer_mot_de_passe && touchedFields.confirmer_mot_de_passe && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.confirmer_mot_de_passe}</span>
                                        )}
                                    </div>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">🎭 Je m'inscris en tant que :</label>
                                        <div className="signup-role-selection">
                                            <button
                                                type="button"
                                                className={`signup-role-btn ${formData.role === 'client' ? 'selected' : ''}`}
                                                onClick={() => handleRoleSelect('client')}
                                                disabled={loading || isSuccess}
                                            >
                                                👤 Client
                                            </button>
                                            <button
                                                type="button"
                                                className={`signup-role-btn ${formData.role === 'agence' ? 'selected' : ''}`}
                                                onClick={() => handleRoleSelect('agence')}
                                                disabled={loading || isSuccess}
                                            >
                                                🏢 Agence de location
                                            </button>
                                        </div>
                                        {errors.role && touchedFields.role && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.role}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="signup-form-step">
                                    <h3 className="signup-step-title">⚡ Préférence de Carburant</h3>

                                    <div className="signup-fuel-selection">
                                        {['électrique', 'hybride', 'essence', 'diesel'].map((fuel) => (
                                            <div
                                                key={fuel}
                                                className={`signup-fuel-option ${
    formData.preference_carburant === fuel ? 'selected' : ''
}`}
                                                onClick={() => handleFuelSelect(fuel)}
                                                style={{ '--fuel-color': getFuelColor(fuel) }}
                                            >
                                                <div className="signup-fuel-icon">{getFuelIcon(fuel)}</div>
                                                <div className="signup-fuel-name">
                                                    {fuel.charAt(0).toUpperCase() + fuel.slice(1)}
                                                </div>
                                                <div className="signup-fuel-glow"></div>
                                            </div>
                                        ))}
                                    </div>
                                    {errors.preference_carburant && touchedFields.preference_carburant && (
                                        <span className="signup-error-message-desktop">⚠️ {errors.preference_carburant}</span>
                                    )}

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">📱 Numéro de téléphone (optionnel)</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type="tel"
                                                name="telephone"
                                                value={formData.telephone}
                                                placeholder="Ex : +216 12345678 ou 012345678"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.telephone && touchedFields.telephone ? 'input-error-desktop' : ''}`}
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">📱</span>
                                        </div>
                                        {errors.telephone && touchedFields.telephone && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.telephone}</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="signup-form-step">
                                    <h3 className="signup-step-title">💰 Budget Journalier</h3>

                                    <div className="signup-form-group-desktop">
                                        <label className="signup-form-label-desktop">💳 Budget par Jour (€)</label>
                                        <div className="signup-input-container-desktop">
                                            <input
                                                type="number"
                                                name="budget_journalier"
                                                value={formData.budget_journalier}
                                                placeholder="Ex: 50"
                                                min="20"
                                                max="10000"
                                                step="0.01"
                                                onChange={handleChange}
                                                onBlur={handleBlur}
                                                className={`signup-form-input-desktop ${errors.budget_journalier && touchedFields.budget_journalier ? 'input-error-desktop' : ''}`}
                                                required
                                                disabled={loading || isSuccess}
                                            />
                                            <div className="signup-input-glow-desktop"></div>
                                            <span className="signup-input-icon-desktop">💰</span>
                                            <span className="signup-input-suffix">€/jour</span>
                                        </div>
                                        {errors.budget_journalier && touchedFields.budget_journalier && (
                                            <span className="signup-error-message-desktop">⚠️ {errors.budget_journalier}</span>
                                        )}

                                        <div className="signup-budget-suggestions">
                                            <p className="signup-suggestions-title">💡 Suggestions populaires:</p>
                                            <div className="signup-suggestion-buttons">
                                                {[30, 50, 80, 120].map((amount) => (
                                                    <button
                                                        key={amount}
                                                        type="button"
                                                        className="signup-suggestion-btn"
                                                        onClick={() =>
                                                            setFormData(prev => ({ ...prev, budget_journalier: String(amount) }))
                                                        }
                                                        disabled={loading || isSuccess}
                                                    >
                                                        {amount}€
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="signup-form-navigation">
                                {currentStep > 1 && (
                                    <button
                                        type="button"
                                        className="signup-nav-button prev"
                                        onClick={prevStep}
                                        disabled={loading || isSuccess}
                                    >
                                        <span>←</span> Précédent
                                    </button>
                                )}

                                {currentStep < 3 ? (
                                    <button
                                        type="button"
                                        className={`signup-nav-button next ${!canProceedToNextStep() ? 'disabled' : ''}`}
                                        onClick={nextStep}
                                        disabled={loading || isSuccess || !canProceedToNextStep()}
                                    >
                                        Suivant <span>→</span>
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className={`signup-button-desktop ${isSuccess ? 'signup-success-button-desktop' : ''} ${!canProceedToNextStep() ? 'disabled' : ''}`}
                                        disabled={loading || isSuccess || !canProceedToNextStep()}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="signup-spinner-desktop">🌀</div>🚗 Création du compte...
                                            </>
                                        ) : isSuccess ? (
                                            <>
                                                <span className="signup-success-icon-desktop">🎉</span>🏁 Compte créé!
                                            </>
                                        ) : (
                                            <>
                                                <span className="signup-button-icon-desktop">🏎️</span>🚀 REJOINDRE L'ÉQUIPE!
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>

                        <div className="signup-footer-desktop">
                            <p>
                                🏁 Déjà pilote chez nous ?{' '}
                                <Link to="/login" className="signup-login-link-desktop">
                                    ✨ Se connecter au garage
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
