import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, token, user, allowedRoles }) => {
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;