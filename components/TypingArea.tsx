import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { TypingState } from '@/types';

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
  
  background-color: ${props => props.status === 'current' ? 'var(--primary)' : 'transparent'};
  border-radius: ${props => props.status === 'current' ? '2px' : '0'};
  
  text-decoration: ${props => props.status === 'incorrect' ? 'underline' : 'none'};
  text-decoration-color: var(--error);
  
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
    typingState: TypingState;
    setTypingState: React.Dispatch<React.SetStateAction<TypingState>>;
    onComplete: () => void;
    updateErrorFrequencyMap?: (expectedChar: string, typedChar: string) => void;
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
    typingState,
    setTypingState,
    onComplete,
    updateErrorFrequencyMap
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [showLiveStats, setShowLiveStats] = useState(true);

    // Focus input when component mounts
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [text]); // Re-focus when text changes

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Prevent default browser behavior for certain keys
        if (e.key === 'Tab') {
            e.preventDefault();
        }

        if (e.ctrlKey || e.metaKey) {
            return; // Ignore command keys
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
        const inputVal = e.target.value;
        const lastChar = inputVal.charAt(inputVal.length - 1);

        // Clear the textarea after processing the input
        if (inputRef.current) {
            inputRef.current.value = '';
        }

        // Ignore if the last character is not printable
        if (!lastChar.match(/\S/) && lastChar !== ' ') {
            return;
        }

        // Process the new character
        setTypingState(prev => {
            // Copy the previous typed characters
            const newTypedChars = [...prev.typedChars];
            let newErrors = prev.errors;
            // Initialize or copy typingErrors array
            const typingErrors = prev.typingErrors ? [...prev.typingErrors] : [];

            // Add the new character
            newTypedChars.push(lastChar);

            // Check if the character is correct
            const expectedChar = text[prev.currentPosition];
            const isCorrect = lastChar === expectedChar;

            if (!isCorrect) {
                newErrors += 1;

                // Record detailed information about this error
                typingErrors.push({
                    index: prev.currentPosition,
                    expected: expectedChar,
                    actual: lastChar
                });
            }

            // Update error frequency map if the function is provided
            if (!isCorrect && updateErrorFrequencyMap) {
                updateErrorFrequencyMap(expectedChar, lastChar);
            }

            // Check if typing is complete
            const newPosition = prev.currentPosition + 1;
            const isComplete = newPosition >= text.length;

            // Set end time if complete
            let endTime = prev.endTime;
            if (isComplete && !endTime) {
                endTime = Date.now();

                // Trigger completion callback after state update
                setTimeout(onComplete, 500);
            }

            return {
                ...prev,
                currentPosition: newPosition,
                typedChars: newTypedChars,
                errors: newErrors,
                typingErrors,
                endTime: endTime
            };
        });
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
            let typedChar = typingState.typedChars[index];
            let isIncorrect = false;

            if (index < typingState.currentPosition) {
                // Character has been typed
                isIncorrect = typedChar !== char;
                status = isIncorrect ? 'incorrect' : 'correct';
            } else if (index === typingState.currentPosition) {
                // Current character
                status = 'current';
            } else {
                // Not yet typed
                status = 'untyped';
            }

            return (
                <Character key={index} status={status} hasTooltip={isIncorrect}>
                    {char}
                    {isIncorrect && (
                        <ErrorTooltip className="tooltip">
                            You typed: {typedChar === ' ' ? '⎵' : typedChar}
                        </ErrorTooltip>
                    )}
                </Character>
            );
        });
    };

    return (
        <Container ref={containerRef} onClick={handleContainerClick}>
            <h3>Type the text below:</h3>
            <TextDisplay>
                {renderText()}
            </TextDisplay>

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
