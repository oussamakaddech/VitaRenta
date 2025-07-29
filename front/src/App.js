import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Profile from './components/Profile';
import VehiculeList from './components/VehiculeList';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import AgentVehicleManager from './components/AgentVehicleManager';
import AgencyManagement from './components/AgencyManagement';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import UserManagement from './components/UserManagement';
import DemandForecast from './components/DemandForecast';
import RecommendationResults from './components/RecommendationResults';


function App() {
    const [token, setToken] = useState('');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const initializeApp = () => {
            try {
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                }
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                    } catch (error) {
                        localStorage.removeItem('user');
                    }
                }
            } catch (error) {
                // Gérer les erreurs sans console.log en production
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, []);

    const updateUser = useCallback((userData) => {
        setUser(userData);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            localStorage.removeItem('user');
        }
    }, []);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
    }, []);

    const handleLogin = useCallback((newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
    }, []);

    if (isLoading) {
        return (
            <div className="loading-screen" role="status" aria-live="polite">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Chargement de VitaRenta...</p>
                    <small>🔒 Mode accès restreint</small>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="app">
                <Sidebar token={token} user={user} setToken={setToken} onLogout={handleLogout} />
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Home token={token} user={user} />} />
                        <Route
                            path="/signup"
                            element={<SignUp setToken={setToken} setUser={updateUser} onLogin={handleLogin} />}
                        />
                        <Route
                            path="/login"
                            element={<Login setToken={setToken} setUser={updateUser} onLogin={handleLogin} />}
                        />
                        <Route
                            path="/profile"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['client', 'agent', 'admin']}>
                                    <Profile token={token} setToken={setToken} user={user} setUser={updateUser} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/vehicules"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['client', 'agent', 'admin']}>
                                    <VehiculeList token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['client', 'agent', 'admin']}>
                                    <Dashboard token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/agent/vehicules"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['agent', 'admin']}>
                                    <AgentVehicleManager token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/users"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['admin']}>
                                    <UserManagement token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/vehicules"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['admin']}>
                                    <AgentVehicleManager token={token} user={user} onLogout={handleLogout} isAdmin={true} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/admin/agences"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['admin']}>
                                    <AgencyManagement token={token} user={user} onLogout={handleLogout} isAdmin={true} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/demand-prediction"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['agent', 'admin']}>
                                    <DemandForecast token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/recommendations"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['client', 'agent', 'admin']}>
                                    <RecommendationResults token={token} user={user} onLogout={handleLogout} />
                                </ProtectedRoute>
                            }
                        />
                       
                        <Route
                            path="/unauthorized"
                            element={
                                <div className="error-page" role="alert">
                                    <div className="error-content">
                                        <h1>🚫 Accès non autorisé</h1>
                                        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                                        <div className="error-actions">
                                            <Link to="/" className="btn btn-primary" aria-label="Retour à l'accueil">
                                                🏠 Retour à l'accueil
                                            </Link>
                                            <Link to="/dashboard" className="btn btn-secondary" aria-label="Tableau de bord">
                                                📊 Tableau de bord
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                        <Route
                            path="*"
                            element={
                                <div className="error-page" role="alert">
                                    <div className="error-content">
                                        <h1>🔍 404 - Page non trouvée</h1>
                                        <p>La page que vous cherchez n'existe pas.</p>
                                        <div className="error-actions">
                                            <Link to="/" className="btn btn-primary" aria-label="Retour à l'accueil">
                                                🏠 Retour à l'accueil
                                            </Link>
                                            <Link to="/dashboard" className="btn btn-secondary" aria-label="Tableau de bord">
                                                📊 Tableau de bord
                                            </Link>
                                            <Link to="/vehicules" className="btn btn-secondary" aria-label="Voir les véhicules">
                                                🚗 Voir les véhicules
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                    </Routes>
                </main>
                <footer className="footer" role="contentinfo">
                    <div className="footer-content">
                        <div className="footer-main">
                            <div className="footer-brand">
                                <span className="footer-logo" aria-hidden="true">🚗</span>
                                <h3>VitaRenta</h3>
                                <p>Votre partenaire de confiance pour la location de véhicules.</p>
                                <div className="footer-access-info">
                                    <span className="access-badge">🔒 Accès restreint par rôles</span>
                                </div>
                            </div>
                            <div className="footer-links">
                                <div className="footer-section">
                                    <h4>Services</h4>
                                    <Link to="/vehicules" aria-label="Location de véhicules">Location de véhicules</Link>
                                    <Link to="/agences" aria-label="Agences">Agences</Link>
                                    <Link to="/dashboard" aria-label="Tableau de bord">Tableau de bord</Link>
                                    <Link to="/profile" aria-label="Profil">Profil</Link>
                                    <Link to="/recommendations" aria-label="Recommandations">Recommandations</Link>
                                </div>
                                {user?.role === 'admin' && (
                                    <div className="footer-section">
                                        <h4>Gestion</h4>
                                        <Link to="/agent/vehicules" aria-label="Gestion véhicules">Gestion véhicules</Link>
                                        <Link to="/admin/agences" aria-label="Admin agences">Admin agences</Link>
                                        <Link to="/admin/vehicules" aria-label="Admin véhicules">Admin véhicules</Link>
                                        <Link to="/admin/users" aria-label="Admin utilisateurs">Admin utilisateurs</Link>
                                        <Link to="/demand-prediction" aria-label="Prédictions">Prédictions</Link>
                                    </div>
                                )}
                                <div className="footer-section">
                                    <h4>Support</h4>
                                    <Link to="/contact" aria-label="Contact">Contact</Link>
                                    <Link to="/faq" aria-label="FAQ">FAQ</Link>
                                    <Link to="/help" aria-label="Aide">Aide</Link>
                                </div>
                                <div className="footer-section">
                                    <h4>Légal</h4>
                                    <Link to="/privacy" aria-label="Confidentialité">Confidentialité</Link>
                                    <Link to="/terms" aria-label="Conditions">Conditions</Link>
                                    <Link to="/cookies" aria-label="Cookies">Cookies</Link>
                                </div>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <p>© 2025 VitaRenta. Tous droits réservés.</p>
                            <div className="footer-access-status">
                                <span>🔒 Mode accès restreint activé</span>
                            </div>
                            <div className="footer-social">
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                                    📘
                                </a>
                                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                                    🐦
                                </a>
                                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                                    📷
                                </a>
                                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                                    💼
                                </a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </Router>
    );
}

export default App;
