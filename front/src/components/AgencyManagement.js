import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import './AgencyManagement.css';
import { useLocation } from 'react-router-dom';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AgencyManager = ({ token, user, onLogout }) => {
    if (!token || !user || user.role !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [agencies, setAgencies] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [animateCards, setAnimateCards] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPageAgencies, setCurrentPageAgencies] = useState(1);
    const [itemsPerPage] = useState(8);
    const [selectedAgency, setSelectedAgency] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [modalState, setModalState] = useState({ type: null, data: null });
    const [stats, setStats] = useState({
        totalAgencies: 0,
        activeAgencies: 0,
        recentAgencies: 0
    });
    const [totalPagesAgencies, setTotalPagesAgencies] = useState(1);

    const [formData, setFormData] = useState({
        nom: '',
        adresse: '',
        ville: '',
        code_postal: '',
        pays: '',
        telephone: '',
        email: '',
        site_web: '',
        description: ''
    });

    const isActive = useCallback((path) => location.pathname === path, [location.pathname]);

    const handleLogout = useCallback(() => {
        onLogout();
        setIsSidebarOpen(false);
    }, [onLogout]);

    const validateAgencyData = useCallback((data) => {
        if (!data.nom || data.nom.trim().length < 2) return "Le nom de l'agence doit contenir au moins 2 caractères";
        if (!data.adresse || data.adresse.trim().length < 5) return "L'adresse doit contenir au moins 5 caractères";
        if (!data.ville || data.ville.trim().length < 2) return "La ville doit contenir au moins 2 caractères";
        if (!data.code_postal || !/^\d{4,}$/.test(data.code_postal)) return "Le code postal doit être valide (au moins 4 chiffres)";
        if (!data.pays || data.pays.trim().length < 2) return "Le pays est requis";
        if (!data.telephone || !/^\+?[\d\s\-()]{10,}$/.test(data.telephone)) return "Le numéro de téléphone n'est pas valide (au moins 10 chiffres)";
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "L'email n'est pas valide";
        if (data.site_web && !/^https?:\/\/[^\s$.?#].[^\s]*$/.test(data.site_web)) return "L'URL du site web n'est pas valide";
        return '';
    }, []);

    const fetchAgencies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (searchTerm.trim()) params.append('search', searchTerm.trim());
            params.append('page', currentPageAgencies);
            params.append('page_size', itemsPerPage);
            const response = await axios.get(`${API_BASE_URL}/api/agences/?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            const data = Array.isArray(response.data.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
            setAgencies(data);
            setTotalPagesAgencies(response.data.total_pages || Math.ceil(data.length / itemsPerPage));
            if (data.length > 0) {
                setTimeout(() => setAnimateCards(true), 100);
            } else {
                setError('Aucune agence disponible. Veuillez créer une nouvelle agence ou vérifier votre connexion.');
            }
            updateStats(data);
        } catch (err) {
            console.error('Erreur lors du chargement des agences:', err);
            const errorMsg =
                err.response?.status === 403
                    ? 'Accès refusé. Vous n\'avez pas les permissions nécessaires pour accéder à cette ressource.'
                    : err.response?.status === 404
                    ? 'Aucune agence trouvée.'
                    : err.response?.data?.message || 'Impossible de charger les agences. Vérifiez votre connexion ou le token.';
            setError(errorMsg);
            setAgencies([]);
        } finally {
            setLoading(false);
        }
    }, [token, searchTerm, currentPageAgencies, itemsPerPage]);

    const updateStats = useCallback((agenciesData) => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        setStats({
            totalAgencies: agenciesData.length,
            activeAgencies: agenciesData.filter(agency => agency.active !== false).length,
            recentAgencies: agenciesData.filter(agency => {
                const createdDate = new Date(agency.date_creation || now);
                return createdDate >= thirtyDaysAgo;
            }).length
        });
    }, []);

    const createAgency = useCallback(async () => {
        const validationError = validateAgencyData(formData);
        if (validationError) {
            setError(validationError);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_BASE_URL}/api/agences/`, formData, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Agence créée avec succès !');
            resetForm();
            setModalState({ type: null, data: null });
            fetchAgencies();
            if (user && !user.agence && ['admin', 'agence'].includes(user.role)) {
                await assignAgencyToUser(response.data.id);
            }
        } catch (err) {
            console.error('Erreur lors de la création:', err);
            setError(err.response?.data?.message || "Erreur lors de la création de l'agence. Vérifiez vos permissions.");
        } finally {
            setLoading(false);
        }
    }, [formData, token, user, fetchAgencies]);

    const updateAgency = useCallback(async () => {
        const validationError = validateAgencyData(formData);
        if (validationError) {
            setError(validationError);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await axios.put(`${API_BASE_URL}/api/agences/${selectedAgency.id}/`, formData, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Agence mise à jour avec succès !');
            resetForm();
            setModalState({ type: null, data: null });
            fetchAgencies();
        } catch (err) {
            console.error('Erreur lors de la mise à jour:', err);
            setError(err.response?.data?.message || "Erreur lors de la mise à jour de l'agence. Vérifiez vos permissions.");
        } finally {
            setLoading(false);
        }
    }, [formData, selectedAgency, token, fetchAgencies]);

    const deleteAgency = useCallback(async (agencyId) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cette agence ? Cette action est irréversible.')) {
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/api/agences/${agencyId}/`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Agence supprimée avec succès !');
            fetchAgencies();
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            setError(err.response?.data?.message || "Erreur lors de la suppression de l'agence. Vérifiez s'il y a des véhicules ou utilisateurs associés.");
        } finally {
            setLoading(false);
        }
    }, [token, fetchAgencies]);

    const assignAgencyToUser = useCallback(async (agencyId) => {
        if (loading) return;
        if (!token) {
            setError("Aucun token d'authentification trouvé. Veuillez vous reconnecter.");
            setModalState({ type: null, data: null });
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await axios.patch(`${API_BASE_URL}/api/users/update_agence/`, { agence_id: agencyId }, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Agence assignée avec succès ! Veuillez vous reconnecter.');
            fetchAgencies();
        } catch (err) {
            console.error('Erreur lors de l\'assignation:', err);
            setError(err.response?.data?.message || "Erreur lors de l'assignation de l'agence.");
        } finally {
            setLoading(false);
            setModalState({ type: null, data: null });
        }
    }, [token, fetchAgencies]);

    const resetForm = useCallback(() => {
        setFormData({
            nom: '',
            adresse: '',
            ville: '',
            code_postal: '',
            pays: '',
            telephone: '',
            email: '',
            site_web: '',
            description: ''
        });
        setSelectedAgency(null);
        setIsEditMode(false);
    }, []);

    const handleFormChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    }, []);

    const openEditForm = useCallback((agency) => {
        setSelectedAgency(agency);
        setIsEditMode(true);
        setFormData({
            nom: agency.nom || '',
            adresse: agency.adresse || '',
            ville: agency.ville || '',
            code_postal: agency.code_postal || '',
            pays: agency.pays || '',
            telephone: agency.telephone || '',
            email: agency.email || '',
            site_web: agency.site_web || '',
            description: agency.description || ''
        });
        setModalState({ type: 'edit', data: agency });
    }, []);

    const openDetailsModal = useCallback((agency) => {
        setModalState({ type: 'details', data: agency });
    }, []);

    const openCreateForm = useCallback(() => {
        resetForm();
        setModalState({ type: 'create', data: null });
    }, [resetForm]);

    const openAssignModal = useCallback(() => {
        if (agencies.length === 0) {
            setError('Aucune agence disponible. Créez une agence d\'abord.');
            return;
        }
        setModalState({ type: 'assign', data: null });
    }, [agencies.length]);

    const closeModal = useCallback(() => {
        setModalState({ type: null, data: null });
        resetForm();
    }, [resetForm]);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
        setCurrentPageAgencies(1);
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (isEditMode) {
            await updateAgency();
        } else {
            await createAgency();
        }
    }, [isEditMode, createAgency, updateAgency]);

    const handleAssignSubmit = useCallback(async (e) => {
        e.preventDefault();
        const agencyId = e.target.agency_id.value;
        if (!agencyId) {
            setError('Veuillez sélectionner une agence.');
            return;
        }
        await assignAgencyToUser(agencyId);
    }, [assignAgencyToUser]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    }, [closeModal]);

    useEffect(() => {
        fetchAgencies();
    }, [fetchAgencies]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 8000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (modalState.type) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [modalState.type, handleKeyDown]);

    const filteredAgencies = useMemo(() => {
        return agencies.filter(agency => {
            if (!agency) return false;
            const nom = (agency.nom || '').toLowerCase();
            const ville = (agency.ville || '').toLowerCase();
            const codePostal = (agency.code_postal || '').toLowerCase();
            const pays = (agency.pays || '').toLowerCase();
            const search = searchTerm.toLowerCase();
            return nom.includes(search) || ville.includes(search) || codePostal.includes(search) || pays.includes(search);
        });
    }, [agencies, searchTerm]);

    const currentAgencies = useMemo(() => {
        const indexOfLastAgency = currentPageAgencies * itemsPerPage;
        const indexOfFirstAgency = indexOfLastAgency - itemsPerPage;
        return filteredAgencies.slice(indexOfFirstAgency, indexOfLastAgency);
    }, [filteredAgencies, currentPageAgencies, itemsPerPage]);

    const particles = useMemo(() => {
        const particlesArray = [];
        for (let i = 0; i < 20; i++) {
            particlesArray.push(
                <div
                    key={i}
                    className="particle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 10}s`,
                        animationDuration: `${10 + Math.random() * 5}s`,
                        width: `${2 + Math.random() * 4}px`,
                        height: `${2 + Math.random() * 4}px`,
                    }}
                />
            );
        }
        return particlesArray;
    }, []);

    return (
        <div className="agency-manager-container">
            <div className="floating-particles">{particles}</div>

            <Sidebar
                token={token}
                user={user}
                setToken={() => {}}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />

            <div className="dashboard-content">
                <div className="stats-dashboard">
                    <div className="dashboard-header">
                        <h1 className="dashboard-title">
                            <i className="fas fa-building"></i> Gestion des Agences
                        </h1>
                        <p className="dashboard-subtitle">Gérez les agences de votre réseau</p>
                    </div>

                    {error && (
                        <div className="error-container" role="alert" aria-live="assertive">
                            <i className="fas fa-exclamation-triangle"></i>
                            <p className="error-text">{error}</p>
                            <button
                                onClick={() => setError(null)}
                                className="close-alert"
                                aria-label="Fermer l'alerte d'erreur"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    {success && (
                        <div className="success-alert" role="alert" aria-live="polite">
                            <i className="fas fa-check-circle"></i>
                            <span>{success}</span>
                            <button
                                onClick={() => setSuccess(null)}
                                className="close-alert"
                                aria-label="Fermer l'alerte de succès"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                    )}

                    <div className="stats-grid">
                        <div className={`stat-card ${animateCards ? 'animate-in' : ''}`}>
                            <div className="stat-icon icon-total">
                                <i className="fas fa-building"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.totalAgencies}</div>
                                <div className="stat-label">Total Agences</div>
                                <div className="stat-description">Nombre total d'agences</div>
                            </div>
                        </div>
                        <div className={`stat-card ${animateCards ? 'animate-in' : ''}`}>
                            <div className="stat-icon" style={{ background: 'var(--success-green)' }}>
                                <i className="fas fa-check-circle"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.activeAgencies}</div>
                                <div className="stat-label">Agences Actives</div>
                                <div className="stat-description">Agences en activité</div>
                            </div>
                        </div>
                        <div className={`stat-card ${animateCards ? 'animate-in' : ''}`}>
                            <div className="stat-icon" style={{ background: 'var(--warning-yellow)' }}>
                                <i className="fas fa-plus-circle"></i>
                            </div>
                            <div className="stat-content">
                                <div className="stat-number">{stats.recentAgencies}</div>
                                <div className="stat-label">Nouvelles (30j)</div>
                                <div className="stat-description">Agences créées récemment</div>
                            </div>
                        </div>
                    </div>

                    {user && user.agence ? (
                        <div className="user-agency-section">
                            <div className="user-agency-card">
                                <h3 className="user-agency-title">
                                    <i className="fas fa-user-tie"></i> Mon Agence
                                </h3>
                                <div className="user-agency-info">
                                    <div className="user-agency-name">
                                        <i className="fas fa-building"></i> <strong>{user.agence.nom || 'N/A'}</strong>
                                    </div>
                                    <div className="user-agency-location">
                                        <i className="fas fa-map-marker-alt"></i> {user.agence.ville || 'N/A'}, {user.agence.pays || 'N/A'}
                                    </div>
                                    <div className="user-agency-contact">
                                        <i className="fas fa-envelope"></i> {user.agence.email || 'N/A'}
                                    </div>
                                    <div className="user-agency-phone">
                                        <i className="fas fa-phone"></i> {user.agence.telephone || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="user-agency-section">
                            <div className="user-agency-card">
                                <h3 className="user-agency-title">
                                    <i className="fas fa-user-tie"></i> Mon Agence
                                </h3>
                                <p>
                                    Aucune agence associée.{' '}
                                    <button
                                        onClick={openAssignModal}
                                        className="assign-agency-btn"
                                        disabled={agencies.length === 0}
                                        aria-label="Assigner une agence à mon compte"
                                    >
                                        Assigner une agence
                                    </button>
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="controls-section">
                        <div className="controls-header">
                            <h3 className="controls-title">
                                <i className="fas fa-search"></i> Recherche
                            </h3>
                            <button
                                onClick={openCreateForm}
                                className="add-agency-btn"
                                disabled={loading}
                                aria-label="Créer une nouvelle agence"
                            >
                                <i className="fas fa-plus"></i> Nouvelle Agence
                            </button>
                        </div>
                        <div className="controls-grid">
                            <div className="search-bar">
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="Rechercher par nom, ville, code postal..."
                                    value={searchTerm}
                                    onChange={handleSearchChange}
                                    aria-label="Rechercher des agences"
                                />
                                <i className="fas fa-search search-icon" aria-hidden="true"></i>
                            </div>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <h3 className="quick-actions-title">
                            <i className="fas fa-bolt"></i> Actions Rapides
                        </h3>
                        <div className="quick-actions-grid">
                            <button
                                onClick={fetchAgencies}
                                className="quick-action-card"
                                disabled={loading}
                                aria-label="Actualiser les données des agences"
                            >
                                <div className="quick-action-icon">
                                    <i className="fas fa-sync"></i>
                                </div>
                                <div>
                                    <div className="quick-action-title">Actualiser</div>
                                    <div className="quick-action-description">Recharger les données</div>
                                </div>
                            </button>
                            <button
                                onClick={openCreateForm}
                                className="quick-action-card"
                                disabled={loading}
                                aria-label="Ajouter une nouvelle agence"
                            >
                                <div className="quick-action-icon">
                                    <i className="fas fa-plus"></i>
                                </div>
                                <div>
                                    <div className="quick-action-title">Ajouter</div>
                                    <div className="quick-action-description">Nouvelle agence</div>
                                </div>
                            </button>
                            <button
                                onClick={openAssignModal}
                                className="quick-action-card"
                                disabled={loading || agencies.length === 0}
                                aria-label="Assigner une agence à mon compte"
                            >
                                <div className="quick-action-icon">
                                    <i className="fas fa-user-plus"></i>
                                </div>
                                <div>
                                    <div className="quick-action-title">Assigner Agence</div>
                                    <div className="quick-action-description">Associer une agence à mon compte</div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="agencies-section">
                        <div className="agencies-header">
                            <h3 className="agencies-title">
                                <i className="fas fa-list"></i> Liste des Agences
                            </h3>
                        </div>
                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>Chargement...</p>
                            </div>
                        ) : filteredAgencies.length === 0 ? (
                            <div className="empty-state">
                                <i className="fas fa-inbox empty-icon" aria-hidden="true"></i>
                                <h4>Aucune agence trouvée</h4>
                                <p>
                                    {searchTerm
                                        ? "Aucune agence ne correspond à vos critères de recherche."
                                        : "Aucune agence n’a été chargée. Créez une nouvelle agence pour commencer."}
                                </p>
                                {!searchTerm && (
                                    <button
                                        onClick={openCreateForm}
                                        className="add-first-agency-btn"
                                        aria-label="Créer la première agence"
                                    >
                                        <i className="fas fa-plus"></i> Créer la première agence
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="agencies-grid">
                                    {currentAgencies.map((agency, index) => (
                                        <div
                                            key={agency.id}
                                            className={`agency-card ${animateCards ? 'animate-in' : ''}`}
                                            style={{ animationDelay: `${index * 0.1}s` }}
                                        >
                                            <div className="agency-card-header">
                                                <div className="agency-card-icon">
                                                    <i className="fas fa-building"></i>
                                                </div>
                                                <div className="agency-card-title">
                                                    <h4>{agency.nom || 'Nom inconnu'}</h4>
                                                    <div className="agency-card-id">ID: {agency.id}</div>
                                                </div>
                                            </div>
                                            <div className="agency-card-content">
                                                <div className="agency-card-info">
                                                    <div className="agency-info-item">
                                                        <i className="fas fa-map-marker-alt"></i>
                                                        <span>{agency.ville || 'N/A'}</span>
                                                    </div>
                                                    <div className="agency-info-item">
                                                        <i className="fas fa-envelope"></i>
                                                        <span>{agency.code_postal || 'N/A'}</span>
                                                    </div>
                                                    <div className="agency-info-item">
                                                        <i className="fas fa-flag"></i>
                                                        <span>{agency.pays || 'N/A'}</span>
                                                    </div>
                                                    <div className="agency-info-item">
                                                        <i className="fas fa-phone"></i>
                                                        <span>{agency.telephone || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="agency-card-footer">
                                                <button
                                                    onClick={() => openDetailsModal(agency)}
                                                    className="agency-card-link"
                                                    title="Voir détails"
                                                    aria-label={`Voir les détails de l'agence ${agency.nom || 'inconnue'}`}
                                                >
                                                    <i className="fas fa-eye"></i> Détails
                                                </button>
                                                <div className="agency-card-actions">
                                                    <button
                                                        onClick={() => openEditForm(agency)}
                                                        className="action-btn edit-btn"
                                                        title="Modifier"
                                                        aria-label={`Modifier l'agence ${agency.nom || 'inconnue'}`}
                                                    >
                                                        <i className="fas fa-edit"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAgency(agency.id)}
                                                        className="action-btn delete-btn"
                                                        title="Supprimer"
                                                        aria-label={`Supprimer l'agence ${agency.nom || 'inconnue'}`}
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                    <button
                                                        onClick={() => assignAgencyToUser(agency.id)}
                                                        className="action-btn assign-btn"
                                                        title="Assigner à mon compte"
                                                        aria-label={`Assigner l'agence ${agency.nom || 'inconnue'} à mon compte`}
                                                    >
                                                        <i className="fas fa-user-plus"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {totalPagesAgencies > 1 && (
                                    <div className="pagination-section">
                                        <div className="pagination">
                                            <button
                                                onClick={() => setCurrentPageAgencies(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPageAgencies === 1}
                                                className="pagination-btn"
                                                aria-label="Page précédente"
                                            >
                                                <i className="fas fa-chevron-left"></i> Précédent
                                            </button>
                                            <span className="pagination-info">
                                                Page {currentPageAgencies} sur {totalPagesAgencies}
                                            </span>
                                            <button
                                                onClick={() => setCurrentPageAgencies(prev => Math.min(prev + 1, totalPagesAgencies))}
                                                disabled={currentPageAgencies === totalPagesAgencies}
                                                className="pagination-btn"
                                                aria-label="Page suivante"
                                            >
                                                Suivant <i className="fas fa-chevron-right"></i>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {modalState.type === 'create' || modalState.type === 'edit' ? (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 id="modal-title">
                                <i className={`fas fa-${modalState.type === 'edit' ? 'edit' : 'plus'}`}></i>
                                {modalState.type === 'edit' ? "Modifier l'agence" : 'Nouvelle agence'}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="modal-close"
                                aria-label="Fermer le modal"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="agency-form" aria-labelledby="modal-title">
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="nom">Nom de l'agence <span aria-hidden="true">*</span></label>
                                    <input
                                        type="text"
                                        id="nom"
                                        name="nom"
                                        value={formData.nom}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: Agence Centrale"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="ville">Ville <span aria-hidden="true">*</span></label>
                                    <input
                                        type="text"
                                        id="ville"
                                        name="ville"
                                        value={formData.ville}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: Ariana"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="adresse">Adresse <span aria-hidden="true">*</span></label>
                                    <input
                                        type="text"
                                        id="adresse"
                                        name="adresse"
                                        value={formData.adresse}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: 123 Rue de la Paix"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="code_postal">Code postal <span aria-hidden="true">*</span></label>
                                    <input
                                        type="text"
                                        id="code_postal"
                                        name="code_postal"
                                        value={formData.code_postal}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: 2080"
                                        pattern="[0-9]{4}"
                                        maxLength="4"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="pays">Pays <span aria-hidden="true">*</span></label>
                                    <input
                                        type="text"
                                        id="pays"
                                        name="pays"
                                        value={formData.pays}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: Tunisia"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="telephone">Téléphone <span aria-hidden="true">*</span></label>
                                    <input
                                        type="tel"
                                        id="telephone"
                                        name="telephone"
                                        value={formData.telephone}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: +216 12345678"
                                        required
                                        aria-required="true"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: contact@agence.com"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="site_web">Site web</label>
                                    <input
                                        type="url"
                                        id="site_web"
                                        name="site_web"
                                        value={formData.site_web}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Ex: https://www.agence.com"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Description de l'agence..."
                                    rows="4"
                                />
                            </div>
                            {error && (
                                <div className="error-container" role="alert" aria-live="assertive">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <p className="error-text">{error}</p>
                                </div>
                            )}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="cancel-btn"
                                    aria-label="Annuler la création ou modification"
                                >
                                    <i className="fas fa-times"></i> Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                    aria-label={isEditMode ? "Modifier l'agence" : "Créer une nouvelle agence"}
                                >
                                    <i className={`fas fa-${loading ? 'spinner fa-spin' : isEditMode ? 'save' : 'plus'}`}></i>
                                    {loading ? 'Traitement...' : isEditMode ? 'Modifier' : 'Créer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : modalState.type === 'details' && modalState.data ? (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 id="modal-title">
                                <i className="fas fa-building"></i> Détails de l'Agence
                            </h2>
                            <button
                                onClick={closeModal}
                                className="modal-close"
                                aria-label="Fermer le modal"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="agency-details">
                            <h3>{modalState.data.nom || 'Nom inconnu'}</h3>
                            <p><strong>ID:</strong> {modalState.data.id}</p>
                            <p><strong>Adresse:</strong> {modalState.data.adresse || 'N/A'}, {modalState.data.ville || 'N/A'}, {modalState.data.code_postal || 'N/A'}, {modalState.data.pays || 'N/A'}</p>
                            <p><strong>Téléphone:</strong> {modalState.data.telephone || 'N/A'}</p>
                            <p><strong>Email:</strong> {modalState.data.email || 'N/A'}</p>
                            <p><strong>Site Web:</strong> {modalState.data.site_web ? <a href={modalState.data.site_web} target="_blank" rel="noopener noreferrer">{modalState.data.site_web}</a> : 'N/A'}</p>
                            <p><strong>Description:</strong> {modalState.data.description || 'Aucune description'}</p>
                            <p><strong>Statut:</strong> {modalState.data.active !== false ? 'Active' : 'Inactive'}</p>
                            <p><strong>Date de création:</strong> {modalState.data.date_creation ? new Date(modalState.data.date_creation).toLocaleDateString() : 'N/A'}</p>
                            {modalState.data.stats ? (
                                <div className="agency-stats">
                                    <h4>Statistiques</h4>
                                    <p><strong>Véhicules totaux:</strong> {modalState.data.stats.total_vehicules || 0}</p>
                                    <p><strong>Véhicules disponibles:</strong> {modalState.data.stats.vehicules_disponibles || 0}</p>
                                    <p><strong>Réservations actives:</strong> {modalState.data.stats.reservations_actives || 0}</p>
                                    <p><strong>Revenus totaux:</strong> {(modalState.data.stats.revenus_total || 0).toFixed(2)} €</p>
                                </div>
                            ) : (
                                <p>Aucune statistique disponible.</p>
                            )}
                        </div>
                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => assignAgencyToUser(modalState.data.id)}
                                className="submit-btn"
                                aria-label={`Assigner l'agence ${modalState.data.nom || 'inconnue'} à mon compte`}
                            >
                                <i className="fas fa-user-plus"></i> Assigner à mon compte
                            </button>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="cancel-btn"
                                aria-label="Fermer le modal"
                            >
                                <i className="fas fa-times"></i> Fermer
                            </button>
                        </div>
                    </div>
                </div>
            ) : modalState.type === 'assign' ? (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 id="modal-title">
                                <i className="fas fa-user-plus"></i> Assigner une Agence
                            </h2>
                            <button
                                onClick={closeModal}
                                className="modal-close"
                                aria-label="Fermer le modal"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleAssignSubmit} className="agency-form" aria-labelledby="modal-title">
                            <div className="form-group">
                                <label htmlFor="agency_id">Sélectionner une agence <span aria-hidden="true">*</span></label>
                                <select
                                    id="agency_id"
                                    name="agency_id"
                                    className="form-input"
                                    required
                                    aria-required="true"
                                >
                                    <option value="">-- Choisir une agence --</option>
                                    {filteredAgencies.map(agency => (
                                        <option key={agency.id} value={agency.id}>{agency.nom || 'N/A'} ({agency.ville || 'N/A'})</option>
                                    ))}
                                </select>
                            </div>
                            {error && (
                                <div className="error-container" role="alert" aria-live="assertive">
                                    <i className="fas fa-exclamation-triangle"></i>
                                    <p className="error-text">{error}</p>
                                </div>
                            )}
                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="cancel-btn"
                                    aria-label="Annuler l'assignation"
                                >
                                    <i className="fas fa-times"></i> Annuler
                                </button>
                                <button
                                    type="submit"
                                    className="submit-btn"
                                    disabled={loading}
                                    aria-label="Assigner l'agence sélectionnée"
                                >
                                    <i className={`fas fa-${loading ? 'spinner fa-spin' : 'user-plus'}`}></i>
                                    {loading ? 'Traitement...' : 'Assigner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default AgencyManager;