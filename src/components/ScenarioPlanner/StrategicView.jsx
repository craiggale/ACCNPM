import { useState, useMemo, useEffect } from 'react';
import GanttChart from '../GanttChart';
// Removed Recharts imports as they are now in PrimaryForecastChart
import { Plus, Trash2, Zap, ArrowRight, BrainCircuit, RefreshCw, CheckCircle, Play, Filter, LayoutList, Calendar, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { useApp } from '../../context/AppContext';
import { ResolutionEngine, getRoleDistribution, normalizeRole } from '../../utils/ResolutionEngine';
import NewProjectPane from '../NewProjectPane';

// New Components
import PrimaryForecastChart from './PrimaryForecastChart';
import BottleneckAlert from './BottleneckAlert';
import ScenarioTabs from './ScenarioTabs';

const StrategicView = () => {
    console.log("StrategicView Rendering...");
    const { projects: liveProjects = [], resources: liveResources = [], addProject } = useApp();

    // --- Sandbox State ---
    const [draftProjects, setDraftProjects] = useState([]);
    const [auditLog, setAuditLog] = useState([]); // Track applied AI solutions for Undo capability

    // UI State
    const [isAddingDraft, setIsAddingDraft] = useState(false);
    const [viewRole, setViewRole] = useState('All');
    const [forecastView, setForecastView] = useState('Resource'); // 'Resource', 'Timeline', 'Priority'
    const [chartFocus, setChartFocus] = useState('Demand'); // 'Demand', 'Capacity'
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

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
        return currentProjects.filter(p => p.status !== 'Paused');
    }, [liveProjects, draftProjects, auditLog]);

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

        const getDemand = (projList, dateRange) => {
            const [start, end] = dateRange;
            let d = 0;
            projList.forEach(p => {
                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);
                if (pStart <= end && pEnd >= start) {
                    let val = 320;
                    if (p.scale === 'Large') val = 640;
                    if (p.scale === 'Small') val = 160;

                    const dist = getRoleDistribution(p.type || 'Website');
                    if (roleFilter === 'All') {
                        Object.entries(dist).forEach(([role, ratio]) => d += val * ratio);
                    } else {
                        d += val * (dist[roleFilter] || 0);
                    }
                }
            });
            return d;
        };

        const data = months.map(date => {
            const label = format(date, 'MMM yyyy');
            const range = [startOfMonth(date), endOfMonth(date)];

            const baseDemand = getDemand(currentSandboxProjects, range);
            const projectedDemand = getDemand(previewProjects, range);

            return {
                name: label,
                baseDemand,      // "Current Scenario" Demand
                projectedDemand, // "Previewed Solution" Demand
                baseCapacity: baseTotalCapacity, // "Current Scenario" Capacity
                projectedCapacity: projectedTotalCapacity // "Previewed Solution" Capacity
            };
        });

        return { chartData: data, previewProjects };

    }, [currentSandboxProjects, currentSandboxResources, currentSolutions, activeSolutionId, viewRole]);


    // --- Auto-Focus Logic ---
    useEffect(() => {
        if (currentConflict) {
            setViewRole(currentConflict.role);
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
                <div style={{ display: 'flex', gap: '8px' }}>
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
                                    <div className="card" style={{ width: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                                        <h3 className="text-xl" style={{ marginBottom: '1rem' }}>Add Draft Project</h3>
                                        <form onSubmit={(e) => {
                                            e.preventDefault();
                                            const formData = new FormData(e.target);
                                            handleAddDraft({
                                                name: formData.get('name'),
                                                type: formData.get('type'),
                                                scale: formData.get('scale'),
                                                startDate: formData.get('startDate'),
                                                endDate: formData.get('endDate')
                                            });
                                        }}>
                                            {/* ... Reusing Form Fields ... */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <input name="name" className="input" placeholder="Project Name" required />
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <select name="type" className="input"><option value="Website">Website</option><option value="Configurator">Configurator</option></select>
                                                    <select name="scale" className="input"><option value="Small">Small</option><option value="Medium">Medium</option><option value="Large">Large</option></select>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <input name="startDate" type="date" className="input" required />
                                                    <input name="endDate" type="date" className="input" required />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                                                    <button type="button" className="btn btn-ghost" onClick={() => setIsAddingDraft(false)}>Cancel</button>
                                                    <button type="submit" className="btn btn-primary">Add to Sandbox</button>
                                                </div>
                                            </div>
                                        </form>
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
                                            <div style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{p.name} <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.7 }}>DRAFT</span></div>
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
                                                <span>{p.name}</span>
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
                    />

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
