/**
 * Real-time Context - WebSocket integration with React Query
 */

import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from './AuthContext';
import { queryKeys } from '../hooks/useApi';

const RealTimeContext = createContext(null);

export function RealTimeProvider({ children }) {
    const queryClient = useQueryClient();
    const { isAuthenticated } = useAuth();

    // Handle incoming WebSocket messages
    const handleMessage = useCallback((message) => {
        const { type, payload } = message;

        // Invalidate relevant queries based on event type
        switch (type) {
            case 'PROJECT_CREATED':
            case 'PROJECT_UPDATED':
            case 'PROJECT_DELETED':
            case 'GATEWAY_UPDATED':
                queryClient.invalidateQueries({ queryKey: queryKeys.projects });
                queryClient.invalidateQueries({ queryKey: queryKeys.portfolioHealth });
                break;

            case 'TASK_CREATED':
            case 'TASK_UPDATED':
            case 'TASK_DELETED':
            case 'TASKS_AUTO_ASSIGNED':
                queryClient.invalidateQueries({ queryKey: queryKeys.tasks });
                break;

            case 'RESOURCE_CREATED':
            case 'RESOURCE_UPDATED':
            case 'RESOURCE_DELETED':
                queryClient.invalidateQueries({ queryKey: queryKeys.resources });
                break;

            case 'INITIATIVE_CREATED':
            case 'INITIATIVE_UPDATED':
            case 'INITIATIVE_DELETED':
                queryClient.invalidateQueries({ queryKey: queryKeys.initiatives });
                queryClient.invalidateQueries({ queryKey: queryKeys.initiativeValue });
                break;

            case 'CONNECTED':
                console.log('Real-time connection established:', payload.message);
                break;

            default:
                console.log('Unknown WebSocket event:', type);
        }
    }, [queryClient]);

    const { isConnected, disconnect, reconnect } = useWebSocket(
        isAuthenticated ? handleMessage : null
    );

    const value = {
        isConnected,
        disconnect,
        reconnect,
    };

    return (
        <RealTimeContext.Provider value={value}>
            {children}
        </RealTimeContext.Provider>
    );
}

export function useRealTime() {
    const context = useContext(RealTimeContext);
    if (!context) {
        throw new Error('useRealTime must be used within a RealTimeProvider');
    }
    return context;
}

export default RealTimeContext;
