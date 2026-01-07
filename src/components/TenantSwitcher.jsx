/**
 * TenantSwitcher Component
 * Dropdown for switching between demo users to simulate multi-tenant RBAC
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, ChevronDown, Shield, User, Building2 } from 'lucide-react';

const TenantSwitcher = () => {
    const {
        currentUser,
        currentOrg,
        isDemoMode,
        switchUser,
        allDemoUsers,
        allDemoOrgs
    } = useAuth();

    const [isOpen, setIsOpen] = useState(false);

    if (!isDemoMode) return null;

    // Group users by organization
    const usersByOrg = allDemoOrgs.map(org => ({
        org,
        users: allDemoUsers.filter(u => u.org_id === org.id)
    }));

    const getRoleBadgeColor = (role) => {
        return role === 'Admin'
            ? { bg: 'rgba(161, 0, 255, 0.15)', color: '#A100FF', border: 'rgba(161, 0, 255, 0.3)' }
            : { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', border: 'rgba(107, 114, 128, 0.3)' };
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'rgba(161, 0, 255, 0.1)',
                    border: '1px solid rgba(161, 0, 255, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(161, 0, 255, 0.15)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(161, 0, 255, 0.1)'}
            >
                <Users size={16} color="#A100FF" />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {currentOrg?.name}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {currentUser?.name}
                    </span>
                </div>
                <span style={{
                    fontSize: '0.65rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '4px',
                    ...getRoleBadgeColor(currentUser?.role)
                }}>
                    {currentUser?.role}
                </span>
                <ChevronDown
                    size={14}
                    color="var(--text-muted)"
                    style={{
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease'
                    }}
                />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Menu */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        marginTop: '0.5rem',
                        minWidth: '280px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--bg-tertiary)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                        zIndex: 100,
                        overflow: 'hidden'
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid var(--bg-tertiary)',
                            backgroundColor: 'var(--bg-tertiary)'
                        }}>
                            <div style={{
                                fontSize: '0.65rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: '#A100FF',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                <Shield size={12} />
                                Demo Mode - Switch User
                            </div>
                        </div>

                        {/* Users by Org */}
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {usersByOrg.map(({ org, users }) => (
                                <div key={org.id}>
                                    {/* Org Header */}
                                    <div style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        borderBottom: '1px solid var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <Building2 size={12} color={org.theme} />
                                        <span style={{
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            color: org.theme
                                        }}>
                                            {org.name}
                                        </span>
                                    </div>

                                    {/* Users */}
                                    {users.map(user => {
                                        const isSelected = currentUser?.id === user.id;
                                        const colors = getRoleBadgeColor(user.role);

                                        return (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    switchUser(user.id);
                                                    setIsOpen(false);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.75rem',
                                                    padding: '0.75rem 1rem',
                                                    border: 'none',
                                                    backgroundColor: isSelected ? 'rgba(161, 0, 255, 0.1)' : 'transparent',
                                                    borderLeft: isSelected ? '3px solid #A100FF' : '3px solid transparent',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    textAlign: 'left'
                                                }}
                                                onMouseEnter={e => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                                                }}
                                                onMouseLeave={e => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    backgroundColor: user.role === 'Admin' ? 'rgba(161, 0, 255, 0.2)' : 'var(--bg-tertiary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexShrink: 0
                                                }}>
                                                    <User size={16} color={user.role === 'Admin' ? '#A100FF' : 'var(--text-muted)'} />
                                                </div>

                                                {/* Name & Email */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '0.875rem',
                                                        fontWeight: isSelected ? 600 : 500,
                                                        color: 'var(--text-primary)'
                                                    }}>
                                                        {user.name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: 'var(--text-muted)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {user.email}
                                                    </div>
                                                </div>

                                                {/* Role Badge */}
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '4px',
                                                    backgroundColor: colors.bg,
                                                    color: colors.color,
                                                    border: `1px solid ${colors.border}`,
                                                    flexShrink: 0
                                                }}>
                                                    {user.role}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div style={{
                            padding: '0.5rem 1rem',
                            borderTop: '1px solid var(--bg-tertiary)',
                            fontSize: '0.7rem',
                            color: 'var(--text-muted)',
                            textAlign: 'center'
                        }}>
                            Switch users to test tenant isolation & RBAC
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default TenantSwitcher;
