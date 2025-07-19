
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './AgentVehicleManager.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const VEHICLE_ENDPOINT = `${API_BASE_URL}/api/vehicules/`;

const TypeVehicule = {
    VOITURE: 'voiture',
    MOTO: 'moto',
    CAMION: 'camion',
    VELO: 'velo'
};

const StatutVehicule = {
    DISPONIBLE: 'disponible',
    LOUE: 'loué',
    MAINTENANCE: 'maintenance',
    HORS_SERVICE: 'hors_service'
};

const VehicleManager = () => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [animateCards, setAnimateCards] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [formData, setFormData] = useState({
        id: null,
        marque: '',
        modele: '',
        type: TypeVehicule.VOITURE,
        carburant: 'essence',
        transmission: 'manuelle',
        nombre_places: 5,
        annee: null,
        kilometrage: null,
        couleur: '',
        immatriculation: '',
        emissionsCO2: null,
        consommationEnergie: null,
        prix_par_jour: null,
        localisation: '',
        description: '',
        climatisation: false,
        equipements: [],
        statut: StatutVehicule.DISPONIBLE,
        date_derniere_maintenance: null,
        prochaine_maintenance: null,
        image: null
    });

    const calculerScoreEcologique = (vehicle) => {
        if (!vehicle.emissionsCO2 || !vehicle.consommationEnergie) return 0;
        const emissionScore = Math.max(0, 100 - vehicle.emissionsCO2 / 2);
        const consumptionScore = Math.max(0, 100 - vehicle.consommationEnergie * 10);
        return (emissionScore + consumptionScore) / 2;
    };

    const verifierDisponibilite = (vehicle) => {
        return vehicle.statut === StatutVehicule.DISPONIBLE;
    };

    const planifierMaintenance = async (vehicle) => {
        try {
            await axios.patch(`${VEHICLE_ENDPOINT}${vehicle.id}/`, {
statut: StatutVehicule.MAINTENANCE
}, { timeout: 10000 });
setSuccess('Maintenance planifiée avec succès !');
fetchVehicles();
} catch (err) {
    console.error('Maintenance error:', err.response || err);
    setError(err.response?.status === 404
        ? 'Erreur : Endpoint de maintenance non trouvé. Vérifiez la configuration de l\'API.'
        : err.response?.status === 500
            ? 'Erreur serveur : Impossible de planifier la maintenance. Contactez l\'administrateur.'
            : err.response?.data?.message || 'Erreur lors de la planification de maintenance');
}
};

const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        console.log('Fetching vehicles from:', VEHICLE_ENDPOINT);
        const response = await axios.get(VEHICLE_ENDPOINT, { timeout: 10000 });
        const data = Array.isArray(response.data.results) ? response.data.results : Array.isArray(response.data) ? response.data : [];
        setVehicles(data);
        if (data.length > 0) {
            setTimeout(() => setAnimateCards(true), 100);
        }
    } catch (err) {
        console.error('Fetch vehicles error:', err.response || err);
        setError(err.response?.status === 404
            ? 'Erreur : Endpoint /api/vehicules/ non trouvé. Vérifiez la configuration de l\'API.'
            : err.response?.status === 500
                ? 'Erreur serveur : Impossible de charger les véhicules. Contactez l\'administrateur.'
                : err.response?.data?.message || 'Impossible de charger les véhicules.');
        setVehicles([]);
    } finally {
        setLoading(false);
    }
}, []);

const validateVehicleData = (data) => {
    if (!data.marque || data.marque.trim().length < 1) return "La marque est requise";
    if (!data.modele || data.modele.trim().length < 1) return "Le modèle est requis";
    if (!data.prix_par_jour || isNaN(parseFloat(data.prix_par_jour)) || data.prix_par_jour < 0)
        return "Le prix par jour doit être un nombre positif";
    if (!['voiture', 'moto', 'camion', 'velo'].includes(data.type.toLowerCase()))
        return "Type de véhicule invalide";
    if (!['disponible', 'loué', 'maintenance', 'hors_service'].includes(data.statut))
        return "Statut de véhicule invalide";
    if (data.emissionsCO2 && (isNaN(parseFloat(data.emissionsCO2)) || data.emissionsCO2 < 0))
        return "Les émissions CO2 doivent être un nombre positif";
    if (data.consommationEnergie && (isNaN(parseFloat(data.consommationEnergie)) || data.consommationEnergie < 0))
        return "La consommation d'énergie doit être un nombre positif";
    if (data.nombre_places && (isNaN(parseInt(data.nombre_places)) || data.nombre_places < 1))
        return "Le nombre de places doit être un entier positif";
    if (data.annee && (isNaN(parseInt(data.annee)) || data.annee < 1900 || data.annee > new Date().getFullYear() + 1))
        return "L'année doit être valide";
    if (data.kilometrage && (isNaN(parseInt(data.kilometrage)) || data.kilometrage < 0))
        return "Le kilométrage doit être un nombre positif";
    return '';
};

