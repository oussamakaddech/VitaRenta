import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ token, user, setToken, onLogout }) => {
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
                    {user?.role === 'agent' || user?.role === 'admin' ? (
                        <Link
                            to="/agent/vehicules"
                            className={`sidebar-link ${isActive('/agent/vehicules') ? 'sidebar-link-active' : ''}`}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <i className="fas fa-tools"></i>
                            Gestion Véhicules
                        </Link>
                    ) : null}
                    {user?.role === 'admin' ? (
                        <Link
                            to="/admin/agences"
                            className={`sidebar-link ${isActive('/admin/agences') ? 'sidebar-link-active' : ''}`}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <i className="fas fa-cog"></i>
                            Gérer Agences
                        </Link>
                    ) : null}
                    {user?.role === 'admin' ? (
                        <Link
                            to="/admin/users"
                            className={`sidebar-link ${isActive('/admin/users') ? 'sidebar-link-active' : ''}`}
                            onClick={() => setIsSidebarOpen(false)}
                        >
                            <i className="fas fa-users"></i>
                            Gérer Utilisateurs
                        </Link>
                    ) : null}
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

export default Sidebar;