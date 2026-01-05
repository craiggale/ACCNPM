import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
    Activity, ArrowRight, Brain, Target, Clock, AlertCircle
} from 'lucide-react';

const KVITracking = () => {
    // Mock Data
    const portfolioMetrics = [
        { label: 'Avg Schedule Variance', value: '+8%', trend: 'up', status: 'warning' },
        { label: 'On-Time Delivery Rate', value: '78%', trend: 'stable', status: 'success' },
        { label: 'Avg Rework %', value: '12%', trend: 'down', status: 'success' },
        { label: 'Resource Utilization', value: '92%', trend: 'up', status: 'danger' },
    ];

    const trendData = [
        { month: 'Jan', rework: 15, delivery: 70 },
        { month: 'Feb', rework: 14, delivery: 72 },
        { month: 'Mar', rework: 12, delivery: 75 },
        { month: 'Apr', rework: 13, delivery: 74 },
        { month: 'May', rework: 11, delivery: 78 },
        { month: 'Jun', rework: 10, delivery: 82 },
    ];

    const projectRankings = {
        best: [
            { name: 'Project Alpha', score: 95, metric: 'On-Time' },
            { name: 'Project Beta', score: 92, metric: 'Quality' },
        ],
        atRisk: [
            { name: 'Project Omega', score: 45, metric: 'Schedule' },
            { name: 'Project Gamma', score: 58, metric: 'Budget' },
        ]
    };

    const comparisonData = [
        { subject: 'Schedule Adherence', A: 120, B: 110, fullMark: 150 },
        { subject: 'Budget Efficiency', A: 98, B: 130, fullMark: 150 },
        { subject: 'Quality Score', A: 86, B: 130, fullMark: 150 },
        { subject: 'Team Velocity', A: 99, B: 100, fullMark: 150 },
        { subject: 'Stakeholder Sat.', A: 85, B: 90, fullMark: 150 },
        { subject: 'Risk Mitigation', A: 65, B: 85, fullMark: 150 },
    ];

    const aiInsights = [
        {
            id: 1,
            type: 'warning',
            text: "'Market Build' tasks are consistently under-estimated by 20% across all projects.",
            project: 'All Projects'
        },
        {
            id: 2,
            type: 'success',
            text: "Project Falcon has improved delivery velocity by 15% since adopting the new QA process.",
            project: 'Project Falcon'
        },
        {
            id: 3,
            type: 'info',
            text: "Resource bottlenecks predicted in 'Backend Dev' for Q3 based on current trajectory.",
            project: 'Portfolio'
        },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

            {/* Header */}
            <div>
                <h1 className="text-2xl" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>KVI Tracking</h1>
                <p className="text-muted">Analyze efficiency and quality of delivery across the portfolio.</p>
            </div>

            {/* Portfolio Metrics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                {portfolioMetrics.map((metric, index) => (
                    <div key={index} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span className="text-sm text-muted">{metric.label}</span>
                            {metric.status === 'success' ? <CheckCircle size={16} color="var(--success)" /> :
                                metric.status === 'warning' ? <AlertTriangle size={16} color="var(--warning)" /> :
                                    <AlertCircle size={16} color="var(--danger)" />}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                            <span className="text-2xl">{metric.value}</span>
                            <span className="text-sm" style={{
                                color: metric.trend === 'up' ? (metric.status === 'danger' ? 'var(--danger)' : 'var(--success)') :
                                    metric.trend === 'down' ? (metric.status === 'success' ? 'var(--success)' : 'var(--danger)') : 'var(--text-muted)'
                            }}>
                                {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '→'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)' }}>

                {/* Left Column: Trends & Comparison */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                    {/* Trend Chart */}
                    <div className="card">
                        <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)' }}>Portfolio Performance Trends</h3>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" />
                                    <XAxis dataKey="month" stroke="var(--text-secondary)" />
                                    <YAxis stroke="var(--text-secondary)" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="delivery" name="On-Time Delivery %" stroke="var(--accent-primary)" strokeWidth={2} />
                                    <Line type="monotone" dataKey="rework" name="Rework %" stroke="var(--warning)" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Comparison Tool */}
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <h3 className="text-xl">Project Comparison</h3>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" style={{ fontSize: '0.875rem' }}>Project Falcon vs Phoenix</button>
                            </div>
                        </div>
                        <div style={{ height: '300px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={comparisonData}>
                                    <PolarGrid stroke="var(--bg-tertiary)" />
                                    <PolarAngleAxis dataKey="subject" stroke="var(--text-secondary)" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 150]} stroke="var(--bg-tertiary)" />
                                    <Radar name="Project Falcon" dataKey="A" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.3} />
                                    <Radar name="Project Phoenix" dataKey="B" stroke="var(--success)" fill="var(--success)" fillOpacity={0.3} />
                                    <Legend />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>

                {/* Right Column: Rankings & AI Insights */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>

                    {/* Rankings */}
                    <div className="card">
                        <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-md)' }}>Performance Highlights</h3>

                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <h4 className="text-sm text-muted" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <TrendingUp size={16} color="var(--success)" /> Best in Class
                            </h4>
                            {projectRankings.best.map((project, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '0.5rem',
                                    display: 'flex', justifyContent: 'space-between'
                                }}>
                                    <span>{project.name}</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 600 }}>{project.score}% {project.metric}</span>
                                </div>
                            ))}
                        </div>

                        <div>
                            <h4 className="text-sm text-muted" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} color="var(--danger)" /> Most At-Risk
                            </h4>
                            {projectRankings.atRisk.map((project, i) => (
                                <div key={i} style={{
                                    padding: '0.75rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-md)',
                                    marginBottom: '0.5rem',
                                    display: 'flex', justifyContent: 'space-between'
                                }}>
                                    <span>{project.name}</span>
                                    <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{project.score}% {project.metric}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                            <Brain size={20} color="var(--accent-primary)" />
                            <h3 className="text-xl">AI Insights</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {aiInsights.map((insight) => (
                                <div key={insight.id} style={{
                                    padding: '1rem',
                                    borderLeft: `3px solid ${insight.type === 'warning' ? 'var(--warning)' : insight.type === 'success' ? 'var(--success)' : 'var(--info)'}`,
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: '0 var(--radius-md) var(--radius-md) 0'
                                }}>
                                    <p className="text-sm" style={{ marginBottom: '0.5rem' }}>{insight.text}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{insight.project}</span>
                                        <button className="btn btn-ghost" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                                            Action <ArrowRight size={12} style={{ marginLeft: '4px' }} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default KVITracking;
