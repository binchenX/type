import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { TypingState } from '@/types';
import Keyboard from './Keyboard';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  width: 100%;
`;

const TextDisplay = styled.div`
  font-family: var(--font-mono);
  font-size: 1.25rem;
  line-height: 1.6;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: var(--background-light);
  white-space: pre-wrap;
  min-height: 150px;
`;

const Character = styled.span<{
    status?: 'correct' | 'incorrect' | 'current' | 'untyped';
    hasTooltip?: boolean;
}>`
  position: relative;
  color: ${props => {
        switch (props.status) {
            case 'correct':
                return 'var(--success)';
            case 'incorrect':
                return 'var(--error)';
            case 'current':
                return 'inherit';
            default:
                return 'var(--text-light)';
        }
    }};
  
  /* Background styling */
  background-color: ${props => props.status === 'incorrect' ? 'rgba(239, 68, 68, 0.1)' : 'transparent'};
  border-radius: 2px;
  
  /* Different text decorations based on status */
  text-decoration: ${props => {
        switch (props.status) {
            case 'incorrect':
                return 'underline';
            case 'current':
                return 'underline';
            default:
                return 'none';
        }
    }};
  
  /* Different text decoration colors */
  text-decoration-color: ${props => {
        switch (props.status) {
            case 'incorrect':
                return 'var(--error)';
            case 'current':
                return 'var(--text)'; /* Black underline for current character */
            default:
                return 'transparent';
        }
    }};
  
  /* Make the current character's underline thicker */
  text-decoration-thickness: ${props => props.status === 'current' ? '2px' : '1px'};
  
  ${props => props.hasTooltip && `
    cursor: pointer;

    &:hover .tooltip {
      display: block;
    }
  `}
`;

const ErrorTooltip = styled.span`
  position: absolute;
  display: none;
  background-color: var(--error);
  color: white;
  font-size: 0.75rem;
  padding: 2px 5px;
  border-radius: 2px;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  z-index: 10;
  
  &:after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: var(--error) transparent transparent transparent;
  }
`;

const InputArea = styled.textarea`
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
`;

const LiveStatsContainer = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--background-light);
  border-radius: 8px;
  font-size: 0.875rem;
`;

const LiveStatsHeader = styled.h4`
  margin-bottom: 0.75rem;
  color: var(--text);
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const LiveErrorsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

const LiveErrorItem = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background-color: var(--background);
  border: 1px solid var(--border);
  border-radius: 4px;
`;

const ExpectedChar = styled.span`
  font-family: var(--font-mono);
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  background-color: var(--error);
  color: white;
  border-radius: 4px;
  margin-right: 0.25rem;
`;

const ActualChar = styled.span`
  font-family: var(--font-mono);
  padding: 0.25rem 0.5rem;
  background-color: var(--background-light);
  border-radius: 4px;
`;

const ArrowIcon = styled.span`
  margin: 0 0.25rem;
  color: var(--text-light);
`;

interface TypingAreaProps {
    text: string;
    typingState?: TypingState;
    setTypingState?: React.Dispatch<React.SetStateAction<TypingState>>;
    onComplete: (finalState: TypingState) => void;
    updateStatistics?: (expectedChar: string, typedChar: string) => void;
    onSkipForward?: () => void;
    onSkipBackward?: () => void;
    showKeyboard?: boolean;
    blockOnError?: boolean;
}

