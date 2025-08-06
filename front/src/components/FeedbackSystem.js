// src/components/FeedbackSystem.jsx
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import './FeedbackSystem.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const FeedbackSystem = ({ token, user }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [stats, setStats] = useState({ average_rating: 0, total_count: 0 });
    const [newFeedback, setNewFeedback] = useState({ rating: 5, comment: '' });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState(null);
    const [sortBy, setSortBy] = useState('newest');
    const [filterRating, setFilterRating] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);
    const [notification, setNotification] = useState({ show: false, message: '', type: '' });
    
    const axiosConfig = {
        headers: { Authorization: `Bearer ${token}` }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ show: true, message, type });
        setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
    };

    const fetchFeedbacks = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/feedback/`, axiosConfig);
            console.log('Réponse brute:', response.data);
            
            // Gérer les réponses paginées et non paginées
            let data = [];
            if (response.data.results) {
                // Réponse paginée
                data = response.data.results;
            } else if (Array.isArray(response.data)) {
                // Réponse directe
                data = response.data;
            } else {
                console.error('Format de réponse inattendu:', response.data);
                data = [];
            }
            
            console.log('Données traitées:', data);
            setFeedbacks(data);
            
            if (data.length === 0) {
                showNotification('Aucun feedback trouvé pour le moment', 'info');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Erreur lors du chargement des feedbacks';
            setError(errorMsg);
            showNotification(errorMsg, 'error');
            console.error(err);
            setFeedbacks([]);
        }
    }, [token]);

    const fetchStats = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/feedback/stats/`, axiosConfig);
            const data = response.data;
            setStats({
                average_rating: data.average_rating || 0,
                total_count: data.total_count || 0
            });
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Erreur lors du chargement des statistiques';
            setError(errorMsg);
            showNotification(errorMsg, 'error');
            console.error(err);
            setStats({ average_rating: 0, total_count: 0 });
        }
    }, [token]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchFeedbacks(), fetchStats()]);
            setLoading(false);
        };
        loadData();
    }, [fetchFeedbacks, fetchStats]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            if (editingFeedback) {
                await axios.put(
                    `${API_BASE_URL}/api/feedback/${editingFeedback.id}/`, 
                    newFeedback, 
                    axiosConfig
                );
                showNotification('Feedback mis à jour avec succès !');
                setEditingFeedback(null);
            } else {
                await axios.post(`${API_BASE_URL}/api/feedback/`, newFeedback, axiosConfig);
                showNotification('Merci pour votre feedback !');
            }
            
            setNewFeedback({ rating: 5, comment: '' });
            setShowForm(false);
            await fetchFeedbacks();
            await fetchStats();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Erreur lors de l\'envoi du feedback';
            setError(errorMsg);
            showNotification(errorMsg, 'error');
            console.error('Erreur détaillée:', err.response?.data || err.message);
            console.error('Erreur complète:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (feedback) => {
        // Vérifier si le feedback a un ID valide
        if (!feedback.id || feedback.id === 'null' || feedback.id === 'undefined') {
            showNotification('ID du feedback invalide', 'error');
            console.error('Tentative de modification avec un ID invalide:', feedback.id);
            return;
        }
        
        console.log('Modification du feedback:', feedback);
        setNewFeedback({
            rating: feedback.rating,
            comment: feedback.comment
        });
        setEditingFeedback(feedback);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
    console.log('ID reçu pour suppression:', id);
    console.log('Type de l\'ID:', typeof id);
    
    // Vérifier si l'ID est valide
    if (!id || id === 'null' || id === 'undefined' || id === '') {
        showNotification('ID du feedback invalide', 'error');
        console.error('Tentative de suppression avec un ID invalide:', id);
        return;
    }
    
    console.log('Suppression du feedback avec ID:', id);
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce feedback ?')) {
        try {
            const response = await axios.delete(`${API_BASE_URL}/api/feedback/${id}/`, axiosConfig);
            console.log('Réponse de suppression:', response);
            showNotification('Feedback supprimé avec succès');
            await fetchFeedbacks();
            await fetchStats();
        } catch (err) {
            const errorMsg = err.response?.data?.error || 'Erreur lors de la suppression du feedback';
            setError(errorMsg);
            showNotification(errorMsg, 'error');
            console.error('Erreur détaillée:', err.response?.data || err.message);
            console.error('Erreur complète:', err);
            console.error('Status:', err.response?.status);
            console.error('Headers:', err.response?.headers);
        }
    }
};

    const StarRating = ({ rating, onRatingChange, readonly = false }) => (
        <div className="star-rating">
            {[1, 2, 3, 4, 5].map(star => (
                <span
                    key={star}
                    className={`star ${star <= rating ? 'filled' : ''}`}
                    onClick={() => !readonly && onRatingChange(star)}
                    aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                    role={readonly ? "img" : "button"}
                    aria-pressed={star <= rating}
                >
                    ★
                </span>
            ))}
        </div>
    );

    const RatingDistribution = () => {
        const distribution = [5, 4, 3, 2, 1].map(rating => ({
            rating,
            count: feedbacks.filter(f => f.rating === rating).length,
            percentage: feedbacks.length ? (feedbacks.filter(f => f.rating === rating).length / feedbacks.length) * 100 : 0
        }));
        return (
            <div className="rating-distribution">
                <h4>Répartition des notes</h4>
                {distribution.map(({ rating, count, percentage }) => (
                    <div key={rating} className="rating-bar">
                        <div className="rating-info">
                            <span>{rating} ★</span>
                            <span>{count}</span>
                        </div>
                        <div className="bar-container">
                            <div 
                                className="bar-fill" 
                                style={{ width: `${percentage}%` }}
                            ></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // Filtrer et trier les feedbacks
    const filteredFeedbacks = feedbacks
        .filter(feedback => filterRating === 'all' || feedback.rating === parseInt(filterRating))
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.created_at) - new Date(a.created_at);
            } else if (sortBy === 'oldest') {
                return new Date(a.created_at) - new Date(b.created_at);
            } else if (sortBy === 'highest') {
                return b.rating - a.rating;
            } else if (sortBy === 'lowest') {
                return a.rating - b.rating;
            }
            return 0;
        });

    // Pagination
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredFeedbacks.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);

    // Fonction pour extraire l'ID utilisateur de manière sécurisée
    const getUserId = (feedback) => {
        if (!feedback.user) return null;
        // Si feedback.user est un objet, extraire l'ID
        if (typeof feedback.user === 'object' && feedback.user.id) {
            return feedback.user.id;
        }
        // Sinon, feedback.user est déjà l'ID
        return feedback.user;
    };

    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Chargement du système de feedback...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon">⚠️</div>
                <h3>Une erreur est survenue</h3>
                <p>{error}</p>
                <button className="retry-btn" onClick={() => window.location.reload()}>
                    Réessayer
                </button>
            </div>
        );
    }

    return (
        <div className="feedback-system-container">
            {notification.show && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}
            
            <div className="feedback-header">
                <h2>💬 Feedback & Apprentissage Continu</h2>
                <p>Partagez votre expérience pour nous aider à améliorer notre système</p>
                
                <div className="feedback-stats">
                    <div className="stat-item">
                        <div className="stat-value">
                            {stats.average_rating ? stats.average_rating.toFixed(1) : '0.0'}
                        </div>
                        <div className="stat-label">Note moyenne</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.total_count || 0}</div>
                        <div className="stat-label">Avis</div>
                    </div>
                </div>
                
                <button 
                    className="add-feedback-btn"
                    onClick={() => {
                        setShowForm(!showForm);
                        if (showForm) {
                            setEditingFeedback(null);
                            setNewFeedback({ rating: 5, comment: '' });
                        }
                    }}
                    disabled={submitting}
                    aria-expanded={showForm}
                >
                    {showForm ? 'Annuler' : 'Donner mon avis'}
                </button>
            </div>
            
            {showForm && (
                <div className="feedback-form">
                    <h3>{editingFeedback ? 'Modifier votre feedback' : 'Donner votre feedback'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="rating">Note</label>
                            <StarRating 
                                rating={newFeedback.rating}
                                onRatingChange={(rating) => setNewFeedback({...newFeedback, rating})}
                            />
                        </div>
                        
                        <div className="form-group">
                            <label htmlFor="comment">Commentaire (optionnel)</label>
                            <textarea
                                id="comment"
                                value={newFeedback.comment}
                                onChange={(e) => setNewFeedback({...newFeedback, comment: e.target.value})}
                                placeholder="Partagez votre expérience..."
                                rows={4}
                                aria-label="Commentaire de feedback"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            className="submit-btn"
                            disabled={submitting}
                            aria-busy={submitting}
                        >
                            {submitting ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Envoi en cours...
                                </>
                            ) : editingFeedback ? 'Mettre à jour' : 'Envoyer le feedback'}
                        </button>
                    </form>
                </div>
            )}
            
            <div className="feedback-controls">
                <div className="sort-controls">
                    <label htmlFor="sort-by">Trier par:</label>
                    <select 
                        id="sort-by"
                        value={sortBy} 
                        onChange={(e) => setSortBy(e.target.value)}
                        className="sort-select"
                    >
                        <option value="newest">Plus récent</option>
                        <option value="oldest">Plus ancien</option>
                        <option value="highest">Note la plus haute</option>
                        <option value="lowest">Note la plus basse</option>
                    </select>
                </div>
                
                <div className="filter-controls">
                    <label htmlFor="filter-rating">Filtrer par note:</label>
                    <select 
                        id="filter-rating"
                        value={filterRating} 
                        onChange={(e) => setFilterRating(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">Toutes les notes</option>
                        <option value="5">5 étoiles</option>
                        <option value="4">4 étoiles</option>
                        <option value="3">3 étoiles</option>
                        <option value="2">2 étoiles</option>
                        <option value="1">1 étoile</option>
                    </select>
                </div>
            </div>
            
            <div className="feedback-content">
                <div className="feedback-list-container">
                    <div className="feedback-list-header">
                        <h3>Avis récents</h3>
                        <span className="feedback-count">
                            {filteredFeedbacks.length} avis{filteredFeedbacks.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    
                    {filteredFeedbacks.length === 0 ? (
                        <div className="no-feedback">
                            <div className="no-feedback-icon">📝</div>
                            <p>Aucun feedback trouvé</p>
                            {filterRating !== 'all' && (
                                <button 
                                    className="clear-filter-btn"
                                    onClick={() => setFilterRating('all')}
                                >
                                    Effacer le filtre
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {currentItems.map(feedback => {
                                const feedbackUserId = getUserId(feedback);
                                const isOwner = user && feedbackUserId && String(user.id) === String(feedbackUserId);
                                
                                return (
                                    <div key={feedback.id || `feedback-${Math.random()}`} className="feedback-item">
                                        <div className="feedback-header">
                                            <div className="user-info">
                                                <div className="user-avatar">
                                                    {feedback.user_email ? feedback.user_email.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                                <div>
                                                    <strong>{feedback.user_email || 'Utilisateur anonyme'}</strong>
                                                    <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <StarRating rating={feedback.rating} readonly />
                                        </div>
                                        {feedback.comment && (
                                            <p className="feedback-comment">{feedback.comment}</p>
                                        )}
                                        {isOwner && (
                                            <div className="feedback-actions">
                                                <button 
                                                    className="edit-btn"
                                                    onClick={() => handleEdit(feedback)}
                                                    aria-label="Modifier le feedback"
                                                >
                                                    ✏️ Modifier
                                                </button>
                                                <button 
                                                    className="delete-btn"
                                                    onClick={() => handleDelete(feedback.id)}
                                                    aria-label="Supprimer le feedback"
                                                >
                                                    🗑️ Supprimer
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            
                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                        aria-label="Page précédente"
                                    >
                                        &laquo;
                                    </button>
                                    <span className="pagination-info">
                                        Page {currentPage} sur {totalPages}
                                    </span>
                                    <button 
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                        aria-label="Page suivante"
                                    >
                                        &raquo;
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                
                <div className="feedback-sidebar">
                    <RatingDistribution />
                    
                    <div className="feedback-tips">
                        <h4>Conseils pour un bon feedback</h4>
                        <ul>
                            <li>Soyez précis et constructif</li>
                            <li>Concentrez-vous sur les faits</li>
                            <li>Proposez des solutions si possible</li>
                            <li>Soyez respectueux dans votre ton</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

FeedbackSystem.propTypes = {
    token: PropTypes.string.isRequired,
    user: PropTypes.object
};

export default FeedbackSystem;