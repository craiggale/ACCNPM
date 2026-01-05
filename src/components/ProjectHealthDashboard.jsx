import React, { useState } from 'react';
import { differenceInDays, format, isAfter } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

const ProjectHealthDashboard = ({ project, tasks }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    if (!project) return null;

    // Calculate Variance
    const variance = project.originalEndDate ? differenceInDays(new Date(project.endDate), new Date(project.originalEndDate)) : 0;

    // Find Next Critical Task (Mock logic: first uncompleted task)
    // In a real app, this would use the critical path logic.
    const nextCriticalTask = tasks
        .filter(t => t.status !== 'Completed')
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];

    // Find Upcoming Gateway
    const upcomingGateway = project.launchDetails
        ?.flatMap(d => d.inputGateways || [])
        .filter(g => g.status === 'Pending' || g.status === 'Late')
        .sort((a, b) => new Date(a.expectedDate) - new Date(b.expectedDate))[0];

    // Mock AI Confidence
    const aiConfidence = 92;

    return (
        <div className="card" style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', borderLeft: '4px solid var(--accent-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Activity size={20} color="var(--accent-primary)" />
                <h3 className="text-lg font-semibold">PROJECT HEALTH DASHBOARD</h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)' }}>

                {/* Status & Variance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Status & Variance</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="badge" style={{
                            backgroundColor: project.health === 'Late' ? 'rgba(239, 68, 68, 0.1)' : project.health === 'At Risk' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                            color: project.health === 'Late' ? 'var(--danger)' : project.health === 'At Risk' ? 'var(--warning)' : 'var(--success)',
                            border: `1px solid ${project.health === 'Late' ? 'rgba(239, 68, 68, 0.2)' : project.health === 'At Risk' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                        }}>
                            {project.health || 'On Track'}
                        </span>
                        {variance > 0 && (
                            <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: '0.875rem' }}>
                                +{variance} days
                            </span>
                        )}
                    </div>
                </div>

                {/* Next Critical Task */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Next Critical Task</div>
                    {nextCriticalTask ? (
                        <div>
                            <div style={{ fontWeight: 500 }}>{nextCriticalTask.title}</div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Starts: {format(new Date(nextCriticalTask.startDate), 'MMM dd')}</div>
                        </div>
                    ) : (
                        <div className="text-muted text-sm">All tasks completed</div>
                    )}
                </div>

                {/* Upcoming Gateway */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Upcoming Gateway</div>
                    {upcomingGateway ? (
                        <div>
                            <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {upcomingGateway.name}
                                {upcomingGateway.status === 'Late' && <AlertCircle size={14} color="var(--danger)" />}
                            </div>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Due: {format(new Date(upcomingGateway.expectedDate), 'MMM dd')}</div>
                        </div>
                    ) : (
                        <div className="text-muted text-sm">No pending gateways</div>
                    )}
                </div>

                {/* AI Confidence */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>AI Forecast Confidence</div>
                    <div style={{ position: 'relative', display: 'inline-block', width: 'fit-content' }}>
                        <div
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'help' }}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <ShieldCheck size={20} color="var(--success)" />
                            <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>High - {aiConfidence}%</span>
                        </div>
                        {showTooltip && (
                            <div
                                style={{
                                    position: 'absolute',
                                    bottom: '100%',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    marginBottom: '8px',
                                    padding: '12px',
                                    backgroundColor: 'var(--bg-primary)',
                                    border: '1px solid var(--bg-tertiary)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                                    width: '320px',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.5',
                                    color: 'var(--text-secondary)',
                                    zIndex: 1000,
                                    whiteSpace: 'normal'
                                }}
                            >
                                <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: '8px' }}>[PLACEHOLDER - To Be Implemented]</div>
                                <div style={{ marginBottom: '8px' }}>Future implementation will calculate confidence based on:</div>
                                <div style={{ paddingLeft: '12px' }}>
                                    <div style={{ marginBottom: '4px' }}>• <strong>Input Stability</strong>: Frequency of late external dependencies</div>
                                    <div style={{ marginBottom: '4px' }}>• <strong>Resource Performance</strong>: Historical accuracy of assigned team members</div>
                                    <div>• <strong>Schedule Volatility</strong>: Frequency of task date changes</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProjectHealthDashboard;
