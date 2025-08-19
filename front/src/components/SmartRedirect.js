import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SmartRedirect = ({ user, defaultRoute = '/' }) => {
    const navigate = useNavigate();
    
    useEffect(() => {
        if (user) {
            switch (user.role) {
                case 'client':
                    // Rediriger les clients vers l'interface moderne
                    navigate('/location');
                    break;
                case 'admin':
                    // Rediriger les admins vers le dashboard
                    navigate('/dashboard');
                    break;
                case 'agence':
                    // Rediriger les agences vers le dashboard
                    navigate('/dashboard');
                    break;
                default:
                    navigate(defaultRoute);
            }
        } else {
            navigate(defaultRoute);
        }
    }, [user, navigate, defaultRoute]);
    
    return (
        <div className="smart-redirect">
            <div className="redirect-message">
                <div className="spinner"></div>
                <p>Redirection en cours...</p>
            </div>
        </div>
    );
};

export default SmartRedirect;