const createVehicle = async () => {
    const validationError = validateVehicleData(formData);
    if (validationError) {
        setError(validationError);
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const vehicleData = {
            ...formData,
            prix_par_jour: parseFloat(formData.prix_par_jour),
            emissionsCO2: formData.emissionsCO2 ? parseInt(formData.emissionsCO2) : null,
            consommationEnergie: formData.consommationEnergie ? parseFloat(formData.consommationEnergie) : null,
            nombre_places: formData.nombre_places ? parseInt(formData.nombre_places) : 5,
            annee: formData.annee ? parseInt(formData.annee) : null,
            kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : null,
            equipements: formData.equipements.length > 0 ? formData.equipements : [],
        };
        console.log('Creating vehicle with data:', vehicleData);
        await axios.post(VEHICLE_ENDPOINT, vehicleData, { timeout: 10000 });
        setSuccess('Véhicule créé avec succès !');
        resetForm();
        setShowModal(false);
        fetchVehicles();
    } catch (err) {
        console.error('Create vehicle error:', err.response || err);
        setError(err.response?.status === 404
            ? 'Erreur : Endpoint /api/vehicules/ non trouvé pour la création. Vérifiez la configuration de l\'API.'
            : err.response?.status === 500
                ? 'Erreur serveur : Impossible de créer le véhicule. Contactez l\'administrateur.'
                : err.response?.data?.message || 'Erreur lors de la création du véhicule');
    } finally {
        setLoading(false);
    }
};

const updateVehicle = async () => {
    const validationError = validateVehicleData(formData);
    if (validationError) {
        setError(validationError);
        return;
    }
    setLoading(true);
    setError(null);
    try {
        const vehicleData = {
            ...formData,
            prix_par_jour: parseFloat(formData.prix_par_jour),
            emissionsCO2: formData.emissionsCO2 ? parseInt(formData.emissionsCO2) : null,
            consommationEnergie: formData.consommationEnergie ? parseFloat(formData.consommationEnergie) : null,
            nombre_places: formData.nombre_places ? parseInt(formData.nombre_places) : 5,
            annee: formData.annee ? parseInt(formData.annee) : null,
            kilometrage: formData.kilometrage ? parseInt(formData.kilometrage) : null,
            equipements: formData.equipements.length > 0 ? formData.equipements : [],
        };
        console.log('Updating vehicle with data:', vehicleData);
        await axios.put(`${VEHICLE_ENDPOINT}${selectedVehicle.id}/`, vehicleData, { timeout: 10000 });
        setSuccess('Véhicule mis à jour avec succès !');
        resetForm();
        setShowModal(false);
        fetchVehicles();
    } catch (err) {
        console.error('Update vehicle error:', err.response || err);
        setError(err.response?.status === 404
            ? 'Erreur : Endpoint /api/vehicules/ non trouvé pour la mise à jour. Vérifiez la configuration de l\'API.'
            : err.response?.status === 500
                ? 'Erreur serveur : Impossible de mettre à jour le véhicule. Contactez l\'administrateur.'
                : err.response?.data?.message || 'Erreur lors de la mise à jour du véhicule');
    } finally {
        setLoading(false);
    }
};

const deleteVehicle = async (vehicleId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce véhicule ? Cette action est irréversible.')) {
        return;
    }
    setLoading(true);
    setError(null);
    try {
        console.log('Deleting vehicle with ID:', vehicleId);
        await axios.delete(`${VEHICLE_ENDPOINT}${vehicleId}/`, { timeout: 10000 });
        setSuccess('Véhicule supprimé avec succès !');
        fetchVehicles();
    } catch (err) {
        console.error('Delete vehicle error:', err.response || err);
        setError(err.response?.status === 404
            ? 'Erreur : Endpoint /api/vehicules/ non trouvé pour la suppression. Vérifiez la configuration de l\'API.'
            : err.response?.status === 500
                ? 'Erreur serveur : Impossible de supprimer le véhicule. Contactez l\'administrateur.'
                : err.response?.data?.message || 'Erreur lors de la suppression du véhicule');
    } finally {
        setLoading(false);
    }
};

