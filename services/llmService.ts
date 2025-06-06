import { ErrorFrequencyMap } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';


export interface GeneratePracticeRequest {
    focusKeys?: string[]; // Specific keys to focus on
    focusWords?: string[]; // Specific words to focus on
    length?: number; // Desired length of practice text
    difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Response format for generating practice text
 */
export interface GeneratePracticeResponse {
    success: boolean;
    text: string;
    practiceSections: string[];
    prompt?: string;
    error?: string;
    provider?: string;
    serviceInfo?: {
        availableProviders: string[];
        preferredProvider: string | null;
    };
}

/**
 * Response format for generating learning plan
 */
export interface GenerateLearningPlanResponse {
    success: boolean;
    modules: Array<{
        name: string;
        description: string;
        lessons: Array<{
            title: string;
            description: string;
            content: string;
            targetWpm: number;
        }>;
    }>;
    error?: string;
    provider?: string;
}

/**
 * Learning plan request parameters
 */
export interface BaseLearningPlanParams {
    type: 'assessment' | 'level_based';
}

export interface LevelBasedPlanParams extends BaseLearningPlanParams {
    type: 'level_based';
    level: 'beginner' | 'intermediate' | 'advanced';
    currentWpm: number;
}

export interface AssessmentBasedPlanParams extends BaseLearningPlanParams {
    type: 'assessment';
    expectedText: string;
    actualText: string;
    wpm: number;
}

export type LearningPlanParams = LevelBasedPlanParams | AssessmentBasedPlanParams;

/**
 * LLM Provider interface - all providers must implement this
 */
export interface LLMProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    generatePracticeText(request: GeneratePracticeRequest): Promise<GeneratePracticeResponse>;
    generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse>;
}

/**
 * Configuration for the LLM service
 */
export interface LLMServiceConfig {
    preferredProvider?: 'gemini' | 'ollama';
    geminiApiKey?: string;
    geminiModel?: string;
    ollamaApiUrl?: string;
    ollamaModel?: string;
}

/**
 * Configuration for LLM providers with more detailed settings
 */
export interface LLMConfig {
    gemini: {
        apiKey?: string;
        model: string;
        enabled: boolean;
    };
    ollama: {
        apiUrl: string;
        modelName: string;
        enabled: boolean;
    };
    preferredProvider?: 'gemini' | 'ollama';
}
/**
 * Converts an ErrorFrequencyMap into a GeneratePracticeRequest
 * @param errorFrequencyMap The error frequency map to convert
 * @returns A GeneratePracticeRequest object with focus keys based on the most problematic characters
 */
export function errorMapToPracticeRequest(errorFrequencyMap: ErrorFrequencyMap): GeneratePracticeRequest {
    // Extract top problematic characters
    const problematicChars = Object.entries(errorFrequencyMap)
        .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
        .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
        .slice(0, 5) // Take top 5 most problematic characters
        .map(([char, _]) => char);

    return {
        focusKeys: problematicChars,
        length: 5, // Default to 5 practice sections
        difficulty: 'medium' // Default difficulty
    };
}

/**
 * Google Gemini API provider implementation
 */
export class GeminiProvider implements LLMProvider {
    name = 'gemini';
    private apiKey: string;
    private enabled: boolean;
    private model: string;
    private genAI: GoogleGenerativeAI | null = null;

    constructor(config?: { apiKey?: string; enabled?: boolean; model?: string }) {
        this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
        this.enabled = config?.enabled === undefined ? true : config.enabled;
        this.model = config?.model || process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    }

    async isAvailable(): Promise<boolean> {
        // If explicitly disabled or no API key, return false
        if (!this.enabled) {
            console.log('Gemini provider is explicitly disabled');
            return false;
        }

        if (!this.apiKey) {
            console.log('Gemini provider has no API key configured');
            return false;
        }

        try {
            // We could add an actual API check here, but for now just check if there's an API key
            console.log('Gemini provider is available (API key is configured)');
            return this.apiKey.length > 0;
        } catch (error) {
            console.error('Gemini availability check failed:', error);
            return false;
        }
    }

    private getGenerativeAI() {
        if (!this.genAI && this.apiKey) {
            try {
                this.genAI = new GoogleGenerativeAI(this.apiKey);
            } catch (error) {
                console.error('Gemini provider: Initialization failed');
                return null;
            }
        } else if (!this.apiKey) {
            console.error('Gemini provider: No API key available');
        }
        return this.genAI;
    }

