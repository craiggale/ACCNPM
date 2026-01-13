import React from 'react';
import { ArrowRight, Plus, Zap, CheckCircle } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const ScenarioTabs = ({
    solutions,
    activeSolutionId,
    onSelectSolution,
    onApplySolution,
    chartData
}) => {
    // Also include a "Current" tab
    const tabs = [
        { id: 'current', label: 'Current Scenario', type: 'CURRENT', description: 'Baseline forecast with current conflicts.' },
        ...solutions
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {tabs.map(tab => {
                    const isActive = activeSolutionId === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => !tab.disabled && onSelectSolution(tab.id)}
                            disabled={tab.disabled}
                            style={{
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                                borderBottom: isActive ? '2px solid var(--accent-primary)' : '2px solid transparent',
                                backgroundColor: isActive ? 'var(--bg-secondary)' : 'transparent',
                                color: isActive ? 'var(--text-primary)' : tab.disabled ? 'var(--text-muted)' : 'var(--text-muted)',
                                minWidth: '150px',
                                textAlign: 'left',
                                position: 'relative',
                                top: '2px', // Overlap border
                                opacity: tab.disabled ? 0.5 : 1,
                                cursor: tab.disabled ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {tab.type === 'TIME' && <ArrowRight size={14} />}
                                {tab.type === 'CAPACITY' && <Plus size={14} />}
                                {tab.type === 'PRIORITY' && <Zap size={14} />}
                                {tab.type === 'CURRENT' && <Zap size={14} className="text-danger" />}
                                {tab.label}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Active Tab Content Area */}
            <div className="card" style={{ borderTopLeftRadius: 0, marginTop: 0 }}>
                {tabs.map(tab => {
                    if (tab.id !== activeSolutionId) return null;
                    return (
                        <div key={tab.id}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <h4 className="text-lg" style={{ marginBottom: '0.5rem' }}>{tab.label}</h4>
                                    <p className="text-muted">{tab.description}</p>
                                </div>
                                {/* Standard Apply Button for Non-Priority/Non-list options */}
                                {tab.type !== 'CURRENT' && (!tab.candidates || tab.candidates.length === 0) && (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => onApplySolution(tab)}
                                        style={{ backgroundColor: 'var(--success)', whiteSpace: 'nowrap' }}
                                    >
                                        <CheckCircle size={16} style={{ marginRight: '6px' }} />
                                        Apply This Scenario
                                    </button>
                                )}
                            </div>

                            {/* PRIORITY CANDIDATE LIST */}
                            {tab.type === 'PRIORITY' && tab.candidates && tab.candidates.length > 0 ? (
                                <div style={{ marginTop: '1rem' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Project</th>
                                                <th style={{ textAlign: 'left', padding: '8px' }}>Current Scale</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>Impact ({tab.role || 'Role'})</th>
                                                <th style={{ textAlign: 'right', padding: '8px' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tab.candidates.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                    <td style={{ padding: '8px', fontWeight: 500 }}><span style={{ color: 'var(--accent-primary)' }}>{p.code}</span> {p.name}</td>
                                                    <td style={{ padding: '8px' }}>
                                                        <span style={{
                                                            padding: '2px 6px', borderRadius: '4px',
                                                            backgroundColor: 'var(--bg-tertiary)', fontSize: '0.75rem'
                                                        }}>
                                                            {p.scale}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'right', color: 'var(--danger)' }}>
                                                        -{p.roleImpact}h
                                                    </td>
                                                    <td style={{ padding: '8px', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                                        {/* Resize Option */}
                                                        {p.scale !== 'Small' && (
                                                            <button
                                                                className="btn btn-ghost"
                                                                style={{ border: '1px solid var(--bg-tertiary)', fontSize: '0.75rem', padding: '4px 8px' }}
                                                                onClick={() => onApplySolution({
                                                                    id: `resize-${p.id}-${Date.now()}`,
                                                                    type: 'PRIORITY',
                                                                    label: 'Resize Project',
                                                                    description: `Reduced scale of "${p.name}" to Small.`,
                                                                    action: {
                                                                        type: 'UPDATE_PROJECT',
                                                                        projectId: p.id,
                                                                        changes: { scale: 'Small' }
                                                                    }
                                                                })}
                                                            >
                                                                Set to Small
                                                            </button>
                                                        )}
                                                        {/* Pause Option */}
                                                        <button
                                                            className="btn btn-primary"
                                                            style={{ backgroundColor: 'var(--warning)', borderColor: 'var(--warning)', fontSize: '0.75rem', padding: '4px 8px' }}
                                                            onClick={() => onApplySolution({
                                                                id: `pause-${p.id}-${Date.now()}`,
                                                                type: 'PRIORITY',
                                                                label: 'Pause Project',
                                                                description: `Paused active project "${p.name}".`,
                                                                action: {
                                                                    type: 'PAUSE_PROJECT',
                                                                    projectId: p.id
                                                                }
                                                            })}
                                                        >
                                                            Pause
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* Standard Mini-Chart for non-list views */
                                chartData && (
                                    <div style={{ height: '100px', width: '100%', maxWidth: '500px', marginTop: '1rem' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={chartData}>
                                                <defs>
                                                    <linearGradient id="colorDemand" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bg-tertiary)" />
                                                <XAxis dataKey="name" hide />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', fontSize: '0.75rem' }}
                                                    itemStyle={{ padding: 0 }}
                                                    labelStyle={{ display: 'none' }}
                                                />
                                                <Area type="monotone" dataKey="projectedDemand" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorDemand)" strokeWidth={2} />
                                                <Area type="stepAfter" dataKey="projectedCapacity" stroke="var(--success)" fill="none" strokeWidth={2} strokeDasharray={tab.type === 'CAPACITY' ? '0' : '4 4'} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            <span>Start</span>
                                            <span>12 Months Forecast</span>
                                        </div>
                                    </div>
                                )
                            )}

                            {tab.type === 'CURRENT' && (
                                <div className="text-sm text-muted italic" style={{ marginTop: '1rem' }}>
                                    Select a solution tab to preview.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ScenarioTabs;
