/**
 * Premium Login Page - "The Constellation" Experience
 * Glassmorphism design with Framer Motion animations
 */

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import ConstellationBackground from '../components/ConstellationBackground';

// Animation variants
const formVariants = {
    hidden: {
        opacity: 0,
        y: 20,
        scale: 0.95,
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.8,
            ease: [0.25, 0.46, 0.45, 0.94],
            staggerChildren: 0.1,
            delayChildren: 0.3,
        },
    },
    exit: {
        opacity: 0,
        y: -20,
        scale: 0.95,
        transition: {
            duration: 0.5,
            ease: 'easeInOut',
        },
    },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: 'easeOut' },
    },
};

const buttonVariants = {
    idle: { scale: 1 },
    hover: {
        scale: 1.02,
        boxShadow: '0 0 30px rgba(161, 0, 255, 0.5)',
    },
    tap: { scale: 0.98 },
};

// Floating label input component
const FloatingInput = ({
    type,
    value,
    onChange,
    label,
    name: fieldName,
    focusedField,
    setFocusedField,
    required = true,
    minLength,
    itemVariants
}) => {
    const isFocused = focusedField === fieldName;
    const hasValue = value && value.length > 0;
    const isActive = isFocused || hasValue;

    return (
        <motion.div
            variants={itemVariants}
            style={{
                position: 'relative',
                marginBottom: '1.75rem',
            }}
        >
            <motion.label
                animate={{
                    y: isActive ? -32 : 0,
                    x: isActive ? 0 : 0,
                    scale: isActive ? 0.75 : 1,
                    color: isFocused ? '#A100FF' : 'rgba(255, 255, 255, 0.4)',
                }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                    position: 'absolute',
                    left: '1rem',
                    top: '1rem',
                    fontSize: '0.95rem',
                    pointerEvents: 'none',
                    transformOrigin: 'left center',
                    zIndex: 2,
                    display: 'block',
                }}
            >
                {label}
            </motion.label>
            <div style={{ position: 'relative', zIndex: 1 }}>
                <motion.input
                    type={type}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setFocusedField(fieldName)}
                    onBlur={() => setFocusedField(null)}
                    required={required}
                    minLength={minLength}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        paddingTop: '1.25rem',
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: `2px solid ${isFocused ? '#A100FF' : 'rgba(161, 0, 255, 0.2)'}`,
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                        boxShadow: isFocused
                            ? '0 0 20px rgba(161, 0, 255, 0.2), inset 0 0 10px rgba(161, 0, 255, 0.05)'
                            : 'none',
                    }}
                />
                {/* Animated border glow */}
                <motion.div
                    animate={{
                        opacity: isFocused ? 1 : 0,
                        scale: isFocused ? 1.01 : 1,
                    }}
                    style={{
                        position: 'absolute',
                        inset: -2,
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(161, 0, 255, 0.5), rgba(161, 0, 255, 0.2))',
                        zIndex: -1,
                        filter: 'blur(3px)',
                        pointerEvents: 'none',
                    }}
                />
            </div>
        </motion.div>
    );
};


