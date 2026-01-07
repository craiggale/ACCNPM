import React, { createContext, useContext, useState } from 'react';
import { subWeeks, addWeeks, format, differenceInDays, addDays } from 'date-fns';

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
  // Admin State
  const [teams, setTeams] = useState(['Website', 'Configurator', 'Asset Production']);
  const [markets, setMarkets] = useState(['US', 'UK', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'Canada']);
  const [taskTemplates, setTaskTemplates] = useState(INITIAL_TASK_TEMPLATES);
  const [gatewayTemplates, setGatewayTemplates] = useState(INITIAL_GATEWAY_TEMPLATES);

  // Mock Data - Projects
  const [projects, setProjects] = useState([
    {
      id: 1,
      name: 'Falcon GT',
      status: 'Active',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2026-01-01',
      endDate: '2026-06-30',
      originalEndDate: '2026-06-30',
      type: 'Website',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-01-01',
          inputGateways: [
            {
              name: 'Design Sign-off',
              status: 'Received',
              expectedDate: '2026-01-01',
              receivedDate: '2025-12-15',
              versions: [
                { version: 1, status: 'Received', date: '2025-12-10', isOnTime: true, notes: 'Initial delivery' },
                { version: 2, status: 'Received', date: '2025-12-15', isOnTime: true, notes: 'Updated based on feedback' }
              ]
            },
            { name: 'Content Approval', status: 'Received', expectedDate: '2026-01-01', receivedDate: '2025-12-20' }
          ]
        },
        ...Array.from({ length: 10 }).map((_, i) => ({
          market: ['US', 'UK', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'Canada'][i],
          goalLive: `2026-${String(i + 1).padStart(2, '0')}-01`,
          inputGateways: [
            { name: 'Design Sign-off', status: i % 2 === 0 ? 'Received' : 'Pending', expectedDate: `2026-${String(i + 1).padStart(2, '0')}-15`, receivedDate: i % 2 === 0 ? `2026-${String(i + 1).padStart(2, '0')}-10` : null },
            { name: 'Content Approval', status: 'Pending', expectedDate: `2026-${String(i + 2).padStart(2, '0')}-01`, receivedDate: null }
          ]
        }))]
    },
    {
      id: 2,
      name: 'Eagle SUV',
      status: 'Planning',
      health: 'At Risk',
      pm: 'Sarah',
      pmUserId: 'user-mike',
      org_id: 'org-acme',
      startDate: '2026-03-01',
      endDate: '2026-08-31',
      originalEndDate: '2026-08-15',
      type: 'Configurator',
      scale: 'Medium',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-03-01',
          inputGateways: [
            { name: '3D Asset Freeze', status: 'Received', expectedDate: '2026-02-15', receivedDate: '2026-02-10' }
          ]
        },
        ...Array.from({ length: 10 }).map((_, i) => ({
          market: ['US', 'UK', 'Germany', 'France', 'Italy', 'Spain', 'Japan', 'Australia', 'Brazil', 'Canada'][i],
          goalLive: `2026-${String(i + 2).padStart(2, '0')}-15`,
          inputGateways: [
            { name: '3D Asset Freeze', status: i < 3 ? 'Received' : 'Pending', expectedDate: `2026-${String(i + 3).padStart(2, '0')}-01`, receivedDate: i < 3 ? `2026-${String(i + 3).padStart(2, '0')}-01` : null }
          ]
        }))]
    },
    {
      id: 3,
      name: 'Phoenix EV',
      status: 'Completed',
      health: 'On Track',
      pm: 'Marcus',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      originalEndDate: '2025-12-31',
      type: 'Asset Production',
      scale: 'Large',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2025-12-01',
          inputGateways: [
            { name: 'Creative Brief', status: 'Received', expectedDate: '2025-11-01', receivedDate: '2025-10-28' },
            { name: 'High-Res Final', status: 'Received', expectedDate: '2025-12-01', receivedDate: '2025-12-01' }
          ]
        },
        {
          market: 'US',
          goalLive: '2026-01-01',
          inputGateways: [
            { name: 'Creative Brief', status: 'Received', expectedDate: '2025-11-01', receivedDate: '2025-10-28' },
            { name: 'High-Res Final', status: 'Received', expectedDate: '2025-12-01', receivedDate: '2025-12-01' }
          ]
        }
      ]
    },
    {
      id: 4,
      name: 'Hawk Sedan',
      status: 'Proposed',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2026-07-01',
      endDate: '2026-12-31',
      originalEndDate: '2026-12-31',
      type: 'Website',
      scale: 'Small',
      launchDetails: []
    },
    {
      id: 5,
      name: 'Phoenix EV - Rework Demo',
      status: 'Active',
      health: 'Late',
      pm: 'Sarah',
      pmUserId: 'user-mike',
      org_id: 'org-acme',
      startDate: '2026-01-01',
      endDate: '2026-03-31',
      originalEndDate: '2026-03-15',
      type: 'Website',
      scale: 'Small',
      launchDetails: [
        {
          market: 'Global',
          goalLive: '2026-03-31',
          inputGateways: [
            {
              name: 'Design Sign-off',
              status: 'Received',
              expectedDate: '2026-01-15',
              receivedDate: '2026-01-20',
              versions: [
                { version: 1, status: 'Late', date: '2026-01-10', isOnTime: false, notes: 'Rejected due to missing assets' },
                { version: 2, status: 'Received', date: '2026-01-20', isOnTime: false, notes: 'Approved with conditions' }
              ]
            },
            { name: 'Content Approval', status: 'Pending', expectedDate: '2026-02-01', receivedDate: null }
          ]
        }
      ]
    },
    {
      id: 6,
      name: 'Falcon GT (2025)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-emily',
      org_id: 'org-globex',
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      originalEndDate: '2025-06-30',
      type: 'Website',
      scale: 'Medium',
      launchDetails: []
    },
    {
      id: 7,
      name: 'Falcon GT (2024)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
      originalEndDate: '2024-06-30',
      type: 'Website',
      scale: 'Medium',
      launchDetails: []
    },
    {
      id: 8,
      name: 'Eagle SUV (2025)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Sarah',
      pmUserId: 'user-emily',
      org_id: 'org-globex',
      startDate: '2025-03-01',
      endDate: '2025-08-31',
      originalEndDate: '2025-08-31',
      type: 'Configurator',
      scale: 'Medium',
      launchDetails: []
    },
    {
      id: 9,
      name: 'Eagle SUV (2024)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Sarah',
      pmUserId: 'user-david',
      org_id: 'org-globex',
      startDate: '2024-03-01',
      endDate: '2024-08-31',
      originalEndDate: '2024-08-31',
      type: 'Configurator',
      scale: 'Medium',
      launchDetails: []
    },
    {
      id: 10,
      name: 'Phoenix EV (2024)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Marcus',
      pmUserId: 'user-emily',
      org_id: 'org-globex',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      originalEndDate: '2024-12-31',
      type: 'Asset Production',
      scale: 'Large',
      launchDetails: []
    },
    {
      id: 11,
      name: 'Phoenix EV (2023)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Marcus',
      pmUserId: 'user-david',
      org_id: 'org-globex',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
      originalEndDate: '2023-12-31',
      type: 'Asset Production',
      scale: 'Large',
      launchDetails: []
    },
    {
      id: 12,
      name: 'Hawk Sedan (2025)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2025-07-01',
      endDate: '2025-12-31',
      originalEndDate: '2025-12-31',
      type: 'Website',
      scale: 'Small',
      launchDetails: []
    },
    {
      id: 13,
      name: 'Hawk Sedan (2024)',
      status: 'Completed',
      health: 'On Track',
      pm: 'Anand',
      pmUserId: 'user-sarah',
      org_id: 'org-acme',
      startDate: '2024-07-01',
      endDate: '2024-12-31',
      originalEndDate: '2024-12-31',
      type: 'Website',
      scale: 'Small',
      launchDetails: []
    }
  ]);

  // Mock Data - Resources
  const [resources, setResources] = useState([
    { id: 1, name: 'Sarah Jenkins', role: 'Frontend Lead', team: 'Website', capacity: 160, leave: 0, org_id: 'org-acme', userId: 'user-sarah' },
    { id: 2, name: 'Mike Ross', role: '3D Artist', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-acme', userId: 'user-mike' },
    { id: 3, name: 'David Lee', role: 'Product Owner', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-globex', userId: 'user-david' },
    { id: 4, name: 'Emily Chen', role: 'Developer', team: 'Website', capacity: 160, leave: 0, org_id: 'org-globex', userId: 'user-emily' },
    { id: 5, name: 'James Wilson', role: 'QA', team: 'Website', capacity: 160, leave: 0, org_id: 'org-acme' },
    { id: 6, name: 'Anna Garcia', role: 'Designer', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-globex' },
    { id: 7, name: 'Robert Taylor', role: 'Manager', team: 'Asset Production', capacity: 160, leave: 0, org_id: 'org-acme' },
    { id: 8, name: 'Lisa Wong', role: 'Developer', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-globex' },
    { id: 9, name: 'Tom Baker', role: 'QA', team: 'Configurator', capacity: 160, leave: 0, org_id: 'org-acme' },
  ]);

  // Mock Data - Initiatives
  const [initiatives, setInitiatives] = useState([
    {
      id: 1,
      name: 'Auto-Bot Rollout',
      businessGoal: 'Reduce manual data entry by 50%',
      status: 'On Track',
      valueProposition: 'Automate repetitive tasks and reduce manual data entry time.',
      changeType: 'Automate Task',
      startDate: '2025-01-01',
      org_id: 'org-acme',
      valueMetrics: ['Efficiency Gains - FTE Hour Reduction (Hrs)', 'Efficiency Gains - FTE Fee Reduction (£)'],
      impactedTasks: [
        { taskId: 1001, taskTitle: 'Frontend Development', projectId: 6, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 40 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 2000 }], dateLinked: '2025-02-15' },
        { taskId: 1002, taskTitle: 'QA', projectId: 6, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 25 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 1250 }], dateLinked: '2025-03-10' },
        { taskId: 1003, taskTitle: 'UI Implementation', projectId: 8, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 40 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 2000 }], dateLinked: '2025-04-20' },
        { taskId: 1004, taskTitle: 'Integration Testing', projectId: 8, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 25 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 1250 }], dateLinked: '2025-05-05' },
        { taskId: 1005, taskTitle: 'Frontend Dev', projectId: 12, valuesAdded: [{ metric: 'Efficiency Gains - FTE Hour Reduction (Hrs)', value: 30 }, { metric: 'Efficiency Gains - FTE Fee Reduction (£)', value: 1500 }], dateLinked: '2025-08-12' }
      ]
    },
    {
      id: 2,
      name: 'Global Asset Reuse Repository',
      businessGoal: 'Reduce external asset purchase costs by 40%',
      status: 'On Track',
      valueProposition: 'Centralize assets to prevent duplicate purchases.',
      changeType: 'Process Improvement',
      startDate: '2024-11-01',
      org_id: 'org-acme',
      valueMetrics: ['Efficiency Gains - Asset Cost Reduction (£)'],
      impactedTasks: [
        { taskId: 2001, taskTitle: 'UI Design', projectId: 6, valuesAdded: [{ metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 5000 }], dateLinked: '2025-01-20' },
        { taskId: 2002, taskTitle: '3D Asset Prep', projectId: 8, valuesAdded: [{ metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 12000 }], dateLinked: '2025-03-15' },
        { taskId: 2003, taskTitle: 'Full CGI Video', projectId: 10, valuesAdded: [{ metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 8500 }], dateLinked: '2024-06-10' },
        { taskId: 2004, taskTitle: 'UI Design', projectId: 12, valuesAdded: [{ metric: 'Efficiency Gains - Asset Cost Reduction (£)', value: 4500 }], dateLinked: '2025-07-25' }
      ]
    },
    {
      id: 3,
      name: 'Personalized Product Recommender',
      businessGoal: 'Increase cross-sell revenue by £1M',
      status: 'Planning',
      valueProposition: 'Use AI to suggest relevant add-ons during checkout.',
      changeType: 'Technology Upgrade',
      startDate: '2025-03-01',
      org_id: 'org-globex',
      valueMetrics: ['Growth Impact - Sales Revenue (£)'],
      impactedTasks: [
        { taskId: 3001, taskTitle: 'CMS Integration', projectId: 6, valuesAdded: [{ metric: 'Growth Impact - Sales Revenue (£)', value: 150000 }], dateLinked: '2025-05-30' },
        { taskId: 3002, taskTitle: 'Frontend Dev', projectId: 12, valuesAdded: [{ metric: 'Growth Impact - Sales Revenue (£)', value: 75000 }], dateLinked: '2025-11-15' }
      ]
    },
    {
      id: 4,
      name: 'Core Web Vitals Optimization',
      businessGoal: 'Improve site performance to boost customer satisfaction',
      status: 'At Risk',
      valueProposition: 'Optimize LCP and CLS scores across all markets.',
      changeType: 'Technology Upgrade',
      startDate: '2025-02-01',
      org_id: 'org-globex',
      valueMetrics: ['Brand & Experience - NPS Score (%)'],
      impactedTasks: [
        { taskId: 4001, taskTitle: 'Frontend Dev', projectId: 6, valuesAdded: [{ metric: 'Brand & Experience - NPS Score (%)', value: 5 }], dateLinked: '2025-04-10' },
        { taskId: 4002, taskTitle: 'Frontend Dev', projectId: 12, valuesAdded: [{ metric: 'Brand & Experience - NPS Score (%)', value: 3 }], dateLinked: '2025-09-20' }
      ]
    }
  ]);

  // Mock Data - Tasks (for Track the Present)
  const [tasks, setTasks] = useState(() => {
    const initialTasks = [];
    projects.forEach(project => {
      const template = INITIAL_TASK_TEMPLATES[project.type]?.[project.scale];
      if (template) {
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
              if (t.title === 'Frontend Development') { actual = 80; valueSaved = 40; linkedInitiativeId = 1; } // Saved 40h (Auto-Bot)
              if (t.title === 'QA') { actual = 15; valueSaved = 25; linkedInitiativeId = 1; } // Saved 25h (Auto-Bot)
              if (t.title === 'UI Design') { actual = 55; valueSaved = 5000; linkedInitiativeId = 2; } // Saved 5000 (Asset Reuse)
              if (t.title === 'CMS Integration') { actual = 70; valueSaved = 150000; linkedInitiativeId = 3; } // Saved 150k Revenue
            }
            // Eagle SUV (2025) - ID 8
            if (project.id === 8) {
              if (t.title === 'UI Implementation') { actual = 40; valueSaved = 40; linkedInitiativeId = 1; } // Saved 40h (Auto-Bot)
              if (t.title === 'Integration Testing') { actual = 15; valueSaved = 25; linkedInitiativeId = 1; } // Saved 25h (Auto-Bot)
              if (t.title === '3D Asset Prep') { actual = 60; valueSaved = 12000; linkedInitiativeId = 2; } // Saved 12k (Asset Reuse)
            }
            // Hawk Sedan (2025) - ID 12
            if (project.id === 12) {
              if (t.title === 'Frontend Dev') { actual = 5; valueSaved = 30; linkedInitiativeId = 1; } // Saved 30h (Auto-Bot)
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
                // Use a deterministic way to pick status so it doesn't change on every render if we were using random,
                // but here we are initializing state so random is fine for initial load.
                // However, let's make it look realistic based on project status.
                if (project.status === 'Completed') {
                  marketStatus[ld.market] = 'Completed';
                } else if (project.status === 'Planning') {
                  marketStatus[ld.market] = 'Planning';
                } else {
                  // Active project: mix of statuses
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

  // Scenario Planner State
  const [selectedProjectIds, setSelectedProjectIds] = useState([]);

  const toggleProjectSelection = (projectId) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const addProject = (newProject) => {
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

  const deleteProject = (projectId) => {
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

      // 2. Check for dependency conflicts and resolve them
      if (updatedFields.endDate) {
        const resolveDependencies = (tasks, parentId) => {
          const parent = tasks.find(t => t.id === parentId);
          if (!parent) return tasks;

          const successors = tasks.filter(t => t.predecessorId === parentId);

          successors.forEach(successor => {
            const parentEnd = new Date(parent.endDate);
            const successorStart = new Date(successor.startDate);

            // If parent ends after successor starts, push successor
            if (parentEnd >= successorStart) {
              const duration = differenceInDays(new Date(successor.endDate), new Date(successor.startDate));
              const newStart = addDays(parentEnd, 1); // Start next day
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
  const addResource = (newResource) => {
    setResources(prev => [
      ...prev,
      { ...newResource, id: Math.max(...prev.map(r => r.id), 0) + 1, leave: 0 }
    ]);
  };

  const updateResource = (id, updatedFields) => {
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...updatedFields } : r));
  };

  const deleteResource = (id) => {
    setResources(prev => prev.filter(r => r.id !== id));
  };

  // Initiative Management
  const addInitiative = (newInitiative) => {
    setInitiatives(prev => [
      ...prev,
      { ...newInitiative, id: Math.max(...prev.map(i => i.id), 0) + 1, impactedTasks: [] }
    ]);
  };

  const updateInitiative = (id, updatedFields) => {
    setInitiatives(prev => prev.map(i => i.id === id ? { ...i, ...updatedFields } : i));
  };

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

  const autoAssignTasks = () => {
    let updatedTasks = tasks.map(t => ({ ...t, assignee: null }));
    let resourceUsage = resources.map(r => ({ ...r, used: 0 }));
    let gaps = [];

    updatedTasks.forEach(task => {
      const project = projects.find(p => p.id === task.projectId);
      if (!project) return;

      const requiredTeam = project.type;
      const estimate = parseInt(task.estimate) || 0;

      // Find suitable resource: Match Team AND have Capacity
      const bestResource = resourceUsage.find(r =>
        r.team === requiredTeam && (parseInt(r.capacity) - (parseInt(r.leave) || 0) - r.used) >= estimate
      );

      if (bestResource) {
        task.assignee = bestResource.id;
        bestResource.used += estimate;
      } else {
        gaps.push({
          taskId: task.id,
          taskTitle: task.title,
          projectName: project.name,
          requiredTeam: requiredTeam,
          estimate: estimate,
          reason: resourceUsage.some(r => r.team === requiredTeam) ? 'Insufficient Capacity' : 'No Team Members'
        });
      }
    });

    setTasks(updatedTasks);
    return gaps;
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
      projects,
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
      addResource,
      updateResource,
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
      unlinkTaskFromInitiative
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
