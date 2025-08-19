// Configuration centralisée de l'application
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

export const APP_CONFIG = {
  NAME: 'VitaRenta',
  VERSION: '1.0.0',
  DESCRIPTION: 'Plateforme de location de véhicules premium'
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  VEHICLES: '/vehicules',
  AGENCY_MAP: '/agency-map',
  RESERVATIONS: '/reservations',
  ADMIN: {
    USERS: '/admin/users',
    VEHICLES: '/admin/vehicules',
    AGENCIES: '/admin/agences'
  },
  AGENT: {
    VEHICLES: '/agent/vehicules'
  }
};

export const USER_ROLES = {
  CLIENT: 'client',
  AGENT: 'agence',
  ADMIN: 'admin'
};

export const VEHICLE_STATUS = {
  AVAILABLE: 'disponible',
  RENTED: 'loué',
  MAINTENANCE: 'maintenance',
  OUT_OF_SERVICE: 'hors_service'
};

export default {
  API_CONFIG,
  APP_CONFIG,
  ROUTES,
  USER_ROLES,
  VEHICLE_STATUS
};
