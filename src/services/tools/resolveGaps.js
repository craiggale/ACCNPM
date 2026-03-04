/**
 * resolveGaps tool adapter
 * Wraps the existing ResolutionEngine to detect conflicts and generate solutions.
 */
import { ResolutionEngine } from '../../utils/ResolutionEngine';

export function resolveGaps(params, appData) {
    const { projects, resources } = appData;

    if (!projects || !resources) {
        return {
            result: { error: 'No project or resource data available.' },
            suggestedActions: [],
        };
    }

    // Detect conflicts
    const conflict = ResolutionEngine.detectConflicts(projects, resources);

    if (!conflict) {
        return {
            result: {
                status: 'clear',
                message: 'No resource conflicts detected across the next 12 months.',
            },
            suggestedActions: [],
        };
    }

    // Generate solutions
    const solutions = ResolutionEngine.generateSolutions(conflict, projects);

    return {
        result: {
            status: 'conflict_found',
            conflict: {
                role: conflict.role,
                period: conflict.period,
                deficit: Math.round(conflict.deficit),
            },
            solutionCount: solutions.length,
            solutions: solutions.map(s => ({
                id: s.id,
                type: s.type,
                label: s.label,
                description: s.description,
                disabled: s.disabled || false,
            })),
        },
        suggestedActions: solutions
            .filter(s => !s.disabled)
            .map(s => ({
                id: s.id,
                label: s.label,
                description: s.description,
                type: s.type,
                action: s.action,
            })),
    };
}
