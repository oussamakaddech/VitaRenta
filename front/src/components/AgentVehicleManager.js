import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from './Sidebar';
import './AgentVehicleManager.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const VEHICLE_ENDPOINT = `${API_BASE_URL}/api/vehicules/`;

const StatutVehicule = {
    DISPONIBLE: 'disponible',
    LOUE: 'loué',
    MAINTENANCE: 'maintenance',
    HORS_SERVICE: 'hors_service'
};

// Composant ImageFallback réutilisable et amélioré
const ImageFallback = ({ src, alt, marque = '', modele = '', className = '' }) => {
    const [imgSrc, setImgSrc] = useState(src);
    const [isLoading, setIsLoading] = useState(true);
    const [imgKey, setImgKey] = useState(0);
    const [isDataUri, setIsDataUri] = useState(src.startsWith('data:'));

    // SVG de fallback en base64
    const svgFallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIyMCIgdmlld0JveD0iMCAwIDQwMCAyMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxkZWZzPgo8bGluZWFyR3JhZGllbnQgaWQ9ImdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzQzNjFlZTtzdG9wLW9wYWNpdHk6MSIgLz4KPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojM2YzN2M5O3N0b3Atb3BhY2l0eToxIiAvPgo8L2xpbmVhckdyYWRpZW50Pgo8L2RlZnM+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjIwIiBmaWxsPSJ1cmwoI2dyYWRpZW50KSIvPgo8cGF0aCBkPSJNODAgMTYwTDEzMCAxMjBMMTgwIDE2MEwyMzAgMTIwTDI4MCAxNjBMMzMwIDEyMEwzODAgMTYwVjE4MEgzMDBWMjAwSDEwMFYxODBIMTBWMTYwWiIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpIi8+CjxwYXRoIGQ9Ik04MCAxNjBMMTMwIDEyMEwxODAgMTYwTDIzMCAxMjBMMjgwIDE2MEwzMzAgMTIwTDM4MCAxNjBWMTgwSDMwMFYyMDBIMTBWMTgwSDEwVjE2MFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjcpIiBzdHJva2Utd2lkdGg9IjIiLz4KPGNpcmNsZSBjeD0iMzUwIiBjeT0iNjAiIHI9IjMwIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPGNpcmNsZSBjeD0iNTAiIGN5PSI0MCIgcj0iMjAiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSIvPgo8Y2lyY2xlIGN4PSIxNTAiIGN5PSI3MCIgcj0iMjUiIGZpbGw9InJnYmEoMjU1LCAyNTUsIDI1NSwgMC4xKSIvPgo8dGV4dCB4PSIyMDAiIHk9IjExMCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE4IiBmb250LXdlaWdodD0iYm9sZCIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjgpIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj7QpNC10LzQtdC90LXQvdC40Y8KPC90ZXh0Pgo8dGV4dCB4PSIyMDAiIHk9IjE0MCIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNikiIHRleHQtYW5jaG9yPSJtaWRkbGUiPuKIkOKAjOKIkOKAjeKIkOKAjOKIkOKAjeKIkOKAjeKIkOKAjOKIkOKAjOKIkOKAjOKIkOKAjOKIkOKAjTwvdGV4dD4KPHBhdGggZD0iTTgwIDQwTDEwMCAyMEwxMjAgNDBNMTgwIDQwTDIwMCAyMEwyMjAgNDBNMjgwIDQwTDMwMCAyMEwzMjAgNDBNMzgwIDQwTDQwMCAyMEw0MjAgNDAiIHN0cm9rZT0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjMpIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';

    // Générer une URL de fallback pour les voitures
    const getCarImageUrl = useCallback(() => {
        if (marque && modele) {
            return `https://source.unsplash.com/400x220/?${encodeURIComponent(`${marque} ${modele} car`)}&auto=format&fit=crop&w=400&h=220`;
        }
        return `https://source.unsplash.com/400x220/?car&auto=format&fit=crop&w=400&h=220`;
    }, [marque, modele]);

    const handleError = useCallback((e) => {
        if (isDataUri) {
            e.target.onerror = null; // Prevent infinite error loop
            return;
        }
        setImgSrc(svgFallback);
        setIsDataUri(true);
        console.debug(`Image failed for ${marque} ${modele}, using SVG fallback`);
    }, [marque, modele, svgFallback, isDataUri]);

    const handleLoad = useCallback(() => {
        setIsLoading(false);
    }, []);

    // Effet pour forcer le rechargement si la source change
    useEffect(() => {
        setImgSrc(src);
        setIsLoading(true);
        setIsDataUri(src.startsWith('data:'));
        setImgKey(prev => prev + 1);
    }, [src]);

    return (
        <div className={`image-container ${className}`}>
            {isLoading && (
                <div className="image-loading-placeholder">
                    <div className="image-loading-spinner"></div>
                </div>
            )}
            <img
                key={imgKey}
                src={imgSrc}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                className={`vehicle-image ${isLoading ? 'loading' : ''}`}
                loading="lazy"
            />
        </div>
    );
};

