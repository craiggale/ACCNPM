import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Trash2, Save, X, Sparkles, AlertCircle, CheckCircle2, Globe, Briefcase, Star, Percent } from 'lucide-react';

const ResourceManagement = () => {
    const { resources: allResources, addResource, updateResource, deleteResource, teams, tasks: allTasks, updateTask, autoAssignTasks } = useApp();
    const { currentUser, isDemoMode, allDemoUsers, allDemoOrgs } = useAuth();

    // View mode: 'portfolio' (current portfolio's team) or 'global' (all users across portfolios)
    const [viewMode, setViewMode] = useState('portfolio');

    // Tenant-aware filtering for portfolio view
    const resources = useMemo(() => {
        if (!isDemoMode || !currentUser) return allResources;
        return allResources.filter(r => r.org_id === currentUser.org_id);
    }, [allResources, currentUser, isDemoMode]);

    // State for explicit secondary portfolio assignments (only populated through user action)
    const [secondaryAssignments, setSecondaryAssignments] = useState({});
    // Format: { [userId]: [{ org_id: 'org-xxx', allocation: 30 }, ...] }

    // Global resource pool: all users with their portfolio allocations (for demo mode)
    // By default, all resources are 100% allocated to their primary portfolio
    // Secondary portfolios only appear when explicitly assigned via user confirmation
    const globalResourcePool = useMemo(() => {
        if (!isDemoMode) return [];

        return allDemoUsers.map(user => {
            const primaryOrg = allDemoOrgs.find(o => o.id === user.org_id);

            // Get any explicitly assigned secondary portfolios
            const userSecondaryAssignments = secondaryAssignments[user.id] || [];
            const secondaryAllocation = userSecondaryAssignments.reduce((sum, a) => sum + a.allocation, 0);

            // Primary allocation is 100% minus any secondary assignments
            const primaryAllocation = 100 - secondaryAllocation;

            // Build other portfolios list from secondary assignments
            const otherPortfolios = userSecondaryAssignments.map(assignment => {
                const org = allDemoOrgs.find(o => o.id === assignment.org_id);
                return org ? { ...org, allocation: assignment.allocation } : null;
            }).filter(Boolean);

            return {
                ...user,
                primaryPortfolio: primaryOrg,
                allocation: primaryAllocation,
                otherPortfolios: otherPortfolios,
                capacity_hours: 160,
                is_available: primaryAllocation < 100 // Available if not 100% on primary
            };
        });
    }, [isDemoMode, allDemoUsers, allDemoOrgs, secondaryAssignments]);


    const tasks = useMemo(() => {
        if (!isDemoMode || !currentUser) return allTasks;
        return allTasks;
    }, [allTasks, currentUser, isDemoMode]);

    const isAdmin = currentUser?.role === 'Admin';

    const [isAdding, setIsAdding] = useState(false);
    const [newResource, setNewResource] = useState({ name: '', role: 'Developer', team: 'Website', capacity: 160 });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [gaps, setGaps] = useState([]);
    const [sharedAssignments, setSharedAssignments] = useState([]);
    const [crossPortfolioSuggestions, setCrossPortfolioSuggestions] = useState([]);
    const [assignmentSummary, setAssignmentSummary] = useState(null);
    const [showGaps, setShowGaps] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);

    // Calculate Utilization
    const resourceUtilization = useMemo(() => {
        const usage = {};
        resources.forEach(r => usage[r.id] = 0);

        tasks.forEach(task => {
            if (task.assignee && usage[task.assignee] !== undefined && task.status !== 'Completed') {
                usage[task.assignee] += (parseInt(task.estimate) || 0);
            }
        });
        return usage;
    }, [resources, tasks]);

    const totalCapacity = useMemo(() => resources.reduce((sum, r) => sum + (parseInt(r.capacity) - (parseInt(r.leave) || 0)), 0), [resources]);
    const totalAssigned = useMemo(() => Object.values(resourceUtilization).reduce((sum, val) => sum + val, 0), [resourceUtilization]);

    const handleAutoAssign = () => {
        const result = autoAssignTasks();
        // Handle both old (array) and new (object) return types
        if (Array.isArray(result)) {
            setGaps(result);
            setSharedAssignments([]);
            setCrossPortfolioSuggestions([]);
            setAssignmentSummary(null);
        } else {
            setGaps(result.gaps || []);
            setSharedAssignments(result.sharedAssignments || []);
            setCrossPortfolioSuggestions(result.crossPortfolioSuggestions || []);
            setAssignmentSummary(result.summary || null);
        }
        setShowGaps(true);
    };

    const handleAdd = (e) => {
        e.preventDefault();
        addResource({ ...newResource, capacity: parseInt(newResource.capacity) });
        setNewResource({ name: '', role: 'Developer', team: 'Website', capacity: 160 });
        setIsAdding(false);
    };

    const startEdit = (e, resource) => {
        e.stopPropagation();
        setEditingId(resource.id);
        setEditForm({ ...resource });
    };

    const saveEdit = (e) => {
        e.stopPropagation();
        updateResource(editingId, {
            ...editForm,
            capacity: parseInt(editForm.capacity),
            leave: parseInt(editForm.leave) || 0
        });
        setEditingId(null);
    };

    // Confirm cross-portfolio assignment (adds secondary portfolio to a user)
    const confirmCrossPortfolioAssignment = (userId, targetOrgId, allocationPercent = 30) => {
        setSecondaryAssignments(prev => {
            const existing = prev[userId] || [];
            // Check if already assigned to this org
            if (existing.some(a => a.org_id === targetOrgId)) {
                return prev; // Already assigned
            }
            return {
                ...prev,
                [userId]: [...existing, { org_id: targetOrgId, allocation: allocationPercent }]
            };
        });
    };

    // Remove cross-portfolio assignment
    const removeCrossPortfolioAssignment = (userId, targetOrgId) => {
        setSecondaryAssignments(prev => ({
            ...prev,
            [userId]: (prev[userId] || []).filter(a => a.org_id !== targetOrgId)
        }));
    };

    const getUtilizationColor = (used, capacity) => {
        const ratio = used / capacity;
        if (ratio > 1) return 'var(--danger)';
        if (ratio > 0.8) return 'var(--warning)';
        return 'var(--success)';
    };

    const handleTaskUpdate = (taskId, updates) => {
        updateTask(taskId, updates);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="text-2xl">Team & Capacity</h2>
                    <p className="text-muted">Manage your team members and optimize resource allocation.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* View Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        backgroundColor: 'var(--bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        padding: '4px',
                        gap: '2px'
                    }}>
                        <button
                            onClick={() => setViewMode('portfolio')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                backgroundColor: viewMode === 'portfolio' ? 'var(--bg-secondary)' : 'transparent',
                                color: viewMode === 'portfolio' ? 'var(--text-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease',
                                fontWeight: viewMode === 'portfolio' ? 500 : 400
                            }}
                        >
                            <Briefcase size={14} />
                            Portfolio Team
                        </button>
                        <button
                            onClick={() => setViewMode('global')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                border: 'none',
                                backgroundColor: viewMode === 'global' ? 'var(--bg-secondary)' : 'transparent',
                                color: viewMode === 'global' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease',
                                fontWeight: viewMode === 'global' ? 500 : 400
                            }}
                        >
                            <Globe size={14} />
                            Global Pool
                        </button>
                    </div>

                    <button
                        className="btn btn-primary"
                        onClick={handleAutoAssign}
                        style={{ background: 'linear-gradient(135deg, #A100FF 0%, #7100B3 100%)', border: 'none' }}
                    >
                        <Sparkles size={16} style={{ marginRight: '8px' }} /> Auto-Assign Resources
                    </button>
                </div>
            </header>


            {/* Assignment Summary */}
            {showGaps && assignmentSummary && (
                <div className="card" style={{
                    marginBottom: 'var(--spacing-lg)',
                    border: '1px solid var(--accent-primary)',
                    backgroundColor: 'rgba(161, 0, 255, 0.05)',
                    padding: 'var(--spacing-md)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="text-lg" style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={20} /> Auto-Assign Summary
                        </h3>
                        <button onClick={() => setShowGaps(false)} className="btn-ghost"><X size={20} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{assignmentSummary.assigned}</div>
                            <div className="text-sm text-muted">Assigned</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{assignmentSummary.unassigned}</div>
                            <div className="text-sm text-muted">Gaps</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{assignmentSummary.usedSharedResources}</div>
                            <div className="text-sm text-muted">Shared Used</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10B981' }}>{assignmentSummary.canReallocate}</div>
                            <div className="text-sm text-muted">Can Reallocate</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Shared Resource Assignments */}
            {showGaps && sharedAssignments.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-md)', border: '1px solid var(--accent-primary)', backgroundColor: 'rgba(161, 0, 255, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Globe size={18} color="var(--accent-primary)" />
                        <h4 className="text-lg" style={{ color: 'var(--accent-primary)' }}>Assigned to Shared Resources ({sharedAssignments.length})</h4>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                        {sharedAssignments.map((item, index) => (
                            <div key={index} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(161, 0, 255, 0.2)' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{item.taskTitle}</div>
                                <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>{item.projectName}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-sm" style={{ padding: '0.1rem 0.5rem', borderRadius: '1rem', backgroundColor: 'rgba(161, 0, 255, 0.1)', color: 'var(--accent-primary)' }}>
                                        → {item.assignedTo}
                                    </span>
                                    <span className="text-sm text-muted">{item.estimate}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cross-Portfolio Reallocation Suggestions */}
            {showGaps && crossPortfolioSuggestions.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-md)', border: '1px solid #10B981', backgroundColor: 'rgba(16, 185, 129, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <Globe size={18} color="#10B981" />
                        <h4 className="text-lg" style={{ color: '#10B981' }}>Cross-Portfolio Reallocation Suggestions ({crossPortfolioSuggestions.length})</h4>
                    </div>
                    <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>
                        These tasks could be filled by assigning resources from other portfolios.
                    </p>
                    <p className="text-sm" style={{ marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={14} /> Requires confirmation — resources will be assigned to this portfolio as secondary.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {crossPortfolioSuggestions.map((suggestion, index) => (
                            <div key={index} style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{suggestion.taskTitle}</div>
                                        <div className="text-sm text-muted">{suggestion.projectName} • {suggestion.requiredTeam} • {suggestion.estimate}h</div>
                                    </div>
                                </div>
                                <div className="text-sm" style={{ marginBottom: '0.5rem', fontWeight: 500 }}>Available candidates from other portfolios:</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {suggestion.candidates.map((candidate, i) => (
                                        <div key={i} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            borderRadius: 'var(--radius-sm)',
                                            border: '1px solid rgba(16, 185, 129, 0.2)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 500, color: '#10B981', fontSize: '0.875rem' }}>{candidate.name}</div>
                                                <div className="text-sm text-muted">
                                                    {candidate.portfolioName} • {candidate.currentAllocation}% allocated • {candidate.availableHours}h free
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    confirmCrossPortfolioAssignment(candidate.id, currentUser.org_id, 30);
                                                    // Optional: remove this suggestion after confirming
                                                    setCrossPortfolioSuggestions(prev =>
                                                        prev.map((s, idx) => idx === index
                                                            ? { ...s, candidates: s.candidates.filter((_, ci) => ci !== i) }
                                                            : s
                                                        ).filter(s => s.candidates.length > 0)
                                                    );
                                                }}
                                                style={{
                                                    padding: '0.375rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    border: '1px solid #10B981',
                                                    backgroundColor: 'transparent',
                                                    color: '#10B981',
                                                    cursor: 'pointer',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onMouseEnter={e => {
                                                    e.currentTarget.style.backgroundColor = '#10B981';
                                                    e.currentTarget.style.color = 'white';
                                                }}
                                                onMouseLeave={e => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.color = '#10B981';
                                                }}
                                            >
                                                Assign to Portfolio
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Gaps / Unassigned Tasks */}
            {showGaps && gaps.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="text-lg" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={20} /> Resourcing Gaps ({gaps.length})
                        </h3>
                        {!assignmentSummary && <button onClick={() => setShowGaps(false)} className="btn-ghost"><X size={20} /></button>}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {gaps.map((gap, index) => (
                            <div key={index} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{gap.taskTitle}</div>
                                <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>{gap.projectName} • {gap.requiredTeam}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-sm" style={{ padding: '0.1rem 0.5rem', borderRadius: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                        {gap.reason}
                                    </span>
                                    <span className="text-sm text-muted">{gap.estimate}h</span>
                                </div>
                                {gap.hasCrossPortfolioOption && (
                                    <div className="text-sm" style={{ marginTop: '0.5rem', color: '#10B981' }}>
                                        ✓ Cross-portfolio option available
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showGaps && gaps.length === 0 && !assignmentSummary && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="text-lg" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 size={20} /> All tasks successfully assigned!
                        </h3>
                        <button onClick={() => setShowGaps(false)} className="btn-ghost"><X size={20} /></button>
                    </div>
                </div>
            )}

            {/* Global Resource Pool View */}
            {viewMode === 'global' && (
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <div>
                            <h3 className="text-xl" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Globe size={20} color="var(--accent-primary)" />
                                Global Resource Pool
                            </h3>
                            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
                                View all team members across portfolios with their allocation status.
                            </p>
                        </div>
                    </div>

                    {/* Column Headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr', padding: '0.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.875rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                        <div>Name</div>
                        <div>Primary Portfolio</div>
                        <div>Allocation</div>
                        <div>Other Portfolios</div>
                        <div>Available</div>
                    </div>

                    {/* Global Users List */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {globalResourcePool.map(user => (
                            <div
                                key={user.id}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1fr',
                                    padding: '1rem',
                                    borderBottom: '1px solid var(--bg-primary)',
                                    alignItems: 'center',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {/* Name & Role */}
                                <div>
                                    <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {user.name}
                                        {user.role === 'Admin' && (
                                            <span style={{
                                                fontSize: '0.6rem',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                backgroundColor: 'rgba(161, 0, 255, 0.15)',
                                                color: 'var(--accent-primary)'
                                            }}>
                                                {user.role}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted">{user.email}</div>
                                </div>

                                {/* Primary Portfolio */}
                                <div>
                                    <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: user.primaryPortfolio?.theme ? `${user.primaryPortfolio.theme}15` : 'var(--bg-tertiary)',
                                        border: `1px solid ${user.primaryPortfolio?.theme || 'var(--bg-tertiary)'}30`
                                    }}>
                                        <Star size={12} color={user.primaryPortfolio?.theme || 'var(--text-muted)'} fill={user.primaryPortfolio?.theme || 'var(--text-muted)'} />
                                        <span style={{ fontSize: '0.875rem', color: user.primaryPortfolio?.theme || 'var(--text-primary)' }}>
                                            {user.primaryPortfolio?.name || 'Unassigned'}
                                        </span>
                                    </div>
                                </div>

                                {/* Allocation */}
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '50px',
                                            height: '6px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${user.allocation}%`,
                                                height: '100%',
                                                backgroundColor: user.allocation === 100 ? 'var(--success)' : 'var(--accent-primary)',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>
                                        <span style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: user.allocation === 100 ? 'var(--success)' : 'var(--accent-primary)'
                                        }}>
                                            {user.allocation}%
                                        </span>
                                    </div>
                                </div>

                                {/* Other Portfolios */}
                                <div>
                                    {user.otherPortfolios.length > 0 ? (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                            {user.otherPortfolios.map(op => (
                                                <span
                                                    key={op.id}
                                                    style={{
                                                        fontSize: '0.75rem',
                                                        padding: '0.15rem 0.5rem',
                                                        borderRadius: '4px',
                                                        backgroundColor: `${op.theme}15`,
                                                        color: op.theme,
                                                        border: `1px solid ${op.theme}30`
                                                    }}
                                                >
                                                    {op.name} ({op.allocation}%)
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-sm text-muted">—</span>
                                    )}
                                </div>

                                {/* Available Capacity */}
                                <div>
                                    {user.is_available ? (
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                            color: 'var(--success)',
                                            fontSize: '0.75rem',
                                            fontWeight: 500
                                        }}>
                                            {Math.round(user.capacity_hours * (100 - user.allocation) / 100)}h free
                                        </span>
                                    ) : (
                                        <span className="text-sm text-muted">Fully allocated</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Summary */}
                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        justifyContent: 'space-between'
                    }}>
                        <div>
                            <span className="text-sm text-muted">Total Resources: </span>
                            <span style={{ fontWeight: 600 }}>{globalResourcePool.length}</span>
                        </div>
                        <div>
                            <span className="text-sm text-muted">With Available Capacity: </span>
                            <span style={{ fontWeight: 600, color: 'var(--success)' }}>
                                {globalResourcePool.filter(u => u.is_available).length}
                            </span>
                        </div>
                        <div>
                            <span className="text-sm text-muted">Fully Allocated: </span>
                            <span style={{ fontWeight: 600 }}>
                                {globalResourcePool.filter(u => !u.is_available).length}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Portfolio Team View (existing) */}
            {viewMode === 'portfolio' && (
                <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 'var(--spacing-xl)' }}>

                    {/* Resource List */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <h3 className="text-xl">Team Members</h3>
                            <button className="btn btn-ghost" onClick={() => setIsAdding(true)} style={{ border: '1px solid var(--bg-tertiary)' }}>
                                <Plus size={16} style={{ marginRight: '4px' }} /> Add Member
                            </button>
                        </div>


                        {isAdding && (
                            <form onSubmit={handleAdd} style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--spacing-sm)', alignItems: 'end' }}>
                                    <div>
                                        <label className="text-sm text-muted">Name</label>
                                        <input
                                            type="text"
                                            value={newResource.name}
                                            onChange={e => setNewResource({ ...newResource, name: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted">Role</label>
                                        <select
                                            value={newResource.role}
                                            onChange={e => setNewResource({ ...newResource, role: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            required
                                        >
                                            <option value="Developer">Developer</option>
                                            <option value="Designer">Designer</option>
                                            <option value="Manager">Manager</option>
                                            <option value="QA">QA</option>
                                            <option value="Product Owner">Product Owner</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted">Team</label>
                                        <select
                                            value={newResource.team}
                                            onChange={e => setNewResource({ ...newResource, team: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            required
                                        >
                                            {teams.map(team => (
                                                <option key={team} value={team}>{team}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted">Capacity (Hrs)</label>
                                        <input
                                            type="number"
                                            value={newResource.capacity}
                                            onChange={e => setNewResource({ ...newResource, capacity: e.target.value })}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}><Save size={16} /></button>
                                        <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)} style={{ padding: '0.5rem' }}><X size={16} /></button>
                                    </div>
                                </div>
                            </form>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                                <div>Name</div>
                                <div>Role</div>
                                <div>Team</div>
                                <div>Utilization</div>
                                <div></div>
                            </div>

                            {resources.map(resource => {
                                const used = resourceUtilization[resource.id] || 0;
                                const capacity = parseInt(resource.capacity);
                                const leave = parseInt(resource.leave) || 0;
                                const effectiveCapacity = capacity - leave;
                                const percent = Math.min((used / effectiveCapacity) * 100, 100);
                                const color = getUtilizationColor(used, effectiveCapacity);

                                return (
                                    <div
                                        key={resource.id}
                                        onClick={() => setSelectedResource(resource)}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: '2fr 1fr 1fr 2fr auto',
                                            padding: '0.75rem 0.5rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                            borderRadius: 'var(--radius-md)',
                                            alignItems: 'center',
                                            borderBottom: '1px solid var(--bg-primary)',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                                    >
                                        {editingId === resource.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                />
                                                <select
                                                    value={editForm.role}
                                                    onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                >
                                                    <option value="Developer">Developer</option>
                                                    <option value="Designer">Designer</option>
                                                    <option value="Manager">Manager</option>
                                                    <option value="QA">QA</option>
                                                    <option value="Product Owner">Product Owner</option>
                                                </select>
                                                <select
                                                    value={editForm.team}
                                                    onChange={e => setEditForm({ ...editForm, team: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                >
                                                    {teams.map(team => (
                                                        <option key={team} value={team}>{team}</option>
                                                    ))}
                                                </select>
                                                <input
                                                    type="number"
                                                    value={editForm.capacity}
                                                    onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                                                    onClick={e => e.stopPropagation()}
                                                    style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                                />
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button onClick={saveEdit} className="btn-ghost" style={{ color: 'var(--success)' }}><Save size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="btn-ghost" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ fontWeight: 500 }}>{resource.name}</div>
                                                <div className="text-sm text-muted">{resource.role}</div>
                                                <div className="text-sm text-muted">{resource.team || 'Website'}</div>

                                                {/* Utilization Bar */}
                                                <div style={{ paddingRight: '1rem' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>
                                                            {used} / {effectiveCapacity}h
                                                            {leave > 0 && <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>(-{leave}h Leave)</span>}
                                                        </span>
                                                        <span style={{ color: color, fontWeight: 500 }}>{Math.round((used / effectiveCapacity) * 100)}%</span>
                                                    </div>
                                                    <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s ease' }}></div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    <button onClick={(e) => startEdit(e, resource)} className="btn-ghost" style={{ padding: '0.25rem' }}>Edit</button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteResource(resource.id); }} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Summary Panel */}
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)' }}>Capacity Summary</h3>

                        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                            <div className="text-sm text-muted">Total Monthly Capacity</div>
                            <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
                                {totalCapacity}
                            </div>
                            <div className="text-sm text-muted">Hours</div>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="text-sm text-muted">Total Assigned</span>
                                <span className="text-sm" style={{ fontWeight: 500 }}>{totalAssigned}h</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((totalAssigned / totalCapacity) * 100, 100)}%`, height: '100%', backgroundColor: 'var(--accent-primary)' }}></div>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {Math.round((totalAssigned / totalCapacity) * 100)}% Utilized
                            </div>
                        </div>

                        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(161, 0, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(161, 0, 255, 0.1)' }}>
                            <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Sparkles size={16} color="var(--accent-primary)" /> AI Optimization
                            </h4>
                            <p className="text-sm text-muted">
                                Use <strong>Auto-Assign</strong> to automatically match tasks to team members based on their role, team, and available capacity.
                            </p>
                        </div>
                    </div>

                </div>
            )}

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedResource(null)}>
                    <div className="card" style={{ width: '800px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <div>
                                <h3 className="text-xl">{selectedResource.name}</h3>
                                <p className="text-muted">{selectedResource.role} • {selectedResource.team}</p>
                            </div>
                            <button onClick={() => setSelectedResource(null)} className="btn-ghost"><X size={24} /></button>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="text-sm text-muted">Utilization</span>
                                <span className="text-sm" style={{ fontWeight: 500 }}>
                                    {resourceUtilization[selectedResource.id] || 0} / {parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0)}h
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(((resourceUtilization[selectedResource.id] || 0) / (parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0))) * 100, 100)}%`,
                                    height: '100%',
                                    backgroundColor: getUtilizationColor(resourceUtilization[selectedResource.id] || 0, parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0))
                                }}></div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-xl)', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                            <h4 className="text-lg" style={{ marginBottom: '0.5rem' }}>Leave Management</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Leave Hours (This Month)</label>
                                    <input
                                        type="number"
                                        value={selectedResource.leave || 0}
                                        onChange={(e) => {
                                            const newLeave = parseInt(e.target.value) || 0;
                                            updateResource(selectedResource.id, { leave: newLeave });
                                            setSelectedResource(prev => ({ ...prev, leave: newLeave }));
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="text-sm text-muted">Effective Capacity</div>
                                    <div className="text-xl" style={{ color: 'var(--text-primary)' }}>
                                        {parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0)}h
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h4 className="text-lg" style={{ marginBottom: 'var(--spacing-md)' }}>Assigned Tasks</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {tasks.filter(t => t.assignee === selectedResource.id).length === 0 && (
                                <p className="text-muted">No tasks assigned.</p>
                            )}
                            {tasks.filter(t => t.assignee === selectedResource.id).map(task => (
                                <div key={task.id} style={{
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--bg-tertiary)',
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr auto',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                                        {/* Find project name if possible, or just show ID for now */}
                                        <div className="text-sm text-muted">Project ID: {task.projectId}</div>
                                    </div>

                                    <select
                                        value={task.status}
                                        onChange={(e) => handleTaskUpdate(task.id, { status: e.target.value })}
                                        style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            value={task.estimate}
                                            onChange={(e) => handleTaskUpdate(task.id, { estimate: parseInt(e.target.value) || 0 })}
                                            style={{ width: '60px', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                        <span className="text-sm text-muted">hrs</span>
                                    </div>

                                    <button
                                        className="btn-ghost"
                                        style={{ color: 'var(--danger)' }}
                                        onClick={() => handleTaskUpdate(task.id, { assignee: null })}
                                        title="Unassign"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceManagement;
