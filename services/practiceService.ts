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
 * Get fallback practice text when LLM features are unavailable
 */
export function getFallbackPracticeText(errorFrequencyMap: ErrorFrequencyMap): GeneratePracticeResponse {
    // Extract top problematic characters from error frequency map
    const topErrorChars = Object.entries(errorFrequencyMap)
        .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
        .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
        .slice(0, 5)
        .map(([char, _]) => char);

    // Generic practice sentences
    const genericSentences = [
        "The quick brown fox jumps over the lazy dog.",
        "Amazingly few discotheques provide jukeboxes.",
        "Pack my box with five dozen liquor jugs.",
        "How vexingly quick daft zebras jump!",
        "Sphinx of black quartz, judge my vow."
    ];

    // If no problematic characters, return generic sentences
    if (topErrorChars.length === 0) {
        return {
            success: true,
            text: "Here are some general practice sentences.",
            practiceSections: genericSentences
        };
    }

    // Generate sentences that emphasize problematic characters
    const practiceTexts = [
        "The five boxing wizards jump quickly over the lazy dog.",
        "Waxy and quivering, jocks fumble the pizza.",
        "Jackdaws love my big sphinx of quartz.",
        "The quick onyx goblin jumps over the lazy dwarf."
    ];

    // Add character-specific sentences if available
    if (topErrorChars.includes('s')) {
        practiceTexts.push("She sells seashells by the seashore in the summer season.");
    }

    if (topErrorChars.includes('t')) {
        practiceTexts.push("The talented turtle tried to take ten tattered toys.");
    }

    if (topErrorChars.includes('r')) {
        practiceTexts.push("The rare red rabbit runs around the rural road rapidly.");
    }

    if (topErrorChars.includes('a')) {
        practiceTexts.push("A rather large anaconda sat on a plastic apparatus.");
    }

    if (topErrorChars.includes(' ')) {
        practiceTexts.push("Space between words improves readability and clarity.");
    }

    return {
        success: true,
        text: `Here are practice sentences focusing on your problematic characters: ${topErrorChars.map(c => c === ' ' ? 'SPACE' : c).join(', ')}`,
        practiceSections: practiceTexts.slice(0, 5)
    };
}

/**
 * Generate typing practice text based on error statistics
 */
export async function generatePracticeText(
    errorFrequencyMap: ErrorFrequencyMap
): Promise<GeneratePracticeResponse> {
    try {
        // Check if we're in a local environment
        if (!isLocalEnvironment()) {
            // Return local fallback practice text when not in local environment
            return getFallbackPracticeText(errorFrequencyMap);
        }

        // Proceed with LLM-based generation only in local environment
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
        // Return fallback practice text on error
        return getFallbackPracticeText(errorFrequencyMap);
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
