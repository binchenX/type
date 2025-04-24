import { NextApiRequest, NextApiResponse } from 'next';
import llmService from '@/services/llmService';

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

interface LearningPlanRequest {
    level: 'beginner' | 'intermediate' | 'advanced';
    currentWpm: number;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        console.log('API: Rejected non-POST request:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log the raw request body for debugging
    console.log('API: Raw request body:', req.body);

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

    // Validate request body
    const { level, currentWpm } = req.body;
    console.log('API: Parsed request parameters:', {
        level,
        currentWpm,
        levelType: typeof level,
        wpmType: typeof currentWpm,
        rawBody: req.body
    });

    // More detailed validation
    if (!level) {
        console.log('API: Missing level parameter');
        return res.status(400).json({
            error: 'Missing required field: level',
            receivedBody: req.body
        });
    }

    if (currentWpm === undefined || currentWpm === null) {
        console.log('API: Missing currentWpm parameter');
        return res.status(400).json({
            error: 'Missing required field: currentWpm',
            receivedBody: req.body
        });
    }

    // Validate level value
    if (!['beginner', 'intermediate', 'advanced'].includes(level)) {
        console.log('API: Invalid level value:', level);
        return res.status(400).json({
            error: 'Invalid level value. Must be one of: beginner, intermediate, advanced',
            receivedBody: req.body
        });
    }

    // Parse and validate currentWpm
    const parsedWpm = Number(currentWpm);
    if (isNaN(parsedWpm)) {
        console.log('API: Invalid currentWpm value:', currentWpm);
        return res.status(400).json({
            error: 'currentWpm must be a valid number',
            receivedBody: req.body
        });
    }

    try {
        console.log('API: Generating learning plan with params:', { level, currentWpm: parsedWpm });
        // Generate learning plan using LLM service
        const response = await llmService.generateLearningPlan({
            level: level as 'beginner' | 'intermediate' | 'advanced',
            currentWpm: parsedWpm
        });
        console.log('API: Successfully generated plan:', {
            success: response.success,
            moduleCount: response.modules?.length || 0,
            provider: response.provider
        });
        res.status(200).json(response);
    } catch (error) {
        console.error('API: Error generating learning plan:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to generate learning plan',
            modules: []
        });
    }
} 
