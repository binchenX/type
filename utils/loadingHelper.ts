/**
 * Loading state helper functions for creating consistent loading indicators
 */

import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

/**
 * Creates a loading indicator based on the current loading state
 * @param isLoading Current loading state
 * @param message Loading message to display
 * @param subMessage Optional subtext to display
 * @param size Size of the spinner (small, medium, large)
 * @returns The loading spinner component or null if not loading
 */
export function getLoadingIndicator(
    isLoading: boolean,
    message: string = 'Loading...',
    subMessage?: string,
    size: 'small' | 'medium' | 'large' = 'medium'
): React.ReactNode {
    if (!isLoading) return null;

    return (
        <LoadingSpinner
            message= { message }
    subMessage = { subMessage }
    size = { size }
        />
    );
}

/**
 * Creates an inline loading indicator for buttons
 * @param isLoading Current loading state 
 * @returns A styled inline loading spinner or the original content if not loading
 */
export function getInlineLoading(
    isLoading: boolean,
    loadingText: string = 'Loading...',
    originalContent: React.ReactNode
): React.ReactNode {
    if (!isLoading) return originalContent;

    return (
        <div style= {{
        display: 'flex',
            alignItems: 'center',
                gap: '8px'
    }
}>
    <div style={
        {
            position: 'relative',
                width: '16px',
                    height: '16px',
                        borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: '#fff',
                                    animation: 'spin 1s linear infinite'
        }
} />
    < span > { loadingText } </span>
    </div>
    );
}

/**
 * Creates a fullscreen loading overlay
 * @param isLoading Current loading state
 * @param message Message to display  
 * @param subMessage Optional submessage
 */
export function getFullscreenLoading(
    isLoading: boolean,
    message: string = 'Loading content...',
    subMessage?: string
): React.ReactNode {
    if (!isLoading) return null;

    return (
        <div style= {{
        position: 'fixed',
            top: 0,
                left: 0,
                    right: 0,
                        bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                    justifyContent: 'center',
                                        alignItems: 'center',
                                            zIndex: 9999
    }
}>
    <LoadingSpinner
                message={ message }
subMessage = { subMessage }
size = "large"
    />
    </div>
    );
} 
