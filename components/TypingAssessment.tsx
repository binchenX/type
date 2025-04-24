import { useState } from 'react';
import styled from 'styled-components';
import TypingArea from './TypingArea';
import { TypingState } from '@/types';

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
    onComplete: (level: 'beginner' | 'intermediate' | 'advanced', wpm: number, assessmentData?: {
        expectedText: string;
        actualText: string;
        accuracy: number;
        errorPatterns: {
            characterErrors: { [key: string]: number };
            commonMistakes: Array<{ expected: string; actual: string; count: number }>;
        };
    }) => void;
}

const TypingAssessment: React.FC<TypingAssessmentProps> = ({ onComplete }) => {
    const [step, setStep] = useState<'question' | 'test'>('question');
    const assessmentText = "The quick";

    const handleSelfAssessment = (isNewbie: boolean) => {
        if (isNewbie) {
            onComplete('beginner', 0);
        } else {
            setStep('test');
        }
    };

    const analyzeErrorPatterns = (expected: string, actual: string) => {
        const characterErrors: { [key: string]: number } = {};
        const commonMistakes: Array<{ expected: string; actual: string; count: number }> = [];
        const mistakes = new Map<string, number>();

        const minLength = Math.min(expected.length, actual.length);
        for (let i = 0; i < minLength; i++) {
            if (expected[i] !== actual[i]) {
                if (!characterErrors[expected[i]]) {
                    characterErrors[expected[i]] = 0;
                }
                characterErrors[expected[i]]++;

                const mistakeKey = `${expected[i]}->${actual[i]}`;
                mistakes.set(mistakeKey, (mistakes.get(mistakeKey) || 0) + 1);
            }
        }

        mistakes.forEach((count, key) => {
            const [expected, actual] = key.split('->');
            commonMistakes.push({ expected, actual, count });
        });
        commonMistakes.sort((a, b) => b.count - a.count);

        return {
            characterErrors,
            commonMistakes: commonMistakes.slice(0, 5)
        };
    };

    const handleTestComplete = (finalState: TypingState) => {
        const actualText = finalState.typedChars.join('');
        const timeInMinutes = ((finalState.endTime || 0) - (finalState.startTime || 0)) / 60000;
        const wordsTyped = actualText.trim().split(/\s+/).length;
        const wpm = Math.round(wordsTyped / timeInMinutes);

        // Calculate accuracy
        const expectedChars = assessmentText.length;
        const errors = Array.from(assessmentText).reduce((acc, char, i) =>
            acc + (char !== actualText[i] ? 1 : 0), 0);
        const accuracy = Math.round(((expectedChars - errors) / expectedChars) * 100);

        // Analyze error patterns
        const errorPatterns = analyzeErrorPatterns(assessmentText, actualText);

        // Determine level based on WPM and accuracy
        let level: 'beginner' | 'intermediate' | 'advanced';
        if (wpm < 30 || accuracy < 90) {
            level = 'beginner';
        } else if (wpm < 60 || accuracy < 95) {
            level = 'intermediate';
        } else {
            level = 'advanced';
        }

        console.log('TypingAssessment: Completed', {
            level,
            wpm,
            accuracy,
            errorPatterns
        });

        onComplete(level, wpm, {
            expectedText: assessmentText,
            actualText,
            accuracy,
            errorPatterns
        });
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
                onComplete={handleTestComplete}
                updateStatistics={(expectedChar, typedChar) => {
                    // Optional: Add any additional statistics tracking here
                }}
            />
        </AssessmentContainer>
    );
};

export default TypingAssessment; 
