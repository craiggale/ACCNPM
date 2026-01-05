import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Rocket, Calendar, CheckCircle2, Clock, X, ChevronDown, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';

const formatDateSafe = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return isValid(date) ? format(date, 'MMM d, yyyy') : '-';
};

const GatewayItem = ({ gateway, projectId, market }) => {
    const { updateGateway } = useApp();
    const [isEditing, setIsEditing] = useState(false);
    const [updateForm, setUpdateForm] = useState({ status: 'Received', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

    const handleUpdate = (e) => {
        e.preventDefault();
        updateGateway(projectId, market, gateway.name, updateForm);
        setIsEditing(false);
    };

    return (
        <div style={{
            padding: '1rem',
            backgroundColor: 'var(--bg-primary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--bg-tertiary)',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {gateway.status === 'Received' ? (
                        <CheckCircle2 size={20} color="var(--success)" />
                    ) : (
                        <Clock size={20} color="var(--text-muted)" />
                    )}
                    <div>
                        <div style={{ fontWeight: 500 }}>{gateway.name}</div>
                        <div className="text-sm text-muted">
                            {gateway.status === 'Received'
                                ? `Received: ${formatDateSafe(gateway.receivedDate)}`
                                : `Expected: ${formatDateSafe(gateway.expectedDate)}`
                            }
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '0.875rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '1rem',
                        backgroundColor: gateway.status === 'Received' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                        color: gateway.status === 'Received' ? 'var(--success)' : 'var(--text-muted)'
                    }}>
                        {gateway.status}
                    </span>
                    <button className="btn btn-ghost" onClick={() => setIsEditing(!isEditing)} style={{ fontSize: '0.875rem', padding: '0.25rem 0.5rem' }}>
                        {isEditing ? 'Cancel' : 'Update'}
                    </button>
                </div>
            </div>

            {/* Version History */}
            {gateway.versions && gateway.versions.length > 0 && (
                <div style={{ marginTop: '0.5rem', paddingLeft: '2.5rem', fontSize: '0.875rem' }}>
                    <div className="text-muted" style={{ marginBottom: '0.25rem' }}>History:</div>
                    {gateway.versions.map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                            <span style={{ width: '20px' }}>v{v.version}</span>
                            <span style={{ width: '100px' }}>{formatDateSafe(v.date)}</span>
                            <span style={{
                                color: v.isOnTime ? 'var(--success)' : 'var(--danger)',
                                width: '80px'
                            }}>
                                {v.isOnTime ? 'On Time' : 'Late'}
                            </span>
                            <span className="text-muted">{v.notes}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Update Form */}
            {isEditing && (
                <form onSubmit={handleUpdate} style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>New Status</label>
                            <select
                                value={updateForm.status}
                                onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            >
                                <option value="Received">Received</option>
                                <option value="Late">Late</option>
                                <option value="Pending">Pending</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Date</label>
                            <input
                                type="date"
                                value={updateForm.date}
                                onChange={e => setUpdateForm({ ...updateForm, date: e.target.value })}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                            />
                        </div>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Notes</label>
                        <input
                            type="text"
                            placeholder="Reason for update..."
                            value={updateForm.notes}
                            onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" style={{ padding: '0.25rem 1rem' }}>Save Update</button>
                    </div>
                </form>
            )}
        </div>
    );
};

const LaunchStatus = () => {
    const { projects } = useApp();
    const [selectedLaunchId, setSelectedLaunchId] = useState(null);
    const [expandedProjects, setExpandedProjects] = useState({});

    const selectedLaunch = useMemo(() => {
        if (!selectedLaunchId) return null;
        const project = projects.find(p => p.id === selectedLaunchId.projectId);
        if (!project) return null;
        const detail = project.launchDetails.find(d => d.market === selectedLaunchId.market);
        if (!detail) return null;
        return { ...detail, projectId: project.id, projectName: project.name };
    }, [projects, selectedLaunchId]);

    // Flatten projects into launch rows
    const launchRows = projects.flatMap(project =>
        (project.launchDetails || []).map(detail => ({
            ...detail,
            projectId: project.id,
            projectName: project.name,
            projectStatus: project.status
        }))
    );

    const toggleProject = (projectId) => {
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    const getStatusColor = (gateways) => {
        const total = gateways.length;
        if (total === 0) return 'var(--text-muted)';
        const received = gateways.filter(g => g.status === 'Received').length;
        if (received === total) return 'var(--success)';
        if (received > 0) return 'var(--warning)';
        return 'var(--text-muted)';
    };

    const getStatusText = (gateways) => {
        const total = gateways.length;
        if (total === 0) return 'No Gateways';
        const received = gateways.filter(g => g.status === 'Received').length;
        if (received === total) return 'Ready to Launch';
        return `${received}/${total} Gateways`;
    };

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 className="text-2xl" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Rocket size={24} color="var(--accent-primary)" /> Launch Status
                </h2>
                <p className="text-muted">Track project go-live dates and input gateways by market.</p>
            </header>

            <div className="card">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--bg-tertiary)', textAlign: 'left' }}>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Project</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Team</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Scale</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Global Launch</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Markets</th>
                            <th style={{ padding: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {projects.map((project) => (
                            <React.Fragment key={project.id}>
                                {/* Project Row */}
                                <tr
                                    onClick={() => toggleProject(project.id)}
                                    style={{
                                        borderBottom: expandedProjects[project.id] ? 'none' : '1px solid var(--bg-tertiary)',
                                        cursor: 'pointer',
                                        transition: 'background-color var(--transition-fast)',
                                        backgroundColor: expandedProjects[project.id] ? 'var(--bg-tertiary)' : 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                    onMouseLeave={(e) => !expandedProjects[project.id] && (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <td style={{ padding: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {expandedProjects[project.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        {project.name}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{project.type}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{project.scale}</td>
                                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                                        {(() => {
                                            const globalLaunch = (project.launchDetails || []).find(d => d.market === 'Global');
                                            return globalLaunch ? formatDateSafe(globalLaunch.goalLive) : '-';
                                        })()}
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '1rem',
                                            backgroundColor: 'var(--bg-primary)',
                                            fontSize: '0.875rem',
                                            border: '1px solid var(--bg-tertiary)'
                                        }}>
                                            {(project.launchDetails || []).filter(d => d.market !== 'Global').length} Markets
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            color: project.status === 'Active' ? 'var(--success)' : 'var(--text-muted)',
                                            fontWeight: 500
                                        }}>
                                            {project.status}
                                        </span>
                                    </td>
                                </tr>

                                {/* Expanded Market Details */}
                                {expandedProjects[project.id] && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '0', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '1rem' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                                    <thead>
                                                        <tr style={{ textAlign: 'left', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                                            <th style={{ padding: '0.5rem 1rem' }}>Market</th>
                                                            <th style={{ padding: '0.5rem 1rem' }}>Goal Live</th>
                                                            <th style={{ padding: '0.5rem 1rem' }}>Gateways</th>
                                                            <th style={{ padding: '0.5rem 1rem' }}>Readiness</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {(!project.launchDetails || project.launchDetails.length === 0) && (
                                                            <tr>
                                                                <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                                    No markets defined for this project.
                                                                </td>
                                                            </tr>
                                                        )}
                                                        {(project.launchDetails || [])
                                                            .sort((a, b) => {
                                                                if (a.market === 'Global') return -1;
                                                                if (b.market === 'Global') return 1;
                                                                return a.market.localeCompare(b.market);
                                                            })
                                                            .map((detail, index) => (
                                                                <tr
                                                                    key={`${project.id}-${detail.market}`}
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedLaunchId({ projectId: project.id, market: detail.market }); }}
                                                                    style={{
                                                                        cursor: 'pointer',
                                                                        borderBottom: index === (project.launchDetails || []).length - 1 ? 'none' : '1px solid var(--bg-tertiary)',
                                                                        backgroundColor: detail.market === 'Global' ? 'rgba(161, 0, 255, 0.05)' : 'transparent'
                                                                    }}
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = detail.market === 'Global' ? 'rgba(161, 0, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = detail.market === 'Global' ? 'rgba(161, 0, 255, 0.05)' : 'transparent'}
                                                                >
                                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                                        <span style={{ fontWeight: 500 }}>{detail.market}</span>
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>{formatDateSafe(detail.goalLive)}</td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <div style={{
                                                                                flex: 1,
                                                                                height: '6px',
                                                                                backgroundColor: 'var(--bg-tertiary)',
                                                                                borderRadius: '3px',
                                                                                overflow: 'hidden',
                                                                                maxWidth: '100px'
                                                                            }}>
                                                                                <div style={{
                                                                                    width: `${(detail.inputGateways.filter(g => g.status === 'Received').length / Math.max(detail.inputGateways.length, 1)) * 100}%`,
                                                                                    height: '100%',
                                                                                    backgroundColor: getStatusColor(detail.inputGateways)
                                                                                }}></div>
                                                                            </div>
                                                                            <span className="text-sm text-muted">{getStatusText(detail.inputGateways)}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.75rem 1rem' }}>
                                                                        <span style={{ color: getStatusColor(detail.inputGateways), fontWeight: 500, fontSize: '0.875rem' }}>
                                                                            {detail.inputGateways.every(g => g.status === 'Received') && detail.inputGateways.length > 0 ? 'Ready' : 'In Progress'}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Gateway Details Modal */}
            {selectedLaunch && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }} onClick={() => setSelectedLaunchId(null)}>
                    <div
                        className="card"
                        style={{ width: '600px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <div>
                                <h3 className="text-xl">{selectedLaunch.projectName} - {selectedLaunch.market}</h3>
                                <p className="text-muted">Goal Live: {formatDateSafe(selectedLaunch.goalLive)}</p>
                            </div>
                            <button onClick={() => setSelectedLaunchId(null)} className="btn-ghost" style={{ padding: '0.5rem' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <h4 className="text-lg" style={{ marginBottom: 'var(--spacing-md)' }}>Input Gateways</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {selectedLaunch.inputGateways.length === 0 && (
                                <p className="text-muted">No input gateways defined for this launch.</p>
                            )}
                            {selectedLaunch.inputGateways.map((gateway, index) => (
                                <GatewayItem
                                    key={index}
                                    gateway={gateway}
                                    projectId={selectedLaunch.projectId}
                                    market={selectedLaunch.market}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



export default LaunchStatus;
