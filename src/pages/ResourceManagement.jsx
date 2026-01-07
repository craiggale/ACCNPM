import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Users, Plus, Trash2, Save, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';

const ResourceManagement = () => {
    const { resources: allResources, addResource, updateResource, deleteResource, teams, tasks: allTasks, updateTask, autoAssignTasks } = useApp();
    const { currentUser, isDemoMode } = useAuth();

    // Tenant-aware filtering
    const resources = useMemo(() => {
        if (!isDemoMode || !currentUser) return allResources;
        return allResources.filter(r => r.org_id === currentUser.org_id);
    }, [allResources, currentUser, isDemoMode]);

    const tasks = useMemo(() => {
        if (!isDemoMode || !currentUser) return allTasks;
        // Filter tasks to only those belonging to org's projects would need project data
        // For now, just keep all tasks since they're filtered by resource
        return allTasks;
    }, [allTasks, currentUser, isDemoMode]);

    const isAdmin = currentUser?.role === 'Admin';

    const [isAdding, setIsAdding] = useState(false);
    const [newResource, setNewResource] = useState({ name: '', role: 'Developer', team: 'Website', capacity: 160 });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [gaps, setGaps] = useState([]);
    const [showGaps, setShowGaps] = useState(false);
    const [selectedResource, setSelectedResource] = useState(null);

    // Calculate Utilization
    const resourceUtilization = useMemo(() => {
        const usage = {};
        resources.forEach(r => usage[r.id] = 0);

        tasks.forEach(task => {
            if (task.assignee && usage[task.assignee] !== undefined && task.status !== 'Completed') {
                usage[task.assignee] += (parseInt(task.estimate) || 0);
            }
        });
        return usage;
    }, [resources, tasks]);

    const totalCapacity = useMemo(() => resources.reduce((sum, r) => sum + (parseInt(r.capacity) - (parseInt(r.leave) || 0)), 0), [resources]);
    const totalAssigned = useMemo(() => Object.values(resourceUtilization).reduce((sum, val) => sum + val, 0), [resourceUtilization]);

    const handleAutoAssign = () => {
        const foundGaps = autoAssignTasks();
        setGaps(foundGaps);
        setShowGaps(true);
    };

    const handleAdd = (e) => {
        e.preventDefault();
        addResource({ ...newResource, capacity: parseInt(newResource.capacity) });
        setNewResource({ name: '', role: 'Developer', team: 'Website', capacity: 160 });
        setIsAdding(false);
    };

    const startEdit = (e, resource) => {
        e.stopPropagation();
        setEditingId(resource.id);
        setEditForm({ ...resource });
    };

    const saveEdit = (e) => {
        e.stopPropagation();
        updateResource(editingId, {
            ...editForm,
            capacity: parseInt(editForm.capacity),
            leave: parseInt(editForm.leave) || 0
        });
        setEditingId(null);
    };

    const getUtilizationColor = (used, capacity) => {
        const ratio = used / capacity;
        if (ratio > 1) return 'var(--danger)';
        if (ratio > 0.8) return 'var(--warning)';
        return 'var(--success)';
    };

    const handleTaskUpdate = (taskId, updates) => {
        updateTask(taskId, updates);
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="text-2xl">Team & Capacity</h2>
                    <p className="text-muted">Manage your team members and optimize resource allocation.</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleAutoAssign}
                    style={{ background: 'linear-gradient(135deg, #A100FF 0%, #7100B3 100%)', border: 'none' }}
                >
                    <Sparkles size={16} style={{ marginRight: '8px' }} /> Auto-Assign Resources
                </button>
            </header>

            {showGaps && gaps.length > 0 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 className="text-lg" style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertCircle size={20} /> Resourcing Gaps Detected ({gaps.length})
                        </h3>
                        <button onClick={() => setShowGaps(false)} className="btn-ghost"><X size={20} /></button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {gaps.map((gap, index) => (
                            <div key={index} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)' }}>
                                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{gap.taskTitle}</div>
                                <div className="text-sm text-muted" style={{ marginBottom: '0.5rem' }}>{gap.projectName} • {gap.requiredTeam}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="text-sm" style={{ padding: '0.1rem 0.5rem', borderRadius: '1rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                                        {gap.reason}
                                    </span>
                                    <span className="text-sm text-muted">{gap.estimate}h</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showGaps && gaps.length === 0 && (
                <div className="card" style={{ marginBottom: 'var(--spacing-xl)', border: '1px solid var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="text-lg" style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <CheckCircle2 size={20} /> All tasks successfully assigned!
                        </h3>
                        <button onClick={() => setShowGaps(false)} className="btn-ghost"><X size={20} /></button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 'var(--spacing-xl)' }}>

                {/* Resource List */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                        <h3 className="text-xl">Team Members</h3>
                        <button className="btn btn-ghost" onClick={() => setIsAdding(true)} style={{ border: '1px solid var(--bg-tertiary)' }}>
                            <Plus size={16} style={{ marginRight: '4px' }} /> Add Member
                        </button>
                    </div>

                    {isAdding && (
                        <form onSubmit={handleAdd} style={{ marginBottom: 'var(--spacing-lg)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 'var(--spacing-sm)', alignItems: 'end' }}>
                                <div>
                                    <label className="text-sm text-muted">Name</label>
                                    <input
                                        type="text"
                                        value={newResource.name}
                                        onChange={e => setNewResource({ ...newResource, name: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Role</label>
                                    <select
                                        value={newResource.role}
                                        onChange={e => setNewResource({ ...newResource, role: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        required
                                    >
                                        <option value="Developer">Developer</option>
                                        <option value="Designer">Designer</option>
                                        <option value="Manager">Manager</option>
                                        <option value="QA">QA</option>
                                        <option value="Product Owner">Product Owner</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Team</label>
                                    <select
                                        value={newResource.team}
                                        onChange={e => setNewResource({ ...newResource, team: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        required
                                    >
                                        {teams.map(team => (
                                            <option key={team} value={team}>{team}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Capacity (Hrs)</label>
                                    <input
                                        type="number"
                                        value={newResource.capacity}
                                        onChange={e => setNewResource({ ...newResource, capacity: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}><Save size={16} /></button>
                                    <button type="button" className="btn btn-ghost" onClick={() => setIsAdding(false)} style={{ padding: '0.5rem' }}><X size={16} /></button>
                                </div>
                            </div>
                        </form>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr auto', padding: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                            <div>Name</div>
                            <div>Role</div>
                            <div>Team</div>
                            <div>Utilization</div>
                            <div></div>
                        </div>

                        {resources.map(resource => {
                            const used = resourceUtilization[resource.id] || 0;
                            const capacity = parseInt(resource.capacity);
                            const leave = parseInt(resource.leave) || 0;
                            const effectiveCapacity = capacity - leave;
                            const percent = Math.min((used / effectiveCapacity) * 100, 100);
                            const color = getUtilizationColor(used, effectiveCapacity);

                            return (
                                <div
                                    key={resource.id}
                                    onClick={() => setSelectedResource(resource)}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '2fr 1fr 1fr 2fr auto',
                                        padding: '0.75rem 0.5rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: 'var(--radius-md)',
                                        alignItems: 'center',
                                        borderBottom: '1px solid var(--bg-primary)',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                                >
                                    {editingId === resource.id ? (
                                        <>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                                onClick={e => e.stopPropagation()}
                                                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                            <select
                                                value={editForm.role}
                                                onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                                onClick={e => e.stopPropagation()}
                                                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            >
                                                <option value="Developer">Developer</option>
                                                <option value="Designer">Designer</option>
                                                <option value="Manager">Manager</option>
                                                <option value="QA">QA</option>
                                                <option value="Product Owner">Product Owner</option>
                                            </select>
                                            <select
                                                value={editForm.team}
                                                onChange={e => setEditForm({ ...editForm, team: e.target.value })}
                                                onClick={e => e.stopPropagation()}
                                                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            >
                                                {teams.map(team => (
                                                    <option key={team} value={team}>{team}</option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                value={editForm.capacity}
                                                onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                                                onClick={e => e.stopPropagation()}
                                                style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                                            />
                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button onClick={saveEdit} className="btn-ghost" style={{ color: 'var(--success)' }}><Save size={16} /></button>
                                                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="btn-ghost" style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontWeight: 500 }}>{resource.name}</div>
                                            <div className="text-sm text-muted">{resource.role}</div>
                                            <div className="text-sm text-muted">{resource.team || 'Website'}</div>

                                            {/* Utilization Bar */}
                                            <div style={{ paddingRight: '1rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        {used} / {effectiveCapacity}h
                                                        {leave > 0 && <span style={{ color: 'var(--warning)', marginLeft: '0.5rem' }}>(-{leave}h Leave)</span>}
                                                    </span>
                                                    <span style={{ color: color, fontWeight: 500 }}>{Math.round((used / effectiveCapacity) * 100)}%</span>
                                                </div>
                                                <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '3px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${percent}%`, height: '100%', backgroundColor: color, transition: 'width 0.5s ease' }}></div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                <button onClick={(e) => startEdit(e, resource)} className="btn-ghost" style={{ padding: '0.25rem' }}>Edit</button>
                                                <button onClick={(e) => { e.stopPropagation(); deleteResource(resource.id); }} className="btn-ghost" style={{ padding: '0.25rem', color: 'var(--text-muted)' }}><Trash2 size={16} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Summary Panel */}
                <div className="card" style={{ height: 'fit-content' }}>
                    <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)' }}>Capacity Summary</h3>

                    <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                        <div className="text-sm text-muted">Total Monthly Capacity</div>
                        <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--accent-primary)', lineHeight: 1 }}>
                            {totalCapacity}
                        </div>
                        <div className="text-sm text-muted">Hours</div>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span className="text-sm text-muted">Total Assigned</span>
                            <span className="text-sm" style={{ fontWeight: 500 }}>{totalAssigned}h</span>
                        </div>
                        <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min((totalAssigned / totalCapacity) * 100, 100)}%`, height: '100%', backgroundColor: 'var(--accent-primary)' }}></div>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {Math.round((totalAssigned / totalCapacity) * 100)}% Utilized
                        </div>
                    </div>

                    <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(161, 0, 255, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(161, 0, 255, 0.1)' }}>
                        <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={16} color="var(--accent-primary)" /> AI Optimization
                        </h4>
                        <p className="text-sm text-muted">
                            Use <strong>Auto-Assign</strong> to automatically match tasks to team members based on their role, team, and available capacity.
                        </p>
                    </div>
                </div>

            </div>

            {/* Resource Detail Modal */}
            {selectedResource && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedResource(null)}>
                    <div className="card" style={{ width: '800px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <div>
                                <h3 className="text-xl">{selectedResource.name}</h3>
                                <p className="text-muted">{selectedResource.role} • {selectedResource.team}</p>
                            </div>
                            <button onClick={() => setSelectedResource(null)} className="btn-ghost"><X size={24} /></button>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span className="text-sm text-muted">Utilization</span>
                                <span className="text-sm" style={{ fontWeight: 500 }}>
                                    {resourceUtilization[selectedResource.id] || 0} / {parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0)}h
                                </span>
                            </div>
                            <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${Math.min(((resourceUtilization[selectedResource.id] || 0) / (parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0))) * 100, 100)}%`,
                                    height: '100%',
                                    backgroundColor: getUtilizationColor(resourceUtilization[selectedResource.id] || 0, parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0))
                                }}></div>
                            </div>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-xl)', padding: '1rem', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
                            <h4 className="text-lg" style={{ marginBottom: '0.5rem' }}>Leave Management</h4>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ flex: 1 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Leave Hours (This Month)</label>
                                    <input
                                        type="number"
                                        value={selectedResource.leave || 0}
                                        onChange={(e) => {
                                            const newLeave = parseInt(e.target.value) || 0;
                                            updateResource(selectedResource.id, { leave: newLeave });
                                            setSelectedResource(prev => ({ ...prev, leave: newLeave }));
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div className="text-sm text-muted">Effective Capacity</div>
                                    <div className="text-xl" style={{ color: 'var(--text-primary)' }}>
                                        {parseInt(selectedResource.capacity) - (parseInt(selectedResource.leave) || 0)}h
                                    </div>
                                </div>
                            </div>
                        </div>

                        <h4 className="text-lg" style={{ marginBottom: 'var(--spacing-md)' }}>Assigned Tasks</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {tasks.filter(t => t.assignee === selectedResource.id).length === 0 && (
                                <p className="text-muted">No tasks assigned.</p>
                            )}
                            {tasks.filter(t => t.assignee === selectedResource.id).map(task => (
                                <div key={task.id} style={{
                                    padding: '1rem',
                                    backgroundColor: 'var(--bg-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--bg-tertiary)',
                                    display: 'grid',
                                    gridTemplateColumns: '2fr 1fr 1fr auto',
                                    gap: '1rem',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                                        {/* Find project name if possible, or just show ID for now */}
                                        <div className="text-sm text-muted">Project ID: {task.projectId}</div>
                                    </div>

                                    <select
                                        value={task.status}
                                        onChange={(e) => handleTaskUpdate(task.id, { status: e.target.value })}
                                        style={{ padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="Planning">Planning</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Delayed">Delayed</option>
                                    </select>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <input
                                            type="number"
                                            value={task.estimate}
                                            onChange={(e) => handleTaskUpdate(task.id, { estimate: parseInt(e.target.value) || 0 })}
                                            style={{ width: '60px', padding: '0.25rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                        />
                                        <span className="text-sm text-muted">hrs</span>
                                    </div>

                                    <button
                                        className="btn-ghost"
                                        style={{ color: 'var(--danger)' }}
                                        onClick={() => handleTaskUpdate(task.id, { assignee: null })}
                                        title="Unassign"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResourceManagement;
