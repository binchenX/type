import type { NextApiRequest, NextApiResponse } from 'next';
import { ErrorFrequencyMap } from '@/types';

// Configuration for different LLM providers
interface LLMConfig {
    apiUrl: string;
    model: string;
    headers: Record<string, string>;
}

// Ollama configuration (customize based on your setup)
const ollamaConfig: LLMConfig = {
    apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434/api/generate',
    model: process.env.OLLAMA_MODEL || 'llama3.2:latest', // Change to your preferred model
    headers: {
        'Content-Type': 'application/json',
    },
};

// Types for responses
interface GeneratePracticeResponse {
    success: boolean;
    text: string;
    practiceSections: string[];
    prompt?: string;
    error?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<GeneratePracticeResponse>
) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            text: 'Method not allowed',
            practiceSections: [],
            error: 'Only POST requests are allowed',
        });
    }

    try {
        const { errorFrequencyMap } = req.body as { errorFrequencyMap: ErrorFrequencyMap };

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
            return res.status(200).json({
                success: true,
                text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
                practiceSections: [
                    "The quick brown fox jumps over the lazy dog.",
                    "Amazingly few discotheques provide jukeboxes.",
                    "How vexingly quick daft zebras jump!",
                    "Pack my box with five dozen liquor jugs.",
                    "Sphinx of black quartz, judge my vow.",
                ],
            });
        }

        // Create prompt for the LLM
        const charsList = problematicChars
            .map((item) => `${item.char === ' ' ? 'SPACE' : item.char} (${item.errorRate}% error rate)`)
            .join(', ');

        const prompt = `Generate 5 short sentences or phrases for typing practice. 
Each line should be a separate practice item.
These practice items should heavily feature the following characters that the user struggles with: ${charsList}.
Make the sentences interesting, memorable and progressively more challenging. Use famous quotes and phrases.
Each sentence should be between 40-60 characters.
Don't include explanations, and don't include the index. just the practice text. Example:

The quick brown fox jumps over the lazy dog.
Amazingly few discotheques provide jukeboxes.
How vexingly quick daft zebras jump!
Pack my box with five dozen liquor jugs.
Sphinx of black quartz, judge my vow.
`;

        // Call the LLM based on configuration
        const practiceSections = await callLLM(prompt, ollamaConfig);

        return res.status(200).json({
            success: true,
            text: `Here are practice focused on characters: ${problematicChars.map(item => item.char === ' ' ? 'SPACE' : item.char).join(', ')}`,
            practiceSections,
            prompt, // Include the prompt for debugging/transparency
        });
    } catch (error) {
        console.error('Error generating practice text:', error);
        return res.status(500).json({
            success: false,
            text: 'Failed to generate practice text',
            practiceSections: [],
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}

/**
 * Call the appropriate LLM based on configuration
 */
async function callLLM(prompt: string, config: LLMConfig): Promise<string[]> {
    try {
        // Call Ollama
        const response = await fetch(config.apiUrl, {
            method: 'POST',
            headers: config.headers,
            body: JSON.stringify({
                model: config.model,
                prompt: prompt,
                stream: false,
            }),
        });

        if (!response.ok) {
            throw new Error(`LLM API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // Extract response based on Ollama's response format
        // Adjust this based on the actual response structure from Ollama
        const generatedText = data.response || '';

        // Split by newlines and filter out empty lines
        // This assumes the LLM properly formats its response with one sentence per line
        const practiceItems = generatedText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .slice(0, 5); // Limit to 5 items

        // If we got no valid practice items, return fallback
        if (practiceItems.length === 0) {
            return getFallbackPractice(prompt);
        }

        return practiceItems;
    } catch (error) {
        console.error('Error calling LLM:', error);
        return getFallbackPractice(prompt);
    }
}

/**
 * Generate fallback practice text if LLM call fails
 */
function getFallbackPractice(prompt: string): string[] {
    // Extract problematic characters from the prompt
    const charRegex = /following characters.*?:\s*([^.]+)/i;
    const match = prompt.match(charRegex);
    const charsList = match ? match[1] : '';

    const chars = charsList
        .split(',')
        .map(item => {
            const charMatch = item.match(/(SPACE|\S)\s*\((\d+)%/);
            return charMatch ? (charMatch[1] === 'SPACE' ? ' ' : charMatch[1]) : '';
        })
        .filter(Boolean);

    // Generate sentences that include the problematic characters
    const sentences = [];

    if (chars.includes(',')) {
        sentences.push("Carefully, quietly, slowly, move forward with grace.");
    }

    if (chars.includes('.')) {
        sentences.push("Type each word. Then each sentence. Practice makes perfect.");
    }

    if (chars.includes(' ')) {
        sentences.push("Space between words improves readability and clarity.");
    }

    if (chars.includes('s')) {
        sentences.push("She sells seashells by the seashore in summer season.");
    }

    if (chars.includes('t')) {
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

    return sentences.slice(0, 5);
} 