const VehicleManager = ({ token, user, onLogout }) => {
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(8);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [vehicleToDelete, setVehicleToDelete] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [formData, setFormData] = useState({
        marque: '',
        modele: '',
        carburant: 'essence',
        transmission: 'manuelle',
        nombre_places: 5,
        annee: '',
        kilometrage: '',
        couleur: '',
        immatriculation: '',
        emissionsCO2: '',
        consommationEnergie: '',
        prix_par_jour: '',
        localisation: '',
        description: '',
        statut: StatutVehicule.DISPONIBLE,
        date_derniere_maintenance: '',
        prochaine_maintenance: '',
        image: null,
        agence_id: user?.role === 'agence' && user?.agence?.id ? user.agence.id : ''
    });

    // Fonction pour obtenir l'URL de l'image avec fallback
    const getImageUrl = useCallback((imagePath, marque = '', modele = '') => {
        if (!imagePath) {
            return `https://source.unsplash.com/400x220/?${encodeURIComponent(`${marque} ${modele} car`)}&auto=format&fit=crop&w=400&h=220`;
        }
        if (imagePath.startsWith('http')) {
            return imagePath;
        }
        return `${API_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
    }, []);

    const calculerScoreEcologique = (vehicle) => {
        if (!vehicle.emissionsCO2 || !vehicle.consommationEnergie) return 0;
        const emissionScore = Math.max(0, 100 - vehicle.emissionsCO2 / 2);
        const consumptionScore = Math.max(0, 100 - vehicle.consommationEnergie * 10);
        return (emissionScore + consumptionScore) / 2;
    };

    const verifierDisponibilite = (vehicle) => {
        return vehicle.statut === StatutVehicule.DISPONIBLE;
    };

    const fetchVehicles = useCallback(async () => {
        if (!token || !user) {
            setError('Vous devez être connecté pour accéder aux véhicules.');
            navigate('/login');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(VEHICLE_ENDPOINT, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });

            const data = Array.isArray(response.data.results) 
                ? response.data.results.map(vehicle => ({
                    ...vehicle,
                    image: getImageUrl(vehicle.image, vehicle.marque, vehicle.modele)
                }))
                : Array.isArray(response.data)
                ? response.data.map(vehicle => ({
                    ...vehicle,
                    image: getImageUrl(vehicle.image, vehicle.marque, vehicle.modele)
                }))
                : [];

            setVehicles(data);
        } catch (err) {
            console.error('Fetch vehicles error:', err.response || err);
            const status = err.response?.status;
            let errorMsg;
            if (status === 401) {
                errorMsg = 'Session expirée ou non autorisée. Veuillez vous reconnecter.';
                onLogout();
                navigate('/login');
            } else if (status === 403) {
                errorMsg = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
            } else if (status === 404) {
                errorMsg = 'Aucun véhicule trouvé.';
            } else {
                errorMsg = err.response?.data?.message || 'Impossible de charger les véhicules.';
            }
            setError(errorMsg);
            setVehicles([]);
        } finally {
            setLoading(false);
        }
    }, [token, user, navigate, onLogout, getImageUrl]);

    const validateVehicleData = (data) => {
        if (!data.marque || data.marque.trim().length < 1) return "La marque est requise";
        if (!data.modele || data.modele.trim().length < 1) return "Le modèle est requis";
        if (!data.prix_par_jour || isNaN(parseFloat(data.prix_par_jour)) || parseFloat(data.prix_par_jour) < 0)
            return "Le prix par jour doit être un nombre positif";
        if (!Object.values(StatutVehicule).includes(data.statut))
            return "Statut de véhicule invalide";
        if (data.emissionsCO2 && (isNaN(parseFloat(data.emissionsCO2)) || parseFloat(data.emissionsCO2) < 0))
            return "Les émissions CO2 doivent être un nombre positif";
        if (data.consommationEnergie && (isNaN(parseFloat(data.consommationEnergie)) || parseFloat(data.consommationEnergie) < 0))
            return "La consommation d'énergie doit être un nombre positif";
        if (data.nombre_places && (isNaN(parseInt(data.nombre_places)) || parseInt(data.nombre_places) < 1))
            return "Le nombre de places doit être un entier positif";
        if (data.annee && (isNaN(parseInt(data.annee)) || parseInt(data.annee) < 1900 || parseInt(data.annee) > new Date().getFullYear() + 1))
            return "L'année doit être valide";
        if (data.kilometrage && (isNaN(parseInt(data.kilometrage)) || parseInt(data.kilometrage) < 0))
            return "Le kilométrage doit être un nombre positif";
        if (data.date_derniere_maintenance && !isValidDate(data.date_derniere_maintenance))
            return "La date de dernière maintenance doit être valide";
        if (data.prochaine_maintenance && !isValidDate(data.prochaine_maintenance))
            return "La date de prochaine maintenance doit être valide";
        if (user?.role === 'agence' && !data.agence_id)
            return "L'identifiant de l'agence est requis pour les utilisateurs d'agence";
        return '';
    };

    const isValidDate = (dateString) => {
        const date = new Date(dateString);
        return date instanceof Date && !isNaN(date);
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
            const formDataToSend = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== '') {
                    formDataToSend.append(key, value);
                }
            });
            await axios.post(VEHICLE_ENDPOINT, formDataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 10000
            });
            setSuccess('Véhicule créé avec succès !');
            resetForm();
            setShowModal(false);
            fetchVehicles();
        } catch (err) {
            console.error('Create vehicle error:', err.response || err);
            const status = err.response?.status;
            let errorMsg = err.response?.data?.message || 'Erreur lors de la création du véhicule.';
            if (status === 401) {
                errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                onLogout();
                navigate('/login');
            } else if (err.response?.data?.immatriculation) {
                errorMsg = 'Un véhicule avec cette immatriculation existe déjà.';
            }
            setError(errorMsg);
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
            const formDataToSend = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (value !== null && value !== '') {
                    formDataToSend.append(key, value);
                }
            });
            await axios.put(`${VEHICLE_ENDPOINT}${selectedVehicle.id}/`, formDataToSend, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 10000
            });
            setSuccess('Véhicule mis à jour avec succès !');
            resetForm();
            setShowModal(false);
            fetchVehicles();
        } catch (err) {
            console.error('Update vehicle error:', err.response || err);
            const status = err.response?.status;
            let errorMsg = err.response?.data?.message || 'Erreur lors de la mise à jour du véhicule.';
            if (status === 401) {
                errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                onLogout();
                navigate('/login');
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const deleteVehicle = async (vehicleId) => {
        setLoading(true);
        setError(null);
        try {
            await axios.delete(`${VEHICLE_ENDPOINT}${vehicleId}/`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Véhicule supprimé avec succès !');
            fetchVehicles();
            setShowDeleteConfirmModal(false);
            setVehicleToDelete(null);
        } catch (err) {
            console.error('Delete vehicle error:', err.response || err);
            const status = err.response?.status;
            let errorMsg = err.response?.data?.message || 'Erreur lors de la suppression du véhicule.';
            if (status === 401) {
                errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                onLogout();
                navigate('/login');
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const planifierMaintenance = async (vehicle) => {
        setLoading(true);
        setError(null);
        try {
            await axios.patch(
                `${VEHICLE_ENDPOINT}${vehicle.id}/`,
                { statut: StatutVehicule.MAINTENANCE },
                { headers: { Authorization: `Bearer ${token}` }, timeout: 10000 }
            );
            setSuccess('Maintenance planifiée avec succès !');
            fetchVehicles();
        } catch (err) {
            console.error('Maintenance error:', err.response || err);
            const status = err.response?.status;
            let errorMsg = err.response?.data?.message || 'Erreur lors de la planification de maintenance.';
            if (status === 401) {
                errorMsg = 'Session expirée. Veuillez vous reconnecter.';
                onLogout();
                navigate('/login');
            }
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const confirmDeleteVehicle = (vehicle) => {
        setVehicleToDelete(vehicle);
        setShowDeleteConfirmModal(true);
    };

    const resetForm = () => {
        setFormData({
            marque: '',
            modele: '',
            carburant: 'essence',
            transmission: 'manuelle',
            nombre_places: 5,
            annee: '',
            kilometrage: '',
            couleur: '',
            immatriculation: '',
            emissionsCO2: '',
            consommationEnergie: '',
            prix_par_jour: '',
            localisation: '',
            description: '',
            statut: StatutVehicule.DISPONIBLE,
            date_derniere_maintenance: '',
            prochaine_maintenance: '',
            image: null,
            agence_id: user?.role === 'agence' && user?.agence?.id ? user.agence.id : ''
        });
        setSelectedVehicle(null);
        setIsEditMode(false);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : type === 'file' ? files[0] : value
        }));
    };

    const openEditForm = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsEditMode(true);
        setFormData({
            marque: vehicle.marque || '',
            modele: vehicle.modele || '',
            carburant: vehicle.carburant || 'essence',
            transmission: vehicle.transmission || 'manuelle',
            nombre_places: vehicle.nombre_places || 5,
            annee: vehicle.annee || '',
            kilometrage: vehicle.kilometrage || '',
            couleur: vehicle.couleur || '',
            immatriculation: vehicle.immatriculation || '',
            emissionsCO2: vehicle.emissionsCO2 || '',
            consommationEnergie: vehicle.consommationEnergie || '',
            prix_par_jour: vehicle.prix_par_jour || '',
            localisation: vehicle.localisation || '',
            description: vehicle.description || '',
            statut: vehicle.statut || StatutVehicule.DISPONIBLE,
            date_derniere_maintenance: vehicle.date_derniere_maintenance || '',
            prochaine_maintenance: vehicle.prochaine_maintenance || '',
            image: null,
            agence_id: vehicle.agence_id || (user?.role === 'agence' && user?.agence?.id ? user.agence.id : '')
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
        const sanitizedValue = e.target.value.replace(/[<>]/g, '');
        setSearchTerm(sanitizedValue);
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
        if (!token || !user || !['agent', 'admin', 'agence'].includes(user.role)) {
            setError('Accès réservé aux agents, administrateurs ou utilisateurs d\'agence.');
            navigate('/login');
            return;
        }
        fetchVehicles();
    }, [fetchVehicles, token, user, navigate]);

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
        if (showModal || showDetailsModal || showDeleteConfirmModal) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [showModal, showDetailsModal, showDeleteConfirmModal]);

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

    const stats = useMemo(() => {
        return {
            total: vehicles.length,
            available: vehicles.filter(v => v.statut === StatutVehicule.DISPONIBLE).length,
            rented: vehicles.filter(v => v.statut === StatutVehicule.LOUE).length,
            maintenance: vehicles.filter(v => v.statut === StatutVehicule.MAINTENANCE).length
        };
    }, [vehicles]);

    const generateParticles = () => {
        const particles = [];
        for (let i = 0; i < 20; i++) {
            particles.push(
                <div
                    key={`particle-${i}`}
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
            particles.push(
                <div
                    key={`sparkle-${i}`}
                    className="sparkle"
                    style={{
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        width: `${4 + Math.random() * 4}px`,
                        height: `${4 + Math.random() * 4}px`,
                    }}
                />
            );
        }
        return particles;
    };

    const closeModal = () => {
        setShowModal(false);
        setShowDetailsModal(false);
        setShowDeleteConfirmModal(false);
        setVehicleToDelete(null);
        resetForm();
    };

    if (!token || !user || !['agent', 'admin', 'agence'].includes(user.role)) {
        return (
            <div className="vehicle-manager-container">
                <div className="floating-particles">{generateParticles()}</div>
                <div className="stats-dashboard">
                    <div className="error-container" role="alert" aria-live="assertive">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p className="error-text">Accès réservé aux agents, administrateurs ou utilisateurs d'agence.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="vehicle-manager-container">
            <div className="floating-particles">{generateParticles()}</div>
            <Sidebar
                token={token}
                user={user}
                setToken={() => {}}
                onLogout={onLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <div className="stats-dashboard">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">
                        <i className="fas fa-car"></i> Gestion des Véhicules
                    </h1>
                    <p className="dashboard-subtitle">Gérez les véhicules de la flotte</p>
                </div>
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon icon-vehicles"><i className="fas fa-car"></i></div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.total}</div>
                            <div className="stat-label">Véhicules Totaux</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon icon-available"><i className="fas fa-check-circle"></i></div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.available}</div>
                            <div className="stat-label">Disponibles</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon icon-rented"><i className="fas fa-key"></i></div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.rented}</div>
                            <div className="stat-label">Loués</div>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon icon-maintenance"><i className="fas fa-wrench"></i></div>
                        <div className="stat-content">
                            <div className="stat-number">{stats.maintenance}</div>
                            <div className="stat-label">En Maintenance</div>
                        </div>
                    </div>
                </div>
                {error && (
                    <div className="error-container" role="alert" aria-live="assertive">
                        <i className="fas fa-exclamation-triangle"></i>
                        <p className="error-text">{error}</p>
                        <button onClick={() => setError(null)} className="close-alert" aria-label="Fermer l'alerte">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                )}
                {success && (
                    <div className="success-alert" role="status" aria-live="polite">
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
                        <button onClick={openCreateForm} className="add-vehicle-btn" disabled={loading} aria-label="Ajouter un nouveau véhicule">
                            <i className="fas fa-plus"></i> Nouveau Véhicule
                        </button>
                    </div>
                    <div className="search-bar">
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Rechercher par marque, modèle, prix..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            aria-label="Rechercher des véhicules"
                        />
                        <i className="fas fa-search search-icon"></i>
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
                            <button onClick={openCreateForm} className="add-first-vehicle-btn" aria-label="Ajouter le premier véhicule">
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
                                            <th>Image</th>
                                            <th>Marque</th>
                                            <th>Modèle</th>
                                            <th>Prix</th>
                                            <th>Statut</th>
                                            <th>Score Écologique</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentVehicles.map((vehicle) => (
                                            <tr key={vehicle.id} className="vehicle-row">
                                                <td className="vehicle-image-cell">
                                                    <ImageFallback 
                                                        src={getImageUrl(vehicle.image, vehicle.marque, vehicle.modele)} 
                                                        alt={`${vehicle.marque} ${vehicle.modele}`}
                                                        marque={vehicle.marque}
                                                        modele={vehicle.modele}
                                                        className="vehicle-thumbnail"
                                                    />
                                                </td>
                                                <td>{vehicle.marque}</td>
                                                <td>{vehicle.modele}</td>
                                                <td className="vehicle-price">{vehicle.prix_par_jour} €</td>
                                                <td>
                                                    <span className={`status-badge status-${vehicle.statut}`}>
                                                        {vehicle.statut}
                                                    </span>
                                                </td>
                                                <td className="eco-score">{calculerScoreEcologique(vehicle).toFixed(1)}/100</td>
                                                <td className="vehicle-actions">
                                                    <button
                                                        onClick={() => openDetailsModal(vehicle)}
                                                        className="vehicle-action-btn action-view"
                                                        title="Voir les détails"
                                                        aria-label={`Voir les détails du véhicule ${vehicle.marque} ${vehicle.modele}`}
                                                    >
                                                        <i className="fas fa-eye"></i> Voir
                                                    </button>
                                                    <button
                                                        onClick={() => openEditForm(vehicle)}
                                                        className="vehicle-action-btn action-edit"
                                                        title="Modifier le véhicule"
                                                        aria-label={`Modifier le véhicule ${vehicle.marque} ${vehicle.modele}`}
                                                    >
                                                        <i className="fas fa-edit"></i> Modifier
                                                    </button>
                                                    <button
                                                        onClick={() => planifierMaintenance(vehicle)}
                                                        className="vehicle-action-btn action-maintenance"
                                                        title="Planifier la maintenance"
                                                        aria-label={`Planifier la maintenance du véhicule ${vehicle.marque} ${vehicle.modele}`}
                                                        disabled={loading}
                                                    >
                                                        <i className={`fas fa-${loading ? 'spinner fa-spin' : 'wrench'}`}></i>
                                                        Maintenance
                                                    </button>
                                                    <button
                                                        onClick={() => confirmDeleteVehicle(vehicle)}
                                                        className="vehicle-action-btn action-delete"
                                                        title="Supprimer le véhicule"
                                                        aria-label={`Supprimer le véhicule ${vehicle.marque} ${vehicle.modele}`}
                                                        disabled={loading}
                                                    >
                                                        <i className={`fas fa-${loading ? 'spinner fa-spin' : 'trash'}`}></i>
                                                        Supprimer
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
                                        aria-label="Aller à la page précédente"
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
                                        aria-label="Aller à la page suivante"
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
                                <button onClick={closeModal} className="modal-close" aria-label="Fermer la modale">
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
                                            aria-required="true"
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
                                            aria-required="true"
                                        />
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
                                            aria-required="true"
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
                                            aria-required="true"
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
                                            aria-required="true"
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
                                            className="form-input form-textarea"
                                            placeholder="Description du véhicule"
                                        />
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
                                            aria-required="true"
                                        >
                                            {Object.entries(StatutVehicule).map(([key, value]) => (
                                                <option key={key} value={value}>{value}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="date_derniere_maintenance">Dernière Maintenance</label>
                                        <input
                                            type="date"
                                            id="date_derniere_maintenance"
                                            name="date_derniere_maintenance"
                                            value={formData.date_derniere_maintenance}
                                            onChange={handleFormChange}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="prochaine_maintenance">Prochaine Maintenance</label>
                                        <input
                                            type="date"
                                            id="prochaine_maintenance"
                                            name="prochaine_maintenance"
                                            value={formData.prochaine_maintenance}
                                            onChange={handleFormChange}
                                            className="form-input"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="image">Image du véhicule</label>
                                        <input
                                            type="file"
                                            id="image"
                                            name="image"
                                            accept="image/*"
                                            onChange={handleFormChange}
                                            className="form-input"
                                        />
                                    </div>
                                    {user?.role === 'agence' && (
                                        <div className="form-group">
                                            <label htmlFor="agence_id">ID de l'Agence *</label>
                                            <input
                                                type="text"
                                                id="agence_id"
                                                name="agence_id"
                                                value={formData.agence_id}
                                                onChange={handleFormChange}
                                                className="form-input"
                                                placeholder="Ex: 123"
                                                required
                                                aria-required="true"
                                                disabled={isEditMode && formData.agence_id}
                                            />
                                        </div>
                                    )}
                                </div>
                                {error && (
                                    <div className="error-container" role="alert" aria-live="assertive">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        <p className="error-text">{error}</p>
                                    </div>
                                )}
                                <div className="form-actions">
                                    <button type="button" onClick={closeModal} className="btn-secondary" aria-label="Annuler la création ou modification">
                                        <i className="fas fa-times"></i> Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={loading}
                                        aria-label={isEditMode ? "Modifier le véhicule" : "Créer le véhicule"}
                                    >
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
                                <button onClick={closeModal} className="modal-close" aria-label="Fermer la modale">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="vehicle-details">
                                <h3>{selectedVehicle.marque} {selectedVehicle.modele}</h3>
                                <div className="vehicle-detail-image-container">
                                    <ImageFallback 
                                        src={getImageUrl(selectedVehicle.image, selectedVehicle.marque, selectedVehicle.modele)} 
                                        alt={`${selectedVehicle.marque} ${selectedVehicle.modele}`}
                                        marque={selectedVehicle.marque}
                                        modele={selectedVehicle.modele}
                                        className="vehicle-detail-image"
                                    />
                                </div>
                                <div className="vehicle-details-grid">
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">ID:</span>
                                        <span className="detail-value">{selectedVehicle.id}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Carburant:</span>
                                        <span className="detail-value">{selectedVehicle.carburant}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Transmission:</span>
                                        <span className="detail-value">{selectedVehicle.transmission}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Nombre de places:</span>
                                        <span className="detail-value">{selectedVehicle.nombre_places || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Année:</span>
                                        <span className="detail-value">{selectedVehicle.annee || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Kilométrage:</span>
                                        <span className="detail-value">{selectedVehicle.kilometrage ? `${selectedVehicle.kilometrage} km` : 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Couleur:</span>
                                        <span className="detail-value">{selectedVehicle.couleur || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Immatriculation:</span>
                                        <span className="detail-value">{selectedVehicle.immatriculation || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Émissions CO2:</span>
                                        <span className="detail-value">{selectedVehicle.emissionsCO2 ? `${selectedVehicle.emissionsCO2} g/km` : 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Consommation:</span>
                                        <span className="detail-value">{selectedVehicle.consommationEnergie ? `${selectedVehicle.consommationEnergie} L/100km` : 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Prix par jour:</span>
                                        <span className="detail-value">{selectedVehicle.prix_par_jour ? `${selectedVehicle.prix_par_jour} €` : 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Localisation:</span>
                                        <span className="detail-value">{selectedVehicle.localisation || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Statut:</span>
                                        <span className={`status-badge status-${selectedVehicle.statut}`}>{selectedVehicle.statut}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Dernière maintenance:</span>
                                        <span className="detail-value">{selectedVehicle.date_derniere_maintenance || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Prochaine maintenance:</span>
                                        <span className="detail-value">{selectedVehicle.prochaine_maintenance || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Agence ID:</span>
                                        <span className="detail-value">{selectedVehicle.agence_id || 'Non spécifié'}</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Score écologique:</span>
                                        <span className="detail-value eco-score">{calculerScoreEcologique(selectedVehicle).toFixed(1)}/100</span>
                                    </div>
                                    <div className="vehicle-detail-item">
                                        <span className="detail-label">Disponibilité:</span>
                                        <span className="detail-value">{verifierDisponibilite(selectedVehicle) ? 'Disponible' : 'Non disponible'}</span>
                                    </div>
                                </div>
                                {selectedVehicle.description && (
                                    <div className="vehicle-description-section">
                                        <h4>Description</h4>
                                        <p>{selectedVehicle.description}</p>
                                    </div>
                                )}
                            </div>
                            <div className="form-actions">
                                <button onClick={closeModal} className="btn-secondary" aria-label="Fermer la modale">
                                    <i className="fas fa-times"></i> Fermer
                                </button>
                                <button
                                    onClick={() => { setShowDetailsModal(false); openEditForm(selectedVehicle); }}
                                    className="btn-primary"
                                    aria-label={`Modifier le véhicule ${selectedVehicle.marque} ${selectedVehicle.modele}`}
                                >
                                    <i className="fas fa-edit"></i> Modifier
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showDeleteConfirmModal && vehicleToDelete && (
                    <div className="modal-overlay" onClick={closeModal}>
                        <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>
                                    <i className="fas fa-trash"></i> Confirmer la suppression
                                </h2>
                                <button onClick={closeModal} className="modal-close" aria-label="Fermer la modale">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>
                                    Êtes-vous sûr de vouloir supprimer le véhicule{' '}
                                    <strong>{vehicleToDelete.marque} {vehicleToDelete.modele}</strong> ?
                                </p>
                                <p>Cette action est irréversible.</p>
                            </div>
                            <div className="form-actions">
                                <button onClick={closeModal} className="btn-secondary" aria-label="Annuler la suppression">
                                    <i className="fas fa-times"></i> Annuler
                                </button>
                                <button
                                    onClick={() => deleteVehicle(vehicleToDelete.id)}
                                    className="btn-danger"
                                    disabled={loading}
                                    aria-label={`Supprimer le véhicule ${vehicleToDelete.marque} ${vehicleToDelete.modele}`}
                                >
                                    <i className={`fas fa-${loading ? 'spinner fa-spin' : 'trash'}`}></i>
                                    {loading ? 'Suppression...' : 'Supprimer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleManager;