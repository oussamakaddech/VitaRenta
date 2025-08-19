import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AgencyMap.css';

// Configuration de l'icône par défaut de Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icône personnalisée pour les agences
const createCustomIcon = (color = '#3b82f6') => {
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                background-color: ${color};
                width: 20px;
                height: 20px;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <i class="fas fa-building" style="color: white; font-size: 10px;"></i>
            </div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10]
    });
};

// Composant pour ajuster la vue de la carte
const MapViewAdjuster = ({ agencies }) => {
    const map = useMap();

    useEffect(() => {
        if (agencies.length > 0) {
            const bounds = L.latLngBounds();
            agencies.forEach(agency => {
                if (agency.coordinates) {
                    bounds.extend([agency.coordinates.lat, agency.coordinates.lng]);
                }
            });
            
            if (bounds.isValid()) {
                map.fitBounds(bounds, { padding: [20, 20] });
            }
        } else {
            // Recentrer sur la Tunisie si aucune agence
            map.setView([34.0, 9.0], 7);
        }
    }, [agencies, map]);

    return null;
};

// Fonction pour obtenir des coordonnées approximatives basées sur la ville et le pays
const getApproximateCoordinates = (ville, pays, codePostal) => {
    // Base de données étendue de coordonnées pour les villes tunisiennes
    const cityCoordinates = {
        'tunis': { lat: 36.8065, lng: 10.1815 },
        'sfax': { lat: 34.7405, lng: 10.7603 },
        'sousse': { lat: 35.8256, lng: 10.6089 },
        'kairouan': { lat: 35.6781, lng: 10.0963 },
        'bizerte': { lat: 37.2744, lng: 9.8739 },
        'gabes': { lat: 33.8815, lng: 10.0982 },
        'ariana': { lat: 36.8625, lng: 10.1647 },
        'gafsa': { lat: 34.425, lng: 8.784 },
        'monastir': { lat: 35.7643, lng: 10.8113 },
        'ben arous': { lat: 36.7469, lng: 10.2306 },
        'medenine': { lat: 33.3548, lng: 10.5055 },
        'nabeul': { lat: 36.4561, lng: 10.7376 },
        'tataouine': { lat: 32.9297, lng: 10.4518 },
        'beja': { lat: 36.7256, lng: 9.1816 },
        'jendouba': { lat: 36.5011, lng: 8.7803 },
        'mahdia': { lat: 35.5047, lng: 11.0622 },
        'sidi bouzid': { lat: 35.0381, lng: 9.4858 },
        'siliana': { lat: 36.0836, lng: 9.3708 },
        'tozeur': { lat: 33.9197, lng: 8.1335 },
        'zaghouan': { lat: 36.4025, lng: 10.1425 },
        'kasserine': { lat: 35.1675, lng: 8.8362 },
        'kef': { lat: 36.1699, lng: 8.7049 },
        'kebili': { lat: 33.7049, lng: 8.9690 },
        // Ajout de quartiers et zones spécifiques de Tunis
        'carthage': { lat: 36.8530, lng: 10.3286 },
        'sidi bou said': { lat: 36.8708, lng: 10.3469 },
        'manouba': { lat: 36.8103, lng: 10.0956 },
        'mornag': { lat: 36.6769, lng: 10.2306 },
        'hammam lif': { lat: 36.7297, lng: 10.3386 },
        'rades': { lat: 36.7658, lng: 10.2764 },
        // Autres villes importantes
        'djerba': { lat: 33.8076, lng: 10.8451 },
        'houmt souk': { lat: 33.8756, lng: 10.8575 },
        'zarzis': { lat: 33.5044, lng: 11.1122 },
        'douz': { lat: 33.4667, lng: 9.0167 }
    };

    const normalizedCity = ville.toLowerCase().trim();
    
    // Chercher d'abord une correspondance exacte
    if (cityCoordinates[normalizedCity]) {
        return addRandomOffset(cityCoordinates[normalizedCity]);
    }

    // Chercher une correspondance partielle
    for (const [city, coords] of Object.entries(cityCoordinates)) {
        if (normalizedCity.includes(city) || city.includes(normalizedCity)) {
            return addRandomOffset(coords);
        }
    }

    // Essayer avec des variantes de noms
    const variations = {
        'tunis': ['tunis', 'capital', 'capitale'],
        'sfax': ['sfax', 'sefax'],
        'sousse': ['sousse', 'susa', 'sousa'],
        'bizerte': ['bizerte', 'bizerta', 'benzart'],
        'gabes': ['gabes', 'gabès', 'qabis'],
        'kairouan': ['kairouan', 'kayrawan', 'al-kayrawan']
    };

    for (const [mainCity, variants] of Object.entries(variations)) {
        if (variants.some(variant => normalizedCity.includes(variant))) {
            return addRandomOffset(cityCoordinates[mainCity]);
        }
    }

    // Coordonnées par défaut pour la Tunisie (centre du pays) avec offset aléatoire
    return addRandomOffset({ lat: 34.0, lng: 9.0 });
};

// Ajouter un offset aléatoire pour éviter que les marqueurs se chevauchent
const addRandomOffset = (coords) => {
    const offsetRange = 0.05; // ~5km d'offset maximum
    return {
        lat: coords.lat + (Math.random() - 0.5) * offsetRange,
        lng: coords.lng + (Math.random() - 0.5) * offsetRange
    };
};

