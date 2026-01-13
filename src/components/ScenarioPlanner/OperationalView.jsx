import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CheckCircle, Circle, Trash2, Plus, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useState, useMemo } from 'react';
import { addMonths, startOfMonth, endOfMonth, format, startOfWeek, endOfWeek, addWeeks, startOfQuarter, endOfQuarter, addQuarters } from 'date-fns';
import NewProjectPane from '../NewProjectPane';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// --- Constants for Role Distribution Heuristics ---
const ROLE_DISTRIBUTION = {
    'Website': { 'Developer': 0.5, 'Designer': 0.3, 'QA': 0.1, 'Manager': 0.1, 'Product Owner': 0.0, 'All': 1.0 },
    'Configurator': { 'Developer': 0.6, 'Designer': 0.2, 'QA': 0.1, 'Manager': 0.1, 'Product Owner': 0.0, 'All': 1.0 },
    'Asset Production': { 'Developer': 0.0, 'Designer': 0.8, 'QA': 0.0, 'Manager': 0.2, 'Product Owner': 0.0, 'All': 1.0 }
};

const ROLE_MAPPING = {
    'Frontend Lead': 'Developer',
    '3D Artist': 'Designer',
    'Product Owner': 'Product Owner',
    'Developer': 'Developer',
    'QA': 'QA',
    'Designer': 'Designer',
    'Manager': 'Manager'
};