// LiveErrorStats component to display errors in real-time
const LiveErrorStats = ({
    typingErrors,
    showStats
}: {
    typingErrors: Array<{ index: number; expected: string; actual: string }>;
    showStats: boolean;
}) => {
    if (!showStats || typingErrors.length === 0) return null;

    // Group errors by expected character and count occurrences
    const errorMap = typingErrors.reduce((acc, error) => {
        const key = `${error.expected}:${error.actual}`;
        if (!acc[key]) {
            acc[key] = {
                expected: error.expected,
                actual: error.actual,
                count: 0
            };
        }
        acc[key].count++;
        return acc;
    }, {} as Record<string, { expected: string; actual: string; count: number }>);

    // Convert to array and sort by count
    const errorItems = Object.values(errorMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8); // Show max 8 most frequent errors

    return (
        <LiveStatsContainer>
            <LiveStatsHeader>
                Live Typing Errors
            </LiveStatsHeader>
            <LiveErrorsList>
                {errorItems.map((item, index) => (
                    <LiveErrorItem key={index}>
                        <ExpectedChar>
                            {item.expected === ' ' ? '⎵' : item.expected}
                        </ExpectedChar>
                        <ArrowIcon>→</ArrowIcon>
                        <ActualChar>
                            {item.actual === ' ' ? '⎵' : item.actual}
                        </ActualChar>
                        {item.count > 1 && (
                            <span style={{ marginLeft: '0.5rem', color: 'var(--text-light)' }}>
                                ×{item.count}
                            </span>
                        )}
                    </LiveErrorItem>
                ))}
            </LiveErrorsList>
        </LiveStatsContainer>
    );
};

