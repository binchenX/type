export type ParsedMarkdownItem = {
    type: 'list-item' | 'heading' | 'paragraph';
    content: string;
    level?: number;
};

export interface TypingError {
    index: number;
    expected: string;
    actual: string;
}

export interface TypingWordError {
    word: string;
    typedWord: string;
    startIndex: number;
    endIndex: number;
}

export interface TypingState {
    currentPosition: number;
    startTime?: number;
    endTime?: number;
    errors: number;
    typedChars: string[];
    typingErrors: TypingError[];
    typingWordErrors: TypingWordError[];
    lastIncorrectChar?: string;
}

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
