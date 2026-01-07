import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, TrendingUp, Settings, Users, Rocket, Target, BarChart2 } from 'lucide-react';
import TenantSwitcher from './TenantSwitcher';

const Layout = ({ children }) => {
    const location = useLocation();

    const navSections = [
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
                { path: '/kvi-tracking', label: 'KVI Tracking', icon: Target },
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
                <div style={{ marginBottom: 'var(--spacing-xl)', paddingLeft: 'var(--spacing-sm)' }}>
                    <h1 className="text-xl" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '24px', height: '24px', background: 'var(--accent-primary)', borderRadius: '6px' }}></div>
                        ACCN-PM
                    </h1>
                    <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>Intelligent Project Mgmt</p>
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
            <main style={{ flex: 1, padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
                {children}
            </main>
        </div>
    );
};

export default Layout;