const TypingArea: React.FC<TypingAreaProps> = ({
    text,
    typingState: externalTypingState,
    setTypingState: setExternalTypingState,
    onComplete,
    updateStatistics,
    onSkipForward,
    onSkipBackward,
    showKeyboard = true,
    blockOnError = true
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLiveStats, setShowLiveStats] = useState(true);

    // Track the current word being typed
    const [currentWordInfo, setCurrentWordInfo] = useState<{
        word: string;
        startIndex: number;
        endIndex: number;
        typedChars: string[];
    } | null>(null);

    const [internalTypingState, setInternalTypingState] = useState<TypingState>({
        startTime: null,
        endTime: null,
        currentPosition: 0,
        errors: 0,
        typedChars: [],
        typingErrors: [],
        typingWordErrors: []
    });

    const typingState = externalTypingState || internalTypingState;
    const setTypingState = setExternalTypingState || setInternalTypingState;

    // Reset when text changes (when moving to a new item)
    useEffect(() => {
        if (inputRef.current) {
            // Clear the input value
            inputRef.current.value = '';
            inputRef.current.focus();
        }

        // Make sure typingErrors array is cleared when text changes
        // This ensures errors from previous items don't persist in the UI
        setTypingState(prev => ({
            ...prev,
            typingErrors: [],
            currentPosition: 0,
            typedChars: []
        }));
    }, [text, setTypingState]); // Re-run when text changes

    // Add global keyboard event listener for navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Only respond to Alt+Arrow combinations
            if (!e.altKey) return;

            // Right arrow key to skip to next item
            if (e.key === 'ArrowRight' && onSkipForward) {
                e.preventDefault();
                onSkipForward();
            }

            // Left arrow key to go to previous item
            if (e.key === 'ArrowLeft' && onSkipBackward) {
                e.preventDefault();
                onSkipBackward();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onSkipForward, onSkipBackward]);

    // Handle keyboard events within textarea
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Prevent default browser behavior for certain keys
        if (e.key === 'Tab') {
            e.preventDefault();
        }

        // Handle Alt+Arrow navigation
        if (e.altKey) {
            // Skip to next item with Alt+Right arrow
            if (e.key === 'ArrowRight' && onSkipForward) {
                e.preventDefault();
                onSkipForward();
                return;
            }

            // Go to previous item with Alt+Left arrow
            if (e.key === 'ArrowLeft' && onSkipBackward) {
                e.preventDefault();
                onSkipBackward();
                return;
            }
        }

        if (e.ctrlKey || e.metaKey) {
            return; // Ignore other command keys
        }

        // Initialize start time on first keypress
        if (typingState.startTime === null && e.key.length === 1) {
            setTypingState(prev => ({
                ...prev,
                startTime: Date.now()
            }));
        }
    };

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const typed = e.target.value;
        const currentPosition = typed.length;

        // Create a copy of the typing state to update
        const newTypingState = { ...typingState };

        // If typing has not started yet, record the start time
        if (!newTypingState.startTime) {
            newTypingState.startTime = Date.now();
        }

        // Store the typed character
        if (currentPosition > 0) {
            const typedChar = typed[currentPosition - 1];
            const expectedChar = text[currentPosition - 1];

            // Check if the character was typed correctly
            if (typedChar !== expectedChar) {
                newTypingState.errors++;

                // Add to typing errors array for detailed error tracking
                if (!newTypingState.typingErrors) {
                    newTypingState.typingErrors = [];
                }
                newTypingState.typingErrors.push({
                    index: currentPosition - 1,
                    expected: expectedChar,
                    actual: typedChar
                });

                // If blockOnError is true, don't advance the position
                if (blockOnError) {
                    // Force the input value to match only the correct characters
                    if (inputRef.current) {
                        const correctText = newTypingState.typedChars.slice(0, currentPosition - 1).join('');
                        inputRef.current.value = correctText;
                    }

                    // Update statistics for the incorrect character
                    if (updateStatistics) {
                        updateStatistics(expectedChar, typedChar);
                    }

                    // Update state without advancing position
                    setTypingState(newTypingState);
                    return;
                }
            }

            // Store the typed character (only if correct or if not blocking on error)
            newTypingState.typedChars[currentPosition - 1] = typedChar;

            // Update statistics for all typed characters
            if (updateStatistics) {
                updateStatistics(expectedChar, typedChar);
            }
        }

        // Update the current position in the text
        newTypingState.currentPosition = currentPosition;

        // Check if typing is complete
        if (currentPosition === text.length) {
            console.log('TypingArea: Text completion detected');

            // Ensure startTime exists
            if (!newTypingState.startTime) {
                // Set a fallback start time (1 second ago) if missing
                newTypingState.startTime = Date.now() - 1000;
            }

            // Set the end time
            newTypingState.endTime = Date.now();

            // Update typing state immediately
            setTypingState(newTypingState);

            // Use setTimeout to ensure state is updated before calling onComplete
            setTimeout(() => {
                onComplete(newTypingState);
            }, 50);

            return;
        }

        // Update typing state
        setTypingState(newTypingState);
    };

    // Keep focus on input area
    const handleContainerClick = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const renderText = () => {
        return text.split('').map((char, index) => {
            let status: 'correct' | 'incorrect' | 'current' | 'untyped';
            let displayTooltip = false;
            let tooltipChar = '';

            if (index < typingState.currentPosition) {
                // Already typed characters
                const typedChar = typingState.typedChars[index];
                // Explicitly check if the typed character is different from the expected character
                if (typedChar && typedChar !== char) {
                    status = 'incorrect';
                    displayTooltip = true;
                    tooltipChar = typedChar;
                } else {
                    status = 'correct';
                }
            } else if (index === typingState.currentPosition) {
                // Current character position - always show as current
                status = 'current';
            } else {
                // Characters not yet typed
                status = 'untyped';
            }

            return (
                <Character key={index} status={status} hasTooltip={displayTooltip}>
                    {char}
                    {displayTooltip && (
                        <ErrorTooltip className="tooltip">
                            You typed: {tooltipChar === ' ' ? '⎵' : tooltipChar}
                        </ErrorTooltip>
                    )}
                </Character>
            );
        });
    };

    // Add this function to get the next character
    const getNextChar = () => {
        if (typingState.currentPosition >= text.length) {
            return null;
        }
        return text[typingState.currentPosition];
    };

    return (
        <Container ref={containerRef} onClick={handleContainerClick}>
            <h3>Type the text below:</h3>
            <TextDisplay>
                {renderText()}
            </TextDisplay>

            {/* Conditionally render the Keyboard component based on showKeyboard prop */}
            {showKeyboard && <Keyboard nextChar={getNextChar()} />}

            {/* Add live error statistics */}
            {typingState.typingErrors && typingState.typingErrors.length > 0 && (
                <LiveErrorStats
                    typingErrors={typingState.typingErrors}
                    showStats={showLiveStats}
                />
            )}

            <InputArea
                ref={inputRef}
                onKeyDown={handleKeyDown}
                onChange={handleInput}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
            />
        </Container>
    );
};

export default TypingArea; 
