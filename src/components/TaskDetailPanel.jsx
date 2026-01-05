import React, { useState } from 'react';
import { X, Calendar, User, Clock, CheckCircle2, AlertCircle, DoorOpen, ArrowRight, Rocket } from 'lucide-react';
import { useApp } from '../context/AppContext';

const TaskDetailPanel = ({ task, project, onClose, tasks }) => {
    const { initiatives, linkTaskToInitiative, updateTask } = useApp();
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [selectedInitiativeId, setSelectedInitiativeId] = useState('');
    const [newDuration, setNewDuration] = useState('');
    const [newValues, setNewValues] = useState({});

    if (!task) return null;

    const predecessor = task.predecessorId ? tasks.find(t => t.id === task.predecessorId) : null;
    const selectedInitiative = initiatives.find(i => i.id === parseInt(selectedInitiativeId));

    const handleLink = () => {
        if (!selectedInitiative) return;

        let valuesArray = [];

        if (selectedInitiative.valueMetrics) {
            // Handle multiple metrics
            valuesArray = Object.entries(newValues).map(([metric, value]) => ({
                metric,
                value: parseFloat(value) || 0
            }));
        } else {
            // Legacy single metric handling
            let valueRealized = 0;
            const isTimeBased = selectedInitiative.valueMetric.includes('Time Saved') || selectedInitiative.valueMetric.includes('Hour Reduction');

            if (isTimeBased) {
                if (!newDuration) return;
                const originalDuration = parseInt(task.estimate);
                const newDurationInt = parseInt(newDuration);
                valueRealized = originalDuration - newDurationInt;

                // Update Task Duration only for time-based initiatives
                updateTask(task.id, {
                    estimate: newDurationInt,
                    linkedInitiativeId: selectedInitiative.id,
                    valueSaved: valueRealized
                });
            } else {
                // For non-time based, use the direct value input
                if (!newDuration) return;
                valueRealized = parseFloat(newDuration);
            }
            // For legacy, we might want to convert to array format if the backend supports it, 
            // but linkTaskToInitiative might still expect a single value if we didn't fully migrate it?
            // Wait, I updated linkTaskToInitiative to expect an array 'values'.
            // So I should wrap this single value in an array if possible, or update linkTaskToInitiative to handle both?
            // I updated linkTaskToInitiative to take 'values' which is an array.
            // But I also updated ProjectDashboard to send an array.
            // So here I should construct an array even for legacy single metric if I can derive the metric name.

            const metricName = selectedInitiative.valueMetric;
            valuesArray = [{ metric: metricName, value: valueRealized }];
        }

        // 1. Link to Initiative
        linkTaskToInitiative(task.id, selectedInitiative.id, valuesArray);

        setShowLinkModal(false);
        onClose();
    };

    const isTimeBasedMetric = selectedInitiative?.valueMetric.includes('Time Saved') || selectedInitiative?.valueMetric.includes('Hour Reduction');
    const unit = selectedInitiative?.valueMetric?.match(/\(([^)]+)\)/)?.[1] || 'Units';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '400px',
            backgroundColor: 'var(--bg-secondary)',
            borderLeft: '1px solid var(--bg-tertiary)',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--spacing-lg)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <h2 className="text-xl" style={{ marginBottom: '0.25rem' }}>{task.title}</h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{project.name}</div>
                </div>
                <button className="btn-ghost" onClick={onClose}><X size={24} /></button>
            </div>

            {/* Status Badge */}
            <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                <span className="badge" style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    padding: '0.25rem 0.75rem'
                }}>
                    {task.status}
                </span>
            </div>

            {/* Details Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-xl)' }}>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Start Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="var(--text-secondary)" />
                        <span>{task.startDate}</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>End Date</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={16} color="var(--text-secondary)" />
                        <span>{task.endDate}</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Assignee</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <User size={16} color="var(--text-secondary)" />
                        <span>Unassigned</span>
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Duration</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="var(--text-secondary)" />
                        <span>{task.estimate}h</span>
                    </div>
                </div>
            </div>

            {/* Link to Initiative Button */}
            <button
                className="btn"
                style={{
                    backgroundColor: 'rgba(161, 0, 255, 0.1)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-primary)',
                    marginBottom: 'var(--spacing-xl)',
                    width: '100%'
                }}
                onClick={() => setShowLinkModal(true)}
            >
                <Rocket size={18} style={{ marginRight: '0.5rem' }} /> Link to Initiative
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid var(--bg-tertiary)', marginBottom: 'var(--spacing-xl)' }} />

            {/* Smart Info Section */}
            <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>Task Dependencies</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>

                {/* Predecessor */}
                <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-primary)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600 }}>Waiting On (Predecessor)</div>
                    {predecessor ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ArrowRight size={16} color="var(--text-muted)" />
                            <span>{predecessor.title}</span>
                        </div>
                    ) : (
                        <div className="text-muted text-sm">No internal dependencies.</div>
                    )}
                </div>

                {/* Gateway */}
                {task.gatewayDependency && (
                    <div className="card" style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <DoorOpen size={14} /> Input Gateway Required
                        </div>
                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{task.gatewayDependency}</div>
                        <div className="text-sm text-muted">This task cannot start until the gateway is received.</div>
                    </div>
                )}
            </div>

            {/* Link Initiative Modal */}
            {showLinkModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100
                }}>
                    <div className="card" style={{ width: '500px', maxWidth: '90%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h2 className="text-xl">Link to Initiative</h2>
                            <button onClick={() => setShowLinkModal(false)}><X size={24} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="text-sm text-muted">Select Initiative</label>
                                <select
                                    className="input"
                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                    value={selectedInitiativeId}
                                    onChange={e => setSelectedInitiativeId(e.target.value)}
                                >
                                    <option value="">-- Select Initiative --</option>
                                    {initiatives.map(i => (
                                        <option key={i.id} value={i.id}>{i.name}</option>
                                    ))}
                                </select>
                            </div>

                            {selectedInitiative && (
                                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)' }}>
                                    <p className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>This initiative will:</p>
                                    <p className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{selectedInitiative.changeType}</p>
                                </div>
                            )}

                            <div style={{ borderTop: '1px solid var(--bg-tertiary)', paddingTop: '1rem' }}>
                                <h4 className="text-sm font-bold text-muted" style={{ marginBottom: '1rem', textTransform: 'uppercase' }}>Impact Analysis</h4>

                                {selectedInitiative?.valueMetrics?.map(metric => (
                                    <div key={metric} style={{ marginBottom: '1rem' }}>
                                        <label className="text-xs text-muted">Estimated Value Impact ({metric})</label>
                                        <input
                                            type="number"
                                            className="input"
                                            style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                            value={newValues[metric] || ''}
                                            onChange={e => setNewValues({ ...newValues, [metric]: e.target.value })}
                                            placeholder={`e.g. 1000`}
                                        />
                                    </div>
                                ))}

                                {/* Fallback for legacy single metric */}
                                {!selectedInitiative?.valueMetrics && (
                                    isTimeBasedMetric ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label className="text-xs text-muted">Original Duration</label>
                                                <div className="text-lg">{task.estimate} hours</div>
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted">New Predicted Duration</label>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                                    value={newDuration}
                                                    onChange={e => setNewDuration(e.target.value)}
                                                    placeholder="e.g. 1"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label className="text-xs text-muted">Estimated Value Impact ({unit})</label>
                                            <input
                                                type="number"
                                                className="input"
                                                style={{ width: '100%', padding: '0.5rem', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--bg-tertiary)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)' }}
                                                value={newDuration}
                                                onChange={e => setNewDuration(e.target.value)}
                                                placeholder={`e.g. 1000`}
                                            />
                                        </div>
                                    )
                                )}

                                {(Object.keys(newValues).length > 0 || newDuration) && (
                                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <CheckCircle2 size={16} color="var(--success)" />
                                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                                            Values Ready to Link
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" onClick={() => setShowLinkModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleLink} disabled={!selectedInitiative || (!newDuration && Object.keys(newValues).length === 0)}>
                                    Apply & Update Plan
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default TaskDetailPanel;
