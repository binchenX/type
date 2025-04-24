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
    serviceInfo?: {
        availableProviders: string[];
        preferredProvider: string | null;
    };
}

/**
 * LLM Provider interface - all providers must implement this
 */
export interface LLMProvider {
    name: string;
    isAvailable(): Promise<boolean>;
    generatePracticeText(errorFrequencyMap: ErrorFrequencyMap): Promise<GeneratePracticeResponse>;
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
}

/**
 * The main LLM service class
 */
export class LLMService {
    private providers: LLMProvider[] = [];
    private preferredProvider?: string;
    private config: LLMConfig;

    constructor(config?: LLMServiceConfig) {
        // Check environment variables
        console.log('LLM Service Environment Variables:');
        console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? '[REDACTED]' : 'Not provided');
        console.log('  GEMINI_MODEL:', process.env.GEMINI_MODEL || 'gemini-2.0-flash (default)');
        console.log('  ENABLE_OLLAMA:', process.env.ENABLE_OLLAMA);
        console.log('  OLLAMA_API_URL:', '[REDACTED]');
        console.log('  OLLAMA_MODEL_NAME:', process.env.OLLAMA_MODEL_NAME || 'Not provided (will use default)');
        console.log('  PREFERRED_LLM_PROVIDER:', process.env.PREFERRED_LLM_PROVIDER || 'Not provided (will use default)');

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

        // Log configuration (with sensitive data redacted)
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

        // Add providers in order of preference
        if (config?.preferredProvider === 'gemini') {
            // Gemini first, then Ollama
            console.log('Provider order: 1. Gemini, 2. Ollama, 3. Fallback');
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
            // Ollama first, then Gemini
            console.log('Provider order: 1. Ollama, 2. Gemini, 3. Fallback');
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

// Create and export a singleton instance
const llmService = new LLMService({
    preferredProvider: process.env.PREFERRED_LLM_PROVIDER as 'gemini' | 'ollama' | undefined,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL,
    ollamaApiUrl: process.env.OLLAMA_API_URL,
    ollamaModel: process.env.OLLAMA_MODEL
});

export default llmService; 
