import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorFrequencyMap } from '@/types';
import llmService from '@/services/llmService';
import rateLimit from 'express-rate-limit';

// Create a rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs
    message: { error: 'Too many requests, please try again later.' }
});

// Helper to validate ErrorFrequencyMap
function isValidErrorFrequencyMap(map: any): map is ErrorFrequencyMap {
    if (!map || typeof map !== 'object') return false;

    for (const [key, value] of Object.entries(map)) {
        if (typeof key !== 'string') return false;
        if (!value || typeof value !== 'object') return false;
        if (typeof value.attempts !== 'number' ||
            typeof value.errors !== 'number' ||
            !value.incorrectReplacements ||
            typeof value.incorrectReplacements !== 'object') {
            return false;
        }
    }
    return true;
}

// Apply rate limiting to the API route
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Apply rate limiting
    try {
        await new Promise((resolve, reject) => {
            limiter(req, res, (result: any) => {
                if (result instanceof Error) {
                    reject(result);
                    return;
                }
                resolve(result);
            });
        });
    } catch (error) {
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    // Method validation
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Input validation
    if (!isValidErrorFrequencyMap(req.body)) {
        return res.status(400).json({
            success: false,
            text: 'Invalid input format',
            practiceSections: [],
            error: 'Invalid error frequency map format'
        });
    }

    try {
        const errorFrequencyMap = req.body as ErrorFrequencyMap;
        const response = await llmService.generatePracticeText(errorFrequencyMap);
        res.status(200).json(response);
    } catch (error) {
        console.error('Error in generate-practice API route:', error);
        res.status(500).json({
            success: false,
            text: 'Failed to generate practice text',
            practiceSections: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
