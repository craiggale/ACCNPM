/**
 * OrgSelector - Modal for selecting organization during two-phase login
 * 
 * Displayed when a user has multiple organization assignments
 * and needs to choose which org to log into.
 */

import React, { useState } from 'react';
import { Building2, Check, Star, Loader2 } from 'lucide-react';

const OrgSelector = ({
    organizations,
    onSelect,
    onCancel,
    isLoading = false
}) => {
    const [selectedOrgId, setSelectedOrgId] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);

    const handleSubmit = () => {
        if (selectedOrgId) {
            onSelect(selectedOrgId);
        }
    };

    // Sort to show primary org first
    const sortedOrgs = [...organizations].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1;
        if (!a.is_primary && b.is_primary) return 1;
        return a.name.localeCompare(b.name);
    });

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--bg-tertiary)',
                width: '100%',
                maxWidth: '420px',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(161, 0, 255, 0.2), rgba(161, 0, 255, 0.05))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem'
                    }}>
                        <Building2 size={28} color="var(--accent-primary)" />
                    </div>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem',
                        color: 'var(--text-primary)'
                    }}>
                        Select Organization
                    </h2>
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.875rem'
                    }}>
                        You have access to multiple organizations. Choose which one to access.
                    </p>
                </div>

                {/* Organization List */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    marginBottom: '1.5rem'
                }}>
                    {sortedOrgs.map(org => {
                        const isSelected = selectedOrgId === org.id;
                        const isHovered = hoveredId === org.id;

                        return (
                            <button
                                key={org.id}
                                onClick={() => setSelectedOrgId(org.id)}
                                onMouseEnter={() => setHoveredId(org.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem',
                                    backgroundColor: isSelected
                                        ? 'rgba(161, 0, 255, 0.15)'
                                        : isHovered
                                            ? 'var(--bg-tertiary)'
                                            : 'var(--bg-primary)',
                                    border: isSelected
                                        ? '2px solid var(--accent-primary)'
                                        : '1px solid var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-primary)'
                                    }}>
                                        {org.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{
                                            fontWeight: 500,
                                            color: 'var(--text-primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}>
                                            {org.name}
                                            {org.is_primary && (
                                                <Star
                                                    size={14}
                                                    color="var(--warning)"
                                                    fill="var(--warning)"
                                                    title="Primary Organization"
                                                />
                                            )}
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            color: 'var(--text-muted)'
                                        }}>
                                            {org.slug}
                                        </div>
                                    </div>
                                </div>

                                {isSelected && (
                                    <div style={{
                                        width: '24px',
                                        height: '24px',
                                        borderRadius: '50%',
                                        backgroundColor: 'var(--accent-primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Check size={14} color="white" />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {onCancel && (
                        <button
                            onClick={onCancel}
                            disabled={isLoading}
                            style={{
                                flex: 1,
                                padding: '0.75rem',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--bg-tertiary)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Cancel
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedOrgId || isLoading}
                        style={{
                            flex: 2,
                            padding: '0.75rem',
                            backgroundColor: selectedOrgId ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            color: selectedOrgId ? 'white' : 'var(--text-muted)',
                            cursor: selectedOrgId ? 'pointer' : 'not-allowed',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Signing in...
                            </>
                        ) : (
                            'Continue'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrgSelector;
