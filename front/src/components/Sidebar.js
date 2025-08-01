import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ token, user, onLogout }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        onLogout();
        if (isSidebarOpen) setIsSidebarOpen(false);
    };

    const handleLinkClick = () => {
        if (isSidebarOpen) setIsSidebarOpen(false);
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
                </div>

                <div className="sidebar-menu">
                    <Link
                        to="/"
                        className={`sidebar-link ${isActive('/') ? 'sidebar-link-active' : ''}`}
                        onClick={handleLinkClick}
                        aria-label="Page d'accueil"
                    >
                        <i className="fas fa-home"></i>
                        Accueil
                    </Link>

                    {user?.role === 'client' ? (
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
                                to="/recommendations"
                                className={`sidebar-link ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Recommandations de véhicules"
                            >
                                <i className="fas fa-thumbs-up"></i>
                                Recommandations
                            </Link>
                        </>
                    ) : (
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
                                to="/recommendations"
                                className={`sidebar-link ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Recommandations de véhicules"
                            >
                                <i className="fas fa-thumbs-up"></i>
                                Recommandations
                            </Link>

                            {(user?.role === 'agence' || user?.role === 'admin') && (
                                <Link
                                    to="/agent/vehicules"
                                    className={`sidebar-link ${isActive('/agent/vehicules') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Gestion des véhicules"
                                >
                                    <i className="fas fa-tools"></i>
                                    Gestion Véhicules
                                </Link>
                            )}

                            {(user?.role === 'agence' || user?.role === 'admin') && (
                                <Link
                                    to="/demand-prediction"
                                    className={`sidebar-link ${isActive('/demand-prediction') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Prédictions de demande"
                                >
                                    <i className="fas fa-chart-line"></i>
                                    Prédictions
                                </Link>
                            )}

                            {isAdminOrAgence && (
                                <>
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
                                        to="/admin/users"
                                        className={`sidebar-link ${isActive('/admin/users') ? 'sidebar-link-active' : ''}`}
                                        onClick={handleLinkClick}
                                        aria-label="Gestion des utilisateurs"
                                    >
                                        <i className="fas fa-users"></i>
                                        Gérer Utilisateurs
                                    </Link>
                                </>
                            )}
                        </>
                    )}

                    {token && (
                        <>
                            <Link
                                to="/profile"
                                className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mon profil"
                            >
                                <i className="fas fa-user"></i>
                                Mon Profil
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="sidebar-link sidebar-link-logout"
                                role="button"
                                aria-label="Se déconnecter"
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

export default Sidebar;