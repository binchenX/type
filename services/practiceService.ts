import { ErrorFrequencyMap, ParsedMarkdownItem } from '@/types';

/**
 * Response from the generate-practice API
 */
export interface GeneratePracticeResponse {
    success: boolean;
    text: string;
    practiceSections: string[];
    prompt?: string;
    error?: string;
}

/**
 * Generate typing practice text based on error statistics
 */
export async function generatePracticeText(
    errorFrequencyMap: ErrorFrequencyMap
): Promise<GeneratePracticeResponse> {
    try {
        const response = await fetch('/api/generate-practice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ errorFrequencyMap }),
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error generating practice text:', error);
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
