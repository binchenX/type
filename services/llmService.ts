import { ErrorFrequencyMap } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
export interface LearningPlanParams {
    level: 'beginner' | 'intermediate' | 'advanced';
    currentWpm: number;
}

/**
 * LLM Provider interface - all providers must implement this
 */
export interface LLMProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse>;
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

    async generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse> {
        try {
            console.log('Gemini provider: Starting practice text generation');

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
                    practiceSections: getGenericSentences(),
                };
            }

            // Create prompt for Gemini
            const charsList = problematicChars
                .map((item) => item.char === ' ' ? 'SPACE' : item.char)
                .join(', ');

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
                console.error('Gemini provider: No valid practice sentences could be extracted from response');
                throw new Error('No valid practice sentences generated');
            }

            // Log the generated sentences
            practiceSections.forEach((sentence: string, index: number) => {
                console.log(`  ${index + 1}: ${sentence}`);
            });

            return {
                success: true,
                text: `Here are practice sentences focused on characters: ${problematicChars.map(item => item.char === ' ' ? 'SPACE' : item.char).join(', ')}`,
                practiceSections,
                prompt, // Include the prompt for debugging/transparency
            };
        } catch (error) {
            console.error('Error generating with Gemini:', error);
            throw error;
        }
    }

    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        try {
            console.log('Gemini provider: Starting learning plan generation');
            console.log(`Generating plan for ${params.level} level with current WPM: ${params.currentWpm}`);

            const prompt = `Generate a structured typing practice plan for a ${params.level} typist with current speed of ${params.currentWpm} WPM.
The plan should be organized into modules, with each module focusing on a specific skill area.

Format the response as a JSON object with the following structure:
{
  "modules": [
    {
      "name": "Module Name",
      "description": "Brief description of the module's focus",
      "lessons": [
        {
          "title": "Lesson Title",
          "description": "Brief description of the lesson focus",
          "content": "Practice text for typing (40-60 characters)",
          "targetWpm": number
        }
      ]
    }
  ]
}

Create 3 modules, each with 6 lessons. Structure the modules as follows:

For beginner level:
- Module 1: Home Row Mastery
- Module 2: Common Words and Patterns
- Module 3: Basic Sentences and Punctuation

For intermediate level:
- Module 1: Speed Building
- Module 2: Accuracy Improvement
- Module 3: Advanced Patterns

For advanced level:
- Module 1: Speed Optimization
- Module 2: Complex Text Patterns
- Module 3: Professional Content

Each lesson's targetWpm should progressively increase, starting from the user's current WPM.
Ensure practice texts are interesting and relevant to the module's focus.`;

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

            // Parse the response as JSON
            try {
                const plan = JSON.parse(text);
                console.log('Generated Learning Plan Structure:');
                plan.modules.forEach((module: any, moduleIndex: number) => {
                    console.log(`\nModule ${moduleIndex + 1}: ${module.name}`);
                    module.lessons.forEach((lesson: any, lessonIndex: number) => {
                        console.log(`  Lesson ${lessonIndex + 1}: ${lesson.title}`);
                    });
                });
                return {
                    success: true,
                    modules: plan.modules,
                    provider: this.name
                };
                console.log('Generated Learning Plan Details:');
                console.log(JSON.stringify(plan, null, 2));
            } catch (error) {
                console.error('Failed to parse Gemini response as JSON:', error);
                return getFallbackLearningPlan(params);
            }
        } catch (error) {
            console.error('Error generating learning plan with Gemini:', error);
            return getFallbackLearningPlan(params);
        }
    }
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider implements LLMProvider {
    name = 'ollama';
    private apiUrl: string;
    private model: string;

    constructor(apiUrl?: string, model?: string) {
        // Normalize API URL to ensure it's properly formatted
        const baseApiUrl = apiUrl || process.env.OLLAMA_API_URL || 'http://localhost:11434';
        this.apiUrl = baseApiUrl.endsWith('/api/generate')
            ? baseApiUrl
            : baseApiUrl + (baseApiUrl.endsWith('/api') ? '/generate' : '/api/generate');

        // Use provided model name or fallback to environment variable or default
        this.model = model || process.env.OLLAMA_MODEL_NAME || 'llama3.2:latest';
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

    async generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse> {
        try {
            console.log('Ollama provider: Starting practice text generation');

            // Process the error data to create a prompt for the LLM
            const problematicChars = Object.entries(errorFrequencyMap)
                .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
                .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
                .slice(0, 10)
                .map(([char, stats]) => ({
                    char,
                    errorRate: Math.round((stats.errors / stats.attempts) * 100),
                }));

            console.log(`Ollama provider: Found ${problematicChars.length} problematic characters`);

            // If no problematic chars, return general practice text
            if (problematicChars.length === 0) {
                console.log('Ollama provider: No problematic characters found, returning generic sentences');
                return {
                    success: true,
                    text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
                    practiceSections: getGenericSentences(),
                };
            }

            // Create prompt for Ollama
            const charsList = problematicChars
                .map((item) => item.char === ' ' ? 'SPACE' : item.char)
                .join(', ');

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
                text: `Here are practice sentences focused on characters: ${problematicChars.map(item => item.char === ' ' ? 'SPACE' : item.char).join(', ')}`,
                practiceSections,
                prompt, // Include the prompt for debugging/transparency
            };
        } catch (error) {
            console.error('Error generating with Ollama:', error);
            throw error;
        }
    }

    async generateLearningPlan(params: LearningPlanParams): Promise<GenerateLearningPlanResponse> {
        try {
            console.log('Ollama provider: Starting learning plan generation');
            console.log(`Generating plan for ${params.level} level with current WPM: ${params.currentWpm}`);

            const prompt = `Generate a structured typing practice plan for a ${params.level} typist with current speed of ${params.currentWpm} WPM.
The plan should be organized into modules, with each module focusing on a specific skill area.

Format the response as a JSON object with the following structure:
{
  "modules": [
    {
      "name": "Module Name",
      "description": "Brief description of the module's focus",
      "lessons": [
        {
          "title": "Lesson Title",
          "description": "Brief description of the lesson focus",
          "content": "Practice text for typing (40-60 characters)",
          "targetWpm": number
        }
      ]
    }
  ]
}

Create 3 modules, each with 6 lessons. Structure the modules as follows:

For beginner level:
- Module 1: Home Row Mastery
- Module 2: Common Words and Patterns
- Module 3: Basic Sentences and Punctuation

For intermediate level:
- Module 1: Speed Building
- Module 2: Accuracy Improvement
- Module 3: Advanced Patterns

For advanced level:
- Module 1: Speed Optimization
- Module 2: Complex Text Patterns
- Module 3: Professional Content

Each lesson's targetWpm should progressively increase, starting from the user's current WPM.
Ensure practice texts are interesting and relevant to the module's focus.`;

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

            if (!response.ok) {
                throw new Error(`Ollama API responded with status: ${response.status}`);
            }

            const data = await response.json();
            const generatedText = data.response || '';

            // Parse the response as JSON
            try {
                const plan = JSON.parse(generatedText);
                return {
                    success: true,
                    modules: plan.modules,
                    provider: this.name
                };
            } catch (error) {
                console.error('Failed to parse Ollama response as JSON:', error);
                return getFallbackLearningPlan(params);
            }
        } catch (error) {
            console.error('Error generating learning plan with Ollama:', error);
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

    async generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse> {
        console.log('Fallback provider: Starting practice text generation');

        // Extract top problematic characters
        const problematicChars = Object.entries(errorFrequencyMap)
            .filter(([_, stats]) => stats.attempts > 0 && stats.errors > 0)
            .sort((a, b) => (b[1].errors / b[1].attempts) - (a[1].errors / a[1].attempts))
            .slice(0, 5)
            .map(([char, _]) => char);

        console.log(`Fallback provider: Found ${problematicChars.length} problematic characters`);

        if (problematicChars.length === 0) {
            console.log('Fallback provider: No problematic characters found, returning generic sentences');
            return {
                success: true,
                text: "Great job! You don't have any specific characters to practice. Here's a general typing text to keep your skills sharp.",
                practiceSections: getGenericSentences(),
            };
        }

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

        while (sentences.length < 5) {
            const randomIndex = Math.floor(Math.random() * genericSentences.length);
            const sentence = genericSentences[randomIndex];
            if (!sentences.includes(sentence)) {
                sentences.push(sentence);
                console.log(`Fallback provider: Added generic sentence: "${sentence.substring(0, 30)}..."`);
            }
        }

        // Log the final practice sentences
        console.log('Fallback provider: Generated practice sentences:');
        sentences.slice(0, 5).forEach((sentence: string, index: number) => {
            console.log(`  ${index + 1}: ${sentence}`);
        });

        console.log('Fallback provider: Practice text generation successful');
        return {
            success: true,
            text: `Here are practice sentences focused on your problematic characters: ${problematicChars.map(c => c === ' ' ? 'SPACE' : c).join(', ')}`,
            practiceSections: sentences.slice(0, 5),
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
    async generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse> {
        console.log('Checking available LLM providers...');

        for (const provider of this.providers) {
            try {
                console.log(`Checking availability of ${provider.name} provider...`);
                const isAvailable = await provider.isAvailable();
                console.log(`${provider.name} provider availability: ${isAvailable}`);

                if (isAvailable) {
                    console.log(`---------------------------------------`);
                    console.log(`USING ${provider.name.toUpperCase()} PROVIDER FOR TEXT GENERATION`);
                    console.log(`---------------------------------------`);
                    const result = await provider.generatePracticeText(errorFrequencyMap);
                    result.provider = provider.name;
                    result.text = `${result.text} (via ${provider.name})`;
                    return result;
                }
            } catch (error) {
                console.error(`Error with ${provider.name} provider:`, error);
                // Continue to the next provider
            }
        }

        // If we get here, all providers failed
        console.error('All LLM providers failed to generate practice text');
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
        try {
            console.log('LLMService: Starting learning plan generation');
            console.log('LLMService: Checking available providers...');
            const availableProviders = await this.getAvailableProviders();
            console.log('LLMService: Available providers:', availableProviders);

            // Try to use preferred provider first
            const provider = await this.getProvider();
            console.log('LLMService: Selected provider:', provider?.name);

            if (!provider) {
                console.log('LLMService: No provider available, using fallback');
                return getFallbackLearningPlan(params);
            }

            try {
                console.log(`LLMService: Generating plan with ${provider.name} provider`);
                console.log('LLMService: Input params:', params);
                const response = await provider.generateLearningPlan(params);
                console.log(`LLMService: ${provider.name} response:`, JSON.stringify(response, null, 2));
                return response;
            } catch (error) {
                console.error(`LLMService: Error with ${provider.name} provider:`, error);
                console.log('LLMService: Falling back to default plan');
                return getFallbackLearningPlan(params);
            }
        } catch (error) {
            console.error('LLMService: Error in generateLearningPlan:', error);
            return getFallbackLearningPlan(params);
        }
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
    const baseWpm = params.currentWpm;
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
                        targetWpm: Math.max(20, Math.round(baseWpm * 0.8))
                    },
                    {
                        title: "Left Hand Focus",
                        description: "Practice left hand keys",
                        content: "asdf asdf asdf asdf dad sad fad lad",
                        targetWpm: Math.max(22, Math.round(baseWpm * 0.85))
                    },
                    {
                        title: "Right Hand Focus",
                        description: "Practice right hand keys",
                        content: "jkl; jkl; jkl; jkl; kill silk milk jail",
                        targetWpm: Math.max(24, Math.round(baseWpm * 0.9))
                    },
                    {
                        title: "Alternating Hands",
                        description: "Practice alternating between hands",
                        content: "aj sk dl f; aj sk dl f; flash jail silk",
                        targetWpm: Math.max(26, Math.round(baseWpm * 0.95))
                    },
                    {
                        title: "Simple Words",
                        description: "Form basic words using home row",
                        content: "ask dad fall jack sail lake fall dash",
                        targetWpm: Math.max(28, Math.round(baseWpm))
                    },
                    {
                        title: "Speed Challenge",
                        description: "Build speed with home row keys",
                        content: "ask all sad jacks fall; dad has silk",
                        targetWpm: Math.max(30, Math.round(baseWpm * 1.1))
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
                        targetWpm: Math.max(25, Math.round(baseWpm * 0.85))
                    },
                    {
                        title: "Four-Letter Words",
                        description: "Common four-letter words",
                        content: "that what when here they have from",
                        targetWpm: Math.max(27, Math.round(baseWpm * 0.9))
                    },
                    {
                        title: "Five-Letter Words",
                        description: "Frequent five-letter words",
                        content: "there where about could would should",
                        targetWpm: Math.max(29, Math.round(baseWpm * 0.95))
                    },
                    {
                        title: "Common Patterns",
                        description: "Frequent letter combinations",
                        content: "ing tion ment ally ness able less ful",
                        targetWpm: Math.max(31, Math.round(baseWpm))
                    },
                    {
                        title: "Word Combinations",
                        description: "Practice word pairs",
                        content: "right now, just then, but why, not here",
                        targetWpm: Math.max(33, Math.round(baseWpm * 1.05))
                    },
                    {
                        title: "Pattern Speed Drill",
                        description: "Quick pattern typing",
                        content: "ing and tion, ment to able, ness or less",
                        targetWpm: Math.max(35, Math.round(baseWpm * 1.1))
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
                        targetWpm: Math.max(30, Math.round(baseWpm * 0.9))
                    },
                    {
                        title: "Question Marks",
                        description: "Practice with questions",
                        content: "How are you? What time is it? Can you type?",
                        targetWpm: Math.max(32, Math.round(baseWpm * 0.95))
                    },
                    {
                        title: "Commas",
                        description: "Using commas in sentences",
                        content: "First, second, and third, I can type well.",
                        targetWpm: Math.max(34, Math.round(baseWpm))
                    },
                    {
                        title: "Exclamations",
                        description: "Practice with excitement",
                        content: "Wow! That's amazing! I can type fast now!",
                        targetWpm: Math.max(36, Math.round(baseWpm * 1.05))
                    },
                    {
                        title: "Mixed Punctuation",
                        description: "Combine different punctuation marks",
                        content: "Ready? Set, go! How fast can you type?",
                        targetWpm: Math.max(38, Math.round(baseWpm * 1.1))
                    },
                    {
                        title: "Full Sentences",
                        description: "Complete sentences with punctuation",
                        content: "Type this! Can you do it? Yes, I can do it.",
                        targetWpm: Math.max(40, Math.round(baseWpm * 1.15))
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

    // Select the appropriate module structure based on user level
    const modules = moduleStructure[params.level] || moduleStructure.beginner;

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
