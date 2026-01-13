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
    projects, // needed for Gantt/Priority views
    planningMode // 'Standard' or 'ResourceFirst'
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
                            <button
                                onClick={() => setChartFocus('Cost')}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '0.75rem',
                                    backgroundColor: chartFocus === 'Cost' ? 'var(--accent-primary)' : 'transparent',
                                    color: chartFocus === 'Cost' ? 'white' : 'var(--text-muted)'
                                }}
                            >
                                Cost
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
                                <defs>
                                    <linearGradient id="demandGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#A100FF" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#A100FF" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="demandOverloadGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                                    </linearGradient>
                                    <linearGradient id="flexDemandGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.6} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(161, 0, 255, 0.1)"
                                    vertical={false}
                                />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--text-secondary)"
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    tickLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                />
                                <YAxis
                                    stroke="var(--text-secondary)"
                                    domain={[0, (dataMax) => {
                                        if (chartFocus === 'Cost') return dataMax * 1.1;
                                        const maxCap = data[0]?.projectedCapacity || 0;
                                        return Math.max(dataMax, maxCap) * 1.1;
                                    }]}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    axisLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    tickLine={{ stroke: 'rgba(161, 0, 255, 0.2)' }}
                                    tickFormatter={(value) => chartFocus === 'Cost' ? `£${(value / 1000).toFixed(0)}k` : value.toLocaleString()}
                                    label={{
                                        value: chartFocus === 'Cost' ? 'Cost' : 'Hours',
                                        angle: -90,
                                        position: 'insideLeft',
                                        style: { textAnchor: 'middle', fill: 'var(--text-muted)' }
                                    }}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div style={{
                                                    background: 'rgba(0, 0, 0, 0.85)',
                                                    backdropFilter: 'blur(12px)',
                                                    WebkitBackdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(161, 0, 255, 0.3)',
                                                    borderRadius: '12px',
                                                    padding: '12px 16px',
                                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(161, 0, 255, 0.15)',
                                                }}>
                                                    <p style={{
                                                        color: '#A100FF',
                                                        fontWeight: 600,
                                                        marginBottom: '8px',
                                                        fontSize: '0.9rem'
                                                    }}>
                                                        {label}
                                                    </p>
                                                    {payload.map((entry, index) => (
                                                        <div
                                                            key={index}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px',
                                                                marginBottom: '4px'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: 10,
                                                                height: 10,
                                                                borderRadius: '50%',
                                                                backgroundColor: entry.color || entry.stroke || '#A100FF',
                                                                boxShadow: `0 0 8px ${entry.color || entry.stroke || '#A100FF'}`
                                                            }} />
                                                            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                                                                {entry.name}:
                                                            </span>
                                                            <span style={{ color: '#fff', fontWeight: 500, fontSize: '0.85rem' }}>
                                                                {chartFocus === 'Cost' ? `£${Math.round(entry.value).toLocaleString()}` : `${Math.round(entry.value).toLocaleString()}h`}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ fill: 'rgba(161, 0, 255, 0.08)' }}
                                />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span style={{ color: 'var(--text-secondary)' }}>{value}</span>}
                                />

                                {/* DEMAND FOCUS VIEW */}
                                {chartFocus === 'Demand' && (
                                    <>
                                        <Bar
                                            dataKey="fixedDemand"
                                            name="Base Demand"
                                            stackId="a"
                                            fill="url(#demandGradient)"
                                            radius={[0, 0, 0, 0]}
                                        />
                                        <Bar
                                            dataKey="flexibleDemand"
                                            name="Resource Driven"
                                            stackId="a"
                                            fill="url(#flexDemandGradient)"
                                            radius={[6, 6, 0, 0]}
                                            animationDuration={800}
                                        >
                                            {data.map((entry, index) => (
                                                <Cell
                                                    key={`cell-${index}`}
                                                    fill={(entry.fixedDemand + entry.flexibleDemand) > entry.projectedCapacity ? 'url(#demandOverloadGradient)' : 'url(#flexDemandGradient)'}
                                                />
                                            ))}
                                        </Bar>
                                        {planningMode === 'ResourceFirst' && (
                                            <Bar
                                                dataKey="unusedCapacity"
                                                name="Unused Capacity"
                                                stackId="a"
                                                fill="rgba(16, 185, 129, 0.1)" // Very faint green
                                                stroke="rgba(16, 185, 129, 0.3)"
                                                strokeDasharray="3 3"
                                                radius={[6, 6, 0, 0]}
                                            />
                                        )}

                                        {/* Ghost bar for Base Capacity if different */}
                                        {data[0]?.projectedCapacity !== data[0]?.baseCapacity && (
                                            <Line type="stepAfter" dataKey="baseCapacity" name="Original Capacity" stroke="var(--text-muted)" strokeDasharray="3 3" dot={false} strokeOpacity={0.5} />
                                        )}
                                        {/* Capacity Line */}
                                        <Line
                                            type="stepAfter"
                                            dataKey="projectedCapacity"
                                            name="Capacity"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={false}
                                            animationDuration={1000}
                                        />
                                    </>
                                )}

                                {/* CAPACITY FOCUS VIEW */}
                                {chartFocus === 'Capacity' && (
                                    <>
                                        <Bar dataKey="baseCapacity" name="Original Capacity" fill="var(--text-muted)" opacity={0.3} radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="projectedCapacity" name="New Capacity" fill="#10B981" radius={[4, 4, 0, 0]} />
                                        <Line type="monotone" dataKey="projectedDemand" name="Demand" stroke="#A100FF" strokeDasharray="5 5" strokeWidth={2} dot={{ fill: '#A100FF' }} />
                                    </>
                                )}

                                {/* COST FOCUS VIEW */}
                                {chartFocus === 'Cost' && (
                                    <>
                                        <Bar
                                            dataKey="projectedCost"
                                            name="Projected Cost"
                                            fill="url(#demandGradient)"
                                            radius={[6, 6, 0, 0]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="baseCost"
                                            name="Baseline Cost"
                                            stroke="var(--text-muted)"
                                            strokeDasharray="5 5"
                                            strokeWidth={2}
                                            dot={false}
                                        />
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
                                                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}><span style={{ color: 'var(--accent-primary)' }}>{p.code}</span> {p.name}</div>
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
