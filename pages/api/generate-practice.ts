import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorFrequencyMap } from '@/types';
import llmService, { errorMapToPracticeRequest } from '@/services/llmService';

// Simple in-memory store for rate limiting
const rateLimit = {
    store: new Map<string, { count: number; resetTime: number }>(),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
};

function getRateLimitInfo(ip: string) {
    const now = Date.now();
    const record = rateLimit.store.get(ip);

    if (!record || now > record.resetTime) {
        // Initialize or reset the record
        rateLimit.store.set(ip, {
            count: 1,
            resetTime: now + rateLimit.windowMs,
        });
        return { remaining: rateLimit.max - 1, isLimited: false };
    }

    const isLimited = record.count >= rateLimit.max;
    if (!isLimited) {
        record.count += 1;
    }
    return { remaining: rateLimit.max - record.count, isLimited };
}

// Helper to validate ErrorFrequencyMap
function isValidErrorFrequencyMap(map: any): map is ErrorFrequencyMap {
    if (!map || typeof map !== 'object') return false;

    for (const [key, value] of Object.entries(map)) {
        if (typeof key !== 'string') return false;
        if (!value || typeof value !== 'object') return false;

        const stats = value as any;
        if (typeof stats.attempts !== 'number' ||
            typeof stats.errors !== 'number' ||
            !stats.incorrectReplacements ||
            typeof stats.incorrectReplacements !== 'object') {
            return false;
        }
    }
    return true;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Method validation
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get client IP
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientIp = Array.isArray(ip) ? ip[0] : ip;

    // Check rate limit
    const { remaining, isLimited } = getRateLimitInfo(clientIp);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', rateLimit.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));

    if (isLimited) {
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
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
        // Convert to GeneratePracticeRequest
        const practiceRequest = errorMapToPracticeRequest(errorFrequencyMap);
        const response = await llmService.generatePracticeText(practiceRequest);
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
