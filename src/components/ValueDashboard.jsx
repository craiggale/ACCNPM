import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Clock, Activity, Target, ArrowRight, Rocket, Calendar } from 'lucide-react';
import { differenceInDays, parseISO, startOfYear, isWithinInterval, endOfDay } from 'date-fns';

const ValueDashboard = ({ onViewInitiative }) => {
    const { initiatives, projects } = useApp();

    // State
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [dateRange, setDateRange] = useState('Total');

    // Date Filtering Logic
    const isDateInSelectedRange = (dateStr) => {
        if (!dateStr) return false;
        if (dateRange === 'Total') return true;

        const date = parseISO(dateStr);
        const now = new Date(); // Assuming current date is effectively "now" for YTD

        if (dateRange === 'YTD') {
            return isWithinInterval(date, { start: startOfYear(now), end: endOfDay(now) });
        }

        const match = dateRange.match(/(\d{4}) Q(\d)/);
        if (match) {
            const year = parseInt(match[1]);
            const q = parseInt(match[2]);
            const start = new Date(year, (q - 1) * 3, 1);
            const end = new Date(year, q * 3, 0, 23, 59, 59, 999); // Last day of the quarter
            return isWithinInterval(date, { start, end });
        }
        return true;
    };

    // --- Metrics Calculation ---

    // 1. Total Value Realized (Grouped by Metric Unit) - Filtered by Date
    const totalValueByMetric = useMemo(() => {
        const totals = {};
        initiatives.forEach(initiative => {
            initiative.impactedTasks?.forEach(task => {
                if (!isDateInSelectedRange(task.dateLinked)) return;

                const values = task.valuesAdded || (task.valueAdded ? [{ metric: initiative.valueMetric, value: task.valueAdded }] : []);
                values.forEach(v => {
                    const unit = v.metric?.match(/\(([^)]+)\)/)?.[1] || 'Units';
                    totals[unit] = (totals[unit] || 0) + (parseFloat(v.value) || 0);
                });
            });
        });
        return totals;
    }, [initiatives, dateRange]);

    // Available Units for Tabs
    const availableUnits = useMemo(() => Object.keys(totalValueByMetric).sort(), [totalValueByMetric]);

    // Effect to set default unit
    React.useEffect(() => {
        if ((!selectedUnit || !availableUnits.includes(selectedUnit)) && availableUnits.length > 0) {
            // Prefer 'Hrs' or 'Hours', otherwise first available
            const defaultUnit = availableUnits.find(u => u === 'Hrs' || u === 'Hours') || availableUnits[0];
            setSelectedUnit(defaultUnit);
        }
    }, [availableUnits, selectedUnit]);

    // Primary Metric for Display (Use selectedUnit)
    const primaryMetricUnit = selectedUnit || 'Units';
    const primaryMetricValue = totalValueByMetric[primaryMetricUnit] || 0;

    // 2. Active Initiatives (Not filtered by date range, as it represents current state)
    const activeInitiativesCount = initiatives.filter(i => i.status === 'On Track' || i.status === 'At Risk' || i.status === 'Planning').length;
    const onTrackCount = initiatives.filter(i => i.status === 'On Track').length;
    const atRiskCount = initiatives.filter(i => i.status === 'At Risk').length;

    // 3. Avg. Time to Value (Not filtered by date range, as it's a historical property)
    const avgTimeToValue = useMemo(() => {
        let totalDays = 0;
        let count = 0;

        initiatives.forEach(initiative => {
            if (initiative.impactedTasks && initiative.impactedTasks.length > 0 && initiative.startDate) {
                // Find earliest linked task date
                const earliestDate = initiative.impactedTasks.reduce((min, task) => {
                    return task.dateLinked < min ? task.dateLinked : min;
                }, initiative.impactedTasks[0].dateLinked);

                const days = differenceInDays(parseISO(earliestDate), parseISO(initiative.startDate));
                if (days >= 0) {
                    totalDays += days;
                    count++;
                }
            }
        });

        return count > 0 ? Math.round(totalDays / count) : 0;
    }, [initiatives]);


    // --- Charts Data ---

    // Bar Chart: Value Realized by Initiative (Filtered by selectedUnit AND dateRange)
    const barChartData = useMemo(() => {
        return initiatives.map(initiative => {
            let value = 0;
            initiative.impactedTasks?.forEach(task => {
                if (!isDateInSelectedRange(task.dateLinked)) return;

                const values = task.valuesAdded || (task.valueAdded ? [{ metric: initiative.valueMetric, value: task.valueAdded }] : []);
                // Only sum up values that match the selected unit
                values.forEach(v => {
                    const unit = v.metric?.match(/\(([^)]+)\)/)?.[1] || 'Units';
                    if (unit === primaryMetricUnit) {
                        value += (parseFloat(v.value) || 0);
                    }
                });
            });
            return {
                name: initiative.name,
                value: value,
                id: initiative.id
            };
        }).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
    }, [initiatives, primaryMetricUnit, dateRange]);

    // Doughnut Chart: Value by Business Area (Filtered by selectedUnit AND dateRange)
    const doughnutData = useMemo(() => {
        const totals = {};
        initiatives.forEach(initiative => {
            initiative.impactedTasks?.forEach(task => {
                if (!isDateInSelectedRange(task.dateLinked)) return;

                const project = projects.find(p => p.id === task.projectId);
                const area = project?.type || 'Other'; // Using Project Type as Business Area

                const values = task.valuesAdded || (task.valueAdded ? [{ metric: initiative.valueMetric, value: task.valueAdded }] : []);
                // Aggregating by selected unit
                values.forEach(v => {
                    const unit = v.metric?.match(/\(([^)]+)\)/)?.[1] || 'Units';
                    if (unit === primaryMetricUnit) {
                        totals[area] = (totals[area] || 0) + (parseFloat(v.value) || 0);
                    }
                });
            });
        });

        return Object.entries(totals).map(([name, value]) => ({ name, value }));
    }, [initiatives, projects, primaryMetricUnit, dateRange]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    // Activity Feed (Filtered by dateRange)
    const activityFeed = useMemo(() => {
        const feed = [];
        initiatives.forEach(initiative => {
            initiative.impactedTasks?.forEach(task => {
                if (!isDateInSelectedRange(task.dateLinked)) return;

                feed.push({
                    initiativeName: initiative.name,
                    taskTitle: task.taskTitle,
                    projectName: projects.find(p => p.id === task.projectId)?.name || 'Unknown Project',
                    date: task.dateLinked,
                    values: task.valuesAdded || (task.valueAdded ? [{ metric: initiative.valueMetric, value: task.valueAdded }] : [])
                });
            });
        });
        return feed.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    }, [initiatives, projects, dateRange]);

    const dateFilterOptions = ['Total', 'YTD', '2025 Q1', '2025 Q2', '2025 Q3', '2025 Q4'];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

            {/* Header */}
            <div>
                <h1 className="text-2xl" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <Rocket color="var(--accent-primary)" /> Value Dashboard
                </h1>
                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>Real-time insights into the value delivered by strategic initiatives.</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Date Range Filters */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <Calendar size={16} />
                            <span>Date Range:</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {dateFilterOptions.map(option => (
                                <button
                                    key={option}
                                    onClick={() => setDateRange(option)}
                                    style={{
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: '1rem',
                                        border: dateRange === option ? '1px solid var(--accent-primary)' : '1px solid var(--bg-tertiary)',
                                        backgroundColor: dateRange === option ? 'rgba(124, 58, 237, 0.1)' : 'transparent',
                                        color: dateRange === option ? 'var(--accent-primary)' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.75rem',
                                        fontWeight: dateRange === option ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Metric Unit Tabs */}
                    {availableUnits.length > 0 && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {availableUnits.map(unit => (
                                <button
                                    key={unit}
                                    onClick={() => setSelectedUnit(unit)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--bg-tertiary)',
                                        backgroundColor: selectedUnit === unit ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                                        color: selectedUnit === unit ? '#fff' : 'var(--text-muted)',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: selectedUnit === unit ? 600 : 400,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {unit}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)' }}>
                {/* Total Value */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--accent-primary)' }}>
                    <div className="text-sm text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Total Value Realized</div>
                    <div className="text-3xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {primaryMetricValue.toLocaleString()} {primaryMetricUnit}
                    </div>
                    <div className="text-xs text-muted">
                        Across {Object.keys(totalValueByMetric).length} metric categories ({dateRange})
                    </div>
                </div>

                {/* Active Initiatives */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--success)' }}>
                    <div className="text-sm text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Active Initiatives</div>
                    <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {activeInitiativesCount}
                    </div>
                    <div className="text-xs text-muted">
                        <span style={{ color: 'var(--success)' }}>{onTrackCount} On Track</span>, <span style={{ color: 'var(--warning)' }}>{atRiskCount} At Risk</span>
                    </div>
                </div>

                {/* Avg Time to Value */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '4px solid var(--info)' }}>
                    <div className="text-sm text-muted" style={{ textTransform: 'uppercase', fontWeight: 600 }}>Avg. Time to Value</div>
                    <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {avgTimeToValue} Days
                    </div>
                    <div className="text-xs text-muted">
                        From initiative start to first impact
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>

                {/* Bar Chart */}
                <div className="card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Value Realized by Initiative ({primaryMetricUnit})</h3>
                    <div style={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barChartData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-tertiary)" />
                                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} tick={{ fontSize: 12 }} />
                                <YAxis stroke="var(--text-muted)" style={{ fontSize: '0.75rem' }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    cursor={{ fill: 'var(--bg-tertiary)', opacity: 0.4 }}
                                />
                                <Bar dataKey="value" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} onClick={(data) => onViewInitiative(initiatives.find(i => i.id === data.id))} style={{ cursor: 'pointer' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Doughnut Chart */}
                <div className="card" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
                    <h3 className="text-lg font-semibold" style={{ marginBottom: '1.5rem' }}>Contribution by Area</h3>
                    <div style={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={doughnutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {doughnutData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="card">
                <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={20} /> Recent Value-Adding Activities
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {activityFeed.length > 0 ? (
                        activityFeed.map((item, index) => (
                            <div key={index} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: index < activityFeed.length - 1 ? '1px solid var(--bg-tertiary)' : 'none' }}>
                                <div style={{ minWidth: '100px', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.25rem' }}>
                                    {new Date(item.date).toLocaleDateString()}
                                </div>
                                <div>
                                    <div style={{ marginBottom: '0.25rem' }}>
                                        The <strong>{item.initiativeName}</strong> initiative contributed value to task <strong>"{item.taskTitle}"</strong> in project <strong>"{item.projectName}"</strong>.
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {item.values.map((v, i) => (
                                            <span key={i} className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontSize: '0.75rem' }}>
                                                +{v.value} {v.metric.match(/\(([^)]+)\)/)?.[1] || 'Units'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted text-sm">No recent activity in this period.</div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default ValueDashboard;
