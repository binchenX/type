/**
 * Utility function to fetch markdown content from public directory
 * @param path Path to the markdown file in the public directory
 * @returns The content of the markdown file as a string
 */
export async function loadMarkdownFile(path: string): Promise<string> {
    try {
        // Use the fetch API to get the content from the public directory
        const response = await fetch(path);

        if (!response.ok) {
            throw new Error(`Failed to load markdown file: ${response.status} ${response.statusText}`);
        }

        const content = await response.text();
        // Replace straight quotes with typographic quotes
        return replaceQuotes(content);
    } catch (error) {
        console.error('Error loading markdown file:', error);
        return ''; // Return empty string if there's an error
    }
}

/**
 * Replace straight quotes with typographic quotes
 * @param content The text content with potential straight quotes
 * @returns The content with typographic quotes
 */
export function replaceQuotes(content: string): string {
    // Replace typographic single quotes with straight single quotes
    return content.replace(/\u2019/g, "'");
}

/**
 * Default fallback content if the markdown file cannot be loaded
 */
export const fallbackContent = `
- The quick brown fox jumps over the lazy dog.
- She sells seashells by the seashore.
- How much wood would a woodchuck chuck if a woodchuck could chuck wood?
- "Code is like humor. When you have to explain it, it's bad." – Cory House
- "The best error message is the one that never shows up." – Thomas Fuchs
`;

/**
 * Save content to localStorage
 * @param content The markdown content to save
 */
export function saveContentToLocalStorage(content: string): void {
    if (typeof window === 'undefined') return; // Check if running in browser
    try {
        localStorage.setItem('typing-practice-content', content);
    } catch (error) {
        console.error('Failed to save content to localStorage:', error);
    }
}

/**
 * Load content from localStorage
 * @returns The saved content or null if not found
 */
export function loadContentFromLocalStorage(): string | null {
    if (typeof window === 'undefined') return null; // Check if running in browser
    try {
        return localStorage.getItem('typing-practice-content');
    } catch (error) {
        console.error('Failed to load content from localStorage:', error);
        return null;
    }
}

/**
 * Save typing state to localStorage
 * @param state The current state to save
 */
export function saveTypingStateToLocalStorage(state: any): void {
    if (typeof window === 'undefined') return; // Check if running in browser
    try {
        localStorage.setItem('typing-practice-state', JSON.stringify(state));
    } catch (error) {
        console.error('Failed to save state to localStorage:', error);
    }
}

/**
 * Load typing state from localStorage
 * @returns The saved state or null if not found
 */
export function loadTypingStateFromLocalStorage(): any | null {
    if (typeof window === 'undefined') return null; // Check if running in browser
    try {
        const savedState = localStorage.getItem('typing-practice-state');
        return savedState ? JSON.parse(savedState) : null;
    } catch (error) {
        console.error('Failed to load state from localStorage:', error);
        return null;
    }
} 
