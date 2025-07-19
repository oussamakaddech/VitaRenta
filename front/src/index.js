import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Import des polyfills si nÃ©cessaire (pour les anciens navigateurs)
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Configuration pour le dÃ©veloppement
if (process.env.NODE_ENV === 'development') {
    // Activer les outils de dÃ©veloppement React
    window.React = React;
}

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
    console.error('Erreur globale:', event.error);
    // Ici vous pourriez envoyer l'erreur Ã  un service de monitoring
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rejetÃ©e non gÃ©rÃ©e:', event.reason);
    // Ici vous pourriez envoyer l'erreur Ã  un service de monitoring
});

// Fonction pour initialiser l'application
const initializeApp = () => {
    const rootElement = document.getElementById('root');

    if (!rootElement) {
        console.error('Ã‰lÃ©ment root non trouvÃ©');
        return;
    }

    // CrÃ©er le root React 18
    const root = ReactDOM.createRoot(rootElement);

    // Rendu de l'application
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );

    // Masquer le loader initial aprÃ¨s le montage
    const hideInitialLoader = () => {
        const loader = document.getElementById('initial-loader');
        if (loader) {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                loader.remove();
            }, 500);
        }
    };

    // Attendre que React soit montÃ©
    setTimeout(hideInitialLoader, 100);
};

// Initialiser l'application
initializeApp();

// Hot Module Replacement pour le dÃ©veloppement
if (process.env.NODE_ENV === 'development' && module.hot) {
    module.hot.accept('./App', () => {
        initializeApp();
    });
}

// Service Worker pour PWA (optionnel)
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// Fonction utilitaire pour reporter les performances Web Vitals
const reportWebVitals = (onPerfEntry) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
            getCLS(onPerfEntry);
            getFID(onPerfEntry);
            getFCP(onPerfEntry);
            getLCP(onPerfEntry);
            getTTFB(onPerfEntry);
        });
    }
};

// Mesurer les performances en production
if (process.env.NODE_ENV === 'production') {
    reportWebVitals(console.log);
}