    async generatePracticeText(request: GeneratePracticeRequest): Promise<GeneratePracticeResponse> {
        const MAX_RETRIES = 3;
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                console.log(`Gemini provider: generatePracticeText (Attempt ${attempts}/${MAX_RETRIES})`);

                const charsList = request?.focusKeys?.join(', ') || '';
                const prompt = buildPrompt(charsList);

                // Get an instance of the generative AI
                const ai = this.getGenerativeAI();
                if (!ai) {
                    console.error('Gemini provider: API client initialization failed');
                    throw new Error('Gemini API client is not initialized');
                }

                // Generate content with Gemini
                console.log(`Gemini provider: Calling Gemini API with model ${this.model}`);
                const model = ai.getGenerativeModel({ model: this.model });
                const result = await model.generateContent(prompt);
                const text = result.response.text();

                // Process the response text into separate practice sentences
                const practiceSections = text
                    .split('\n')
                    .map((line: string) => line.trim())
                    .filter((line: string) => line.length > 0)
                    .slice(0, 5); // Limit to a maximum of 5 items

                if (practiceSections.length === 0) {
                    console.error(`Attempt ${attempts}/${MAX_RETRIES} - Gemini provider: No valid practice sentences could be extracted from response`);

                    if (attempts >= MAX_RETRIES) {
                        throw new Error('No valid practice sentences generated after multiple attempts');
                    }
                    // Try again
                    console.log(`Retrying... (${attempts}/${MAX_RETRIES})`);
                    continue;
                }

                console.log(`Successfully generated practice text on attempt ${attempts}`);
                return {
                    success: true,
                    text: `Here are practice sentences focused on characters: ${charsList}`,
                    practiceSections,
                    prompt, // Include the prompt for debugging/transparency
                    provider: 'gemini'
                };
            } catch (error) {
                console.error(`Attempt ${attempts}/${MAX_RETRIES} - Error generating with Gemini:`, error);

                if (attempts >= MAX_RETRIES) {
                    console.error('Max retries reached, falling back to default practice text');
                    throw error;
                }

                console.log(`Retrying... (${attempts}/${MAX_RETRIES})`);
                // Short delay before retrying to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // This should never be reached as we throw inside the loop if max retries is exceeded
        throw new Error('Failed to generate practice text after multiple attempts');
    }

    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        const MAX_RETRIES = 3;
        let attempts = 0;

