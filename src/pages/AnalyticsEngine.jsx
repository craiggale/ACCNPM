import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TrendingUp, AlertTriangle, Check, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const AnalyticsEngine = () => {
    const { tasks, resources } = useApp();
    const [appliedInsights, setAppliedInsights] = useState([]);

    // Analyze Historical Data
    const analysis = useMemo(() => {
        const completedTasks = tasks.filter(t => t.status === 'Completed' || t.actual > 0);

        if (completedTasks.length === 0) return null;

        let totalVariance = 0;
        let overEstimatedCount = 0;
        let underEstimatedCount = 0;

        const varianceByAssignee = {};

        completedTasks.forEach(task => {
            const variance = task.actual - task.estimate;
            totalVariance += variance;

            if (variance > 0) underEstimatedCount++; // Took longer than expected
            else if (variance < 0) overEstimatedCount++; // Took less time than expected

            if (!varianceByAssignee[task.assignee]) {
                varianceByAssignee[task.assignee] = { total: 0, count: 0 };
            }
            varianceByAssignee[task.assignee].total += variance;
            varianceByAssignee[task.assignee].count++;
        });

        const avgVariance = totalVariance / completedTasks.length;
        const variancePercentage = Math.round((totalVariance / completedTasks.reduce((acc, t) => acc + t.estimate, 0)) * 100);

        return {
            totalTasks: completedTasks.length,
            avgVariance,
            variancePercentage,
            underEstimatedCount,
            overEstimatedCount,
            varianceByAssignee
        };
    }, [tasks]);

    const chartData = useMemo(() => {
        if (!analysis) return [];
        return Object.keys(analysis.varianceByAssignee).map(assigneeId => {
            const resource = resources.find(r => r.id === parseInt(assigneeId));
            const data = analysis.varianceByAssignee[assigneeId];
            return {
                name: resource ? resource.name : 'Unknown',
                variance: Math.round(data.total / data.count)
            };
        });
    }, [analysis, resources]);

    const handleApplyInsight = (id) => {
        setAppliedInsights(prev => [...prev, id]);
        // In a real app, this would update the estimation logic in the backend
    };

    if (!analysis) {
        return (
            <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No historical data available for analysis yet.
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 className="text-2xl">Analytics Engine</h2>
                <p className="text-muted">Data-driven insights to improve future planning.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>

                {/* Key Metrics */}
                <div className="card">
                    <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)' }}>Performance Overview</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div className="text-sm text-muted">Estimation Accuracy</div>
                            <div className="text-2xl" style={{ color: analysis.variancePercentage > 0 ? 'var(--danger)' : 'var(--success)' }}>
                                {analysis.variancePercentage > 0 ? '+' : ''}{analysis.variancePercentage}%
                            </div>
                            <div className="text-sm text-muted">vs Original Plan</div>
                        </div>
                        <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div className="text-sm text-muted">Tasks Analyzed</div>
                            <div className="text-2xl">{analysis.totalTasks}</div>
                            <div className="text-sm text-muted">Completed Items</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--spacing-lg)', height: '200px' }}>
                        <h4 className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-sm)' }}>Avg. Variance by Team Member (Hours)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                <Tooltip
                                    cursor={{ fill: 'var(--bg-tertiary)' }}
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                />
                                <ReferenceLine y={0} stroke="var(--text-muted)" />
                                <Bar dataKey="variance" radius={[4, 4, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.variance > 0 ? 'var(--danger)' : 'var(--success)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Actionable Insights */}
                <div className="card">
                    <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={24} color="var(--accent-primary)" />
                        Detected Patterns
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {/* Insight 1 */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            border: '1px solid var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: appliedInsights.includes(1) ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                            transition: 'all var(--transition-normal)'
                        }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--warning)'
                                }}>
                                    <AlertTriangle size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Systematic Underestimation</h4>
                                    <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                                        "Development" tasks are consistently taking <strong>15% longer</strong> than estimated.
                                    </p>

                                    {appliedInsights.includes(1) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
                                            <Check size={16} />
                                            Applied to future plans
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
                                            onClick={() => handleApplyInsight(1)}
                                        >
                                            Auto-adjust future estimates <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Insight 2 */}
                        <div style={{
                            padding: 'var(--spacing-md)',
                            border: '1px solid var(--bg-tertiary)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: appliedInsights.includes(2) ? 'rgba(16, 185, 129, 0.05)' : 'transparent'
                        }}>
                            <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                                <div style={{
                                    width: '40px', height: '40px',
                                    borderRadius: '8px',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--success)'
                                }}>
                                    <TrendingUp size={20} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ fontWeight: 600, marginBottom: '0.25rem' }}>High Velocity</h4>
                                    <p className="text-sm text-muted" style={{ marginBottom: '0.75rem' }}>
                                        <strong>Alice Johnson</strong> is completing tasks <strong>10% faster</strong> than the team average.
                                    </p>

                                    {appliedInsights.includes(2) ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontSize: '0.875rem', fontWeight: 500 }}>
                                            <Check size={16} />
                                            Capacity factor updated
                                        </div>
                                    ) : (
                                        <button
                                            className="btn btn-primary"
                                            style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}
                                            onClick={() => handleApplyInsight(2)}
                                        >
                                            Update capacity factor <ArrowRight size={14} style={{ marginLeft: '4px' }} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsEngine;
