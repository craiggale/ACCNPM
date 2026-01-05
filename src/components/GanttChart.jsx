import React, { useMemo } from 'react';
import { format, differenceInDays, addDays, startOfMonth, endOfMonth, eachMonthOfInterval, isSameMonth } from 'date-fns';
import { RefreshCcw, DoorOpen, ArrowRight } from 'lucide-react';

const GanttChart = ({ items = [], startDate, endDate, type = 'project', showCriticalPath, showDependencies, showGateways, onTaskClick }) => {
    // items can be projects or tasks. 
    // If type='project', items should have { id, name, startDate, endDate, status }
    // If type='task', items should have { id, title, startDate, endDate, status, assignee, predecessorId, gatewayDependency }

    const start = startDate && !isNaN(new Date(startDate)) ? new Date(startDate) : new Date();
    const end = endDate && !isNaN(new Date(endDate)) ? new Date(endDate) : addDays(new Date(), 90);

    const totalDays = differenceInDays(end, start) + 1;

    const months = useMemo(() => {
        try {
            return eachMonthOfInterval({
                start: start,
                end: end
            });
        } catch (e) {
            return [];
        }
    }, [start, end]);

    const getPosition = (itemStart, itemEnd) => {
        if (!itemStart || !itemEnd) return null;
        const s = new Date(itemStart);
        const e = new Date(itemEnd);

        if (isNaN(s.getTime()) || isNaN(e.getTime())) return null;

        // Clamp dates to view range
        const effectiveStart = s < start ? start : s;
        const effectiveEnd = e > end ? end : e;

        if (effectiveEnd < start || effectiveStart > end) return null;

        const offsetDays = differenceInDays(effectiveStart, start);
        const durationDays = differenceInDays(effectiveEnd, effectiveStart) + 1;

        const left = (offsetDays / totalDays) * 100;
        const width = (durationDays / totalDays) * 100;

        return { left: `${left}%`, width: `${width}%`, originalLeft: left, originalWidth: width };
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'var(--success)';
            case 'In Progress': return 'var(--accent-primary)';
            case 'Delayed': return 'var(--danger)';
            case 'Planning': return 'var(--warning)';
            default: return 'var(--text-muted)';
        }
    };

    // --- Critical Path Logic (Simplified) ---
    // In a real app, this would be a graph traversal.
    // Here, we'll just mark the last task and its chain of predecessors.
    const criticalPathIds = useMemo(() => {
        if (!showCriticalPath || type !== 'task') return new Set();

        const ids = new Set();
        // Find the task with the latest end date
        if (!items || items.length === 0) return ids;

        let lastTask = [...items].sort((a, b) => new Date(b.endDate) - new Date(a.endDate))[0];

        while (lastTask) {
            ids.add(lastTask.id);
            if (lastTask.predecessorId) {
                lastTask = items.find(t => t.id === lastTask.predecessorId);
            } else {
                lastTask = null;
            }
        }
        return ids;
    }, [items, showCriticalPath, type]);

    return (
        <div className="gantt-chart" style={{
            width: '100%',
            overflowX: 'auto',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--bg-tertiary)',
            padding: 'var(--spacing-md)',
            position: 'relative' // For SVG overlay
        }}>
            {/* Timeline Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--bg-tertiary)', marginBottom: 'var(--spacing-sm)' }}>
                <div style={{ width: '200px', flexShrink: 0, padding: 'var(--spacing-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {type === 'project' ? 'Project Name' : 'Task Name'}
                </div>
                <div style={{ flex: 1, position: 'relative', height: '40px' }}>
                    {months.map((month, index) => {
                        const monthStart = startOfMonth(month);
                        const monthEnd = endOfMonth(month);

                        // Calculate position for month label
                        // This is a simplified approximation. For precise month alignment we'd need exact day widths.
                        // But since we use % based on total days, we can calculate the % of the total range this month occupies.

                        const mStart = monthStart < start ? start : monthStart;
                        const mEnd = monthEnd > end ? end : monthEnd;

                        if (mEnd < start || mStart > end) return null;

                        const offset = differenceInDays(mStart, start);
                        const duration = differenceInDays(mEnd, mStart) + 1;

                        const left = (offset / totalDays) * 100;
                        const width = (duration / totalDays) * 100;

                        return (
                            <div key={index} style={{
                                position: 'absolute',
                                left: `${left}%`,
                                width: `${width}%`,
                                height: '100%',
                                borderLeft: '1px solid var(--bg-tertiary)',
                                paddingLeft: '4px',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap'
                            }}>
                                {format(month, 'MMM yyyy')}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Dependency Lines Overlay */}
            {showDependencies && type === 'task' && (
                <svg style={{ position: 'absolute', top: 80, left: 220, width: 'calc(100% - 240px)', height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                    {items.map(task => {
                        if (!task.predecessorId) return null;
                        const predecessor = items.find(t => t.id === task.predecessorId);
                        if (!predecessor) return null;

                        const pPos = getPosition(predecessor.startDate, predecessor.endDate);
                        const tPos = getPosition(task.startDate, task.endDate);

                        if (!pPos || !tPos) return null;

                        // Calculate coordinates (approximate row height is 40px + gap)
                        const rowHeight = 48; // 40px bar + 8px gap
                        const pIndex = items.indexOf(predecessor);
                        const tIndex = items.indexOf(task);

                        const x1 = parseFloat(pPos.left) + parseFloat(pPos.width); // End of predecessor
                        const y1 = pIndex * rowHeight + 20; // Center of bar
                        const x2 = parseFloat(tPos.left); // Start of task
                        const y2 = tIndex * rowHeight + 20; // Center of bar

                        // Draw curve
                        return (
                            <path
                                key={`${task.id}-${predecessor.id}`}
                                d={`M ${x1}% ${y1} C ${(x1 + x2) / 2}% ${y1}, ${(x1 + x2) / 2}% ${y2}, ${x2}% ${y2}`}
                                fill="none"
                                stroke="var(--text-muted)"
                                strokeWidth="1"
                                strokeDasharray="4"
                                opacity="0.5"
                            />
                        );
                    })}
                </svg>
            )}

            {/* Rows */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                {items.map((item, index) => {
                    const pos = getPosition(item.startDate, item.endDate);
                    const isCritical = criticalPathIds.has(item.id);

                    return (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', height: '40px', marginBottom: '8px' }}>
                            <div style={{ width: '200px', flexShrink: 0, paddingRight: 'var(--spacing-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.875rem', color: isCritical ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: isCritical ? 600 : 400 }}>
                                {item.name || item.title}
                            </div>
                            <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                                {pos && (
                                    <div
                                        onClick={() => onTaskClick && onTaskClick(item)}
                                        style={{
                                            position: 'absolute',
                                            left: pos.left,
                                            width: pos.width,
                                            height: '24px',
                                            top: '8px',
                                            backgroundColor: getStatusColor(item.status),
                                            borderRadius: '4px',
                                            opacity: 0.8,
                                            cursor: onTaskClick ? 'pointer' : 'default',
                                            boxShadow: isCritical ? '0 0 8px var(--accent-primary)' : 'none',
                                            border: isCritical ? '1px solid var(--accent-primary)' : 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title={`${item.name || item.title}: ${item.startDate} - ${item.endDate}`}
                                    >
                                        {/* Gateway Icon Overlay */}
                                        {showGateways && item.gatewayDependency && (
                                            <div style={{
                                                position: 'absolute',
                                                right: '-12px',
                                                top: '-6px',
                                                backgroundColor: 'var(--bg-primary)',
                                                borderRadius: '50%',
                                                padding: '2px',
                                                border: '1px solid var(--accent-primary)',
                                                color: 'var(--accent-primary)',
                                                zIndex: 10
                                            }}>
                                                <DoorOpen size={12} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div >
        </div >
    );
};

export default GanttChart;
