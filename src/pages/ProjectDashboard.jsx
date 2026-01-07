import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { differenceInDays, differenceInMonths } from 'date-fns';
import { CheckCircle2, Clock, AlertCircle, MoreHorizontal, LayoutList, BarChart2, ArrowLeft, Calendar, CheckSquare, Plus, Trash2, Edit2, Save, X, Globe, RefreshCcw, DoorOpen, Search, Filter, MoreVertical, AlertTriangle, FileText, Archive, Rocket, LayoutGrid, List } from 'lucide-react';
import GanttChart from '../components/GanttChart';
import NewProjectPane from '../components/NewProjectPane';
import ProjectSummaryDashboard from '../components/ProjectSummaryDashboard';
import ProjectHealthDashboard from '../components/ProjectHealthDashboard';
import TaskDetailPanel from '../components/TaskDetailPanel';

const ProjectDashboard = () => {
    const { projects, tasks, resources, initiatives, addTask, updateTask, deleteTask, teams, linkTaskToInitiative } = useApp();
    const { currentUser, isDemoMode } = useAuth();

    // Tenant-aware filtering
    const tenantProjects = useMemo(() => {
        if (!isDemoMode || !currentUser) return projects;

        // Filter by organization
        let filtered = projects.filter(p => p.org_id === currentUser.org_id);

        // RBAC: User role only sees assigned projects (PM or has tasks assigned)
        if (currentUser.role === 'User') {
            const userTaskProjectIds = tasks
                .filter(t => t.assignee === currentUser.name)
                .map(t => t.projectId);
            filtered = filtered.filter(p =>
                p.pmUserId === currentUser.id || userTaskProjectIds.includes(p.id)
            );
        }

        return filtered;
    }, [projects, tasks, currentUser, isDemoMode]);

    const tenantResources = useMemo(() => {
        if (!isDemoMode || !currentUser) return resources;
        return resources.filter(r => r.org_id === currentUser.org_id);
    }, [resources, currentUser, isDemoMode]);

    const isAdmin = currentUser?.role === 'Admin';

    const [viewMode, setViewMode] = useState('list'); // 'list', 'gantt', 'detail'
    const [projectDisplayMode, setProjectDisplayMode] = useState('card'); // 'card', 'table'
    const [isAddingProject, setIsAddingProject] = useState(false);
    const [activeProject, setActiveProject] = useState(null);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [detailTab, setDetailTab] = useState('tasks'); // 'tasks', 'gantt'

    // Task Editing State
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editTaskData, setEditTaskData] = useState({});
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', assignee: '', status: 'Planning', estimate: 0, startDate: '', endDate: '', predecessorId: null, isMarketSpecific: false });

    // Detail View State
    const [ganttOptions, setGanttOptions] = useState({ showCriticalPath: false, showDependencies: false, showGateways: false });
    const [selectedTask, setSelectedTask] = useState(null);
    const [showMarketStatusModal, setShowMarketStatusModal] = useState(false);
    const [selectedMarketTask, setSelectedMarketTask] = useState(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ projects: [], tasks: [], resources: [] });
    const [showSearchDropdown, setShowSearchDropdown] = useState(false);

    // Filter State
    const [selectedTeam, setSelectedTeam] = useState('All');
    const [healthFilter, setHealthFilter] = useState('All'); // 'All', 'On Track', 'At Risk', 'Late'
    const [activeMenuProjectId, setActiveMenuProjectId] = useState(null);

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults({ projects: [], tasks: [], resources: [] });
            setShowSearchDropdown(false);
            return;
        }

        const lowerQuery = query.toLowerCase();
        const matchedProjects = tenantProjects.filter(p => p.name.toLowerCase().includes(lowerQuery));
        const matchedTasks = tasks.filter(t => t.title.toLowerCase().includes(lowerQuery));
        const matchedResources = resources.filter(r => r.name.toLowerCase().includes(lowerQuery));

        setSearchResults({ projects: matchedProjects, tasks: matchedTasks, resources: matchedResources });
        setShowSearchDropdown(true);
    };

    const handleSearchResultClick = (type, item) => {
        if (type === 'project') {
            handleProjectClick(item);
        } else if (type === 'task') {
            const project = projects.find(p => p.id === item.projectId);
            if (project) {
                handleProjectClick(project);
            }
        }
        setShowSearchDropdown(false);
        setSearchQuery('');
    };

    // Initialize selected projects with all active ones on first load (or when projects change)
    useMemo(() => {
        if (selectedProjectIds.length === 0 && projects.length > 0) {
            setSelectedProjectIds(projects.map(p => p.id));
        }
    }, [projects]);

    // Group tasks by project
    const projectTasks = useMemo(() => {
        const grouped = {};
        projects.forEach(p => grouped[p.id] = []);
        tasks.forEach(t => {
            if (grouped[t.projectId]) {
                grouped[t.projectId].push(t);
            }
        });
        return grouped;
    }, [projects, tasks]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'var(--success)';
            case 'In Progress': return 'var(--accent-primary)';
            case 'Delayed': return 'var(--danger)';
            case 'Planning': return 'var(--warning)';
            case 'Proposed': return 'var(--text-muted)';
            default: return 'var(--text-muted)';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return <CheckCircle2 size={18} color="var(--success)" />;
            case 'In Progress': return <Clock size={18} color="var(--accent-primary)" />;
            case 'Delayed': return <AlertCircle size={18} color="var(--danger)" />;
            case 'Planning': return <Calendar size={18} color="var(--warning)" />;
            case 'Proposed': return <MoreHorizontal size={18} color="var(--text-muted)" />;
            default: return <Clock size={18} color="var(--text-muted)" />;
        }
    };

    const getAssigneeName = (id) => {
        if (!id) return 'Unassigned';
        const resource = resources.find(r => r.id === parseInt(id));
        return resource ? resource.name : 'Unassigned';
    };

    const handleProjectClick = (project) => {
        setActiveProject(project);
        setViewMode('detail');
        setIsAddingTask(false);
        setEditingTaskId(null);
    };

    const handleBack = () => {
        setActiveProject(null);
        setViewMode('list');
    };

    const toggleProjectSelection = (id) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pId => pId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    // --- Task CRUD Handlers ---

    const startEditingTask = (task) => {
        setEditingTaskId(task.id);
        setEditTaskData({ ...task });
    };

    const cancelEditingTask = () => {
        setEditingTaskId(null);
        setEditTaskData({});
    };

    const saveTask = () => {
        if (editTaskData.linkedInitiativeId) {
            linkTaskToInitiative(editingTaskId, editTaskData.linkedInitiativeId, editTaskData.valuesSaved || []);
        }
        updateTask(editingTaskId, editTaskData);
        setEditingTaskId(null);
        setEditTaskData({});
    };

    const handleAddTask = () => {
        if (newTask.title) {
            addTask({
                ...newTask,
                projectId: activeProject.id,
                startDate: newTask.startDate || activeProject.startDate,
                endDate: newTask.endDate || activeProject.endDate
            });
            setNewTask({ title: '', assignee: '', status: 'Planning', estimate: 0, startDate: '', endDate: '', predecessorId: null, isMarketSpecific: false });
            setIsAddingTask(false);
        }
    };

    // --- RENDERERS ---

    const getInitiativeUnit = (id) => {
        const init = initiatives.find(i => i.id === id);
        return init?.valueMetric?.match(/\(([^)]+)\)/)?.[1] || 'Units';
    };

    // --- RENDERERS ---

    const renderProjectList = () => {
        const filteredProjects = tenantProjects.filter(p =>
            (selectedTeam === 'All' || p.type === selectedTeam) &&
            (healthFilter === 'All' || p.health === healthFilter)
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                {filteredProjects.map(project => {
                    const pTasks = projectTasks[project.id] || [];

                    // Calculate expected hours based on project scale and duration
                    const start = new Date(project.startDate);
                    const end = new Date(project.endDate);
                    const durationMonths = Math.max(1, differenceInMonths(end, start));

                    let monthlyHours = 320; // Medium default
                    if (project.scale === 'Small') monthlyHours = 160;
                    if (project.scale === 'Large') monthlyHours = 640;

                    const totalExpectedHours = durationMonths * monthlyHours;

                    // Calculate actual burned hours from tasks
                    const totalActualHours = pTasks.reduce((sum, t) => sum + (parseInt(t.actual) || 0), 0);

                    const progress = totalExpectedHours > 0 ? Math.min(100, Math.round((totalActualHours / totalExpectedHours) * 100)) : 0;

                    const variance = project.originalEndDate ? differenceInDays(new Date(project.endDate), new Date(project.originalEndDate)) : 0;
                    const hasPendingGateways = project.launchDetails?.some(d => d.inputGateways?.some(g => g.status === 'Pending' || g.status === 'Late'));

                    return (
                        <div
                            key={project.id}
                            className="card"
                            style={{ border: '1px solid transparent', position: 'relative' }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
                        >
                            {/* Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                    <h3 className="text-xl">{project.name}</h3>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '999px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        color: 'var(--accent-primary)',
                                        border: '1px solid rgba(59, 130, 246, 0.2)'
                                    }}>
                                        {project.status}
                                    </span>
                                    {hasPendingGateways && (
                                        <div title="Pending Input Gateway" style={{ display: 'flex', alignItems: 'center', color: 'var(--warning)' }}>
                                            <AlertCircle size={16} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                    <div className="text-2xl" style={{ color: 'var(--accent-primary)' }}>{progress}%</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {totalActualHours}h / {totalExpectedHours}h burned
                                    </div>
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                                    PM: {project.pm || 'Unassigned'}
                                </div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                    Dates: {project.startDate} to <span style={{ fontWeight: 600 }}>(Predicted) {project.endDate}</span>
                                </div>
                                {variance > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.125rem' }}>
                                        (Original Plan: {project.originalEndDate}. Variance: +{variance} days)
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div style={{ height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '999px', marginBottom: 'var(--spacing-lg)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${progress}%`, backgroundColor: 'var(--accent-primary)', borderRadius: '999px' }}></div>
                            </div>

                            {/* Footer / Actions */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}
                                    onClick={() => handleProjectClick(project)}
                                >
                                    View Details
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className="btn-ghost"
                                        style={{ padding: '0.25rem' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuProjectId(activeMenuProjectId === project.id ? null : project.id);
                                        }}
                                    >
                                        <MoreVertical size={18} />
                                    </button>
                                    {activeMenuProjectId === project.id && (
                                        <div className="card" style={{ position: 'absolute', right: 0, top: '100%', width: '160px', padding: '0.5rem', zIndex: 10, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                                            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', padding: '0.5rem' }} onClick={() => setActiveMenuProjectId(null)}>
                                                <Edit2 size={14} style={{ marginRight: '0.5rem' }} /> Edit Project
                                            </button>
                                            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', padding: '0.5rem' }} onClick={() => setActiveMenuProjectId(null)}>
                                                <FileText size={14} style={{ marginRight: '0.5rem' }} /> View KVI Report
                                            </button>
                                            <button className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.875rem', padding: '0.5rem', color: 'var(--danger)' }} onClick={() => setActiveMenuProjectId(null)}>
                                                <Archive size={14} style={{ marginRight: '0.5rem' }} /> Archive Project
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderProjectTable = () => {
        const filteredProjects = tenantProjects.filter(p =>
            (selectedTeam === 'All' || p.type === selectedTeam) &&
            (healthFilter === 'All' || p.health === healthFilter)
        );

        return (
            <div className="card" style={{ overflow: 'hidden' }}>
                {/* Table Header */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1.5fr 1fr 100px',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid var(--bg-tertiary)'
                }}>
                    <div>Project Name</div>
                    <div>Status</div>
                    <div>Team</div>
                    <div>PM</div>
                    <div>Dates</div>
                    <div>Progress</div>
                    <div>Actions</div>
                </div>

                {/* Table Rows */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {filteredProjects.map(project => {
                        const pTasks = projectTasks[project.id] || [];
                        const start = new Date(project.startDate);
                        const end = new Date(project.endDate);
                        const durationMonths = Math.max(1, differenceInMonths(end, start));

                        let monthlyHours = 320;
                        if (project.scale === 'Small') monthlyHours = 160;
                        if (project.scale === 'Large') monthlyHours = 640;

                        const totalExpectedHours = durationMonths * monthlyHours;
                        const totalActualHours = pTasks.reduce((sum, t) => sum + (parseInt(t.actual) || 0), 0);
                        const progress = totalExpectedHours > 0 ? Math.min(100, Math.round((totalActualHours / totalExpectedHours) * 100)) : 0;

                        return (
                            <div
                                key={project.id}
                                onClick={() => handleProjectClick(project)}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 0.8fr 1fr 1fr 1.5fr 1fr 100px',
                                    padding: '0.75rem 1rem',
                                    alignItems: 'center',
                                    borderBottom: '1px solid var(--bg-tertiary)',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.15s ease'
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(161, 0, 255, 0.04)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <div style={{ fontWeight: 500 }}>{project.name}</div>
                                <div>
                                    <span style={{
                                        fontSize: '0.75rem',
                                        padding: '0.125rem 0.5rem',
                                        borderRadius: '999px',
                                        backgroundColor: project.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' :
                                            project.status === 'Planning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                                        color: project.status === 'Active' ? 'var(--success)' :
                                            project.status === 'Planning' ? 'var(--warning)' : 'var(--text-muted)'
                                    }}>
                                        {project.status}
                                    </span>
                                </div>
                                <div className="text-sm text-muted">{project.type || 'N/A'}</div>
                                <div className="text-sm">{project.pm || 'Unassigned'}</div>
                                <div className="text-sm text-muted">
                                    {project.startDate} → {project.endDate}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{
                                        flex: 1,
                                        height: '6px',
                                        backgroundColor: 'var(--bg-tertiary)',
                                        borderRadius: '999px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            backgroundColor: '#A100FF',
                                            borderRadius: '999px',
                                            transition: 'width 0.3s ease'
                                        }} />
                                    </div>
                                    <span className="text-sm" style={{ minWidth: '40px', color: '#A100FF' }}>{progress}%</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                        onClick={(e) => { e.stopPropagation(); handleProjectClick(project); }}
                                    >
                                        View
                                    </button>
                                    <button
                                        className="btn-ghost"
                                        style={{ padding: '0.25rem' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuProjectId(activeMenuProjectId === project.id ? null : project.id);
                                        }}
                                    >
                                        <MoreVertical size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredProjects.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No projects found matching the current filters.
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderCombinedGantt = () => {
        const filteredProjects = tenantProjects.filter(p =>
            (selectedTeam === 'All' || p.type === selectedTeam) &&
            selectedProjectIds.includes(p.id)
        );

        // Find min start and max end for the chart range
        const dates = filteredProjects.flatMap(p => [new Date(p.startDate), new Date(p.endDate)]);
        const minDate = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        const maxDate = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        return (
            <div className="card">
                <div style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
                    {projects.map(p => (
                        <button
                            key={p.id}
                            onClick={() => toggleProjectSelection(p.id)}
                            style={{
                                padding: '0.25rem 0.75rem',
                                borderRadius: '999px',
                                border: `1px solid ${selectedProjectIds.includes(p.id) ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}`,
                                backgroundColor: selectedProjectIds.includes(p.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                color: selectedProjectIds.includes(p.id) ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontSize: '0.875rem',
                                cursor: 'pointer'
                            }}
                        >
                            {p.name}
                        </button>
                    ))}
                </div>

                {filteredProjects.length > 0 ? (
                    <GanttChart
                        items={filteredProjects}
                        startDate={minDate}
                        endDate={maxDate}
                        type="project"
                    />
                ) : (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Select projects to view Gantt chart.
                    </div>
                )}
            </div>
        );
    };

    const renderProjectDetail = () => {
        if (!activeProject) return null;
        const pTasks = projectTasks[activeProject.id] || [];

        return (
            <div>
                <button onClick={handleBack} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-md)', paddingLeft: 0 }}>
                    <ArrowLeft size={18} /> Back to Projects
                </button>

                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 className="text-2xl">{activeProject.name}</h2>
                            <p className="text-muted">{activeProject.type} • {activeProject.startDate} to {activeProject.endDate}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.875rem' }}>
                                {activeProject.status}
                            </span>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-tertiary)', fontSize: '0.875rem' }}>
                                {activeProject.scale} Scale
                            </span>
                        </div>
                    </div>
                </div>

                {/* Project Health Dashboard */}
                <ProjectHealthDashboard project={activeProject} tasks={pTasks} />

                {/* Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--bg-tertiary)' }}>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                        <button
                            onClick={() => setDetailTab('tasks')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderBottom: `2px solid ${detailTab === 'tasks' ? 'var(--accent-primary)' : 'transparent'}`,
                                color: detailTab === 'tasks' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: 500
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CheckSquare size={16} /> Tasks
                            </div>
                        </button>
                        <button
                            onClick={() => setDetailTab('gantt')}
                            style={{
                                padding: '0.5rem 1rem',
                                borderBottom: `2px solid ${detailTab === 'gantt' ? 'var(--accent-primary)' : 'transparent'}`,
                                color: detailTab === 'gantt' ? 'var(--accent-primary)' : 'var(--text-muted)',
                                fontWeight: 500
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Calendar size={16} /> Gantt Chart
                            </div>
                        </button>
                    </div>
                    {detailTab === 'tasks' && (
                        <button className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', marginBottom: '0.5rem' }} onClick={() => setIsAddingTask(true)}>
                            <Plus size={16} style={{ marginRight: '4px' }} /> Add Task
                        </button>
                    )}
                </div>

                {detailTab === 'tasks' ? (
                    <div className="card">
                        {/* Add Task Form */}
                        {isAddingTask && (
                            <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input
                                        type="text" placeholder="Task Title"
                                        value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <select
                                        value={newTask.predecessorId || ''} onChange={e => setNewTask({ ...newTask, predecessorId: e.target.value ? parseInt(e.target.value) : null })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">No Predecessor</option>
                                        {pTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                    </select>
                                    <select
                                        value={newTask.assignee} onChange={e => setNewTask({ ...newTask, assignee: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">Unassigned</option>
                                        {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                    <select
                                        value={newTask.status} onChange={e => setNewTask({ ...newTask, status: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>
                                    <input
                                        type="number" placeholder="Est. Hours"
                                        value={newTask.estimate} onChange={e => setNewTask({ ...newTask, estimate: parseInt(e.target.value) || 0 })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="date"
                                        value={newTask.startDate} onChange={e => setNewTask({ ...newTask, startDate: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <input
                                        type="date"
                                        value={newTask.endDate} onChange={e => setNewTask({ ...newTask, endDate: e.target.value })}
                                        style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    />
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: 'span 6' }}>
                                        <input
                                            type="checkbox"
                                            id="isMarketSpecific"
                                            checked={newTask.isMarketSpecific}
                                            onChange={e => setNewTask({ ...newTask, isMarketSpecific: e.target.checked })}
                                        />
                                        <label htmlFor="isMarketSpecific" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Market Specific Task</label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button className="btn-ghost" onClick={() => setIsAddingTask(false)}>Cancel</button>
                                    <button className="btn btn-primary" onClick={handleAddTask}>Save Task</button>
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 80px', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', borderBottom: '1px solid var(--bg-tertiary)', marginBottom: '0.5rem' }}>
                            <div>Task Name</div>
                            <div>Assignee</div>
                            <div>Status</div>
                            <div>Dates</div>
                            <div>Hours (Est/Act)</div>
                            <div>Actions</div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {pTasks.map(task => (
                                <div key={task.id} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr 1.5fr 1fr 80px',
                                    padding: '0.75rem 0.5rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderRadius: 'var(--radius-md)',
                                    alignItems: 'center',
                                    border: '1px solid transparent',
                                    transition: 'background-color 0.2s ease',
                                    cursor: 'pointer'
                                }}
                                    onClick={() => setSelectedTask(task)}
                                    className="task-row"
                                >
                                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                            {getAssigneeName(task.assignee).charAt(0)}
                                        </div>
                                        <span className="text-sm">{getAssigneeName(task.assignee)}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {getStatusIcon(task.status)}
                                        <span className="text-sm" style={{ color: getStatusColor(task.status) }}>{task.status}</span>
                                        {task.isMarketSpecific && (
                                            <button
                                                className="btn-ghost"
                                                onClick={(e) => { e.stopPropagation(); setSelectedMarketTask(task); setShowMarketStatusModal(true); }}
                                                title="View Market Status"
                                                style={{ padding: '2px', marginLeft: '0.5rem' }}
                                            >
                                                <Globe size={14} color="var(--accent-primary)" />
                                            </button>
                                        )}
                                        {task.gatewayDependency && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '0.5rem' }} title={`Linked to Gateway: ${task.gatewayDependency}`}>
                                                <DoorOpen size={12} />
                                                <span>Gate</span>
                                            </div>
                                        )}
                                        {task.isRework && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--warning)', marginLeft: '0.5rem' }} title={`Triggered by Gateway: ${task.gatewaySource}`}>
                                                <RefreshCcw size={12} />
                                                <span>Rework</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted">
                                        {task.startDate} - {task.endDate}
                                    </div>
                                    <div className="text-sm">
                                        {task.estimate}h / <span style={{ color: task.actual > task.estimate ? 'var(--danger)' : 'var(--text-muted)' }}>{task.actual}h</span>
                                        {task.valuesSaved && task.valuesSaved.length > 0 ? (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }} title={task.valuesSaved.map(v => `${v.metric}: ${v.value}`).join('\n')}>
                                                <Rocket size={10} />
                                                <span>+{task.valuesSaved.length} Metrics</span>
                                            </div>
                                        ) : task.valueSaved ? (
                                            <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.125rem' }} title="Value Realized via Initiative">
                                                <Rocket size={10} />
                                                <span>+{task.valueSaved} {getInitiativeUnit(task.linkedInitiativeId)}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); startEditingTask(task); }} title="Edit"><Edit2 size={16} /></button>
                                        <button className="btn-ghost" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} title="Delete"><Trash2 size={16} color="var(--danger)" /></button>
                                    </div>
                                </div>
                            ))}
                            {pTasks.length === 0 && <div className="text-muted" style={{ padding: '1rem', textAlign: 'center' }}>No tasks found.</div>}
                        </div>
                    </div>
                ) : (
                    <div className="card">
                        {/* Gantt Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Gantt Visualizations:</div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={ganttOptions.showCriticalPath}
                                    onChange={(e) => setGanttOptions({ ...ganttOptions, showCriticalPath: e.target.checked })}
                                />
                                Highlight Critical Path
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={ganttOptions.showDependencies}
                                    onChange={(e) => setGanttOptions({ ...ganttOptions, showDependencies: e.target.checked })}
                                />
                                Show Dependency Lines
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={ganttOptions.showGateways}
                                    onChange={(e) => setGanttOptions({ ...ganttOptions, showGateways: e.target.checked })}
                                />
                                Show Gateway Blockers
                            </label>
                        </div>

                        {(() => {
                            const taskDates = pTasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
                            const projectDates = [new Date(activeProject.startDate), new Date(activeProject.endDate)];
                            const allDates = [...taskDates, ...projectDates].filter(d => !isNaN(d));

                            const minDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date(activeProject.startDate);
                            const maxDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date(activeProject.endDate);

                            return (
                                <GanttChart
                                    items={pTasks}
                                    startDate={minDate}
                                    endDate={maxDate}
                                    type="task"
                                    showCriticalPath={ganttOptions.showCriticalPath}
                                    showDependencies={ganttOptions.showDependencies}
                                    showGateways={ganttOptions.showGateways}
                                    onTaskClick={setSelectedTask}
                                />
                            );
                        })()}
                    </div>
                )}

                {/* Task Detail Panel */}
                {selectedTask && (
                    <TaskDetailPanel
                        task={selectedTask}
                        project={activeProject}
                        tasks={pTasks}
                        onClose={() => setSelectedTask(null)}
                    />
                )}
                {/* Edit Task Modal */}
                {editingTaskId && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div className="card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                                <h3 className="text-xl">Edit Task</h3>
                                <button className="btn-ghost" onClick={cancelEditingTask}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Task Title</label>
                                    <input
                                        type="text"
                                        value={editTaskData.title}
                                        onChange={e => setEditTaskData({ ...editTaskData, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Predecessor</label>
                                        <select
                                            value={editTaskData.predecessorId || ''}
                                            onChange={e => setEditTaskData({ ...editTaskData, predecessorId: e.target.value ? parseInt(e.target.value) : null })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="">No Predecessor</option>
                                            {pTasks.filter(t => t.id !== editingTaskId).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Assignee</label>
                                        <select
                                            value={editTaskData.assignee || ''}
                                            onChange={e => setEditTaskData({ ...editTaskData, assignee: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="">Unassigned</option>
                                            {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</label>
                                        <select
                                            value={editTaskData.status}
                                            onChange={e => setEditTaskData({ ...editTaskData, status: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        >
                                            <option value="Planning">Planning</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Delayed">Delayed</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Est. Hours</label>
                                            <input
                                                type="number"
                                                value={editTaskData.estimate}
                                                onChange={e => setEditTaskData({ ...editTaskData, estimate: parseInt(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Act. Hours</label>
                                            <input
                                                type="number"
                                                value={editTaskData.actual}
                                                onChange={e => setEditTaskData({ ...editTaskData, actual: parseInt(e.target.value) || 0 })}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Start Date</label>
                                        <input
                                            type="date"
                                            value={editTaskData.startDate}
                                            onChange={e => setEditTaskData({ ...editTaskData, startDate: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>End Date</label>
                                        <input
                                            type="date"
                                            value={editTaskData.endDate}
                                            onChange={e => setEditTaskData({ ...editTaskData, endDate: e.target.value })}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                                    <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Rocket size={16} /> Value Realization
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Linked Initiative</label>
                                            <select
                                                value={editTaskData.linkedInitiativeId || ''}
                                                onChange={e => {
                                                    const newInitId = e.target.value ? parseInt(e.target.value) : null;
                                                    setEditTaskData({
                                                        ...editTaskData,
                                                        linkedInitiativeId: newInitId,
                                                        valuesSaved: [] // Reset values when initiative changes
                                                    });
                                                }}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="">None</option>
                                                {initiatives.map(i => (
                                                    <option key={i.id} value={i.id}>{i.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {editTaskData.linkedInitiativeId && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {initiatives.find(i => i.id === editTaskData.linkedInitiativeId)?.valueMetrics?.map(metric => {
                                                    const currentVal = editTaskData.valuesSaved?.find(v => v.metric === metric)?.value || '';
                                                    return (
                                                        <div key={metric}>
                                                            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                                {metric}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={currentVal}
                                                                onChange={e => {
                                                                    const val = parseFloat(e.target.value) || 0;
                                                                    const newValues = [...(editTaskData.valuesSaved || [])];
                                                                    const idx = newValues.findIndex(v => v.metric === metric);
                                                                    if (idx >= 0) {
                                                                        newValues[idx] = { metric, value: val };
                                                                    } else {
                                                                        newValues.push({ metric, value: val });
                                                                    }
                                                                    setEditTaskData({ ...editTaskData, valuesSaved: newValues });
                                                                }}
                                                                placeholder="0"
                                                                style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                                {/* Fallback for legacy single metric initiatives if any */}
                                                {!initiatives.find(i => i.id === editTaskData.linkedInitiativeId)?.valueMetrics && (
                                                    <div>
                                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                            Value Saved ({getInitiativeUnit(editTaskData.linkedInitiativeId)})
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={editTaskData.valueSaved || ''}
                                                            onChange={e => setEditTaskData({ ...editTaskData, valueSaved: parseFloat(e.target.value) || 0 })}
                                                            placeholder="0"
                                                            style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                    <button className="btn-ghost" onClick={cancelEditingTask}>Cancel</button>
                                    <button className="btn btn-primary" onClick={saveTask}>Save Changes</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        );
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {viewMode !== 'detail' && (
                <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 className="text-2xl">Project Hub</h2>
                        <p className="text-muted">Track active projects and real-time status.</p>
                    </div>

                    {/* Search Bar */}
                    <div style={{ position: 'relative', width: '300px', margin: '0 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '0.5rem' }}>
                            <Search size={18} color="var(--text-muted)" style={{ marginRight: '0.5rem' }} />
                            <input
                                type="text"
                                placeholder="Search projects, tasks..."
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.875rem' }}
                                onFocus={() => { if (searchQuery) setShowSearchDropdown(true); }}
                                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
                            />
                        </div>
                        {showSearchDropdown && (
                            <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '0.5rem', zIndex: 100, maxHeight: '400px', overflowY: 'auto', padding: '0.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
                                {searchResults.projects.length === 0 && searchResults.tasks.length === 0 && searchResults.resources.length === 0 && (
                                    <div style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>No results found.</div>
                                )}

                                {searchResults.projects.length > 0 && (
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>Projects</div>
                                        {searchResults.projects.map(p => (
                                            <div key={p.id} onClick={() => handleSearchResultClick('project', p)} style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--accent-primary)' }}></div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.status}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchResults.tasks.length > 0 && (
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>Tasks</div>
                                        {searchResults.tasks.map(t => (
                                            <div key={t.id} onClick={() => handleSearchResultClick('task', t)} style={{ padding: '0.5rem', cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{t.title}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {projects.find(p => p.id === t.projectId)?.name} • {t.status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchResults.resources.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', padding: '0.25rem 0.5rem', textTransform: 'uppercase' }}>Resources</div>
                                        {searchResults.resources.map(r => (
                                            <div key={r.id} style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem' }}>
                                                    {r.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{r.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.role} • {r.team}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        {/* Team Filter */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <div style={{ position: 'absolute', left: '0.75rem', pointerEvents: 'none', color: 'var(--text-muted)' }}>
                                <Filter size={16} />
                            </div>
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.5rem 0.5rem 2.25rem',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--bg-tertiary)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    appearance: 'none',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                }}
                            >
                                <option value="All">All Teams</option>
                                {teams.map(team => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                            <button
                                onClick={() => { setViewMode('list'); setProjectDisplayMode('card'); }}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: viewMode === 'list' && projectDisplayMode === 'card' ? 'var(--bg-tertiary)' : 'transparent',
                                    color: viewMode === 'list' && projectDisplayMode === 'card' ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                                title="Card View"
                            >
                                <LayoutGrid size={20} />
                            </button>
                            <button
                                onClick={() => { setViewMode('list'); setProjectDisplayMode('table'); }}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: viewMode === 'list' && projectDisplayMode === 'table' ? 'var(--bg-tertiary)' : 'transparent',
                                    color: viewMode === 'list' && projectDisplayMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                                title="Table View"
                            >
                                <List size={20} />
                            </button>
                            <button
                                onClick={() => setViewMode('gantt')}
                                style={{
                                    padding: '0.5rem',
                                    borderRadius: 'var(--radius-sm)',
                                    backgroundColor: viewMode === 'gantt' ? 'var(--bg-tertiary)' : 'transparent',
                                    color: viewMode === 'gantt' ? 'var(--text-primary)' : 'var(--text-muted)'
                                }}
                                title="Gantt View"
                            >
                                <BarChart2 size={20} style={{ transform: 'rotate(90deg)' }} />
                            </button>
                        </div>
                        {isAdmin && (
                            <button className="btn btn-primary" onClick={() => setIsAddingProject(true)}>
                                + New Project
                            </button>
                        )}
                    </div>
                </header>
            )}

            {isAddingProject && (
                <NewProjectPane onClose={() => setIsAddingProject(false)} />
            )}

            {viewMode === 'list' && (
                <>
                    <ProjectSummaryDashboard onFilterHealth={(health) => setHealthFilter(health === healthFilter ? 'All' : health)} />
                    {healthFilter !== 'All' && (
                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span className="text-sm text-muted">Filtering by Health: </span>
                            <span className="badge" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {healthFilter}
                                <button onClick={() => setHealthFilter('All')} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </span>
                        </div>
                    )}
                    {projectDisplayMode === 'card' ? renderProjectList() : renderProjectTable()}
                </>
            )}
            {viewMode === 'gantt' && renderCombinedGantt()}
            {viewMode === 'detail' && renderProjectDetail()}

            {/* Market Status Modal */}
            {showMarketStatusModal && selectedMarketTask && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxHeight: '80vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 className="text-xl">Market Status: {selectedMarketTask.title}</h3>
                            <button className="btn-ghost" onClick={() => setShowMarketStatusModal(false)}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedMarketTask.marketStatus && Object.entries(selectedMarketTask.marketStatus).map(([market, status]) => (
                                <div key={market} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                                    <span>{market}</span>
                                    <select
                                        value={status}
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            const updatedMarketStatus = { ...selectedMarketTask.marketStatus, [market]: newStatus };
                                            updateTask(selectedMarketTask.id, { marketStatus: updatedMarketStatus });
                                            setSelectedMarketTask({ ...selectedMarketTask, marketStatus: updatedMarketStatus });
                                        }}
                                        style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>
                                </div>
                            ))}
                            {(!selectedMarketTask.marketStatus || Object.keys(selectedMarketTask.marketStatus).length === 0) && (
                                <div className="text-muted">No markets defined for this task.</div>
                            )}
                        </div>
                        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                            <button className="btn btn-primary" onClick={() => setShowMarketStatusModal(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDashboard;
