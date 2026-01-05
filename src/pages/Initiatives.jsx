import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Rocket, Plus, Target, TrendingUp, Clock, CheckCircle, AlertTriangle, ArrowRight, X, Edit2, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import ValueDashboard from '../components/ValueDashboard';

const Initiatives = () => {
    const { initiatives, addInitiative } = useApp();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedInitiative, setSelectedInitiative] = useState(null);
    const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'list'

    // Create Modal State
    const [newInitiative, setNewInitiative] = useState({
        name: '',
        businessGoal: '',
        valueProposition: '',
        changeType: 'Automate Task',
        valueMetrics: []
    });

    const handleCreate = (e) => {
        e.preventDefault();
        addInitiative({
            ...newInitiative,
            status: 'Planning',
            valueRealized: 0,
            startDate: new Date().toISOString().split('T')[0] // Default start date to today
        });
        setShowCreateModal(false);
        setNewInitiative({
            name: '',
            businessGoal: '',
            valueProposition: '',
            changeType: 'Automate Task',
            valueMetrics: []
        });
    };

    if (selectedInitiative) {
        return (
            <InitiativeDashboard
                initiative={selectedInitiative}
                onBack={() => {
                    setSelectedInitiative(null);
                    // If we came from dashboard (default), we go back to dashboard.
                    // If we were in list mode, we stay in list mode?
                    // For simplicity, if we were in list mode, we go back to list.
                    // If we were in dashboard mode (clicked chart), we go back to dashboard.
                    // viewMode state is preserved.
                }}
            />
        );
    }

    if (viewMode === 'dashboard') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => setViewMode('list')}>
                        View All Initiatives
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Create New Initiative
                    </button>
                </div>
                <ValueDashboard onViewInitiative={(init) => setSelectedInitiative(init)} />

                {showCreateModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                    }}>
                        <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 className="text-xl">Create New Initiative</h2>
                                <button onClick={() => setShowCreateModal(false)}><X size={24} /></button>
                            </div>
                            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div>
                                    <label className="text-sm text-muted">Initiative Name</label>
                                    <input
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                        value={newInitiative.name}
                                        onChange={e => setNewInitiative({ ...newInitiative, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Business Goal</label>
                                    <textarea
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                        value={newInitiative.businessGoal}
                                        onChange={e => setNewInitiative({ ...newInitiative, businessGoal: e.target.value })}
                                        placeholder="e.g., Reduce manual data entry by 50%"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Value Proposition</label>
                                    <textarea
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                        value={newInitiative.valueProposition}
                                        onChange={e => setNewInitiative({ ...newInitiative, valueProposition: e.target.value })}
                                        placeholder="How will this deliver value?"
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label className="text-sm text-muted">Change Type</label>
                                        <select
                                            style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                            value={newInitiative.changeType}
                                            onChange={e => setNewInitiative({ ...newInitiative, changeType: e.target.value })}
                                        >
                                            <option>Automate Task</option>
                                            <option>Process Improvement</option>
                                            <option>Technology Upgrade</option>
                                        </select>
                                    </div>
                                    <div>
                                        <div>
                                            <label className="text-sm text-muted">Value Metrics (Select all that apply)</label>
                                            <div style={{
                                                maxHeight: '200px',
                                                overflowY: 'auto',
                                                border: '1px solid var(--bg-tertiary)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '0.5rem',
                                                backgroundColor: 'var(--bg-primary)'
                                            }}>
                                                {[
                                                    {
                                                        category: 'Efficiency Gains', metrics: [
                                                            'Efficiency Gains - FTE Hour Reduction (Hrs)',
                                                            'Efficiency Gains - FTE Fee Reduction (£)',
                                                            'Efficiency Gains - Lead Time Reduction (Days)',
                                                            'Efficiency Gains - License Cost Reduction (£)',
                                                            'Efficiency Gains - Asset Cost Reduction (£)',
                                                            'Efficiency Gains - Cost Per Click Reduction (£)'
                                                        ]
                                                    },
                                                    {
                                                        category: 'Growth Impact', metrics: [
                                                            'Growth Impact - Conversion Increase (%)',
                                                            'Growth Impact - Basket Size Increase (£)',
                                                            'Growth Impact - Sales Revenue (£)',
                                                            'Growth Impact - Enquiry Rate Increase (%)'
                                                        ]
                                                    },
                                                    {
                                                        category: 'Brand & Experience', metrics: [
                                                            'Brand & Experience - Engagement Rate (%)',
                                                            'Brand & Experience - Traffic Increase (%)',
                                                            'Brand & Experience - Bounce Rate (%)',
                                                            'Brand & Experience - NPS Score (%)'
                                                        ]
                                                    }
                                                ].map(group => (
                                                    <div key={group.category} style={{ marginBottom: '0.5rem' }}>
                                                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{group.category}</div>
                                                        {group.metrics.map(metric => (
                                                            <label key={metric} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={newInitiative.valueMetrics.includes(metric)}
                                                                    onChange={e => {
                                                                        if (e.target.checked) {
                                                                            setNewInitiative({ ...newInitiative, valueMetrics: [...newInitiative.valueMetrics, metric] });
                                                                        } else {
                                                                            setNewInitiative({ ...newInitiative, valueMetrics: newInitiative.valueMetrics.filter(m => m !== metric) });
                                                                        }
                                                                    }}
                                                                />
                                                                {metric.split(' - ')[1]}
                                                            </label>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Create Initiative</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-2xl" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Rocket color="var(--accent-primary)" /> Initiatives Hub
                    </h1>
                    <p className="text-muted">Manage strategic initiatives and track their real-world value.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-ghost" onClick={() => setViewMode('dashboard')}>
                        Back to Dashboard
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} style={{ marginRight: '0.5rem' }} /> Create New Initiative
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                {initiatives.map(initiative => {
                    // Calculate totals per metric
                    const cardTotalValues = {};
                    const metrics = initiative.valueMetrics || (initiative.valueMetric ? [initiative.valueMetric] : []);

                    metrics.forEach(metric => {
                        cardTotalValues[metric] = initiative.impactedTasks?.reduce((sum, t) => {
                            let val = 0;
                            if (t.valuesAdded) {
                                val = t.valuesAdded.find(v => v.metric === metric)?.value || 0;
                            } else if (t.valueAdded && initiative.valueMetric === metric) {
                                val = parseFloat(t.valueAdded) || 0;
                            }
                            return sum + val;
                        }, 0) || 0;
                    });

                    return (
                        <div
                            key={initiative.id}
                            className="card"
                            style={{
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                                borderLeft: `4px solid ${initiative.status === 'On Track' ? 'var(--success)' : initiative.status === 'At Risk' ? 'var(--danger)' : 'var(--warning)'}`
                            }}
                            onClick={() => setSelectedInitiative(initiative)}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <h3 className="text-xl">{initiative.name}</h3>
                                <span className="badge" style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-tertiary)',
                                    color: initiative.status === 'On Track' ? 'var(--success)' : initiative.status === 'At Risk' ? 'var(--danger)' : 'var(--warning)'
                                }}>
                                    {initiative.status}
                                </span>
                            </div>

                            <p className="text-sm text-muted" style={{ marginBottom: '1rem', height: '40px', overflow: 'hidden' }}>
                                {initiative.businessGoal}
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'auto' }}>
                                {Object.entries(cardTotalValues).length > 0 ? (
                                    Object.entries(cardTotalValues).map(([metric, value]) => (
                                        <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <TrendingUp size={16} color="var(--accent-primary)" />
                                            <span className="text-sm font-bold" style={{ color: 'var(--accent-primary)' }}>
                                                {value} {metric.match(/\(([^)]+)\)/)?.[1] || 'Units'}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <TrendingUp size={16} color="var(--text-muted)" />
                                        <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                                            0 Units Realized
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showCreateModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 className="text-xl">Create New Initiative</h2>
                            <button onClick={() => setShowCreateModal(false)}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="text-sm text-muted">Initiative Name</label>
                                <input
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={newInitiative.name}
                                    onChange={e => setNewInitiative({ ...newInitiative, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Business Goal</label>
                                <textarea
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={newInitiative.businessGoal}
                                    onChange={e => setNewInitiative({ ...newInitiative, businessGoal: e.target.value })}
                                    placeholder="e.g., Reduce manual data entry by 50%"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Value Proposition</label>
                                <textarea
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={newInitiative.valueProposition}
                                    onChange={e => setNewInitiative({ ...newInitiative, valueProposition: e.target.value })}
                                    placeholder="How will this deliver value?"
                                    required
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="text-sm text-muted">Change Type</label>
                                    <select
                                        style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                        value={newInitiative.changeType}
                                        onChange={e => setNewInitiative({ ...newInitiative, changeType: e.target.value })}
                                    >
                                        <option>Automate Task</option>
                                        <option>Process Improvement</option>
                                        <option>Technology Upgrade</option>
                                    </select>
                                </div>
                                <div>
                                    <div>
                                        <label className="text-sm text-muted">Value Metrics (Select all that apply)</label>
                                        <div style={{
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            border: '1px solid var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-sm)',
                                            padding: '0.5rem',
                                            backgroundColor: 'var(--bg-primary)'
                                        }}>
                                            {[
                                                {
                                                    category: 'Efficiency Gains', metrics: [
                                                        'Efficiency Gains - FTE Hour Reduction (Hrs)',
                                                        'Efficiency Gains - FTE Fee Reduction (£)',
                                                        'Efficiency Gains - Lead Time Reduction (Days)',
                                                        'Efficiency Gains - License Cost Reduction (£)',
                                                        'Efficiency Gains - Asset Cost Reduction (£)',
                                                        'Efficiency Gains - Cost Per Click Reduction (£)'
                                                    ]
                                                },
                                                {
                                                    category: 'Growth Impact', metrics: [
                                                        'Growth Impact - Conversion Increase (%)',
                                                        'Growth Impact - Basket Size Increase (£)',
                                                        'Growth Impact - Sales Revenue (£)',
                                                        'Growth Impact - Enquiry Rate Increase (%)'
                                                    ]
                                                },
                                                {
                                                    category: 'Brand & Experience', metrics: [
                                                        'Brand & Experience - Engagement Rate (%)',
                                                        'Brand & Experience - Traffic Increase (%)',
                                                        'Brand & Experience - Bounce Rate (%)',
                                                        'Brand & Experience - NPS Score (%)'
                                                    ]
                                                }
                                            ].map(group => (
                                                <div key={group.category} style={{ marginBottom: '0.5rem' }}>
                                                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{group.category}</div>
                                                    {group.metrics.map(metric => (
                                                        <label key={metric} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={newInitiative.valueMetrics.includes(metric)}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setNewInitiative({ ...newInitiative, valueMetrics: [...newInitiative.valueMetrics, metric] });
                                                                    } else {
                                                                        setNewInitiative({ ...newInitiative, valueMetrics: newInitiative.valueMetrics.filter(m => m !== metric) });
                                                                    }
                                                                }}
                                                            />
                                                            {metric.split(' - ')[1]}
                                                        </label>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create Initiative</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const InitiativeDashboard = ({ initiative, onBack }) => {
    const { projects, tasks, unlinkTaskFromInitiative, linkTaskToInitiative } = useApp();
    const [editingTask, setEditingTask] = useState(null);
    const [editValues, setEditValues] = useState({}); // { metric: value }

    // Link Task State
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedTaskId, setSelectedTaskId] = useState('');
    const [linkValues, setLinkValues] = useState({}); // { metric: value }

    // Calculate totals per metric
    const totalValues = {};
    initiative.valueMetrics?.forEach(metric => {
        totalValues[metric] = initiative.impactedTasks?.reduce((sum, t) => {
            const val = t.valuesAdded?.find(v => v.metric === metric)?.value || 0;
            return sum + val;
        }, 0) || 0;
    });

    const getUnit = (metric) => metric?.match(/\(([^)]+)\)/)?.[1] || 'Units';

    const getProjectName = (id) => {
        const project = projects.find(p => p.id === parseInt(id));
        return project ? project.name : `Project ID: ${id}`;
    };

    const handleUnlink = (taskId) => {
        if (window.confirm('Are you sure you want to unlink this task? The value realized will be removed.')) {
            unlinkTaskFromInitiative(initiative.id, taskId);
        }
    };

    const startEditing = (task) => {
        setEditingTask(task);
        const values = {};
        initiative.valueMetrics.forEach(m => {
            values[m] = task.valuesAdded?.find(v => v.metric === m)?.value || 0;
        });
        setEditValues(values);
    };

    const saveEdit = () => {
        if (editingTask) {
            const valuesArray = Object.entries(editValues).map(([m, v]) => ({ metric: m, value: parseFloat(v) || 0 }));
            linkTaskToInitiative(editingTask.taskId, initiative.id, valuesArray);
            setEditingTask(null);
        }
    };

    const handleLinkNewTask = () => {
        if (selectedTaskId) {
            const valuesArray = Object.entries(linkValues).map(([m, v]) => ({ metric: m, value: parseFloat(v) || 0 }));
            linkTaskToInitiative(parseInt(selectedTaskId), initiative.id, valuesArray);
            setShowLinkModal(false);
            // Reset form
            setSelectedProjectId('');
            setSelectedTaskId('');
            setLinkValues({});
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            <button onClick={onBack} className="btn btn-ghost" style={{ alignSelf: 'flex-start', paddingLeft: 0 }}>
                <ArrowRight size={16} style={{ transform: 'rotate(180deg)', marginRight: '0.5rem' }} /> Back to Initiatives
            </button>

            <div className="card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 className="text-2xl" style={{ marginBottom: '0.5rem' }}>Initiative Dashboard: {initiative.name}</h1>
                        <p className="text-xl text-muted" style={{ marginBottom: '1rem' }}>Business Goal: {initiative.businessGoal}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="text-sm text-muted">TOTAL VALUE REALIZED TO DATE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            {Object.entries(totalValues).map(([metric, value]) => (
                                <div key={metric} className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                                    {value} {getUnit(metric)} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({metric.split(' - ')[1]})</span>
                                </div>
                            ))}
                            {Object.keys(totalValues).length === 0 && <div className="text-2xl font-bold" style={{ color: 'var(--text-muted)' }}>0</div>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                    <h3 className="text-xl">Impacted Tasks & Projects</h3>
                    <button className="btn btn-primary" onClick={() => setShowLinkModal(true)} style={{ fontSize: '0.875rem', padding: '0.25rem 0.75rem' }}>
                        <Plus size={16} style={{ marginRight: '0.5rem' }} /> Link New Task
                    </button>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Project</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Task</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Date Linked</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Value Added</th>
                            <th style={{ padding: '1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initiative.impactedTasks && initiative.impactedTasks.length > 0 ? (
                            initiative.impactedTasks.map((task, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                                    <td style={{ padding: '1rem' }}>{getProjectName(task.projectId)}</td>
                                    <td style={{ padding: '1rem' }}>{task.taskTitle}</td>
                                    <td style={{ padding: '1rem' }}>{new Date(task.dateLinked).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', color: 'var(--success)', fontWeight: 600 }}>
                                        {task.valuesAdded?.map((v, i) => (
                                            <div key={i}>{v.value} {getUnit(v.metric)}</div>
                                        ))}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button className="btn-ghost" onClick={() => startEditing(task)} title="Edit Value">
                                                <Edit2 size={16} />
                                            </button>
                                            <button className="btn-ghost" onClick={() => handleUnlink(task.taskId)} title="Unlink Task" style={{ color: 'var(--danger)' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    No tasks linked yet. Go to a project and link tasks to this initiative to see value realized.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Edit Value Modal */}
            {editingTask && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '400px', maxWidth: '90%' }}>
                        <h3 className="text-lg" style={{ marginBottom: '1rem' }}>Edit Value Realized</h3>
                        <p className="text-sm text-muted" style={{ marginBottom: '1rem' }}>
                            Update the value contributed by <strong>{editingTask.taskTitle}</strong>.
                        </p>
                        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {initiative.valueMetrics?.map(metric => (
                                <div key={metric}>
                                    <label className="text-sm text-muted">{metric}</label>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                        value={editValues[metric] || ''}
                                        onChange={e => setEditValues({ ...editValues, [metric]: e.target.value })}
                                    />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" onClick={() => setEditingTask(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Link New Task Modal */}
            {showLinkModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 className="text-xl">Link New Task</h2>
                            <button onClick={() => setShowLinkModal(false)}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="text-sm text-muted">Select Project</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={selectedProjectId}
                                    onChange={e => {
                                        setSelectedProjectId(e.target.value);
                                        setSelectedTaskId(''); // Reset task selection
                                    }}
                                >
                                    <option value="">-- Select Project --</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-muted">Select Task</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={selectedTaskId}
                                    onChange={e => setSelectedTaskId(e.target.value)}
                                    disabled={!selectedProjectId}
                                >
                                    <option value="">-- Select Task --</option>
                                    {tasks
                                        .filter(t => t.projectId === parseInt(selectedProjectId) && !initiative.impactedTasks?.some(it => it.taskId === t.id))
                                        .map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <label className="text-sm text-muted" style={{ fontWeight: 'bold' }}>Value Realized</label>
                                {initiative.valueMetrics?.map(metric => (
                                    <div key={metric}>
                                        <label className="text-sm text-muted">{metric}</label>
                                        <input
                                            type="number"
                                            className="input"
                                            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                            value={linkValues[metric] || ''}
                                            onChange={e => setLinkValues({ ...linkValues, [metric]: e.target.value })}
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" onClick={() => setShowLinkModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleLinkNewTask} disabled={!selectedTaskId}>
                                    Link Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Initiatives;
