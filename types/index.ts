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
    };
}; 