        while (attempts < MAX_RETRIES) {
            attempts++;
            try {
                // Extract level and WPM based on params type
                let level: string;
                let currentWpm: number;

                if (params.type === 'level_based') {
                    level = params.level;
                    currentWpm = params.currentWpm;
                } else {
                    // For assessment-based, use WPM from assessment
                    level = params.wpm < 30 ? 'beginner' : params.wpm < 60 ? 'intermediate' : 'advanced';
                    currentWpm = params.wpm;
                }

                console.log(`Gemini Generating plan for level: ${level} with WPM: ${currentWpm} (Attempt ${attempts}/${MAX_RETRIES})`);

                const prompt = `Generate a structured typing practice plan. Return ONLY a JSON object (no markdown formatting, no code blocks) with the following structure:
{
    "modules": [
        {
            "name": "string",
            "description": "string",
            "lessons": [
                {
                    "title": "string",
                    "description": "string",
                    "content": "string",
                    "targetWpm": number
                }
            ]
        }
    ]
}

The plan should be tailored for a ${level} level typist with current speed of ${currentWpm} WPM.
Include 2-3 modules, each with 2-3 lessons. Make the content engaging and progressively challenging.`;

                const ai = this.getGenerativeAI();
                if (!ai) {
                    throw new Error('Gemini AI not initialized');
                }

                const model = ai.getGenerativeModel({ model: this.model });
                const result = await model.generateContent(prompt);
                const response = result.response.text();

                // Clean the response by removing any markdown formatting
                const cleanedResponse = response
                    .replace(/```json\s*/g, '')
                    .replace(/```\s*/g, '')
                    .trim();

                try {
                    const parsedPlan = JSON.parse(cleanedResponse);

                    // Validate the structure
                    if (!parsedPlan.modules || !Array.isArray(parsedPlan.modules)) {
                        throw new Error('Invalid plan structure: missing or invalid modules array');
                    }

                    // Validate each module and lesson
                    parsedPlan.modules.forEach((module: any, moduleIndex: number) => {
                        if (!module.name || !module.description || !Array.isArray(module.lessons)) {
                            throw new Error(`Invalid module structure at index ${moduleIndex}`);
                        }
                        module.lessons.forEach((lesson: any, lessonIndex: number) => {
                            if (!lesson.title || !lesson.description || !lesson.content || typeof lesson.targetWpm !== 'number') {
                                throw new Error(`Invalid lesson structure in module ${moduleIndex}, lesson ${lessonIndex}`);
                            }
                        });
                    });

                    console.log(`Successfully parsed learning plan on attempt ${attempts}`);
                    return {
                        success: true,
                        modules: parsedPlan.modules,
                        provider: 'gemini'
                    };
                } catch (parseError) {
                    console.error(`Attempt ${attempts}/${MAX_RETRIES} - Failed to parse learning plan:`, parseError);
                    console.error('Raw response:', response);
                    console.error('Cleaned response:', cleanedResponse);

                    if (attempts >= MAX_RETRIES) {
                        console.error('Max retries reached, falling back to default plan');
                        throw new Error('Failed to parse learning plan after multiple attempts');
                    }
                    console.log(`Retrying... (${attempts}/${MAX_RETRIES})`);
                    // Continue to next retry attempt
                }
            } catch (error) {
                if (attempts >= MAX_RETRIES) {
                    console.error('Max retries reached, falling back to default plan');
                    throw error;
                }
                console.error(`Attempt ${attempts}/${MAX_RETRIES} - Error generating learning plan:`, error);
                console.log(`Retrying... (${attempts}/${MAX_RETRIES})`);
                // Short delay before retrying to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // This should never be reached as we throw inside the loop if max retries is exceeded
        throw new Error('Failed to generate learning plan after multiple attempts');
    }
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements LLMProvider {
    private apiUrl: string;
    private model: string;
    name = 'ollama';

    constructor(apiUrl?: string, model?: string) {
        // Normalize API URL to ensure it's properly formatted
        const baseApiUrl = apiUrl || process.env.OLLAMA_API_URL || 'http://localhost:11434';
        this.apiUrl = baseApiUrl.endsWith('/api/generate')
            ? baseApiUrl
            : baseApiUrl + (baseApiUrl.endsWith('/api') ? '/generate' : '/api/generate');

        // Use provided model name or fallback to environment variable or default
        this.model = model || process.env.OLLAMA_MODEL_NAME || 'llama2:latest';
    }

    async generate(prompt: string): Promise<string> {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => null);
                throw new Error(`Ollama API error: ${response.status} ${response.statusText}${errorData ? ` - ${JSON.stringify(errorData)}` : ''
                    }`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Error generating response from Ollama:', error);
            throw error;
        }
    }

    async isAvailable(): Promise<boolean> {
        try {
            // Try to ping the Ollama API - use base URL without the /api/generate path
            const baseUrl = this.apiUrl.replace('/api/generate', '');
            console.log(`Checking Ollama availability at: ${baseUrl}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second timeout

            const response = await fetch(baseUrl, {
                method: 'GET',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            console.log(`Ollama API response status: ${response.status}`);
            return response.ok;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.error('Ollama availability check timed out after 3 seconds');
            } else {
                console.error('Ollama availability check failed:', error);
            }
            return false;
        }
    }

    async generatePracticeText(request: GeneratePracticeRequest): Promise<GeneratePracticeResponse> {
        try {
            console.log('Ollama provider: Starting practice text generation');

            // Process the error data to create a prompt for the LLM
            const charsList = request?.focusKeys?.join(', ') || '';
            console.log(`Ollama provider: Creating prompt for characters: ${charsList}`);
            const prompt = buildPrompt(charsList);
            console.log('Ollama provider: Prompt created:', prompt);

            // Call Ollama API
            console.log(`Ollama provider: Calling API at ${this.apiUrl} with model ${this.model}`);
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false,
                }),
            });

            console.log(`Ollama provider: API response status: ${response.status}`);
            if (!response.ok) {
                console.error(`Ollama provider: API responded with error status: ${response.status}`);
                throw new Error(`Ollama API responded with status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Ollama provider: Successfully received JSON response');
            const generatedText = data.response || '';

            // Split by newlines and filter out empty lines
            console.log('Ollama provider: Processing response into practice sentences');
            const practiceSections = generatedText
                .split('\n')
                .map((line: string) => line.trim())
                .filter((line: string) => line.length > 0)
                .slice(0, 5); // Limit to a maximum of 5 items

            console.log(`Ollama provider: Extracted ${practiceSections.length} practice sentences`);

            // If we got no valid practice items, throw error
            if (practiceSections.length === 0) {
                console.error('Ollama provider: No valid practice sentences could be extracted from response');
                throw new Error('No valid practice sentences generated');
            }

            // Log the generated sentences
            console.log('Ollama provider: Generated practice sentences:');
            practiceSections.forEach((sentence: string, index: number) => {
                console.log(`  ${index + 1}: ${sentence}`);
            });

            console.log('Ollama provider: Practice text generation successful');
            return {
                success: true,
                text: `Here are practice sentences focused on characters: ${charsList}`,
                practiceSections,
                prompt, // Include the prompt for debugging/transparency
                provider: 'ollama'
            };
        } catch (error) {
            console.error('Error generating with Ollama:', error);
            throw error;
        }
    }

    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        try {
            // Determine WPM and level based on params type
            const wpm = params.type === 'level_based' ? params.currentWpm : params.wpm;
            const level = params.type === 'level_based' ? params.level :
                params.wpm < 30 ? 'beginner' :
                    params.wpm < 60 ? 'intermediate' :
                        'advanced';

            console.log('Generating learning plan with params:', { wpm, level });

            const prompt = `Generate a typing practice plan for a ${level} level typist with current speed of ${wpm} WPM. 
                The plan should include 6 modules, each with:
                - A title
                - A description
                - Practice content (text to type)
                - A target WPM that gradually increases from a starting point of ${Math.max(20, Math.floor(wpm * 0.8))} WPM
                Format the response as a JSON array of modules.`;

            const response = await this.generate(prompt);

            if (!response) {
                console.error('Failed to generate learning plan');
                return getFallbackLearningPlan(params);
            }

            return {
                success: true,
                modules: JSON.parse(response),
                provider: 'ollama'
            };
        } catch (error) {
            console.error('Error generating learning plan:', error);
            return getFallbackLearningPlan(params);
        }
    }
}

/**
 * Fallback provider that uses predefined sentences
 */
export class FallbackProvider implements LLMProvider {
    name = 'fallback';

