import { useState, useRef, useEffect, useCallback } from 'react';
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
import KeyboardToggle from '@/components/KeyboardToggle';
import AuthToolbarIcon from '@/components/AuthToolbarIcon';
import SettingsModal from '@/components/SettingsModal';
import {
    loadMarkdownFile,
    fallbackContent,
    saveContentToLocalStorage,
    loadContentFromLocalStorage,
    saveTypingStateToLocalStorage,
    loadTypingStateFromLocalStorage,
    replaceQuotes
} from '@/utils/fileLoader';
import TypingAssessment from '@/components/TypingAssessment';
import LearningPlan from '@/components/LearningPlan';
import { LevelBasedPlanParams, AssessmentBasedPlanParams } from '@/services/llmService';
import { loadLearningPlan, clearLearningPlan } from '@/utils/learningStorage';
import { useRouter } from 'next/router';
import { useTheme } from 'next-themes';

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

// Toolbar components
const ToolbarContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--background-light);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: visible;
  border: 1px solid var(--border);
  z-index: 10;
`;

const ToolbarDivider = styled.div`
  width: 1px;
  height: 24px;
  background-color: var(--border);
  margin: 0 10px;
`;

const ToolbarButton = styled.button<{ active?: boolean }>`
  background-color: ${props => props.active ? 'var(--primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text)'};
  border: none;
  font-weight: ${props => props.active ? '600' : '500'};
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1rem;
  white-space: nowrap;
  border-radius: 4px;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--primary-dark)' : 'var(--background)'};
    color: ${props => props.active ? 'white' : 'var(--primary)'};
  }
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ToolbarGroup = styled.div`
  display: flex;
  align-items: center;
`;

