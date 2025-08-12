import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, token, user, allowedRoles }) => {
    const location = useLocation();
    
    // Stocker l'URL demandée pour rediriger après connexion
    const from = location.state?.from?.pathname || "/";
    
    if (!token) {
        // Rediriger vers la page de connexion avec l'URL d'origine
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    if (!user) {
        // Si le token existe mais pas les infos utilisateur
        console.error("Erreur: Token présent mais informations utilisateur manquantes");
        return <Navigate to="/login" replace />;
    }
    
    if (!allowedRoles.includes(user.role)) {
        // Rediriger vers la page non autorisé
        return <Navigate to="/unauthorized" replace />;
    }
    
    // Vérifier si le compte est actif (optionnel)
    if (user.is_active === false) {
        return <Navigate to="/account-disabled" replace />;
    }
    
    return children;
};

export default ProtectedRoute;