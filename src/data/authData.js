/**
 * Multi-Tenant Auth Data
 * Mock data for simulating multi-tenant RBAC on the frontend
 * 
 * Hierarchy:
 * - Studios (Regional offices in major cities)
 *   - Portfolios (Client accounts / Organizations)
 *     - Resources (Team members)
 * 
 * 3 Portfolios across different industries:
 * - Falcon Motors (Automotive) → London Studio
 * - NexGen Health (Pharmaceutical) → New York Studio
 * - Vertex Tech (Technology) → Singapore Studio
 */

// Regional Studios - highest level organizational unit
export const STUDIOS = {
    'studio-london': {
        id: 'studio-london',
        name: 'London Studio',
        city: 'London',
        country: 'UK',
        region: 'EMEA',
        timezone: 'Europe/London',
        flexiblePoolCapacity: 320, // Hours available in flexible pool
        theme: '#A100FF'
    },
    'studio-newyork': {
        id: 'studio-newyork',
        name: 'New York Studio',
        city: 'New York',
        country: 'USA',
        region: 'Americas',
        timezone: 'America/New_York',
        flexiblePoolCapacity: 480,
        theme: '#10B981'
    },
    'studio-singapore': {
        id: 'studio-singapore',
        name: 'Singapore Studio',
        city: 'Singapore',
        country: 'Singapore',
        region: 'APAC',
        timezone: 'Asia/Singapore',
        flexiblePoolCapacity: 240,
        theme: '#3B82F6'
    },
    'studio-berlin': {
        id: 'studio-berlin',
        name: 'Berlin Studio',
        city: 'Berlin',
        country: 'Germany',
        region: 'EMEA',
        timezone: 'Europe/Berlin',
        flexiblePoolCapacity: 160,
        theme: '#F59E0B'
    },
    'studio-sydney': {
        id: 'studio-sydney',
        name: 'Sydney Studio',
        city: 'Sydney',
        country: 'Australia',
        region: 'APAC',
        timezone: 'Australia/Sydney',
        flexiblePoolCapacity: 160,
        theme: '#EC4899'
    }
};

export const ORGANIZATIONS = {
    'org-falcon': {
        id: 'org-falcon',
        name: 'Falcon Automotive',
        industry: 'Automotive',
        slug: 'falcon',
        logo: null,
        theme: '#A100FF',
        // Studio associations
        primaryStudio: 'studio-london',
        studios: ['studio-london', 'studio-berlin'] // Can draw resources from these studios
    },
    'org-nexgen': {
        id: 'org-nexgen',
        name: 'Global Health',
        industry: 'Pharmaceutical',
        slug: 'globalhealth',
        logo: null,
        theme: '#10B981',
        primaryStudio: 'studio-newyork',
        studios: ['studio-newyork']
    },
    'org-vertex': {
        id: 'org-vertex',
        name: 'Zenith Tech',
        industry: 'Technology',
        slug: 'zenith',
        logo: null,
        theme: '#3B82F6',
        primaryStudio: 'studio-singapore',
        studios: ['studio-singapore', 'studio-sydney']
    },
    'org-urbanretail': {
        id: 'org-urbanretail',
        name: 'UrbanRetail',
        industry: 'Retail',
        slug: 'urbanretail',
        logo: null,
        theme: '#F59E0B',
        primaryStudio: 'studio-newyork',
        studios: ['studio-newyork', 'studio-london']
    }
};


