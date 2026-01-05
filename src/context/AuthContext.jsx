/**
 * Auth Context - Authentication state management
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, apiClient } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing token on mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
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
        }
    }, []);

    const login = useCallback(async (email, password) => {
        const response = await authApi.login({ email, password });
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setIsAuthenticated(true);
        return response.user;
    }, []);

    const register = useCallback(async (userData, orgData) => {
        const response = await authApi.register(userData, orgData);
        apiClient.setToken(response.access_token);
        setUser(response.user);
        setIsAuthenticated(true);
        return response.user;
    }, []);

    const logout = useCallback(() => {
        apiClient.setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
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