const ToolbarSpacer = styled.div`
  flex: 1;
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

// Icon components
const LessonsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
    </svg>
);

const AssessmentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const QuotesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"></path>
        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"></path>
    </svg>
);

const CustomIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);

export default function Home() {
    const [uploadedContent, setUploadedContent] = useState<string | null>(null);
    const [parsedItems, setParsedItems] = useState<ParsedMarkdownItem[]>([]);
    const [currentItemIndex, setCurrentItemIndex] = useState(0);
    const [typingState, setTypingState] = useState<TypingState>({
        startTime: undefined,
        endTime: undefined,
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
    const [mode, setMode] = useState<'assessment' | 'learning' | 'practice' | 'quotes' | 'custom'>('assessment');
    const [userLevel, setUserLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
    const [activeLevel, setActiveLevel] = useState<'beginner' | 'intermediate' | 'advanced' | null>(null);
    const [userWpm, setUserWpm] = useState<number>(0);
    const [initialWpm, setInitialWpm] = useState<number>(0);
    const [learningPlanParams, setLearningPlanParams] = useState<LevelBasedPlanParams | AssessmentBasedPlanParams>({
        type: 'level_based',
        level: 'beginner',
        currentWpm: 0
    });
    const [shouldRestoreLearningPlan, setShouldRestoreLearningPlan] = useState(true);
    const [showKeyboard, setShowKeyboard] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [signInModalOpen, setSignInModalOpen] = useState(false);
    const router = useRouter();
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    // Theme-based styles
    const isDark = resolvedTheme === 'dark';
    const modalBg = isDark ? '#181a20' : '#fff';
    const textColor = isDark ? '#f3f4f6' : '#222';
    const labelColor = isDark ? '#e5e7eb' : '#374151';
    const buttonBg = isDark ? '#23262f' : '#e5e7eb';
    const buttonColor = isDark ? '#f3f4f6' : '#222';
    const closeButtonColor = isDark ? '#aaa' : '#888';

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedVisibility = localStorage.getItem('keyboard-visibility');
            if (savedVisibility === 'hidden') {
                setShowKeyboard(false);
            }
        }
    }, []);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Show sign-in modal after 3 seconds if not signed in and hasn't chosen to stay logged out
    useEffect(() => {
        const timer = setTimeout(() => {
            const isSignedIn = localStorage.getItem('qtype_signed_in');
            const hasChosenStayLoggedOut = localStorage.getItem('qtype_stay_logged_out');
            if (!isSignedIn && !hasChosenStayLoggedOut) {
                setSignInModalOpen(true);
            }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

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
                startTime: undefined,
                endTime: undefined,
                currentPosition: 0,
                errors: 0,
                typedChars: [],
                typingErrors: [],
                typingWordErrors: []
            });
            setIsCompleted(false);
        }
    }, [uploadedContent]);

    // Check for saved learning plan on initial load
    useEffect(() => {
        const checkForSavedLearningPlan = () => {
            try {
                // Only check for a saved plan if the flag is true
                if (!shouldRestoreLearningPlan) return;

                const savedPlan = loadLearningPlan();
                if (savedPlan) {
                    console.log('Found saved learning plan, restoring learning mode');
                    setLearningPlanParams(savedPlan.planParams);
                    setMode('learning');

                    // Set the appropriate user level if it's a level-based plan
                    if (savedPlan.planParams.type === 'level_based') {
                        setUserLevel(savedPlan.planParams.level);
                        setActiveLevel(savedPlan.planParams.level);
                    } else if (savedPlan.planParams.type === 'assessment') {
                        // For assessment-based plans, we don't have a specific level in the toolbar
                        setUserLevel('beginner'); // Just to ensure the learning plan loads
                        setActiveLevel(null);
                    }
                }
            } catch (error) {
                console.error('Error checking for saved learning plan:', error);
            }
        };

        // Only check for saved plan after initial content is loaded
        if (!isLoading && parsedItems.length > 0) {
            checkForSavedLearningPlan();
        }
    }, [isLoading, parsedItems.length, shouldRestoreLearningPlan]);

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
            startTime: undefined,
            endTime: undefined,
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
                startTime: undefined,
                endTime: undefined,
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
    // TODO: use llm
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
                startTime: undefined,
                endTime: undefined,
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

    // Function to update typing statistics for all characters, both correct and incorrect
    const updateStatistics = (expectedChar: string, typedChar: string) => {
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

            // Increment attempts for all characters (tracks both correct and incorrect typing)
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
            startTime: undefined,
            endTime: undefined,
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

    const handleAssessmentComplete = (
        level: 'beginner' | 'intermediate' | 'advanced',
        wpm: number,
        assessmentData?: {
            expectedText: string;
            actualText: string;
            accuracy: number;
            errorPatterns: {
                characterErrors: { [key: string]: number };
                commonMistakes: Array<{ expected: string; actual: string; count: number }>;
            };
        }
    ) => {
        // Enable learning plan restoration
        setShouldRestoreLearningPlan(true);

        setUserLevel(level);
        setActiveLevel(level);
        setInitialWpm(wpm);

        // First check if there's a saved learning plan we can reuse for this level
        const savedPlan = loadLearningPlan();

        // For assessment-based plans, we should regenerate if:
        // 1. The type changes (level_based <-> assessment)
        // 2. For level_based: if level or WPM changes
        // 3. For assessment: if assessment data changes (we'll always regenerate since it's likely new data)

        if (savedPlan) {
            if (savedPlan.planParams.type === 'level_based' && !assessmentData) {
                // We have a saved level-based plan and no new assessment data
                const savedParams = savedPlan.planParams as LevelBasedPlanParams;
                if (savedParams.level === level && savedParams.currentWpm === wpm) {
                    console.log('Reusing existing level-based learning plan from localStorage after assessment');
                    // Reuse the existing plan
                    setMode('learning');
                    setLearningPlanParams(savedPlan.planParams);
                    return;
                } else {
                    console.log(`Parameters changed (saved: level=${savedParams.level}, wpm=${savedParams.currentWpm}, new: level=${level}, wpm=${wpm}), generating new plan`);
                }
            } else {
                console.log('Different plan type or new assessment data available, generating new plan');
            }
        }

        // No matching saved plan or parameters differ, create a new one
        console.log(`Creating new learning plan from assessment: level=${level}, wpm=${wpm}`);

        // If we have assessment data, use it for more personalized learning plan
        if (assessmentData) {
            setMode('learning');
            setLearningPlanParams({
                type: 'assessment',
                expectedText: assessmentData.expectedText,
                actualText: assessmentData.actualText,
                wpm
            });
        } else {
            // Fall back to level-based plan
            setMode('learning');
            setLearningPlanParams({
                type: 'level_based',
                level,
                currentWpm: wpm
            });
        }
    };

    const handleLearningComplete = () => {
        // Clear saved learning plan on completion
        clearLearningPlan();
        // Switch back to practice mode and reset learning state
        setMode('practice');
        setUserLevel(null);
        setActiveLevel(null);
    };

    const handleExitLearning = () => {
        // Clear saved learning plan when manually exiting
        clearLearningPlan();
        // Switch back to practice mode and reset learning state
        setMode('practice');
        setUserLevel(null);
        setActiveLevel(null);
    };

    const startPractice = () => {
        // Don't clear learning plan, just prevent auto-restoration
        setShouldRestoreLearningPlan(false);

        setMode('practice');
    };

    // Function to jump directly to markdown upload
    const jumpToMarkdownUpload = () => {
        // Don't clear learning plan, just prevent auto-restoration
        setShouldRestoreLearningPlan(false);

        setMode('practice');
        setShowUploadArea(true);
    };

    // Functions to load different content types
    const loadQuotes = async () => {
        // Don't clear learning plan, just prevent auto-restoration
        setShouldRestoreLearningPlan(false);

        setIsLoading(true);
        try {
            const content = await loadMarkdownFile('/data/quotes.md');
            if (content) {
                setUploadedContent(content);
            } else {
                setUploadedContent(fallbackContent);
            }
            setMode('practice');
        } catch (error) {
            console.error('Failed to load quotes:', error);
            setUploadedContent(fallbackContent);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCustomUpload = () => {
        // Don't clear learning plan, just prevent auto-restoration
        setShouldRestoreLearningPlan(false);

        setMode('custom');
        setShowUploadArea(true);
    };

    const startLearning = (level: 'beginner' | 'intermediate' | 'advanced', wpm: number) => {
        console.log(`startLearning called with level=${level}, wpm=${wpm}`);

        // Enable learning plan restoration
        setShouldRestoreLearningPlan(true);

        // First check if there's a saved learning plan we can reuse
        const savedPlan = loadLearningPlan();
        if (savedPlan && savedPlan.planParams.type === 'level_based') {
            const savedParams = savedPlan.planParams as LevelBasedPlanParams;
            // Check if both level AND wpm match what we have saved
            if (savedParams.level === level && savedParams.currentWpm === wpm) {
                console.log('Reusing existing learning plan from localStorage');
                // Reuse the existing plan
                setMode('learning');
                setUserLevel(level);
                setActiveLevel(level);
                setLearningPlanParams(savedPlan.planParams);
                return;
            } else {
                console.log(`Parameters changed (saved: level=${savedParams.level}, wpm=${savedParams.currentWpm}, new: level=${level}, wpm=${wpm}), generating new plan`);
            }
        }

        // No matching saved plan or parameters differ, create a new one
        console.log(`Creating new learning plan for level=${level}, wpm=${wpm}`);
        // Set the mode to learning
        setMode('learning');
        // Set the userLevel for tracking purposes
        setUserLevel(level);
        // Directly set the learning plan parameters for a new plan
        setLearningPlanParams({
            type: 'level_based',
            level,
            currentWpm: wpm
        });
        // Set the activeLevel to highlight the correct button
        setActiveLevel(level);
    };

    // Add a function to toggle keyboard visibility
    const toggleKeyboardVisibility = useCallback(() => {
        setShowKeyboard(prevState => {
            const newState = !prevState;
            // Optionally save preference to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('keyboard-visibility', newState ? 'visible' : 'hidden');
            }
            return newState;
        });
    }, []);

    // Patch AuthToolbarIcon to open modal instead of routing
    const handleToolbarSettings = () => setSettingsOpen(true);

    return (
        <>
            <Head>
                <title>QType - Typing Practice with AI</title>
                <meta name="description" content="Practice typing with AI-powered lessons tailored to your skill level" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>

            {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} showKeyboard={showKeyboard} setShowKeyboard={setShowKeyboard} />}
            {mounted && signInModalOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        background: modalBg,
                        color: textColor,
                        borderRadius: 24,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        width: 420,
                        maxWidth: '95vw',
                        padding: '48px 32px 32px 32px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setSignInModalOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 18,
                                right: 18,
                                background: 'none',
                                border: 'none',
                                fontSize: 28,
                                fontWeight: 700,
                                color: closeButtonColor,
                                cursor: 'pointer',
                                padding: 0,
                                lineHeight: 1,
                            }}
                            aria-label="Close sign in modal"
                        >
                            ×
                        </button>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16, textAlign: 'center', color: textColor }}>Welcome back</h2>
                        <div style={{ fontSize: '1.15rem', color: labelColor, marginBottom: 32, textAlign: 'center', maxWidth: 340 }}>
                            Log in or sign up for more personalization.
                        </div>
                        <button
                            onClick={() => router.push('/signup')}
                            style={{
                                width: '100%',
                                background: isDark ? '#23262f' : '#111',
                                color: '#f3f4f6',
                                border: 'none',
                                borderRadius: 9999,
                                padding: '16px 0',
                                fontWeight: 700,
                                fontSize: '1.2rem',
                                marginBottom: 16,
                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                borderTop: '3px solid ' + (isDark ? '#181a20' : '#fff'),
                                borderBottom: '3px solid ' + (isDark ? '#181a20' : '#fff'),
                                transition: 'background 0.15s',
                                cursor: 'pointer',
                            }}
                            onMouseOver={e => { if (isDark) e.currentTarget.style.background = '#353945'; }}
                            onMouseOut={e => { if (isDark) e.currentTarget.style.background = '#23262f'; }}
                        >
                            Log in
                        </button>
                        <button
                            onClick={() => {
                                localStorage.setItem('qtype_stay_logged_out', '1');
                                setSignInModalOpen(false);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: isDark ? '#e5e7eb' : labelColor,
                                textDecoration: 'underline',
                                fontWeight: 600,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                marginTop: 8,
                            }}
                        >
                            Stay logged out
                        </button>
                    </div>
                </div>
            )}

            <ToolbarContainer>
                <ToolbarGroup>
                    <ToolbarButton
                        active={mode === 'assessment'}
                        onClick={() => {
                            // Don't clear learning plan, just prevent auto-restoration when explicitly navigating
                            setShouldRestoreLearningPlan(false);
                            setMode('assessment');
                            setActiveLevel(null);
                        }}
                    >
                        <AssessmentIcon /> Assessment
                    </ToolbarButton>

                    <ToolbarButton
                        active={mode === 'learning' && activeLevel === 'beginner'}
                        onClick={() => startLearning('beginner', 20)}
                    >
                        <LessonsIcon /> Lessons
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarDivider />

                <ToolbarGroup>
                    <ToolbarButton
                        active={mode === 'practice'}
                        onClick={() => {
                            // Don't clear learning plan, just prevent auto-restoration when explicitly navigating
                            setShouldRestoreLearningPlan(false);
                            loadQuotes();
                            setActiveLevel(null);
                        }}
                    >
                        <QuotesIcon /> Quotes
                    </ToolbarButton>
                    <ToolbarButton
                        active={mode === 'custom'}
                        onClick={() => {
                            // Don't clear learning plan, just prevent auto-restoration when explicitly navigating
                            setShouldRestoreLearningPlan(false);
                            jumpToMarkdownUpload();
                            setActiveLevel(null);
                        }}
                    >
                        <CustomIcon /> Custom
                    </ToolbarButton>
                </ToolbarGroup>

                <ToolbarSpacer />

                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <AuthToolbarIcon onSettings={handleToolbarSettings} onSignInModal={() => setSignInModalOpen(true)} />
                </div>
            </ToolbarContainer>

            <Container className="container">
                <Header style={{ marginBottom: mode === 'learning' ? '0.5rem' : '2rem' }}>
                    {mode !== 'learning' && (
                        <Title>
                            {mode === 'assessment' ? '' :
                                mode === 'custom' ? 'Custom Text Practice' :
                                    'Quotes Practice'}
                        </Title>
                    )}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {mode === 'practice' && !isCompleted && parsedItems.length > 0 && (
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
                    </div>
                </Header>

                <Main>
                    {mode === 'assessment' && (
                        <TypingAssessment onComplete={handleAssessmentComplete} />
                    )}

                    {mode === 'learning' && userLevel && (
                        <LearningPlan
                            planParams={learningPlanParams}
                            onComplete={handleLearningComplete}
                            onExit={handleExitLearning}
                            showKeyboard={showKeyboard}
                        />
                    )}

                    {(mode === 'practice' || mode === 'custom') && (
                        isLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <p>Loading typing content...</p>
                            </div>
                        ) : showUploadArea ? (
                            <UploadArea onUpload={handleFileUpload} />
                        ) : (
                            <>
                                {isCompleted ? (
                                    <Results
                                        parsedItems={parsedItems}
                                        onReset={resetPractice}
                                        errorFrequencyMap={errorFrequencyMap}
                                        onStartNewPractice={handleStartNewPractice}
                                        typingErrors={accumulatedErrors.typingErrors}
                                        typingWordErrors={accumulatedErrors.typingWordErrors}
                                    />
                                ) : (
                                    <>
                                        <div style={{ position: 'relative' }}>
                                            <KeyboardTips>
                                                Press <kbd>Alt</kbd>+<kbd>←</kbd> to go back, <kbd>Alt</kbd>+<kbd>→</kbd> to skip
                                            </KeyboardTips>
                                            <TypingArea
                                                text={getCurrentContent()}
                                                typingState={typingState}
                                                setTypingState={setTypingState}
                                                onComplete={moveToNextItem}
                                                updateStatistics={updateStatistics}
                                                onSkipForward={skipCurrentItem}
                                                onSkipBackward={moveToPreviousItem}
                                                showKeyboard={showKeyboard}
                                                blockOnError={false}
                                            />
                                        </div>

                                        <Stats
                                            currentIndex={currentItemIndex}
                                            totalItems={parsedItems.length}
                                            typingState={typingState}
                                            currentText={getCurrentContent()}
                                        />
                                    </>
                                )}
                            </>
                        )
                    )}
                </Main>
            </Container>
        </>
    );
} 
