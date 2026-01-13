/**
 * React Query hooks for data fetching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    projectsApi,
    tasksApi,
    resourcesApi,
    initiativesApi,
    kviApi
} from '../api/client';

// Query keys
export const queryKeys = {
    projects: ['projects'],
    project: (id) => ['projects', id],
    tasks: ['tasks'],
    tasksByProject: (projectId) => ['tasks', { projectId }],
    resources: ['resources'],
    initiatives: ['initiatives'],
    initiative: (id) => ['initiatives', id],
    portfolioHealth: ['kvi', 'portfolio-health'],
    initiativeValue: ['kvi', 'initiative-value'],
    scheduleVariance: ['kvi', 'schedule-variance'],
};

// Projects hooks
export function useProjects(options = {}) {
    return useQuery({
        queryKey: queryKeys.projects,
        queryFn: projectsApi.list,
        ...options
    });
}

export function useProject(id, options = {}) {
    return useQuery({
        queryKey: queryKeys.project(id),
        queryFn: () => projectsApi.get(id),
        enabled: !!id,
        ...options
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: projectsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        },
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => projectsApi.update(id, data),
        onSuccess: (data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
            queryClient.invalidateQueries({ queryKey: queryKeys.project(id) });
        },
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: projectsApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
        },
    });
}

export function useUpdateGateway() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ projectId, gatewayId, data }) =>
            projectsApi.updateGateway(projectId, gatewayId, data),
        onSuccess: (data, { projectId }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.projects });
            queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

// Tasks hooks
export function useTasks(projectId = null, options = {}) {
    return useQuery({
        queryKey: projectId ? queryKeys.tasksByProject(projectId) : queryKeys.tasks,
        queryFn: () => tasksApi.list(projectId),
        ...options
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: tasksApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => tasksApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: tasksApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

export function useAutoAssignTasks() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: tasksApi.autoAssign,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
            queryClient.invalidateQueries({ queryKey: queryKeys.resources });
        },
    });
}

// Resources hooks
export function useResources(options = {}) {
    return useQuery({
        queryKey: queryKeys.resources,
        queryFn: resourcesApi.list,
        ...options
    });
}

export function useCreateResource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resourcesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.resources });
        },
    });
}

export function useUpdateResource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => resourcesApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.resources });
        },
    });
}

export function useDeleteResource() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resourcesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.resources });
        },
    });
}

// Initiatives hooks
export function useInitiatives(options = {}) {
    return useQuery({
        queryKey: queryKeys.initiatives,
        queryFn: initiativesApi.list,
        ...options
    });
}

export function useInitiative(id, options = {}) {
    return useQuery({
        queryKey: queryKeys.initiative(id),
        queryFn: () => initiativesApi.get(id),
        enabled: !!id,
        ...options
    });
}

export function useCreateInitiative() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: initiativesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
        },
    });
}

export function useUpdateInitiative() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }) => initiativesApi.update(id, data),
        onSuccess: (data, { id }) => {
            queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
            queryClient.invalidateQueries({ queryKey: queryKeys.initiative(id) });
        },
    });
}

export function useDeleteInitiative() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: initiativesApi.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
        },
    });
}

export function useLinkTaskToInitiative() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ initiativeId, taskId, values }) =>
            initiativesApi.linkTask(initiativeId, taskId, values),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

export function useUnlinkTaskFromInitiative() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ initiativeId, taskId }) =>
            initiativesApi.unlinkTask(initiativeId, taskId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
            queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
        },
    });
}

// KVI hooks
export function usePortfolioHealth(options = {}) {
    return useQuery({
        queryKey: queryKeys.portfolioHealth,
        queryFn: kviApi.getPortfolioHealth,
        ...options
    });
}

export function useInitiativeValue(options = {}) {
    return useQuery({
        queryKey: queryKeys.initiativeValue,
        queryFn: kviApi.getInitiativeValue,
        ...options
    });
}

export function useScheduleVariance(options = {}) {
    return useQuery({
        queryKey: queryKeys.scheduleVariance,
        queryFn: kviApi.getScheduleVariance,
        ...options
    });
}
