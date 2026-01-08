/**
 * TenantSwitcher Component
 * 
 * In Demo Mode: Switches between demo users (different orgs + roles)
 * In Real Mode: Switches between user's assigned portfolios
 */

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, ChevronDown, Shield, User, Building2, Star, Loader2, LogOut } from 'lucide-react';

const TenantSwitcher = () => {
    const {
        currentUser,
        currentOrg,
        currentOrgId,
        isDemoMode,
        switchUser,
        switchPortfolio,
        userPortfolios,
        allDemoUsers,
        allDemoOrgs,
        logout
    } = useAuth();


    const [isOpen, setIsOpen] = useState(false);
    const [isSwitching, setIsSwitching] = useState(false);

    // Don't show if no user or (not demo mode and no orgs to switch to)
    if (!currentUser) return null;
    if (!isDemoMode && (!userPortfolios || userPortfolios.length <= 1)) return null;

    // Group users by portfolio (for demo mode)
    const usersByOrg = isDemoMode ? allDemoOrgs.map(org => ({
        org,
        users: allDemoUsers.filter(u => u.org_id === org.id)
    })) : [];

    const getRoleBadgeColor = (role) => {
        return role === 'Admin' || role === 'admin'
            ? { bg: 'rgba(161, 0, 255, 0.15)', color: '#A100FF', border: 'rgba(161, 0, 255, 0.3)' }
            : { bg: 'rgba(107, 114, 128, 0.15)', color: 'var(--text-muted)', border: 'rgba(107, 114, 128, 0.3)' };
    };

    const handleOrgSwitch = async (orgId) => {
        if (orgId === currentOrgId) {
            setIsOpen(false);
            return;
        }

        setIsSwitching(true);
        try {
            await switchPortfolio(orgId);
        } catch (error) {
            console.error('Failed to switch portfolio:', error);
        } finally {
            setIsSwitching(false);
            setIsOpen(false);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isSwitching}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    backgroundColor: isDemoMode ? 'rgba(161, 0, 255, 0.1)' : 'var(--bg-tertiary)',
                    border: isDemoMode ? '1px solid rgba(161, 0, 255, 0.3)' : '1px solid var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    cursor: isSwitching ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    opacity: isSwitching ? 0.7 : 1
                }}
                onMouseEnter={e => !isSwitching && (e.currentTarget.style.backgroundColor = isDemoMode ? 'rgba(161, 0, 255, 0.15)' : 'var(--bg-secondary)')}
                onMouseLeave={e => !isSwitching && (e.currentTarget.style.backgroundColor = isDemoMode ? 'rgba(161, 0, 255, 0.1)' : 'var(--bg-tertiary)')}
            >
                {isSwitching ? (
                    <Loader2 size={16} color="#A100FF" className="animate-spin" />
                ) : (
                    <Building2 size={16} color={isDemoMode ? '#A100FF' : 'var(--text-muted)'} />
                )}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {currentOrg?.name || currentUser?.current_org_name || 'Portfolio'}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {currentUser?.name}
                    </span>
                </div>
                <span style={{
                    fontSize: '0.65rem',
                    padding: '0.125rem 0.375rem',
                    borderRadius: '4px',
                    ...getRoleBadgeColor(currentUser?.role || currentUser?.global_role)
                }}>
                    {currentUser?.role || currentUser?.global_role || 'User'}
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
                                color: isDemoMode ? '#A100FF' : 'var(--text-muted)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}>
                                {isDemoMode ? (
                                    <>
                                        <Shield size={12} />
                                        Demo Mode - Switch User
                                    </>
                                ) : (
                                    <>
                                        <Building2 size={12} />
                                        Switch Portfolio
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {isDemoMode ? (
                                /* Demo Mode: Show users grouped by org */
                                usersByOrg.map(({ org, users }) => (
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
                                ))
                            ) : (
                                /* Real Mode: Show user's assigned portfolios */
                                userPortfolios.map(org => {
                                    const isSelected = org.id === currentOrgId;

                                    return (
                                        <button
                                            key={org.id}
                                            onClick={() => handleOrgSwitch(org.id)}
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
                                            {/* Org Icon */}
                                            <div style={{
                                                width: 40,
                                                height: 40,
                                                borderRadius: 'var(--radius-sm)',
                                                backgroundColor: isSelected ? 'rgba(161, 0, 255, 0.2)' : 'var(--bg-tertiary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '1rem',
                                                fontWeight: 600,
                                                color: isSelected ? '#A100FF' : 'var(--text-muted)'
                                            }}>
                                                {org.name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Org Details */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: isSelected ? 600 : 500,
                                                    color: 'var(--text-primary)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    {org.name}
                                                    {org.is_primary && (
                                                        <Star size={12} color="var(--warning)" fill="var(--warning)" />
                                                    )}
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'var(--text-muted)'
                                                }}>
                                                    {org.slug}
                                                </div>
                                            </div>

                                            {isSelected && (
                                                <span style={{
                                                    fontSize: '0.65rem',
                                                    padding: '0.125rem 0.5rem',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                                    color: 'var(--success)',
                                                    border: '1px solid rgba(16, 185, 129, 0.3)'
                                                }}>
                                                    Active
                                                </span>
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer with Logout */}
                        <div style={{
                            padding: '0.5rem',
                            borderTop: '1px solid var(--bg-tertiary)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem'
                        }}>
                            <div style={{
                                fontSize: '0.7rem',
                                color: 'var(--text-muted)',
                                textAlign: 'center',
                                padding: '0 0.5rem'
                            }}>
                                {isDemoMode
                                    ? 'Switch users to test tenant isolation & RBAC'
                                    : 'You can switch between your assigned portfolios'
                                }
                            </div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    width: '100%',
                                    padding: '0.5rem 1rem',
                                    border: '1px solid var(--danger)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--danger)',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.backgroundColor = 'var(--danger)';
                                    e.currentTarget.style.color = 'white';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--danger)';
                                }}
                            >
                                <LogOut size={14} />
                                Log Out
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


export default TenantSwitcher;

