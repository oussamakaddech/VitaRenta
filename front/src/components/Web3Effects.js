import React, { useEffect, useRef } from 'react';

// Web3 Floating Particles Component
export const Web3Particles = ({ density = 50, colors = ['#00d4ff', '#ff0080', '#7b00ff'] }) => {
    const containerRef = useRef(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Create particles
        for (let i = 0; i < density; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 6 + 's';
            particle.style.animationDuration = (6 + Math.random() * 4) + 's';
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            // Add glowing effect
            particle.style.boxShadow = `0 0 6px ${colors[Math.floor(Math.random() * colors.length)]}`;
            
            container.appendChild(particle);
        }

        return () => {
            container.innerHTML = '';
        };
    }, [density, colors]);

    return <div ref={containerRef} className="web3-particles" />;
};

// Cyber Grid Background Component
export const CyberGrid = ({ opacity = 0.1, color = '#00d4ff', size = 40 }) => {
    const gridStyle = {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: `
            linear-gradient(45deg, transparent 49%, rgba(0, 212, 255, ${opacity}) 50%, transparent 51%),
            linear-gradient(-45deg, transparent 49%, rgba(123, 0, 255, ${opacity}) 50%, transparent 51%)
        `,
        backgroundSize: `${size}px ${size}px`,
        animation: 'cyber-grid 20s linear infinite',
        pointerEvents: 'none',
        zIndex: -1,
    };

    return <div style={gridStyle} className="cyber-grid" />;
};

// Neon Glow Text Component
export const NeonText = ({ children, color = '#00d4ff', intensity = 'medium' }) => {
    const getGlowIntensity = () => {
        switch (intensity) {
            case 'low':
                return `0 0 5px ${color}`;
            case 'medium':
                return `0 0 10px ${color}, 0 0 20px ${color}`;
            case 'high':
                return `0 0 10px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`;
            default:
                return `0 0 10px ${color}, 0 0 20px ${color}`;
        }
    };

    const style = {
        color: color,
        textShadow: getGlowIntensity(),
        animation: 'neon-flicker 2s ease-in-out infinite alternate',
    };

    return <span style={style} className="neon-text">{children}</span>;
};

// Glassmorphism Card Component
export const GlassCard = ({ children, className = '', style = {} }) => {
    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        ...style
    };

    return (
        <div 
            className={`web3-card ${className}`} 
            style={cardStyle}
        >
            {children}
        </div>
    );
};

// Cyber Button Component
export const CyberButton = ({ 
    children, 
    onClick, 
    variant = 'primary', 
    size = 'medium',
    disabled = false,
    className = '',
    ...props 
}) => {
    const getVariantClass = () => {
        switch (variant) {
            case 'primary':
                return 'web3-button';
            case 'secondary':
                return 'web3-button-secondary';
            case 'ghost':
                return 'web3-button-ghost';
            default:
                return 'web3-button';
        }
    };

    const getSizeClass = () => {
        switch (size) {
            case 'small':
                return 'web3-button-sm';
            case 'large':
                return 'web3-button-lg';
            default:
                return '';
        }
    };

    return (
        <button
            className={`${getVariantClass()} ${getSizeClass()} ${className}`}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            <span className="button-glow"></span>
            {children}
        </button>
    );
};

// Loading Spinner Component
export const CyberLoader = ({ size = 'medium', color = '#00d4ff' }) => {
    const getSizeClass = () => {
        switch (size) {
            case 'small':
                return 'cyber-spinner-sm';
            case 'large':
                return 'cyber-spinner-lg';
            default:
                return 'cyber-spinner';
        }
    };

    return (
        <div className={getSizeClass()} style={{ borderTopColor: color }}>
            <div className="spinner-core"></div>
        </div>
    );
};

// Web3 Input Component
export const CyberInput = ({ 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    className = '',
    error = false,
    ...props 
}) => {
    const inputClass = `web3-input ${error ? 'web3-input-error' : ''} ${className}`;

    return (
        <div className="web3-input-container">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                className={inputClass}
                {...props}
            />
            {error && <div className="web3-input-error-glow"></div>}
        </div>
    );
};
