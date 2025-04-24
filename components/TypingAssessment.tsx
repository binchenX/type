import { useState } from 'react';
import styled from 'styled-components';
import TypingArea from './TypingArea';
import { TypingState, ParsedMarkdownItem } from '@/types';

const AssessmentContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Question = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Options = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 2rem;
`;

const Button = styled.button<{ primary?: boolean }>`
  background-color: ${props => props.primary ? 'var(--primary)' : 'transparent'};
  color: ${props => props.primary ? 'white' : 'var(--primary)'};
  border: 1px solid var(--primary);
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${props => props.primary ? 'var(--primary-dark)' : 'var(--background-light)'};
  }
`;

const AssessmentText = styled.p`
  margin-bottom: 1rem;
  font-size: 1.1rem;
  line-height: 1.6;
  text-align: center;
`;

interface TypingAssessmentProps {
    onComplete: (level: 'beginner' | 'intermediate' | 'advanced', wpm: number) => void;
}

const TypingAssessment: React.FC<TypingAssessmentProps> = ({ onComplete }) => {
    const [step, setStep] = useState<'question' | 'test'>('question');
    const [typingState, setTypingState] = useState<TypingState>({
        startTime: null,
        endTime: null,
        currentPosition: 0,
        errors: 0,
        typedChars: [],
        typingErrors: [],
        typingWordErrors: []
    });

    const assessmentText = "The quick brown fox jumps over the lazy dog. This simple pangram contains every letter of the English alphabet at least once. Typing it is a good way to practice for beginners and test speed for advanced users.";

    const handleSelfAssessment = (isNewbie: boolean) => {
        if (isNewbie) {
            onComplete('beginner', 0);
        } else {
            setStep('test');
        }
    };

    const handleTestComplete = () => {
        if (!typingState.startTime || !typingState.endTime) return;

        const timeInMinutes = (typingState.endTime - typingState.startTime) / 1000 / 60;
        const words = assessmentText.length / 5; // Standard: 5 characters = 1 word
        const wpm = Math.round(words / timeInMinutes);

        let level: 'beginner' | 'intermediate' | 'advanced';
        if (wpm < 30) {
            level = 'beginner';
        } else if (wpm < 60) {
            level = 'intermediate';
        } else {
            level = 'advanced';
        }

        onComplete(level, wpm);
    };

    if (step === 'question') {
        return (
            <AssessmentContainer>
                <Question>
                    <h2>Before we start...</h2>
                    <AssessmentText>
                        Are you new to touch typing? (Using all fingers without looking at the keyboard)
                    </AssessmentText>
                </Question>
                <Options>
                    <Button primary onClick={() => handleSelfAssessment(true)}>
                        Yes, I'm new to this
                    </Button>
                    <Button onClick={() => handleSelfAssessment(false)}>
                        No, I have some experience
                    </Button>
                </Options>
            </AssessmentContainer>
        );
    }

    return (
        <AssessmentContainer>
            <h2>Quick Typing Assessment</h2>
            <AssessmentText>
                Please type the following text to help us determine your current typing level:
            </AssessmentText>
            <TypingArea
                text={assessmentText}
                typingState={typingState}
                setTypingState={setTypingState}
                onComplete={handleTestComplete}
            />
        </AssessmentContainer>
    );
};

export default TypingAssessment; 