const OperationalView = () => {
    const { projects: allProjects, resources: allResources, selectedProjectIds, toggleProjectSelection, deleteProject } = useApp();
    const { currentUser, isDemoMode } = useAuth();
    const [isAdding, setIsAdding] = useState(false);

    // Tenant-aware filtering
    const projects = useMemo(() => {
        if (!isDemoMode || !currentUser) return allProjects;
        return allProjects.filter(p => p.org_id === currentUser.org_id);
    }, [allProjects, currentUser, isDemoMode]);

    const resources = useMemo(() => {
        if (!isDemoMode || !currentUser) return allResources;
        return allResources.filter(r => r.org_id === currentUser.org_id);
    }, [allResources, currentUser, isDemoMode]);

    // Filter State
    const [selectedTeam, setSelectedTeam] = useState('All');
    const [selectedRole, setSelectedRole] = useState('All');
    const [timeView, setTimeView] = useState('Month'); // 'Week', 'Month', 'Quarter'
    const [showDetailOverlay, setShowDetailOverlay] = useState(false);
    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const [chartFocus, setChartFocus] = useState('Demand'); // 'Demand', 'Cost'

    // Available filter options
    const TEAMS = ['All', 'Website', 'Configurator', 'Asset Production'];
    const ROLES = ['All', 'Developer', 'Designer', 'Manager', 'QA', 'Product Owner'];

    // Export to Excel handler
    const handleExportToExcel = () => {
        // Get selected projects
        const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));

        // Sheet 1: Summary
        const summaryData = [
            ['Resource Forecast Report'],
            ['Generated:', format(new Date(), 'yyyy-MM-dd HH:mm')],
            [''],
            ['Filters Applied:'],
            ['Team:', selectedTeam],
            ['Role:', selectedRole],
            ['Time View:', timeView],
            [''],
            ['Summary:'],
            ['Total Selected Projects:', selectedProjects.length],
            ['Max Capacity (hours/period):', maxCapacity],
            ['Total Periods in Forecast:', chartData.length]
        ];

        // Sheet 2: Forecast Data
        const forecastHeaders = ['Period', 'Total Demand (hrs)', 'Max Capacity (hrs)', 'Utilization %', ...selectedProjects.map(p => p.name + ' (hrs)')];
        const forecastRows = chartData.map(period => {
            const utilization = maxCapacity > 0 ? Math.round((period.demand / maxCapacity) * 100) : 0;
            return [
                period.name,
                Math.round(period.demand),
                maxCapacity,
                utilization + '%',
                ...selectedProjects.map(p => Math.round(period[p.id] || 0))
            ];
        });
        const forecastData = [forecastHeaders, ...forecastRows];

        // Sheet 3: Project Details
        const projectHeaders = ['Project Name', 'Type', 'Scale', 'Start Date', 'End Date', 'Duration (months)'];
        const projectRows = selectedProjects.map(p => {
            const startDate = new Date(p.startDate);
            const endDate = new Date(p.endDate);
            const months = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24 * 30));
            return [p.name, p.type || 'N/A', p.scale || 'Medium', p.startDate, p.endDate, months];
        });
        const projectData = [projectHeaders, ...projectRows];

        // Create workbook
        const wb = XLSX.utils.book_new();

        const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
        ws1['!cols'] = [{ wch: 30 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

        const ws2 = XLSX.utils.aoa_to_sheet(forecastData);
        ws2['!cols'] = forecastHeaders.map(() => ({ wch: 18 }));
        XLSX.utils.book_append_sheet(wb, ws2, 'Forecast Data');

        const ws3 = XLSX.utils.aoa_to_sheet(projectData);
        ws3['!cols'] = projectHeaders.map(() => ({ wch: 20 }));
        XLSX.utils.book_append_sheet(wb, ws3, 'Project Details');

        // Download file
        const filename = `Resource_Forecast_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    // Pre-calculate capacity issues for ALL filter combinations
    const capacityIssueMap = useMemo(() => {
        const issues = {};
        const today = new Date();

        // Helper function to check if a filter combination has capacity issues
        const checkCapacityIssue = (team, role) => {
            // Calculate capacity for this filter
            const filteredResources = resources.filter(r => {
                const matchTeam = team === 'All' || r.team === team;
                const normalizedRole = ROLE_MAPPING[r.role] || r.role;
                const matchRole = role === 'All' || normalizedRole === role;
                return matchTeam && matchRole;
            });
            const maxCapacity = filteredResources.reduce((sum, r) => sum + parseInt(r.capacity), 0);

            // Calculate demand for 12 months
            for (let i = 0; i < 12; i++) {
                const date = addMonths(today, i);
                const start = startOfMonth(date);
                const end = endOfMonth(date);

                let periodDemand = 0;

                projects.forEach(project => {
                    if (selectedProjectIds.includes(project.id)) {
                        const isTeamMatch = team === 'All' || project.type === team;
                        if (!isTeamMatch) return;

                        const projStart = new Date(project.startDate);
                        const projEnd = new Date(project.endDate);

                        if (projStart <= end && projEnd >= start) {
                            let monthlyHours = 320;
                            if (project.scale === 'Small') monthlyHours = 160;
                            if (project.scale === 'Large') monthlyHours = 640;

                            const typeDistribution = ROLE_DISTRIBUTION[project.type] || { 'All': 1.0 };
                            const ratio = role === 'All' ? 1.0 : (typeDistribution[role] || 0);

                            periodDemand += monthlyHours * ratio;
                        }
                    }
                });

                if (periodDemand > maxCapacity && maxCapacity > 0) {
                    return true;
                }
            }
            return false;
        };

        // Check all team combinations
        TEAMS.forEach(team => {
            issues[`team:${team}`] = checkCapacityIssue(team, selectedRole);
        });

        // Check all role combinations
        ROLES.forEach(role => {
            issues[`role:${role}`] = checkCapacityIssue(selectedTeam, role);
        });

        return issues;
    }, [projects, selectedProjectIds, resources, selectedTeam, selectedRole]);

    // Count how many filter combinations have issues
    const teamIssueCount = TEAMS.filter(t => capacityIssueMap[`team:${t}`]).length;
    const roleIssueCount = ROLES.filter(r => capacityIssueMap[`role:${r}`]).length;

    // Calculate ALL team+role combinations with capacity issues (for the issue list)
    const allCapacityIssues = useMemo(() => {
        const issues = [];
        const today = new Date();

        // Helper to check a specific team+role combination
        const checkCombination = (team, role) => {
            const filteredResources = resources.filter(r => {
                const matchTeam = team === 'All' || r.team === team;
                const normalizedRole = ROLE_MAPPING[r.role] || r.role;
                const matchRole = role === 'All' || normalizedRole === role;
                return matchTeam && matchRole;
            });
            const maxCapacity = filteredResources.reduce((sum, r) => sum + parseInt(r.capacity), 0);

            let maxOverload = 0;
            let overloadPeriods = 0;

            for (let i = 0; i < 12; i++) {
                const date = addMonths(today, i);
                const start = startOfMonth(date);
                const end = endOfMonth(date);

                let periodDemand = 0;

                projects.forEach(project => {
                    if (selectedProjectIds.includes(project.id)) {
                        const isTeamMatch = team === 'All' || project.type === team;
                        if (!isTeamMatch) return;

                        const projStart = new Date(project.startDate);
                        const projEnd = new Date(project.endDate);

                        if (projStart <= end && projEnd >= start) {
                            let monthlyHours = 320;
                            if (project.scale === 'Small') monthlyHours = 160;
                            if (project.scale === 'Large') monthlyHours = 640;

                            const typeDistribution = ROLE_DISTRIBUTION[project.type] || { 'All': 1.0 };
                            const ratio = role === 'All' ? 1.0 : (typeDistribution[role] || 0);

                            periodDemand += monthlyHours * ratio;
                        }
                    }
                });

                if (periodDemand > 0 && (maxCapacity === 0 || periodDemand > maxCapacity)) {
                    overloadPeriods++;
                    // Calculate overload percentage (use 100 for zero capacity = infinite overload)
                    const overloadPercent = maxCapacity > 0
                        ? Math.round(((periodDemand - maxCapacity) / maxCapacity) * 100)
                        : 100; // No capacity = 100% overload indicator
                    if (overloadPercent > maxOverload) maxOverload = overloadPercent;
                }
            }

            return { hasIssue: overloadPeriods > 0, overloadPeriods, maxOverload };
        };

        // Check all non-"All" combinations (specific team + specific role)
        const specificTeams = TEAMS.filter(t => t !== 'All');
        const specificRoles = ROLES.filter(r => r !== 'All');

        specificTeams.forEach(team => {
            specificRoles.forEach(role => {
                const result = checkCombination(team, role);
                if (result.hasIssue) {
                    issues.push({
                        team,
                        role,
                        overloadPeriods: result.overloadPeriods,
                        maxOverload: result.maxOverload,
                        label: `${team} → ${role}`
                    });
                }
            });
        });

        // Sort by severity (max overload)
        issues.sort((a, b) => b.maxOverload - a.maxOverload);

        return issues;
    }, [projects, selectedProjectIds, resources]);

    // Calculate Chart Data
    const chartDataResult = useMemo(() => {
        // 1. Calculate Max Capacity based on Filters (Monthly Base)
        const filteredResources = resources.filter(r => {
            // Team Filter
            const matchTeam = selectedTeam === 'All' || r.team === selectedTeam;

            // Role Filter (using normalization)
            const normalizedRole = ROLE_MAPPING[r.role] || r.role;
            const matchRole = selectedRole === 'All' || normalizedRole === selectedRole;

            return matchTeam && matchRole;
        });
        const baseMaxCapacity = filteredResources.reduce((sum, r) => sum + parseInt(r.capacity), 0);

        let dataPoints = [];
        let capacityMultiplier = 1;
        let demandMultiplier = 1;
        const today = new Date();

        if (timeView === 'Week') {
            capacityMultiplier = 0.25;
            demandMultiplier = 0.25;
            for (let i = 0; i < 24; i++) { // 6 months approx
                dataPoints.push(addWeeks(today, i));
            }
        } else if (timeView === 'Quarter') {
            capacityMultiplier = 3;
            demandMultiplier = 3;
            for (let i = 0; i < 4; i++) { // 1 year
                dataPoints.push(addQuarters(today, i));
            }
        } else {
            // Month
            for (let i = 0; i < 12; i++) {
                dataPoints.push(addMonths(today, i));
            }
        }

        const maxCapacity = baseMaxCapacity * capacityMultiplier;

        // 2. Calculate Demand based on Projects and Filters
        const activeProjectIds = new Set();

        const chartData = dataPoints.map(date => {
            let start, end, label;

            if (timeView === 'Week') {
                start = startOfWeek(date);
                end = endOfWeek(date);
                label = format(date, 'd MMM');
            } else if (timeView === 'Quarter') {
                start = startOfQuarter(date);
                end = endOfQuarter(date);
                label = format(date, 'QQQ yyyy');
            } else {
                start = startOfMonth(date);
                end = endOfMonth(date);
                label = format(date, 'MMM yyyy');
            }

            let periodDemand = 0;
            let periodCost = 0;
            let projectDemands = {};

            projects.forEach(project => {
                if (selectedProjectIds.includes(project.id)) {
                    // Filter 1: Team Check
                    const isTeamMatch = selectedTeam === 'All' || project.type === selectedTeam;
                    if (!isTeamMatch) return;

                    const projStart = new Date(project.startDate);
                    const projEnd = new Date(project.endDate);

                    // Check overlap
                    if (projStart <= end && projEnd >= start) {
                        // Base Monthly Demand
                        let monthlyHours = 320;
                        if (project.scale === 'Small') monthlyHours = 160;
                        if (project.scale === 'Large') monthlyHours = 640;

                        // Apply Role Distribution Percentage
                        const typeDistribution = ROLE_DISTRIBUTION[project.type] || { 'All': 1.0 };
                        const ratio = selectedRole === 'All'
                            ? 1.0
                            : (typeDistribution[selectedRole] || 0);

                        const val = (monthlyHours * demandMultiplier) * ratio;
                        periodDemand += val;

                        // Calculate Cost (simplified for operational view: hours * avg rate)
                        // In a real scenario, we'd use the actual resource rates assigned to tasks
                        const avgRate = 100; // Baseline rate
                        const costVal = val * avgRate;
                        periodCost += costVal;

                        // Store per-project demand or cost for stacking
                        projectDemands[project.id] = chartFocus === 'Cost' ? costVal : val;
                        activeProjectIds.add(project.id);
                    }
                }
            });

            return {
                name: label,
                demand: periodDemand,
                cost: periodCost,
                capacity: maxCapacity,
                ...projectDemands
            };
        });

        return { data: chartData, maxCapacity, activeProjectIds: Array.from(activeProjectIds) };
    }, [projects, selectedProjectIds, resources, selectedTeam, selectedRole, timeView]);

    const { data: chartData, maxCapacity, activeProjectIds } = chartDataResult;

    // Premium chart colors matching the accent theme
    const CHART_COLORS = [
        '#A100FF', // Primary accent
        '#00D9FF', // Cyan
        '#10B981', // Emerald
        '#F59E0B', // Amber
        '#EC4899', // Pink
        '#6366F1', // Indigo
        '#14B8A6', // Teal
        '#8B5CF6'  // Violet
    ];

    // Style for dropdown options with issues
    const getOptionStyle = (hasIssue) => ({
        backgroundColor: hasIssue ? 'rgba(239, 68, 68, 0.1)' : undefined,
        color: hasIssue ? '#ef4444' : undefined,
    });

    // Custom glassmorphism tooltip
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(161, 0, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(161, 0, 255, 0.15)',
                }}>
                    <p style={{
                        color: '#A100FF',
                        fontWeight: 600,
                        marginBottom: '8px',
                        fontSize: '0.9rem',
                        letterSpacing: '0.02em'
                    }}>
                        {label}
                    </p>
                    {payload.map((entry, index) => (
                        <div
                            key={index}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '4px'
                            }}
                        >
                            <div style={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                backgroundColor: entry.color,
                                boxShadow: `0 0 8px ${entry.color}`
                            }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                                {entry.name}:
                            </span>
                            <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
                                {chartFocus === 'Cost' ? `£${Math.round(entry.value).toLocaleString()}` : `${Math.round(entry.value).toLocaleString()}h`}
                            </span>
                        </div>
                    ))}
                    <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>Total:</span>
                        <span style={{ color: '#fff', fontWeight: 600 }}>
                            {chartFocus === 'Cost' ? `£${payload.reduce((sum, entry) => sum + entry.value, 0).toLocaleString()}` : `${payload.reduce((sum, entry) => sum + entry.value, 0).toLocaleString()}h`}
                        </span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: isPanelCollapsed ? '56px 1fr' : '350px 1fr',
                gap: 'var(--spacing-lg)',
                transition: 'grid-template-columns 0.3s ease'
            }}>

                {/* Project Selection Panel */}
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
                                {selectedProjectIds.length} Selected
                            </span>
                        </div>
                    ) : (
                        /* Expanded State */
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                <h3 className="text-xl">Upcoming Projects</h3>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button
                                        className="btn btn-primary"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                        onClick={() => setIsAdding(true)}
                                    >
                                        <Plus size={16} style={{ marginRight: '4px' }} /> New
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

                            {isAdding && (
                                <NewProjectPane onClose={() => setIsAdding(false)} />
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {projects.map(project => {
                                    const isSelected = selectedProjectIds.includes(project.id);
                                    return (
                                        <div
                                            key={project.id}
                                            style={{
                                                padding: 'var(--spacing-md)',
                                                borderRadius: 'var(--radius-md)',
                                                border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}`,
                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-md)',
                                                transition: 'all var(--transition-fast)',
                                                position: 'relative'
                                            }}
                                        >
                                            <div
                                                onClick={() => toggleProjectSelection(project.id)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flex: 1, cursor: 'pointer' }}
                                            >
                                                {isSelected ?
                                                    <CheckCircle size={20} color="var(--accent-primary)" /> :
                                                    <Circle size={20} color="var(--text-muted)" />
                                                }
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{project.name}</div>
                                                    <div className="text-sm text-muted">
                                                        {project.startDate} - {project.endDate}
                                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', padding: '1px 4px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)' }}>
                                                            {project.scale || 'Medium'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
                                                className="btn-ghost"
                                                style={{ padding: '0.25rem', color: 'var(--text-muted)' }}
                                                title="Delete Project"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <h3 className="text-xl">Resource Forecast</h3>
                            <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--bg-tertiary)' }}>
                                <button
                                    onClick={() => setChartFocus('Demand')}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        borderRadius: '2px',
                                        backgroundColor: chartFocus === 'Demand' ? 'var(--bg-tertiary)' : 'transparent',
                                        color: chartFocus === 'Demand' ? 'var(--text-primary)' : 'var(--text-muted)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Demand
                                </button>
                                <button
                                    onClick={() => setChartFocus('Cost')}
                                    style={{
                                        padding: '4px 12px',
                                        fontSize: '0.75rem',
                                        borderRadius: '2px',
                                        backgroundColor: chartFocus === 'Cost' ? 'var(--bg-tertiary)' : 'transparent',
                                        color: chartFocus === 'Cost' ? 'var(--text-primary)' : 'var(--text-muted)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cost
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                            <select
                                value={timeView}
                                onChange={e => setTimeView(e.target.value)}
                                style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                <option value="Week">Weekly</option>
                                <option value="Month">Monthly</option>
                                <option value="Quarter">Quarterly</option>
                            </select>

                            {/* Team Filter with warning indicator */}
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedTeam}
                                    onChange={e => setSelectedTeam(e.target.value)}
                                    style={{
                                        padding: '0.5rem',
                                        paddingRight: teamIssueCount > 0 ? '2rem' : '0.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${capacityIssueMap[`team:${selectedTeam}`] ? '#ef4444' : 'var(--bg-tertiary)'}`,
                                        backgroundColor: capacityIssueMap[`team:${selectedTeam}`] ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {TEAMS.map(team => (
                                        <option
                                            key={team}
                                            value={team}
                                            style={capacityIssueMap[`team:${team}`] ? { color: '#ef4444' } : {}}
                                        >
                                            {capacityIssueMap[`team:${team}`] ? '⚠️ ' : ''}{team === 'All' ? 'All Teams' : team}
                                        </option>
                                    ))}
                                </select>
                                {teamIssueCount > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            fontSize: '0.65rem',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold'
                                        }}
                                        title={`${teamIssueCount} team(s) have capacity issues`}
                                    >
                                        {teamIssueCount}
                                    </span>
                                )}
                            </div>

                            {/* Role Filter with warning indicator */}
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    style={{
                                        padding: '0.5rem',
                                        paddingRight: roleIssueCount > 0 ? '2rem' : '0.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: `1px solid ${capacityIssueMap[`role:${selectedRole}`] ? '#ef4444' : 'var(--bg-tertiary)'}`,
                                        backgroundColor: capacityIssueMap[`role:${selectedRole}`] ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-secondary)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    {ROLES.map(role => (
                                        <option
                                            key={role}
                                            value={role}
                                            style={capacityIssueMap[`role:${role}`] ? { color: '#ef4444' } : {}}
                                        >
                                            {capacityIssueMap[`role:${role}`] ? '⚠️ ' : ''}{role === 'All' ? 'All Roles' : role}
                                        </option>
                                    ))}
                                </select>
                                {roleIssueCount > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '-8px',
                                            right: '-8px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            fontSize: '0.65rem',
                                            borderRadius: '50%',
                                            width: '18px',
                                            height: '18px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold'
                                        }}
                                        title={`${roleIssueCount} role(s) have capacity issues`}
                                    >
                                        {roleIssueCount}
                                    </span>
                                )}
                            </div>

                            <button
                                onClick={() => setShowDetailOverlay(true)}
                                className="btn btn-ghost"
                                style={{ border: '1px solid var(--bg-tertiary)' }}
                            >
                                View Details
                            </button>
                            <button
                                onClick={handleExportToExcel}
                                className="btn btn-ghost"
                                style={{
                                    border: '1px solid var(--bg-tertiary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                title="Export to Excel"
                            >
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    </div>

                    <div style={{ height: '400px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <defs>
                                    {CHART_COLORS.map((color, index) => (
                                        <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={color} stopOpacity={1} />
                                            <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(161, 0, 255, 0.1)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--text-secondary)"
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    tickLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    domain={[0, (dataMax) => {
                                        if (chartFocus === 'Cost') return dataMax * 1.1;
                                        return Math.max(dataMax, maxCapacity) * 1.1;
                                    }]}
                                    tickFormatter={(value) => chartFocus === 'Cost' ? `£${(value / 1000).toFixed(0)}k` : value.toLocaleString()}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    tickLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    label={{
                                        value: chartFocus === 'Cost' ? 'Cost' : 'Hours',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { textAnchor: 'middle', fill: 'var(--text-muted)' }
                                    }}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(161, 0, 255, 0.08)' }} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
                                />
                                {chartFocus === 'Demand' && (
                                    <ReferenceLine
                                        y={maxCapacity}
                                        stroke="#ef4444"
                                        strokeWidth={2}
                                        strokeDasharray="8 4"
                                        label={{
                                            value: `Max Capacity: ${maxCapacity.toLocaleString()}h`,
                                            position: 'right',
                                            fill: '#ef4444',
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}
                                    />
                                )}

                                {activeProjectIds.map((pid, index) => {
                                    const project = projects.find(p => p.id === pid);
                                    const isTopBar = index === activeProjectIds.length - 1;
                                    return (
                                        <Bar
                                            key={pid}
                                            dataKey={pid}
                                            name={project ? project.name : 'Unknown'}
                                            stackId="demand"
                                            fill={`url(#gradient-${index % CHART_COLORS.length})`}
                                            radius={isTopBar ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                                            animationDuration={800}
                                            animationEasing="ease-out"
                                        />
                                    );
                                })}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {(() => {
                        const hasOverload = chartData.some(d => d.demand > d.capacity);
                        return (
                            <div style={{
                                marginTop: 'var(--spacing-md)',
                                padding: 'var(--spacing-md)',
                                backgroundColor: hasOverload ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                borderRadius: 'var(--radius-md)',
                                border: hasOverload ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
                            }}>
                                <h4 style={{ color: hasOverload ? 'var(--danger)' : 'var(--success)', fontWeight: 600, marginBottom: '0.25rem' }}>
                                    {hasOverload ? 'Attention Needed' : 'Insight'}
                                </h4>
                                <p className="text-sm">
                                    {hasOverload
                                        ? "Warning: Demand exceeds capacity in some periods. Consider hiring or rescheduling."
                                        : "Great! You have sufficient capacity for the selected projects."}
                                </p>
                            </div>
                        );
                    })()}

                    {/* Capacity Issues List */}
                    {allCapacityIssues.length > 0 && (
                        <div style={{
                            marginTop: 'var(--spacing-md)',
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--bg-tertiary)'
                        }}>
                            <h4 style={{ fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ color: '#ef4444' }}>⚠️</span>
                                Capacity Issues Detected ({allCapacityIssues.length})
                            </h4>
                            <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                                Click on an issue to view it in the chart:
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {allCapacityIssues.map((issue, index) => {
                                    const isActive = selectedTeam === issue.team && selectedRole === issue.role;
                                    return (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setSelectedTeam(issue.team);
                                                setSelectedRole(issue.role);
                                            }}
                                            style={{
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: 'var(--radius-md)',
                                                border: isActive ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                                                backgroundColor: isActive ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                                                color: '#ef4444',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontSize: '0.8rem',
                                                transition: 'all 0.2s'
                                            }}
                                            title={`${issue.overloadPeriods} period(s) overloaded, up to +${issue.maxOverload}% over capacity`}
                                        >
                                            <span style={{ fontWeight: 500 }}>{issue.label}</span>
                                            <span style={{
                                                backgroundColor: 'rgba(239, 68, 68, 0.3)',
                                                padding: '0.1rem 0.4rem',
                                                borderRadius: '4px',
                                                fontSize: '0.7rem',
                                                fontWeight: 'bold'
                                            }}>
                                                +{issue.maxOverload}%
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {/* Detail Overlay */}
            {showDetailOverlay && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '600px', maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
                        <button
                            onClick={() => setShowDetailOverlay(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)', paddingRight: '2rem' }}>
                            <h3 className="text-xl">Capacity Analysis Details</h3>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <select
                                    value={selectedTeam}
                                    onChange={e => setSelectedTeam(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="All">All Teams</option>
                                    <option value="Website">Website</option>
                                    <option value="Configurator">Configurator</option>
                                    <option value="Asset Production">Asset Production</option>
                                </select>
                                <select
                                    value={selectedRole}
                                    onChange={e => setSelectedRole(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="All">All Roles</option>
                                    <option value="Developer">Developer</option>
                                    <option value="Designer">Designer</option>
                                    <option value="Manager">Manager</option>
                                    <option value="QA">QA</option>
                                    <option value="Product Owner">Product Owner</option>
                                </select>
                            </div>
                        </div>

                        {(() => {
                            const totalDemand = chartData.reduce((sum, d) => sum + d.demand, 0);
                            const totalCapacity = chartData.reduce((sum, d) => sum + d.capacity, 0);
                            const utilization = totalCapacity > 0 ? (totalDemand / totalCapacity) * 100 : 0;

                            return (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                            <div className="text-sm text-muted">Total Demand</div>
                                            <div className="text-2xl" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{Math.round(totalDemand)}h</div>
                                        </div>
                                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                            <div className="text-sm text-muted">Total Capacity</div>
                                            <div className="text-2xl" style={{ fontWeight: 600 }}>{Math.round(totalCapacity)}h</div>
                                        </div>
                                        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                            <div className="text-sm text-muted">Utilization</div>
                                            <div className="text-2xl" style={{ fontWeight: 600, color: utilization > 100 ? 'var(--danger)' : 'var(--success)' }}>{Math.round(utilization)}%</div>
                                        </div>
                                    </div>

                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)' }}>Period</th>
                                                <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Demand</th>
                                                <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Capacity</th>
                                                <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Utilization</th>
                                                <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)' }}>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {chartData.map((d, i) => (
                                                <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                    <td style={{ padding: '0.5rem' }}>{d.name}</td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{Math.round(d.demand)}h</td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>{Math.round(d.capacity)}h</td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right', color: (d.capacity > 0 && (d.demand / d.capacity) > 1) ? 'var(--danger)' : 'var(--success)' }}>
                                                        {d.capacity > 0 ? Math.round((d.demand / d.capacity) * 100) : 0}%
                                                    </td>
                                                    <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                                                        {d.demand > d.capacity ? (
                                                            <span style={{ color: 'var(--danger)' }}>Overload</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--success)' }}>OK</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default OperationalView;
