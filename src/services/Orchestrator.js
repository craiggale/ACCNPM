/**
 * Orchestrator — Central dispatch engine for the AI Assistant.
 * 
 * Holds a registry of tool adapters and provides a dispatch method
 * that routes structured intents to the appropriate tool.
 * 
 * All tool execution is READ-ONLY — tools return results and suggested
 * actions but never mutate application state directly.
 */

import { resolveGaps } from './tools/resolveGaps';
import { getCapacity } from './tools/getCapacity';
import { toggleSandbox } from './tools/toggleSandbox';
import { adjustSchedule } from './tools/adjustSchedule';
import { getProjectStatus } from './tools/getProjectStatus';
import { assignResource } from './tools/assignResource';

// ─── Tool Registry ───────────────────────────────────────────────────

const TOOL_REGISTRY = {
    resolve_gaps: {
        handler: resolveGaps,
        label: 'Resolution Engine',
        description: 'Detect and resolve resource conflicts and overbookings.',
    },
    get_capacity: {
        handler: getCapacity,
        label: 'Team Capacity',
        description: 'Get team capacity overview by role.',
    },
    toggle_sandbox: {
        handler: toggleSandbox,
        label: 'Sandbox Mode',
        description: 'Toggle sandbox/draft mode for a project.',
    },
    adjust_schedule: {
        handler: adjustSchedule,
        label: 'Scheduler',
        description: 'Shift project timelines forward or backward.',
    },
    get_project_status: {
        handler: getProjectStatus,
        label: 'Project Status',
        description: 'Get project health and progress summary.',
    },
    assign_resource: {
        handler: assignResource,
        label: 'Resource Assignment',
        description: 'Assign a team member to a project.',
    },
};

// ─── Orchestrator ────────────────────────────────────────────────────

export const Orchestrator = {
    /**
     * Get the list of registered tools and their descriptions.
     * Used to provide context to the LLM about what's available.
     */
    getAvailableTools() {
        return Object.entries(TOOL_REGISTRY).map(([key, tool]) => ({
            action: key,
            label: tool.label,
            description: tool.description,
        }));
    },

    /**
     * Dispatch an intent to the appropriate tool.
     * 
     * @param {string} action   - The action name (e.g. 'resolve_gaps')
     * @param {object} params   - Parameters for the tool
     * @param {object} appData  - Current application data snapshot from AppContext
     * @returns {{ result: object, suggestedActions: Array, toolLabel: string }}
     */
    dispatch(action, params = {}, appData = {}) {
        const tool = TOOL_REGISTRY[action];

        if (!tool) {
            return {
                result: {
                    error: `Unknown action "${action}".`,
                    availableActions: Object.keys(TOOL_REGISTRY),
                },
                suggestedActions: [],
                toolLabel: 'Unknown',
            };
        }

        try {
            const { result, suggestedActions } = tool.handler(params, appData);
            return {
                result,
                suggestedActions: suggestedActions || [],
                toolLabel: tool.label,
            };
        } catch (error) {
            console.error(`Orchestrator: Error executing "${action}":`, error);
            return {
                result: {
                    error: `Tool "${tool.label}" encountered an error: ${error.message}`,
                },
                suggestedActions: [],
                toolLabel: tool.label,
            };
        }
    },

    /**
     * Apply a confirmed action to the application state.
     * This is the ONLY place where mutations happen, and only 
     * after explicit user confirmation.
     * 
     * @param {object} action        - The action to apply (from suggestedActions)
     * @param {object} appContext    - The AppContext with mutator functions
     */
    applyAction(action, appContext) {
        if (!action || !action.action) {
            console.warn('Orchestrator: No action to apply.');
            return false;
        }

        const { type, projectId, changes, resource } = action.action;

        switch (type) {
            case 'UPDATE_PROJECT': {
                if (appContext.updateProjectFields) {
                    appContext.updateProjectFields(projectId, changes);
                    return true;
                }
                // Fallback: update via setProjects if available
                if (appContext.setProjects) {
                    appContext.setProjects(prev =>
                        prev.map(p => p.id === projectId ? { ...p, ...changes } : p)
                    );
                    return true;
                }
                return false;
            }

            case 'ADD_RESOURCE': {
                if (appContext.addResource) {
                    appContext.addResource({
                        ...resource,
                        id: `contractor-${Date.now()}`,
                    });
                    return true;
                }
                return false;
            }

            case 'ASSIGN_RESOURCE': {
                const { resourceId, changes: resourceChanges } = action.action;
                if (appContext.updateResource) {
                    appContext.updateResource(resourceId, resourceChanges);
                    return true;
                }
                // Fallback: update via setResources if available
                if (appContext.setResources) {
                    appContext.setResources(prev =>
                        prev.map(r => r.id === resourceId ? { ...r, ...resourceChanges } : r)
                    );
                    return true;
                }
                return false;
            }

            default:
                console.warn(`Orchestrator: Unknown action type "${type}".`);
                return false;
        }
    },
};

export default Orchestrator;
