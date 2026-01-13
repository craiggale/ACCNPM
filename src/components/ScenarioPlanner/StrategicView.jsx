import { useState, useMemo, useEffect } from 'react';
import GanttChart from '../GanttChart';
// Removed Recharts imports as they are now in PrimaryForecastChart
import { Plus, Trash2, Zap, ArrowRight, BrainCircuit, RefreshCw, CheckCircle, Play, Filter, LayoutList, Calendar, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, differenceInDays, subWeeks } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { ResolutionEngine, getRoleDistribution, normalizeRole } from '../../utils/ResolutionEngine';
import NewProjectPane from '../NewProjectPane';

// New Components
import PrimaryForecastChart from './PrimaryForecastChart';
import BottleneckAlert from './BottleneckAlert';
import ScenarioTabs from './ScenarioTabs';

const StrategicView = () => {
    console.log("StrategicView Rendering...");
    const { projects: allProjects = [], resources: allResources = [], addProject } = useApp();
    const { currentUser, isDemoMode } = useAuth();

    // Tenant-aware filtering
    const liveProjects = useMemo(() => {
        if (!isDemoMode || !currentUser) return allProjects;
        return allProjects.filter(p => p.org_id === currentUser.org_id);
    }, [allProjects, currentUser, isDemoMode]);

    const liveResources = useMemo(() => {
        if (!isDemoMode || !currentUser) return allResources;
        return allResources.filter(r => r.org_id === currentUser.org_id);
    }, [allResources, currentUser, isDemoMode]);

    // --- Sandbox State ---
    const [draftProjects, setDraftProjects] = useState([]);
    const [auditLog, setAuditLog] = useState([]); // Track applied AI solutions for Undo capability

    // UI State
    const [isAddingDraft, setIsAddingDraft] = useState(false);
    const [viewRole, setViewRole] = useState('All');
    const [forecastView, setForecastView] = useState('Resource'); // 'Resource', 'Timeline', 'Priority'
    const [chartFocus, setChartFocus] = useState('Demand'); // 'Demand', 'Capacity'
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [planningMode, setPlanningMode] = useState('Standard'); // 'Standard', 'ResourceFirst'
    const [selectedTimelineProject, setSelectedTimelineProject] = useState(null); // For expanded Gantt view

    // NEW: Comparison State
    const [activeSolutionId, setActiveSolutionId] = useState('current'); // 'current' or solution.id

    // --- Comparison State Calculation ---
    // 1. Base State (Before AI Levers)
    const baseSandboxProjects = useMemo(() => {
        // Just Live + Drafts (No audit log applied)
        return [...liveProjects, ...draftProjects];
    }, [liveProjects, draftProjects]);

    const baseSandboxResources = useMemo(() => {
        return [...liveResources];
    }, [liveResources]);

    // 2. Projected State (After *APPLIED* AI Levers) - EXISTING LOGIC
    // This represents the "Current Scenario" tab (Live + Drafts + Applied Fixes)
    const currentSandboxProjects = useMemo(() => {
        let currentProjects = [
            ...liveProjects.map(p => ({ ...p })),
            ...draftProjects.map(p => ({ ...p }))
        ];

        auditLog.forEach(solution => {
            const action = solution.action;
            if (action.type === 'UPDATE_PROJECT') {
                const idx = currentProjects.findIndex(p => p.id === action.projectId);
                if (idx !== -1) currentProjects[idx] = { ...currentProjects[idx], ...action.changes };
            } else if (action.type === 'PAUSE_PROJECT') {
                const idx = currentProjects.findIndex(p => p.id === action.projectId);
                if (idx !== -1) currentProjects[idx].status = 'Paused';
            }
        });

        // --- Resource-Driven Scheduling ---
        // Only apply in "ResourceFirst" mode
        // Resource First = calculate EARLIEST possible completion based on available capacity
        if (planningMode === 'ResourceFirst') {
            // 1. Get projected resources (Live + Added via Solutions)
            let currentResources = [...liveResources];
            auditLog.forEach(solution => {
                if (solution.action.type === 'ADD_RESOURCE') {
                    currentResources.push({ ...solution.action.resource, id: `temp-${solution.id}` });
                }
            });

            // 2. Schedule "Flexible" (Resource-Driven) projects
            // Calculate how fast they can complete given available capacity
            const fixedProjects = currentProjects.filter(p => !p.isResourceDriven && p.status !== 'Paused');
            const flexibleProjects = currentProjects.filter(p => p.isResourceDriven && p.status !== 'Paused');

            flexibleProjects.forEach(flexProj => {
                const keyRole = flexProj.type === 'Asset Production' ? 'Designer' : 'Developer';
                const keyDist = getRoleDistribution(flexProj.type || 'Website')[keyRole] || 0.5;

                // Calculate Total Capacity for Key Role (Monthly)
                const roleCapacity = currentResources
                    .filter(r => normalizeRole(r.role) === keyRole)
                    .reduce((sum, r) => sum + parseInt(r.capacity), 0);

                let remainingEffort = parseInt(flexProj.totalEffort || 960);
                let currentMonth = new Date(flexProj.startDate);

                // Calculate how fast we can burn through the work with FULL available capacity
                let safety = 0;
                while (remainingEffort > 1 && safety < 60) {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(currentMonth);

                    // Calculate Demand from Fixed Projects for this month
                    let committedDemand = 0;
                    fixedProjects.forEach(p => {
                        const pStart = new Date(p.startDate);
                        const pEnd = new Date(p.endDate);
                        if (pStart <= monthEnd && pEnd >= monthStart) {
                            let val = 320; // Medium
                            if (p.scale === 'Small') val = 160;
                            if (p.scale === 'Large') val = 640;
                            const ratio = getRoleDistribution(p.type || 'Website')[keyRole] || 0;
                            committedDemand += (val * ratio);
                        }
                    });

                    // Available capacity = Total - Committed to fixed projects
                    const available = Math.max(0, roleCapacity - committedDemand);

                    // In Resource First mode, we can use ALL available capacity (not capped by project size)
                    // This allows projects to finish faster when there's spare capacity
                    const burn = available * keyDist; // Effective burn on this project

                    if (burn > 0 && keyDist > 0) {
                        const totalBurn = burn / keyDist;
                        remainingEffort -= totalBurn;
                    }

                    currentMonth = addMonths(currentMonth, 1);
                    safety++;
                }

                // After loop exits, currentMonth is one past completion
                const completionMonth = addMonths(currentMonth, -1);
                flexProj.endDate = format(endOfMonth(completionMonth), 'yyyy-MM-dd');
            });
        }

        return currentProjects.filter(p => p.status !== 'Paused');
    }, [liveProjects, draftProjects, auditLog, liveResources, planningMode]);

    const currentSandboxResources = useMemo(() => {
        let currentResources = [...liveResources];
        auditLog.forEach(solution => {
            if (solution.action.type === 'ADD_RESOURCE') {
                currentResources.push({ ...solution.action.resource, id: `temp-${solution.id}` });
            }
        });
        return currentResources;
    }, [liveResources, auditLog]);

    // Calculate Conflicts/Solutions for the "Current" State
    const { currentConflict, currentSolutions } = useMemo(() => {
        const conflict = ResolutionEngine.detectConflicts(currentSandboxProjects, currentSandboxResources);
        const solutions = conflict ? ResolutionEngine.generateSolutions(conflict, currentSandboxProjects) : [];
        return { currentConflict: conflict, currentSolutions: solutions };
    }, [currentSandboxProjects, currentSandboxResources]);


    // 3. Preview State (Selected Solution Tab)
    // If activeSolutionId is 'current', use currentSandboxProjects.
    // If activeSolutionId selects a generated solution, apply THAT solution on top of currentSandboxProjects ON THE FLY.
    const previewCalculations = useMemo(() => {
        let previewProjects = [...currentSandboxProjects];
        let previewResources = [...currentSandboxResources];

        let targetSolution = null;
        if (activeSolutionId !== 'current') {
            targetSolution = currentSolutions.find(s => s.id === activeSolutionId);
        }

        if (targetSolution && targetSolution.action) {
            const action = targetSolution.action;
            if (action.type === 'UPDATE_PROJECT') {
                const idx = previewProjects.findIndex(p => p.id === action.projectId);
                if (idx !== -1) previewProjects[idx] = { ...previewProjects[idx], ...action.changes };
            } else if (action.type === 'PAUSE_PROJECT') {
                const idx = previewProjects.findIndex(p => p.id === action.projectId);
                if (idx !== -1) previewProjects[idx].status = 'Paused';
                previewProjects = previewProjects.filter(p => p.status !== 'Paused');
            } else if (action.type === 'ADD_RESOURCE') {
                previewResources.push({ ...action.resource, id: `preview-res` });
            }
        }

        // Generate Chart Data for the PREVIEW state
        // We always compare against the "Base" of the current accepted reality (which is auditLog applied state? 
        // No, usually we want to see the impact of the *Previewed* solution vs the *Current* state).
        // Let's compare Preview vs Current (Base for this view).

        const roleFilter = viewRole;
        const today = new Date();
        const months = Array.from({ length: 12 }, (_, i) => addMonths(today, i));

        const getCap = (resList) => resList
            .filter(r => roleFilter === 'All' || normalizeRole(r.role) === roleFilter)
            .reduce((sum, r) => sum + parseInt(r.capacity || 0), 0);

        // NOTE: "Base" in the chart context now means "Current Scenario" (before applying the specific tab solution)
        const baseTotalCapacity = getCap(currentSandboxResources);
        const projectedTotalCapacity = getCap(previewResources);

        const getDemandAndCost = (projList, dateRange) => {
            const [start, end] = dateRange;
            let totalD = 0;
            let fixedD = 0;
            let flexD = 0;
            let c = 0;

            projList.forEach(p => {
                // Handle paused projects in refined views
                if (p.status === 'Paused') return;

                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);

                if (pStart <= end && pEnd >= start) {
                    let val = 320;
                    if (p.scale === 'Large') val = 640;
                    if (p.scale === 'Small') val = 160;

                    const dist = getRoleDistribution(p.type || 'Website');
                    let pDemand = 0;

                    if (roleFilter === 'All') {
                        Object.entries(dist).forEach(([role, ratio]) => pDemand += val * ratio);
                    } else {
                        pDemand += val * (dist[roleFilter] || 0);
                    }

                    totalD += pDemand;
                    if (p.isResourceDriven) {
                        flexD += pDemand;
                    } else {
                        fixedD += pDemand;
                    }

                    // Simple cost forecast
                    c += val * 125;
                }
            });
            return { demand: totalD, fixedDemand: fixedD, flexibleDemand: flexD, cost: c };
        };

        const data = months.map(date => {
            const label = format(date, 'MMM yyyy');
            const range = [startOfMonth(date), endOfMonth(date)];

            const baseMetrics = getDemandAndCost(currentSandboxProjects, range);
            const projectedMetrics = getDemandAndCost(previewProjects, range);

            return {
                name: label,
                baseDemand: baseMetrics.demand,
                projectedDemand: projectedMetrics.demand,
                // Split for stacked charts
                fixedDemand: projectedMetrics.fixedDemand,
                flexibleDemand: projectedMetrics.flexibleDemand,

                baseCost: baseMetrics.cost,
                projectedCost: projectedMetrics.cost,
                baseCapacity: baseTotalCapacity,
                projectedCapacity: projectedTotalCapacity,
                unusedCapacity: Math.max(0, projectedTotalCapacity - (projectedMetrics.fixedDemand + projectedMetrics.flexibleDemand))
            };
        });

        return { chartData: data, previewProjects };

    }, [currentSandboxProjects, currentSandboxResources, currentSolutions, activeSolutionId, viewRole]);


    // --- Auto-Focus Logic ---
    useEffect(() => {
        if (currentConflict) {
            // Keep viewRole at "All" by default - user can filter if needed
            setActiveSolutionId('current'); // Reset tab when conflict changes
        }
    }, [currentConflict]);

    // --- Handlers ---
    const handleAddDraft = (projectData) => {
        const newDraft = {
            ...projectData,
            id: `draft-${Date.now()}`,
            isDraft: true,
            status: 'Draft'
        };
        setDraftProjects([...draftProjects, newDraft]);
        setIsAddingDraft(false);
    };

    const removeDraft = (id) => {
        setDraftProjects(draftProjects.filter(p => p.id !== id));
        setAuditLog(auditLog.filter(sol => sol.action.projectId !== id));
    };

    const resetSandbox = () => {
        setDraftProjects([]);
        setAuditLog([]); // Clear all applied solutions
        setViewRole('All');
        setChartFocus('Demand');
    };

    const applySolution = (solution) => {
        if (!solution || solution.disabled || solution.type === 'CURRENT') return;
        const solutionEntry = { ...solution, id: solution.id || `sol-${Date.now()}`, appliedAt: new Date() };
        setAuditLog([...auditLog, solutionEntry]);
        setActiveSolutionId('current'); // Reset tabs
    };

    const undoSolution = (solutionId) => {
        setAuditLog(auditLog.filter(s => s.id !== solutionId));
    };

    const commitToLive = () => {
        const draftsToCommit = currentSandboxProjects.filter(p => p.isDraft);
        draftsToCommit.forEach(p => {
            const { id, isDraft, ...realProject } = p;
            addProject({ ...realProject, status: 'Active' });
        });
        alert("Strategic Scenarios Applied to Live Environment!");
        resetSandbox();
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <span className="text-sm font-medium" style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '2px 8px', borderRadius: '4px', marginRight: '8px' }}>SANDBOX MODE</span>
                    <span className="text-muted">Changes here do not affect the live project portfolio.</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {/* Mode Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="text-xs text-muted">Planning:</span>
                        <div style={{ display: 'flex', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '3px', border: '2px solid var(--bg-tertiary)' }}>
                            <button
                                onClick={() => setPlanningMode('Standard')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: planningMode === 'Standard' ? 'var(--accent-primary)' : 'transparent',
                                    color: planningMode === 'Standard' ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                📅 Standard
                            </button>
                            <button
                                onClick={() => setPlanningMode('ResourceFirst')}
                                style={{
                                    padding: '6px 16px',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: planningMode === 'ResourceFirst' ? 'var(--accent-secondary)' : 'transparent',
                                    color: planningMode === 'ResourceFirst' ? 'white' : 'var(--text-muted)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                👥 Resource First
                            </button>
                        </div>
                    </div>

                    {draftProjects.length > 0 && (
                        <button onClick={resetSandbox} className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>
                            <RefreshCw size={14} style={{ marginRight: '4px' }} /> Reset Sandbox
                        </button>
                    )}
                    {(draftProjects.length > 0 && !currentConflict) && (
                        <button onClick={commitToLive} className="btn btn-primary" style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}>
                            <Play size={14} style={{ marginRight: '4px' }} /> Commit to Live
                        </button>
                    )}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: isPanelCollapsed ? '56px 1fr' : '350px 1fr',
                gap: 'var(--spacing-lg)',
                transition: 'grid-template-columns 0.3s ease'
            }}>

                {/* Left Panel: Sandbox Control */}
                <div className="card" style={{
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                }}>
                    {isPanelCollapsed ? (
                        /* Collapsed State */
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            padding: 'var(--spacing-sm) 0',
                            gap: 'var(--spacing-md)'
                        }}>
                            <button
                                onClick={() => setIsPanelCollapsed(false)}
                                className="btn-ghost"
                                style={{ padding: '0.5rem' }}
                                title="Expand Projects"
                            >
                                <ChevronRight size={20} />
                            </button>
                            <span style={{
                                writingMode: 'vertical-lr',
                                textOrientation: 'mixed',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                letterSpacing: '0.05em'
                            }}>
                                {draftProjects.length} Drafts
                            </span>
                        </div>
                    ) : (
                        /* Expanded State */
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 className="text-xl">Sandbox Projects</h3>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setIsAddingDraft(true)}>
                                        <Plus size={16} style={{ marginRight: '4px' }} /> Add Draft
                                    </button>
                                    <button
                                        onClick={() => setIsPanelCollapsed(true)}
                                        className="btn-ghost"
                                        style={{ padding: '0.25rem 0.5rem' }}
                                        title="Collapse Panel"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                </div>
                            </div>

                            {isAddingDraft && (
                                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <div style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <div className="card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                                <h3 className="text-xl">Add Draft Project</h3>
                                                <button onClick={() => setIsAddingDraft(false)} className="btn-ghost" style={{ padding: '4px' }}>
                                                    <Plus size={20} style={{ transform: 'rotate(45deg)' }} />
                                                </button>
                                            </div>
                                            <NewProjectPane
                                                onClose={() => setIsAddingDraft(false)}
                                                onAdd={handleAddDraft}
                                                planningMode={planningMode}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {draftProjects.map(p => (
                                    <div key={p.id} style={{
                                        padding: 'var(--spacing-md)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px dashed var(--accent-primary)',
                                        backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}><span style={{ opacity: 0.8 }}>{p.code}</span> {p.name} <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7 }}>DRAFT</span></div>
                                            <div className="text-xs text-muted">{p.startDate} - {p.endDate} • {p.scale}</div>
                                        </div>
                                        <button onClick={() => removeDraft(p.id)} className="btn-ghost" style={{ padding: '4px' }}>
                                            <Trash2 size={14} color="var(--text-muted)" />
                                        </button>
                                    </div>
                                ))}
                                {draftProjects.length === 0 && (
                                    <p className="text-sm text-muted" style={{ fontStyle: 'italic', padding: '1rem', textAlign: 'center' }}>
                                        No draft projects. Add one to start simulating.
                                    </p>
                                )}
                                {/* Display Active Projects (Ghosted) */}
                                <div style={{ borderTop: '1px solid var(--bg-tertiary)', marginTop: '1rem', paddingTop: '1rem' }}>
                                    <h4 className="text-sm font-medium text-muted">Active Projects</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '0.5rem', opacity: 0.6 }}>
                                        {currentSandboxProjects.filter(p => !p.isDraft).map(p => (
                                            <div key={p.id} className="text-xs" style={{ padding: '4px 8px', display: 'flex', justifyContent: 'space-between', textDecoration: p.status === 'Paused' ? 'line-through' : 'none', color: p.status === 'Paused' ? 'var(--text-muted)' : 'inherit' }}>
                                                <span><span style={{ color: 'var(--accent-primary)' }}>{p.code}</span> {p.name}</span>
                                                {p.status === 'Paused' && <span>PAUSED</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Main Area: Chart & AI */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                    {/* 1. CHART */}
                    <PrimaryForecastChart
                        data={previewCalculations.chartData}
                        forecastView={forecastView}
                        setForecastView={setForecastView}
                        viewRole={viewRole}
                        setViewRole={setViewRole}
                        chartFocus={chartFocus}
                        setChartFocus={setChartFocus}
                        projects={previewCalculations.previewProjects}
                        planningMode={planningMode}
                    />

                    {/* PROJECT TIMELINE SUMMARY */}
                    <div style={{
                        marginTop: 'var(--spacing-lg)',
                        padding: 'var(--spacing-md)',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--bg-tertiary)'
                    }}>
                        <h3 className="text-lg font-bold mb-3" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={18} />
                            Project Completion Dates
                            <span className="text-xs" style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: planningMode === 'ResourceFirst' ? 'var(--accent-secondary)' : 'var(--bg-tertiary)',
                                color: planningMode === 'ResourceFirst' ? 'white' : 'var(--text-muted)',
                                marginLeft: 'auto'
                            }}>
                                {planningMode === 'ResourceFirst' ? 'Resource Driven' : 'Standard'}
                            </span>
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {previewCalculations.previewProjects.map(project => {
                                const originalEnd = new Date(project.originalEndDate || project.endDate);
                                const calculatedEnd = new Date(project.endDate);
                                const daysDiff = Math.round((calculatedEnd - originalEnd) / (1000 * 60 * 60 * 24));
                                const isDelayed = daysDiff > 0;
                                const isEarly = daysDiff < 0;
                                const isResourceDriven = project.isResourceDriven;
                                const isSelected = selectedTimelineProject?.id === project.id;

                                return (
                                    <div key={project.id}>
                                        {/* Clickable Project Card */}
                                        <div
                                            onClick={() => setSelectedTimelineProject(isSelected ? null : project)}
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 120px 30px 120px 100px',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '10px 12px',
                                                backgroundColor: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                borderLeft: `4px solid ${isResourceDriven ? 'var(--accent-secondary)' : isDelayed ? 'var(--danger)' : isEarly ? 'var(--success)' : 'var(--bg-tertiary)'}`,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                            onMouseLeave={e => e.currentTarget.style.backgroundColor = isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)'}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                                                    <span style={{ color: 'var(--accent-primary)', marginRight: '0.5rem' }}>{project.code}</span>
                                                    {project.name}
                                                </div>
                                                <div className="text-xs text-muted">
                                                    {project.type} • {project.scale}
                                                    {isResourceDriven && <span style={{ color: 'var(--accent-secondary)', marginLeft: '0.5rem' }}>• Resource Driven</span>}
                                                </div>
                                            </div>
                                            <div className="text-sm" style={{ textAlign: 'center' }}>
                                                <div className="text-xs text-muted">Original</div>
                                                <div>{format(originalEnd, 'MMM d, yyyy')}</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <ArrowRight size={16} className="text-muted" />
                                            </div>
                                            <div className="text-sm" style={{ textAlign: 'center', fontWeight: 600 }}>
                                                <div className="text-xs text-muted">Calculated</div>
                                                <div style={{ color: isDelayed ? 'var(--danger)' : isEarly ? 'var(--success)' : 'inherit' }}>
                                                    {format(calculatedEnd, 'MMM d, yyyy')}
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                {daysDiff !== 0 && (
                                                    <span style={{
                                                        padding: '2px 8px',
                                                        borderRadius: 'var(--radius-sm)',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        backgroundColor: isDelayed ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                                        color: isDelayed ? 'var(--danger)' : 'var(--success)'
                                                    }}>
                                                        {isDelayed ? '+' : ''}{daysDiff}d
                                                    </span>
                                                )}
                                                {daysDiff === 0 && (
                                                    <span className="text-xs text-muted">On schedule</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Gantt Comparison View */}
                                        {isSelected && (
                                            <div style={{
                                                marginTop: '8px',
                                                marginLeft: '16px',
                                                padding: '16px',
                                                backgroundColor: 'var(--bg-primary)',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px solid var(--bg-tertiary)'
                                            }}>
                                                <h4 className="text-sm font-bold mb-3">Timeline Comparison</h4>

                                                {/* Mini Gantt Chart */}
                                                {(() => {
                                                    const projectStart = new Date(project.startDate);
                                                    const originalEndDate = new Date(project.originalEndDate || project.endDate);
                                                    const calculatedEndDate = new Date(project.endDate);

                                                    // Calculate timeline range (earliest start to latest end + buffer)
                                                    const timelineStart = new Date(projectStart);
                                                    const timelineEnd = new Date(Math.max(originalEndDate.getTime(), calculatedEndDate.getTime()));
                                                    timelineEnd.setMonth(timelineEnd.getMonth() + 1); // Add buffer

                                                    const totalDays = Math.max(1, (timelineEnd - timelineStart) / (1000 * 60 * 60 * 24));

                                                    const getBarStyle = (start, end, color) => {
                                                        const startOffset = Math.max(0, (start - timelineStart) / (1000 * 60 * 60 * 24));
                                                        const duration = (end - start) / (1000 * 60 * 60 * 24);
                                                        return {
                                                            left: `${(startOffset / totalDays) * 100}%`,
                                                            width: `${(duration / totalDays) * 100}%`,
                                                            backgroundColor: color,
                                                            height: '24px',
                                                            borderRadius: '4px',
                                                            position: 'absolute',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            paddingLeft: '8px',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 600,
                                                            color: 'white',
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden'
                                                        };
                                                    };

                                                    return (
                                                        <div>
                                                            {/* Standard Timeline */}
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <div className="text-xs text-muted mb-1">📅 Standard (Original Plan)</div>
                                                                <div style={{ position: 'relative', height: '24px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                                    <div style={getBarStyle(projectStart, originalEndDate, 'var(--accent-primary)')}>
                                                                        {format(projectStart, 'MMM d')} → {format(originalEndDate, 'MMM d')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Resource First Timeline */}
                                                            <div style={{ marginBottom: '12px' }}>
                                                                <div className="text-xs text-muted mb-1">👥 Resource First (Calculated)</div>
                                                                <div style={{ position: 'relative', height: '24px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                                    <div style={getBarStyle(projectStart, calculatedEndDate, isEarly ? 'var(--success)' : isDelayed ? 'var(--danger)' : 'var(--accent-secondary)')}>
                                                                        {format(projectStart, 'MMM d')} → {format(calculatedEndDate, 'MMM d')}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Timeline Labels */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                                <span>{format(timelineStart, 'MMM yyyy')}</span>
                                                                <span>{format(timelineEnd, 'MMM yyyy')}</span>
                                                            </div>

                                                            {/* Impact Summary */}
                                                            <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                                                                <div className="text-xs">
                                                                    {daysDiff === 0 && <span className="text-muted">No change - project timeline remains the same</span>}
                                                                    {isEarly && <span style={{ color: 'var(--success)' }}>✅ Resource First enables {Math.abs(daysDiff)} days earlier completion</span>}
                                                                    {isDelayed && <span style={{ color: 'var(--danger)' }}>⚠️ Resource constraints push completion {daysDiff} days later</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 2. ALERT & TABS */}
                    {currentConflict ? (
                        <>
                            <BottleneckAlert conflict={currentConflict} solutionsCount={currentSolutions.length} />

                            <h3 className="text-lg font-bold mb-2">Resolve Conflict</h3>
                            <ScenarioTabs
                                solutions={currentSolutions}
                                activeSolutionId={activeSolutionId}
                                onSelectSolution={setActiveSolutionId}
                                onApplySolution={applySolution}
                                chartData={previewCalculations.chartData}
                            />
                        </>
                    ) : (
                        <div style={{
                            padding: '1.5rem',
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: 'var(--radius-lg)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ color: 'var(--success)' }}><CheckCircle size={20} /></div>
                                <div>
                                    <h4 style={{ fontWeight: 600, color: 'var(--success)' }}>Schedule Viable</h4>
                                    <p className="text-sm text-muted">
                                        {auditLog.length > 0
                                            ? `Resolved with ${auditLog.length} active adjustments.`
                                            : "No conflicts detected. You can commit these changes to the live environment."}
                                    </p>
                                </div>
                            </div>

                            {/* UNDO LIST */}
                            {auditLog.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1rem' }}>
                                    <h5 className="text-sm font-medium text-muted uppercase">Active Adjustments</h5>
                                    {auditLog.map(log => (
                                        <div key={log.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 12px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--bg-tertiary)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {log.type === 'TIME' && <ArrowRight size={14} className="text-accent" />}
                                                {log.type === 'CAPACITY' && <Plus size={14} className="text-success" />}
                                                {log.type === 'PRIORITY' && <Zap size={14} className="text-warning" />}
                                                <span className="text-sm">{log.description}</span>
                                            </div>
                                            <button onClick={() => undoSolution(log.id)} className="text-xs hover:underline" style={{ color: 'var(--danger)', fontWeight: 600 }}>Remove</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StrategicView;