export const USERS = {
    // === LONDON STUDIO ===
    // London Studio Lead
    'user-london-lead': {
        id: 'user-london-lead',
        name: 'Marcus Thorne',
        email: 'marcus@studio-london.com',
        org_id: null, // Studio Lead sees all orgs in studio
        studio_id: 'studio-london',
        role: 'Studio Lead',
        isFlexible: false,
        avatar: null
    },
    // Falcon Motors Team (Primary)
    'user-sarah': {
        id: 'user-sarah',
        name: 'Sarah Jenkins',
        email: 'sarah@falcon-motors.com',
        org_id: 'org-falcon',
        studio_id: 'studio-london',
        role: 'Admin',
        isFlexible: false,
        avatar: null
    },
    'user-mike': {
        id: 'user-mike',
        name: 'Mike Ross',
        email: 'mike@falcon-motors.com',
        org_id: 'org-falcon',
        studio_id: 'studio-london',
        role: 'User',
        isFlexible: false,
        avatar: null
    },
    'user-james': {
        id: 'user-james',
        name: 'James Wilson',
        email: 'james@falcon-motors.com',
        org_id: 'org-falcon',
        studio_id: 'studio-london',
        role: 'User',
        isFlexible: true, // Available for flex assignments
        avatar: null
    },
    // London Flexible Pool
    'user-olivia': {
        id: 'user-olivia',
        name: 'Olivia Martinez',
        email: 'olivia@studio-london.com',
        org_id: null, // No primary portfolio - pure flex
        studio_id: 'studio-london',
        role: 'User',
        isFlexible: true,
        specialization: 'Developer',
        avatar: null
    },
    'user-noah': {
        id: 'user-noah',
        name: 'Noah Thompson',
        email: 'noah@studio-london.com',
        org_id: null,
        studio_id: 'studio-london',
        role: 'User',
        isFlexible: true,
        specialization: 'Designer',
        avatar: null
    },

    // === NEW YORK STUDIO ===
    // New York Studio Lead
    'user-ny-lead': {
        id: 'user-ny-lead',
        name: 'Jessica Pearson',
        email: 'jessica@studio-newyork.com',
        org_id: null,
        studio_id: 'studio-newyork',
        role: 'Studio Lead',
        isFlexible: false,
        avatar: null
    },
    // NexGen Health Team (Primary)
    'user-emily': {
        id: 'user-emily',
        name: 'Emily Chen',
        email: 'emily@nexgen-health.com',
        org_id: 'org-nexgen',
        studio_id: 'studio-newyork',
        role: 'Admin',
        isFlexible: false,
        avatar: null
    },
    'user-david': {
        id: 'user-david',
        name: 'David Lee',
        email: 'david@nexgen-health.com',
        org_id: 'org-nexgen',
        studio_id: 'studio-newyork',
        role: 'User',
        isFlexible: false,
        avatar: null
    },
    'user-anna': {
        id: 'user-anna',
        name: 'Anna Garcia',
        email: 'anna@nexgen-health.com',
        org_id: 'org-nexgen',
        studio_id: 'studio-newyork',
        role: 'User',
        isFlexible: true,
        avatar: null
    },
    // New York Flexible Pool
    'user-ethan': {
        id: 'user-ethan',
        name: 'Ethan Brown',
        email: 'ethan@studio-newyork.com',
        org_id: null,
        studio_id: 'studio-newyork',
        role: 'User',
        isFlexible: true,
        specialization: 'Developer',
        avatar: null
    },
    'user-sophia': {
        id: 'user-sophia',
        name: 'Sophia Williams',
        email: 'sophia@studio-newyork.com',
        org_id: null,
        studio_id: 'studio-newyork',
        role: 'User',
        isFlexible: true,
        specialization: 'QA',
        avatar: null
    },
    'user-liam': {
        id: 'user-liam',
        name: 'Liam Johnson',
        email: 'liam@studio-newyork.com',
        org_id: null,
        studio_id: 'studio-newyork',
        role: 'User',
        isFlexible: true,
        specialization: 'Designer',
        avatar: null
    },

    // === SINGAPORE STUDIO ===
    // Singapore Studio Lead
    'user-singapore-lead': {
        id: 'user-singapore-lead',
        name: 'Wei Chen',
        email: 'wei@studio-singapore.com',
        org_id: null,
        studio_id: 'studio-singapore',
        role: 'Studio Lead',
        isFlexible: false,
        avatar: null
    },
    // Vertex Tech Team (Primary)
    'user-robert': {
        id: 'user-robert',
        name: 'Robert Taylor',
        email: 'robert@vertex-tech.com',
        org_id: 'org-vertex',
        studio_id: 'studio-singapore',
        role: 'Admin',
        isFlexible: false,
        avatar: null
    },
    'user-lisa': {
        id: 'user-lisa',
        name: 'Lisa Wong',
        email: 'lisa@vertex-tech.com',
        org_id: 'org-vertex',
        studio_id: 'studio-singapore',
        role: 'User',
        isFlexible: false,
        avatar: null
    },
    'user-tom': {
        id: 'user-tom',
        name: 'Tom Baker',
        email: 'tom@vertex-tech.com',
        org_id: 'org-vertex',
        studio_id: 'studio-singapore',
        role: 'User',
        isFlexible: true,
        avatar: null
    },
    // Singapore Flexible Pool
    'user-mei': {
        id: 'user-mei',
        name: 'Mei Lin',
        email: 'mei@studio-singapore.com',
        org_id: null,
        studio_id: 'studio-singapore',
        role: 'User',
        isFlexible: true,
        specialization: 'Developer',
        avatar: null
    },

    // === BERLIN STUDIO ===
    // Flexible Pool (No primary portfolio - supports Falcon Motors overflow)
    'user-hans': {
        id: 'user-hans',
        name: 'Hans Mueller',
        email: 'hans@studio-berlin.com',
        org_id: null,
        studio_id: 'studio-berlin',
        role: 'User',
        isFlexible: true,
        specialization: 'Developer',
        avatar: null
    },

    // === SYDNEY STUDIO ===
    // Flexible Pool (Supports Vertex Tech overflow)
    'user-jack': {
        id: 'user-jack',
        name: 'Jack O\'Brien',
        email: 'jack@studio-sydney.com',
        org_id: null,
        studio_id: 'studio-sydney',
        role: 'User',
        isFlexible: true,
        specialization: 'Designer',
        avatar: null
    }
};

// Helper functions
export const getUserById = (userId) => USERS[userId] || null;
export const getOrgById = (orgId) => ORGANIZATIONS[orgId] || null;
export const getStudioById = (studioId) => STUDIOS[studioId] || null;
export const getUsersByOrg = (orgId) => Object.values(USERS).filter(u => u.org_id === orgId);
export const getUsersByStudio = (studioId) => Object.values(USERS).filter(u => u.studio_id === studioId);
export const getFlexibleUsersByStudio = (studioId) => Object.values(USERS).filter(u => u.studio_id === studioId && u.isFlexible);
export const getAllUsers = () => Object.values(USERS);
export const getAllOrgs = () => Object.values(ORGANIZATIONS);
export const getAllStudios = () => Object.values(STUDIOS);
export const getOrgsByStudio = (studioId) => Object.values(ORGANIZATIONS).filter(o => o.studios?.includes(studioId));

// Default demo user
export const DEFAULT_DEMO_USER_ID = 'user-sarah';