const resetForm = () => {
    setFormData({
        id: null,
        marque: '',
        modele: '',
        type: TypeVehicule.VOITURE,
        carburant: 'essence',
        transmission: 'manuelle',
        nombre_places: 5,
        annee: null,
        kilometrage: null,
        couleur: '',
        immatriculation: '',
        emissionsCO2: null,
        consommationEnergie: null,
        prix_par_jour: null,
        localisation: '',
        description: '',
        climatisation: false,
        equipements: [],
        statut: StatutVehicule.DISPONIBLE,
        date_derniere_maintenance: null,
        prochaine_maintenance: null,
        image: null
    });
    setSelectedVehicle(null);
    setIsEditMode(false);
};

const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
};

const openEditForm = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsEditMode(true);
    setFormData({
        id: vehicle.id,
        marque: vehicle.marque || '',
        modele: vehicle.modele || '',
        type: vehicle.type || TypeVehicule.VOITURE,
        carburant: vehicle.carburant || 'essence',
        transmission: vehicle.transmission || 'manuelle',
        nombre_places: vehicle.nombre_places || 5,
        annee: vehicle.annee || null,
        kilometrage: vehicle.kilometrage || null,
        couleur: vehicle.couleur || '',
        immatriculation: vehicle.immatriculation || '',
        emissionsCO2: vehicle.emissionsCO2 || null,
        consommationEnergie: vehicle.consommationEnergie || null,
        prix_par_jour: vehicle.prix_par_jour || null,
        localisation: vehicle.localisation || '',
        description: vehicle.description || '',
        climatisation: vehicle.climatisation || false,
        equipements: vehicle.equipements || [],
        statut: vehicle.statut || StatutVehicule.DISPONIBLE,
        date_derniere_maintenance: vehicle.date_derniere_maintenance || null,
        prochaine_maintenance: vehicle.prochaine_maintenance || null,
        image: vehicle.image || null
    });
    setShowModal(true);
};

const openDetailsModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDetailsModal(true);
};

const openCreateForm = () => {
    resetForm();
    setShowModal(true);
};

const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
};

const handleSubmit = async (e) => {
    e.preventDefault();
    if (isEditMode) {
        await updateVehicle();
    } else {
        await createVehicle();
    }
};

const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
};

useEffect(() => {
    fetchVehicles();
}, [fetchVehicles]);

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
    if (showModal || showDetailsModal) {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }
}, [showModal, showDetailsModal]);

const filteredVehicles = vehicles.filter(vehicle =>
        vehicle && (
            (vehicle.marque || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.modele || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.prix_par_jour || '').toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
);

const indexOfLastVehicle = currentPage * itemsPerPage;
const indexOfFirstVehicle = indexOfLastVehicle - itemsPerPage;
const currentVehicles = filteredVehicles.slice(indexOfFirstVehicle, indexOfLastVehicle);
const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage);

