import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
    Target, AlertCircle, Plus, Edit2, Trash2, X, Save, ArrowRight, Activity
} from 'lucide-react';

const ExecutiveDashboard = () => {
    const { projects, tasks, kpiDefinitions, portfolioKPIs, valueGaps, addKpiDefinition, updateKpiDefinition, deleteKpiDefinition } = useApp();
    const { currentUser } = useAuth();

    // Filter projects for current tenant
    const tenantProjects = useMemo(() => {
        if (!currentUser) return projects;
        return projects.filter(p => p.org_id === currentUser.org_id);
    }, [projects, currentUser]);

    // Get industry-specific KPIs for current tenant
    const tenantKPIs = useMemo(() => {
        if (!currentUser) return [];
        return kpiDefinitions.filter(kpi => kpi.org_id === currentUser.org_id);
    }, [kpiDefinitions, currentUser]);

    // Get current KPI values with definition data
    const kpiWithValues = useMemo(() => {
        return tenantKPIs.map(kpi => {
            const value = portfolioKPIs.find(v => v.definitionId === kpi.id);
            const trend = value && value.previous
                ? (value.actual > value.previous ? 'up' : value.actual < value.previous ? 'down' : 'stable')
                : 'stable';
            return {
                ...kpi,
                actual: value?.actual,
                previous: value?.previous,
                status: value?.status || 'unknown',
                trend
            };
        });
    }, [tenantKPIs, portfolioKPIs]);

    // Get Value Gaps for current tenant
    const tenantValueGaps = useMemo(() => {
        if (!currentUser) return [];
        return valueGaps.filter(gap => gap.org_id === currentUser.org_id);
    }, [valueGaps, currentUser]);

    // Group KPIs by category
    const kpisByCategory = useMemo(() => {
        return kpiWithValues.reduce((acc, kpi) => {
            if (!acc[kpi.category]) acc[kpi.category] = [];
            acc[kpi.category].push(kpi);
            return acc;
        }, {});
    }, [kpiWithValues]);

    // ============= KPI MANAGEMENT STATE & HANDLERS =============
    const [showKpiModal, setShowKpiModal] = useState(false);
    const [editingKpi, setEditingKpi] = useState(null);
    const [newKpi, setNewKpi] = useState({
        name: '', category: 'Commercial', unit: '%', direction: 'higher_better',
        target: '', warning: '', critical: '', trackingMethod: 'Manual'
    });

    const kpiCategories = ['Commercial', 'Experience', 'Operational'];
    const kpiUnits = ['%', 'count', 'score', 'days', 'minutes', '£', 'hours'];
    const trackingMethods = ['Manual', 'API Integration', 'Spreadsheet Import', 'Automated'];

    const handleOpenKpiModal = (kpi = null) => {
        if (kpi) {
            setEditingKpi(kpi);
            setNewKpi({
                name: kpi.name, category: kpi.category, unit: kpi.unit,
                direction: kpi.direction, target: kpi.target,
                warning: kpi.warning || '', critical: kpi.critical || '',
                trackingMethod: kpi.trackingMethod || 'Manual'
            });
        } else {
            setEditingKpi(null);
            setNewKpi({ name: '', category: 'Commercial', unit: '%', direction: 'higher_better', target: '', warning: '', critical: '', trackingMethod: 'Manual' });
        }
        setShowKpiModal(true);
    };

    const handleSaveKpi = () => {
        if (!newKpi.name || !newKpi.target) return;
        const kpiData = {
            ...newKpi,
            org_id: currentUser?.org_id,
            target: parseFloat(newKpi.target),
            warning: newKpi.warning ? parseFloat(newKpi.warning) : null,
            critical: newKpi.critical ? parseFloat(newKpi.critical) : null
        };
        if (editingKpi) {
            updateKpiDefinition(editingKpi.id, kpiData);
        } else {
            addKpiDefinition(kpiData);
        }
        setShowKpiModal(false);
        setEditingKpi(null);
    };

    const handleDeleteKpi = (id) => {
        if (window.confirm('Delete this KPI? Associated values will also be removed.')) {
            deleteKpiDefinition(id);
        }
    };

    // Format KPI value with unit
    const formatKPIValue = (kpi) => {
        if (kpi.actual === undefined) return '--';
        const val = kpi.unit === '%' ? kpi.actual.toFixed(1) : kpi.actual.toLocaleString();
        return kpi.unit === '£' ? `${kpi.unit}${val}` : `${val}${kpi.unit === 'count' ? '' : kpi.unit}`;
    };

    // Calculate summary stats
    const summaryStats = useMemo(() => {
        const onTrack = kpiWithValues.filter(k => k.status === 'on_track').length;
        const warning = kpiWithValues.filter(k => k.status === 'warning').length;
        const critical = kpiWithValues.filter(k => k.status === 'critical').length;
        return { onTrack, warning, critical, total: kpiWithValues.length };
    }, [kpiWithValues]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
            {/* Header */}
            <div>
                <h1 className="text-2xl" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Executive Dashboard</h1>
                <p className="text-muted">Business outcome metrics and strategic KPI performance for {currentUser?.tenantName || 'your portfolio'}.</p>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                <div className="card" style={{ borderLeft: '3px solid var(--success)' }}>
                    <div className="text-sm text-muted">On Track</div>
                    <div className="text-2xl" style={{ fontWeight: 600, color: 'var(--success)' }}>{summaryStats.onTrack}</div>
                    <div className="text-xs text-muted">of {summaryStats.total} KPIs</div>
                </div>
                <div className="card" style={{ borderLeft: '3px solid var(--warning)' }}>
                    <div className="text-sm text-muted">Needs Attention</div>
                    <div className="text-2xl" style={{ fontWeight: 600, color: 'var(--warning)' }}>{summaryStats.warning}</div>
                    <div className="text-xs text-muted">approaching threshold</div>
                </div>
                <div className="card" style={{ borderLeft: '3px solid var(--danger)' }}>
                    <div className="text-sm text-muted">Critical</div>
                    <div className="text-2xl" style={{ fontWeight: 600, color: 'var(--danger)' }}>{summaryStats.critical}</div>
                    <div className="text-xs text-muted">require action</div>
                </div>
                <div className="card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
                    <div className="text-sm text-muted">Value Gaps</div>
                    <div className="text-2xl" style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>{tenantValueGaps.length}</div>
                    <div className="text-xs text-muted">AI-detected issues</div>
                </div>
            </div>

            {/* Business KPIs Section */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                    <h2 className="text-lg" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Target size={20} color="var(--accent-primary)" /> Business KPIs
                    </h2>
                    <button
                        onClick={() => handleOpenKpiModal()}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
                    >
                        <Plus size={16} /> Add KPI
                    </button>
                </div>

                {Object.keys(kpisByCategory).length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        <Target size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                        <p>No KPIs defined yet. Add your first business outcome KPI to track.</p>
                    </div>
                ) : (
                    Object.entries(kpisByCategory).map(([category, kpis]) => (
                        <div key={category} style={{ marginBottom: 'var(--spacing-md)' }}>
                            <h3 className="text-sm text-muted" style={{ marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{category}</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: 'var(--spacing-sm)'
                            }}>
                                {kpis.map((kpi) => (
                                    <div key={kpi.id} className="card" style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0.5rem',
                                        borderLeft: `3px solid ${kpi.status === 'on_track' ? 'var(--success)' : kpi.status === 'warning' ? 'var(--warning)' : 'var(--danger)'}`,
                                        position: 'relative'
                                    }}>
                                        {/* Management icons */}
                                        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                onClick={() => handleOpenKpiModal(kpi)}
                                                className="btn-ghost"
                                                style={{ padding: '0.25rem', color: 'var(--text-muted)', opacity: 0.6 }}
                                                title="Edit KPI"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteKpi(kpi.id)}
                                                className="btn-ghost"
                                                style={{ padding: '0.25rem', color: 'var(--danger)', opacity: 0.6 }}
                                                title="Delete KPI"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '3rem' }}>
                                            <span className="text-sm" style={{ fontWeight: 500 }}>{kpi.name}</span>
                                            {kpi.status === 'on_track' ? <CheckCircle size={14} color="var(--success)" /> :
                                                kpi.status === 'warning' ? <AlertTriangle size={14} color="var(--warning)" /> :
                                                    <AlertCircle size={14} color="var(--danger)" />}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                                            <span className="text-xl">{formatKPIValue(kpi)}</span>
                                            <span className="text-xs text-muted">/ {kpi.unit === '£' ? `${kpi.unit}${kpi.target}` : `${kpi.target}${kpi.unit === 'count' ? '' : kpi.unit}`}</span>
                                            <span className="text-sm" style={{
                                                marginLeft: 'auto',
                                                color: kpi.direction === 'higher_better'
                                                    ? (kpi.trend === 'up' ? 'var(--success)' : kpi.trend === 'down' ? 'var(--danger)' : 'var(--text-muted)')
                                                    : (kpi.trend === 'down' ? 'var(--success)' : kpi.trend === 'up' ? 'var(--danger)' : 'var(--text-muted)')
                                            }}>
                                                {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted" style={{ marginTop: '0.25rem' }}>
                                            📊 {kpi.trackingMethod || 'Manual'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Value Gaps Section */}
            {tenantValueGaps.length > 0 && (
                <div className="card">
                    <h3 className="text-lg" style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={20} color="var(--warning)" /> Value Gaps Detected
                    </h3>
                    <p className="text-sm text-muted" style={{ marginBottom: 'var(--spacing-md)' }}>
                        AI has identified discrepancies between project delivery health and business outcome performance.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                        {tenantValueGaps.map(gap => (
                            <div key={gap.id} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                borderLeft: `3px solid ${gap.severity === 'critical' ? 'var(--danger)' : 'var(--warning)'}`
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{gap.title}</div>
                                        <div className="text-sm text-muted">{gap.description}</div>
                                        {gap.suggestedAction && (
                                            <div className="text-sm" style={{ marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--accent-primary)' }}>
                                                💡 {gap.suggestedAction}
                                            </div>
                                        )}
                                    </div>
                                    <span className={`text-xs ${gap.severity === 'critical' ? 'text-danger' : 'text-warning'}`} style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        backgroundColor: gap.severity === 'critical' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                                    }}>
                                        {gap.severity}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Links */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-md)' }}>
                <Link to="/kvi-tracking" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Activity size={24} color="var(--accent-primary)" />
                            <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>KVI Tracking</div>
                                <div className="text-sm text-muted">Delivery metrics & project health</div>
                            </div>
                        </div>
                        <ArrowRight size={20} color="var(--text-muted)" />
                    </div>
                </Link>
                <Link to="/initiatives" style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <TrendingUp size={24} color="var(--success)" />
                            <div>
                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Initiatives</div>
                                <div className="text-sm text-muted">Strategic initiatives overview</div>
                            </div>
                        </div>
                        <ArrowRight size={20} color="var(--text-muted)" />
                    </div>
                </Link>
            </div>

            {/* KPI Add/Edit Modal */}
            {showKpiModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="card" style={{ width: '500px', maxWidth: '90vw' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
                            <h3 className="text-xl">{editingKpi ? 'Edit KPI' : 'Add New KPI'}</h3>
                            <button onClick={() => setShowKpiModal(false)} className="btn-ghost" style={{ padding: '0.25rem' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                            <div>
                                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>KPI Name *</label>
                                <input
                                    type="text"
                                    value={newKpi.name}
                                    onChange={(e) => setNewKpi({ ...newKpi, name: e.target.value })}
                                    placeholder="e.g. Conversion Rate"
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Category</label>
                                    <select
                                        value={newKpi.category}
                                        onChange={(e) => setNewKpi({ ...newKpi, category: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        {kpiCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Unit</label>
                                    <select
                                        value={newKpi.unit}
                                        onChange={(e) => setNewKpi({ ...newKpi, unit: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        {kpiUnits.map(u => <option key={u} value={u}>{u}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Direction</label>
                                <select
                                    value={newKpi.direction}
                                    onChange={(e) => setNewKpi({ ...newKpi, direction: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    <option value="higher_better">Higher is better</option>
                                    <option value="lower_better">Lower is better</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Tracking Method</label>
                                <select
                                    value={newKpi.trackingMethod}
                                    onChange={(e) => setNewKpi({ ...newKpi, trackingMethod: e.target.value })}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                >
                                    {trackingMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
                                <div>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Target *</label>
                                    <input
                                        type="number"
                                        value={newKpi.target}
                                        onChange={(e) => setNewKpi({ ...newKpi, target: e.target.value })}
                                        placeholder="e.g. 4.2"
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Warning</label>
                                    <input
                                        type="number"
                                        value={newKpi.warning}
                                        onChange={(e) => setNewKpi({ ...newKpi, warning: e.target.value })}
                                        placeholder="e.g. 3.5"
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Critical</label>
                                    <input
                                        type="number"
                                        value={newKpi.critical}
                                        onChange={(e) => setNewKpi({ ...newKpi, critical: e.target.value })}
                                        placeholder="e.g. 2.8"
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: 'var(--spacing-lg)' }}>
                            <button onClick={() => setShowKpiModal(false)} className="btn btn-ghost">Cancel</button>
                            <button onClick={handleSaveKpi} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Save size={16} /> {editingKpi ? 'Update' : 'Add KPI'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutiveDashboard;
