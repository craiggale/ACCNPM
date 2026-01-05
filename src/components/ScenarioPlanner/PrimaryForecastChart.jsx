import React, { useState } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import { format, addMonths } from 'date-fns';
import { Filter, Calendar, BarChart2, LayoutList } from 'lucide-react';
import GanttChart from '../GanttChart';

const PrimaryForecastChart = ({
    data,
    forecastView,
    setForecastView,
    viewRole,
    setViewRole,
    chartFocus,
    setChartFocus,
    projects // needed for Gantt/Priority views
}) => {
    return (
        <div className="card" style={{ height: '450px', display: 'flex', flexDirection: 'column' }}>
            {/* Header / Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 className="text-lg">Sandbox Forecast</h3>

                    {/* View Toggles */}
                    <div style={{ display: 'flex', backgroundColor: 'var(--bg-secondary)', padding: '2px', borderRadius: '4px', border: '1px solid var(--bg-tertiary)' }}>
                        <button
                            onClick={() => setForecastView('Resource')}
                            title="Resource View"
                            style={{
                                padding: '4px 8px',
                                borderRadius: '2px',
                                backgroundColor: forecastView === 'Resource' ? 'var(--bg-tertiary)' : 'transparent',
                                color: forecastView === 'Resource' ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                        >
                            <BarChart2 size={16} />
                        </button>
                        <button
                            onClick={() => setForecastView('Timeline')}
                            title="Timeline View"
                            style={{
                                padding: '4px 8px',
                                borderRadius: '2px',
                                backgroundColor: forecastView === 'Timeline' ? 'var(--bg-tertiary)' : 'transparent',
                                color: forecastView === 'Timeline' ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                        >
                            <Calendar size={16} />
                        </button>
                        <button
                            onClick={() => setForecastView('Priority')}
                            title="Priority View"
                            style={{
                                padding: '4px 8px',
                                borderRadius: '2px',
                                backgroundColor: forecastView === 'Priority' ? 'var(--bg-tertiary)' : 'transparent',
                                color: forecastView === 'Priority' ? 'var(--text-primary)' : 'var(--text-muted)'
                            }}
                        >
                            <LayoutList size={16} />
                        </button>
                    </div>
                </div>

                {/* Filters based on view */}
                {forecastView === 'Resource' && (
                    <div className="flex gap-4 items-center text-sm">
                        {/* Focus Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--bg-tertiary)', overflow: 'hidden' }}>
                            <button
                                onClick={() => setChartFocus('Demand')}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    backgroundColor: chartFocus === 'Demand' ? 'var(--accent-primary)' : 'transparent',
                                    color: chartFocus === 'Demand' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                Demand
                            </button>
                            <button
                                onClick={() => setChartFocus('Capacity')}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    backgroundColor: chartFocus === 'Capacity' ? 'var(--accent-primary)' : 'transparent',
                                    color: chartFocus === 'Capacity' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                Capacity
                            </button>
                        </div>

                        <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--bg-tertiary)' }} />

                        {/* Role Select */}
                        <div className="flex gap-2 items-center">
                            <Filter size={14} className="text-muted" />
                            <span className="text-muted">Role:</span>
                            <select
                                className="input"
                                style={{ padding: '2px 8px' }}
                                value={viewRole}
                                onChange={(e) => setViewRole(e.target.value)}
                            >
                                <option value="All">All Roles</option>
                                <option value="Developer">Developer</option>
                                <option value="Designer">Designer</option>
                                <option value="Manager">Manager</option>
                                <option value="QA">QA</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {forecastView === 'Resource' && (
                    (!data || data.length === 0) ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            No data available or error in calculation.
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--bg-tertiary)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                                <YAxis stroke="var(--text-secondary)" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Legend />

                                {/* DEMAND FOCUS VIEW */}
                                {chartFocus === 'Demand' && (
                                    <>
                                        <Bar dataKey="projectedDemand" name="Projected Demand" radius={[4, 4, 0, 0]}>
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.projectedDemand > entry.projectedCapacity ? 'var(--danger)' : '#8b5cf6'} />
                                            ))}
                                        </Bar>

                                        {/* Ghost bar for Base Capacity if different */}
                                        {data[0]?.projectedCapacity !== data[0]?.baseCapacity && (
                                            <Line type="stepAfter" dataKey="baseCapacity" name="Original Capacity" stroke="var(--text-muted)" strokeDasharray="3 3" dot={false} strokeOpacity={0.5} />
                                        )}
                                        {/* Capacity Line */}
                                        <Line type="stepAfter" dataKey="projectedCapacity" name="Capacity" stroke="var(--success)" strokeWidth={2} dot={false} />
                                    </>
                                )}

                                {/* CAPACITY FOCUS VIEW */}
                                {chartFocus === 'Capacity' && (
                                    <>
                                        <Bar dataKey="baseCapacity" name="Original Capacity" fill="var(--text-muted)" opacity={0.3} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="projectedCapacity" name="New Capacity" fill="var(--success)" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="projectedDemand" name="Demand" stroke="var(--accent-primary)" strokeDasharray="5 5" strokeWidth={2} dot={{ fill: 'var(--accent-primary)' }} />
                                    </>
                                )}
                            </ComposedChart>
                        </ResponsiveContainer>
                    )
                )}

                {/* Other Views (Timeline / Priority) can act as simple pass-throughs for now similar to original file */}
                {forecastView === 'Timeline' && (
                    <GanttChart
                        items={projects || []}
                        startDate={format(new Date(), 'yyyy-MM-dd')}
                        endDate={format(addMonths(new Date(), 12), 'yyyy-MM-dd')}
                        type="project"
                    />
                )}
                {forecastView === 'Priority' && (
                    <div style={{ height: '100%', overflowY: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', height: '100%' }}>
                            {['Large', 'Medium', 'Small'].map(scale => {
                                const priorityLabel = scale === 'Large' ? 'High Priority' : scale === 'Medium' ? 'Medium Priority' : 'Low Priority';
                                const color = scale === 'Large' ? 'var(--danger)' : scale === 'Medium' ? 'var(--accent-primary)' : 'var(--success)';

                                return (
                                    <div key={scale} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                                        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: `2px solid ${color}`, paddingBottom: '0.5rem' }}>
                                            {priorityLabel} ({scale} Scale)
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {projects.filter(p => p.scale === scale).map(p => (
                                                <div key={p.id} style={{
                                                    padding: '0.75rem',
                                                    backgroundColor: 'var(--bg-primary)',
                                                    border: '1px solid var(--bg-tertiary)',
                                                    borderRadius: 'var(--radius-sm)',
                                                    opacity: p.status === 'Paused' ? 0.6 : 1
                                                }}>
                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.name}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.startDate} - {p.endDate}</div>
                                                    {p.status === 'Draft' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', backgroundColor: 'var(--accent-primary)', color: 'white', borderRadius: '2px' }}>DRAFT</span>}
                                                    {p.status === 'Paused' && <span style={{ fontSize: '0.65rem', padding: '1px 4px', backgroundColor: 'var(--text-muted)', color: 'white', borderRadius: '2px' }}>PAUSED</span>}
                                                </div>
                                            ))}
                                            {projects.filter(p => p.scale === scale).length === 0 && (
                                                <div className="text-sm text-muted" style={{ fontStyle: 'italic', padding: '0.5rem' }}>No projects</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PrimaryForecastChart;
