/**
 * toggleSandbox tool adapter
 * Returns a suggested action to toggle sandbox/draft mode for a project.
 */
export function toggleSandbox(params, appData) {
    const { projects } = appData;

    if (!projects || projects.length === 0) {
        return {
            result: { error: 'No projects available.' },
            suggestedActions: [],
        };
    }

    // Find the target project
    const projectName = params?.projectName;
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
                availableProjects: projects.map(p => p.name),
            },
            suggestedActions: [],
        };
    }

    // If no project specified, show draft status of all
    if (!target) {
        const draftProjects = projects.filter(p => p.isDraft);
        const activeProjects = projects.filter(p => !p.isDraft);
        return {
            result: {
                draftProjects: draftProjects.map(p => p.name),
                activeProjects: activeProjects.map(p => p.name),
                message: `${draftProjects.length} projects in draft mode, ${activeProjects.length} active.`,
            },
            suggestedActions: [],
        };
    }

    // Suggest toggling the target project
    const newDraftState = !target.isDraft;
    return {
        result: {
            project: target.name,
            currentMode: target.isDraft ? 'Draft/Sandbox' : 'Active',
            proposedMode: newDraftState ? 'Draft/Sandbox' : 'Active',
        },
        suggestedActions: [{
            id: `sandbox_${target.id}`,
            label: newDraftState ? 'Move to Sandbox' : 'Activate Project',
            description: `Change "${target.name}" from ${target.isDraft ? 'Draft' : 'Active'} to ${newDraftState ? 'Draft' : 'Active'} mode.`,
            type: 'SANDBOX',
            action: {
                type: 'UPDATE_PROJECT',
                projectId: target.id,
                changes: { isDraft: newDraftState },
            },
        }],
    };
}
