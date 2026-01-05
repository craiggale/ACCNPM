import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AlertTriangle, CheckCircle2, Clock, Calendar, ArrowRight, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format, isAfter, isBefore, addDays } from 'date-fns';

const ProjectSummaryDashboard = ({ onFilterHealth }) => {
    const { projects, resources } = useApp();

    // --- Widget 1: Portfolio Health ---
    const healthCounts = projects.reduce((acc, project) => {
        const health = project.health || 'On Track';
        acc[health] = (acc[health] || 0) + 1;
        return acc;
    }, {});

    const healthData = [
        { name: 'On Track', value: healthCounts['On Track'] || 0, color: 'var(--success)' },
        { name: 'At Risk', value: healthCounts['At Risk'] || 0, color: 'var(--warning)' },
        { name: 'Late', value: healthCounts['Late'] || 0, color: 'var(--danger)' },
    ].filter(d => d.value > 0);

    // --- Widget 2: Upcoming Milestones ---
    const today = new Date();
    const next30Days = addDays(today, 30);

    const upcomingMilestones = projects.flatMap(project => {
        if (!project.launchDetails) return [];
        return project.launchDetails.flatMap(detail =>
            detail.inputGateways.map(gateway => ({
                projectId: project.id,
                projectName: project.name,
                gatewayName: gateway.name,
                date: gateway.expectedDate,
                market: detail.market
            }))
        );
    })
        .filter(m => {
            const date = new Date(m.date);
            return isAfter(date, today) && isBefore(date, next30Days);
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3);

    // --- Widget 3: Resource Hotspots (Mocked Logic) ---
    // In a real app, this would calculate demand vs capacity.
    // For now, we'll check if any resource role has > 2 projects in the same timeframe.
    const bottleneckCount = 3; // Hardcoded as per requirement "Our current forecast predicts 3 potential resource bottlenecks"
    const affectedRole = 'Config Authors';

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>

            {/* Widget 1: Portfolio Health */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    PROJECT STATUS
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ width: '120px', height: '120px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={healthData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={55}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {healthData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.color}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => onFilterHealth(entry.name)}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div style={{ marginLeft: '1rem', flex: 1 }}>
                        {healthData.map(item => (
                            <div
                                key={item.name}
                                onClick={() => onFilterHealth(item.name)}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
                            >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color }}></div>
                                <span style={{ color: 'var(--text-muted)' }}>{item.name}</span>
                                <span style={{ marginLeft: 'auto', fontWeight: 500 }}>{Math.round((item.value / projects.length) * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Widget 2: Upcoming Milestones */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    UPCOMING MILESTONES <span className="text-sm text-muted font-normal">(Next 30 Days)</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                    {upcomingMilestones.length > 0 ? (
                        upcomingMilestones.map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                <Calendar size={16} color="var(--accent-primary)" style={{ marginTop: '0.25rem' }} />
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{m.projectName}: {m.gatewayName}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due: {format(new Date(m.date), 'MMM dd, yyyy')}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted text-sm">No upcoming milestones.</div>
                    )}
                </div>
            </div>

            {/* Widget 3: Resource Forecast */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', borderLeft: '4px solid var(--warning)' }}>
                <h3 className="text-lg font-semibold" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)' }}>
                    <AlertTriangle size={20} /> RESOURCE FORECAST
                </h3>
                <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', lineHeight: '1.5', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                        Our current forecast predicts <strong style={{ color: 'var(--text-primary)' }}>{bottleneckCount} potential resource bottlenecks</strong> in the next 6 months, primarily affecting '{affectedRole}'.
                    </p>
                    <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
                        View Full Capacity Plan <ArrowRight size={16} />
                    </a>
                </div>
            </div>

        </div>
    );
};

export default ProjectSummaryDashboard;
