/**
 * useAIAssistant — React hook managing the full AI reasoning loop.
 * 
 * Flow:
 *  1. User sends prompt → hook calls POST /api/ai/chat with prompt + context
 *  2. LLM returns structured intent JSON → hook calls Orchestrator.dispatch()
 *  3. Orchestrator returns read-only result → hook sends result to /api/ai/narrate
 *  4. LLM narrates the outcome → hook returns narration + pending actions to UI
 */

import { useState, useCallback, useRef } from 'react';
import { Orchestrator } from '../services/Orchestrator';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export function useAIAssistant(appData, appContext) {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: 'Hello! I\'m your AI assistant. I can help you with resource conflicts, team capacity, project schedules, and more. What would you like to know?',
            timestamp: new Date(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingActions, setPendingActions] = useState([]);
    const abortRef = useRef(null);

    /**
     * Build a context snapshot from current app data for the LLM.
     */
    const getContextSnapshot = useCallback(() => {
        if (!appData) return {};
        return {
            projectCount: appData.projects?.length || 0,
            projectNames: appData.projects?.map(p => p.name) || [],
            resourceCount: appData.resources?.length || 0,
            activeProjects: appData.projects?.filter(p => !p.isDraft).length || 0,
            draftProjects: appData.projects?.filter(p => p.isDraft).length || 0,
        };
    }, [appData]);

    /**
     * Call the LLM chat endpoint.
     */
    const callLLM = useCallback(async (prompt, context, history) => {
        const response = await fetch(`${API_BASE}/api/ai/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                prompt,
                context,
                conversation_history: history,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`LLM service error (${response.status}): ${errText}`);
        }

        return response.json();
    }, []);

    /**
     * Call the narration endpoint.
     */
    const callNarrate = useCallback(async (prompt, toolResults) => {
        const response = await fetch(`${API_BASE}/api/ai/narrate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({
                prompt,
                context: toolResults,
            }),
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    }, []);

    /**
     * Main send message handler — executes the full reasoning loop.
     */
    const sendMessage = useCallback(async (prompt) => {
        if (!prompt.trim() || isLoading) return;

        // Add user message
        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: prompt,
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // STEP 1: Send to LLM for intent parsing
            const conversationHistory = messages
                .filter(m => m.id !== 'welcome')
                .slice(-6)
                .map(m => ({ role: m.role, content: m.content }));

            const llmResponse = await callLLM(prompt, getContextSnapshot(), conversationHistory);

            // STEP 2: If we have a parsed intent, dispatch to Orchestrator
            if (llmResponse.intent && llmResponse.intent.action) {
                const { action, params } = llmResponse.intent;
                const toolResult = Orchestrator.dispatch(action, params || {}, appData || {});

                // Store pending actions if any
                if (toolResult.suggestedActions.length > 0) {
                    setPendingActions(toolResult.suggestedActions);
                }

                // STEP 3: Send tool results back to LLM for narration
                const narrationResult = await callNarrate(prompt, {
                    toolUsed: toolResult.toolLabel,
                    action,
                    ...toolResult.result,
                    suggestedActionCount: toolResult.suggestedActions.length,
                });

                const narrationText = narrationResult?.narration || llmResponse.response;

                const assistantMsg = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: narrationText,
                    toolUsed: toolResult.toolLabel,
                    hasActions: toolResult.suggestedActions.length > 0,
                    actions: toolResult.suggestedActions,
                    timestamp: new Date(),
                };

                setMessages(prev => [...prev, assistantMsg]);
            } else {
                // No structured intent — just show the LLM's response directly
                const assistantMsg = {
                    id: `assistant-${Date.now()}`,
                    role: 'assistant',
                    content: llmResponse.response,
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, assistantMsg]);
            }
        } catch (error) {
            console.error('AI Assistant error:', error);

            const errorMsg = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `I'm sorry, I encountered an error: ${error.message}. Please try again.`,
                isError: true,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, appData, callLLM, callNarrate, getContextSnapshot]);

    /**
     * Confirm a suggested action — this is the ONLY path that mutates state.
     */
    const confirmAction = useCallback((actionItem) => {
        const success = Orchestrator.applyAction(actionItem, appContext);

        if (success) {
            // Add confirmation message
            const confirmMsg = {
                id: `confirm-${Date.now()}`,
                role: 'assistant',
                content: `✅ Applied: "${actionItem.label}". The change has been saved.`,
                isConfirmation: true,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, confirmMsg]);

            // Remove this action from pending
            setPendingActions(prev => prev.filter(a => a.id !== actionItem.id));
        } else {
            const failMsg = {
                id: `fail-${Date.now()}`,
                role: 'assistant',
                content: `❌ Failed to apply "${actionItem.label}". The action could not be completed.`,
                isError: true,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, failMsg]);
        }

        return success;
    }, [appContext]);

    /**
     * Dismiss a suggested action without applying it.
     */
    const dismissAction = useCallback((actionId) => {
        setPendingActions(prev => prev.filter(a => a.id !== actionId));
    }, []);

    /**
     * Clear the conversation and reset.
     */
    const clearConversation = useCallback(() => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: 'Conversation cleared. How can I help you?',
            timestamp: new Date(),
        }]);
        setPendingActions([]);
    }, []);

    return {
        messages,
        sendMessage,
        isLoading,
        pendingActions,
        confirmAction,
        dismissAction,
        clearConversation,
    };
}

export default useAIAssistant;
