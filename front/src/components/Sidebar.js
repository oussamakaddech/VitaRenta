// Sidebar.js
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ token, user, onLogout }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState({
        maintenance: false,
        eco: false
    });
    
    const isActive = (path) => location.pathname === path;
    
    const handleLogout = () => {
        onLogout();
        if (isSidebarOpen) setIsSidebarOpen(false);
    };
    
    const handleLinkClick = () => {
        if (isSidebarOpen) setIsSidebarOpen(false);
    };
    
    const toggleSubmenu = (menu) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [menu]: !prev[menu]
        }));
    };
    
    const isAdminOrAgence = user?.role === 'admin' || user?.role === 'agence';
    
    return (
        <>
            <button
                className={`sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                aria-label={isSidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
            >
                <i className="fas fa-bars"></i>
            </button>
            <nav className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`} role="navigation" aria-label="Menu principal">
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-brand" onClick={handleLinkClick} aria-label="Retour à l'accueil VitaRenta">
                        <span className="brand-icon">🚗</span>
                        VitaRenta
                    </Link>
                    {user && (
                        <div className="user-info">
                            <span className="user-role">{user.role}</span>
                            <span className="user-name">{user.nom || user.email}</span>
                        </div>
                    )}
                </div>
                <div className="sidebar-menu">
                    {/* Liens pour les clients */}
                    {user?.role === 'client' && (
                        <>
                            <Link
                                to="/vehicules"
                                className={`sidebar-link ${isActive('/vehicules') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Liste des véhicules"
                            >
                                <i className="fas fa-car"></i>
                                Véhicules
                            </Link>
                            <Link
                                to="/reservations"
                                className={`sidebar-link ${isActive('/reservations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mes réservations"
                            >
                                <i className="fas fa-calendar-alt"></i>
                                Mes Réservations
                            </Link>
                            <Link
                                to="/recommendations"
                                className={`sidebar-link ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Recommandations de véhicules"
                            >
                                <i className="fas fa-thumbs-up"></i>
                                Recommandations
                            </Link>
                            <Link
                                to="/feedback"
                                className={`sidebar-link ${isActive('/feedback') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Feedback et avis"
                            >
                                <i className="fas fa-comment-dots"></i>
                                Feedback
                            </Link>
                            <Link
                                to="/diagnostic"
                                className={`sidebar-link ${isActive('/diagnostic') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Assistant diagnostic automobile"
                            >
                                <i className="fas fa-stethoscope"></i>
                                Diagnostic Auto
                            </Link>
                            <Link
                                to="/profile"
                                className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mon profil"
                            >
                                <i className="fas fa-user"></i>
                                Mon Profil
                            </Link>
                        </>
                    )}
                    
                    {/* Liens pour les agences et administrateurs */}
                    {isAdminOrAgence && (
                        <>
                            <Link
                                to="/dashboard"
                                className={`sidebar-link ${isActive('/dashboard') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Tableau de bord"
                            >
                                <i className="fas fa-tachometer-alt"></i>
                                Tableau de Bord
                            </Link>
                            <Link
                                to="/vehicules"
                                className={`sidebar-link ${isActive('/vehicules') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Liste des véhicules"
                            >
                                <i className="fas fa-car"></i>
                                Véhicules
                            </Link>
                            <Link
                                to="/reservations"
                                className={`sidebar-link ${isActive('/reservations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Gestion des réservations"
                            >
                                <i className="fas fa-calendar-check"></i>
                                Réservations
                            </Link>
                            <Link
                                to="/recommendations"
                                className={`sidebar-link ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Recommandations de véhicules"
                            >
                                <i className="fas fa-thumbs-up"></i>
                                Recommandations
                            </Link>
                            <Link
                                to="/agent/vehicules"
                                className={`sidebar-link ${isActive('/agent/vehicules') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Gestion des véhicules"
                            >
                                <i className="fas fa-tools"></i>
                                Gestion Véhicules
                            </Link>
                            <Link
                                to="/demand-prediction"
                                className={`sidebar-link ${isActive('/demand-prediction') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Prédictions de demande"
                            >
                                <i className="fas fa-chart-line"></i>
                                Prédictions
                            </Link>
                            
                            {/* Sous-menu Maintenance Prédictive */}
                            <div className="sidebar-submenu">
                                <button 
                                    className={`sidebar-link submenu-toggle ${openSubmenus.maintenance ? 'open' : ''}`}
                                    onClick={() => toggleSubmenu('maintenance')}
                                    aria-expanded={openSubmenus.maintenance}
                                    aria-label="Menu maintenance prédictive"
                                >
                                    <i className="fas fa-wrench"></i>
                                    Maintenance Prédictive
                                    <i className={`fas fa-chevron-${openSubmenus.maintenance ? 'up' : 'down'}`}></i>
                                </button>
                                
                                {openSubmenus.maintenance && (
                                    <div className="submenu-items">
                                        <Link
                                            to="/predictive-maintenance"
                                            className={`sidebar-link submenu-item ${isActive('/predictive-maintenance') ? 'sidebar-link-active' : ''}`}
                                            onClick={handleLinkClick}
                                            aria-label="Analyse de maintenance"
                                        >
                                            <i className="fas fa-chart-bar"></i>
                                            Analyse de Maintenance
                                        </Link>
                                    </div>
                                )}
                            </div>
                            
                            {/* Sous-menu Score Écologique */}
                            <div className="sidebar-submenu">
                                <button 
                                    className={`sidebar-link submenu-toggle ${openSubmenus.eco ? 'open' : ''}`}
                                    onClick={() => toggleSubmenu('eco')}
                                    aria-expanded={openSubmenus.eco}
                                    aria-label="Menu score écologique"
                                >
                                    <i className="fas fa-leaf"></i>
                                    Score Écologique
                                    <i className={`fas fa-chevron-${openSubmenus.eco ? 'up' : 'down'}`}></i>
                                </button>
                                
                                {openSubmenus.eco && (
                                    <div className="submenu-items">
                                        <Link
                                            to="/eco-score"
                                            className={`sidebar-link submenu-item ${isActive('/eco-score') ? 'sidebar-link-active' : ''}`}
                                            onClick={handleLinkClick}
                                            aria-label="Calcul du score écologique"
                                        >
                                            <i className="fas fa-calculator"></i>
                                            Calcul du Score
                                        </Link>
                                    </div>
                                )}
                            </div>
                            
                            <Link
                                to="/feedback"
                                className={`sidebar-link ${isActive('/feedback') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Feedback et avis"
                            >
                                <i className="fas fa-comment-dots"></i>
                                Feedback
                            </Link>
                            
                            <Link
                                to="/diagnostic"
                                className={`sidebar-link ${isActive('/diagnostic') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Assistant diagnostic automobile"
                            >
                                <i className="fas fa-stethoscope"></i>
                                Diagnostic Auto
                            </Link>
                            
                            <Link
                                to="/admin/agences"
                                className={`sidebar-link ${isActive('/admin/agences') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Gestion des agences"
                            >
                                <i className="fas fa-cog"></i>
                                Gérer Agences
                            </Link>
                            
                            <Link
                                to="/profile"
                                className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mon profil"
                            >
                                <i className="fas fa-user"></i>
                                Mon Profil
                            </Link>
                        </>
                    )}
                    
                    {/* Liens pour les utilisateurs non connectés */}
                    {!token && (
                        <>
                            <Link
                                to="/login"
                                className={`sidebar-link ${isActive('/login') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Connexion"
                            >
                                <i className="fas fa-sign-in-alt"></i>
                                Connexion
                            </Link>
                            <Link
                                to="/signup"
                                className={`sidebar-link ${isActive('/signup') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Inscription"
                            >
                                <i className="fas fa-user-plus"></i>
                                Inscription
                            </Link>
                            <Link
                                to="/forgot-password"
                                className={`sidebar-link ${isActive('/forgot-password') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mot de passe oublié"
                            >
                                <i className="fas fa-key"></i>
                                Mot de passe oublié
                            </Link>
                        </>
                    )}
                    
                    {/* Bouton de déconnexion pour les utilisateurs connectés */}
                    {token && (
                        <button
                            onClick={handleLogout}
                            className="sidebar-link sidebar-link-logout"
                            role="button"
                            aria-label="Se déconnecter"
                        >
                            <i className="fas fa-sign-out-alt"></i>
                            Déconnexion
                        </button>
                    )}
                </div>
                
                {user && (
                    <div className="sidebar-footer">
                        <div className="user-avatar">
                            {user.photo_url ? (
                                <img src={user.photo_url} alt={user.nom || 'Avatar utilisateur'} />
                            ) : (
                                <div className="avatar-placeholder">
                                    {user.nom ? user.nom.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="user-details">
                            <span className="user-name">{user.nom || 'Utilisateur'}</span>
                            <span className="user-email">{user.email}</span>
                        </div>
                    </div>
                )}
            </nav>
        </>
    );
};

export default Sidebar;
