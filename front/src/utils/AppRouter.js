import React from 'react';
import { useLocation } from 'react-router-dom';

// Composant pour déterminer le type d'interface à afficher
const AppRouter = ({ user, children }) => {
    const location = useLocation();
    
    // Routes pour l'interface client moderne (sans sidebar)
    const clientRoutes = [
        '/', 
        '/location', 
        '/client-vehicules', 
        '/client-profile',
        '/client-reservations'
    ];
    
    // Routes publiques (sans sidebar)
    const publicRoutes = [
        '/login', 
        '/signup', 
        '/forgot-password', 
        '/reset-password'
    ];
    
    // Routes admin/agence (avec sidebar)
    const adminRoutes = [
        '/admin',
        '/dashboard',
        '/vehicules',
        '/reservations',
        '/profile',
        '/users',
        '/agents',
        '/agencies',
        '/maintenance',
        '/forecasting',
        '/recommendations',
        '/feedback',
        '/eco-score'
    ];
    
    // Déterminer le type d'interface
    const isClientInterface = () => {
        // Si l'utilisateur est un client
        if (user && user.role === 'client') {
            return !adminRoutes.includes(location.pathname);
        }
        
        // Si c'est une route client explicite
        return clientRoutes.includes(location.pathname);
    };
    
    const isPublicRoute = () => {
        return publicRoutes.includes(location.pathname);
    };
    
    const shouldShowSidebar = () => {
        // Pas de sidebar pour les routes publiques
        if (isPublicRoute()) return false;
        
        // Pas de sidebar pour l'interface client
        if (isClientInterface()) return false;
        
        // Sidebar pour admin/agence
        return user && ['admin', 'agence'].includes(user.role);
    };
    
    return {
        shouldShowSidebar: shouldShowSidebar(),
        isClientInterface: isClientInterface(),
        isPublicRoute: isPublicRoute(),
        interfaceType: isClientInterface() ? 'client' : (isPublicRoute() ? 'public' : 'admin')
    };
};

export default AppRouter;
