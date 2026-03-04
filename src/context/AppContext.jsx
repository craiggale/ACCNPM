import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { subWeeks, addWeeks, format, differenceInDays, addDays } from 'date-fns';
import { useAuth } from './AuthContext';
import {
  useProjects, useCreateProject, useUpdateProject, useDeleteProject, useUpdateGateway,
  useTasks, useCreateTask, useUpdateTask, useDeleteTask,
  useResources, useCreateResource, useUpdateResource, useDeleteResource,
  useInitiatives, useCreateInitiative, useUpdateInitiative, useDeleteInitiative,
  useLinkTaskToInitiative, useUnlinkTaskFromInitiative
} from '../hooks/useApi';

const AppContext = createContext();


const INITIAL_TASK_TEMPLATES = {
  'Website': {
    'Small': [
      { title: 'Landing Page Design', estimate: 20, gatewayDependency: 'Design Sign-off' },
      { title: 'Copywriting', estimate: 10, gatewayDependency: 'Content Approval' },
      { title: 'Frontend Dev', estimate: 30 },
      { title: 'QA', estimate: 10 }
    ],
    'Medium': [
      { title: 'UX Strategy', estimate: 40 },
      { title: 'UI Design', estimate: 60, gatewayDependency: 'Design Sign-off' },
      { title: 'Frontend Development', estimate: 120 },
      { title: 'CMS Integration', estimate: 80, gatewayDependency: 'Content Approval' },
      { title: 'UAT', estimate: 40 },
      { title: 'Launch', estimate: 20 }
    ],
    'Large': [
      { title: 'Global Strategy', estimate: 80 },
      { title: 'Regional Localization', estimate: 100 },
      { title: 'Full Stack Development', estimate: 300 },
      { title: 'Performance Testing', estimate: 80 },
      { title: 'Security Audit', estimate: 60 },
      { title: 'Global Rollout', estimate: 40 }
    ]
  },
  'Configurator': {
    'Small': [
      { title: '3D Model Optimization', estimate: 30, gatewayDependency: '3D Asset Freeze' },
      { title: 'Basic Logic Setup', estimate: 20 },
      { title: 'UI Skinning', estimate: 30 }
    ],
    'Medium': [
      { title: '3D Asset Prep', estimate: 80, gatewayDependency: '3D Asset Freeze' },
      { title: 'Logic Programming', estimate: 100 },
      { title: 'UI Implementation', estimate: 80 },
      { title: 'Integration Testing', estimate: 40 }
    ],
    'Large': [
      { title: 'High-Poly Asset Pipeline', estimate: 160, gatewayDependency: '3D Asset Freeze' },
      { title: 'Complex Pricing Logic', estimate: 120 },
      { title: 'WebGL Optimization', estimate: 100 },
      { title: 'Multi-Market Rollout', estimate: 80 },
      { title: 'Post-Launch Support', estimate: 40 }
    ]
  },
  'Asset Production': {
    'Small': [
      { title: 'Teaser Images', estimate: 20, gatewayDependency: 'Creative Brief' },
      { title: 'Social Assets', estimate: 20 }
    ],
    'Medium': [
      { title: 'CGI Stills', estimate: 80, gatewayDependency: 'Creative Brief' },
      { title: 'Lifestyle Retouching', estimate: 40 },
      { title: '360 Spins', estimate: 60 }
    ],
    'Large': [
      { title: 'TVC Production', estimate: 200, gatewayDependency: 'Creative Brief' },
      { title: 'Full CGI Video', estimate: 300 },
      { title: 'Global Campaign Assets', estimate: 150 },
      { title: 'Print High-Res', estimate: 80 }
    ]
  }
};

const INITIAL_GATEWAY_TEMPLATES = {
  'Website': {
    'Small': [{ name: 'Design Sign-off', offsetWeeks: 2 }, { name: 'Content Approval', offsetWeeks: 1 }],
    'Medium': [{ name: 'Design Sign-off', offsetWeeks: 4 }, { name: 'Content Approval', offsetWeeks: 2 }, { name: 'QA Sign-off', offsetWeeks: 1 }],
    'Large': [{ name: 'Global Strategy Approval', offsetWeeks: 6 }, { name: 'Design Sign-off', offsetWeeks: 4 }, { name: 'Security Review', offsetWeeks: 2 }]
  },
  'Configurator': {
    'Small': [{ name: '3D Asset Freeze', offsetWeeks: 2 }],
    'Medium': [{ name: '3D Asset Freeze', offsetWeeks: 3 }, { name: 'Pricing Logic Approval', offsetWeeks: 2 }, { name: 'UAT Sign-off', offsetWeeks: 1 }],
    'Large': [{ name: '3D Asset Freeze', offsetWeeks: 4 }, { name: 'Pricing Logic Approval', offsetWeeks: 3 }, { name: 'Performance Test', offsetWeeks: 2 }]
  },
  'Asset Production': {
    'Small': [{ name: 'Creative Brief', offsetWeeks: 1 }],
    'Medium': [{ name: 'Creative Brief', offsetWeeks: 2 }, { name: 'Low-Res Review', offsetWeeks: 1 }, { name: 'High-Res Final', offsetWeeks: 1 }],
    'Large': [{ name: 'Creative Brief', offsetWeeks: 3 }, { name: 'Low-Res Review', offsetWeeks: 2 }, { name: 'Legal Approval', offsetWeeks: 1 }]
  }
};

