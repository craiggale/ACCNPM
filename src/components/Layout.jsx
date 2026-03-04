import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, TrendingUp, Settings, Users, Rocket, Target, BarChart2, Sun, Moon, User, Sparkles } from 'lucide-react';
import TenantSwitcher from './TenantSwitcher';
import AIAssistant from './AIAssistant';
import { useTheme } from '../context/ThemeContext';

const Layout = ({ children }) => {
    const location = useLocation();
    const { theme, toggleTheme, isDark } = useTheme();
    const [isAIOpen, setIsAIOpen] = useState(false);

    const navSections = [
        {
            title: 'MY ACCOUNT',
            items: [
                { path: '/my-account', label: 'My Account', icon: User },
            ]
        },
        {
            title: 'EXECUTIVE',
            items: [
                { path: '/executive', label: 'Executive Dashboard', icon: TrendingUp },
            ]
        },
        {
            title: 'WORKSPACE',
            items: [
                { path: '/track', label: 'Project Hub', icon: LayoutDashboard },
                { path: '/', label: 'Scenario Planner', icon: Calendar },
                { path: '/launch-status', label: 'Launch Status', icon: Rocket },
                { path: '/resources', label: 'Team Capacity', icon: Users },
            ]
        },
        {
            title: 'PERFORMANCE AND VALUE',
            items: [
                { path: '/kvi-tracking', label: 'Performance Trends', icon: Target },
                { path: '/initiatives', label: 'Initiatives', icon: Rocket },
            ]
        },
        {
            title: 'SETTINGS',
            items: [
                { path: '/admin', label: 'Admin', icon: Settings },
            ]
        }
    ];

    return (
        <div className="app-container" style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '260px',
                backgroundColor: 'var(--bg-secondary)',
                borderRight: '1px solid var(--bg-tertiary)',
                padding: 'var(--spacing-lg) var(--spacing-md)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ marginBottom: 'var(--spacing-xl)', paddingLeft: 'var(--spacing-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="text-xl" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px' }}></div>
                            ACCN-PM
                        </h1>
                        <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Intelligent Portfolio Management</p>
                    </div>
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        style={{
                            padding: '0.5rem',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-tertiary)',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isDark ? <Sun size={18} /> : <Moon size={18} />}
                    </button>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', flex: 1, overflowY: 'auto' }}>
                    {navSections.map((section, index) => (
                        <div key={index}>
                            <h3 style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                paddingLeft: '1rem',
                                marginBottom: '0.5rem',
                                letterSpacing: '0.05em'
                            }}>
                                {section.title}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.75rem',
                                                padding: '0.75rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                                backgroundColor: isActive ? 'var(--bg-tertiary)' : 'transparent',
                                                transition: 'all var(--transition-fast)',
                                                fontWeight: isActive ? 500 : 400
                                            }}
                                        >
                                            <Icon size={20} />
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Tenant Switcher */}
                <div style={{ marginTop: 'auto', paddingTop: 'var(--spacing-lg)', borderTop: '1px solid var(--bg-tertiary)' }}>
                    <TenantSwitcher />
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: 'var(--spacing-xl)', overflowY: 'auto', position: 'relative' }}>
                {children}

                {/* AI Assistant Floating Trigger */}
                <button
                    id="ai-assistant-trigger"
                    onClick={() => setIsAIOpen(true)}
                    title="AI Assistant"
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #A100FF, #7000CC)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 990,
                        boxShadow: '0 4px 24px rgba(161, 0, 255, 0.4), 0 0 40px rgba(161, 0, 255, 0.15)',
                        transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 6px 32px rgba(161, 0, 255, 0.6), 0 0 60px rgba(161, 0, 255, 0.25)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 24px rgba(161, 0, 255, 0.4), 0 0 40px rgba(161, 0, 255, 0.15)';
                    }}
                >
                    <Sparkles size={22} />
                </button>
            </main>

            {/* AI Assistant Drawer */}
            <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
        </div>
    );
};

export default Layout;
