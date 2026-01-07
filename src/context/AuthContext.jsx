/**
 * Auth Context - Authentication state management for Hybrid Tenancy
 * 
 * Supports:
 * - Two-phase login (credentials → org selection if multiple orgs)
 * - Session-scoped organization context
 * - Organization switching mid-session
 * - Demo mode for local testing
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, apiClient } from '../api/client';
import { USERS, ORGANIZATIONS, getUserById, getOrgById, getAllUsers, DEFAULT_DEMO_USER_ID } from '../data/authData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Two-phase login state
    const [pendingAuthToken, setPendingAuthToken] = useState(null);
    const [pendingOrgs, setPendingOrgs] = useState(null); // Orgs to choose from after phase 1
    const [requiresOrgSelection, setRequiresOrgSelection] = useState(false);

    // Current session org context (from JWT for real auth, or from user for demo)
    const [currentOrgId, setCurrentOrgId] = useState(null);
    const [currentOrgName, setCurrentOrgName] = useState(null);

    // User's assigned organizations (for org switching)
    const [userOrganizations, setUserOrganizations] = useState([]);

    // Demo Mode Impersonation State
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [impersonatedUserId, setImpersonatedUserId] = useState(DEFAULT_DEMO_USER_ID);

    // Computed current user (impersonated user in demo mode, real user otherwise)
    const currentUser = useMemo(() => {
        if (isDemoMode && impersonatedUserId) {
            const demoUser = getUserById(impersonatedUserId);
            if (demoUser) {
                const org = getOrgById(demoUser.org_id);
                return {
                    ...demoUser,
                    organization: org,
                    current_org_id: demoUser.org_id,
                    current_org_name: org?.name,
                    isDemo: true
                };
            }
        }
        if (user) {
            return {
                ...user,
                current_org_id: currentOrgId,
                current_org_name: currentOrgName
            };
        }
        return null;
    }, [isDemoMode, impersonatedUserId, user, currentOrgId, currentOrgName]);

    // Get current organization
    const currentOrg = useMemo(() => {
        if (isDemoMode && currentUser?.org_id) {
            return getOrgById(currentUser.org_id);
        }
        if (currentOrgId) {
            return userOrganizations.find(o => o.id === currentOrgId) || { id: currentOrgId, name: currentOrgName };
        }
        return null;
    }, [isDemoMode, currentUser, currentOrgId, currentOrgName, userOrganizations]);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !isDemoMode) {
            apiClient.setToken(token);
            authApi.getMe()
                .then((userData) => {
                    setUser(userData);
                    setCurrentOrgId(userData.current_org_id);
                    setCurrentOrgName(userData.current_org_name);
                    setIsAuthenticated(true);
                    // Fetch user's organizations for switching
                    fetchMyOrganizations();
                })
                .catch(() => {
                    apiClient.setToken(null);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
            if (isDemoMode) {
                setIsAuthenticated(true);
            }
        }
    }, [isDemoMode]);

    // Fetch user's assigned organizations
    const fetchMyOrganizations = useCallback(async () => {
        try {
            const orgs = await authApi.getMyOrganizations();
            setUserOrganizations(orgs);
        } catch (error) {
            console.error('Failed to fetch organizations:', error);
        }
    }, []);

    /**
     * Phase 1 Login: Authenticate credentials
     * 
     * Returns:
     * - If single org: completes login, returns user
     * - If multiple orgs: returns { requiresOrgSelection: true, organizations: [...] }
     */
    const login = useCallback(async (email, password) => {
        const response = await authApi.login({ email, password });

        // Check if org selection is required
        if (response.requires_org_selection) {
            setPendingAuthToken(response.auth_token);
            setPendingOrgs(response.organizations);
            setRequiresOrgSelection(true);
            return {
                requiresOrgSelection: true,
                organizations: response.organizations
            };
        }

        // Single org - complete login
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setCurrentOrgId(response.user.current_org_id);
        setCurrentOrgName(response.user.current_org_name);
        setIsAuthenticated(true);
        setIsDemoMode(false);
        await fetchMyOrganizations();
        return { user: response.user };
    }, [fetchMyOrganizations]);

    /**
     * Phase 2 Login: Select organization to complete login
     */
    const selectOrganization = useCallback(async (orgId) => {
        if (!pendingAuthToken) {
            throw new Error('No pending auth token');
        }

        const response = await authApi.selectOrganization(pendingAuthToken, orgId);

        apiClient.setToken(response.access_token);
        setUser(response.user);
        setCurrentOrgId(response.user.current_org_id);
        setCurrentOrgName(response.user.current_org_name);
        setIsAuthenticated(true);
        setIsDemoMode(false);

        // Clear pending state
        setPendingAuthToken(null);
        setPendingOrgs(null);
        setRequiresOrgSelection(false);

        await fetchMyOrganizations();
        return response.user;
    }, [pendingAuthToken, fetchMyOrganizations]);

    /**
     * Switch organization mid-session
     * Calls select-organization endpoint to get new token for different org
     */
    const switchOrganization = useCallback(async (orgId) => {
        if (isDemoMode) {
            // In demo mode, just switch the impersonated user's org
            const newUser = Object.values(USERS).find(u => u.org_id === orgId);
            if (newUser) {
                setImpersonatedUserId(newUser.id);
            }
            return;
        }

        // For real auth, we need to get a new token via select-organization
        // This requires a fresh auth token, so we call a special switch endpoint
        try {
            const orgs = await authApi.getMyOrganizations();
            const targetOrg = orgs.find(o => o.id === orgId);

            if (!targetOrg) {
                throw new Error('You are not assigned to this organization');
            }

            // For now, we'll need to re-auth with select-organization
            // The backend would need a /auth/switch-organization endpoint for seamless switching
            // For MVP, we refresh the token
            const response = await authApi.switchOrganization(orgId);
            apiClient.setToken(response.access_token);
            setUser(response.user);
            setCurrentOrgId(response.user.current_org_id);
            setCurrentOrgName(response.user.current_org_name);

            // Trigger data refresh
            window.dispatchEvent(new CustomEvent('org-switched', { detail: { orgId } }));
        } catch (error) {
            console.error('Failed to switch organization:', error);
            throw error;
        }
    }, [isDemoMode]);

    const register = useCallback(async (userData, orgData) => {
        const response = await authApi.register(userData, orgData);
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setCurrentOrgId(response.user.current_org_id);
        setCurrentOrgName(response.user.current_org_name);
        setIsAuthenticated(true);
        setIsDemoMode(false);
        await fetchMyOrganizations();
        return response.user;
    }, [fetchMyOrganizations]);

    const logout = useCallback(() => {
        apiClient.setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setCurrentOrgId(null);
        setCurrentOrgName(null);
        setUserOrganizations([]);
        setPendingAuthToken(null);
        setPendingOrgs(null);
        setRequiresOrgSelection(false);
        setIsDemoMode(true);
        setImpersonatedUserId(DEFAULT_DEMO_USER_ID);
    }, []);

    // Demo Mode Functions
    const switchUser = useCallback((userId) => {
        if (USERS[userId]) {
            setImpersonatedUserId(userId);
        }
    }, []);

    const enableDemoMode = useCallback(() => {
        setIsDemoMode(true);
        setImpersonatedUserId(DEFAULT_DEMO_USER_ID);
        setIsAuthenticated(true);
    }, []);

    const disableDemoMode = useCallback(() => {
        setIsDemoMode(false);
        setImpersonatedUserId(null);
    }, []);

    const value = {
        user,
        currentUser,
        currentOrg,
        currentOrgId,
        currentOrgName,
        userOrganizations,
        isLoading,
        isAuthenticated,
        // Auth actions
        login,
        selectOrganization,
        switchOrganization,
        register,
        logout,
        // Two-phase login state
        requiresOrgSelection,
        pendingOrgs,
        // Demo mode
        isDemoMode,
        impersonatedUserId,
        switchUser,
        enableDemoMode,
        disableDemoMode,
        allDemoUsers: getAllUsers(),
        allDemoOrgs: Object.values(ORGANIZATIONS),
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
