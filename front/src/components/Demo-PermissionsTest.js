// Demo-PermissionsTest.js - Composant de test pour les permissions CRUD
import React, { useState } from 'react';
import EcoChallenges from './EcoChallenges';

const PermissionsDemo = () => {
    const [currentUser, setCurrentUser] = useState({
        id: 1,
        username: 'admin_test',
        email: 'admin@vitarenta.com',
        role: 'admin'
    });
    
    const [token] = useState('demo-token-12345');

    // Utilisateurs de test
    const testUsers = {
        admin: {
            id: 1,
            username: 'admin_test',
            email: 'admin@vitarenta.com',
            role: 'admin',
            name: 'Administrateur Test'
        },
        agence: {
            id: 2,
            username: 'agence_test',
            email: 'agence@vitarenta.com',
            role: 'agence',
            name: 'Gestionnaire Agence'
        },
        client: {
            id: 3,
            username: 'client_test',
            email: 'client@vitarenta.com',
            role: 'client',
            name: 'Client Participant'
        }
    };

    const switchUser = (role) => {
        setCurrentUser(testUsers[role]);
    };

    const handleLogout = () => {
        console.log('Déconnexion simulée');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
            {/* Barre de test pour changer de rôle */}
            <div style={{
                background: '#1f2937',
                color: 'white',
                padding: '10px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #374151'
            }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
                        🧪 Mode Test - Système de Permissions CRUD
                    </h3>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
                        Connecté en tant que : <strong>{currentUser.name}</strong> ({currentUser.role})
                    </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => switchUser('admin')}
                        style={{
                            background: currentUser.role === 'admin' ? '#7c3aed' : '#4b5563',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        👑 Admin
                    </button>
                    
                    <button
                        onClick={() => switchUser('agence')}
                        style={{
                            background: currentUser.role === 'agence' ? '#2563eb' : '#4b5563',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        🏢 Agence
                    </button>
                    
                    <button
                        onClick={() => switchUser('client')}
                        style={{
                            background: currentUser.role === 'client' ? '#10b981' : '#4b5563',
                            color: 'white',
                            border: 'none',
                            padding: '8px 15px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}
                    >
                        👤 Client
                    </button>
                </div>
            </div>

            {/* Informations sur les permissions actuelles */}
            <div style={{
                background: currentUser.role === 'admin' ? '#7c3aed' 
                         : currentUser.role === 'agence' ? '#2563eb' 
                         : '#10b981',
                color: 'white',
                padding: '15px 20px',
                margin: '0'
            }}>
                <h4 style={{ margin: '0 0 8px 0' }}>
                    Permissions pour le rôle "{currentUser.role.toUpperCase()}" :
                </h4>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {currentUser.role === 'admin' && (
                        <div>
                            ✅ Créer des défis • ✅ Modifier des défis • ✅ Supprimer des défis • 
                            ✅ Activer/Désactiver • ✅ Participer aux défis • ✅ Gestion complète
                        </div>
                    )}
                    {currentUser.role === 'agence' && (
                        <div>
                            ✅ Créer des défis • ✅ Modifier des défis • ✅ Supprimer des défis • 
                            ✅ Activer/Désactiver • ✅ Participer aux défis • ✅ Gestion complète
                        </div>
                    )}
                    {currentUser.role === 'client' && (
                        <div>
                            ❌ Pas de création • ❌ Pas de modification • ❌ Pas de suppression • 
                            ✅ Participer aux défis • ✅ Abandonner ses défis • 📊 Voir ses statistiques
                        </div>
                    )}
                </div>
            </div>

            {/* Composant principal des défis */}
            <EcoChallenges 
                token={token}
                user={currentUser}
                onLogout={handleLogout}
            />

            {/* Guide d'utilisation */}
            <div style={{
                background: 'white',
                margin: '20px',
                padding: '20px',
                borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}>
                <h3 style={{ margin: '0 0 15px 0', color: '#374151' }}>
                    🎯 Guide de Test des Permissions
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                    <div>
                        <h4 style={{ color: '#7c3aed' }}>👑 Mode Administrateur</h4>
                        <ul style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <li>Voir le header d'administration violet</li>
                            <li>Bouton "➕ Créer un Défi" disponible</li>
                            <li>Boutons ✏️🔴🗑️ sur chaque défi</li>
                            <li>Modals de création et modification</li>
                            <li>Toutes les fonctionnalités activées</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 style={{ color: '#2563eb' }}>🏢 Mode Agence</h4>
                        <ul style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <li>Même interface que l'admin</li>
                            <li>Gestion complète des défis</li>
                            <li>Peut créer, modifier, supprimer</li>
                            <li>Accès aux statistiques globales</li>
                            <li>Badge "Gestionnaire Agence"</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h4 style={{ color: '#10b981' }}>👤 Mode Client</h4>
                        <ul style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                            <li>Pas de header d'administration</li>
                            <li>Seuls les boutons de participation</li>
                            <li>Interface simplifiée et claire</li>
                            <li>Focus sur l'expérience utilisateur</li>
                            <li>Statistiques personnelles uniquement</li>
                        </ul>
                    </div>
                </div>
                
                <div style={{ 
                    marginTop: '20px', 
                    padding: '15px', 
                    background: '#f3f4f6', 
                    borderRadius: '8px',
                    borderLeft: '4px solid #10b981'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#059669' }}>
                        💡 Instructions de Test
                    </h4>
                    <ol style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                        <li>Utilisez les boutons en haut pour changer de rôle</li>
                        <li>Observez les différences d'interface selon le rôle</li>
                        <li>Testez la création de défis (Admin/Agence uniquement)</li>
                        <li>Essayez la participation aux défis (tous les rôles)</li>
                        <li>Vérifiez les boutons d'administration par rôle</li>
                    </ol>
                </div>
            </div>
        </div>
    );
};

export default PermissionsDemo;