function Login() {
    const navigate = useNavigate();
    const { login, register, enableDemoMode } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExiting, setIsExiting] = useState(false);

    // Form state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [orgName, setOrgName] = useState('');
    const [orgSlug, setOrgSlug] = useState('');

    // Focus states for floating labels
    const [focusedField, setFocusedField] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isRegister) {
                await register(
                    { email, password, name },
                    { name: orgName, slug: orgSlug }
                );
            } else {
                await login(email, password);
            }

            // Trigger exit animation
            setIsExiting(true);
            setTimeout(() => navigate('/'), 600);
        } catch (err) {
            setError(err.message || 'Authentication failed');
            setIsLoading(false);
        }
    };



    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Constellation Background */}
            <ConstellationBackground />

            {/* Ambient glow effects */}
            <div style={{
                position: 'fixed',
                top: '20%',
                left: '30%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, rgba(161, 0, 255, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
            }} />
            <div style={{
                position: 'fixed',
                bottom: '10%',
                right: '20%',
                width: '300px',
                height: '300px',
                background: 'radial-gradient(circle, rgba(161, 0, 255, 0.08) 0%, transparent 70%)',
                pointerEvents: 'none',
                zIndex: 1,
            }} />

            {/* Login Form */}
            <AnimatePresence mode="wait">
                {!isExiting && (
                    <motion.div
                        key={isRegister ? 'register' : 'login'}
                        variants={formVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        style={{
                            position: 'relative',
                            zIndex: 10,
                            width: '100%',
                            maxWidth: '440px',
                            padding: '2rem',
                        }}
                    >
                        {/* Glassmorphism Form Container */}
                        <div style={{
                            background: 'rgba(0, 0, 0, 0.7)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: '24px',
                            padding: '3rem',
                            border: '1px solid rgba(161, 0, 255, 0.3)',
                            boxShadow: `
                                0 0 60px rgba(161, 0, 255, 0.15),
                                inset 0 0 60px rgba(161, 0, 255, 0.03),
                                0 25px 50px rgba(0, 0, 0, 0.5)
                            `,
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            {/* Animated edge glow */}
                            <motion.div
                                animate={{
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                                }}
                                transition={{
                                    duration: 5,
                                    repeat: Infinity,
                                    ease: 'linear',
                                }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    borderRadius: '24px',
                                    padding: '1px',
                                    background: 'linear-gradient(90deg, transparent, rgba(161, 0, 255, 0.5), transparent)',
                                    backgroundSize: '200% 100%',
                                    mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                    maskComposite: 'exclude',
                                    WebkitMaskComposite: 'xor',
                                    pointerEvents: 'none',
                                }}
                            />

                            {/* Logo & Title */}
                            <motion.div variants={itemVariants} style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                                <motion.div
                                    animate={{
                                        textShadow: [
                                            '0 0 20px rgba(161, 0, 255, 0.5)',
                                            '0 0 40px rgba(161, 0, 255, 0.8)',
                                            '0 0 20px rgba(161, 0, 255, 0.5)',
                                        ],
                                    }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    style={{
                                        fontSize: '2.5rem',
                                        fontWeight: '800',
                                        background: 'linear-gradient(135deg, #A100FF 0%, #ffffff 50%, #A100FF 100%)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                        letterSpacing: '-0.02em',
                                    }}
                                >
                                    ACCN-PM
                                </motion.div>
                                <p style={{
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    fontSize: '0.9rem',
                                    marginTop: '0.5rem',
                                }}>
                                    {isRegister ? 'Create your organization' : 'Sign in to continue'}
                                </p>
                            </motion.div>

                            {/* Error Message */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, height: 0 }}
                                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                                        exit={{ opacity: 0, y: -10, height: 0 }}
                                        style={{
                                            background: 'rgba(255, 60, 60, 0.1)',
                                            border: '1px solid rgba(255, 60, 60, 0.3)',
                                            borderRadius: '12px',
                                            padding: '0.875rem',
                                            marginBottom: '1.5rem',
                                            color: '#ff6b6b',
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {error}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Form */}
                            <form onSubmit={handleSubmit}>
                                <AnimatePresence mode="wait">
                                    {isRegister && (
                                        <motion.div
                                            key="register-fields"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <FloatingInput
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                label="Your Name"
                                                name="name"
                                                focusedField={focusedField}
                                                setFocusedField={setFocusedField}
                                                itemVariants={itemVariants}
                                            />
                                            <FloatingInput
                                                type="text"
                                                value={orgName}
                                                onChange={(e) => setOrgName(e.target.value)}
                                                label="Organization Name"
                                                name="orgName"
                                                focusedField={focusedField}
                                                setFocusedField={setFocusedField}
                                                itemVariants={itemVariants}
                                            />
                                            <FloatingInput
                                                type="text"
                                                value={orgSlug}
                                                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                                label="Organization Slug"
                                                name="orgSlug"
                                                focusedField={focusedField}
                                                setFocusedField={setFocusedField}
                                                itemVariants={itemVariants}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <FloatingInput
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    label="Email Address"
                                    name="email"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}
                                    itemVariants={itemVariants}
                                />
                                <FloatingInput
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    label="Password"
                                    name="password"
                                    focusedField={focusedField}
                                    setFocusedField={setFocusedField}
                                    itemVariants={itemVariants}
                                    minLength={6}
                                />

                                {/* Submit Button */}
                                <motion.button
                                    type="submit"
                                    disabled={isLoading}
                                    variants={buttonVariants}
                                    initial="idle"
                                    whileHover="hover"
                                    whileTap="tap"
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        marginTop: '0.5rem',
                                        background: isLoading
                                            ? 'rgba(161, 0, 255, 0.5)'
                                            : 'linear-gradient(135deg, #A100FF 0%, #7B00CC 100%)',
                                        border: 'none',
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Button shimmer effect */}
                                    <motion.div
                                        animate={{
                                            x: ['-100%', '200%'],
                                        }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            repeatDelay: 1,
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '50%',
                                            height: '100%',
                                            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                    <span style={{ position: 'relative', zIndex: 1 }}>
                                        {isLoading ? (
                                            <motion.span
                                                animate={{ opacity: [1, 0.5, 1] }}
                                                transition={{ duration: 1, repeat: Infinity }}
                                            >
                                                Connecting...
                                            </motion.span>
                                        ) : (
                                            isRegister ? 'Create Account' : 'Sign In'
                                        )}
                                    </span>
                                </motion.button>
                            </form>

                            {/* Toggle Login/Register */}
                            <motion.div variants={itemVariants} style={{ marginTop: '2rem', textAlign: 'center' }}>
                                <motion.button
                                    onClick={() => {
                                        setIsRegister(!isRegister);
                                        setError('');
                                    }}
                                    whileHover={{ color: '#A100FF' }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '0.875rem',
                                        cursor: 'pointer',
                                        transition: 'color 0.2s',
                                    }}
                                >
                                    {isRegister
                                        ? 'Already have an account? Sign in'
                                        : "Don't have an account? Register"
                                    }
                                </motion.button>
                            </motion.div>

                            {/* Try Demo Button */}
                            <motion.div variants={itemVariants} style={{ marginTop: '1rem', textAlign: 'center' }}>
                                <motion.button
                                    onClick={() => {
                                        enableDemoMode();
                                        navigate('/');
                                    }}
                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(161, 0, 255, 0.15)' }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem',
                                        background: 'transparent',
                                        border: '1px solid rgba(161, 0, 255, 0.4)',
                                        borderRadius: '12px',
                                        color: 'var(--accent-primary)',
                                        fontSize: '0.95rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s',
                                    }}
                                >
                                    ✨ Try Demo Mode
                                </motion.button>
                            </motion.div>
                        </div>

                        {/* Decorative elements */}
                        <motion.div
                            animate={{
                                rotate: 360,
                            }}
                            transition={{
                                duration: 20,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                position: 'absolute',
                                top: '-50px',
                                right: '-50px',
                                width: '100px',
                                height: '100px',
                                border: '1px solid rgba(161, 0, 255, 0.2)',
                                borderRadius: '50%',
                                pointerEvents: 'none',
                            }}
                        />
                        <motion.div
                            animate={{
                                rotate: -360,
                            }}
                            transition={{
                                duration: 30,
                                repeat: Infinity,
                                ease: 'linear',
                            }}
                            style={{
                                position: 'absolute',
                                bottom: '-30px',
                                left: '-30px',
                                width: '60px',
                                height: '60px',
                                border: '1px solid rgba(161, 0, 255, 0.15)',
                                borderRadius: '50%',
                                pointerEvents: 'none',
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default Login;
