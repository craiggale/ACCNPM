/**
 * getCapacity tool adapter
 * Reads resources from AppContext and computes a utilization summary per role.
 */
import { normalizeRole } from '../../utils/ResolutionEngine';

export function getCapacity(params, appData) {
    const { resources, projects } = appData;

    if (!resources || resources.length === 0) {
        return {
            result: { error: 'No resource data available.' },
            suggestedActions: [],
        };
    }

    // Group by normalized role
    const roleMap = {};
    resources.forEach(r => {
        const role = normalizeRole(r.role);
        if (!roleMap[role]) {
            roleMap[role] = { count: 0, totalCapacity: 0, members: [] };
        }
        roleMap[role].count += 1;
        roleMap[role].totalCapacity += parseInt(r.capacity || 160);
        roleMap[role].members.push(r.name);
    });

    // Filter by role if specified
    const filterRole = params?.role;
    const roles = Object.entries(roleMap)
        .filter(([role]) => !filterRole || role.toLowerCase().includes(filterRole.toLowerCase()))
        .map(([role, data]) => ({
            role,
            headcount: data.count,
            totalMonthlyHours: data.totalCapacity,
            members: data.members,
        }));

    return {
        result: {
            totalResources: resources.length,
            totalProjects: projects?.length || 0,
            roles,
        },
        suggestedActions: [],
    };
}
