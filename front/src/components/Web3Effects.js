import React, { useEffect, useRef } from 'react';
import './Web3Effects.css';

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
            particle.style.top = Math.random() * 100 + '%';
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
        position: 'fixed',
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
export const NeonText = ({ children, color = '#00d4ff', intensity = 'medium', className = '' }) => {
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
    
    return <span style={style} className={`neon-text ${className}`}>{children}</span>;
};

// Glassmorphism Card Component
export const GlassCard = ({ children, className = '', style = {}, glow = false }) => {
    const cardStyle = {
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        boxShadow: glow 
            ? '0 8px 32px rgba(0, 212, 255, 0.2), 0 0 60px rgba(123, 0, 255, 0.1)' 
            : '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        ...style
    };
    
    return (
        <div 
            className={`web3-card ${className} ${glow ? 'web3-card-glow' : ''}`} 
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
    icon = null,
    ...props 
}) => {
    const getVariantClass = () => {
        switch (variant) {
            case 'primary':
                return 'web3-button web3-button-primary';
            case 'secondary':
                return 'web3-button web3-button-secondary';
            case 'ghost':
                return 'web3-button web3-button-ghost';
            case 'success':
                return 'web3-button web3-button-success';
            case 'danger':
                return 'web3-button web3-button-danger';
            default:
                return 'web3-button web3-button-primary';
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
            {icon && <span className="web3-button-icon">{icon}</span>}
            <span className="button-glow"></span>
            {children}
        </button>
    );
};

// Loading Spinner Component
export const CyberLoader = ({ size = 'medium', color = '#00d4ff', text = '' }) => {
    const getSizeClass = () => {
        switch (size) {
            case 'small':
                return 'cyber-spinner cyber-spinner-sm';
            case 'large':
                return 'cyber-spinner cyber-spinner-lg';
            default:
                return 'cyber-spinner';
        }
    };
    
    return (
        <div className="cyber-loader-container">
            <div className={getSizeClass()} style={{ borderTopColor: color }}>
                <div className="spinner-core"></div>
            </div>
            {text && <div className="cyber-loader-text" style={{ color }}>{text}</div>}
        </div>
    );
};

// Web3 Input Component
export const CyberInput = ({ 
    type = 'text', 
    placeholder, 
    value, 
    onChange, 
    onKeyPress,
    className = '',
    error = false,
    label = '',
    icon = null,
    ...props 
}) => {
    const inputClass = `web3-input ${error ? 'web3-input-error' : ''} ${className}`;
    
    return (
        <div className="web3-input-container">
            {label && <label className="web3-input-label">{label}</label>}
            <div className="web3-input-wrapper">
                {icon && <span className="web3-input-icon">{icon}</span>}
                <input
                    type={type}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onKeyPress={onKeyPress}
                    className={inputClass}
                    {...props}
                />
            </div>
            {error && <div className="web3-input-error-message">{error}</div>}
        </div>
    );
};

// Web3 Chat Message Component
export const ChatMessage = ({ message, isUser = false }) => {
    return (
        <div className={`web3-message ${isUser ? 'web3-message-user' : 'web3-message-bot'}`}>
            <div className="web3-message-avatar">
                {isUser ? '👤' : '🤖'}
            </div>
            <div className="web3-message-content">
                <div className="web3-message-text">{message.text}</div>
                <div className="web3-message-time">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
};

// Web3 Chatbot Component
export const Web3Chatbot = ({ title = "Assistant VitaRenta", subtitle = "Votre assistant virtuel" }) => {
    const [messages, setMessages] = useState([
        { 
            id: 1, 
            text: "Bonjour! Je suis votre assistant virtuel VitaRenta. Comment puis-je vous aider aujourd'hui?", 
            timestamp: new Date(),
            sender: 'bot'
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (inputValue.trim() === '') return;

        const newUserMessage = {
            id: messages.length + 1,
            text: inputValue,
            timestamp: new Date(),
            sender: 'user'
        };

        setMessages([...messages, newUserMessage]);
        setInputValue('');
        setIsLoading(true);

        // Simulate bot response
        setTimeout(() => {
            const botResponses = [
                "Je comprends votre demande. Laissez-moi vous aider avec cela.",
                "Merci pour votre message. Je vais traiter votre demande dès que possible.",
                "C'est une excellente question! Voici ce que je peux vous dire...",
                "Je suis là pour vous aider. Pouvez-vous me donner plus de détails?",
                "Je vais vérifier cela pour vous. Veuillez patienter un instant."
            ];

            const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

            const newBotMessage = {
                id: messages.length + 2,
                text: randomResponse,
                timestamp: new Date(),
                sender: 'bot'
            };

            setMessages(prevMessages => [...prevMessages, newBotMessage]);
            setIsLoading(false);
        }, 1500);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="web3-chatbot">
            <Web3Particles density={30} colors={['#00d4ff', '#ff0080', '#7b00ff']} />
            <CyberGrid opacity={0.05} size={40} />
            
            <GlassCard className="web3-chatbot-container" glow={true}>
                <div className="web3-chatbot-header">
                    <NeonText color="#00d4ff" intensity="high">
                        <h2 className="web3-chatbot-title">{title}</h2>
                    </NeonText>
                    <p className="web3-chatbot-subtitle">{subtitle}</p>
                    <div className="web3-status-indicator">
                        <span className="status-dot"></span>
                        <span>En ligne</span>
                    </div>
                </div>

                <div className="web3-chatbot-messages">
                    {messages.map((message) => (
                        <ChatMessage 
                            key={message.id} 
                            message={message} 
                            isUser={message.sender === 'user'} 
                        />
                    ))}
                    {isLoading && (
                        <div className="web3-message web3-message-bot">
                            <div className="web3-message-avatar">🤖</div>
                            <div className="web3-message-content">
                                <CyberLoader size="small" color="#00d4ff" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="web3-chatbot-input">
                    <CyberInput
                        type="text"
                        placeholder="Tapez votre message ici..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <CyberButton 
                        variant="primary" 
                        onClick={handleSendMessage}
                        disabled={inputValue.trim() === '' || isLoading}
                        icon="➤"
                    >
                        Envoyer
                    </CyberButton>
                </div>
            </GlassCard>
        </div>
    );
};