    async isAvailable(): Promise<boolean> {
        console.log('Fallback provider is always available');
        return true; // Fallback is always available
    }

    async generatePracticeText(request: GeneratePracticeRequest): Promise<GeneratePracticeResponse> {
        console.log('Fallback provider: Starting practice text generation');

        // Process the error data to create a prompt for the LLM
        const charsList = request?.focusKeys?.join(', ') || '';
        const problematicChars = request?.focusKeys || [];

        // Generate sentences that include the problematic characters
        console.log(`Fallback provider: Generating practice sentences for characters: ${problematicChars.join(', ')}`);
        const sentences = [];

        if (problematicChars.includes(',')) {
            sentences.push("Carefully, quietly, slowly, move forward with grace.");
            console.log('Fallback provider: Added sentence for comma');
        }

        if (problematicChars.includes('.')) {
            sentences.push("Type each word. Then each sentence. Practice makes perfect.");
            console.log('Fallback provider: Added sentence for period');
        }

        if (problematicChars.includes(' ')) {
            sentences.push("Space between words improves readability and clarity.");
            console.log('Fallback provider: Added sentence for space');
        }

        if (problematicChars.includes('s')) {
            sentences.push("She sells seashells by the seashore in summer season.");
            console.log('Fallback provider: Added sentence for "s"');
        }

        if (problematicChars.includes('t')) {
            sentences.push("The talented turtle tried to type ten terrific texts.");
            console.log('Fallback provider: Added sentence for "t"');
        }

        // Add generic sentences if we don't have enough
        console.log(`Fallback provider: Currently have ${sentences.length} sentences, adding generic sentences if needed`);
        const genericSentences = getGenericSentences();

        while (sentences.length < (request.length || 5)) {
            const randomIndex = Math.floor(Math.random() * genericSentences.length);
            const sentence = genericSentences[randomIndex];
            if (!sentences.includes(sentence)) {
                sentences.push(sentence);
                console.log(`Fallback provider: Added generic sentence: "${sentence.substring(0, 30)}..."`);
            }
        }

        // Log the final practice sentences
        console.log('Fallback provider: Generated practice sentences:');
        sentences.slice(0, request.length || 5).forEach((sentence: string, index: number) => {
            console.log(`  ${index + 1}: ${sentence}`);
        });

        console.log('Fallback provider: Practice text generation successful');
        return {
            success: true,
            text: problematicChars.length > 0
                ? `Here are practice sentences focused on your problematic characters: ${problematicChars.map(c => c === ' ' ? 'SPACE' : c).join(', ')}`
                : "Here are some general practice sentences:",
            practiceSections: sentences.slice(0, request.length || 5),
            provider: 'fallback'
        };
    }

    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        console.log('Fallback provider: Generating learning plan');
        return getFallbackLearningPlan(params);
    }
}

