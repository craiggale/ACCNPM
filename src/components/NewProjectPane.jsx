import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus } from 'lucide-react';
import { subWeeks, format } from 'date-fns';

const NewProjectPane = ({ onClose, onAdd, planningMode = 'Standard' }) => {
    const { addProject, teams, markets } = useApp();
    const [newProject, setNewProject] = useState({
        name: '',
        startDate: '',
        endDate: '',
        type: 'Website',
        scale: 'Medium',
        markets: [],
        totalEffort: 960 // Default for Medium
    });

    const handleAddProject = (e) => {
        e.preventDefault();

        // Resource First Logic
        if (planningMode === 'ResourceFirst') {
            const projectData = {
                ...newProject,
                isResourceDriven: true,
                startDate: newProject.startDate || format(new Date(), 'yyyy-MM-dd'), // Default to today/selected
                endDate: '', // Will be calculated
                status: 'Draft'
            };
            if (onAdd) onAdd(projectData);
            else addProject(projectData); // Should unlikely happen in live, but fallback
            onClose();
            return;
        }

        // Standard Logic
        if (newProject.name && newProject.endDate) {
            const end = new Date(newProject.endDate);
            const start = subWeeks(end, 20); // Simple 20 week default logic
            const calculatedStartDate = format(start, 'yyyy-MM-dd');

            const projectData = { ...newProject, startDate: calculatedStartDate };

            if (onAdd) onAdd(projectData);
            else addProject(projectData);

            setNewProject({ name: '', startDate: '', endDate: '', type: 'Website', scale: 'Medium', markets: [] });
            onClose();
        }
    };

    return (
        <form onSubmit={handleAddProject} style={{ marginBottom: 'var(--spacing-md)', padding: 'var(--spacing-md)', backgroundColor: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-tertiary)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                <input
                    type="text"
                    placeholder="Project Name"
                    value={newProject.name}
                    onChange={e => setNewProject({ ...newProject, name: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    required
                />
                {planningMode === 'Standard' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label className="text-sm text-muted">Go Live Date</label>
                        <input
                            type="date"
                            value={newProject.endDate}
                            onChange={e => setNewProject({ ...newProject, endDate: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            required
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <label className="text-sm text-muted">Start Date (Earliest)</label>
                        <input
                            type="date"
                            value={newProject.startDate}
                            onChange={e => setNewProject({ ...newProject, startDate: e.target.value })}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            required
                        />
                        <div className="text-xs text-muted">End date will be calculated based on capacity.</div>
                    </div>
                )}

                {/* Team / Type Selection */}
                <select
                    value={newProject.type}
                    onChange={e => setNewProject({ ...newProject, type: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                >
                    {teams.map(team => (
                        <option key={team} value={team}>{team} Team</option>
                    ))}
                </select>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {['Small', 'Medium', 'Large'].map(scale => {
                        const effortLabel = planningMode === 'ResourceFirst'
                            ? (scale === 'Small' ? '480h' : scale === 'Medium' ? '960h' : '1920h')
                            : scale;

                        return (
                            <button
                                key={scale}
                                type="button"
                                onClick={() => setNewProject({
                                    ...newProject,
                                    scale,
                                    totalEffort: scale === 'Small' ? 480 : scale === 'Medium' ? 960 : 1920
                                })}
                                style={{
                                    flex: 1,
                                    padding: '0.25rem',
                                    borderRadius: 'var(--radius-sm)',
                                    border: `1px solid ${newProject.scale === scale ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}`,
                                    backgroundColor: newProject.scale === scale ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: newProject.scale === scale ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 500
                                }}
                            >
                                {effortLabel}
                            </button>
                        );
                    })}
                </div>
                {planningMode === 'ResourceFirst' && <div className="text-xs text-muted" style={{ marginTop: '-8px', textAlign: 'right' }}>Total Effort</div>}

                {/* Market Selection */}
                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Markets</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', border: '1px solid var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)' }}>
                        {markets.map(market => (
                            <button
                                key={market}
                                type="button"
                                onClick={() => {
                                    const currentMarkets = newProject.markets || [];
                                    const newMarkets = currentMarkets.includes(market)
                                        ? currentMarkets.filter(m => m !== market)
                                        : [...currentMarkets, market];
                                    setNewProject({ ...newProject, markets: newMarkets });
                                }}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '1rem',
                                    fontSize: '0.75rem',
                                    border: `1px solid ${newProject.markets?.includes(market) ? 'var(--accent-primary)' : 'var(--bg-tertiary)'}`,
                                    backgroundColor: newProject.markets?.includes(market) ? 'var(--accent-primary)' : 'transparent',
                                    color: newProject.markets?.includes(market) ? '#fff' : 'var(--text-secondary)',
                                    cursor: 'pointer'
                                }}
                            >
                                {market}
                            </button>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Add</button>
                    <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                </div>
            </div>
        </form>
    );
};

export default NewProjectPane;
