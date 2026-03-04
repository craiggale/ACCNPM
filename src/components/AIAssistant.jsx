/**
 * AIAssistant — Slide-out drawer for AI-powered assistant interactions.
 * 
 * Features:
 *  - Message thread with #A100FF neon glow aesthetic
 *  - Input bar with animated send button
 *  - Action cards with Confirm/Dismiss for orchestrator suggestions
 *  - Thinking animation while awaiting LLM response
 *  - Framer Motion animations for slide-in/out and messages
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Bot, User, CheckCircle, XCircle, Trash2, Zap } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAIAssistant } from '../hooks/useAIAssistant';

const AIAssistant = ({ isOpen, onClose }) => {
    const appContext = useApp();
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Build app data snapshot for the orchestrator
    const appData = {
        projects: appContext.projects,
        resources: appContext.resources,
        tasks: appContext.tasks,
    };

    const {
        messages,
        sendMessage,
        isLoading,
        pendingActions,
        confirmAction,
        dismissAction,
        clearConversation,
    } = useAIAssistant(appData, appContext);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when drawer opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    const handleSend = () => {
        if (inputValue.trim() && !isLoading) {
            sendMessage(inputValue.trim());
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                        style={styles.backdrop}
                    />

                    {/* Drawer */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        style={styles.drawer}
                    >
                        {/* Header */}
                        <div style={styles.header}>
                            <div style={styles.headerLeft}>
                                <div style={styles.headerIcon}>
                                    <Sparkles size={18} />
                                </div>
                                <div>
                                    <h3 style={styles.headerTitle}>AI Assistant</h3>
                                    <span style={styles.headerSubtitle}>Powered by Claude</span>
                                </div>
                            </div>
                            <div style={styles.headerActions}>
                                <button
                                    onClick={clearConversation}
                                    style={styles.headerBtn}
                                    title="Clear conversation"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <button onClick={onClose} style={styles.headerBtn} title="Close">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={styles.messageContainer}>
                            {messages.map((msg) => (
                                <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3 }}
                                    style={{
                                        ...styles.messageRow,
                                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    }}
                                >
                                    {msg.role === 'assistant' && (
                                        <div style={styles.avatarBot}>
                                            <Bot size={14} />
                                        </div>
                                    )}
                                    <div
                                        style={{
                                            ...(msg.role === 'user' ? styles.userBubble : styles.assistantBubble),
                                            ...(msg.isError ? styles.errorBubble : {}),
                                            ...(msg.isConfirmation ? styles.confirmBubble : {}),
                                        }}
                                    >
                                        <p style={styles.messageText}>{msg.content}</p>
                                        {msg.toolUsed && (
                                            <div style={styles.toolBadge}>
                                                <Zap size={10} />
                                                {msg.toolUsed}
                                            </div>
                                        )}
                                        {/* Action Cards */}
                                        {msg.hasActions && msg.actions && (
                                            <div style={styles.actionsContainer}>
                                                {msg.actions.map((action) => (
                                                    <div key={action.id} style={styles.actionCard}>
                                                        <div style={styles.actionHeader}>
                                                            <span style={styles.actionType}>{action.type}</span>
                                                            <span style={styles.actionLabel}>{action.label}</span>
                                                        </div>
                                                        <p style={styles.actionDesc}>{action.description}</p>
                                                        <div style={styles.actionButtons}>
                                                            <button
                                                                onClick={() => confirmAction(action)}
                                                                style={styles.confirmBtn}
                                                            >
                                                                <CheckCircle size={14} />
                                                                Confirm
                                                            </button>
                                                            <button
                                                                onClick={() => dismissAction(action.id)}
                                                                style={styles.dismissBtn}
                                                            >
                                                                <XCircle size={14} />
                                                                Dismiss
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {msg.role === 'user' && (
                                        <div style={styles.avatarUser}>
                                            <User size={14} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}

                            {/* Thinking Animation */}
                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    style={{ ...styles.messageRow, justifyContent: 'flex-start' }}
                                >
                                    <div style={styles.avatarBot}>
                                        <Bot size={14} />
                                    </div>
                                    <div style={styles.thinkingBubble}>
                                        <div style={styles.thinkingDots}>
                                            <motion.span
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                                                style={styles.dot}
                                            />
                                            <motion.span
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                                                style={styles.dot}
                                            />
                                            <motion.span
                                                animate={{ opacity: [0.3, 1, 0.3] }}
                                                transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                                                style={styles.dot}
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Pending Actions Badge */}
                        {pendingActions.length > 0 && (
                            <div style={styles.pendingBanner}>
                                <Zap size={14} />
                                {pendingActions.length} pending action{pendingActions.length > 1 ? 's' : ''} awaiting confirmation
                            </div>
                        )}

                        {/* Input Bar */}
                        <div style={styles.inputContainer}>
                            <div style={styles.inputWrapper}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Ask the AI assistant..."
                                    style={styles.input}
                                    disabled={isLoading}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!inputValue.trim() || isLoading}
                                    style={{
                                        ...styles.sendBtn,
                                        opacity: !inputValue.trim() || isLoading ? 0.4 : 1,
                                    }}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                            <p style={styles.disclaimer}>
                                AI suggestions require human confirmation before applying changes.
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────

const styles = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 998,
        backdropFilter: 'blur(2px)',
    },
    drawer: {
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '420px',
        maxWidth: '100vw',
        backgroundColor: '#0a0a0f',
        borderLeft: '1px solid rgba(161, 0, 255, 0.2)',
        boxShadow: '-8px 0 32px rgba(161, 0, 255, 0.15)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
    },

    // Header
    header: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderBottom: '1px solid rgba(161, 0, 255, 0.15)',
        background: 'linear-gradient(135deg, rgba(161, 0, 255, 0.08) 0%, transparent 100%)',
    },
    headerLeft: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
    },
    headerIcon: {
        width: '34px',
        height: '34px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #A100FF, #7000CC)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        boxShadow: '0 0 20px rgba(161, 0, 255, 0.4)',
    },
    headerTitle: {
        fontSize: '15px',
        fontWeight: 600,
        color: '#fff',
        margin: 0,
    },
    headerSubtitle: {
        fontSize: '11px',
        color: 'rgba(161, 0, 255, 0.7)',
        fontWeight: 500,
    },
    headerActions: {
        display: 'flex',
        gap: '6px',
    },
    headerBtn: {
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#888',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },

    // Messages
    messageContainer: {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    messageRow: {
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-start',
    },
    avatarBot: {
        width: '26px',
        height: '26px',
        borderRadius: '8px',
        background: 'linear-gradient(135deg, rgba(161, 0, 255, 0.3), rgba(161, 0, 255, 0.1))',
        border: '1px solid rgba(161, 0, 255, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#A100FF',
        flexShrink: 0,
        marginTop: '2px',
    },
    avatarUser: {
        width: '26px',
        height: '26px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#aaa',
        flexShrink: 0,
        marginTop: '2px',
    },
    userBubble: {
        backgroundColor: 'rgba(161, 0, 255, 0.12)',
        border: '1px solid rgba(161, 0, 255, 0.2)',
        borderRadius: '14px 14px 4px 14px',
        padding: '10px 14px',
        maxWidth: '300px',
    },
    assistantBubble: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '14px 14px 14px 4px',
        padding: '10px 14px',
        maxWidth: '320px',
    },
    errorBubble: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    confirmBubble: {
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
    },
    messageText: {
        fontSize: '13px',
        lineHeight: '1.6',
        color: '#e0e0e0',
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    },
    toolBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        marginTop: '8px',
        fontSize: '10px',
        fontWeight: 600,
        color: '#A100FF',
        backgroundColor: 'rgba(161, 0, 255, 0.1)',
        border: '1px solid rgba(161, 0, 255, 0.2)',
        borderRadius: '20px',
        padding: '2px 8px',
    },

    // Action Cards
    actionsContainer: {
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    actionCard: {
        backgroundColor: 'rgba(161, 0, 255, 0.06)',
        border: '1px solid rgba(161, 0, 255, 0.2)',
        borderRadius: '10px',
        padding: '10px 12px',
        backdropFilter: 'blur(8px)',
    },
    actionHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '6px',
    },
    actionType: {
        fontSize: '9px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#A100FF',
        backgroundColor: 'rgba(161, 0, 255, 0.15)',
        padding: '2px 6px',
        borderRadius: '4px',
    },
    actionLabel: {
        fontSize: '12px',
        fontWeight: 600,
        color: '#fff',
    },
    actionDesc: {
        fontSize: '11px',
        color: '#aaa',
        margin: '0 0 10px 0',
        lineHeight: 1.5,
    },
    actionButtons: {
        display: 'flex',
        gap: '6px',
    },
    confirmBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 12px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '6px',
        border: 'none',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        color: '#10b981',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    dismissBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '5px 12px',
        fontSize: '11px',
        fontWeight: 600,
        borderRadius: '6px',
        border: 'none',
        backgroundColor: 'rgba(255,255,255,0.05)',
        color: '#888',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },

    // Thinking Animation
    thinkingBubble: {
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(161, 0, 255, 0.15)',
        borderRadius: '14px 14px 14px 4px',
        padding: '12px 16px',
    },
    thinkingDots: {
        display: 'flex',
        gap: '5px',
    },
    dot: {
        display: 'inline-block',
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        backgroundColor: '#A100FF',
        boxShadow: '0 0 8px rgba(161, 0, 255, 0.5)',
    },

    // Pending Banner
    pendingBanner: {
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 20px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderTop: '1px solid rgba(245, 158, 11, 0.15)',
        borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
    },

    // Input
    inputContainer: {
        padding: '12px 16px 16px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        background: 'linear-gradient(180deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,1) 100%)',
    },
    inputWrapper: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(161, 0, 255, 0.2)',
        borderRadius: '12px',
        padding: '4px 4px 4px 14px',
        transition: 'all 0.2s',
    },
    input: {
        flex: 1,
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        color: '#e0e0e0',
        fontSize: '13px',
        fontFamily: 'Inter, system-ui, sans-serif',
        padding: '8px 0',
    },
    sendBtn: {
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #A100FF, #7000CC)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 0 12px rgba(161, 0, 255, 0.3)',
        flexShrink: 0,
    },
    disclaimer: {
        fontSize: '10px',
        color: '#555',
        textAlign: 'center',
        margin: '8px 0 0',
    },
};

export default AIAssistant;