const AgencyMap = ({ agencies = [], onAgencySelect, selectedAgency, showDemo = false }) => {
    const [mapError, setMapError] = useState(null);

    // Données de démonstration pour les agences
    const demoAgencies = [
        {
            id: 'demo-1',
            nom: 'VitaRenta Tunis Centre',
            adresse: 'Avenue Habib Bourguiba',
            ville: 'Tunis',
            code_postal: '1000',
            pays: 'Tunisie',
            telephone: '+216 71 123 456',
            email: 'tunis@vitarenta.tn',
            active: true,
            coordinates: { lat: 36.8065, lng: 10.1815 }
        },
        {
            id: 'demo-2',
            nom: 'VitaRenta Sfax',
            adresse: 'Avenue Ali Bourguiba',
            ville: 'Sfax',
            code_postal: '3000',
            pays: 'Tunisie',
            telephone: '+216 74 234 567',
            email: 'sfax@vitarenta.tn',
            active: true,
            coordinates: { lat: 34.7405, lng: 10.7603 }
        },
        {
            id: 'demo-3',
            nom: 'VitaRenta Sousse',
            adresse: 'Boulevard Mohamed V',
            ville: 'Sousse',
            code_postal: '4000',
            pays: 'Tunisie',
            telephone: '+216 73 345 678',
            email: 'sousse@vitarenta.tn',
            active: true,
            coordinates: { lat: 35.8256, lng: 10.6089 }
        },
        {
            id: 'demo-4',
            nom: 'VitaRenta Bizerte',
            adresse: 'Rue de la République',
            ville: 'Bizerte',
            code_postal: '7000',
            pays: 'Tunisie',
            telephone: '+216 72 456 789',
            email: 'bizerte@vitarenta.tn',
            active: false,
            coordinates: { lat: 37.2744, lng: 9.8739 }
        }
    ];

    // Utiliser les données de démonstration si demandé et qu'il n'y a pas d'agences réelles
    const agenciesToShow = showDemo && agencies.length === 0 ? demoAgencies : agencies;

    // Ajouter des coordonnées aux agences qui n'en ont pas
    const agenciesWithCoordinates = useMemo(() => {
        return agenciesToShow.map(agency => {
            if (!agency.coordinates && agency.ville && agency.pays) {
                return {
                    ...agency,
                    coordinates: getApproximateCoordinates(agency.ville, agency.pays, agency.code_postal)
                };
            }
            return agency;
        });
    }, [agenciesToShow]);

    const defaultCenter = [36.8065, 10.1815]; // Tunis par défaut
    const defaultZoom = 7;

    const handleMarkerClick = (agency) => {
        if (onAgencySelect) {
            onAgencySelect(agency);
        }
    };

    const getMarkerColor = (agency) => {
        if (selectedAgency && selectedAgency.id === agency.id) {
            return '#ef4444'; // Rouge pour l'agence sélectionnée
        }
        return agency.active !== false ? '#10b981' : '#6b7280'; // Vert pour active, gris pour inactive
    };

    if (mapError) {
        return (
            <div className="map-error">
                <i className="fas fa-exclamation-triangle"></i>
                <p>Erreur lors du chargement de la carte</p>
                <button onClick={() => setMapError(null)} className="retry-btn">
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="agency-map-container">
            {showDemo && agenciesToShow === demoAgencies && (
                <div className="demo-notice">
                    <i className="fas fa-info-circle"></i>
                    <span>Aperçu avec des données de démonstration - Créez vos agences pour voir les vraies données</span>
                </div>
            )}
            
            <div className="map-header">
                <h3>
                    <i className="fas fa-map-marker-alt"></i>
                    Localisation des Agences
                    <span className="agency-count">
                        ({agenciesWithCoordinates.length} agence{agenciesWithCoordinates.length > 1 ? 's' : ''})
                    </span>
                </h3>
                <div className="map-legend">
                    <span className="legend-item">
                        <span className="legend-marker active"></span>
                        Active
                    </span>
                    <span className="legend-item">
                        <span className="legend-marker inactive"></span>
                        Inactive
                    </span>
                    <span className="legend-item">
                        <span className="legend-marker selected"></span>
                        Sélectionnée
                    </span>
                </div>
            </div>
            
            <div className="map-wrapper">
                <MapContainer
                    center={defaultCenter}
                    zoom={defaultZoom}
                    style={{ height: '100%', width: '100%' }}
                    className="agency-map"
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                    
                    <MapViewAdjuster agencies={agenciesWithCoordinates} />
                    
                    {agenciesWithCoordinates.map(agency => {
                        if (!agency.coordinates) return null;
                        
                        return (
                            <Marker
                                key={agency.id}
                                position={[agency.coordinates.lat, agency.coordinates.lng]}
                                icon={createCustomIcon(getMarkerColor(agency))}
                                eventHandlers={{
                                    click: () => handleMarkerClick(agency)
                                }}
                            >
                                <Popup>
                                    <div className="popup-content">
                                        <h4>{agency.nom}</h4>
                                        <p><strong>Adresse:</strong> {agency.adresse}</p>
                                        <p><strong>Ville:</strong> {agency.ville}, {agency.code_postal}</p>
                                        <p><strong>Pays:</strong> {agency.pays}</p>
                                        {agency.telephone && (
                                            <p><strong>Téléphone:</strong> {agency.telephone}</p>
                                        )}
                                        {agency.email && (
                                            <p><strong>Email:</strong> {agency.email}</p>
                                        )}
                                        <p><strong>Statut:</strong> 
                                            <span className={`status ${agency.active !== false ? 'active' : 'inactive'}`}>
                                                {agency.active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </p>
                                        <div className="popup-actions">
                                            <button 
                                                onClick={() => handleMarkerClick(agency)}
                                                className="popup-btn"
                                            >
                                                <i className="fas fa-eye"></i> Voir détails
                                            </button>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>
            
            {agenciesWithCoordinates.length === 0 && (
                <div className="no-agencies-message">
                    <i className="fas fa-info-circle"></i>
                    <p>Aucune agence à afficher sur la carte</p>
                </div>
            )}
        </div>
    );
};

export default AgencyMap;