export const AppProvider = ({ children }) => {
  // Get auth context for hybrid tenancy
  const authContext = useAuth();
  const isDemoMode = authContext?.isDemoMode ?? true;

  // ============= REACT QUERY HOOKS (Backend Integration) =============
  // These hooks fetch from backend API when not in demo mode
  const projectsQuery = useProjects({ enabled: !isDemoMode });
  const tasksQuery = useTasks(null, { enabled: !isDemoMode });
  const resourcesQuery = useResources({ enabled: !isDemoMode });
  const initiativesQuery = useInitiatives({ enabled: !isDemoMode });

  // Mutation hooks for backend operations
  const createProjectMutation = useCreateProject();
  const updateProjectMutation = useUpdateProject();
  const deleteProjectMutation = useDeleteProject();
  const updateGatewayMutation = useUpdateGateway();

  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  const createResourceMutation = useCreateResource();
  const updateResourceMutation = useUpdateResource();
  const deleteResourceMutation = useDeleteResource();

  const createInitiativeMutation = useCreateInitiative();
  const updateInitiativeMutation = useUpdateInitiative();
  const deleteInitiativeMutation = useDeleteInitiative();
  const linkTaskMutation = useLinkTaskToInitiative();
  const unlinkTaskMutation = useUnlinkTaskFromInitiative();

  // Admin State
  const [teams, setTeams] = useState(['Website', 'Configurator', 'Asset Production']);
  const [markets, setMarkets] = useState(['US', 'UK', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'Canada']);
  const [taskTemplates, setTaskTemplates] = useState(INITIAL_TASK_TEMPLATES);
  const [gatewayTemplates, setGatewayTemplates] = useState(INITIAL_GATEWAY_TEMPLATES);


  // Mock Data - Projects (3 per portfolio = 9 total)
  const [projects, setProjects] = useState([
    // ========== FALCON MOTORS (Automotive) ==========
    {
      id: 1,
      name: 'Falcon GT Website',
      code: 'FGT-001',
      status: 'Active',
      health: 'On Track',
      pm: 'Sarah Jenkins',
      pmUserId: 'user-sarah',
      org_id: 'org-falcon',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      originalEndDate: '2026-06-30',
      type: 'Website',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-06-30',
          inputGateways: [
            { name: 'Design Sign-off', status: 'Received', expectedDate: '2026-02-01', receivedDate: '2026-01-28' },
            { name: 'Content Approval', status: 'Pending', expectedDate: '2026-03-15', receivedDate: null }
          ]
        },
        {
          market: 'US',
          goalLive: '2026-07-15',
          inputGateways: [
            { name: 'Legal Review', status: 'Received', expectedDate: '2026-04-01', receivedDate: '2026-03-28' },
            { name: 'Localization Complete', status: 'In Progress', expectedDate: '2026-05-15', receivedDate: null }
          ]
        },
        {
          market: 'UK',
          goalLive: '2026-07-30',
          inputGateways: [
            { name: 'Legal Review', status: 'Pending', expectedDate: '2026-05-01', receivedDate: null },
            { name: 'Localization Complete', status: 'Pending', expectedDate: '2026-06-15', receivedDate: null }
          ]
        },
        {
          market: 'Germany',
          goalLive: '2026-08-15',
          inputGateways: [
            { name: 'Legal Review', status: 'Pending', expectedDate: '2026-06-01', receivedDate: null },
            { name: 'Localization Complete', status: 'Pending', expectedDate: '2026-07-15', receivedDate: null }
          ]
        }
      ]
    },
    {
      id: 2,
      name: 'Eagle SUV Configurator',
      code: 'ESC-002',
      status: 'Active',
      health: 'At Risk',
      pm: 'Mike Ross',
      pmUserId: 'user-mike',
      org_id: 'org-falcon',
      startDate: '2026-02-01',
      endDate: '2026-07-31',
      originalEndDate: '2026-07-15',
      type: 'Configurator',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-07-31',
          inputGateways: [
            { name: '3D Asset Freeze', status: 'Pending', expectedDate: '2026-03-01', receivedDate: null },
            { name: 'Pricing Logic Approval', status: 'Pending', expectedDate: '2026-04-15', receivedDate: null }
          ]
        },
        {
          market: 'US',
          goalLive: '2026-08-15',
          inputGateways: [
            { name: 'EPA Compliance', status: 'In Progress', expectedDate: '2026-05-01', receivedDate: null },
            { name: 'Dealer Portal Setup', status: 'Pending', expectedDate: '2026-06-15', receivedDate: null }
          ]
        },
        {
          market: 'Japan',
          goalLive: '2026-09-30',
          inputGateways: [
            { name: 'JIS Compliance', status: 'Pending', expectedDate: '2026-07-01', receivedDate: null },
            { name: 'Japanese Localization', status: 'Pending', expectedDate: '2026-08-15', receivedDate: null }
          ]
        }
      ]
    },
    {
      id: 3,
      name: 'Phoenix EV Campaign',
      code: 'PEC-003',
      status: 'Planning',
      health: 'On Track',
      pm: 'James Wilson',
      pmUserId: 'user-james',
      org_id: 'org-falcon',
      startDate: '2026-04-01',
      endDate: '2026-09-30',
      originalEndDate: '2026-09-30',
      type: 'Asset Production',
      scale: 'Medium',
      isResourceDriven: true,
      totalEffort: 480, // With spare capacity, can complete in ~3 months instead of 6
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-09-30',
          inputGateways: [
            { name: 'Creative Brief Approval', status: 'Received', expectedDate: '2026-04-15', receivedDate: '2026-04-10' },
            { name: 'Media Buy Confirmation', status: 'Pending', expectedDate: '2026-06-01', receivedDate: null }
          ]
        },
        {
          market: 'US',
          goalLive: '2026-10-15',
          inputGateways: [
            { name: 'FTC Compliance', status: 'Pending', expectedDate: '2026-07-01', receivedDate: null }
          ]
        },
        {
          market: 'UK',
          goalLive: '2026-10-30',
          inputGateways: [
            { name: 'ASA Compliance', status: 'Pending', expectedDate: '2026-08-01', receivedDate: null }
          ]
        }
      ]
    },

    // ========== NEXGEN HEALTH (Pharmaceutical) ==========
    {
      id: 4,
      name: 'Patient Portal Redesign',
      code: 'PPR-004',
      status: 'Active',
      health: 'On Track',
      pm: 'Emily Chen',
      pmUserId: 'user-emily',
      org_id: 'org-nexgen',
      startDate: '2026-01-15',
      endDate: '2026-05-31',
      originalEndDate: '2026-05-31',
      type: 'Website',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'US',
          goalLive: '2026-05-31',
          inputGateways: [
            { name: 'Design Sign-off', status: 'Received', expectedDate: '2026-02-15', receivedDate: '2026-02-10' },
            { name: 'Content Approval', status: 'Received', expectedDate: '2026-03-01', receivedDate: '2026-03-01' }
          ]
        }
      ]
    },
    {
      id: 5,
      name: 'Sales Rep CRM Dashboard',
      code: 'SRC-005',
      status: 'Active',
      health: 'Late',
      pm: 'David Lee',
      pmUserId: 'user-david',
      org_id: 'org-nexgen',
      startDate: '2026-01-01',
      endDate: '2026-04-30',
      originalEndDate: '2026-03-31',
      type: 'Configurator',
      scale: 'Small',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-04-30',
          inputGateways: [
            {
              name: '3D Asset Freeze', status: 'Received', expectedDate: '2026-01-15', receivedDate: '2026-01-20', versions: [
                { version: 1, status: 'Late', date: '2026-01-20', isOnTime: false, notes: 'Delayed due to data migration' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 6,
      name: 'Product Launch Assets',
      code: 'PLA-006',
      status: 'Proposed',
      health: 'On Track',
      pm: 'Anna Garcia',
      pmUserId: 'user-anna',
      org_id: 'org-nexgen',
      startDate: '2026-06-01',
      endDate: '2026-10-31',
      originalEndDate: '2026-10-31',
      type: 'Asset Production',
      scale: 'Large',
      isResourceDriven: true,
      totalEffort: 1920, // Large effort - will need significant capacity
      launchDetails: []
    },

    // ========== VERTEX TECH (Technology) ==========
    {
      id: 7,
      name: 'Analytics Dashboard v2',
      code: 'ADV-007',
      status: 'Active',
      health: 'On Track',
      pm: 'Robert Taylor',
      pmUserId: 'user-robert',
      org_id: 'org-vertex',
      startDate: '2026-02-01',
      endDate: '2026-06-30',
      originalEndDate: '2026-06-30',
      type: 'Website',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-06-30',
          inputGateways: [
            { name: 'Design Sign-off', status: 'Received', expectedDate: '2026-03-01', receivedDate: '2026-02-28' },
            { name: 'QA Sign-off', status: 'Pending', expectedDate: '2026-05-15', receivedDate: null }
          ]
        }
      ]
    },
    {
      id: 8,
      name: 'Developer Platform',
      code: 'DEV-008',
      status: 'Active',
      health: 'At Risk',
      pm: 'Lisa Wong',
      pmUserId: 'user-lisa',
      org_id: 'org-vertex',
      startDate: '2026-01-01',
      endDate: '2026-08-31',
      originalEndDate: '2026-07-31',
      type: 'Configurator',
      scale: 'Large',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-08-31',
          inputGateways: [
            { name: '3D Asset Freeze', status: 'Received', expectedDate: '2026-02-15', receivedDate: '2026-02-14' },
            { name: 'Security Review', status: 'Pending', expectedDate: '2026-06-01', receivedDate: null }
          ]
        }
      ]
    },
    {
      id: 9,
      name: 'Brand Campaign 2026',
      code: 'BC-009',
      status: 'Planning',
      health: 'On Track',
      pm: 'Tom Baker',
      pmUserId: 'user-tom',
      org_id: 'org-vertex',
      startDate: '2026-05-01',
      endDate: '2026-11-30',
      originalEndDate: '2026-11-30',
      type: 'Asset Production',
      scale: 'Medium',
      launchDetails: []
    }
  ]);


  // Mock Data - Resources (organized by Studio → Portfolio)
  const [resources, setResources] = useState([
    // === LONDON STUDIO ===
    // Falcon Motors Team (Primary)
    { id: 1, name: 'Sarah Jenkins', role: 'Frontend Lead', team: 'Website', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-sarah', isFlexible: false, internalRate: 120, clientRate: 150 },
    { id: 2, name: 'Mike Ross', role: '3D Artist', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-mike', isFlexible: false, internalRate: 95, clientRate: 120 },
    { id: 3, name: 'James Wilson', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-james', isFlexible: true, internalRate: 85, clientRate: 110 },
    // London Flexible Pool
    { id: 10, name: 'Olivia Martinez', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-london', userId: 'user-olivia', isFlexible: true, internalRate: 100, clientRate: 130 },
    { id: 11, name: 'Noah Thompson', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-london', userId: 'user-noah', isFlexible: true, internalRate: 90, clientRate: 115 },
    // ADDED: Resources to fully staff Falcon GT (Website) and Phoenix EV (Asset Production)
    { id: 18, name: 'Emma Davis', role: 'QA', team: 'Website', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-emma', isFlexible: false, internalRate: 90, clientRate: 115 },
    { id: 19, name: 'Lucas Miller', role: 'Manager', team: 'Website', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-lucas', isFlexible: false, internalRate: 140, clientRate: 180 },
    { id: 20, name: 'Sophia Clark', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-sophia', isFlexible: false, internalRate: 85, clientRate: 110 },
    { id: 21, name: 'Oliver White', role: 'Manager', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-falcon', studio_id: 'studio-london', userId: 'user-oliver', isFlexible: false, internalRate: 140, clientRate: 180 },

    // === NEW YORK STUDIO ===
    // NexGen Health Team (Primary)
    { id: 4, name: 'Emily Chen', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: 'org-nexgen', studio_id: 'studio-newyork', userId: 'user-emily', isFlexible: false, internalRate: 110, clientRate: 140 },
    { id: 5, name: 'David Lee', role: 'Product Owner', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-nexgen', studio_id: 'studio-newyork', userId: 'user-david', isFlexible: false, internalRate: 130, clientRate: 165 },
    { id: 6, name: 'Anna Garcia', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-nexgen', studio_id: 'studio-newyork', userId: 'user-anna', isFlexible: true, internalRate: 85, clientRate: 110 },
    // New York Flexible Pool
    { id: 12, name: 'Ethan Brown', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-newyork', userId: 'user-ethan', isFlexible: true, internalRate: 105, clientRate: 135 },
    { id: 13, name: 'Sophia Williams', role: 'QA', team: 'Asset Production', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-newyork', userId: 'user-sophia', isFlexible: true, internalRate: 75, clientRate: 100 },
    { id: 14, name: 'Liam Johnson', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-newyork', userId: 'user-liam', isFlexible: true, internalRate: 88, clientRate: 115 },

    // === SINGAPORE STUDIO ===
    // Vertex Tech Team (Primary)
    { id: 7, name: 'Robert Taylor', role: 'Manager', team: 'Website', capacity: 160, leave: 0, org_id: 'org-vertex', studio_id: 'studio-singapore', userId: 'user-robert', isFlexible: false, internalRate: 150, clientRate: 190 },
    { id: 8, name: 'Lisa Wong', role: 'Developer', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-vertex', studio_id: 'studio-singapore', userId: 'user-lisa', isFlexible: false, internalRate: 105, clientRate: 135 },
    { id: 9, name: 'Tom Baker', role: 'QA', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-vertex', studio_id: 'studio-singapore', userId: 'user-tom', isFlexible: true, internalRate: 80, clientRate: 105 },
    // Singapore Flexible Pool
    { id: 15, name: 'Mei Lin', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-singapore', userId: 'user-mei', isFlexible: true, internalRate: 95, clientRate: 125 },

    // === BERLIN STUDIO ===
    // Flexible Pool (supports Falcon Motors overflow via EMEA region)
    { id: 16, name: 'Hans Mueller', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-berlin', userId: 'user-hans', isFlexible: true, internalRate: 100, clientRate: 130 },

    // === SYDNEY STUDIO ===
    // Flexible Pool (supports Vertex Tech overflow via APAC region)
    { id: 17, name: 'Jack O\'Brien', role: 'Designer', team: 'Asset Production', capacity: 160, leave: 0, org_id: null, studio_id: 'studio-sydney', userId: 'user-jack', isFlexible: true, internalRate: 92, clientRate: 120 },
  ]);

  // Mock Data - Initiatives (multiple per portfolio for richer demo)
  const [initiatives, setInitiatives] = useState([
    // Falcon Motors initiatives
    {
      id: 1,
      name: 'Design System Automation',
      businessGoal: 'Reduce design-to-development handoff time by 40%',
      status: 'On Track',
      valueProposition: 'Automate component generation from Figma designs.',
      changeType: 'Automate Task',
      startDate: '2026-01-01',
      org_id: 'org-falcon',
      valueMetrics: ['Efficiency Gains - FTE Hour Reduction (Hrs)', 'Efficiency Gains - FTE Fee Reduction (£)'],
      impactedTasks: [
        { taskId: 1001, taskTitle: 'Frontend Development', projectId: 1, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 40 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 2000 }], dateLinked: '2026-02-15' },
        { taskId: 1002, taskTitle: 'UI Implementation', projectId: 2, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 35 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 1750 }], dateLinked: '2026-03-20' }
      ]
    },
    {
      id: 4,
      name: 'AI-Powered QA Testing',
      businessGoal: 'Reduce testing cycle time by 60% with automated visual regression',
      status: 'On Track',
      valueProposition: 'Implement AI-driven testing framework that catches UI bugs before deployment.',
      changeType: 'New Capability',
      startDate: '2026-01-15',
      org_id: 'org-falcon',
      valueMetrics: ['Brand & Experience - Quality Score (%)', 'Efficiency Gains - FTE Hour Reduction (Hrs)'],
      impactedTasks: [
        { taskId: 1003, taskTitle: 'QA Framework Setup', projectId: 1, valuesAdded: [{ metric: 'Brand & Experience - Quality Score (%)', value: 15 }, { metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 80 }], dateLinked: '2026-02-01' }
      ]
    },
    {
      id: 5,
      name: 'Dealer Portal Modernization',
      businessGoal: 'Increase dealer engagement by 35% through improved UX',
      status: 'Planning',
      valueProposition: 'Redesign dealer portal with modern UI patterns and real-time inventory updates.',
      changeType: 'Experience Enhancement',
      startDate: '2026-03-01',
      org_id: 'org-falcon',
      valueMetrics: ['Commercial - Conversion Rate Increase (%)', 'Brand & Experience - NPS Score (%)'],
      impactedTasks: []
    },
    // NexGen Health initiatives
    {
      id: 2,
      name: 'Content Management Optimization',
      businessGoal: 'Reduce content update cycle time by 50%',
      status: 'Planning',
      valueProposition: 'Streamline approval workflows and enable self-service content updates.',
      changeType: 'Process Improvement',
      startDate: '2026-02-01',
      org_id: 'org-nexgen',
      valueMetrics: ['Efficiency Gains - Asset Cost Reduction (£)'],
      impactedTasks: [
        { taskId: 2001, taskTitle: 'CMS Integration', projectId: 4, valuesAdded: [{ metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 8000 }], dateLinked: '2026-03-15' }
      ]
    },
    {
      id: 6,
      name: 'Patient Onboarding Digitization',
      businessGoal: 'Reduce patient onboarding time from 15 minutes to 3 minutes',
      status: 'On Track',
      valueProposition: 'Fully digital patient intake with pre-filled forms and e-signatures.',
      changeType: 'Automate Task',
      startDate: '2026-01-20',
      org_id: 'org-nexgen',
      valueMetrics: ['Commercial - Revenue Increase (£)', 'Brand & Experience - NPS Score (%)'],
      impactedTasks: [
        { taskId: 2002, taskTitle: 'Digital Forms Development', projectId: 4, valuesAdded: [{ metric: 'Commercial - Revenue Increase (£)', value: 25000 }, { metric: 'Brand & Experience - NPS Score (%)', value: 12 }], dateLinked: '2026-02-10' }
      ]
    },
    {
      id: 7,
      name: 'Telehealth Platform Expansion',
      businessGoal: 'Add 3 new specialist video consultation channels',
      status: 'At Risk',
      valueProposition: 'Enable remote specialist consultations to increase patient access.',
      changeType: 'New Capability',
      startDate: '2026-02-15',
      org_id: 'org-nexgen',
      valueMetrics: ['Commercial - Revenue Increase (£)', 'Commercial - Operational Cost Reduction (£)'],
      impactedTasks: [
        { taskId: 2003, taskTitle: 'Video Infrastructure', projectId: 5, valuesAdded: [{ metric: 'Commercial - Revenue Increase (£)', value: 45000 }], dateLinked: '2026-03-01' }
      ]
    },
    // Vertex Tech initiatives
    {
      id: 3,
      name: 'Performance Benchmarking Suite',
      businessGoal: 'Achieve Core Web Vitals across all platforms',
      status: 'At Risk',
      valueProposition: 'Automated performance monitoring and alerting.',
      changeType: 'Technology Upgrade',
      startDate: '2026-02-01',
      org_id: 'org-vertex',
      valueMetrics: ['Brand & Experience - NPS Score (%)'],
      impactedTasks: [
        { taskId: 3001, taskTitle: 'Performance Optimization', projectId: 7, valuesAdded: [{ metric: 'Brand & Experience - NPS Score (%)', value: 8 }], dateLinked: '2026-04-10' },
        { taskId: 3002, taskTitle: 'Security Hardening', projectId: 8, valuesAdded: [{ metric: 'Brand & Experience - NPS Score (%)', value: 5 }], dateLinked: '2026-05-20' }
      ]
    },
    {
      id: 8,
      name: 'Cloud Cost Optimization',
      businessGoal: 'Reduce cloud infrastructure costs by 30%',
      status: 'Completed',
      valueProposition: 'Right-size instances, implement auto-scaling, and optimize data transfer.',
      changeType: 'Process Improvement',
      startDate: '2025-11-01',
      org_id: 'org-vertex',
      valueMetrics: ['Commercial - Operational Cost Reduction (£)', 'Efficiency Gains - Asset Cost Reduction (£)'],
      impactedTasks: [
        { taskId: 3003, taskTitle: 'Infrastructure Audit', projectId: 7, valuesAdded: [{ metric: 'Commercial - Operational Cost Reduction (£)', value: 18000 }, { metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 5000 }], dateLinked: '2025-12-01' }
      ]
    },
    {
      id: 9,
      name: 'Security Compliance Automation',
      businessGoal: 'Achieve SOC 2 Type II certification with automated controls',
      status: 'On Track',
      valueProposition: 'Automated security scanning, compliance reporting, and evidence collection.',
      changeType: 'Compliance',
      startDate: '2026-01-10',
      org_id: 'org-vertex',
      valueMetrics: ['Brand & Experience - Quality Score (%)', 'Commercial - Revenue Increase (£)'],
      impactedTasks: [
        { taskId: 3004, taskTitle: 'Security Hardening', projectId: 8, valuesAdded: [{ metric: 'Brand & Experience - Quality Score (%)', value: 20 }], dateLinked: '2026-02-15' }
      ]
    },
    {
      id: 10,
      name: 'API Gateway Modernization',
      businessGoal: 'Reduce API response times by 50% and improve developer experience',
      status: 'Planning',
      valueProposition: 'New GraphQL gateway with improved caching and documentation.',
      changeType: 'Technology Upgrade',
      startDate: '2026-04-01',
      org_id: 'org-vertex',
      valueMetrics: ['Efficiency Gains - FTE Hour Reduction (Hrs)', 'Brand & Experience - NPS Score (%)'],
      impactedTasks: []
    }
  ]);

  // Leave Requests state for My Account
  const [leaveRequests, setLeaveRequests] = useState([]);

  // ============= INDUSTRY-SPECIFIC KPI DEMO DATA =============
  // These KPIs make each portfolio feel custom-built for its industry
  const [kpiDefinitions, setKpiDefinitions] = useState([
    // === FALCON AUTOMOTIVE ===
    { id: 'kpi-falcon-1', org_id: 'org-falcon', name: 'Configurator Conversion Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 4.2, warning: 3.5, critical: 2.8, trackingMethod: 'Manual' },
    { id: 'kpi-falcon-2', org_id: 'org-falcon', name: 'Dealer Lead Volume', category: 'Commercial', unit: 'count', direction: 'higher_better', target: 2500, warning: 2000, critical: 1500, trackingMethod: 'Manual' },
    { id: 'kpi-falcon-3', org_id: 'org-falcon', name: 'Website Engagement Score', category: 'Experience', unit: 'score', direction: 'higher_better', target: 78, warning: 65, critical: 50, trackingMethod: 'Manual' },
    { id: 'kpi-falcon-4', org_id: 'org-falcon', name: 'Asset Production Cycle Time', category: 'Operational', unit: 'days', direction: 'lower_better', target: 14, warning: 18, critical: 25, trackingMethod: 'Manual' },
    { id: 'kpi-falcon-5', org_id: 'org-falcon', name: 'Brand Sentiment Score', category: 'Experience', unit: '%', direction: 'higher_better', target: 82, warning: 72, critical: 60, trackingMethod: 'Manual' },

    // === GLOBAL HEALTH (Pharmaceutical) ===
    { id: 'kpi-nexgen-1', org_id: 'org-nexgen', name: 'HCP Portal Engagement', category: 'Experience', unit: '%', direction: 'higher_better', target: 65, warning: 50, critical: 35, trackingMethod: 'Manual' },
    { id: 'kpi-nexgen-2', org_id: 'org-nexgen', name: 'Patient Onboarding Time', category: 'Operational', unit: 'minutes', direction: 'lower_better', target: 3, warning: 6, critical: 10, trackingMethod: 'Manual' },
    { id: 'kpi-nexgen-3', org_id: 'org-nexgen', name: 'Formulary Compliance Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 92, warning: 85, critical: 75, trackingMethod: 'Manual' },
    { id: 'kpi-nexgen-4', org_id: 'org-nexgen', name: 'Rep Detail Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 78, warning: 65, critical: 50, trackingMethod: 'Manual' },
    { id: 'kpi-nexgen-5', org_id: 'org-nexgen', name: 'Digital Content Adoption', category: 'Experience', unit: '%', direction: 'higher_better', target: 45, warning: 30, critical: 15, trackingMethod: 'Manual' },

    // === ZENITH TECH ===
    { id: 'kpi-vertex-1', org_id: 'org-vertex', name: 'API Adoption Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 34, warning: 25, critical: 15, trackingMethod: 'Manual' },
    { id: 'kpi-vertex-2', org_id: 'org-vertex', name: 'Developer NPS', category: 'Experience', unit: 'score', direction: 'higher_better', target: 68, warning: 50, critical: 30, trackingMethod: 'Manual' },
    { id: 'kpi-vertex-3', org_id: 'org-vertex', name: 'Platform Uptime SLA', category: 'Operational', unit: '%', direction: 'higher_better', target: 99.95, warning: 99.5, critical: 99.0, trackingMethod: 'Manual' },
    { id: 'kpi-vertex-4', org_id: 'org-vertex', name: 'Feature Adoption Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 45, warning: 30, critical: 15, trackingMethod: 'Manual' },
    { id: 'kpi-vertex-5', org_id: 'org-vertex', name: 'Time to First API Call', category: 'Experience', unit: 'minutes', direction: 'lower_better', target: 12, warning: 25, critical: 45, trackingMethod: 'Manual' },

    // === URBANRETAIL ===
    { id: 'kpi-urban-1', org_id: 'org-urbanretail', name: 'Cart Conversion Rate', category: 'Commercial', unit: '%', direction: 'higher_better', target: 3.8, warning: 3.0, critical: 2.0, trackingMethod: 'Manual' },
    { id: 'kpi-urban-2', org_id: 'org-urbanretail', name: 'Average Order Value', category: 'Commercial', unit: '£', direction: 'higher_better', target: 125, warning: 95, critical: 65, trackingMethod: 'Manual' },
    { id: 'kpi-urban-3', org_id: 'org-urbanretail', name: 'Customer NPS', category: 'Experience', unit: 'score', direction: 'higher_better', target: 72, warning: 55, critical: 35, trackingMethod: 'Manual' },
    { id: 'kpi-urban-4', org_id: 'org-urbanretail', name: 'Omnichannel Engagement', category: 'Experience', unit: '%', direction: 'higher_better', target: 58, warning: 40, critical: 25, trackingMethod: 'Manual' },
    { id: 'kpi-urban-5', org_id: 'org-urbanretail', name: 'Inventory Accuracy', category: 'Operational', unit: '%', direction: 'higher_better', target: 99.2, warning: 97, critical: 94, trackingMethod: 'Manual' }
  ]);

  // Current KPI values - some intentionally underperforming to trigger Value Gaps
  const [portfolioKPIs, setPortfolioKPIs] = useState([
    // Falcon - Configurator conversion DECLINING (will trigger Value Gap)
    { id: 'val-f1', definitionId: 'kpi-falcon-1', period: '2026-02', actual: 3.1, previous: 3.8, status: 'critical' },
    { id: 'val-f2', definitionId: 'kpi-falcon-2', period: '2026-02', actual: 2650, previous: 2400, status: 'on_track' },
    { id: 'val-f3', definitionId: 'kpi-falcon-3', period: '2026-02', actual: 72, previous: 70, status: 'on_track' },
    { id: 'val-f4', definitionId: 'kpi-falcon-4', period: '2026-02', actual: 16, previous: 15, status: 'warning' },
    { id: 'val-f5', definitionId: 'kpi-falcon-5', period: '2026-02', actual: 79, previous: 80, status: 'on_track' },

    // Global Health - Patient onboarding exceeding target (critical miss)
    { id: 'val-n1', definitionId: 'kpi-nexgen-1', period: '2026-02', actual: 58, previous: 52, status: 'on_track' },
    { id: 'val-n2', definitionId: 'kpi-nexgen-2', period: '2026-02', actual: 8.5, previous: 7.2, status: 'critical' },
    { id: 'val-n3', definitionId: 'kpi-nexgen-3', period: '2026-02', actual: 89, previous: 88, status: 'on_track' },
    { id: 'val-n4', definitionId: 'kpi-nexgen-4', period: '2026-02', actual: 71, previous: 68, status: 'warning' },
    { id: 'val-n5', definitionId: 'kpi-nexgen-5', period: '2026-02', actual: 38, previous: 32, status: 'on_track' },

    // Zenith - API adoption flat despite active projects
    { id: 'val-v1', definitionId: 'kpi-vertex-1', period: '2026-02', actual: 26, previous: 25, status: 'warning' },
    { id: 'val-v2', definitionId: 'kpi-vertex-2', period: '2026-02', actual: 52, previous: 48, status: 'warning' },
    { id: 'val-v3', definitionId: 'kpi-vertex-3', period: '2026-02', actual: 99.92, previous: 99.88, status: 'on_track' },
    { id: 'val-v4', definitionId: 'kpi-vertex-4', period: '2026-02', actual: 28, previous: 27, status: 'warning' },
    { id: 'val-v5', definitionId: 'kpi-vertex-5', period: '2026-02', actual: 18, previous: 22, status: 'on_track' },

    // UrbanRetail - Strong performer to contrast
    { id: 'val-u1', definitionId: 'kpi-urban-1', period: '2026-02', actual: 4.1, previous: 3.7, status: 'on_track' },
    { id: 'val-u2', definitionId: 'kpi-urban-2', period: '2026-02', actual: 132, previous: 118, status: 'on_track' },
    { id: 'val-u3', definitionId: 'kpi-urban-3', period: '2026-02', actual: 68, previous: 62, status: 'on_track' },
    { id: 'val-u4', definitionId: 'kpi-urban-4', period: '2026-02', actual: 54, previous: 48, status: 'on_track' },
    { id: 'val-u5', definitionId: 'kpi-urban-5', period: '2026-02', actual: 98.8, previous: 98.2, status: 'warning' }
  ]);

  // Value Gaps - AI-detected discrepancies between project health and business outcomes
  const [valueGaps, setValueGaps] = useState([
    {
      id: 'gap-1',
      org_id: 'org-falcon',
      projectId: 1, // Falcon GT Website
      gapType: 'high_kvi_low_kpi',
      severity: 'critical',
      title: 'Falcon GT On Track, but Configurator Conversion declining 18%',
      description: 'Project shows healthy execution, but the Configurator Conversion Rate has declined from 3.8% to 3.1%. Users may be abandoning before lead submission.',
      suggestedAction: 'Review UX funnel analytics—consider A/B testing the configurator summary page. Suggest pivoting 1 developer from feature work to conversion optimization.',
      relatedKpiIds: ['kpi-falcon-1'],
      detectedAt: '2026-02-05T10:30:00Z'
    },
    {
      id: 'gap-2',
      org_id: 'org-nexgen',
      projectId: 4, // Patient Portal Redesign
      gapType: 'low_kvi_high_kpi',
      severity: 'critical',
      title: 'Patient Portal at risk with Onboarding Time exceeding target by 183%',
      description: 'Patient Onboarding Time is 8.5 minutes vs 3 minute target. This correlates with the CRM Dashboard project delays impacting shared data flows.',
      suggestedAction: 'Prioritize form simplification tasks over new feature development. Consider pulling Anna Garcia from Asset Production to accelerate.',
      relatedKpiIds: ['kpi-nexgen-2'],
      detectedAt: '2026-02-04T14:15:00Z'
    },
    {
      id: 'gap-3',
      org_id: 'org-vertex',
      projectId: null, // Portfolio-wide
      gapType: 'resource_mismatch',
      severity: 'warning',
      title: 'API Adoption flat despite 80% resource allocation',
      description: 'Developer Platform using 80% of portfolio resources, but API Adoption Rate increased only 1% (25% → 26%). Current velocity may not drive adoption.',
      suggestedAction: 'Consider pivoting 2 developers from platform features to SDK improvements and documentation. Developer NPS also below target.',
      relatedKpiIds: ['kpi-vertex-1', 'kpi-vertex-2'],
      detectedAt: '2026-02-03T09:00:00Z'
    }
  ]);

  const submitLeaveRequest = (request) => {
    setLeaveRequests(prev => [...prev, { ...request, id: `leave-${Date.now()}` }]);
  };

  // KPI CRUD Functions
  const addKpiDefinition = (kpi) => {
    const newKpi = {
      ...kpi,
      id: `kpi-${Date.now()}`
    };
    setKpiDefinitions(prev => [...prev, newKpi]);
    return newKpi;
  };

  const updateKpiDefinition = (id, updates) => {
    setKpiDefinitions(prev => prev.map(kpi =>
      kpi.id === id ? { ...kpi, ...updates } : kpi
    ));
  };

  const deleteKpiDefinition = (id) => {
    setKpiDefinitions(prev => prev.filter(kpi => kpi.id !== id));
    // Also remove associated values
    setPortfolioKPIs(prev => prev.filter(v => v.definitionId !== id));
  };

  const updateKpiValue = (definitionId, value) => {
    setPortfolioKPIs(prev => {
      const existing = prev.find(v => v.definitionId === definitionId);
      if (existing) {
        return prev.map(v => v.definitionId === definitionId ? { ...v, ...value } : v);
      } else {
        return [...prev, { id: `val-${Date.now()}`, definitionId, period: '2026-02', ...value }];
      }
    });
  };


  // Mock Data - Tasks (for Track the Present)
  const [tasks, setTasks] = useState(() => {
    const initialTasks = [];
    projects.forEach(project => {
      const template = INITIAL_TASK_TEMPLATES[project.type]?.[project.scale];
      if (template) {
        // Custom logic for Project 2 (Eagle SUV) to simulate specific slip
        if (project.id === 2) {
          // Update Gateway Status to reflect the cause
          if (project.launchDetails) {
            const globalLaunch = project.launchDetails.find(d => d.market === 'Global');
            if (globalLaunch && globalLaunch.inputGateways) {
              const assetGateway = globalLaunch.inputGateways.find(g => g.name === '3D Asset Freeze');
              if (assetGateway) {
                assetGateway.status = 'Late';
              }
            }
          }

          const originalEnd = new Date(project.originalEndDate); // July 15
          const currentEnd = new Date(project.endDate); // July 31
          const varianceDays = differenceInDays(currentEnd, originalEnd); // ~16 days

          // Calculate baseline pace based on ORIGINAL timeframe
          const baselineTotalDays = differenceInDays(originalEnd, new Date(project.startDate));
          const baselineDaysPerTask = Math.floor(baselineTotalDays / template.length);

          let currentOffset = 0;

          template.forEach((t, index) => {
            const taskStart = addDays(new Date(project.startDate), (index * baselineDaysPerTask) + currentOffset);
            let taskEnd = addDays(taskStart, baselineDaysPerTask);

            let status = 'Planning';
            let actual = 0;
            let note = null;

            // Introduce the slip in the first task
            if (index === 0) {
              // Task 1 caused the delay
              taskEnd = addDays(taskEnd, varianceDays); // Extend duration
              currentOffset += varianceDays; // Shift subsequent tasks

              status = 'Planning'; // Future task
              actual = 0;
              note = 'Delayed due to complex asset iterations';
            } else if (index === 1) {
              status = 'Planning';
              actual = 0;
            } else if (index === 2) {
              status = 'Planning';
              actual = 0;
            }

            initialTasks.push({
              id: Date.now() + project.id * 100 + index,
              projectId: project.id,
              title: t.title,
              status: status,
              assignee: null,
              estimate: t.estimate,
              actual: actual,
              startDate: format(taskStart, 'yyyy-MM-dd'),
              endDate: format(taskEnd, 'yyyy-MM-dd'), // This will reflect the slip
              predecessorId: index > 0 ? (Date.now() + project.id * 100 + index - 1) : null,
              isMarketSpecific: ['Deployment', 'Global Rollout', 'Regional Localization', 'Multi-Market Rollout', 'Launch'].includes(t.title),
              marketStatus: null,
              gatewayDependency: t.gatewayDependency,
              note: note
            });
          });

        } else {
          // Standard logic for other projects
          const totalDays = differenceInDays(new Date(project.endDate), new Date(project.startDate));
          const daysPerTask = Math.floor(totalDays / template.length);

          template.forEach((t, index) => {
            const taskStart = addDays(new Date(project.startDate), index * daysPerTask);
            const taskEnd = index === template.length - 1 ? new Date(project.endDate) : addDays(taskStart, daysPerTask);

            let status = 'Planning';
            let actual = 0;
            let valueSaved = null;
            let linkedInitiativeId = null;

            if (project.status === 'Completed') {
              status = 'Completed';
              actual = t.estimate;

              // Adjust actuals for historic projects to reflect value savings
              // Falcon GT (2025) - ID 6
              if (project.id === 6) {
                if (t.title === 'Frontend Development') { actual = 80; valueSaved = 40; linkedInitiativeId = 1; }
                if (t.title === 'QA') { actual = 15; valueSaved = 25; linkedInitiativeId = 1; }
                if (t.title === 'UI Design') { actual = 55; valueSaved = 5000; linkedInitiativeId = 2; }
                if (t.title === 'CMS Integration') { actual = 70; valueSaved = 150000; linkedInitiativeId = 3; }
              }
              // Eagle SUV (2025) - ID 8
              if (project.id === 8) {
                if (t.title === 'UI Implementation') { actual = 40; valueSaved = 40; linkedInitiativeId = 1; }
                if (t.title === 'Integration Testing') { actual = 15; valueSaved = 25; linkedInitiativeId = 1; }
                if (t.title === '3D Asset Prep') { actual = 60; valueSaved = 12000; linkedInitiativeId = 2; }
              }
              // Hawk Sedan (2025) - ID 12
              if (project.id === 12) {
                if (t.title === 'Frontend Dev') { actual = 5; valueSaved = 30; linkedInitiativeId = 1; }
              }

            } else if (project.status === 'Active') {
              if (index < 2) {
                status = 'Completed';
                actual = t.estimate;
              } else if (index === 2) {
                status = 'In Progress';
                actual = Math.floor(t.estimate / 2);
              }
            } else if (project.status === 'Planning' && index === 0) {
              status = 'In Progress';
            }

            const isDeployment = ['Deployment', 'Global Rollout', 'Regional Localization', 'Multi-Market Rollout', 'Launch'].includes(t.title);
            let marketStatus = {};

            if (isDeployment && project.launchDetails) {
              project.launchDetails.forEach((ld, i) => {
                if (ld.market !== 'Global') {
                  // Randomize status for demo purposes
                  const statuses = ['Planning', 'In Progress', 'Completed', 'Delayed'];
                  // Use a deterministic way to pick status so it doesn't change on every render
                  if (project.status === 'Completed') {
                    marketStatus[ld.market] = 'Completed';
                  } else if (project.status === 'Planning') {
                    marketStatus[ld.market] = 'Planning';
                  } else {
                    marketStatus[ld.market] = statuses[Math.floor(Math.random() * statuses.length)];
                  }
                }
              });
            }

            initialTasks.push({
              id: Date.now() + project.id * 100 + index,
              projectId: project.id,
              title: t.title,
              status: status,
              assignee: null,
              estimate: t.estimate,
              actual: actual,
              valueSaved: valueSaved,
              linkedInitiativeId: linkedInitiativeId,
              startDate: format(taskStart, 'yyyy-MM-dd'),
              endDate: format(taskEnd, 'yyyy-MM-dd'),
              predecessorId: index > 0 ? (Date.now() + project.id * 100 + index - 1) : null,
              isMarketSpecific: isDeployment,
              marketStatus: isDeployment ? marketStatus : null,
              gatewayDependency: t.gatewayDependency
            });
          });
        }

        // Demo Rework Task for Project 5
        if (project.id === 5) {
          initialTasks.push({
            id: 99999,
            projectId: 5,
            title: 'Rework: Landing Page Design (Global)',
            status: 'In Progress',
            assignee: null,
            estimate: 6,
            actual: 2,
            startDate: '2026-01-15',
            endDate: '2026-01-20',
            isMarketSpecific: true,
            marketStatus: { 'Global': 'In Progress' },
            isRework: true,
            gatewaySource: 'Design Sign-off'
          });
        }
      }
    });
    return initialTasks;
  });

  // ============= SYNC BACKEND DATA TO STATE =============
  // When not in demo mode, replace local state with backend data
  useEffect(() => {
    if (!isDemoMode && projectsQuery.data && !projectsQuery.isLoading) {
      setProjects(projectsQuery.data);
    }
  }, [isDemoMode, projectsQuery.data, projectsQuery.isLoading]);

  useEffect(() => {
    if (!isDemoMode && tasksQuery.data && !tasksQuery.isLoading) {
      setTasks(tasksQuery.data);
    }
  }, [isDemoMode, tasksQuery.data, tasksQuery.isLoading]);

  useEffect(() => {
    if (!isDemoMode && resourcesQuery.data && !resourcesQuery.isLoading) {
      const mappedResources = resourcesQuery.data.map(r => ({
        ...r,
        internalRate: r.cost_rate || r.internalRate || 100,
        clientRate: r.billable_rate || r.clientRate || 125
      }));
      setResources(mappedResources);
    }
  }, [isDemoMode, resourcesQuery.data, resourcesQuery.isLoading]);

  useEffect(() => {
    if (!isDemoMode && initiativesQuery.data && !initiativesQuery.isLoading) {
      setInitiatives(initiativesQuery.data);
    }
  }, [isDemoMode, initiativesQuery.data, initiativesQuery.isLoading]);

  // Scenario Planner State

  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const addProject = async (newProject) => {
    // If not in demo mode, call backend API
    if (!isDemoMode) {
      try {
        const created = await createProjectMutation.mutateAsync(newProject);
        // React Query will invalidate and refetch, which syncs to state via useEffect
        return created;
      } catch (error) {
        console.error('Failed to create project:', error);
        throw error;
      }
    }

    // Demo mode: local state only
    const newProjectId = Math.max(...projects.map(p => p.id), 0) + 1;

    // Generate Launch Details
    const gateways = gatewayTemplates[newProject.type]?.[newProject.scale] || [{ name: 'Regulatory Approval', offsetWeeks: 2 }];
    const inputGateways = gateways.map(gateway => {
      const goalDate = new Date(newProject.endDate);
      const expectedDate = subWeeks(goalDate, gateway.offsetWeeks || 0);
      return {
        name: gateway.name,
        status: 'Pending',
        expectedDate: format(expectedDate, 'yyyy-MM-dd'),
        receivedDate: null
      };
    });

    let launchDetails = [
      {
        market: 'Global',
        goalLive: newProject.endDate,
        inputGateways: [...inputGateways]
      }
    ];

    if (newProject.markets && newProject.markets.length > 0) {
      const marketDetails = newProject.markets.map(market => ({
        market: market,
        goalLive: newProject.endDate, // Default to project end date
        inputGateways: [...inputGateways]
      }));
      launchDetails = [...launchDetails, ...marketDetails];
    }

    const projectWithId = { ...newProject, id: newProjectId, status: 'Planning', launchDetails };

    setProjects(prev => [...prev, projectWithId]);

    // Generate Tasks from Template
    const template = taskTemplates[newProject.type]?.[newProject.scale];
    if (template) {
      const totalDays = differenceInDays(new Date(newProject.endDate), new Date(newProject.startDate));
      const daysPerTask = Math.floor(totalDays / template.length);

      const newTasks = template.map((t, index) => {
        const taskStart = addDays(new Date(newProject.startDate), index * daysPerTask);
        const taskEnd = index === template.length - 1 ? new Date(newProject.endDate) : addDays(taskStart, daysPerTask);

        return {
          id: Date.now() + index,
          projectId: newProjectId,
          title: t.title,
          status: 'Planning',
          assignee: null,
          estimate: t.estimate,
          actual: 0,
          startDate: format(taskStart, 'yyyy-MM-dd'),
          endDate: format(taskEnd, 'yyyy-MM-dd'),
          predecessorId: index > 0 ? (Date.now() + index - 1) : null // Link to previous task
        };
      });
      setTasks(prev => [...prev, ...newTasks]);
    }
  };


  const deleteProject = async (projectId) => {
    if (!isDemoMode) {
      try {
        await deleteProjectMutation.mutateAsync(projectId);
        return;
      } catch (error) {
        console.error('Failed to delete project:', error);
        throw error;
      }
    }
    // Demo mode
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setSelectedProjectIds(prev => prev.filter(id => id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
  };

  // Task Management
  const addTask = (newTask) => {
    let marketStatus = null;
    if (newTask.isMarketSpecific) {
      const project = projects.find(p => p.id === newTask.projectId);
      if (project && project.launchDetails) {
        marketStatus = {};
        project.launchDetails.forEach(ld => {
          if (ld.market !== 'Global') {
            marketStatus[ld.market] = 'Planning';
          }
        });
      }
    }

    setTasks(prev => [
      ...prev,
      { ...newTask, id: Date.now() + Math.floor(Math.random() * 1000), status: 'Planning', actual: 0, predecessorId: newTask.predecessorId || null, marketStatus }
    ]);
  };

  const updateTask = (taskId, updatedFields) => {
    setTasks(prev => {
      // 1. Update the target task
      let updatedTasks = prev.map(t => t.id === taskId ? { ...t, ...updatedFields } : t);

      // 2. Check for dependency conflicts and resolve them (push OR pull)
      const updatedTask = updatedTasks.find(t => t.id === taskId);

      // Resolve dependencies when end date changes OR when task is marked complete
      if (updatedFields.endDate || updatedFields.status === 'Completed') {
        const resolveDependencies = (tasks, parentId) => {
          const parent = tasks.find(t => t.id === parentId);
          if (!parent) return tasks;

          const successors = tasks.filter(t => t.predecessorId === parentId);

          successors.forEach(successor => {
            const parentEnd = new Date(parent.endDate);
            const successorStart = new Date(successor.startDate);
            const duration = differenceInDays(new Date(successor.endDate), new Date(successor.startDate));

            // Calculate the ideal start date (day after parent ends)
            const idealStart = addDays(parentEnd, 1);

            // If successor can start earlier (parent finished early) OR needs to be pushed
            if (successorStart.getTime() !== idealStart.getTime()) {
              const newStart = idealStart;
              const newEnd = addDays(newStart, duration);

              const newStartStr = format(newStart, 'yyyy-MM-dd');
              const newEndStr = format(newEnd, 'yyyy-MM-dd');

              // Only update if changed
              if (successor.startDate !== newStartStr) {
                const successorIndex = tasks.findIndex(t => t.id === successor.id);
                tasks[successorIndex] = {
                  ...successor,
                  startDate: newStartStr,
                  endDate: newEndStr
                };
                // Recursively resolve for this successor
                tasks = resolveDependencies(tasks, successor.id);
              }
            }
          });
          return tasks;
        };

        updatedTasks = resolveDependencies([...updatedTasks], taskId);
      }

      return updatedTasks;
    });
  };

  const deleteTask = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  // Resource Management
  const addResource = async (newResource) => {
    if (!isDemoMode) {
      try {
        await createResourceMutation.mutateAsync(newResource);
        return;
      } catch (error) {
        console.error('Failed to create resource:', error);
        throw error;
      }
    }
    // Demo mode
    setResources(prev => [
      ...prev,
      { ...newResource, id: Math.max(...prev.map(r => r.id), 0) + 1, leave: 0 }
    ]);
  };

  const updateResource = async (id, updatedFields) => {
    if (!isDemoMode) {
      try {
        await updateResourceMutation.mutateAsync({ id, data: updatedFields });
        return;
      } catch (error) {
        console.error('Failed to update resource:', error);
        throw error;
      }
    }
    // Demo mode
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
  };

  const deleteResource = async (id) => {
    if (!isDemoMode) {
      try {
        await deleteResourceMutation.mutateAsync(id);
        return;
      } catch (error) {
        console.error('Failed to delete resource:', error);
        throw error;
      }
    }
    // Demo mode
    setResources(prev => prev.filter(r => r.id !== id));
  };

  // Initiative Management
  const addInitiative = async (newInitiative) => {
    if (!isDemoMode) {
      try {
        await createInitiativeMutation.mutateAsync(newInitiative);
        return;
      } catch (error) {
        console.error('Failed to create initiative:', error);
        throw error;
      }
    }
    // Demo mode
    setInitiatives(prev => [
      ...prev,
      { ...newInitiative, id: Math.max(...prev.map(i => i.id), 0) + 1, impactedTasks: [] }
    ]);
  };

  const updateInitiative = async (id, updatedFields) => {
    if (!isDemoMode) {
      try {
        await updateInitiativeMutation.mutateAsync({ id, data: updatedFields });
        return;
      } catch (error) {
        console.error('Failed to update initiative:', error);
        throw error;
      }
    }
    // Demo mode
    setInitiatives(prev => prev.map(i => i.id === id ? { ...i, ...updatedFields } : i));
  };

  /**
   * Calculate project cost based on task estimates and resource rates
   * Used for both display and scenario planning
   */
  const getProjectCost = useCallback((projectId) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    const costs = projectTasks.reduce((acc, task) => {
      // Find assignee to get their rate
      const assignee = resources.find(r => r.id === task.assignee);
      const internalRate = assignee?.internalRate || 100;
      const clientRate = assignee?.clientRate || assignee?.internalRate || 125;

      acc.internal += (task.estimate * internalRate);
      acc.client += (task.estimate * clientRate);
      return acc;
    }, { internal: 0, client: 0 });

    const margin = costs.internal > 0
      ? Math.round(((costs.client - costs.internal) / costs.internal) * 100)
      : 0;

    return { ...costs, margin };
  }, [tasks, resources]);

  /**
   * Get all projects with their current calculated costs
   */
  const projectsWithCosts = useMemo(() => {
    return projects.map(p => {
      const financials = getProjectCost(p.id);
      return {
        ...p,
        estimatedCost: financials.client,
        financials
      };
    });
  }, [projects, getProjectCost]);

  const linkTaskToInitiative = (taskId, initiativeId, values) => {
    // 1. Find the task and initiative
    const task = tasks.find(t => t.id === taskId);
    const initiative = initiatives.find(i => i.id === parseInt(initiativeId));

    if (!task || !initiative) return;

    // 2. Update the Initiative with the new impacted task
    const newImpactedTask = {
      taskId: task.id,
      taskTitle: task.title,
      projectId: task.projectId,
      valuesAdded: values, // Array of { metric, value }
      dateLinked: new Date().toISOString()
    };

    setInitiatives(prev => prev.map(i => {
      if (i.id === parseInt(initiativeId)) {
        // Check if task already exists
        const existingIndex = i.impactedTasks?.findIndex(t => t.taskId === taskId);
        let newTasks;
        if (existingIndex >= 0) {
          newTasks = [...i.impactedTasks];
          newTasks[existingIndex] = { ...newTasks[existingIndex], valuesAdded: values };
        } else {
          newTasks = [...(i.impactedTasks || []), newImpactedTask];
        }
        return { ...i, impactedTasks: newTasks };
      }
      return i;
    }));

    // 3. Update the Task
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return { ...t, linkedInitiativeId: parseInt(initiativeId), valuesSaved: values };
      }
      return t;
    }));
  };

  const unlinkTaskFromInitiative = (initiativeId, taskId) => {
    // 1. Remove from Initiative
    setInitiatives(prev => prev.map(i => {
      if (i.id === parseInt(initiativeId)) {
        return { ...i, impactedTasks: i.impactedTasks.filter(t => t.taskId !== taskId) };
      }
      return i;
    }));

    // 2. Remove metadata from Task
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        // Create a new object without the linked properties
        const newTask = { ...t };
        delete newTask.linkedInitiativeId;
        delete newTask.valuesSaved;
        delete newTask.valueSaved; // Legacy cleanup
        return newTask;
      }
      return t;
    }));
  };

  // Admin Functions
  const addTeam = (teamName) => {
    if (!teams.includes(teamName)) {
      setTeams(prev => [...prev, teamName]);
      // Initialize empty templates for the new team
      setTaskTemplates(prev => ({
        ...prev,
        [teamName]: {
          'Small': [],
          'Medium': [],
          'Large': []
        }
      }));
      setGatewayTemplates(prev => ({
        ...prev,
        [teamName]: {
          'Small': [],
          'Medium': [],
          'Large': []
        }
      }));
    }
  };

  const removeTeam = (teamName) => {
    setTeams(prev => prev.filter(t => t !== teamName));
    // Optional: Remove templates for this team
    setTaskTemplates(prev => {
      const newTemplates = { ...prev };
      delete newTemplates[teamName];
      return newTemplates;
    });
  };

  const updateTaskTemplate = (team, scale, newTasks) => {
    setTaskTemplates(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [scale]: newTasks
      }
    }));
  };

  const updateGatewayTemplate = (team, scale, newGateways) => {
    setGatewayTemplates(prev => ({
      ...prev,
      [team]: {
        ...prev[team],
        [scale]: newGateways
      }
    }));
  };

  const addMarket = (marketName) => {
    if (!markets.includes(marketName)) {
      setMarkets(prev => [...prev, marketName]);
    }
  };

  const removeMarket = (marketName) => {
    setMarkets(prev => prev.filter(m => m !== marketName));
  };

  const getRoleForTask = (title) => {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('dev') || titleLower.includes('program') || titleLower.includes('logic') || titleLower.includes('optimization') || titleLower.includes('cms') || titleLower.includes('security') || titleLower.includes('audit')) return 'Developer';
    if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux') || titleLower.includes('creative') || titleLower.includes('copy') || titleLower.includes('localization')) return 'Designer';
    if (titleLower.includes('3d') || titleLower.includes('asset') || titleLower.includes('cgi') || titleLower.includes('video') || titleLower.includes('image') || titleLower.includes('production') || titleLower.includes('retouching') || titleLower.includes('spins')) return '3D Artist';
    if (titleLower.includes('qa') || titleLower.includes('test') || titleLower.includes('uat') || titleLower.includes('support')) return 'QA';
    if (titleLower.includes('strategy') || titleLower.includes('launch') || titleLower.includes('rollout') || titleLower.includes('brief') || titleLower.includes('global')) return 'Manager';
    return 'Developer'; // Default
  };

  const autoAssignTasks = () => {
    let updatedTasks = tasks.map(t => ({ ...t, assignee: null }));
    let resourceUsage = resources.map(r => ({ ...r, used: 0 }));
    let gaps = [];
    let crossPortfolioSuggestions = [];

    // Get current org context for demo mode
    const currentOrgId = authContext?.currentUser?.org_id;

    // Categorize resources by primary vs shared for this portfolio
    const primaryResources = resourceUsage.filter(r => {
      // In demo mode: primary = belongs to current org
      // Non-demo: would check is_primary flag from backend
      return r.org_id === currentOrgId;
    });

    const sharedResources = resourceUsage.filter(r => {
      // In demo mode: shared = belongs to another org but could be allocated
      // Simulate: resources from other orgs with capacity available
      return r.org_id !== currentOrgId;
    });

    // Build global resource pool with calculated allocation based on actual utilization
    const globalPool = resourceUsage.map(r => {
      const capacity = parseInt(r.capacity) - (parseInt(r.leave) || 0);
      const utilization = capacity > 0 ? Math.round((r.used / capacity) * 100) : 0;
      return {
        ...r,
        isPrimary: r.org_id === currentOrgId,
        allocation: utilization, // Actual utilization percentage
        availableCapacity: capacity - r.used
      };
    });

    updatedTasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      if (!project) return;

      const requiredTeam = project.type;
      const estimate = parseInt(task.estimate) || 0;

      // TIER 1: Try to assign from PRIMARY resources first
      const bestPrimaryResource = primaryResources.find(r =>
        r.team === requiredTeam && (parseInt(r.capacity) - (parseInt(r.leave) || 0) - r.used) >= estimate
      );

      if (bestPrimaryResource) {
        task.assignee = bestPrimaryResource.id;
        bestPrimaryResource.used += estimate;
        // Update global pool tracking
        const poolResource = globalPool.find(g => g.id === bestPrimaryResource.id);
        if (poolResource) poolResource.used += estimate;
        return; // Successfully assigned to primary
      }

      // TIER 2: Try to assign from SHARED resources (if they have capacity for this portfolio)
      const bestSharedResource = sharedResources.find(r =>
        r.team === requiredTeam &&
        (parseInt(r.capacity) - (parseInt(r.leave) || 0) - r.used) >= estimate
      );


      if (bestSharedResource) {
        task.assignee = bestSharedResource.id;
        bestSharedResource.used += estimate;
        // Update global pool tracking
        const poolResource = globalPool.find(g => g.id === bestSharedResource.id);
        if (poolResource) poolResource.used += estimate;

        // Note: this is a shared resource assignment - include portfolio details
        // Calculate suggested split based on task hours vs resource capacity
        const resourceCapacity = parseInt(bestSharedResource.capacity) - (parseInt(bestSharedResource.leave) || 0);
        const suggestedSplit = resourceCapacity > 0 ? Math.round((estimate / resourceCapacity) * 100) : 10;
        const currentUtilization = resourceCapacity > 0 ? Math.round((bestSharedResource.used / resourceCapacity) * 100) : 0;

        gaps.push({
          taskId: task.id,
          taskTitle: task.title,
          projectName: project.name,
          requiredTeam: requiredTeam,
          estimate: estimate,
          assignedTo: bestSharedResource.name,
          resourceRole: bestSharedResource.role,
          internalRate: bestSharedResource.internalRate,
          resourceId: bestSharedResource.id,
          primaryPortfolio: getPortfolioName(bestSharedResource.org_id),
          primaryPortfolioId: bestSharedResource.org_id,
          targetPortfolio: getPortfolioName(currentOrgId),
          targetPortfolioId: currentOrgId,
          currentAllocation: 100 - currentUtilization, // Available capacity in primary
          suggestedSplit: Math.min(suggestedSplit, 100 - currentUtilization), // Don't exceed available
          reason: 'Assigned to Shared Resource',
          type: 'shared_assignment'
        });
        return;
      }


      // TIER 3: No suitable resources - check if cross-portfolio reallocation could help
      // Look for resources in OTHER portfolios with matching skills and available capacity
      const potentialCrossPortfolio = globalPool.filter(r =>
        r.team === requiredTeam &&
        !r.isPrimary &&
        r.allocation < 100 && // Not fully allocated
        (parseInt(r.capacity) - (parseInt(r.leave) || 0) - r.used) >= estimate
      );

      if (potentialCrossPortfolio.length > 0) {
        // Suggest reallocation
        crossPortfolioSuggestions.push({
          taskId: task.id,
          taskTitle: task.title,
          projectName: project.name,
          requiredTeam: requiredTeam,
          estimate: estimate,
          candidates: potentialCrossPortfolio.map(r => ({
            id: r.id,
            name: r.name,
            currentAllocation: r.allocation,
            availableHours: Math.round((parseInt(r.capacity) - (parseInt(r.leave) || 0)) * (100 - r.allocation) / 100),
            portfolioName: getPortfolioName(r.org_id)
          })),
          type: 'reallocation_suggestion'
        });
      }

      // Record the gap
      gaps.push({
        taskId: task.id,
        taskTitle: task.title,
        projectName: project.name,
        requiredTeam: requiredTeam,
        estimate: estimate,
        resourceRole: getRoleForTask(task.title), // INFERRED ROLE
        reason: primaryResources.some(r => r.team === requiredTeam)
          ? 'Primary Resources at Capacity'
          : 'No Primary Team Members',
        type: 'gap',
        hasCrossPortfolioOption: potentialCrossPortfolio.length > 0
      });
    });

    setTasks(updatedTasks);

    // Return comprehensive result
    return {
      gaps: gaps.filter(g => g.type === 'gap'),
      sharedAssignments: gaps.filter(g => g.type === 'shared_assignment'),
      crossPortfolioSuggestions: crossPortfolioSuggestions,
      summary: {
        assigned: updatedTasks.filter(t => t.assignee).length,
        unassigned: gaps.filter(g => g.type === 'gap').length,
        usedSharedResources: gaps.filter(g => g.type === 'shared_assignment').length,
        canReallocate: crossPortfolioSuggestions.length
      }
    };
  };

  // Helper to get portfolio name from org_id (for demo)
  const getPortfolioName = (orgId) => {
    const org = authContext?.allDemoOrgs?.find(o => o.id === orgId);
    return org?.name || 'Unknown Portfolio';
  };

  // Update specific fields on a project (used by AI Orchestrator)
  const updateProjectFields = (projectId, changes) => {
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, ...changes } : p
    ));
  };



  const updateGateway = (projectId, market, gatewayName, updateData) => {
    // updateData: { status, date, notes }

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const newLaunchDetails = p.launchDetails.map(ld => {
        if (ld.market !== market) return ld;

        const newGateways = ld.inputGateways.map(g => {
          if (g.name !== gatewayName) return g;

          const newVersion = (g.versions?.length || 0) + 1;
          const isOnTime = updateData.status === 'Received' ? new Date(updateData.date) <= new Date(g.expectedDate) : false;

          const versionEntry = {
            version: newVersion,
            status: updateData.status,
            date: updateData.date,
            notes: updateData.notes,
            isOnTime
          };

          return {
            ...g,
            status: updateData.status,
            receivedDate: updateData.status === 'Received' ? updateData.date : g.receivedDate,
            versions: [...(g.versions || []), versionEntry]
          };
        });

        return { ...ld, inputGateways: newGateways };
      });

      return { ...p, launchDetails: newLaunchDetails };
    }));

    // Rework Logic
    // If status is 'Received' (and it's a re-delivery i.e., version > 1) OR 'Late'
    // Find tasks that depend on this gateway
    const project = projects.find(p => p.id === projectId);
    const gateway = project?.launchDetails?.find(ld => ld.market === market)?.inputGateways?.find(g => g.name === gatewayName);
    const isRedelivery = (gateway?.versions?.length || 0) > 0;

    if (updateData.status === 'Late' || (updateData.status === 'Received' && isRedelivery)) {
      // Find dependent tasks
      // We need to look at the TEMPLATES to find which tasks depend on this gateway
      // But we also need to find the ACTUAL tasks in the project that correspond to those template tasks.
      // For simplicity, we'll search tasks by title that match the template tasks with this dependency.

      const template = taskTemplates[project.type]?.[project.scale];
      if (template) {
        const dependentTemplateTasks = template.filter(t => t.gatewayDependency === gatewayName);

        dependentTemplateTasks.forEach(dt => {
          // Find the existing task in the project to use as a predecessor?
          // Or just create a new independent rework task.
          // Let's create a "Rework" task.

          const reworkTask = {
            projectId,
            title: `Rework: ${dt.title} (${market})`,
            status: 'Planning',
            assignee: null,
            estimate: Math.ceil(dt.estimate * 0.3), // Assume 30% rework
            isMarketSpecific: true,
            marketStatus: { [market]: 'Planning' },
            marketStatus: { [market]: 'Planning' },
            startDate: updateData.date,
            endDate: format(addDays(new Date(updateData.date), 5), 'yyyy-MM-dd'), // Default 5 days from gateway date
            predecessorId: null, // Could link to the previous task if we could find it easily
            isRework: true,
            gatewaySource: gatewayName
          };

          addTask(reworkTask);
        });
      }
    }
  };

  return (
    <AppContext.Provider value={{
      projects: projectsWithCosts,
      resources,
      tasks,
      teams,
      taskTemplates,
      selectedProjectIds,
      toggleProjectSelection,
      addProject,
      deleteProject,
      addTask,
      updateTask,
      deleteTask,
      updateResource,
      addResource,
      deleteResource,
      addTeam,
      removeTeam,
      updateTaskTemplate,
      markets,
      addMarket,
      removeMarket,
      gatewayTemplates,
      updateGatewayTemplate,
      autoAssignTasks,
      updateGateway, // Exporting the new function
      initiatives,
      addInitiative,
      updateInitiative,
      linkTaskToInitiative,
      unlinkTaskFromInitiative,
      leaveRequests,
      submitLeaveRequest,
      // Business Outcomes KPI data
      kpiDefinitions,
      portfolioKPIs,
      valueGaps,
      addKpiDefinition,
      updateKpiDefinition,
      deleteKpiDefinition,
      updateKpiValue,
      // AI Orchestrator support
      updateProjectFields,
      setProjects
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
