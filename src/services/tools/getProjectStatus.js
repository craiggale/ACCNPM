/**
 * getProjectStatus tool adapter
 * Reads project data and returns a summary of progress/health.
 */
import { differenceInDays, isValid } from 'date-fns';

export function getProjectStatus(params, appData) {
    const { projects, tasks } = appData;

    if (!projects || projects.length === 0) {
        return {
            result: { error: 'No projects available.' },
            suggestedActions: [],
        };
    }

    const projectName = params?.projectName;

    // If a specific project is requested
    if (projectName) {
        const target = projects.find(p =>
            p.name.toLowerCase().includes(projectName.toLowerCase())
        );

        if (!target) {
            return {
                result: {
                    error: `Project "${projectName}" not found.`,
                    availableProjects: projects.map(p => p.name),
                },
                suggestedActions: [],
            };
        }

        const projectTasks = tasks?.filter(t => t.projectId === target.id) || [];
        const completedTasks = projectTasks.filter(t => t.status === 'completed' || t.progress === 100);
        const today = new Date();
        const endDate = new Date(target.endDate);
        const startDate = new Date(target.startDate);

        let daysRemaining = null;
        let totalDuration = null;
        let elapsed = null;

        if (isValid(endDate)) {
            daysRemaining = differenceInDays(endDate, today);
        }
        if (isValid(startDate) && isValid(endDate)) {
            totalDuration = differenceInDays(endDate, startDate);
            elapsed = differenceInDays(today, startDate);
        }

        return {
            result: {
                project: target.name,
                type: target.type || 'Unknown',
                scale: target.scale || 'Unknown',
                priority: target.priority || 'Medium',
                status: target.isDraft ? 'Draft' : 'Active',
                startDate: target.startDate,
                endDate: target.endDate,
                daysRemaining,
                timelineProgress: totalDuration > 0 ? Math.min(100, Math.round((elapsed / totalDuration) * 100)) : null,
                totalTasks: projectTasks.length,
                completedTasks: completedTasks.length,
                taskCompletion: projectTasks.length > 0
                    ? Math.round((completedTasks.length / projectTasks.length) * 100)
                    : 0,
            },
            suggestedActions: [],
        };
    }

    // Return portfolio overview
    const activeProjects = projects.filter(p => !p.isDraft);
    const draftProjects = projects.filter(p => p.isDraft);

    return {
        result: {
            totalProjects: projects.length,
            activeProjects: activeProjects.length,
            draftProjects: draftProjects.length,
            projects: projects.map(p => ({
                name: p.name,
                type: p.type || 'Unknown',
                status: p.isDraft ? 'Draft' : 'Active',
                priority: p.priority || 'Medium',
            })),
        },
        suggestedActions: [],
    };
}
