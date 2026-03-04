import { useState, useMemo, useCallback } from 'react';
import {
    AlertTriangle, CheckCircle, AlertCircle, Plus, Trash2, GripVertical,
    Users, BarChart3, ArrowUpDown, Pause, Minimize2, ChevronDown, ChevronUp,
    Zap, Save
} from 'lucide-react';
import { addMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { getRoleDistribution, normalizeRole } from '../../utils/ResolutionEngine';

// ─────────────────────────────────────────────
// Calculation Engine (client-side, instant)
// ─────────────────────────────────────────────

function calculateScenario(projects, resources, priorityOrder, virtualResources, timelineShifts) {
    const ROLES = ['Developer', 'Designer', 'QA', 'Manager'];
    const today = new Date();
    const months = Array.from({ length: 12 }, (_, i) => {
        const d = addMonths(today, i);
        return { key: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d) };
    });

    // Track global deficits per role per month to suggest capacity
    const globalRoleDeficits = {};
    ROLES.forEach(r => globalRoleDeficits[r] = { maxDeficit: 0, months: {} });

    // 1. Build effective capacity per role per month
    const roleCapacity = {};
    ROLES.forEach(role => {
        roleCapacity[role] = {};
        months.forEach(m => {
            const baseHours = resources
                .filter(r => normalizeRole(r.role) === role)
                .reduce((sum, r) => sum + parseInt(r.capacity || 0), 0);
            const virtualHours = virtualResources
                .filter(vr => vr.role === role)
                .reduce((sum, vr) => sum + vr.hoursPerMonth, 0);
            roleCapacity[role][m.key] = baseHours + virtualHours;
        });
    });

    // 2. Build demand per project per role per month, applying timeline shifts
    const projectDemand = {};
    projects.forEach(p => {
        if (p.status === 'Paused') return;
        const shift = timelineShifts[p.id] || 0;
        const pStart = addMonths(new Date(p.startDate), shift);
        const pEnd = addMonths(new Date(p.endDate), shift);

        let monthlyHours = 320;
        if (p.scale === 'Small') monthlyHours = 160;
        if (p.scale === 'Large') monthlyHours = 640;

        const dist = getRoleDistribution(p.type || 'Website');
        projectDemand[p.id] = { total: 0, monthly: {} };

        months.forEach(m => {
            if (pStart <= m.end && pEnd >= m.start) {
                const roleDemand = {};
                Object.entries(dist).forEach(([role, ratio]) => {
                    roleDemand[role] = Math.round(monthlyHours * ratio);
                });
                projectDemand[p.id].monthly[m.key] = roleDemand;
                projectDemand[p.id].total += Object.values(roleDemand).reduce((s, v) => s + v, 0);
            }
        });
    });

    // 3. Allocate capacity month-by-month in priority order
    const remaining = {};
    ROLES.forEach(role => {
        remaining[role] = {};
        months.forEach(m => {
            remaining[role][m.key] = roleCapacity[role][m.key];
        });
    });

    const projectStatus = {};
    const orderedProjects = priorityOrder
        .map(id => projects.find(p => p.id === id))
        .filter(Boolean)
        .filter(p => p.status !== 'Paused');

    // Add any projects not in priority order at the end
    projects.forEach(p => {
        if (p.status !== 'Paused' && !priorityOrder.includes(p.id)) {
            orderedProjects.push(p);
        }
    });

    orderedProjects.forEach(p => {
        const demand = projectDemand[p.id];
        if (!demand) {
            projectStatus[p.id] = { status: 'staffed', totalDeficit: 0, monthlyDeficit: {} };
            return;
        }

        let totalDeficit = 0;
        const monthlyDeficit = {};
        const roleDeficits = {}; // NEW: track which roles are missing

        months.forEach(m => {
            const monthDemand = demand.monthly[m.key];
            if (!monthDemand) return;

            let monthDeficit = 0;
            Object.entries(monthDemand).forEach(([role, hours]) => {
                const available = remaining[role]?.[m.key] || 0;
                const allocated = Math.min(hours, available);
                if (remaining[role]) {
                    remaining[role][m.key] = available - allocated;
                }
                const deficit = hours - allocated;
                if (deficit > 0) {
                    monthDeficit += deficit;
                    roleDeficits[role] = (roleDeficits[role] || 0) + deficit;

                    // Accumulate global deficit for this role in this month
                    globalRoleDeficits[role].months[m.key] = (globalRoleDeficits[role].months[m.key] || 0) + deficit;
                }
            });

            if (monthDeficit > 0) {
                monthlyDeficit[m.key] = monthDeficit;
                totalDeficit += monthDeficit;
            }
        });


        const roleBreakdown = {};

        // Calculate role-level totals for the project
        Object.entries(roleDeficits).forEach(([role, deficit]) => {
            // Calculate total demand for this role across all months
            let roleTotalDemand = 0;
            months.forEach(m => {
                if (demand.monthly[m.key] && demand.monthly[m.key][role]) {
                    roleTotalDemand += demand.monthly[m.key][role];
                }
            });

            // If there was no deficit, then allocated = demand
            // If there was a deficit, allocated = demand - deficit
            const allocated = roleTotalDemand - deficit;

            roleBreakdown[role] = {
                required: roleTotalDemand,
                allocated: allocated,
                deficit: deficit,
                status: deficit === 0 ? 'staffed' : allocated === 0 ? 'unstaffed' : 'partial'
            };
        });

        // Ensure we capture roles that are fully staffed (deficit = 0)
        // Iterate through all roles that had demand
        months.forEach(m => {
            if (demand.monthly[m.key]) {
                Object.keys(demand.monthly[m.key]).forEach(role => {
                    if (!roleBreakdown[role]) {
                        let roleTotalDemand = 0;
                        months.forEach(month => {
                            if (demand.monthly[month.key] && demand.monthly[month.key][role]) {
                                roleTotalDemand += demand.monthly[month.key][role];
                            }
                        });
                        roleBreakdown[role] = {
                            required: roleTotalDemand,
                            allocated: roleTotalDemand,
                            deficit: 0,
                            status: 'staffed'
                        };
                    }
                });
            }
        });

        const status = totalDeficit === 0 ? 'staffed' : totalDeficit < (demand.total * 0.5) ? 'partial' : 'unstaffed';
        projectStatus[p.id] = { status, totalDeficit, monthlyDeficit, roleDeficits, roleBreakdown };
    });

    // 4. Build role utilization for heatmap
    const roleUtilization = {};
    ROLES.forEach(role => {
        roleUtilization[role] = {};
        months.forEach(m => {
            const cap = roleCapacity[role][m.key];
            const used = cap - (remaining[role]?.[m.key] || 0);
            const pct = cap > 0 ? Math.round((used / cap) * 100) : 0;
            roleUtilization[role][m.key] = { capacity: cap, used, percentage: pct };
        });
    });

    const totalDeficit = Object.values(projectStatus).reduce((s, ps) => s + ps.totalDeficit, 0);
    const staffedCount = Object.values(projectStatus).filter(ps => ps.status === 'staffed').length;
    const partialCount = Object.values(projectStatus).filter(ps => ps.status === 'partial').length;
    const unstaffedCount = Object.values(projectStatus).filter(ps => ps.status === 'unstaffed').length;

    return {
        roleUtilization,
        projectStatus,
        totalDeficit,
        staffedCount,
        partialCount,
        unstaffedCount,
        months: months, // Return full objects for UI positioning
        globalRoleDeficits // Return calculated suggestions
    };
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

const GapCard = ({ title, subTitle, assigned, required, deficit, onResolve, heatmapData }) => {
    const percent = required > 0 ? Math.round((assigned / required) * 100) : 0;
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div
            style={{
                marginBottom: '8px', padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
                position: 'relative'
            }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</div>
                    {subTitle && <div className="text-xs text-muted">{subTitle}</div>}
                </div>
                {deficit > 0 && onResolve && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onResolve(); }}
                        className="btn-xs"
                        style={{
                            backgroundColor: 'rgba(161, 0, 255, 0.1)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--accent-primary)',
                            display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <Zap size={12} /> Resolve with AI
                    </button>
                )}
            </div>

            {/* Duo-tone Capacity Bar */}
            <div style={{ height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${Math.min(100, percent)}%`, backgroundColor: 'var(--accent-primary)', height: '100%' }} />
                {deficit > 0 && (
                    <div style={{ flex: 1, backgroundColor: 'var(--danger)', height: '100%' }} />
                )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>{assigned}h Assigned</span>
                <span>{required}h Needed</span>
            </div>

            {/* Heatmap Tooltip */}
            {showTooltip && heatmapData && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    marginTop: '4px', padding: '8px',
                    backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: '8px',
                    backdropFilter: 'blur(4px)', border: '1px solid var(--bg-tertiary)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    <div className="text-xs" style={{ marginBottom: '4px', fontWeight: 600, color: 'var(--text-muted)' }}>4-MONTH FORECAST</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                        {heatmapData.slice(0, 4).map(month => (
                            <div key={month.key} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '0.65rem', marginBottom: '2px', color: 'var(--text-muted)' }}>{month.key}</div>
                                <div style={{
                                    height: '4px', borderRadius: '2px',
                                    backgroundColor: month.pct > 100 ? 'var(--danger)' : month.pct > 80 ? 'var(--warning)' : 'var(--success)'
                                }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const CapacityPlayground = ({ projects, resources, conflict, onApplyChanges, isMaximized, onToggleMaximize }) => {
    // --- Local Playground State ---
    const [priorityOrder, setPriorityOrder] = useState(() =>
        projects.filter(p => p.status !== 'Paused').map(p => p.id)
    );
    const [virtualResources, setVirtualResources] = useState([]);
    const [timelineShifts, setTimelineShifts] = useState({});
    const [pausedProjects, setPausedProjects] = useState([]);
    const [expandedProjects, setExpandedProjects] = useState([]); // Array of expanded project IDs

    // Virtual resource form
    const [vrRole, setVrRole] = useState('Developer');
    const [vrHours, setVrHours] = useState(160);

    // Drag state
    const [dragIdx, setDragIdx] = useState(null);
    const [dragOverIdx, setDragOverIdx] = useState(null);

    // Section visibility
    const [showHeatmap, setShowHeatmap] = useState(true);

    const [groupBy, setGroupBy] = useState('project'); // 'project' | 'role'

    // Build effective project list (with pauses applied)
    const effectiveProjects = useMemo(() =>
        projects.map(p => ({
            ...p,
            status: pausedProjects.includes(p.id) ? 'Paused' : p.status
        })),
        [projects, pausedProjects]
    );

    // Run calculation engine
    const scenario = useMemo(() =>
        calculateScenario(effectiveProjects, resources, priorityOrder, virtualResources, timelineShifts),
        [effectiveProjects, resources, priorityOrder, virtualResources, timelineShifts]
    );

    // Drag handlers
    const handleDragStart = useCallback((idx) => setDragIdx(idx), []);
    const handleDragOver = useCallback((e, idx) => {
        e.preventDefault();
        setDragOverIdx(idx);
    }, []);
    const handleDrop = useCallback((idx) => {
        if (dragIdx === null || dragIdx === idx) return;
        const newOrder = [...priorityOrder];
        const [moved] = newOrder.splice(dragIdx, 1);
        newOrder.splice(idx, 0, moved);
        setPriorityOrder(newOrder);
        setDragIdx(null);
        setDragOverIdx(null);
    }, [dragIdx, priorityOrder]);
    const handleDragEnd = useCallback(() => {
        setDragIdx(null);
        setDragOverIdx(null);
    }, []);

    // Virtual resource handlers
    const addVirtualResource = () => {
        setVirtualResources([...virtualResources, {
            id: `vr-${Date.now()}`,
            role: vrRole,
            hoursPerMonth: vrHours,
            costEstimate: Math.round(vrHours * 93.75) // ~£15k/month for 160h
        }]);
    };

    const removeVirtualResource = (id) => {
        setVirtualResources(virtualResources.filter(vr => vr.id !== id));
    };

    // Timeline shift handlers
    const shiftProject = (projectId, delta) => {
        setTimelineShifts(prev => ({
            ...prev,
            [projectId]: Math.max(-6, Math.min(6, (prev[projectId] || 0) + delta))
        }));
    };

    // Pause/unpause
    const togglePause = (projectId) => {
        setPausedProjects(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        );
    };

    const toggleExpand = (projectId) => {
        setExpandedProjects(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        );
    };

    // Apply all changes
    const handleApply = () => {
        const changes = [];

        // Timeline shifts
        Object.entries(timelineShifts).forEach(([projectId, shift]) => {
            if (shift !== 0) {
                const p = projects.find(pp => pp.id === projectId);
                if (p) {
                    changes.push({
                        id: `playground-time-${projectId}-${Date.now()}`,
                        type: 'TIME',
                        description: `Shifted "${p.name}" by ${shift > 0 ? '+' : ''}${shift} months`,
                        action: {
                            type: 'UPDATE_PROJECT',
                            projectId,
                            changes: {
                                startDate: format(addMonths(new Date(p.startDate), shift), 'yyyy-MM-dd'),
                                endDate: format(addMonths(new Date(p.endDate), shift), 'yyyy-MM-dd')
                            }
                        }
                    });
                }
            }
        });

        // Virtual resources
        virtualResources.forEach(vr => {
            changes.push({
                id: `playground-cap-${vr.id}`,
                type: 'CAPACITY',
                description: `Added ${vr.role} contractor (${vr.hoursPerMonth}h/month)`,
                action: {
                    type: 'ADD_RESOURCE',
                    resource: {
                        name: `Contractor (${vr.role})`,
                        role: vr.role,
                        capacity: vr.hoursPerMonth,
                        isContractor: true
                    }
                }
            });
        });

        // Paused projects
        pausedProjects.forEach(projectId => {
            const p = projects.find(pp => pp.id === projectId);
            if (p) {
                changes.push({
                    id: `playground-pause-${projectId}-${Date.now()}`,
                    type: 'PRIORITY',
                    description: `Paused "${p.name}"`,
                    action: { type: 'PAUSE_PROJECT', projectId }
                });
            }
        });

        if (changes.length > 0) {
            onApplyChanges(changes);
        }
    };

    const hasChanges = Object.keys(timelineShifts).some(k => timelineShifts[k] !== 0)
        || virtualResources.length > 0
        || pausedProjects.length > 0;

    // --- Timeline Positioning Helpers ---
    const getTimelinePosition = (date, months) => {
        const start = months[0].start;
        const end = months[months.length - 1].end;
        const totalDuration = end.getTime() - start.getTime();
        const dateTime = new Date(date).getTime();

        if (dateTime < start.getTime()) return 0;
        if (dateTime > end.getTime()) return 100;

        return ((dateTime - start.getTime()) / totalDuration) * 100;
    };

    // Heatmap cell color
    const getCellColor = (pct) => {
        if (pct === 0) return 'var(--bg-tertiary)';
        if (pct <= 84) return 'rgba(16, 185, 129, 0.25)';
        if (pct <= 100) return 'rgba(245, 158, 11, 0.3)';
        return 'rgba(239, 68, 68, 0.35)';
    };
    const getCellTextColor = (pct) => {
        if (pct === 0) return 'var(--text-muted)';
        if (pct <= 84) return 'var(--success)';
        if (pct <= 100) return 'var(--warning)';
        return 'var(--danger)';
    };

    const statusBadge = (status) => {
        const c = status === 'staffed' ? 'var(--success)' : status === 'partial' ? 'var(--warning)' : 'var(--danger)';
        const label = status === 'staffed' ? 'Staffed' : status === 'partial' ? 'Partial' : 'Unstaffed';
        return (
            <span style={{
                padding: '2px 8px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 600,
                backgroundColor: `${c}20`, color: c, textTransform: 'uppercase'
            }}>
                {label}
            </span>
        );
    };

    const containerStyle = isMaximized ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)'
    } : {
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-lg)'
    };

    return (
        <div style={containerStyle}>
            {isMaximized && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '1rem' }}>
                    <div>
                        <h2 className="text-2xl font-bold">Capacity Playground</h2>
                        <p className="text-sm text-muted">Full-screen simulation mode</p>
                    </div>
                    <button
                        onClick={onToggleMaximize}
                        className="btn-ghost"
                        style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Minimize2 size={20} />
                        Minimize
                    </button>
                </div>
            )}


            {/* ── Delta Counter ── */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)',
            }}>
                <div className="card" style={{ textAlign: 'center', borderTop: `3px solid ${scenario.totalDeficit === 0 ? 'var(--success)' : 'var(--danger)'}` }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Total Deficit</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: scenario.totalDeficit === 0 ? 'var(--success)' : 'var(--danger)' }}>
                        {scenario.totalDeficit === 0 ? <CheckCircle size={24} /> : `${scenario.totalDeficit.toLocaleString()}h`}
                    </div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--success)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Staffed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{scenario.staffedCount}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--warning)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Partial</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{scenario.partialCount}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', borderTop: '3px solid var(--danger)' }}>
                    <div className="text-xs text-muted" style={{ marginBottom: '4px' }}>Unstaffed</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{scenario.unstaffedCount}</div>
                </div>
            </div>

            {/* ── Main Playground Grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>

                {/* ══ LEFT: Priority Reorder + Timeline ══ */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--spacing-md)',
                        borderBottom: '1px solid var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            <ArrowUpDown size={16} color="var(--accent-primary)" /> Priority & Timeline
                        </h4>
                        <span className="text-xs text-muted">Drag to reorder • Higher = First</span>
                    </div>

                    {/* Timeline Calendar Header When Maximized */}
                    {isMaximized && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '250px 1fr 100px',
                            gap: 'var(--spacing-md)',
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-tertiary)',
                            borderBottom: '1px solid var(--bg-tertiary)',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ marginRight: '8px' }}>VIEW BY:</span>
                                <div style={{ display: 'inline-flex', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', padding: '2px' }}>
                                    <button
                                        onClick={() => setGroupBy('project')}
                                        style={{
                                            border: 'none', background: groupBy === 'project' ? 'var(--bg-primary)' : 'transparent',
                                            color: groupBy === 'project' ? 'var(--text-primary)' : 'var(--text-muted)',
                                            padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem'
                                        }}
                                    >
                                        Project
                                    </button>
                                    <button
                                        onClick={() => setGroupBy('role')}
                                        style={{
                                            border: 'none', background: groupBy === 'role' ? 'var(--bg-primary)' : 'transparent',
                                            color: groupBy === 'role' ? 'var(--text-primary)' : 'var(--text-muted)',
                                            padding: '2px 8px', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem'
                                        }}
                                    >
                                        Role
                                    </button>
                                </div>
                            </div>

                            {groupBy === 'project' && (
                                <div style={{ textAlign: 'right' }}>SHIFT</div>
                            )}
                        </div>
                    )}

                    <div style={{ padding: 'var(--spacing-sm)', maxHeight: isMaximized ? 'none' : '400px', overflowY: 'auto' }}>
                        {groupBy === 'role' ? (
                            // --- ROLE VIEW ---
                            ['Developer', 'Designer', 'QA', 'Manager'].map(role => {
                                const roleStats = scenario.roleUtilization[role];
                                const hasDeficit = scenario.globalRoleDeficits[role]?.maxDeficit > 0;
                                // Calculate aggregates
                                let totalCapacity = 0;
                                let totalUsed = 0;
                                let monthlyData = [];

                                if (roleStats) {
                                    monthlyData = Object.entries(roleStats).map(([key, data]) => ({
                                        key, pct: data.percentage, used: data.used, capacity: data.capacity
                                    }));
                                    // Just sum up for a rough total, or use average? Sum is better for "total hours needed".
                                    totalCapacity = Object.values(roleStats).reduce((s, d) => s + d.capacity, 0);
                                    totalUsed = Object.values(roleStats).reduce((s, d) => s + d.used, 0);
                                }

                                // Calculate total demand (Used + Deficit)
                                // We can get this from scenario.globalRoleDeficits logic if needed, calculating total deficit across months
                                const totalDeficit = Object.values(scenario.globalRoleDeficits[role]?.months || {}).reduce((s, v) => s + v, 0);
                                const required = totalUsed + totalDeficit;

                                return (
                                    <GapCard
                                        key={role}
                                        title={role}
                                        subTitle={`${hasDeficit ? 'Deficit Detected' : 'Fully Staffed'}`}
                                        assigned={totalUsed}
                                        required={required}
                                        deficit={totalDeficit}
                                        heatmapData={monthlyData}
                                        onResolve={() => {
                                            // Mock resolving logic -> Add virtual resource
                                            const maxDef = Math.max(0, ...Object.values(scenario.globalRoleDeficits[role]?.months || {}));
                                            if (maxDef > 0) {
                                                setVirtualResources([...virtualResources, {
                                                    id: `vr-auto-${Date.now()}`,
                                                    role: role,
                                                    hoursPerMonth: maxDef,
                                                    costEstimate: Math.round(maxDef * 93.75)
                                                }]);
                                            }
                                        }}
                                    />
                                );
                            })
                        ) : (
                            // --- PROJECT VIEW (Existing Logic) ---
                            priorityOrder.map((projectId, idx) => {
                                const project = effectiveProjects.find(p => p.id === projectId);
                                if (!project) return null;
                                const ps = scenario.projectStatus[projectId];
                                const isPaused = pausedProjects.includes(projectId);
                                const shift = timelineShifts[projectId] || 0;

                                return (
                                    <div
                                        key={projectId}
                                        draggable={!isPaused}
                                        onDragStart={() => handleDragStart(idx)}
                                        onDragOver={(e) => handleDragOver(e, idx)}
                                        onDrop={() => handleDrop(idx)}
                                        onDragEnd={handleDragEnd}
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: isMaximized ? '250px 1fr 100px' : 'auto 1fr auto',
                                            alignItems: 'center', gap: '8px',
                                            padding: '10px 12px',
                                            marginBottom: '4px',
                                            borderRadius: 'var(--radius-md)',
                                            backgroundColor: dragOverIdx === idx ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                                            border: dragOverIdx === idx ? '1px dashed var(--accent-primary)' : '1px solid transparent',
                                            opacity: isPaused ? 0.4 : (dragIdx === idx ? 0.5 : 1),
                                            cursor: isPaused ? 'default' : 'grab',
                                            transition: 'all 0.15s ease',
                                            textDecoration: isPaused ? 'line-through' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                            {/* Drag handle */}
                                            <GripVertical size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />

                                            {/* Expand Toggle */}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleExpand(projectId); }}
                                                className="btn-ghost"
                                                style={{ padding: '2px', color: 'var(--text-muted)' }}
                                            >
                                                {expandedProjects.includes(projectId) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            </button>

                                            {/* Priority number */}
                                            <span style={{
                                                width: '20px', height: '20px', borderRadius: '50%',
                                                backgroundColor: 'var(--bg-tertiary)', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0
                                            }}>
                                                {idx + 1}
                                            </span>

                                            {/* Project info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="text-sm" style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        <span style={{ color: 'var(--accent-primary)', marginRight: '4px' }}>{project.code}</span>
                                                        {project.name}
                                                    </span>
                                                    {project.isDraft && (
                                                        <span style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'var(--accent-primary)', color: 'white' }}>DRAFT</span>
                                                    )}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                                    {ps && statusBadge(ps.status)}
                                                    {ps && ps.totalDeficit > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                            <span className="text-xs" style={{ color: 'var(--danger)', fontWeight: 600 }}>-{ps.totalDeficit}h</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expanded Details */}
                                        {expandedProjects.includes(projectId) && ps && !isPaused && (
                                            <div style={{
                                                gridColumn: '1 / -1',
                                                marginTop: '8px',
                                                padding: '8px',
                                                backgroundColor: 'var(--bg-primary)',
                                                borderRadius: 'var(--radius-sm)',
                                                border: '1px solid var(--bg-tertiary)'
                                            }}>
                                                <div className="text-xs text-muted" style={{ marginBottom: '6px', fontWeight: 600 }}>ROLE BREAKDOWN</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                                    {Object.entries(ps.roleBreakdown || {}).map(([role, stats]) => (
                                                        <div key={role} style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                            padding: '4px 8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px'
                                                        }}>
                                                            <span className="text-xs" style={{ fontWeight: 500 }}>{role}</span>
                                                            <div style={{ textAlign: 'right' }}>
                                                                <div style={{ fontSize: '0.7rem', fontWeight: 600, color: stats.status === 'staffed' ? 'var(--success)' : stats.status === 'partial' ? 'var(--warning)' : 'var(--danger)' }}>
                                                                    {stats.allocated}/{stats.required}h
                                                                </div>
                                                                {stats.deficit > 0 && (
                                                                    <div style={{ fontSize: '0.6rem', color: 'var(--danger)' }}>-{stats.deficit}h</div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Timeline Bar (Maximized view only) */}
                                        {isMaximized && (
                                            <div style={{
                                                position: 'relative',
                                                height: '24px',
                                                backgroundColor: 'rgba(255,255,255,0.02)',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '0 2px'
                                            }}>
                                                {/* Month Grid Lines */}
                                                {scenario.months.map((_, mIdx) => (
                                                    <div key={mIdx} style={{
                                                        position: 'absolute',
                                                        left: `${(mIdx / 12) * 100}%`,
                                                        top: 0, bottom: 0,
                                                        width: '1px',
                                                        backgroundColor: 'rgba(255,255,255,0.05)'
                                                    }} />
                                                ))}

                                                {/* Project Bar */}
                                                {(() => {
                                                    const pStart = addMonths(new Date(project.startDate), shift);
                                                    const pEnd = addMonths(new Date(project.endDate), shift);
                                                    const left = getTimelinePosition(pStart, scenario.months);
                                                    const right = getTimelinePosition(pEnd, scenario.months);
                                                    const width = Math.max(2, right - left);

                                                    const barColor = ps.status === 'staffed' ? 'var(--success)' :
                                                        ps.status === 'partial' ? 'var(--warning)' : 'var(--danger)';

                                                    return (
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: `${left}%`,
                                                            width: `${width}%`,
                                                            height: '12px',
                                                            backgroundColor: barColor,
                                                            borderRadius: '6px',
                                                            boxShadow: `0 0 10px ${barColor}40`,
                                                            opacity: isPaused ? 0.3 : 0.8,
                                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                                        }} />
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '2px', flexShrink: 0, justifyContent: 'flex-end' }}>
                                            {shift !== 0 && !isMaximized && (
                                                <span className="text-xs" style={{ color: 'var(--accent-secondary)', fontWeight: 600, marginRight: '4px', alignSelf: 'center' }}>
                                                    {shift > 0 ? `+${shift}` : shift}mo
                                                </span>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); shiftProject(projectId, -1); }}
                                                className="btn-ghost"
                                                style={{ padding: '3px', fontSize: '0.7rem' }}
                                                title="Shift -1 month"
                                            >←</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); shiftProject(projectId, 1); }}
                                                className="btn-ghost"
                                                style={{ padding: '3px', fontSize: '0.7rem' }}
                                                title="Shift +1 month"
                                            >→</button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); togglePause(projectId); }}
                                                className="btn-ghost"
                                                style={{ padding: '3px', color: isPaused ? 'var(--success)' : 'var(--text-muted)' }}
                                                title={isPaused ? 'Resume' : 'Pause'}
                                            >
                                                {isPaused ? <CheckCircle size={12} /> : <Pause size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ══ RIGHT: Virtual Capacity ══ */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{
                        padding: 'var(--spacing-md)',
                        borderBottom: '1px solid var(--bg-tertiary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                            <Users size={16} color="var(--success)" /> Virtual Capacity
                        </h4>
                        <span className="text-xs text-muted">Add hypothetical resources</span>
                    </div>

                    <div style={{ padding: 'var(--spacing-md)' }}>
                        {/* Add form */}
                        <div style={{
                            display: 'flex', gap: '8px', marginBottom: 'var(--spacing-md)',
                            padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)'
                        }}>
                            <select
                                value={vrRole}
                                onChange={e => setVrRole(e.target.value)}
                                style={{
                                    flex: 1, padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)', fontSize: '0.8rem'
                                }}
                            >
                                {['Developer', 'Designer', 'QA', 'Manager'].map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={vrHours}
                                onChange={e => setVrHours(parseInt(e.target.value) || 0)}
                                style={{
                                    width: '80px', padding: '6px 8px', borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)', fontSize: '0.8rem', textAlign: 'center'
                                }}
                                placeholder="h/mo"
                            />
                            <button
                                onClick={addVirtualResource}
                                className="btn btn-primary"
                                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {/* Virtual resources list */}
                        {virtualResources.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                <Users size={32} style={{ opacity: 0.2, marginBottom: '8px' }} />
                                <p className="text-sm">No virtual resources added.</p>
                                <p className="text-xs text-muted">Add contractors to see how they affect capacity.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {virtualResources.map(vr => (
                                    <div key={vr.id} style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px dashed var(--success)',
                                        backgroundColor: 'rgba(16, 185, 129, 0.05)'
                                    }}>
                                        <div>
                                            <div className="text-sm" style={{ fontWeight: 600 }}>
                                                {vr.role} Contractor
                                            </div>
                                            <div className="text-xs text-muted">
                                                {vr.hoursPerMonth}h/month • ~£{vr.costEstimate.toLocaleString()}/month
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeVirtualResource(vr.id)}
                                            className="btn-ghost"
                                            style={{ padding: '4px', color: 'var(--danger)' }}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                                <div className="text-xs text-muted" style={{ textAlign: 'right', marginTop: '4px' }}>
                                    Total: £{virtualResources.reduce((s, vr) => s + vr.costEstimate, 0).toLocaleString()}/month
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Suggestions */}
                    {Object.entries(scenario.globalRoleDeficits || {}).some(([_, data]) => Object.values(data.months).some(v => v > 0)) && (
                        <div style={{ padding: '0 var(--spacing-md) var(--spacing-md)' }}>
                            <div className="text-xs text-muted" style={{ marginBottom: '8px', fontWeight: 600 }}>SUGGESTED ACTIONS</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(scenario.globalRoleDeficits).map(([role, data]) => {
                                    const maxMonthlyDeficit = Math.max(0, ...Object.values(data.months));
                                    if (maxMonthlyDeficit === 0) return null;

                                    const deficitMonths = Object.entries(data.months)
                                        .filter(([_, amount]) => amount > 0)
                                        .map(([monthKey]) => monthKey);

                                    // Find start and end month based on scenario.months order
                                    let periodString = "";
                                    if (deficitMonths.length > 0) {
                                        const sortedDeficitMonths = scenario.months
                                            .filter(m => deficitMonths.includes(m.key))
                                            .map(m => m.key);

                                        if (sortedDeficitMonths.length > 0) {
                                            const start = sortedDeficitMonths[0];
                                            const end = sortedDeficitMonths[sortedDeficitMonths.length - 1];
                                            periodString = start === end ? start : `${start} - ${end}`;
                                        }
                                    }

                                    return (
                                        <div key={role} style={{
                                            padding: '8px',
                                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}>
                                            <div>
                                                <div className="text-xs font-bold" style={{ color: 'var(--danger)' }}>{role} Deficit</div>
                                                <div className="text-xs text-muted">
                                                    Peak gap: {maxMonthlyDeficit}h/mo
                                                    {periodString && <span style={{ marginLeft: '6px', opacity: 0.8 }}>({periodString})</span>}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setVirtualResources([...virtualResources, {
                                                        id: `vr-sugg-${Date.now()}`,
                                                        role: role,
                                                        hoursPerMonth: maxMonthlyDeficit,
                                                        costEstimate: Math.round(maxMonthlyDeficit * 93.75)
                                                    }]);
                                                }}
                                                className="btn-xs"
                                                style={{
                                                    backgroundColor: 'var(--danger)', color: 'white', border: 'none',
                                                    padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                }}
                                            >
                                                <Plus size={12} /> Add {maxMonthlyDeficit}h
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Utilization Heatmap ── */}
            <div className="card" style={{ padding: 0 }}>
                <div
                    style={{
                        padding: 'var(--spacing-md)',
                        borderBottom: showHeatmap ? '1px solid var(--bg-tertiary)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                    onClick={(e) => { e.stopPropagation(); setShowHeatmap(!showHeatmap); }}
                >
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>
                        <BarChart3 size={16} color="var(--warning)" /> Utilization Heatmap
                    </h4>
                    {showHeatmap ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {showHeatmap && (
                    <div style={{ padding: 'var(--spacing-md)', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)', fontWeight: 500, position: 'sticky', left: 0, backgroundColor: 'var(--bg-primary)', minWidth: '100px' }}>
                                        Role
                                    </th>
                                    {scenario.months.map(m => (
                                        <th key={m.key} style={{
                                            textAlign: 'center', padding: '6px 4px',
                                            color: 'var(--text-muted)', fontWeight: 500, minWidth: '55px'
                                        }}>
                                            {m.key}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.entries(scenario.roleUtilization).map(([role, months]) => {
                                    // Show role if it has capacity OR if it has used hours (meaning there was demand)
                                    const hasCapacity = Object.values(months).some(m => m.capacity > 0);
                                    const hasDemand = Object.values(months).some(m => m.used > 0);
                                    if (!hasCapacity && !hasDemand) return null;

                                    return (
                                        <tr key={role}>
                                            <td style={{
                                                padding: '6px 8px', fontWeight: 600,
                                                position: 'sticky', left: 0, backgroundColor: 'var(--bg-primary)',
                                                borderRight: '1px solid var(--bg-tertiary)'
                                            }}>
                                                {role}
                                            </td>
                                            {Object.entries(months).map(([month, data]) => (
                                                <td key={month} style={{
                                                    textAlign: 'center', padding: '6px 4px',
                                                    backgroundColor: getCellColor(data.percentage),
                                                    borderRadius: '3px'
                                                }}>
                                                    <div style={{
                                                        fontWeight: 700,
                                                        color: getCellTextColor(data.percentage),
                                                        fontSize: '0.8rem'
                                                    }}>
                                                        {data.percentage}%
                                                    </div>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>
                                                        {data.used}/{data.capacity}h
                                                    </div>
                                                </td>
                                            ))}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px', justifyContent: 'flex-end' }}>
                            {[
                                { color: 'rgba(16, 185, 129, 0.25)', label: '0-84%' },
                                { color: 'rgba(245, 158, 11, 0.3)', label: '85-100%' },
                                { color: 'rgba(239, 68, 68, 0.35)', label: '>100%' }
                            ].map(l => (
                                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div style={{ width: '12px', height: '12px', borderRadius: '2px', backgroundColor: l.color }} />
                                    <span className="text-xs text-muted">{l.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Apply Button ── */}
            {hasChanges && (
                <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--spacing-md)',
                    padding: 'var(--spacing-md)',
                    backgroundColor: scenario.totalDeficit === 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)',
                    border: `1px solid ${scenario.totalDeficit === 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <div style={{ flex: 1 }}>
                        <div className="text-sm" style={{ fontWeight: 600 }}>
                            {scenario.totalDeficit === 0 ? '✅ All conflicts resolved!' : `⚠️ ${scenario.totalDeficit.toLocaleString()}h deficit remaining`}
                        </div>
                        <div className="text-xs text-muted">
                            {[
                                Object.keys(timelineShifts).filter(k => timelineShifts[k] !== 0).length > 0 && 'timeline shifts',
                                virtualResources.length > 0 && `${virtualResources.length} virtual resource${virtualResources.length > 1 ? 's' : ''}`,
                                pausedProjects.length > 0 && `${pausedProjects.length} paused project${pausedProjects.length > 1 ? 's' : ''}`
                            ].filter(Boolean).join(' • ')}
                        </div>
                    </div>
                    <button
                        onClick={handleApply}
                        className="btn btn-primary"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            backgroundColor: scenario.totalDeficit === 0 ? 'var(--success)' : 'var(--warning)',
                            borderColor: scenario.totalDeficit === 0 ? 'var(--success)' : 'var(--warning)'
                        }}
                    >
                        <Save size={16} /> Apply Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default CapacityPlayground;