/**
 * The main LLM service class
 */
export class LLMService {
    private providers: LLMProvider[] = [];
    private preferredProvider?: string;
    private config: LLMConfig;

    constructor(config?: LLMServiceConfig) {
        // Default configuration
        this.config = {
            gemini: {
                apiKey: process.env.GEMINI_API_KEY || undefined,
                model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
                enabled: Boolean(process.env.GEMINI_API_KEY)
            },
            ollama: {
                apiUrl: process.env.OLLAMA_API_URL || 'http://localhost:11434',
                modelName: process.env.OLLAMA_MODEL_NAME || 'llama2',
                enabled: process.env.ENABLE_OLLAMA === 'true'
            },
            preferredProvider: config?.preferredProvider
        };

        // Log configuration (with sensitive data redacted) - server side only
        if (typeof window === 'undefined') {
            console.log('LLM Service Configuration:');
            console.log('  Gemini:');
            console.log(`    Enabled: ${this.config.gemini.enabled}`);
            console.log('    API Key: [REDACTED]');
            console.log(`    Model: ${this.config.gemini.model}`);
            console.log('  Ollama:');
            console.log(`    Enabled: ${this.config.ollama.enabled}`);
            console.log('    API URL: [REDACTED]');
            console.log(`    Model: ${this.config.ollama.modelName}`);
            console.log(`  Preferred Provider: ${this.config.preferredProvider || 'None (default order)'}`);
        }

        // Add providers in order of preference
        if (config?.preferredProvider === 'gemini') {
            // Gemini first, then Ollama
            this.providers.push(
                new GeminiProvider({
                    apiKey: config?.geminiApiKey,
                    model: config?.geminiModel || this.config.gemini.model
                })
            );
            this.providers.push(
                new OllamaProvider(
                    config?.ollamaApiUrl || process.env.OLLAMA_API_URL || 'http://localhost:11434',
                    config?.ollamaModel || process.env.OLLAMA_MODEL_NAME || 'llama2'
                )
            );
        } else {
            this.providers.push(
                new OllamaProvider(
                    config?.ollamaApiUrl || process.env.OLLAMA_API_URL || 'http://localhost:11434',
                    config?.ollamaModel || process.env.OLLAMA_MODEL_NAME || 'llama2'
                )
            );
            this.providers.push(
                new GeminiProvider({
                    apiKey: config?.geminiApiKey,
                    model: config?.geminiModel || this.config.gemini.model
                })
            );
        }

        // Always add fallback as the last provider
        this.providers.push(new FallbackProvider());
    }

    private async getProvider(): Promise<LLMProvider | null> {
        console.log('LLMService: Getting provider');
        console.log('LLMService: Available providers:', this.providers.map(p => p.name));
        console.log('LLMService: Preferred provider:', this.preferredProvider);

        // First try to use the preferred provider if specified
        if (this.preferredProvider) {
            const preferred = this.providers.find(p => p.name === this.preferredProvider);
            if (preferred && await preferred.isAvailable()) {
                console.log('LLMService: Using preferred provider:', preferred.name);
                return preferred;
            }
            console.log('LLMService: Preferred provider not available');
        }

        // Try each provider in order until we find one that's available
        for (const provider of this.providers) {
            try {
                if (await provider.isAvailable()) {
                    console.log('LLMService: Found available provider:', provider.name);
                    return provider;
                }
            } catch (error) {
                console.error(`LLMService: Error checking ${provider.name} availability:`, error);
            }
        }

        console.log('LLMService: No providers available');
        return null;
    }

