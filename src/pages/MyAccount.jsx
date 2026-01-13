import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { format, startOfWeek, addDays, parseISO, differenceInBusinessDays, differenceInCalendarDays, isWithinInterval } from 'date-fns';
import { ListTodo, Clock, Palmtree, ChevronRight, Check, Calendar, Plus } from 'lucide-react';

const MyAccount = () => {
    const { tasks, projects, resources, timesheetEntries = [], leaveRequests = [], submitLeaveRequest, updateTimesheetEntry, updateTask } = useApp();
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('tasks');
    const [taskView, setTaskView] = useState('list'); // 'list' | 'day' | 'hour'
    const [selectedDate, setSelectedDate] = useState(new Date());

    // --- My Tasks ---
    const myTasks = useMemo(() => {
        if (!currentUser) return [];

        // Find the resource that matches the current user by name
        const myResource = resources.find(r => r.name === currentUser.name);

        return tasks.filter(t => {
            // Task assignee is stored as resource ID (number or string)
            const assigneeId = parseInt(t.assignee);
            return myResource && assigneeId === myResource.id;
        }).sort((a, b) => {
            const priorityOrder = { High: 0, Medium: 1, Low: 2 };
            return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
        });
    }, [tasks, currentUser, resources]);

    // --- Timesheet Logic ---
    const [timesheetWeekStart, setTimesheetWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => addDays(timesheetWeekStart, i));
    }, [timesheetWeekStart]);

    const [localTimesheet, setLocalTimesheet] = useState({});

    const handleTimesheetChange = (date, projectId, hours) => {
        const key = `${format(date, 'yyyy-MM-dd')}-${projectId}`;
        setLocalTimesheet(prev => ({ ...prev, [key]: hours }));
    };

    // Calculate estimated hours for a project on a specific day based on assigned tasks
    // Assumes 8h work day, split between all active tasks on that day
    const getEstimatedHours = (projectId, date) => {
        // Skip weekends
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return 0;

        // Find ALL tasks assigned to me that overlap this date (across all projects)
        const allActiveTasks = myTasks.filter(t => {
            if (!t.startDate || !t.endDate) return false;
            try {
                const start = parseISO(t.startDate);
                const end = parseISO(t.endDate);
                return isWithinInterval(date, { start, end });
            } catch {
                return false;
            }
        });

        // Find tasks for THIS project that overlap this date
        const projectTasks = allActiveTasks.filter(t => t.projectId === projectId);

        if (projectTasks.length === 0) return 0;

        // Split 8h work day among all active tasks, then return this project's share
        const hoursPerTask = 8 / allActiveTasks.length;
        const totalHours = projectTasks.length * hoursPerTask;

        return Math.round(totalHours * 10) / 10; // Round to 1 decimal
    };

    // --- Leave Logic ---
    const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', notes: '' });
    const [showLeaveForm, setShowLeaveForm] = useState(false);

    const myLeaveRequests = useMemo(() => {
        if (!currentUser) return [];
        return leaveRequests.filter(r => r.userId === currentUser.id);
    }, [leaveRequests, currentUser]);

    const usedLeaveDays = useMemo(() => {
        return myLeaveRequests
            .filter(r => r.status === 'Approved' || r.status === 'Pending')
            .reduce((total, r) => {
                const days = differenceInBusinessDays(parseISO(r.endDate), parseISO(r.startDate)) + 1;
                return total + days;
            }, 0);
    }, [myLeaveRequests]);

    const remainingLeave = 25 - usedLeaveDays;

    const handleLeaveSubmit = (e) => {
        e.preventDefault();
        if (submitLeaveRequest && leaveForm.startDate && leaveForm.endDate) {
            submitLeaveRequest({
                userId: currentUser?.id,
                ...leaveForm,
                status: 'Pending',
                submittedAt: new Date().toISOString()
            });
            setLeaveForm({ startDate: '', endDate: '', notes: '' });
            setShowLeaveForm(false);
        }
    };

    const tabs = [
        { id: 'tasks', label: 'My Tasks', icon: ListTodo },
        { id: 'timesheet', label: 'Timesheet', icon: Clock },
        { id: 'leave', label: 'Leave', icon: Palmtree },
    ];

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <h1 className="text-2xl" style={{ marginBottom: '0.25rem' }}>
                    Welcome, {currentUser?.name || 'User'}
                </h1>
                <p className="text-muted">Manage your tasks, log time, and request leave</p>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                marginBottom: 'var(--spacing-lg)',
                borderBottom: '1px solid var(--bg-tertiary)',
                paddingBottom: 'var(--spacing-sm)'
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.75rem 1.25rem',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: isActive ? 600 : 400,
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
                {/* MY TASKS */}
                {activeTab === 'tasks' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h2 className="text-lg">Your Assigned Tasks ({myTasks.length})</h2>
                            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
                                {['list', 'day', 'hour'].map(view => (
                                    <button
                                        key={view}
                                        onClick={() => setTaskView(view)}
                                        style={{
                                            padding: '4px 12px',
                                            fontSize: '0.75rem',
                                            borderRadius: 'var(--radius-sm)',
                                            border: 'none',
                                            backgroundColor: taskView === view ? 'var(--accent-primary)' : 'transparent',
                                            color: taskView === view ? 'white' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            textTransform: 'capitalize'
                                        }}
                                    >
                                        {view}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* LIST VIEW */}
                        {taskView === 'list' && (
                            myTasks.length === 0 ? (
                                <p className="text-muted">No tasks assigned to you.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    {myTasks.map(task => {
                                        const project = projects.find(p => p.id === task.projectId);
                                        const priorityColor = task.priority === 'High' ? 'var(--danger)' :
                                            task.priority === 'Medium' ? 'var(--warning)' : 'var(--success)';
                                        return (
                                            <div key={task.id} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: 'var(--spacing-md)',
                                                backgroundColor: 'var(--bg-secondary)',
                                                borderRadius: 'var(--radius-md)',
                                                borderLeft: `4px solid ${priorityColor}`
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 500 }}>{task.name}</div>
                                                    <div className="text-sm text-muted">
                                                        <span style={{ fontWeight: 600 }}>{project?.code}</span> {project?.name || 'Unknown Project'} • {task.estimate || 0}h estimated
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                                                    <div className="text-sm" style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 500 }}>{task.startDate ? format(parseISO(task.startDate), 'MMM d') : '—'}</div>
                                                        <div className="text-xs text-muted">to {task.endDate ? format(parseISO(task.endDate), 'MMM d') : '—'}</div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newStatus = task.status === 'Completed' ? 'In Progress' : 'Completed';
                                                            const updates = { status: newStatus };

                                                            // If marking complete, set actual end date to today
                                                            if (newStatus === 'Completed') {
                                                                updates.actualEndDate = format(new Date(), 'yyyy-MM-dd');
                                                            }

                                                            updateTask(task.id, updates);
                                                        }}
                                                        style={{
                                                            padding: '4px 12px',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.75rem',
                                                            fontWeight: 600,
                                                            border: 'none',
                                                            cursor: 'pointer',
                                                            backgroundColor: task.status === 'Completed' ? 'var(--success)' : 'var(--bg-tertiary)',
                                                            color: task.status === 'Completed' ? 'white' : 'var(--text-secondary)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={e => {
                                                            if (task.status !== 'Completed') {
                                                                e.currentTarget.style.backgroundColor = 'var(--success)';
                                                                e.currentTarget.style.color = 'white';
                                                            }
                                                        }}
                                                        onMouseLeave={e => {
                                                            if (task.status !== 'Completed') {
                                                                e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                                            }
                                                        }}
                                                    >
                                                        {task.status === 'Completed' ? (
                                                            <><Check size={12} /> Completed</>
                                                        ) : (
                                                            <>Mark Complete</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* DAY VIEW */}
                        {taskView === 'day' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <button className="btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>← Prev</button>
                                    <span className="text-md" style={{ fontWeight: 600 }}>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                                    <button className="btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next →</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                    {myTasks.filter(t => {
                                        if (!t.startDate || !t.endDate) return false;
                                        const start = parseISO(t.startDate);
                                        const end = parseISO(t.endDate);
                                        return selectedDate >= start && selectedDate <= end;
                                    }).length === 0 ? (
                                        <p className="text-muted">No tasks scheduled for this day.</p>
                                    ) : (
                                        myTasks.filter(t => {
                                            if (!t.startDate || !t.endDate) return false;
                                            const start = parseISO(t.startDate);
                                            const end = parseISO(t.endDate);
                                            return selectedDate >= start && selectedDate <= end;
                                        }).map(task => {
                                            const project = projects.find(p => p.id === task.projectId);

                                            // Calculate daily hours allocation
                                            const start = parseISO(task.startDate);
                                            const end = parseISO(task.endDate);
                                            const businessDays = Math.max(1, differenceInBusinessDays(end, start) + 1);
                                            const dailyHours = Math.round((task.estimate || 0) / businessDays * 10) / 10;

                                            return (
                                                <div key={task.id} style={{
                                                    padding: 'var(--spacing-md)',
                                                    backgroundColor: 'var(--bg-secondary)',
                                                    borderRadius: 'var(--radius-md)',
                                                    borderLeft: '4px solid var(--accent-primary)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}>
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>{task.name}</div>
                                                        <div className="text-sm text-muted"><span style={{ fontWeight: 600 }}>{project?.code}</span> {project?.name}</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>{dailyHours}h</div>
                                                        <div className="text-xs text-muted">today</div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {/* HOUR VIEW */}
                        {taskView === 'hour' && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                                    <button className="btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>← Prev</button>
                                    <span className="text-md" style={{ fontWeight: 600 }}>{format(selectedDate, 'EEEE, MMMM d')}</span>
                                    <button className="btn-ghost" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>Next →</button>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                                    {[9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour => {
                                        const tasksThisHour = myTasks.filter(t => {
                                            if (!t.startDate || !t.endDate) return false;
                                            const start = parseISO(t.startDate);
                                            const end = parseISO(t.endDate);
                                            return selectedDate >= start && selectedDate <= end;
                                        });
                                        return (
                                            <div key={hour} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '60px 1fr',
                                                minHeight: '50px',
                                                backgroundColor: 'var(--bg-primary)'
                                            }}>
                                                <div style={{
                                                    padding: '0.5rem',
                                                    borderRight: '1px solid var(--bg-tertiary)',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'flex-end'
                                                }}>
                                                    <span className="text-xs text-muted">{hour}:00</span>
                                                </div>
                                                <div style={{ padding: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {tasksThisHour.slice(0, 2).map(task => (
                                                        <div key={task.id} style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: 'var(--accent-primary)',
                                                            color: 'white',
                                                            borderRadius: 'var(--radius-sm)',
                                                            fontSize: '0.7rem',
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {task.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TIMESHEET */}
                {activeTab === 'timesheet' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                            <h2 className="text-lg">Weekly Timesheet</h2>
                            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setTimesheetWeekStart(addDays(timesheetWeekStart, -7))}
                                >
                                    ← Prev
                                </button>
                                <span className="text-sm">
                                    {format(timesheetWeekStart, 'MMM d')} - {format(addDays(timesheetWeekStart, 6), 'MMM d, yyyy')}
                                </span>
                                <button
                                    className="btn-ghost"
                                    onClick={() => setTimesheetWeekStart(addDays(timesheetWeekStart, 7))}
                                >
                                    Next →
                                </button>
                            </div>
                        </div>

                        {/* Timesheet Grid */}
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>Project</th>
                                        {weekDays.map(day => (
                                            <th key={day.toISOString()} style={{
                                                textAlign: 'center',
                                                padding: '0.5rem',
                                                borderBottom: '1px solid var(--bg-tertiary)',
                                                minWidth: '60px'
                                            }}>
                                                <div className="text-xs text-muted">{format(day, 'EEE')}</div>
                                                <div className="text-sm">{format(day, 'd')}</div>
                                            </th>
                                        ))}
                                        <th style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.slice(0, 5).map(project => {
                                        let rowTotal = 0;
                                        return (
                                            <tr key={project.id}>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                    <div className="text-sm" style={{ fontWeight: 500 }}>
                                                        <span style={{ color: 'var(--accent-primary)' }}>{project.code}</span> {project.name}
                                                    </div>
                                                </td>
                                                {weekDays.map(day => {
                                                    const dateKey = format(day, 'yyyy-MM-dd');
                                                    const key = `${dateKey}-${project.id}`;
                                                    const estimatedHours = getEstimatedHours(project.id, day);
                                                    const hours = localTimesheet[key] !== undefined ? localTimesheet[key] : estimatedHours;
                                                    rowTotal += parseFloat(hours) || 0;
                                                    return (
                                                        <td key={day.toISOString()} style={{ padding: '0.25rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="24"
                                                                step="0.5"
                                                                value={hours}
                                                                onChange={(e) => handleTimesheetChange(day, project.id, e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.25rem',
                                                                    textAlign: 'center',
                                                                    border: '1px solid var(--bg-tertiary)',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    backgroundColor: 'var(--bg-primary)',
                                                                    color: 'var(--text-primary)'
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td style={{
                                                    padding: '0.5rem',
                                                    textAlign: 'center',
                                                    borderBottom: '1px solid var(--bg-tertiary)',
                                                    fontWeight: 600
                                                }}>
                                                    {rowTotal}h
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {/* Annual Leave Row */}
                                    {(() => {
                                        let leaveTotal = 0;
                                        return (
                                            <tr style={{ backgroundColor: 'rgba(139, 92, 246, 0.05)' }}>
                                                <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                    <div className="text-sm" style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <Palmtree size={14} color="var(--accent-secondary)" />
                                                        <span style={{ color: 'var(--accent-secondary)' }}>Annual Leave</span>
                                                    </div>
                                                </td>
                                                {weekDays.map(day => {
                                                    const dateKey = format(day, 'yyyy-MM-dd');
                                                    const key = `${dateKey}-leave`;
                                                    const hours = localTimesheet[key] || 0;
                                                    leaveTotal += parseFloat(hours) || 0;
                                                    return (
                                                        <td key={day.toISOString()} style={{ padding: '0.25rem', borderBottom: '1px solid var(--bg-tertiary)' }}>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max="8"
                                                                step="4"
                                                                value={hours}
                                                                onChange={(e) => handleTimesheetChange(day, 'leave', e.target.value)}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.25rem',
                                                                    textAlign: 'center',
                                                                    border: '1px solid var(--accent-secondary)',
                                                                    borderRadius: 'var(--radius-sm)',
                                                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                                    color: 'var(--text-primary)'
                                                                }}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td style={{
                                                    padding: '0.5rem',
                                                    textAlign: 'center',
                                                    borderBottom: '1px solid var(--bg-tertiary)',
                                                    fontWeight: 600,
                                                    color: 'var(--accent-secondary)'
                                                }}>
                                                    {leaveTotal}h
                                                </td>
                                            </tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--spacing-md)' }}>
                            <p className="text-xs text-muted">
                                Hours are prepopulated from your assigned task estimates. You can override manually.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    alert('Timesheet submitted successfully! (Demo mode)');
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Check size={16} /> Submit Timesheet
                            </button>
                        </div>
                    </div>
                )}

                {/* LEAVE */}
                {activeTab === 'leave' && (
                    <div>
                        {/* Leave Balance */}
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-lg)',
                            marginBottom: 'var(--spacing-lg)',
                            padding: 'var(--spacing-md)',
                            backgroundColor: 'var(--bg-secondary)',
                            borderRadius: 'var(--radius-md)'
                        }}>
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div className="text-3xl" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{remainingLeave}</div>
                                <div className="text-sm text-muted">Days Remaining</div>
                            </div>
                            <div style={{ width: '1px', backgroundColor: 'var(--bg-tertiary)' }} />
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div className="text-3xl" style={{ fontWeight: 700 }}>{usedLeaveDays}</div>
                                <div className="text-sm text-muted">Days Used/Pending</div>
                            </div>
                            <div style={{ width: '1px', backgroundColor: 'var(--bg-tertiary)' }} />
                            <div style={{ textAlign: 'center', flex: 1 }}>
                                <div className="text-3xl" style={{ fontWeight: 700 }}>25</div>
                                <div className="text-sm text-muted">Annual Allowance</div>
                            </div>
                        </div>

                        {/* Request Leave Button */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowLeaveForm(!showLeaveForm)}
                            >
                                <Plus size={16} style={{ marginRight: '0.5rem' }} />
                                Request Leave
                            </button>
                        </div>

                        {/* Leave Form */}
                        {showLeaveForm && (
                            <form onSubmit={handleLeaveSubmit} style={{
                                padding: 'var(--spacing-md)',
                                backgroundColor: 'var(--bg-secondary)',
                                borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--spacing-lg)'
                            }}>
                                <h3 className="text-md" style={{ marginBottom: 'var(--spacing-sm)' }}>New Leave Request</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                                    <div>
                                        <label className="text-sm text-muted">Start Date</label>
                                        <input
                                            type="date"
                                            value={leaveForm.startDate}
                                            onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-muted">End Date</label>
                                        <input
                                            type="date"
                                            value={leaveForm.endDate}
                                            onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                </div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <label className="text-sm text-muted">Notes (optional)</label>
                                    <textarea
                                        value={leaveForm.notes}
                                        onChange={(e) => setLeaveForm({ ...leaveForm, notes: e.target.value })}
                                        className="input"
                                        rows={2}
                                        placeholder="e.g., Family holiday"
                                    />
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                                    <button type="submit" className="btn btn-primary">Submit Request</button>
                                    <button type="button" className="btn-ghost" onClick={() => setShowLeaveForm(false)}>Cancel</button>
                                </div>
                            </form>
                        )}

                        {/* Leave Requests List */}
                        <h3 className="text-md" style={{ marginBottom: 'var(--spacing-sm)' }}>Your Requests</h3>
                        {myLeaveRequests.length === 0 ? (
                            <p className="text-muted">No leave requests submitted.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                                {myLeaveRequests.map((req, idx) => {
                                    const days = differenceInBusinessDays(parseISO(req.endDate), parseISO(req.startDate)) + 1;
                                    const statusColor = req.status === 'Approved' ? 'var(--success)' :
                                        req.status === 'Denied' ? 'var(--danger)' : 'var(--warning)';
                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: 'var(--spacing-sm)',
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius-sm)'
                                        }}>
                                            <div>
                                                <div className="text-sm" style={{ fontWeight: 500 }}>
                                                    {format(parseISO(req.startDate), 'MMM d')} - {format(parseISO(req.endDate), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-muted">{days} day(s) • {req.notes || 'No notes'}</div>
                                            </div>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)',
                                                fontSize: '0.75rem',
                                                backgroundColor: statusColor,
                                                color: 'white'
                                            }}>
                                                {req.status}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyAccount;
