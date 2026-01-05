import { useState } from 'react';
import { LayoutDashboard, Compass } from 'lucide-react';
import OperationalView from '../components/ScenarioPlanner/OperationalView';
import StrategicView from '../components/ScenarioPlanner/StrategicView';

const ScenarioPlanner = () => {
    const [mode, setMode] = useState('Operational'); // 'Strategic' | 'Operational'

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <header style={{ marginBottom: 'var(--spacing-xl)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 className="text-2xl">Scenario Planner</h2>
                    <p className="text-muted">
                        {mode === 'Operational'
                            ? 'Monitor active project demand against capacity.'
                            : 'Model hypothetical future scenarios and feasibility.'}
                    </p>
                </div>

                {/* Mode Switcher */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-md)', display: 'flex', gap: '4px', border: '1px solid var(--bg-tertiary)' }}>
                    <button
                        onClick={() => setMode('Strategic')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: mode === 'Strategic' ? 'var(--bg-tertiary)' : 'transparent',
                            color: mode === 'Strategic' ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Compass size={18} /> Strategic
                    </button>
                    <button
                        onClick={() => setMode('Operational')}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '0.5rem 1rem',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: mode === 'Operational' ? 'var(--bg-tertiary)' : 'transparent',
                            color: mode === 'Operational' ? 'var(--text-primary)' : 'var(--text-muted)',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LayoutDashboard size={18} /> Operational
                    </button>
                </div>
            </header>

            {mode === 'Operational' ? <OperationalView /> : <StrategicView />}
        </div>
    );
};

export default ScenarioPlanner;