const generateParticles = () => {
    const particles = [];
    for (let i = 0; i < 20; i++) {
        particles.push(
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
    return particles;
};

const closeModal = () => {
    setShowModal(false);
    setShowDetailsModal(false);
    resetForm();
};

return (
    <div className="vehicle-manager-container">
        <div className="floating-particles">{generateParticles()}</div>

        <div className="dashboard-header">
            <h1 className="dashboard-title">
                <i className="fas fa-car"></i> Gestion des Véhicules
            </h1>
            <p className="dashboard-subtitle">Gérez les véhicules de la flotte</p>
        </div>

        {error && (
            <div className="error-container">
                <i className="fas fa-exclamation-triangle"></i>
                <p>{error}</p>
                <button onClick={() => setError(null)} className="close-alert" aria-label="Fermer l'alerte">
                    <i className="fas fa-times"></i>
                </button>
            </div>
        )}

        {success && (
            <div className="success-alert">
                <i className="fas fa-check-circle"></i>
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="close-alert" aria-label="Fermer l'alerte">
                    <i className="fas fa-times"></i>
                </button>
            </div>
        )}

        <div className="controls-section">
            <div className="controls-header">
                <h3 className="controls-title">
                    <i className="fas fa-search"></i> Recherche
                </h3>
                <button onClick={openCreateForm} className="add-vehicle-btn" disabled={loading}>
                    <i className="fas fa-plus"></i> Nouveau Véhicule
                </button>
            </div>
            <div className="controls-grid">
                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher par marque, modèle, prix..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                    <i className="fas fa-search search-icon"></i>
                </div>
            </div>
        </div>

        {loading ? (
            <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Chargement...</p>
            </div>
        ) : filteredVehicles.length === 0 ? (
            <div className="empty-state">
                <i className="fas fa-car empty-icon"></i>
                <h4>Aucun véhicule trouvé</h4>
                <p>
                    {searchTerm
                        ? "Aucun véhicule ne correspond à vos critères de recherche."
                        : "Aucun véhicule n'a été chargé. Ajoutez un nouveau véhicule."
                    }
                </p>
                {!searchTerm && (
                    <button onClick={openCreateForm} className="add-first-vehicle-btn">
                        <i className="fas fa-plus"></i> Ajouter le premier véhicule
                    </button>
                )}
            </div>
        ) : (
            <>
                <div className="vehicles-table-section">
                    <div className="table-wrapper">
                        <table className="vehicles-table">
                            <thead>
                            <tr>
                                <th>Marque</th>
                                <th>Modèle</th>
                                <th>Type</th>
                                <th>Prix</th>
                                <th>Statut</th>
                                <th>Score Écologique</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {currentVehicles.map((vehicle) => (
                                <tr key={vehicle.id} className="vehicle-row">
                                    <td>{vehicle.marque}</td>
                                    <td>{vehicle.modele}</td>
                                    <td>{vehicle.type}</td>
                                    <td>{vehicle.prix_par_jour} €</td>
                                    <td>
                                            <span className={`status-badge ${verifierDisponibilite(vehicle) ? 'disponible' : 'indisponible'}`}>
                                                {vehicle.statut}
                                            </span>
                                    </td>
                                    <td>{calculerScoreEcologique(vehicle).toFixed(1)}/100</td>
                                    <td className="vehicle-actions">
                                        <button
                                            onClick={() => openDetailsModal(vehicle)}
                                            className="action-btn view-btn"
                                            title="Détails"
                                        >
                                            <i className="fas fa-eye"></i>
                                        </button>
                                        <button
                                            onClick={() => openEditForm(vehicle)}
                                            className="action-btn edit-btn"
                                            title="Modifier"
                                        >
                                            <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                            onClick={() => planifierMaintenance(vehicle)}
                                            className="action-btn maintenance-btn"
                                            title="Planifier maintenance"
                                        >
                                            <i className="fas fa-wrench"></i>
                                        </button>
                                        <button
                                            onClick={() => deleteVehicle(vehicle.id)}
                                            className="action-btn delete-btn"
                                            title="Supprimer"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                {totalPages > 1 && (
                    <div className="pagination-section">
                        <div className="pagination">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="pagination-btn"
                            >
                                <i className="fas fa-chevron-left"></i> Précédent
                            </button>
                            <span className="pagination-info">
                                    Page {currentPage} sur {totalPages}
                                </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="pagination-btn"
                            >
                                Suivant <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                )}
            </>
        )}

        {showModal && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>
                            <i className={`fas fa-${isEditMode ? 'edit' : 'plus'}`}></i>
                            {isEditMode ? "Modifier le véhicule" : 'Nouveau véhicule'}
                        </h2>
                        <button onClick={closeModal} className="modal-close" aria-label="Fermer">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="vehicle-form">
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="marque">Marque *</label>
                                <input
                                    type="text"
                                    id="marque"
                                    name="marque"
                                    value={formData.marque}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: Toyota"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="modele">Modèle *</label>
                                <input
                                    type="text"
                                    id="modele"
                                    name="modele"
                                    value={formData.modele}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: Corolla"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="type">Type *</label>
                                <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    required
                                >
                                    {Object.entries(TypeVehicule).map(([key, value]) => (
                                        <option key={key} value={value}>{value}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="carburant">Carburant *</label>
                                <select
                                    id="carburant"
                                    name="carburant"
                                    value={formData.carburant}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    required
                                >
                                    <option value="électrique">Électrique</option>
                                    <option value="hybride">Hybride</option>
                                    <option value="essence">Essence</option>
                                    <option value="diesel">Diesel</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="transmission">Transmission *</label>
                                <select
                                    id="transmission"
                                    name="transmission"
                                    value={formData.transmission}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    required
                                >
                                    <option value="manuelle">Manuelle</option>
                                    <option value="automatique">Automatique</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="nombre_places">Nombre de places</label>
                                <input
                                    type="number"
                                    id="nombre_places"
                                    name="nombre_places"
                                    value={formData.nombre_places || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 5"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="annee">Année</label>
                                <input
                                    type="number"
                                    id="annee"
                                    name="annee"
                                    value={formData.annee || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 2023"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="kilometrage">Kilométrage</label>
                                <input
                                    type="number"
                                    id="kilometrage"
                                    name="kilometrage"
                                    value={formData.kilometrage || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 50000"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="couleur">Couleur</label>
                                <input
                                    type="text"
                                    id="couleur"
                                    name="couleur"
                                    value={formData.couleur}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: Bleu"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="immatriculation">Immatriculation</label>
                                <input
                                    type="text"
                                    id="immatriculation"
                                    name="immatriculation"
                                    value={formData.immatriculation}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: ABC-123-XYZ"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="emissionsCO2">Émissions CO2 (g/km)</label>
                                <input
                                    type="number"
                                    id="emissionsCO2"
                                    name="emissionsCO2"
                                    value={formData.emissionsCO2 || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 120"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="consommationEnergie">Consommation (L/100km)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    id="consommationEnergie"
                                    name="consommationEnergie"
                                    value={formData.consommationEnergie || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 6.5"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="prix_par_jour">Prix par jour (€) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    id="prix_par_jour"
                                    name="prix_par_jour"
                                    value={formData.prix_par_jour || ''}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: 50.00"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="localisation">Localisation</label>
                                <input
                                    type="text"
                                    id="localisation"
                                    name="localisation"
                                    value={formData.localisation}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Ex: Paris, France"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="Description du véhicule"
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="climatisation">
                                    <input
                                        type="checkbox"
                                        id="climatisation"
                                        name="climatisation"
                                        checked={formData.climatisation}
                                        onChange={handleFormChange}
                                    />
                                    Climatisation
                                </label>
                            </div>
                            <div className="form-group">
                                <label htmlFor="statut">Statut *</label>
                                <select
                                    id="statut"
                                    name="statut"
                                    value={formData.statut}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    required
                                >
                                    {Object.entries(StatutVehicule).map(([key, value]) => (
                                        <option key={key} value={value}>{value}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="button" onClick={closeModal} className="btn-secondary">
                                <i className="fas fa-times"></i> Annuler
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading}>
                                <i className={`fas fa-${loading ? 'spinner fa-spin' : isEditMode ? 'save' : 'plus'}`}></i>
                                {loading ? 'Traitement...' : isEditMode ? 'Modifier' : 'Créer'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {showDetailsModal && selectedVehicle && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>
                            <i className="fas fa-car"></i> Détails du Véhicule
                        </h2>
                        <button onClick={closeModal} className="modal-close" aria-label="Fermer">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="vehicle-details">
                        <h3>{selectedVehicle.marque} {selectedVehicle.modele}</h3>
                        <p><strong>ID:</strong> {selectedVehicle.id}</p>
                        <p><strong>Type:</strong> {selectedVehicle.type}</p>
                        <p><strong>Carburant:</strong> {selectedVehicle.carburant}</p>
                        <p><strong>Transmission:</strong> {selectedVehicle.transmission}</p>
                        <p><strong>Nombre de places:</strong> {selectedVehicle.nombre_places}</p>
                        <p><strong>Année:</strong> {selectedVehicle.annee || 'N/A'}</p>
                        <p><strong>Kilométrage:</strong> {selectedVehicle.kilometrage || 'N/A'} km</p>
                        <p><strong>Couleur:</strong> {selectedVehicle.couleur || 'N/A'}</p>
                        <p><strong>Immatriculation:</strong> {selectedVehicle.immatriculation || 'N/A'}</p>
                        <p><strong>Prix:</strong> {selectedVehicle.prix_par_jour} €/jour</p>
                        <p><strong>Émissions CO2:</strong> {selectedVehicle.emissionsCO2 || 'N/A'} g/km</p>
                        <p><strong>Consommation:</strong> {selectedVehicle.consommationEnergie || 'N/A'} L/100km</p>
                        <p><strong>Localisation:</strong> {selectedVehicle.localisation || 'N/A'}</p>
                        <p><strong>Statut:</strong> {selectedVehicle.statut}</p>
                        <p><strong>Score Écologique:</strong> {calculerScoreEcologique(selectedVehicle).toFixed(1)}/100</p>
                        <p><strong>Disponible:</strong> {verifierDisponibilite(selectedVehicle) ? 'Oui' : 'Non'}</p>
                        <p><strong>Climatisation:</strong> {selectedVehicle.climatisation ? 'Oui' : 'Non'}</p>
                        <p><strong>Description:</strong> {selectedVehicle.description || 'N/A'}</p>
                    </div>
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => planifierMaintenance(selectedVehicle)}
                            className="btn-warning"
                        >
                            <i className="fas fa-wrench"></i> Planifier Maintenance
                        </button>
                        <button type="button" onClick={closeModal} className="btn-secondary">
                            <i className="fas fa-times"></i> Fermer
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

export default VehicleManager;
