/**
 * adjustSchedule tool adapter
 * Reads project timelines and computes shift suggestions.
 */
import { addMonths, format, isValid } from 'date-fns';

export function adjustSchedule(params, appData) {
    const { projects } = appData;

    if (!projects || projects.length === 0) {
        return {
            result: { error: 'No projects available.' },
            suggestedActions: [],
        };
    }

    const projectName = params?.projectName;
    const shiftMonths = params?.shiftMonths || 1;

    // Find target project
    let target = null;
    if (projectName) {
        target = projects.find(p =>
            p.name.toLowerCase().includes(projectName.toLowerCase())
        );
    }

    if (!target && projectName) {
        return {
            result: {
                error: `Project "${projectName}" not found.`,
                availableProjects: projects.map(p => ({ name: p.name, start: p.startDate, end: p.endDate })),
            },
            suggestedActions: [],
        };
    }

    // If no project specified, list all timelines
    if (!target) {
        return {
            result: {
                projects: projects.map(p => ({
                    name: p.name,
                    startDate: p.startDate,
                    endDate: p.endDate,
                    isDraft: p.isDraft || false,
                })),
                message: 'Specify a project name to adjust its schedule.',
            },
            suggestedActions: [],
        };
    }

    // Compute new dates
    const currentStart = new Date(target.startDate);
    const currentEnd = new Date(target.endDate);

    if (!isValid(currentStart) || !isValid(currentEnd)) {
        return {
            result: { error: `Project "${target.name}" has invalid dates.` },
            suggestedActions: [],
        };
    }

    const newStart = format(addMonths(currentStart, shiftMonths), 'yyyy-MM-dd');
    const newEnd = format(addMonths(currentEnd, shiftMonths), 'yyyy-MM-dd');

    return {
        result: {
            project: target.name,
            currentStart: target.startDate,
            currentEnd: target.endDate,
            proposedStart: newStart,
            proposedEnd: newEnd,
            shiftMonths,
        },
        suggestedActions: [{
            id: `schedule_${target.id}`,
            label: `Shift ${target.name} by ${shiftMonths} month${shiftMonths > 1 ? 's' : ''}`,
            description: `Move "${target.name}" from ${target.startDate} → ${newStart} (start) and ${target.endDate} → ${newEnd} (end).`,
            type: 'SCHEDULE',
            action: {
                type: 'UPDATE_PROJECT',
                projectId: target.id,
                changes: { startDate: newStart, endDate: newEnd },
            },
        }],
    };
}
