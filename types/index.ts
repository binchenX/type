export type ParsedMarkdownItem = {
    type: 'list-item' | 'heading' | 'paragraph';
    content: string;
    level?: number;
};

export type TypingState = {
    startTime: number | null;
    endTime: number | null;
    currentPosition: number;
    errors: number;
    typedChars: string[];
    typingErrors?: Array<{
        index: number;
        expected: string;
        actual: string;
        position?: number;  // 1-indexed position for display
        context?: string;   // surrounding text for context
        timestamp?: number; // when the error occurred
    }>;
};

export type TypingStats = {
    wpm: number;
    accuracy: number;
    time: number;
};

// Map to track frequency of errors by character
export type ErrorFrequencyMap = {
    [char: string]: {
        attempts: number;
        errors: number;
        // Map of incorrect characters that were typed instead
        incorrectReplacements: {
            [replacementChar: string]: number;
        };
    };
}; 
