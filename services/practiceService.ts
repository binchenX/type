import { ErrorFrequencyMap, ParsedMarkdownItem } from '@/types';
import llmService, { GeneratePracticeResponse } from './llmService';

/**
 * Detects if the app is running in a local environment
 */
export function isLocalEnvironment(): boolean {
    // Check if we're in the browser context
    if (typeof window === 'undefined') {
        return false; // Server-side rendering
    }

    // Check if the hostname is localhost or 127.0.0.1
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Generate typing practice text based on error statistics
 */
export async function generatePracticeText(
    errorFrequencyMap: ErrorFrequencyMap
): Promise<GeneratePracticeResponse> {
    console.log('practiceService: Starting generate practice text');
    console.log('practiceService: Running in environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
    console.log('practiceService: Is local environment:', isLocalEnvironment());

    try {
        // Using LLM service that will select the appropriate provider
        console.log('practiceService: Calling llmService.generatePracticeText');
        const response = await llmService.generatePracticeText(errorFrequencyMap);
        console.log('practiceService: Received response from llmService:', response.success ? 'success' : 'failure');

        // Add debug info to the response
        if (response.success) {
            console.log('practiceService: Response contains', response.practiceSections.length, 'practice sections');
            console.log('practiceService: Response text:', response.text);
        } else {
            console.error('practiceService: Error in response:', response.error);
        }

        return response;
    } catch (error) {
        console.error('practiceService: Error generating practice text:', error);
        // Return a basic error response
        return {
            success: false,
            text: 'Failed to generate practice text. Please try again.',
            practiceSections: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Convert practice sentences into ParsedMarkdownItems for the typing practice app
 */
export function convertPracticeSectionsToItems(
    practiceSections: string[]
): ParsedMarkdownItem[] {
    return practiceSections.map((content, index) => ({
        type: 'paragraph',
        content,
    }));
} 
