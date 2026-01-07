/**
 * Multi-Tenant Auth Data
 * Mock data for simulating multi-tenant RBAC on the frontend
 * Note: "Organizations" are referred to as "Portfolios" in the UI
 */

export const ORGANIZATIONS = {
    'org-acme': {
        id: 'org-acme',
        name: 'Acme Portfolio',
        logo: null,
        theme: '#A100FF'
    },
    'org-globex': {
        id: 'org-globex',
        name: 'Globex Portfolio',
        logo: null,
        theme: '#10B981'
    }
};


export const USERS = {
    'user-sarah': {
        id: 'user-sarah',
        name: 'Sarah Jenkins',
        email: 'sarah@acme.com',
        org_id: 'org-acme',
        role: 'Admin',
        avatar: null
    },
    'user-mike': {
        id: 'user-mike',
        name: 'Mike Ross',
        email: 'mike@acme.com',
        org_id: 'org-acme',
        role: 'User',
        avatar: null
    },
    'user-emily': {
        id: 'user-emily',
        name: 'Emily Chen',
        email: 'emily@globex.com',
        org_id: 'org-globex',
        role: 'Admin',
        avatar: null
    },
    'user-david': {
        id: 'user-david',
        name: 'David Lee',
        email: 'david@globex.com',
        org_id: 'org-globex',
        role: 'User',
        avatar: null
    }
};

// Helper functions
export const getUserById = (userId) => USERS[userId] || null;
export const getOrgById = (orgId) => ORGANIZATIONS[orgId] || null;
export const getUsersByOrg = (orgId) => Object.values(USERS).filter(u => u.org_id === orgId);
export const getAllUsers = () => Object.values(USERS);
export const getAllOrgs = () => Object.values(ORGANIZATIONS);

// Default demo user
export const DEFAULT_DEMO_USER_ID = 'user-sarah';