    /**
     * Generate practice text using the first available provider
     */
    async generatePracticeText(request: GeneratePracticeRequest): Promise<GeneratePracticeResponse> {
        console.log('LLMService: Starting practice text generation process');

        // Try each provider in sequence
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[i];
            const isFallbackProvider = provider.name === 'fallback';

            try {
                console.log(`LLMService: Checking availability of ${provider.name} provider...`);
                const isAvailable = await provider.isAvailable();

                if (!isAvailable) {
                    console.log(`LLMService: ${provider.name} provider is not available, trying next provider`);
                    continue;
                }

                console.log(`---------------------------------------`);
                console.log(`LLMService: USING ${provider.name.toUpperCase()} PROVIDER`);
                console.log(`---------------------------------------`);

                try {
                    const result = await provider.generatePracticeText(request);
                    result.provider = provider.name;

                    // Add a note about which provider was used
                    if (!result.text.includes(`(via ${provider.name})`)) {
                        result.text = `${result.text} (via ${provider.name})`;
                    }

                    console.log(`LLMService: Successfully generated practice text with ${provider.name} provider`);
                    return result;
                } catch (error: any) {
                    console.error(`LLMService: Error with ${provider.name} provider:`, error);

                    if (isFallbackProvider) {
                        // If even the fallback provider fails, there's nothing left to try
                        throw new Error(`Fallback provider failed: ${error.message || 'Unknown error'}`);
                    }

                    console.log(`LLMService: Will try next provider`);
                    // Continue to the next provider
                }
            } catch (error: any) {
                console.error(`LLMService: Error checking ${provider.name} provider:`, error);

                if (isFallbackProvider) {
                    // If even the fallback provider fails, there's nothing left to try
                    throw new Error(`Critical failure in all providers: ${error.message || 'Unknown error'}`);
                }

                // Continue to the next provider
                console.log(`LLMService: Will try next provider`);
            }
        }

        // If we get here, all providers failed
        console.error('LLMService: All LLM providers failed to generate practice text');
        throw new Error('All LLM providers failed to generate practice text');
    }

    /**
     * Check which providers are available
     */
    async getAvailableProviders(): Promise<string[]> {
        const available: string[] = [];

        for (const provider of this.providers) {
            try {
                const isAvailable = await provider.isAvailable();
                if (isAvailable) {
                    available.push(provider.name);
                }
            } catch (error) {
                console.error(`Error checking availability for ${provider.name}:`, error);
            }
        }

        return available;
    }

    /**
     * Get the service status
     */
    async getStatus(): Promise<{
        availableProviders: string[];
        preferredProvider: string | null;
    }> {
        const availableProviders: string[] = [];
        let preferredProvider: string | null = null;

        console.log('Checking status of all LLM providers...');

        for (const provider of this.providers) {
            console.log(`Checking if ${provider.name} provider is available...`);
            const isAvailable = await provider.isAvailable();
            console.log(`${provider.name} provider availability: ${isAvailable}`);

            if (isAvailable) {
                availableProviders.push(provider.name);
                if (!preferredProvider && provider.name !== 'fallback') {
                    preferredProvider = provider.name;
                }
            }
        }

        console.log('Available providers:', availableProviders);
        console.log('Preferred provider:', preferredProvider);

        return {
            availableProviders,
            preferredProvider
        };
    }

    /**
     * Generate a learning plan using the first available provider
     */
    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        console.log('LLMService: Starting learning plan generation process');

        // Try each provider in sequence
        for (let i = 0; i < this.providers.length; i++) {
            const provider = this.providers[i];
            const isFallbackProvider = provider.name === 'fallback';

            try {
                console.log(`LLMService: Checking availability of ${provider.name} provider...`);
                const isAvailable = await provider.isAvailable();

                if (!isAvailable) {
                    console.log(`LLMService: ${provider.name} provider is not available, trying next provider`);
                    continue;
                }

                console.log(`---------------------------------------`);
                console.log(`LLMService: USING ${provider.name.toUpperCase()} PROVIDER FOR LEARNING PLAN`);
                console.log(`---------------------------------------`);

                try {
                    const result = await provider.generateLearningPlan(params);
                    result.provider = provider.name;

                    console.log(`LLMService: Successfully generated learning plan with ${provider.name} provider`);
                    return result;
                } catch (error: any) {
                    console.error(`LLMService: Error with ${provider.name} provider:`, error);

                    if (isFallbackProvider) {
                        // If even the fallback provider fails, there's nothing left to try
                        console.error('LLMService: Fallback provider failed, returning error state');
                        return {
                            success: false,
                            modules: [],
                            error: `Fallback provider failed: ${error.message || 'Unknown error'}`,
                            provider: 'none'
                        };
                    }

                    console.log(`LLMService: Will try next provider`);
                    // Continue to the next provider
                }
            } catch (error: any) {
                console.error(`LLMService: Error checking ${provider.name} provider:`, error);

                if (isFallbackProvider) {
                    // If even the fallback provider fails, return an error state
                    console.error('LLMService: Critical failure in all providers');
                    return {
                        success: false,
                        modules: [],
                        error: `Critical failure in all providers: ${error.message || 'Unknown error'}`,
                        provider: 'none'
                    };
                }

                // Continue to the next provider
                console.log(`LLMService: Will try next provider`);
            }
        }

        // If we get here, all providers failed but we still need to return something
        // This should be unreachable as the fallback provider should always be available
        console.error('LLMService: All LLM providers failed to generate learning plan');
        return {
            success: false,
            modules: [],
            error: 'All LLM providers failed to generate learning plan',
            provider: 'none'
        };
    }
}

