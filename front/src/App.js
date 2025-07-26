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
function App() {
    const [token, setToken] = useState('');
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        console.log('App - Token:', !!token);
        console.log('App - User:', user);
        console.log('App - Mode:', 'ACCÈS RESTREINT PAR RÔLES');
    }, [token, user]);

    useEffect(() => {
        const initializeApp = () => {
            try {
                console.log('🚀 Initialisation avec contrôle des permissions...');
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
                        console.error('❌ Erreur parsing user data:', error);
                        localStorage.removeItem('user');
                    }
                }
                console.log('✅ Application prête');
            } catch (error) {
                console.error('❌ Erreur initialisation app:', error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeApp();
    }, []);

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
                            path="/admin/users"
                            element={
                                <ProtectedRoute token={token} user={user} allowedRoles={['admin']}>
                                    <div className="admin-users-placeholder">
                                        <div className="free-access-info">
                                            <i className="fas fa-unlock-alt"></i>
                                            <span>Accès réservé aux administrateurs</span>
                                        </div>
                                        <h1>🔧 Gestion des Utilisateurs</h1>
                                        <p>Interface de gestion des utilisateurs accessible aux admins uniquement</p>
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
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/unauthorized"
                            element={
                                <div className="error-page">
                                    <div className="error-content">
                                        <h1>🚫 Accès non autorisé</h1>
                                        <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
                                        <div className="error-actions">
                                            <Link to="/" className="btn btn-primary">
                                                🏠 Retour à l'accueil
                                            </Link>
                                            <Link to="/dashboard" className="btn btn-secondary">
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
                                <div className="error-page">
                                    <div className="error-content">
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
                                    <span className="access-badge">🔒 Accès restreint par rôles</span>
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
                                {user?.role === 'admin' && (
                                    <div className="footer-section">
                                        <h4>Gestion</h4>
                                        <Link to="/agent/vehicules">Gestion véhicules</Link>
                                        <Link to="/admin/agences">Admin agences</Link>
                                        <Link to="/admin/vehicules">Admin véhicules</Link>
                                        <Link to="/admin/users">Admin utilisateurs</Link>
                                    </div>
                                )}
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
                                <span>🔒 Mode accès restreint activé</span>
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