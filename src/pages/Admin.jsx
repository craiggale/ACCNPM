import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, Save, X, Settings, Layers, List, Globe, DoorOpen } from 'lucide-react';

const Admin = () => {
    const { teams, addTeam, removeTeam, taskTemplates, updateTaskTemplate, markets, addMarket, removeMarket, gatewayTemplates, updateGatewayTemplate } = useApp();

    // Team Management State
    const [newTeamName, setNewTeamName] = useState('');

    // Market Management State
    const [newMarketName, setNewMarketName] = useState('');

    // Template Management State
    const [selectedTeam, setSelectedTeam] = useState(teams[0] || '');
    const [selectedScale, setSelectedScale] = useState('Small');
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'gateways'
    const [templateTasks, setTemplateTasks] = useState([]);
    const [templateGateways, setTemplateGateways] = useState([]);

    // Task Template State
    const [newTask, setNewTask] = useState({ title: '', estimate: '', gatewayDependency: '' });

    // Gateway Template State
    const [newGateway, setNewGateway] = useState({ name: '', offsetWeeks: 0 });

    // Load tasks and gateways when selection changes
    React.useEffect(() => {
        const currentTasks = (taskTemplates[selectedTeam] && taskTemplates[selectedTeam][selectedScale]) || [];
        setTemplateTasks([...currentTasks]);

        const currentGateways = (gatewayTemplates[selectedTeam] && gatewayTemplates[selectedTeam][selectedScale]) || [];
        setTemplateGateways([...currentGateways]);
    }, [selectedTeam, selectedScale, taskTemplates, gatewayTemplates]);

    const handleAddTeam = (e) => {
        e.preventDefault();
        if (newTeamName && !teams.includes(newTeamName)) {
            addTeam(newTeamName);
            setNewTeamName('');
        }
    };

    const handleAddMarket = (e) => {
        e.preventDefault();
        if (newMarketName && !markets.includes(newMarketName)) {
            addMarket(newMarketName);
            setNewMarketName('');
        }
    };

    const handleAddTaskToTemplate = () => {
        if (newTask.title) {
            const updatedTasks = [...templateTasks, { ...newTask, estimate: parseInt(newTask.estimate) }];
            setTemplateTasks(updatedTasks);
            setNewTask({ title: '', estimate: 0, gatewayDependency: '' });
        }
    };

    const handleRemoveTaskFromTemplate = (index) => {
        const updatedTasks = templateTasks.filter((_, i) => i !== index);
        updateTaskTemplate(selectedTeam, selectedScale, updatedTasks);
    };

    const handleAddGateway = (e) => {
        e.preventDefault();
        if (newGateway.name && !templateGateways.some(g => g.name === newGateway.name)) {
            const updatedGateways = [...templateGateways, { ...newGateway, offsetWeeks: parseInt(newGateway.offsetWeeks) || 0 }];
            updateGatewayTemplate(selectedTeam, selectedScale, updatedGateways);
            setNewGateway({ name: '', offsetWeeks: 0 });
        }
    };

    const handleRemoveGateway = (gatewayName) => {
        const updatedGateways = templateGateways.filter(g => g.name !== gatewayName);
        updateGatewayTemplate(selectedTeam, selectedScale, updatedGateways);
    };

    const handleSaveTemplate = () => {
        updateTaskTemplate(selectedTeam, selectedScale, templateTasks);
        alert('Template saved successfully!');
    };

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)' }}>
                <h2 className="text-2xl" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Settings size={24} /> Admin Settings
                </h2>
                <p className="text-muted">Manage teams and project templates.</p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--spacing-xl)' }}>

                {/* Team & Market Management Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>

                    {/* Team Management */}
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Layers size={20} /> Teams
                        </h3>

                        <form onSubmit={handleAddTeam} style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                            <input
                                type="text"
                                placeholder="New Team Name"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                <Plus size={16} />
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {teams.map(team => (
                                <div key={team} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--bg-tertiary)'
                                }}>
                                    <span>{team}</span>
                                    <button
                                        onClick={() => removeTeam(team)}
                                        className="btn-ghost"
                                        style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                        title="Remove Team"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Market Management */}
                    <div className="card" style={{ height: 'fit-content' }}>
                        <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Globe size={20} /> Markets
                        </h3>

                        <form onSubmit={handleAddMarket} style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-lg)' }}>
                            <input
                                type="text"
                                placeholder="New Market Name"
                                value={newMarketName}
                                onChange={(e) => setNewMarketName(e.target.value)}
                                style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            />
                            <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                <Plus size={16} />
                            </button>
                        </form>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                            {markets.map(market => (
                                <div key={market} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '0.75rem',
                                    backgroundColor: 'var(--bg-secondary)',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--bg-tertiary)'
                                }}>
                                    <span>{market}</span>
                                    <button
                                        onClick={() => removeMarket(market)}
                                        className="btn-ghost"
                                        style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                        title="Remove Market"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Template Management */}
                <div className="card">
                    <h3 className="text-xl" style={{ marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <List size={20} /> Project Templates
                    </h3>

                    <div style={{ display: 'flex', gap: 'var(--spacing-lg)', marginBottom: 'var(--spacing-lg)' }}>
                        <div style={{ flex: 1 }}>
                            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Team</label>
                            <select
                                value={selectedTeam}
                                onChange={(e) => setSelectedTeam(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                {teams.map(team => (
                                    <option key={team} value={team}>{team}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Scale</label>
                            <select
                                value={selectedScale}
                                onChange={(e) => setSelectedScale(e.target.value)}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                            >
                                <option value="Small">Small</option>
                                <option value="Medium">Medium</option>
                                <option value="Large">Large</option>
                            </select>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: 'var(--spacing-lg)', borderBottom: '1px solid var(--bg-tertiary)', paddingBottom: '0.5rem' }}>
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={activeTab === 'tasks' ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.5rem 1rem',
                                opacity: activeTab === 'tasks' ? 1 : 0.7
                            }}
                        >
                            <List size={16} style={{ marginRight: '0.5rem' }} /> Tasks
                        </button>
                        <button
                            onClick={() => setActiveTab('gateways')}
                            className={activeTab === 'gateways' ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{
                                borderRadius: 'var(--radius-sm)',
                                padding: '0.5rem 1rem',
                                opacity: activeTab === 'gateways' ? 1 : 0.7
                            }}
                        >
                            <Layers size={16} style={{ marginRight: '0.5rem' }} /> Gateways
                        </button>
                    </div>

                    {activeTab === 'tasks' ? (
                        <>
                            <h4 className="text-lg" style={{ marginBottom: '1rem' }}>Task Template</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-lg)', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Task Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Requirements Gathering"
                                        value={newTask.title}
                                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Hours</label>
                                    <input
                                        type="number"
                                        placeholder="20"
                                        value={newTask.estimate}
                                        onChange={(e) => setNewTask({ ...newTask, estimate: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Gateway Dependency</label>
                                    <select
                                        value={newTask.gatewayDependency}
                                        onChange={(e) => setNewTask({ ...newTask, gatewayDependency: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    >
                                        <option value="">None</option>
                                        {templateGateways.map(g => (
                                            <option key={g.name} value={g.name}>{g.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={handleAddTaskToTemplate} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {templateTasks.length === 0 && (
                                    <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No tasks defined for this template.</p>
                                )}
                                {templateTasks.map((task, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--bg-tertiary)'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <div style={{ fontWeight: 500 }}>{task.title}</div>
                                                {task.gatewayDependency && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.125rem 0.5rem', backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--accent-primary)' }} title={`Linked to Gateway: ${task.gatewayDependency}`}>
                                                        <DoorOpen size={12} />
                                                        <span>{task.gatewayDependency}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm text-muted">{task.estimate} hours</div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveTaskFromTemplate(index)}
                                            className="btn-ghost"
                                            style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                            title="Remove Task"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <h4 className="text-lg" style={{ marginBottom: '1rem' }}>Gateway Template</h4>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: 'var(--spacing-lg)', alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Gateway Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Security Review"
                                        value={newGateway.name}
                                        onChange={(e) => setNewGateway({ ...newGateway, name: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label className="text-sm text-muted" style={{ display: 'block', marginBottom: '0.25rem' }}>Weeks Before Launch</label>
                                    <input
                                        type="number"
                                        placeholder="2"
                                        value={newGateway.offsetWeeks}
                                        onChange={(e) => setNewGateway({ ...newGateway, offsetWeeks: e.target.value })}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-tertiary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                                    />
                                </div>
                                <button onClick={handleAddGateway} className="btn btn-primary" style={{ padding: '0.5rem' }}>
                                    <Plus size={16} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {templateGateways.length === 0 && (
                                    <p className="text-muted" style={{ textAlign: 'center', padding: '1rem' }}>No gateways defined for this template.</p>
                                )}
                                {templateGateways.map((gateway, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.75rem',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--bg-tertiary)'
                                    }}>
                                        <div>
                                            <span style={{ fontWeight: 500 }}>{gateway.name}</span>
                                            <span className="text-sm text-muted" style={{ marginLeft: '0.5rem' }}>({gateway.offsetWeeks} weeks out)</span>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveGateway(gateway.name)}
                                            className="btn-ghost"
                                            style={{ color: 'var(--danger)', padding: '0.25rem' }}
                                            title="Remove Gateway"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
                        <button onClick={handleSaveTemplate} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Save size={16} /> Save Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Admin;
