import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './App.css';
import SignUp from './components/SignUp';
import Login from './components/Login';
import Profile from './components/Profile';
import VehiculeList from './components/VehiculeList';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import AgentVehicleManager from './components/AgentVehicleManager';
import AgencyManagement from './components/AgencyManagement';

// Sidebar component from AgencyManager.js
const Sidebar = ({ token, setToken, onLogout }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        onLogout();
        setIsSidebarOpen(false);
    };

    return (
        <>
            <button
                className={`sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label="Toggle sidebar"
            >
                <i className="fas fa-bars"></i>
            </button>
            <nav className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-brand" onClick={() => setIsSidebarOpen(false)}>
                        <span className="brand-icon">🚗</span>
                        VitaRenta
                    </Link>
                </div>
                <div className="sidebar-menu">
                    <Link
                        to="/"
                        className={`sidebar-link ${isActive('/') ? 'sidebar-link-active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <i className="fas fa-home"></i>
                        Accueil
                    </Link>
                    <Link
                        to="/dashboard"
                        className={`sidebar-link ${isActive('/dashboard') ? 'sidebar-link-active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <i className="fas fa-tachometer-alt"></i>
                        Tableau de Bord
                    </Link>
                    <Link
                        to="/vehicules"
                        className={`sidebar-link ${isActive('/vehicules') ? 'sidebar-link-active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <i className="fas fa-car"></i>
                        Véhicules
                    </Link>
                    <Link
                        to="/agent/vehicules"
                        className={`sidebar-link ${isActive('/agent/vehicules') ? 'sidebar-link-active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <i className="fas fa-tools"></i>
                        Gestion Véhicules
                    </Link>
                    <Link
                        to="/admin/agences"
                        className={`sidebar-link ${isActive('/admin/agences') ? 'sidebar-link-active' : ''}`}
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <i className="fas fa-cog"></i>
                        Gérer Agences
                    </Link>
                    {token && (
                        <>
                            <Link
                                to="/profile"
                                className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <i className="fas fa-user"></i>
                                Mon Profil
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="sidebar-link sidebar-link-logout"
                            >
                                <i className="fas fa-sign-out-alt"></i>
                                Déconnexion
                            </button>
                        </>
                    )}
                </div>
            </nav>
        </>
    );
};

// Composant principal App
function App() {
    const [token, setToken] = useState('');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 🔍 DEBUG: Logs pour vérifier l'état de l'application
    useEffect(() => {
        console.log('App - Token:', !!token);
        console.log('App - User:', user);
        console.log('App - Mode:', 'ACCÈS LIBRE TOTAL');
    }, [token, user]);

    // Initialisation de l'application
    useEffect(() => {
        const initializeApp = () => {
            try {
                console.log('🚀 Initialisation en mode accès libre...');

                // Charger le token (optionnel)
                const storedToken = localStorage.getItem('token');
                if (storedToken) {
                    setToken(storedToken);
                }

                // Charger les données utilisateur (optionnel)
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        setUser(parsedUser);
                    } catch (error) {
                        console.error('❌ Erreur parsing user data:', error);
                        localStorage.removeItem('user');
                    }
                }

                console.log('✅ Application prête - Accès libre activé');
            } catch (error) {
                console.error('❌ Erreur initialisation app:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, []);

    // Fonctions mémorisées
    const updateUser = useCallback((userData) => {
        console.log('🔄 Mise à jour utilisateur:', userData);
        setUser(userData);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        } else {
            localStorage.removeItem('user');
        }
    }, []);

    const handleLogout = useCallback(() => {
        console.log('🚪 Déconnexion...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken('');
        setUser(null);
    }, []);

    const handleLogin = useCallback((newToken, userData) => {
        console.log('🔑 Connexion...', { token: !!newToken, user: userData });
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        if (userData) {
            localStorage.setItem('user', JSON.stringify(userData));
        }
    }, []);

    if (isLoading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Chargement de VitaRenta...</p>
                    <small>🔓 Mode accès libre</small>
                </div>
            </div>
        );
    }

    return (
        <Router>
            <div className="app">
                <Sidebar token={token} setToken={setToken} onLogout={handleLogout} />
                <main className="main-content">
                    <Routes>
                        {/* Accueil - Accès libre */}
                        <Route path="/" element={<Home token={token} user={user} />} />

                        {/* Authentification - Accès libre */}
                        <Route
                            path="/signup"
                            element={
                                <SignUp
                                    setToken={setToken}
                                    setUser={updateUser}
                                    onLogin={handleLogin}
                                />
                            }
                        />
                        <Route
                            path="/login"
                            element={
                                <Login
                                    setToken={setToken}
                                    setUser={updateUser}
                                    onLogin={handleLogin}
                                />
                            }
                        />

                        {/* Profil - Accès libre */}
                        <Route
                            path="/profile"
                            element={
                                <Profile
                                    token={token}
                                    setToken={setToken}
                                    user={user}
                                    setUser={updateUser}
                                    onLogout={handleLogout}
                                />
                            }
                        />

                        {/* Véhicules - Accès libre */}
                        <Route
                            path="/vehicules"
                            element={
                                <VehiculeList
                                    token={token}
                                    user={user}
                                    onLogout={handleLogout}
                                />
                            }
                        />

                        {/* Dashboard - Accès libre */}
                        <Route
                            path="/dashboard"
                            element={
                                <Dashboard
                                    token={token}
                                    user={user}
                                    onLogout={handleLogout}
                                />
                            }
                        />

                        {/* Gestion véhicules agents - Accès libre */}
                        <Route
                            path="/agent/vehicules"
                            element={
                                <AgentVehicleManager
                                    token={token}
                                    user={user}
                                    onLogout={handleLogout}
                                />
                            }
                        />

                        {/* Admin véhicules - Accès libre */}
                        <Route
                            path="/admin/vehicules"
                            element={
                                <AgentVehicleManager
                                    token={token}
                                    user={user}
                                    onLogout={handleLogout}
                                    isAdmin={true}
                                />
                            }
                        />

                        {/* Admin agences - Accès libre */}
                        <Route
                            path="/admin/agences"
                            element={
                                <AgencyManagement
                                    token={token}
                                    user={user}
                                    onLogout={handleLogout}
                                    isAdmin={true}
                                />
                            }
                        />

                        {/* Admin utilisateurs - Accès libre */}
                        <Route
                            path="/admin/users"
                            element={
                                <div className="admin-users-placeholder">
                                    <div className="free-access-info">
                                        <i className="fas fa-unlock-alt"></i>
                                        <span>Accès libre activé</span>
                                    </div>
                                    <h1>🔧 Gestion des Utilisateurs</h1>
                                    <p>Interface de gestion des utilisateurs accessible librement</p>
                                    <div className="placeholder-features">
                                        <div className="feature-item">
                                            <i className="fas fa-users"></i>
                                            <span>Consultation des utilisateurs</span>
                                        </div>
                                        <div className="feature-item">
                                            <i className="fas fa-user-edit"></i>
                                            <span>Modification des profils</span>
                                        </div>
                                        <div className="feature-item">
                                            <i className="fas fa-user-shield"></i>
                                            <span>Gestion des rôles</span>
                                        </div>
                                    </div>
                                    <div className="error-actions">
                                        <Link to="/dashboard" className="btn btn-primary">
                                            Retour au tableau de bord
                                        </Link>
                                    </div>
                                </div>
                            }
                        />

                        {/* Page 404 - Accès libre */}
                        <Route
                            path="*"
                            element={
                                <div className="error-page">
                                    <div className="error-content">
                                        <div className="free-access-info">
                                            <i className="fas fa-unlock-alt"></i>
                                            <span>Accès libre</span>
                                        </div>
                                        <h1>🔍 404 - Page non trouvée</h1>
                                        <p>La page que vous cherchez n'existe pas.</p>
                                        <div className="error-actions">
                                            <Link to="/" className="btn btn-primary">
                                                🏠 Retour à l'accueil
                                            </Link>
                                            <Link to="/dashboard" className="btn btn-secondary">
                                                📊 Tableau de bord
                                            </Link>
                                            <Link to="/vehicules" className="btn btn-secondary">
                                                🚗 Voir les véhicules
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            }
                        />
                    </Routes>
                </main>
                <footer className="footer">
                    <div className="footer-content">
                        <div className="footer-main">
                            <div className="footer-brand">
                                <span className="footer-logo">🚗</span>
                                <h3>VitaRenta</h3>
                                <p>Votre partenaire de confiance pour la location de véhicules.</p>
                                <div className="footer-access-info">
                                    <span className="access-badge">🔓 Accès libre total</span>
                                </div>
                            </div>
                            <div className="footer-links">
                                <div className="footer-section">
                                    <h4>Services</h4>
                                    <Link to="/vehicules">Location de véhicules</Link>
                                    <Link to="/agences">Agences</Link>
                                    <Link to="/dashboard">Tableau de bord</Link>
                                    <Link to="/profile">Profil</Link>
                                </div>
                                <div className="footer-section">
                                    <h4>Gestion</h4>
                                    <Link to="/agent/vehicules">Gestion véhicules</Link>
                                    <Link to="/admin/agences">Admin agences</Link>
                                    <Link to="/admin/vehicules">Admin véhicules</Link>
                                    <Link to="/admin/users">Admin utilisateurs</Link>
                                </div>
                                <div className="footer-section">
                                    <h4>Support</h4>
                                    <a href="/contact">Contact</a>
                                    <a href="/faq">FAQ</a>
                                    <a href="/help">Aide</a>
                                </div>
                                <div className="footer-section">
                                    <h4>Légal</h4>
                                    <a href="/privacy">Confidentialité</a>
                                    <a href="/terms">Conditions</a>
                                    <a href="/cookies">Cookies</a>
                                </div>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <p>© 2025 VitaRenta. Tous droits réservés.</p>
                            <div className="footer-access-status">
                                <span>🔓 Mode accès libre activé</span>
                            </div>
                            <div className="footer-social">
                                <a href="#" title="Facebook">📘</a>
                                <a href="#" title="Twitter">🐦</a>
                                <a href="#" title="Instagram">📷</a>
                                <a href="#" title="LinkedIn">💼</a>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </Router>
    );
}

export default App;