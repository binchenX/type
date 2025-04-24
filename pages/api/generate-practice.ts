import { NextApiRequest, NextApiResponse } from 'next';
import { ErrorFrequencyMap } from '@/types';
import llmService from '@/services/llmService';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
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
