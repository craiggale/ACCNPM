/**
 * Auth Context - Authentication state management with Demo Impersonation
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authApi, apiClient } from '../api/client';
import { USERS, ORGANIZATIONS, getUserById, getOrgById, getAllUsers, DEFAULT_DEMO_USER_ID } from '../data/authData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Demo Mode Impersonation State
    const [isDemoMode, setIsDemoMode] = useState(true); // Enable demo mode by default
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
                    isDemo: true
                };
            }
        }
        return user;
    }, [isDemoMode, impersonatedUserId, user]);

    // Get current organization
    const currentOrg = useMemo(() => {
        if (currentUser?.org_id) {
            return getOrgById(currentUser.org_id);
        }
        return null;
    }, [currentUser]);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !isDemoMode) {
            apiClient.setToken(token);
            authApi.getMe()
                .then((userData) => {
                    setUser(userData);
                    setIsAuthenticated(true);
                })
                .catch(() => {
                    // Token invalid, clear it
                    apiClient.setToken(null);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
            setIsLoading(false);
            if (isDemoMode) {
                setIsAuthenticated(true); // Auto-authenticate in demo mode
            }
        }
    }, [isDemoMode]);

    const login = useCallback(async (email, password) => {
        const response = await authApi.login({ email, password });
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setIsAuthenticated(true);
        setIsDemoMode(false); // Exit demo mode on real login
        return response.user;
    }, []);

    const register = useCallback(async (userData, orgData) => {
        const response = await authApi.register(userData, orgData);
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setIsAuthenticated(true);
        setIsDemoMode(false);
        return response.user;
    }, []);

    const logout = useCallback(() => {
        apiClient.setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        setIsDemoMode(true); // Return to demo mode on logout
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
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
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

