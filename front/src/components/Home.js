import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';

const Home = ({ token }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setIsVisible(true);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const features = [
        {
            icon: '🚗',
            title: 'Large Flotte',
            description: '500+ véhicules de qualité premium',
            color: '#3b82f6'
        },
        {
            icon: '⚡',
            title: 'Réservation Rapide',
            description: 'Réservez en moins de 2 minutes',
            color: '#10b981'
        },
        {
            icon: '🛡️',
            title: 'Assurance Incluse',
            description: 'Protection complète garantie',
            color: '#f59e0b'
        },
        {
            icon: '📱',
            title: 'App Mobile',
            description: 'Gérez vos locations partout',
            color: '#8b5cf6'
        }
    ];

    const vehicleTypes = [
        {
            name: 'Citadines',
            icon: '🚗',
            price: 'À partir de 25€/jour',
            description: 'Parfaites pour la ville',
            image: '🏙️',
            count: '150+'
        },
        {
            name: 'SUV',
            icon: '🚘',
            price: 'À partir de 45€/jour',
            description: 'Confort et espace',
            image: '🏔️',
            count: '120+'
        },
        {
            name: 'Luxe',
            icon: '🏎️',
            price: 'À partir de 120€/jour',
            description: 'Expérience premium',
            image: '✨',
            count: '80+'
        },
        {
            name: 'Électriques',
            icon: '⚡',
            price: 'À partir de 35€/jour',
            description: 'Écologique et moderne',
            image: '🌱',
            count: '100+'
        }
    ];

    const testimonials = [
        {
            name: 'Marie Dubois',
            rating: 5,
            comment: 'Service exceptionnel ! Voiture impeccable et équipe très professionnelle.',
            avatar: '👩‍💼'
        },
        {
            name: 'Pierre Martin',
            rating: 5,
            comment: 'Réservation ultra rapide, parfait pour mes déplacements professionnels.',
            avatar: '👨‍💼'
        },
        {
            name: 'Sophie Laurent',
            rating: 5,
            comment: 'Large choix de véhicules, j\'ai trouvé exactement ce qu\'il me fallait !',
            avatar: '👩‍🎓'
        }
    ];

    return (
        <div className={`home-container ${isVisible ? 'visible' : ''}`}>
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-background">
                    <div className="floating-cars">
                        {['🚗', '🚘', '🏎️', '🚐', '🚓'].map((car, i) => (
                            <div
                                key={i}
                                className="floating-car"
                                style={{
                                    left: `${10 + i * 20}%`,
                                    animationDelay: `${i * 1.5}s`
                                }}
                            >
                                {car}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="hero-content">
                    <div className="hero-text">
                        <h1 className="hero-title">
                            <span className="title-line">Votre</span>
                            <span className="title-line highlight">Aventure</span>
                            <span className="title-line">Commence Ici</span>
                        </h1>
                        <p className="hero-subtitle">
                            🚗 Découvrez notre flotte premium de 500+ véhicules.
                            Location simple, rapide et sécurisée pour tous vos déplacements.
                        </p>

                        <div className="hero-stats">
                            <div className="stat-item">
                                <span className="stat-number">500+</span>
                                <span className="stat-label">Véhicules</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">10k+</span>
                                <span className="stat-label">Clients</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-number">4.9/5</span>
                                <span className="stat-label">Satisfaction</span>
                            </div>
                        </div>

                        <div className="hero-actions">
                            {!token ? (
                                <>
                                    <Link to="/signup" className="cta-button primary">
                                        <span className="button-icon">🏁</span>
                                        <span>Commencer Maintenant</span>
                                        <div className="button-glow"></div>
                                    </Link>
                                    <Link to="/login" className="cta-button secondary">
                                        <span className="button-icon">🔐</span>
                                        <span>Se Connecter</span>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/vehicules" className="cta-button primary">
                                        <span className="button-icon">🚗</span>
                                        <span>Voir les Véhicules</span>
                                        <div className="button-glow"></div>
                                    </Link>
                                    <Link to="/profile" className="cta-button secondary">
                                        <span className="button-icon">👤</span>
                                        <span>Mon Profil</span>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="hero-visual">
                        <div className="car-showcase">
                            <div className="showcase-car">🏎️</div>
                            <div className="car-details">
                                <div className="detail-item">
                                    <span className="detail-icon">⚡</span>
                                    <span>Électrique</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">🛡️</span>
                                    <span>Assuré</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">📱</span>
                                    <span>App Mobile</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Pourquoi Choisir VitaRenta ?</h2>
                    <p className="section-subtitle">Une expérience de location révolutionnaire</p>
                </div>

                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="feature-card"
                            style={{ '--accent-color': feature.color }}
                        >
                            <div className="feature-icon">{feature.icon}</div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                            <div className="feature-glow"></div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Vehicle Types */}
            <section className="vehicles-section">
                <div className="section-header">
                    <h2 className="section-title">Notre Flotte Premium</h2>
                    <p className="section-subtitle">Trouvez le véhicule parfait pour chaque occasion</p>
                </div>

                <div className="vehicles-grid">
                    {vehicleTypes.map((vehicle, index) => (
                        <div key={index} className="vehicle-card">
                            <div className="vehicle-header">
                                <div className="vehicle-icon">{vehicle.icon}</div>
                                <div className="vehicle-count">{vehicle.count}</div>
                            </div>
                            <div className="vehicle-content">
                                <h3 className="vehicle-name">{vehicle.name}</h3>
                                <p className="vehicle-description">{vehicle.description}</p>
                                <div className="vehicle-price">{vehicle.price}</div>
                                <div className="vehicle-image">{vehicle.image}</div>
                            </div>
                            <Link to={token ? "/vehicules" : "/login"} className="vehicle-button">
                                <span>Découvrir</span>
                                <span className="button-arrow">→</span>
                            </Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* Steps */}
            <section className="process-section">
                <div className="section-header">
                    <h2 className="section-title">Comment Ça Marche ?</h2>
                    <p className="section-subtitle">3 étapes simples pour votre location</p>
                </div>

                <div className="process-steps">
                    <div className="step-item">
                        <div className="step-number">1</div>
                        <div className="step-icon">🔍</div>
                        <h3 className="step-title">Choisissez</h3>
                        <p className="step-description">Sélectionnez votre véhicule parmi notre large gamme</p>
                    </div>

                    <div className="step-connector">
                        <div className="connector-line"></div>
                        <div className="connector-car">🚗</div>
                    </div>

                    <div className="step-item">
                        <div className="step-number">2</div>
                        <div className="step-icon">📅</div>
                        <h3 className="step-title">Réservez</h3>
                        <p className="step-description">Réservation en ligne rapide et sécurisée</p>
                    </div>

                    <div className="step-connector">
                        <div className="connector-line"></div>
                        <div className="connector-car">🚘</div>
                    </div>

                    <div className="step-item">
                        <div className="step-number">3</div>
                        <div className="step-icon">🚗</div>
                        <h3 className="step-title">Conduisez</h3>
                        <p className="step-description">Récupérez votre véhicule et profitez de votre voyage</p>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="testimonials-section">
                <div className="section-header">
                    <h2 className="section-title">Ce Que Disent Nos Clients</h2>
                    <p className="section-subtitle">Plus de 10 000 clients satisfaits</p>
                </div>

                <div className="testimonials-carousel">
                    {testimonials.map((testimonial, index) => (
                        <div key={index} className={`testimonial-card ${index === currentSlide ? 'active' : ''}`}>
                            <div className="testimonial-avatar">{testimonial.avatar}</div>
                            <div className="testimonial-content">
                                <div className="testimonial-rating">
                                    {[...Array(testimonial.rating)].map((_, i) => (
                                        <span key={i} className="star">★</span>
                                    ))}
                                </div>
                                <p className="testimonial-comment">"{testimonial.comment}"</p>
                                <div className="testimonial-author">{testimonial.name}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="carousel-dots">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            className={`dot ${index === currentSlide ? 'active' : ''}`}
                            onClick={() => setCurrentSlide(index)}
                        />
                    ))}
                </div>
            </section>

            {/* Call to Action */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Prêt à Partir à l'Aventure ?</h2>
                    <p className="cta-subtitle">Rejoignez des milliers de conducteurs satisfaits</p>
                    <div className="cta-actions">
                        {!token ? (
                            <Link to="/signup" className="cta-button primary large">
                                <span className="button-icon">🚀</span>
                                <span>Commencer Maintenant</span>
                                <div className="button-glow"></div>
                            </Link>
                        ) : (
                            <Link to="/vehicules" className="cta-button primary large">
                                <span className="button-icon">🚗</span>
                                <span>Réserver Maintenant</span>
                                <div className="button-glow"></div>
                            </Link>
                        )}
                    </div>
                </div>

                <div className="cta-visual">
                    <div className="cta-cars">
                        <div className="cta-car car-1">🚗</div>
                        <div className="cta-car car-2">🚘</div>
                        <div className="cta-car car-3">🏎️</div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Home;
