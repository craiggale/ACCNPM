import { addMonths, startOfMonth, endOfMonth, isWithinInterval, addWeeks, format, differenceInMonths } from 'date-fns';

// --- Helpers ---

// Duplicate from OperationalView (In real app, move to shared constants)
export const getRoleDistribution = (type) => {
    const map = {
        'Website': { 'Developer': 0.5, 'Designer': 0.3, 'QA': 0.1, 'Manager': 0.1 },
        'Configurator': { 'Developer': 0.6, 'Designer': 0.2, 'QA': 0.1, 'Manager': 0.1 },
        'Asset Production': { 'Designer': 0.8, 'Manager': 0.2 }
    };
    return map[type] || map['Website'];
};

export const normalizeRole = (role) => {
    const map = {
        'Frontend Lead': 'Developer',
        '3D Artist': 'Designer',
        'Product Owner': 'Product Owner',
        'Developer': 'Developer',
        'QA': 'QA',
        'Designer': 'Designer',
        'Manager': 'Manager'
    };
    return map[role] || role;
};

/**
 * ResolutionEngine
 * 
 * Heuristic engine to detect use contentions and generate resolution options
 * based on Time, Capacity, and Priority levers.
 */
export const ResolutionEngine = {

    /**
     * Detects if there is any resource overload in the sandbox environment.
     * @param {Array} projects - Mixed list of active and draft projects
     * @param {Array} resources - Allocatable resources
     * @returns {Object|null} - The first major contention found, or null
     */
    detectConflicts: (projects, resources) => {
        // 1. Map total capacity per role
        const roleCapacity = {};
        resources.forEach(r => {
            // Normalize role
            const role = normalizeRole(r.role);
            roleCapacity[role] = (roleCapacity[role] || 0) + parseInt(r.capacity);
        });

        // 2. Map demand per role per month
        const today = new Date();
        const months = Array.from({ length: 12 }, (_, i) => addMonths(today, i));

        for (const month of months) {
            const monthStart = startOfMonth(month);
            const monthEnd = endOfMonth(month);
            const monthKey = format(month, 'MMM yyyy');

            const demandMap = {};

            projects.forEach(p => {
                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);

                if (pStart <= monthEnd && pEnd >= monthStart) {
                    // Start with simple demand estimation
                    // In real app, this would use the detailed breakdown from OperationalView
                    let monthlyHours = 320; // Default Medium
                    if (p.scale === 'Small') monthlyHours = 160;
                    if (p.scale === 'Large') monthlyHours = 640;

                    // Distribute to roles based on project type heuristics
                    const distribution = getRoleDistribution(p.type || 'Website');

                    for (const [role, ratio] of Object.entries(distribution)) {
                        if (role === 'All') continue;
                        demandMap[role] = (demandMap[role] || 0) + (monthlyHours * ratio);
                    }
                }
            });

            // 3. Check for Overload
            for (const [role, demand] of Object.entries(demandMap)) {
                const capacity = roleCapacity[role] || 0;
                if (demand > capacity) {
                    return {
                        hasConflict: true,
                        role: role,
                        period: monthKey,
                        deficit: demand - capacity,
                        monthDate: monthStart
                    };
                }
            }
        }

        return null;
    },

    /**
     * Generates 3 distinct resolution options for a given conflict.
     * @param {Object} conflict - The contention object
     * @param {Array} projects - Current project list
     * @returns {Array} - [TimeOption, CapacityOption, PriorityOption]
     */
    generateSolutions: (conflict, projects) => {
        if (!conflict) return [];

        const solutions = [];

        // --- Option A: Time Lever (Shift Timeline) ---
        // Find the "Draft" project causing the issue (or any draft) and shift it.
        // If no draft exists, suggest shifting an active project involved in the conflict.
        let targetProject = projects.find(p => p.isDraft);

        // Fallback to active project if no draft found
        if (!targetProject && conflict) {
            targetProject = projects.find(p => {
                if (p.isDraft) return false;

                // Check overlap with conflict period
                const pStart = new Date(p.startDate);
                const pEnd = new Date(p.endDate);
                const conflictStart = conflict.monthDate;
                const conflictEnd = endOfMonth(conflictStart);

                if (!(pStart <= conflictEnd && pEnd >= conflictStart)) return false;

                // Check if project uses the conflicted role
                const distribution = getRoleDistribution(p.type || 'Website');
                return (distribution[conflict.role] || 0) > 0;
            });
        }

        if (targetProject) {
            // Heuristic: Shift start date by 1 month until it fits, or just suggest +2 months
            const shiftAmount = 2; // months
            solutions.push({
                id: 'opt_time',
                type: 'TIME',
                label: 'Shift Timeline',
                description: `Delay ${targetProject.isDraft ? 'draft' : 'active'} project "${targetProject.name}" start by ${shiftAmount} months to bypass the ${conflict.period} bottleneck.`,
                action: {
                    type: 'UPDATE_PROJECT', projectId: targetProject.id, changes: {
                        startDate: format(addMonths(new Date(targetProject.startDate), shiftAmount), 'yyyy-MM-dd'),
                        endDate: format(addMonths(new Date(targetProject.endDate), shiftAmount), 'yyyy-MM-dd')
                    }
                }
            });
        } else {
            solutions.push({ id: 'opt_time', type: 'TIME', label: 'Shift Timeline', description: 'No relevant projects found to shift.', disabled: true });
        }

        // --- Option B: Capacity Lever (Add Contractors) ---
        // Calculate headcount needed (assuming 160h/month per person)
        const headcount = Math.ceil(conflict.deficit / 160);
        const cost = headcount * 15000; // £15k per contractor month approx
        solutions.push({
            id: 'opt_cap',
            type: 'CAPACITY',
            label: 'Add Capacity',
            description: `Hire ${headcount} ${conflict.role} contractor${headcount > 1 ? 's' : ''} for ${conflict.period}. Est cost: £${cost.toLocaleString()}.`,
            action: {
                type: 'ADD_RESOURCE', resource: {
                    name: `Contractor (${conflict.role})`,
                    role: conflict.role,
                    capacity: 160 * headcount,
                    isContractor: true
                }
            }
        });

        // --- Option C: Priority Lever (Adjust Priority of Specific Projects) ---
        // Identify all active projects overlapping the conflict that use this role.
        const candidates = projects.filter(p => {
            if (p.isDraft) return false;

            // Check overlap
            const pStart = new Date(p.startDate);
            const pEnd = new Date(p.endDate);
            const conflictStart = conflict.monthDate;
            const conflictEnd = endOfMonth(conflictStart);
            if (!(pStart <= conflictEnd && pEnd >= conflictStart)) return false;

            // Check role usage
            const distribution = getRoleDistribution(p.type || 'Website');
            return (distribution[conflict.role] || 0) > 0;
        }).map(p => {
            // Estimate impact
            let monthlyHours = 320;
            if (p.scale === 'Small') monthlyHours = 160;
            if (p.scale === 'Large') monthlyHours = 640;
            const distribution = getRoleDistribution(p.type || 'Website');
            const roleRatio = distribution[conflict.role] || 0;

            return {
                ...p,
                roleImpact: Math.round(monthlyHours * roleRatio)
            };
        });

        if (candidates.length > 0) {
            solutions.push({
                id: 'opt_prio',
                type: 'PRIORITY',
                label: 'Adjust Priority',
                description: `Select a project to pause or resize to free up ${conflict.role} capacity.`,
                candidates: candidates, // Pass list to UI
                action: null // Action determined by user selection in UI
            });
        } else {
            solutions.push({
                id: 'opt_prio',
                type: 'PRIORITY',
                label: 'Adjust Priority',
                description: 'No active projects found to adjust in this period.',
                disabled: true
            });
        }

        return solutions;
    }
};

// --- Helpers moved to top ---
