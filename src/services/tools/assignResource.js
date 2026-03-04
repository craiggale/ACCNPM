/**
 * assignResource tool adapter
 * Finds a matching resource and project, validates compatibility,
 * and proposes an assignment for user confirmation.
 */

export function assignResource(params, appData) {
    const { resources, projects } = appData;

    if (!resources || !projects) {
        return {
            result: { error: 'No resource or project data available.' },
            suggestedActions: [],
        };
    }

    const { resourceName, projectName, role } = params || {};

    // ── If no resource or project specified, list what's available ────
    if (!resourceName && !projectName) {
        return {
            result: {
                message: 'Please specify a resource name and/or a project name.',
                availableResources: resources.map(r => ({
                    name: r.name,
                    role: r.role,
                    team: r.team,
                    currentOrg: r.org_id || 'Flexible Pool',
                })),
                availableProjects: projects.map(p => ({
                    name: p.name,
                    status: p.status,
                    org_id: p.org_id,
                })),
            },
            suggestedActions: [],
        };
    }

    // ── Find matching resource ───────────────────────────────────────
    let matchedResource = null;

    if (resourceName) {
        matchedResource = resources.find(r =>
            r.name.toLowerCase().includes(resourceName.toLowerCase())
        );
    } else if (role) {
        // Find first available resource matching the role
        matchedResource = resources.find(r =>
            r.role.toLowerCase().includes(role.toLowerCase()) &&
            (r.isFlexible || !r.org_id)
        );
    }

    if (!matchedResource && resourceName) {
        return {
            result: {
                error: `Resource "${resourceName}" not found.`,
                availableResources: resources.map(r => r.name),
            },
            suggestedActions: [],
        };
    }

    if (!matchedResource && role) {
        return {
            result: {
                error: `No available resource found with role "${role}".`,
                availableByRole: resources
                    .filter(r => r.role.toLowerCase().includes(role.toLowerCase()))
                    .map(r => ({ name: r.name, role: r.role, currentOrg: r.org_id || 'Flexible Pool' })),
            },
            suggestedActions: [],
        };
    }

    // ── Find matching project ────────────────────────────────────────
    let matchedProject = null;

    if (projectName) {
        matchedProject = projects.find(p =>
            p.name.toLowerCase().includes(projectName.toLowerCase())
        );
    }

    if (!matchedProject && projectName) {
        return {
            result: {
                error: `Project "${projectName}" not found.`,
                resource: { name: matchedResource?.name, role: matchedResource?.role },
                availableProjects: projects.map(p => p.name),
            },
            suggestedActions: [],
        };
    }

    // Need at least a project to assign to
    if (!matchedProject) {
        return {
            result: {
                message: 'Please specify which project to assign the resource to.',
                resource: { name: matchedResource.name, role: matchedResource.role },
                availableProjects: projects.map(p => ({
                    name: p.name,
                    status: p.status,
                })),
            },
            suggestedActions: [],
        };
    }

    // ── Validate: already assigned? ──────────────────────────────────
    if (matchedResource.org_id === matchedProject.org_id) {
        return {
            result: {
                status: 'already_assigned',
                message: `${matchedResource.name} is already assigned to the ${matchedProject.org_id} portfolio which includes "${matchedProject.name}".`,
                resource: {
                    name: matchedResource.name,
                    role: matchedResource.role,
                    currentOrg: matchedResource.org_id,
                },
                project: {
                    name: matchedProject.name,
                    org_id: matchedProject.org_id,
                },
            },
            suggestedActions: [],
        };
    }

    // ── Build assignment proposal ────────────────────────────────────
    const previousOrg = matchedResource.org_id || 'Flexible Pool';

    return {
        result: {
            status: 'assignment_ready',
            message: `Ready to assign ${matchedResource.name} (${matchedResource.role}) to "${matchedProject.name}".`,
            resource: {
                id: matchedResource.id,
                name: matchedResource.name,
                role: matchedResource.role,
                team: matchedResource.team,
                previousOrg,
                isFlexible: matchedResource.isFlexible,
                capacity: matchedResource.capacity,
            },
            project: {
                id: matchedProject.id,
                name: matchedProject.name,
                status: matchedProject.status,
                org_id: matchedProject.org_id,
                type: matchedProject.type,
            },
        },
        suggestedActions: [{
            id: `assign_${matchedResource.id}_to_${matchedProject.id}`,
            label: `Assign ${matchedResource.name} to ${matchedProject.name}`,
            description: `Move ${matchedResource.name} (${matchedResource.role}) from ${previousOrg} to "${matchedProject.name}" (${matchedProject.org_id}).`,
            type: 'RESOURCE',
            action: {
                type: 'ASSIGN_RESOURCE',
                resourceId: matchedResource.id,
                projectId: matchedProject.id,
                changes: {
                    org_id: matchedProject.org_id,
                },
            },
        }],
    };
}
