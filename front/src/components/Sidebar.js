import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
    FaCar, FaCalendarCheck, FaMagic, FaStar, FaStethoscope, 
    FaMapMarkedAlt, FaLeaf, FaChartLine, FaSeedling, FaUser, 
    FaTachometerAlt, FaTools, FaWrench, FaCommentDots, FaCog, 
    FaSignInAlt, FaUserPlus, FaKey, FaSignOutAlt, FaBars, 
    FaHome, FaThumbsUp, FaChartBar, FaCalculator, FaUsers,
    FaBuilding, FaChartPie, FaDatabase, FaNetworkWired, FaShieldAlt,
    FaCogs, FaChevronDown, FaChevronUp
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ token, user, onLogout }) => {
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [openSubmenus, setOpenSubmenus] = useState({
        maintenance: false,
        eco: false,
        analytics: false,
        management: false,
        system: false
    });

    const isActive = (path) => location.pathname === path;

    const handleLogout = () => {
        onLogout();
        setIsSidebarOpen(false);
    };

    const handleLinkClick = () => {
        setIsSidebarOpen(false);
    };

    const toggleSubmenu = (menu) => {
        setOpenSubmenus(prev => ({
            ...prev,
            [menu]: !prev[menu]
        }));
    };

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    const isAdmin = user?.role === 'admin';
    const isAgence = user?.role === 'agence';
    const isClient = user?.role === 'client';
    const isAdminOrAgence = isAdmin || isAgence;

    // ✅ MODIFICATION PRINCIPALE : 
    // La sidebar est masquée SEULEMENT si l'utilisateur n'est PAS admin/agence 
    // ET qu'il est sur les pages login/signup
    const hideSidebar = !isAdminOrAgence && ['/login', '/signup'].includes(location.pathname);

    // ✅ AMÉLIORATION : Forcer l'ouverture de la sidebar pour admin/agence
    const [shouldAutoOpen, setShouldAutoOpen] = useState(false);
    
    React.useEffect(() => {
        if (isAdminOrAgence && !shouldAutoOpen) {
            setIsSidebarOpen(true);
            setShouldAutoOpen(true);
        }
    }, [isAdminOrAgence, shouldAutoOpen]);

    if (hideSidebar) {
        return null;
    }

    return (
        <>
            {/* Bouton toggle général pour mobile/petits écrans */}
            <button
                className={`sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
                onClick={toggleSidebar}
                aria-label={isSidebarOpen ? "Fermer la barre latérale" : "Ouvrir la barre latérale"}
            >
                <FaBars />
            </button>

            {/* Bouton toggle spécifique pour les clients */}
            {isClient && (
                <button
                    className={`client-sidebar-toggle ${isSidebarOpen ? 'active' : ''}`}
                    onClick={toggleSidebar}
                    aria-label={isSidebarOpen ? "Fermer la barre latérale client" : "Ouvrir la barre latérale client"}
                >
                    <FaBars />
                </button>
            )}

            {/* ✅ AMÉLIORATION : Classe CSS conditionnelle pour admin/agence */}
            <nav 
                className={`sidebar ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'} ${isAdminOrAgence ? 'sidebar-admin-mode' : ''}`} 
                role="navigation" 
                aria-label="Menu principal"
            >
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-brand" onClick={handleLinkClick} aria-label="Retour à l'accueil VitaRenta">
                        <div className="brand-logo">
                            <div className="logo-rings">
                                <div className="ring ring-1"></div>
                                <div className="ring ring-2"></div>
                                <div className="ring ring-3"></div>
                            </div>
                            <span className="brand-icon">🚗</span>
                        </div>
                        <div className="brand-text">
                            <span className="brand-name">VitaRenta</span>
                            {/* ✅ AMÉLIORATION : Indicateur de mode admin/agence */}
                            {isAdminOrAgence && (
                                <span className="admin-mode-indicator">
                                    {isAdmin ? '🛡️ Mode Admin' : '🏢 Mode Agence'}
                                </span>
                            )}
                        </div>
                    </Link>
                    
                   
                </div>

                <div className="sidebar-menu">
                    {/* Lien Accueil pour tous les utilisateurs connectés */}
                    {token && (
                        <div className="sidebar-section">
                            <h3 className="sidebar-section-title">
                                {isAdminOrAgence && <span className="admin-section-icon">⚡</span>}
                                Navigation
                            </h3>
                            <Link
                                to="/"
                                className={`sidebar-link ${isActive('/') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Page d'accueil"
                            >
                                <div className="icon-container">
                                    <FaHome />
                                    <div className="icon-glow"></div>
                                </div>
                                <span className="link-text">Accueil</span>
                            </Link>
                        </div>
                    )}
                    
                    {/* ✅ AMÉLIORATION : Section spéciale Admin/Agence Dashboard */}
                    {isAdminOrAgence && (
                        <div className="sidebar-section priority-section">
                            <h3 className="sidebar-section-title admin-title">
                                <span className="admin-section-icon">🎯</span>
                                Tableau de Bord Prioritaire
                            </h3>
                            <Link
                                to="/dashboard"
                                className={`sidebar-link priority-link ${isActive('/dashboard') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Tableau de bord"
                            >
                                <div className="icon-container">
                                    <FaTachometerAlt />
                                    <div className="icon-glow"></div>
                                </div>
                                <span className="link-text">Dashboard Principal</span>
                                <div className="priority-indicator">⭐</div>
                            </Link>
                        </div>
                    )}
                    
                    {/* Liens pour les clients */}
                    {isClient && (
                        <>
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title">Services</h3>
                                <Link
                                    to="/vehicules"
                                    className={`sidebar-link ${isActive('/vehicules') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Liste des véhicules"
                                >
                                    <div className="icon-container">
                                        <FaCar />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Véhicules</span>
                                    <div className="notification-badge">12</div>
                                </Link>
                                <Link
                                    to="/reservations"
                                    className={`sidebar-link ${isActive('/reservations') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Mes réservations"
                                >
                                    <div className="icon-container">
                                        <FaCalendarCheck />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Mes Réservations</span>
                                    <div className="notification-badge active">3</div>
                                </Link>
                                <Link
                                    to="/recommendations"
                                    className={`sidebar-link ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Recommandations de véhicules"
                                >
                                    <div className="icon-container">
                                        <FaMagic />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Recommandations</span>
                                </Link>
                                <Link
                                    to="/feedback"
                                    className={`sidebar-link ${isActive('/feedback') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Feedback et avis"
                                >
                                    <div className="icon-container">
                                        <FaStar />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Feedback</span>
                                </Link>
                                <Link
                                    to="/diagnostic"
                                    className={`sidebar-link ${isActive('/diagnostic') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Assistant diagnostic automobile"
                                >
                                    <div className="icon-container">
                                        <FaStethoscope />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Diagnostic Auto</span>
                                </Link>
                                <Link
                                    to="/agencies-locator"
                                    className={`sidebar-link ${isActive('/agencies-locator') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Trouver nos agences"
                                >
                                    <div className="icon-container">
                                        <FaMapMarkedAlt />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Nos Agences</span>
                                </Link>
                            </div>
                            
                            {/* Sous-menu Éco-responsabilité */}
                            <div className="sidebar-section">
                                <div className="sidebar-submenu">
                                    <button 
                                        className={`sidebar-link submenu-toggle ${openSubmenus.eco ? 'open' : ''}`}
                                        onClick={() => toggleSubmenu('eco')}
                                        aria-expanded={openSubmenus.eco}
                                        aria-label="Menu éco-responsabilité"
                                    >
                                        <FaLeaf />
                                        <span>Éco-Responsabilité</span>
                                        {openSubmenus.eco ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    
                                    {openSubmenus.eco && (
                                        <div className="submenu-items show">
                                            <Link
                                                to="/eco-score"
                                                className={`sidebar-link submenu-item ${isActive('/eco-score') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Score écologique"
                                            >
                                                <FaChartLine />
                                                Score Écologique
                                            </Link>
                                            <Link
                                                to="/eco-challenges"
                                                className={`sidebar-link submenu-item ${isActive('/eco-challenges') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Défis éco-responsables"
                                            >
                                                <FaSeedling />
                                                Défis Éco-Responsables
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title">Compte</h3>
                                <Link
                                    to="/profile"
                                    className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Mon profil"
                                >
                                    <div className="icon-container">
                                        <FaUser />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Mon Profil</span>
                                </Link>
                            </div>
                        </>
                    )}
                    
                    {/* Liens pour les agences et administrateurs */}
                    {isAdminOrAgence && (
                        <>
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">📊</span>
                                    Gestion des véhicules
                                </h3>
                                <Link
                                    to="/vehicules"
                                    className={`sidebar-link ${isActive('/vehicules') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Liste des véhicules"
                                >
                                    <div className="icon-container">
                                        <FaCar />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Véhicules</span>
                                </Link>
                                <Link
                                    to="/agent/vehicules"
                                    className={`sidebar-link ${isActive('/agent/vehicules') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Gestion des véhicules"
                                >
                                    <div className="icon-container">
                                        <FaTools />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Gestion Véhicules</span>
                                </Link>
                                
                                {/* Sous-menu Maintenance Prédictive */}
                                <div className="sidebar-submenu">
                                    <button 
                                        className={`sidebar-link submenu-toggle ${openSubmenus.maintenance ? 'open' : ''}`}
                                        onClick={() => toggleSubmenu('maintenance')}
                                        aria-expanded={openSubmenus.maintenance}
                                        aria-label="Menu maintenance prédictive"
                                    >
                                        <FaWrench />
                                        <span>Maintenance Prédictive</span>
                                        {openSubmenus.maintenance ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    
                                    {openSubmenus.maintenance && (
                                        <div className="submenu-items show">
                                            <Link
                                                to="/predictive-maintenance"
                                                className={`sidebar-link submenu-item ${isActive('/predictive-maintenance') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Analyse de maintenance"
                                            >
                                                <FaChartBar />
                                                Analyse de Maintenance
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">📅</span>
                                    Réservations
                                </h3>
                                <Link
                                    to="/reservations"
                                    className={`sidebar-link ${isActive('/reservations') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Gestion des réservations"
                                >
                                    <div className="icon-container">
                                        <FaCalendarCheck />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Réservations</span>
                                    <div className="notification-badge active">5</div>
                                </Link>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">📈</span>
                                    Analytique
                                </h3>
                                <div className="sidebar-submenu">
                                    <button 
                                        className={`sidebar-link submenu-toggle ${openSubmenus.analytics ? 'open' : ''}`}
                                        onClick={() => toggleSubmenu('analytics')}
                                        aria-expanded={openSubmenus.analytics}
                                        aria-label="Menu analytique"
                                    >
                                        <FaChartPie />
                                        <span>Analyse & Prédictions</span>
                                        {openSubmenus.analytics ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    
                                    {openSubmenus.analytics && (
                                        <div className="submenu-items show">
                                            <Link
                                                to="/demand-prediction"
                                                className={`sidebar-link submenu-item ${isActive('/demand-prediction') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Prédictions de demande"
                                            >
                                                <FaChartLine />
                                                Prévisions de Demande
                                            </Link>
                                            <Link
                                                to="/recommendations"
                                                className={`sidebar-link submenu-item ${isActive('/recommendations') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Recommandations de véhicules"
                                            >
                                                <FaThumbsUp />
                                                Recommandations
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">🌱</span>
                                    Écologie
                                </h3>
                                <div className="sidebar-submenu">
                                    <button 
                                        className={`sidebar-link submenu-toggle ${openSubmenus.eco ? 'open' : ''}`}
                                        onClick={() => toggleSubmenu('eco')}
                                        aria-expanded={openSubmenus.eco}
                                        aria-label="Menu éco-responsabilité"
                                    >
                                        <FaLeaf />
                                        <span>Éco-Responsabilité</span>
                                        {openSubmenus.eco ? <FaChevronUp /> : <FaChevronDown />}
                                    </button>
                                    
                                    {openSubmenus.eco && (
                                        <div className="submenu-items show">
                                            <Link
                                                to="/eco-score"
                                                className={`sidebar-link submenu-item ${isActive('/eco-score') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Calcul du score écologique"
                                            >
                                                <FaCalculator />
                                                Calcul du Score
                                            </Link>
                                            <Link
                                                to="/eco-challenges"
                                                className={`sidebar-link submenu-item ${isActive('/eco-challenges') ? 'sidebar-link-active' : ''}`}
                                                onClick={handleLinkClick}
                                                aria-label="Défis éco-responsables"
                                            >
                                                <FaSeedling />
                                                Défis Éco-Responsables
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">💬</span>
                                    Support & Feedback
                                </h3>
                                <Link
                                    to="/feedback"
                                    className={`sidebar-link ${isActive('/feedback') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Feedback et avis"
                                >
                                    <div className="icon-container">
                                        <FaCommentDots />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Feedback</span>
                                </Link>
                                <Link
                                    to="/diagnostic"
                                    className={`sidebar-link ${isActive('/diagnostic') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Assistant diagnostic automobile"
                                >
                                    <div className="icon-container">
                                        <FaStethoscope />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Diagnostic Auto</span>
                                </Link>
                            </div>
                            
                            {/* Section Administration (uniquement pour les admins) */}
                            {isAdmin && (
                                <div className="sidebar-section">
                                    <h3 className="sidebar-section-title admin-title">
                                        <span className="admin-section-icon">🛡️</span>
                                        Administration
                                    </h3>
                                    <div className="sidebar-submenu">
                                        <button 
                                            className={`sidebar-link submenu-toggle ${openSubmenus.management ? 'open' : ''}`}
                                            onClick={() => toggleSubmenu('management')}
                                            aria-expanded={openSubmenus.management}
                                            aria-label="Menu gestion"
                                        >
                                            <FaCogs />
                                            <span>Gestion Système</span>
                                            {openSubmenus.management ? <FaChevronUp /> : <FaChevronDown />}
                                        </button>
                                        
                                        {openSubmenus.management && (
                                            <div className="submenu-items show">
                                                <Link
                                                    to="/admin/users"
                                                    className={`sidebar-link submenu-item ${isActive('/admin/users') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Gestion des utilisateurs"
                                                >
                                                    <FaUsers />
                                                    Gestion Utilisateurs
                                                </Link>
                                                <Link
                                                    to="/admin/agences"
                                                    className={`sidebar-link submenu-item ${isActive('/admin/agences') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Gestion des agences"
                                                >
                                                    <FaBuilding />
                                                    Gestion Agences
                                                </Link>
                                                <Link
                                                    to="/admin/vehicules"
                                                    className={`sidebar-link submenu-item ${isActive('/admin/vehicules') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Administration des véhicules"
                                                >
                                                    <FaCar />
                                                    Admin Véhicules
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="sidebar-submenu">
                                        <button 
                                            className={`sidebar-link submenu-toggle ${openSubmenus.system ? 'open' : ''}`}
                                            onClick={() => toggleSubmenu('system')}
                                            aria-expanded={openSubmenus.system}
                                            aria-label="Menu système"
                                        >
                                            <FaCogs />
                                            <span>Système</span>
                                            {openSubmenus.system ? <FaChevronUp /> : <FaChevronDown />}
                                        </button>
                                        
                                        {openSubmenus.system && (
                                            <div className="submenu-items show">
                                                <Link
                                                    to="/backend-diagnostic"
                                                    className={`sidebar-link submenu-item ${isActive('/backend-diagnostic') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Diagnostic du backend"
                                                >
                                                    <FaDatabase />
                                                    Diagnostic Backend
                                                </Link>
                                                <Link
                                                    to="/api-test"
                                                    className={`sidebar-link submenu-item ${isActive('/api-test') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Testeur API"
                                                >
                                                    <FaNetworkWired />
                                                    Testeur API
                                                </Link>
                                                <Link
                                                    to="/auth-debug"
                                                    className={`sidebar-link submenu-item ${isActive('/auth-debug') ? 'sidebar-link-active' : ''}`}
                                                    onClick={handleLinkClick}
                                                    aria-label="Debug authentification"
                                                >
                                                    <FaShieldAlt />
                                                    Debug Auth
                                                </Link>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">🏢</span>
                                    Agences
                                </h3>
                                <Link
                                    to="/agencies-locator"
                                    className={`sidebar-link ${isActive('/agencies-locator') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Vue client des agences"
                                >
                                    <div className="icon-container">
                                        <FaMapMarkedAlt />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Vue Client Agences</span>
                                </Link>
                            </div>
                            
                            <div className="sidebar-section">
                                <h3 className="sidebar-section-title admin-title">
                                    <span className="admin-section-icon">👤</span>
                                    Compte
                                </h3>
                                <Link
                                    to="/profile"
                                    className={`sidebar-link ${isActive('/profile') ? 'sidebar-link-active' : ''}`}
                                    onClick={handleLinkClick}
                                    aria-label="Mon profil"
                                >
                                    <div className="icon-container">
                                        <FaUser />
                                        <div className="icon-glow"></div>
                                    </div>
                                    <span className="link-text">Mon Profil</span>
                                </Link>
                            </div>
                        </>
                    )}
                    
                    {/* Liens pour les utilisateurs non connectés */}
                    {!token && (
                        <div className="sidebar-section">
                            <h3 className="sidebar-section-title">Accès</h3>
                            <Link
                                to="/login"
                                className={`sidebar-link ${isActive('/login') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Connexion"
                            >
                                <div className="icon-container">
                                    <FaSignInAlt />
                                    <div className="icon-glow"></div>
                                </div>
                                <span className="link-text">Connexion</span>
                            </Link>
                            <Link
                                to="/signup"
                                className={`sidebar-link ${isActive('/signup') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Inscription"
                            >
                                <div className="icon-container">
                                    <FaUserPlus />
                                    <div className="icon-glow"></div>
                                </div>
                                <span className="link-text">Inscription</span>
                            </Link>
                            <Link
                                to="/forgot-password"
                                className={`sidebar-link ${isActive('/forgot-password') ? 'sidebar-link-active' : ''}`}
                                onClick={handleLinkClick}
                                aria-label="Mot de passe oublié"
                            >
                                <div className="icon-container">
                                    <FaKey />
                                    <div className="icon-glow"></div>
                                </div>
                                <span className="link-text">Mot de passe oublié</span>
                            </Link>
                        </div>
                    )}
                    
                    {/* Bouton de déconnexion pour les utilisateurs connectés */}
                    {token && (
                        <div className="logout-section">
                            <div className="logout-separator"></div>
                            <button
                                onClick={handleLogout}
                                className="sidebar-link sidebar-link-logout"
                                role="button"
                                aria-label="Se déconnecter"
                            >
                                <div className="icon-container">
                                    <FaSignOutAlt />
                                    <div className="icon-glow logout-glow"></div>
                                </div>
                                <span className="link-text">Déconnexion</span>
                                <div className="logout-indicator">⏻</div>
                            </button>
                        </div>
                    )}
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
