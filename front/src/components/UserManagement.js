import React, { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import axios from 'axios';
import './UserManagement.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const UserManagement = ({ token, user, onLogout }) => {
    if (!token || !user || user.role !== 'admin') {
        return <Navigate to="/unauthorized" replace />;
    }

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${API_BASE_URL}/api/users/`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setUsers(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            console.error('Erreur lors du chargement des utilisateurs:', err);
            setError(err.response?.data?.message || 'Impossible de charger les utilisateurs.');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const updateUserRole = async (userId, newRole) => {
        setLoading(true);
        setError(null);
        try {
            await axios.patch(`${API_BASE_URL}/api/users/${userId}/`, { role: newRole }, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Rôle mis à jour avec succès !');
            fetchUsers();
        } catch (err) {
            console.error('Erreur lors de la mise à jour du rôle:', err);
            setError(err.response?.data?.message || 'Erreur lors de la mise à jour du rôle.');
        } finally {
            setLoading(false);
        }
    };

    const deleteUser = async (userId) => {
        if (!window.confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
        setLoading(true);
        setError(null);
        try {
            await axios.delete(`${API_BASE_URL}/api/users/${userId}/`, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 10000
            });
            setSuccess('Utilisateur supprimé avec succès !');
            fetchUsers();
        } catch (err) {
            console.error('Erreur lors de la suppression:', err);
            setError(err.response?.data?.message || 'Erreur lors de la suppression de l\'utilisateur.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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

    return (
        <div className="user-management-container">
            <div className="dashboard-header">
                <h1 className="dashboard-title">
                    <i className="fas fa-users"></i> Gestion des Utilisateurs
                </h1>
                <p className="dashboard-subtitle">Gérez les utilisateurs du système</p>
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

            {loading ? (
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Chargement...</p>
                </div>
            ) : users.length === 0 ? (
                <div className="empty-state">
                    <i className="fas fa-users empty-icon"></i>
                    <h4>Aucun utilisateur trouvé</h4>
                    <p>Aucun utilisateur n’a été chargé.</p>
                </div>
            ) : (
                <div className="users-table-section">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Email</th>
                                <th>Rôle</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id}>
                                    <td>{u.nom || 'N/A'}</td>
                                    <td>{u.email}</td>
                                    <td>
                                        <select
                                            value={u.role}
                                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                                            disabled={loading || u.id === user.id}
                                        >
                                            <option value="client">Client</option>
                                            <option value="agent">Agent</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => deleteUser(u.id)}
                                            className="action-btn delete-btn"
                                            title="Supprimer"
                                            disabled={loading || u.id === user.id}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserManagement;