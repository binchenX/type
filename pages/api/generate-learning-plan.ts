import { NextApiRequest, NextApiResponse } from 'next';
import llmService, { LearningPlanParams, LevelBasedPlanParams, AssessmentBasedPlanParams } from '@/services/llmService';

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

function validateLevelBasedParams(body: any): body is LevelBasedPlanParams {
    return (
        body.type === 'level_based' &&
        typeof body.level === 'string' &&
        ['beginner', 'intermediate', 'advanced'].includes(body.level) &&
        typeof body.currentWpm === 'number'
    );
}

function validateAssessmentParams(body: any): body is AssessmentBasedPlanParams {
    return (
        body.type === 'assessment' &&
        typeof body.expectedText === 'string' &&
        typeof body.actualText === 'string' &&
        typeof body.wpm === 'number'
    );
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    console.log('API: Received request for generate-learning-plan');
    console.log('API: Request method:', req.method);

    if (req.method !== 'POST') {
        console.log('API: Rejected non-POST request:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Log the raw request body for debugging
    console.log('API: Raw request body:', JSON.stringify(req.body, null, 2));

    // Get client IP and handle rate limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const clientIp = Array.isArray(ip) ? ip[0] : ip;
    console.log('API: Client IP:', clientIp);

    const { remaining, isLimited } = getRateLimitInfo(clientIp);
    console.log('API: Rate limit info:', { remaining, isLimited });

    res.setHeader('X-RateLimit-Limit', rateLimit.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining));

    if (isLimited) {
        console.log('API: Request rate limited for IP:', clientIp);
        return res.status(429).json({ error: 'Too many requests, please try again later.' });
    }

    // Validate request body based on type
    const body = req.body;
    let params: LearningPlanParams;

    if (!body.type) {
        console.log('API: Missing type in request body');
        return res.status(400).json({
            error: 'Missing required field: type',
            receivedBody: body
        });
    }

    console.log('API: Request type:', body.type);

    if (body.type === 'level_based') {
        console.log('API: Validating level-based parameters');
        if (!validateLevelBasedParams(body)) {
            console.log('API: Invalid level-based parameters:', body);
            return res.status(400).json({
                error: 'Invalid level-based parameters',
                receivedBody: body
            });
        }
        params = body;
    } else if (body.type === 'assessment') {
        console.log('API: Validating assessment parameters');
        if (!validateAssessmentParams(body)) {
            console.log('API: Invalid assessment parameters:', body);
            return res.status(400).json({
                error: 'Invalid assessment parameters',
                receivedBody: body
            });
        }
        params = body;
    } else {
        console.log('API: Invalid type:', body.type);
        return res.status(400).json({
            error: 'Invalid type. Must be either "level_based" or "assessment"',
            receivedBody: body
        });
    }

    try {
        console.log('API: Generating learning plan with params:', JSON.stringify(params, null, 2));
        const response = await llmService.generateLearningPlan(params);
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