// Helper to build a consistent prompt for all providers
function buildPrompt(charsList: string): string {
    return `Generate 5 unique and progressively harder typing practice sentences.  
Each sentence must:  
- Be 40 to 60 characters long.  
- Appear on a separate line.  
- Heavily feature the characters: ${charsList} 
- Be interesting, fun, and memorable.  
- Do NOT include any explanation or numbering.  
Only output the sentences.
`;
}

// Helper to get generic sentences for providers
function getGenericSentences(): string[] {
    return [
        "The quick brown fox jumps over the lazy dog.",
        "Amazingly few discotheques provide jukeboxes.",
        "How vexingly quick daft zebras jump!",
        "Pack my box with five dozen liquor jugs.",
        "Sphinx of black quartz, judge my vow."
    ];
}

// Helper function to get fallback learning plan
function getFallbackLearningPlan(params: LearningPlanParams): GenerateLearningPlanResponse {
    // Determine WPM and level based on params type
    const wpm = params.type === 'level_based' ? params.currentWpm : params.wpm;
    const level = params.type === 'level_based' ? params.level :
        params.wpm < 30 ? 'beginner' :
            params.wpm < 60 ? 'intermediate' :
                'advanced';

    const moduleStructure = {
        beginner: [
            {
                name: "Home Row Mastery",
                description: "Master the fundamental home row keys and basic finger positions",
                lessons: [
                    {
                        title: "Home Row Basics",
                        description: "Learn the home row key positions",
                        content: "asdf jkl; asdf jkl; fjfjfj dkdkdk slslsl ajajaj",
                        targetWpm: Math.max(20, Math.round(wpm * 0.8))
                    },
                    {
                        title: "Left Hand Focus",
                        description: "Practice left hand keys",
                        content: "asdf asdf asdf asdf dad sad fad lad",
                        targetWpm: Math.max(22, Math.round(wpm * 0.85))
                    },
                    {
                        title: "Right Hand Focus",
                        description: "Practice right hand keys",
                        content: "jkl; jkl; jkl; jkl; kill silk milk jail",
                        targetWpm: Math.max(24, Math.round(wpm * 0.9))
                    },
                    {
                        title: "Alternating Hands",
                        description: "Practice alternating between hands",
                        content: "aj sk dl f; aj sk dl f; flash jail silk",
                        targetWpm: Math.max(26, Math.round(wpm * 0.95))
                    },
                    {
                        title: "Simple Words",
                        description: "Form basic words using home row",
                        content: "ask dad fall jack sail lake fall dash",
                        targetWpm: Math.max(28, Math.round(wpm))
                    },
                    {
                        title: "Speed Challenge",
                        description: "Build speed with home row keys",
                        content: "ask all sad jacks fall; dad has silk",
                        targetWpm: Math.max(30, Math.round(wpm * 1.1))
                    }
                ]
            },
            {
                name: "Common Words and Patterns",
                description: "Practice frequently used English words and letter combinations",
                lessons: [
                    {
                        title: "Common Three-Letter Words",
                        description: "Practice basic three-letter words",
                        content: "the and but for not yes can did was",
                        targetWpm: Math.max(25, Math.round(wpm * 0.85))
                    },
                    {
                        title: "Four-Letter Words",
                        description: "Common four-letter words",
                        content: "that what when here they have from",
                        targetWpm: Math.max(27, Math.round(wpm * 0.9))
                    },
                    {
                        title: "Five-Letter Words",
                        description: "Frequent five-letter words",
                        content: "there where about could would should",
                        targetWpm: Math.max(29, Math.round(wpm * 0.95))
                    },
                    {
                        title: "Common Patterns",
                        description: "Frequent letter combinations",
                        content: "ing tion ment ally ness able less ful",
                        targetWpm: Math.max(31, Math.round(wpm))
                    },
                    {
                        title: "Word Combinations",
                        description: "Practice word pairs",
                        content: "right now, just then, but why, not here",
                        targetWpm: Math.max(33, Math.round(wpm * 1.05))
                    },
                    {
                        title: "Pattern Speed Drill",
                        description: "Quick pattern typing",
                        content: "ing and tion, ment to able, ness or less",
                        targetWpm: Math.max(35, Math.round(wpm * 1.1))
                    }
                ]
            },
            {
                name: "Basic Sentences and Punctuation",
                description: "Learn to type complete sentences with basic punctuation",
                lessons: [
                    {
                        title: "Simple Sentences",
                        description: "Basic sentence structure",
                        content: "The cat sat. The dog ran. I can type.",
                        targetWpm: Math.max(30, Math.round(wpm * 0.9))
                    },
                    {
                        title: "Question Marks",
                        description: "Practice with questions",
                        content: "How are you? What time is it? Can you type?",
                        targetWpm: Math.max(32, Math.round(wpm * 0.95))
                    },
                    {
                        title: "Commas",
                        description: "Using commas in sentences",
                        content: "First, second, and third, I can type well.",
                        targetWpm: Math.max(34, Math.round(wpm))
                    },
                    {
                        title: "Exclamations",
                        description: "Practice with excitement",
                        content: "Wow! That's amazing! I can type fast now!",
                        targetWpm: Math.max(36, Math.round(wpm * 1.05))
                    },
                    {
                        title: "Mixed Punctuation",
                        description: "Combine different punctuation marks",
                        content: "Ready? Set, go! How fast can you type?",
                        targetWpm: Math.max(38, Math.round(wpm * 1.1))
                    },
                    {
                        title: "Full Sentences",
                        description: "Complete sentences with punctuation",
                        content: "Type this! Can you do it? Yes, I can do it.",
                        targetWpm: Math.max(40, Math.round(wpm * 1.15))
                    }
                ]
            }
        ],
        intermediate: [
            {
                name: "Speed Building",
                description: "Focus on increasing typing speed while maintaining accuracy",
                lessons: [
                    // ... similar structure for intermediate lessons ...
                ]
            },
            {
                name: "Accuracy Improvement",
                description: "Enhance typing accuracy with challenging exercises",
                lessons: [
                    // ... similar structure for intermediate lessons ...
                ]
            },
            {
                name: "Advanced Patterns",
                description: "Master complex typing patterns and combinations",
                lessons: [
                    // ... similar structure for intermediate lessons ...
                ]
            }
        ],
        advanced: [
            {
                name: "Speed Optimization",
                description: "Push typing speed to professional levels",
                lessons: [
                    // ... similar structure for advanced lessons ...
                ]
            },
            {
                name: "Complex Text Patterns",
                description: "Handle complex text with maximum efficiency",
                lessons: [
                    // ... similar structure for advanced lessons ...
                ]
            },
            {
                name: "Professional Content",
                description: "Practice with real-world professional content",
                lessons: [
                    // ... similar structure for advanced lessons ...
                ]
            }
        ]
    };

    // Select the appropriate module structure based on determined level
    const modules = moduleStructure[level] || moduleStructure.beginner;

    return {
        success: true,
        modules,
        provider: 'fallback'
    };
}

// Create and export a singleton instance
const llmService = new LLMService({
    preferredProvider: process.env.PREFERRED_LLM_PROVIDER as 'gemini' | 'ollama' | undefined,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    ollamaApiUrl: process.env.OLLAMA_API_URL,
    ollamaModel: process.env.OLLAMA_MODEL
});

export default llmService; 
