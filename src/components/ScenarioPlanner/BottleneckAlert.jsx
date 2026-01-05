import React from 'react';
import { BrainCircuit, AlertTriangle } from 'lucide-react';

const BottleneckAlert = ({ conflict, solutionsCount }) => {
    if (!conflict) return null;

    return (
        <div style={{
            padding: '1.5rem',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--spacing-lg)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--danger)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white'
                }}>
                    <BrainCircuit size={18} />
                </div>
                <div>
                    <h4 style={{ fontWeight: 600, color: 'var(--danger)' }}>
                        Resource Contention Detected: {conflict.role}
                    </h4>
                    <p className="text-sm text-muted">
                        Deficit of <b>{Math.round(conflict.deficit)} hours</b> in {conflict.period}.
                        The AI Engine has generated {solutionsCount} resolution paths.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BottleneckAlert;
