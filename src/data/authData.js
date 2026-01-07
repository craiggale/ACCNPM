/**
 * Multi-Tenant Auth Data
 * Mock data for simulating multi-tenant RBAC on the frontend
 * Note: "Organizations" are referred to as "Portfolios" in the UI
 * 
 * 3 Portfolios across different industries:
 * - Falcon Motors (Automotive)
 * - NexGen Health (Pharmaceutical)  
 * - Vertex Tech (Technology)
 */

export const ORGANIZATIONS = {
    'org-falcon': {
        id: 'org-falcon',
        name: 'Falcon Motors',
        industry: 'Automotive',
        slug: 'falcon',
        logo: null,
        theme: '#A100FF'
    },
    'org-nexgen': {
        id: 'org-nexgen',
        name: 'NexGen Health',
        industry: 'Pharmaceutical',
        slug: 'nexgen',
        logo: null,
        theme: '#10B981'
    },
    'org-vertex': {
        id: 'org-vertex',
        name: 'Vertex Tech',
        industry: 'Technology',
        slug: 'vertex',
        logo: null,
        theme: '#3B82F6'
    }
};

export const USERS = {
    // Falcon Motors Team
    'user-sarah': {
        id: 'user-sarah',
        name: 'Sarah Jenkins',
        email: 'sarah@falcon-motors.com',
        org_id: 'org-falcon',
        role: 'Admin',
        avatar: null
    },
    'user-mike': {
        id: 'user-mike',
        name: 'Mike Ross',
        email: 'mike@falcon-motors.com',
        org_id: 'org-falcon',
        role: 'User',
        avatar: null
    },
    'user-james': {
        id: 'user-james',
        name: 'James Wilson',
        email: 'james@falcon-motors.com',
        org_id: 'org-falcon',
        role: 'User',
        avatar: null
    },

    // NexGen Health Team
    'user-emily': {
        id: 'user-emily',
        name: 'Emily Chen',
        email: 'emily@nexgen-health.com',
        org_id: 'org-nexgen',
        role: 'Admin',
        avatar: null
    },
    'user-david': {
        id: 'user-david',
        name: 'David Lee',
        email: 'david@nexgen-health.com',
        org_id: 'org-nexgen',
        role: 'User',
        avatar: null
    },
    'user-anna': {
        id: 'user-anna',
        name: 'Anna Garcia',
        email: 'anna@nexgen-health.com',
        org_id: 'org-nexgen',
        role: 'User',
        avatar: null
    },

    // Vertex Tech Team
    'user-robert': {
        id: 'user-robert',
        name: 'Robert Taylor',
        email: 'robert@vertex-tech.com',
        org_id: 'org-vertex',
        role: 'Admin',
        avatar: null
    },
    'user-lisa': {
        id: 'user-lisa',
        name: 'Lisa Wong',
        email: 'lisa@vertex-tech.com',
        org_id: 'org-vertex',
        role: 'User',
        avatar: null
    },
    'user-tom': {
        id: 'user-tom',
        name: 'Tom Baker',
        email: 'tom@vertex-tech.com',
        org_id: 'org-vertex',
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
