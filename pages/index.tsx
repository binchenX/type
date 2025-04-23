import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import styled from 'styled-components';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ParsedMarkdownItem, TypingState, ErrorFrequencyMap } from '@/types';
import UploadArea from '@/components/UploadArea';
import TypingArea from '@/components/TypingArea';
import Results from '@/components/Results';
import Stats from '@/components/Stats';
import ThemeToggle from '@/components/ThemeToggle';
import {
    loadMarkdownFile,
    fallbackContent,
    saveContentToLocalStorage,
    loadContentFromLocalStorage,
    saveTypingStateToLocalStorage,
    loadTypingStateFromLocalStorage,
    replaceQuotes
} from '@/utils/fileLoader';

const Container = styled.div`
  min-height: 100vh;
  padding: 2rem 0;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text);
`;

const Main = styled.main`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

// New styled component for keyboard shortcuts tips
const KeyboardTips = styled.div`
  position: absolute;
  top: -10px;
  right: 0;
  background-color: var(--primary);
  color: white;
  font-size: 0.9rem;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  transform: translateY(-50%);
  z-index: 10;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -5px;
    right: 15px;
    width: 10px;
    height: 10px;
    background-color: var(--primary);
    transform: rotate(45deg);
  }
  
  kbd {
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    padding: 1px 5px;
    margin: 0 2px;
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
`;

export default function Home() {
    const [uploadedContent, setUploadedContent] = useState<string | null>(null);
    const [parsedItems, setParsedItems] = useState<ParsedMarkdownItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [typingState, setTypingState] = useState<TypingState>({
        startTime: null,
        endTime: null,
        currentPosition: 0,
        errors: 0,
        typedChars: [],
        typingErrors: [],
        typingWordErrors: []
    });
    // Add accumulated errors state to track errors across all sections
    const [accumulatedErrors, setAccumulatedErrors] = useState<{
        typingErrors: Array<{ index: number; expected: string; actual: string }>;
        typingWordErrors: Array<{ word: string; typedWord: string; startIndex: number; endIndex: number }>;
    }>({
        typingErrors: [],
        typingWordErrors: []
    });
    const [isCompleted, setIsCompleted] = useState(false);
    const [errorFrequencyMap, setErrorFrequencyMap] = useState<ErrorFrequencyMap>({});
    const [practiceMode, setPracticeMode] = useState<'regular' | 'focused'>('regular');
    const [showUploadArea, setShowUploadArea] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load content from localStorage or public directory on initial component mount
    useEffect(() => {
        async function loadDefaultContent() {
            if (!uploadedContent) {
                setIsLoading(true);
                try {
                    // First try to load from localStorage
                    const savedContent = loadContentFromLocalStorage();

                    if (savedContent) {
                        console.log('Loaded content from localStorage');
                        setUploadedContent(savedContent);

                        // Also try to load saved state
                        const savedState = loadTypingStateFromLocalStorage();
                        if (savedState) {
                            // Only restore these parts of the state
                            setCurrentItemIndex(savedState.currentItemIndex || 0);
                            setErrorFrequencyMap(savedState.errorFrequencyMap || {});
                            setPracticeMode(savedState.practiceMode || 'regular');

                            // Ensure typing state has typingWordErrors initialized
                            setTypingState(prevState => ({
                                ...prevState,
                                typingWordErrors: []
                            }));
                        }
                    } else {
                        // If not in localStorage, try to load the quotes.md file
                        console.log('No saved content found, loading from quotes.md');
                        const content = await loadMarkdownFile('/data/quotes.md');

                        // If content was successfully loaded, use it
                        if (content) {
                            setUploadedContent(content);
                        } else {
                            // Otherwise fall back to the default content
                            setUploadedContent(fallbackContent);
                        }
                    }
                } catch (error) {
                    console.error('Failed to load content:', error);
                    // Use fallback content if there's an error
                    setUploadedContent(fallbackContent);
                } finally {
                    setIsLoading(false);
                }
            }
        }

        loadDefaultContent();
    }, []);

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (uploadedContent) {
            saveContentToLocalStorage(uploadedContent);

            // Save relevant parts of state
            const stateToSave = {
                currentItemIndex,
                errorFrequencyMap,
                practiceMode
            };
            saveTypingStateToLocalStorage(stateToSave);
        }
    }, [uploadedContent, currentItemIndex, errorFrequencyMap, practiceMode]);

    // Process markdown content when uploaded
    useEffect(() => {
        if (!uploadedContent) return;

        // Simple parser to extract text items from markdown
        const parseMarkdown = (content: string): ParsedMarkdownItem[] => {
            // Split by newlines and filter out empty lines
            const lines = content.split('\n').filter(line => line.trim() !== '');

            // Extract list items and other text
            const items: ParsedMarkdownItem[] = [];

            lines.forEach((line) => {
                // Check if it's a list item (starts with - or *)
                const listItemMatch = line.match(/^[-*]\s+(.+)$/);
                if (listItemMatch) {
                    items.push({
                        type: 'list-item',
                        content: listItemMatch[1].trim()
                    });
                }
                // Check if it's a heading (starts with #)
                else if (line.startsWith('#')) {
                    const level = line.match(/^(#+)\s+/)?.[1].length || 1;
                    const content = line.replace(/^#+\s+/, '').trim();
                    items.push({
                        type: 'heading',
                        level,
                        content
                    });
                }
                // Regular paragraph text
                else {
                    items.push({
                        type: 'paragraph',
                        content: line.trim()
                    });
                }
            });

            return items;
        };

        const parsed = parseMarkdown(uploadedContent);
        setParsedItems(parsed);

        // Reset typing state with the first item
        if (parsed.length > 0) {
            setCurrentItemIndex(0);
            setTypingState({
                startTime: null,
                endTime: null,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
                typingErrors: [],
                typingWordErrors: []
            });
            setIsCompleted(false);
        }
    }, [uploadedContent]);

    const handleFileUpload = (content: string) => {
        // Apply typographic quote replacement
        const formattedContent = replaceQuotes(content);
        setUploadedContent(formattedContent);
        // Reset error frequency map when new content is uploaded
        setErrorFrequencyMap({});
        setPracticeMode('regular');
        // Hide upload area after successful upload
        setShowUploadArea(false);
        // Save to localStorage
        saveContentToLocalStorage(formattedContent);
    };

    const toggleUploadArea = () => {
        setShowUploadArea(prev => !prev);
    };

    const resetPractice = () => {
        setCurrentItemIndex(0);
        setTypingState({
            startTime: null,
            endTime: null,
            currentPosition: 0,
            errors: 0,
            typedChars: [],
            typingErrors: [],
            typingWordErrors: []
        });
        // Reset accumulated errors too
        setAccumulatedErrors({
            typingErrors: [],
            typingWordErrors: []
        });
        // Reset error frequency map to start fresh for each practice session
        setErrorFrequencyMap({});
        setIsCompleted(false);
    };

    const moveToNextItem = () => {
        if (currentItemIndex < parsedItems.length - 1) {
            // Detect word errors before resetting typing state
            const currentText = parsedItems[currentItemIndex].content;
            const wordErrors = detectWordErrors(currentText, typingState);

            // Accumulate errors before resetting typing state
            setAccumulatedErrors(prev => {
                return {
                    typingErrors: [...prev.typingErrors, ...(typingState.typingErrors || [])],
                    typingWordErrors: [...prev.typingWordErrors, ...wordErrors]
                };
            });

            setCurrentItemIndex(prev => prev + 1);

            // Explicitly clear typingErrors to prevent persistence between items
            setTypingState({
                startTime: null,
                endTime: null,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
                typingErrors: [], // Make sure this is an empty array, not undefined
                typingWordErrors: []
            });
        } else {
            // Detect word errors for the last item
            const currentText = parsedItems[currentItemIndex].content;
            const wordErrors = detectWordErrors(currentText, typingState);

            // Accumulate errors from the last section
            setAccumulatedErrors(prev => {
                return {
                    typingErrors: [...prev.typingErrors, ...(typingState.typingErrors || [])],
                    typingWordErrors: [...prev.typingWordErrors, ...wordErrors]
                };
            });
            setIsCompleted(true);
        }
    };

    // Function to detect word errors by comparing expected and actual text
    const detectWordErrors = (expectedText: string, typingState: TypingState) => {
        // If no typed characters, return empty array
        if (!typingState.typedChars || typingState.typedChars.length === 0) {
            return [];
        }

        const typedText = typingState.typedChars.join('');
        const wordErrors: Array<{
            word: string;
            typedWord: string;
            startIndex: number;
            endIndex: number;
        }> = [];

        // Split text into words
        const expectedWords = expectedText.split(/\s+/);
        const typedWords = typedText.split(/\s+/);

        let expectedIndex = 0;
        let typedIndex = 0;

        // Compare each word
        for (let i = 0; i < expectedWords.length && i < typedWords.length; i++) {
            const expectedWord = expectedWords[i];
            const typedWord = typedWords[i];

            // Skip empty words
            if (!expectedWord.trim() || !typedWord.trim()) {
                continue;
            }

            // Find the start index of this word in the original text
            const startIndex = expectedText.indexOf(expectedWord, expectedIndex);
            if (startIndex === -1) continue;

            // Update expected index for next iteration
            expectedIndex = startIndex + expectedWord.length;

            // Find the end index of this word
            const endIndex = startIndex + expectedWord.length;

            // If word doesn't match, record an error
            if (expectedWord !== typedWord) {
                wordErrors.push({
                    word: expectedWord,
                    typedWord: typedWord,
                    startIndex,
                    endIndex
                });
            }
        }

        return wordErrors;
    };

    const moveToPreviousItem = () => {
        if (currentItemIndex > 0) {
            setCurrentItemIndex(prev => prev - 1);
            setTypingState({
                startTime: null,
                endTime: null,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
                typingErrors: [],
                typingWordErrors: []
            });
        }
    };

    const skipCurrentItem = () => {
        // Just move to the next item without marking current as completed
        moveToNextItem();
    };

    const getCurrentContent = (): string => {
        if (!parsedItems.length || currentItemIndex >= parsedItems.length) return '';
        return parsedItems[currentItemIndex].content;
    };

    // Function to update error frequency map
    const updateErrorFrequencyMap = (expectedChar: string, typedChar: string) => {
        setErrorFrequencyMap(prevMap => {
            const newMap = { ...prevMap };

            // Initialize character data if it doesn't exist
            if (!newMap[expectedChar]) {
                newMap[expectedChar] = {
                    attempts: 0,
                    errors: 0,
                    incorrectReplacements: {}
                };
            }

            // Increment attempts
            newMap[expectedChar].attempts += 1;

            // If character was typed incorrectly
            if (expectedChar !== typedChar) {
                // Increment errors
                newMap[expectedChar].errors += 1;

                // Track the incorrect replacement
                if (!newMap[expectedChar].incorrectReplacements) {
                    newMap[expectedChar].incorrectReplacements = {};
                }

                if (!newMap[expectedChar].incorrectReplacements[typedChar]) {
                    newMap[expectedChar].incorrectReplacements[typedChar] = 0;
                }

                newMap[expectedChar].incorrectReplacements[typedChar] += 1;
            }

            return newMap;
        });
    };

    // Start a new practice session with generated items
    const handleStartNewPractice = (items: ParsedMarkdownItem[]) => {
        setParsedItems(items);
        setCurrentItemIndex(0);
        setTypingState({
            startTime: null,
            endTime: null,
            currentPosition: 0,
            errors: 0,
            typedChars: [],
            typingErrors: [],
            typingWordErrors: []
        });
        // Reset accumulated errors for new practice
        setAccumulatedErrors({
            typingErrors: [],
            typingWordErrors: []
        });
        // Reset error frequency map for the new practice session
        setErrorFrequencyMap({});
        setIsCompleted(false);
        setPracticeMode('focused');
    };

    // Add a function to clear all saved data
    const handleClearSavedData = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('typing-practice-content');
            localStorage.removeItem('typing-practice-state');

            // Reset to default content
            loadMarkdownFile('/data/quotes.md')
                .then(content => {
                    if (content) {
                        setUploadedContent(content);
                    } else {
                        setUploadedContent(fallbackContent);
                    }
                    // Reset state
                    setCurrentItemIndex(0);
                    setErrorFrequencyMap({});
                    setPracticeMode('regular');
                    setIsCompleted(false);
                })
                .catch(error => {
                    console.error('Failed to load default content:', error);
                    setUploadedContent(fallbackContent);
                });
        }
    };

    return (
        <>
            <Head>
                <title>Typing Practice</title>
                <meta name="description" content="Improve your typing skills by practicing with your own texts" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <Container className="container">
                <Header>
                    <Title>
                        {practiceMode === 'focused' ? 'Focused Typing Practice' : 'Typing Practice'}
                    </Title>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {!isCompleted && parsedItems.length > 0 && (
                            <>
                                <button
                                    onClick={toggleUploadArea}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--primary)',
                                        border: '1px solid var(--primary)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {showUploadArea ? 'Cancel Upload' : 'Upload Custom Text'}
                                </button>
                                <button
                                    onClick={handleClearSavedData}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--text-light)',
                                        border: '1px solid var(--border)',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Reset to Default
                                </button>
                            </>
                        )}
                        <ThemeToggle />
                    </div>
                </Header>

                <Main>
                    {isLoading ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <p>Loading typing content...</p>
                        </div>
                    ) : showUploadArea ? (
                        <UploadArea onUpload={handleFileUpload} />
                    ) : (
                        <>
                            {isCompleted ? (
                                <>
                                    <Results
                                        parsedItems={parsedItems}
                                        onReset={resetPractice}
                                        errorFrequencyMap={errorFrequencyMap}
                                        onStartNewPractice={handleStartNewPractice}
                                        // Pass accumulated errors instead of just current section errors
                                        typingErrors={accumulatedErrors.typingErrors}
                                        typingWordErrors={accumulatedErrors.typingWordErrors}
                                    />
                                </>
                            ) : (
                                <>
                                    <Stats
                                        currentIndex={currentItemIndex}
                                        totalItems={parsedItems.length}
                                        typingState={typingState}
                                        currentText={getCurrentContent()}
                                    />

                                    <div style={{ position: 'relative' }}>
                                        <KeyboardTips>
                                            Press <kbd>Alt</kbd>+<kbd>←</kbd> to go back, <kbd>Alt</kbd>+<kbd>→</kbd> to skip
                                        </KeyboardTips>
                                        <TypingArea
                                            text={getCurrentContent()}
                                            typingState={{
                                                ...typingState,
                                                typingErrors: typingState.typingErrors || [],
                                                typingWordErrors: typingState.typingWordErrors || []
                                            }}
                                            setTypingState={setTypingState}
                                            onComplete={moveToNextItem}
                                            updateErrorFrequencyMap={updateErrorFrequencyMap}
                                            onSkipForward={skipCurrentItem}
                                            onSkipBackward={moveToPreviousItem}
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </Main>
            </Container>
        </>
    );
} 
