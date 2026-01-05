/**
 * API Client - Axios instance with authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000/api' : '/api');

class ApiClient {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.token = localStorage.getItem('token');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }

    async request(method, endpoint, data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: this.getHeaders(),
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (response.status === 401) {
            this.setToken(null);
            window.location.href = '/login';
            throw new Error('Unauthorized');
        }

        if (response.status === 204) {
            return null;
        }

        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.detail || 'Request failed');
        }

        return json;
    }

    get(endpoint) {
        return this.request('GET', endpoint);
    }

    post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    patch(endpoint, data) {
        return this.request('PATCH', endpoint, data);
    }

    delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
}

export const apiClient = new ApiClient();

// Auth API
export const authApi = {
    register: (userData, orgData) =>
        apiClient.post('/auth/register', {
            email: userData.email,
            password: userData.password,
            name: userData.name,
            org_name: orgData.name,
            slug: orgData.slug
        }),

    login: (credentials) =>
        apiClient.post('/auth/login', credentials),

    getMe: () =>
        apiClient.get('/auth/me'),

    createUser: (userData) =>
        apiClient.post('/auth/users', userData),
};

// Projects API
export const projectsApi = {
    list: () =>
        apiClient.get('/projects'),

    get: (id) =>
        apiClient.get(`/projects/${id}`),

    create: (data) =>
        apiClient.post('/projects', data),

    update: (id, data) =>
        apiClient.patch(`/projects/${id}`, data),

    delete: (id) =>
        apiClient.delete(`/projects/${id}`),

    updateGateway: (projectId, gatewayId, data) =>
        apiClient.patch(`/projects/${projectId}/gateways/${gatewayId}`, data),
};

// Tasks API
export const tasksApi = {
    list: (projectId = null) => {
        const endpoint = projectId ? `/tasks?project_id=${projectId}` : '/tasks';
        return apiClient.get(endpoint);
    },

    get: (id) =>
        apiClient.get(`/tasks/${id}`),

    create: (data) =>
        apiClient.post('/tasks', data),

    update: (id, data) =>
        apiClient.patch(`/tasks/${id}`, data),

    delete: (id) =>
        apiClient.delete(`/tasks/${id}`),

    autoAssign: () =>
        apiClient.post('/tasks/auto-assign', {}),
};

// Resources API
export const resourcesApi = {
    list: () =>
        apiClient.get('/resources'),

    get: (id) =>
        apiClient.get(`/resources/${id}`),

    create: (data) =>
        apiClient.post('/resources', data),

    update: (id, data) =>
        apiClient.patch(`/resources/${id}`, data),

    delete: (id) =>
        apiClient.delete(`/resources/${id}`),
};

// Initiatives API
export const initiativesApi = {
    list: () =>
        apiClient.get('/initiatives'),

    get: (id) =>
        apiClient.get(`/initiatives/${id}`),

    create: (data) =>
        apiClient.post('/initiatives', data),

    update: (id, data) =>
        apiClient.patch(`/initiatives/${id}`, data),

    delete: (id) =>
        apiClient.delete(`/initiatives/${id}`),

    linkTask: (initiativeId, taskId, values) =>
        apiClient.post(`/initiatives/${initiativeId}/link-task`, { task_id: taskId, values }),

    unlinkTask: (initiativeId, taskId) =>
        apiClient.delete(`/initiatives/${initiativeId}/unlink-task/${taskId}`),
};

// KVI API
export const kviApi = {
    getPortfolioHealth: () =>
        apiClient.get('/kvi/portfolio-health'),

    getInitiativeValue: () =>
        apiClient.get('/kvi/initiative-value'),

    getScheduleVariance: () =>
        apiClient.get('/kvi/schedule-variance'),
};

export default apiClient;
