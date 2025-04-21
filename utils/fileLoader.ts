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
        return content;
    } catch (error) {
        console.error('Error loading markdown file:', error);
        return ''; // Return empty string if there's an error
    }
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
