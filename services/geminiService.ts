import { GoogleGenerativeAI } from '@google/generative-ai';
import { ErrorFrequencyMap } from '@/types';

// Type definitions
export interface GeneratePracticeResponse {
    success: boolean;
    text: string;
    practiceSections: string[];
    prompt?: string;
    error?: string;
}

// Initialize the Generative AI
let genAI: GoogleGenerativeAI | null = null;

function getGenerativeAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * Generate practice text using Gemini
 */
export async function generatePracticeTextWithGemini(
    errorFrequencyMap: ErrorFrequencyMap
): Promise<GeneratePracticeResponse> {
    try {
        // Process the error data to create a prompt for the LLM
        const problematicChars = Object.entries(errorFrequencyMap)
            .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
            .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
            .slice(0, 10)
            .map(([char, stats]) => ({
                char,
                errorRate: Math.round((stats.errors / stats.attempts) * 100),
            }));

        // If no problematic chars, return general practice text
        if (problematicChars.length === 0) {
            return {
                success: true,
                text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
                practiceSections: [
                    "The quick brown fox jumps over the lazy dog.",
                    "Amazingly few discotheques provide jukeboxes.",
                    "How vexingly quick daft zebras jump!",
                    "Pack my box with five dozen liquor jugs.",
                    "Sphinx of black quartz, judge my vow.",
                ],
            };
        }

        // Create prompt for Gemini
        const charsList = problematicChars
            .map((item) => item.char === ' ' ? 'SPACE' : item.char)
            .join(', ');

        const prompt = `Generate 5 unique and progressively harder typing practice sentences.  
Each sentence must:  
- Be 40 to 60 characters long.  
- Appear on a separate line.  
- Heavily feature the characters: ${charsList} 
- Be interesting, fun, and memorable.  
- Do NOT include any explanation or numbering.  
Only output the sentences.
`;

        try {
            // Get an instance of the generative AI
            const ai = getGenerativeAI();

            // Generate content with Gemini
            const model = ai.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent(prompt);
            const text = result.response.text();

            // Process the response text into separate practice sentences
            const practiceSections = text
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0)
                .slice(0, 5); // Limit to 5 items

            if (practiceSections.length === 0) {
                throw new Error('No valid practice sentences generated');
            }

            return {
                success: true,
                text: `Here are practice sentences focused on characters: ${problematicChars.map(item => item.char === ' ' ? 'SPACE' : item.char).join(', ')}`,
                practiceSections,
                prompt, // Include the prompt for debugging/transparency
            };
        } catch (error) {
            console.error('Error generating with Gemini:', error);
            // Fall back to predefined sentences if Gemini fails
            return getFallbackPracticeText(errorFrequencyMap);
        }
    } catch (error) {
        console.error('Error in generatePracticeTextWithGemini:', error);
        return {
            success: false,
            text: 'Failed to generate practice text',
            practiceSections: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Get fallback practice text when AI is unavailable
 */
export function getFallbackPracticeText(errorFrequencyMap: ErrorFrequencyMap): GeneratePracticeResponse {
    // Extract top problematic characters
    const problematicChars = Object.entries(errorFrequencyMap)
        .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
        .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
        .slice(0, 5)
        .map(([char, _]) => char);

    if (problematicChars.length === 0) {
        return {
            success: true,
            text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
            practiceSections: [
                "The quick brown fox jumps over the lazy dog.",
                "Amazingly few discotheques provide jukeboxes.",
                "How vexingly quick daft zebras jump!",
                "Pack my box with five dozen liquor jugs.",
                "Sphinx of black quartz, judge my vow.",
            ],
        };
    }

    // Generate sentences that include the problematic characters
    const sentences = [];

    if (problematicChars.includes(',')) {
        sentences.push("Carefully, quietly, slowly, move forward with grace.");
    }

    if (problematicChars.includes('.')) {
        sentences.push("Type each word. Then each sentence. Practice makes perfect.");
    }

    if (problematicChars.includes(' ')) {
        sentences.push("Space between words improves readability and clarity.");
    }

    if (problematicChars.includes('s')) {
        sentences.push("She sells seashells by the seashore in summer season.");
    }

    if (problematicChars.includes('t')) {
        sentences.push("The talented turtle tried to type ten terrific texts.");
    }

    // Add generic sentences if we don't have enough
    const genericSentences = [
        "The five boxing wizards jump quickly over the lazy dog.",
        "How vexingly quick daft zebras jump when motivated.",
        "Pack my box with five dozen quality jugs, please.",
        "Amazingly few discotheques provide jukeboxes nowadays.",
        "The job requires extra pluck and zeal from every young wage earner."
    ];

    while (sentences.length < 5) {
        const randomIndex = Math.floor(Math.random() * genericSentences.length);
        const sentence = genericSentences[randomIndex];
        if (!sentences.includes(sentence)) {
            sentences.push(sentence);
        }
    }

    return {
        success: true,
        text: `Here are practice sentences focused on your problematic characters: ${problematicChars.map(c => c === ' ' ? 'SPACE' : c).join(', ')}`,
        practiceSections: sentences.slice(0, 5),
    };
} 
