import { useEffect, useRef } from 'react';
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

const Character = styled.span<{ status?: 'correct' | 'incorrect' | 'current' | 'untyped' }>`
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
`;

const InputArea = styled.textarea`
  position: absolute;
  left: -9999px;
  top: -9999px;
  opacity: 0;
`;

interface TypingAreaProps {
    text: string;
    typingState: TypingState;
    setTypingState: React.Dispatch<React.SetStateAction<TypingState>>;
    onComplete: () => void;
}

const TypingArea: React.FC<TypingAreaProps> = ({
    text,
    typingState,
    setTypingState,
    onComplete
}) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

            // Add the new character
            newTypedChars.push(lastChar);

            // Check if the character is correct
            if (lastChar !== text[prev.currentPosition]) {
                newErrors += 1;
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

            if (index < typingState.currentPosition) {
                // Character has been typed
                status = typingState.typedChars[index] === char ? 'correct' : 'incorrect';
            } else if (index === typingState.currentPosition) {
                // Current character
                status = 'current';
            } else {
                // Not yet typed
                status = 'untyped';
            }

            return (
                <Character key={index} status={status}>
                    {char}
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
