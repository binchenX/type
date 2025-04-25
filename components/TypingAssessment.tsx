import { useState } from 'react';
import styled, { keyframes } from 'styled-components';
import TypingArea from './TypingArea';
import { TypingState } from '@/types';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const AssessmentContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  animation: ${fadeIn} 0.5s ease-out;
`;

const PageTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 1.5rem;
  position: relative;
  display: inline-block;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -8px;
    left: 0;
    width: 60px;
    height: 4px;
    background: linear-gradient(90deg, var(--primary) 0%, var(--primary-dark) 100%);
    border-radius: 2px;
  }
`;

const Card = styled.div`
  background-color: var(--background-light);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.06);
  padding: 3rem;
  margin: 2rem 0;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.1);
  }
`;

const Subtitle = styled.h2`
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1.5rem;
  text-align: center;
`;

const AssessmentText = styled.p`
  font-size: 1.2rem;
  line-height: 1.8;
  color: var(--text);
  margin: 1.5rem 0;
  text-align: center;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const Options = styled.div`
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin: 3rem 0 2rem;
  flex-wrap: wrap;
`;

const buttonHover = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
  100% { transform: translateY(0); }
`;

const Button = styled.button<{ primary?: boolean; outline?: boolean }>`
  background-color: ${props => props.primary ? 'var(--primary)' : props.outline ? 'transparent' : 'white'};
  color: ${props => props.primary ? 'white' : 'var(--primary)'};
  border: ${props => props.outline ? '2px solid var(--primary)' : props.primary ? 'none' : '1px solid var(--primary)'};
  padding: ${props => props.outline ? '0.9rem 1.8rem' : '1rem 2rem'};
  border-radius: 8px;
  font-weight: 600;
  font-size: 1.1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.primary ? '0 4px 14px rgba(59, 130, 246, 0.2)' : 'none'};
  position: relative;
  overflow: hidden;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: left 0.7s ease;
  }
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: ${props => props.primary ? '0 6px 20px rgba(59, 130, 246, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.05)'};
    background-color: ${props => props.primary ? 'var(--primary-dark)' : props.outline ? 'rgba(59, 130, 246, 0.05)' : 'white'};
    
    &:before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: ${props => props.primary ? '0 2px 10px rgba(59, 130, 246, 0.2)' : 'none'};
  }
`;

const SkipButton = styled(Button)`
  margin-top: 2rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:after {
    content: '→';
    opacity: 0;
    transform: translateX(-8px);
    transition: all 0.3s ease;
  }
  
  &:hover:after {
    opacity: 1;
    transform: translateX(4px);
  }
`;

const TypingHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`;

const TypingPrompt = styled.h3`
  font-size: 1.2rem;
  font-weight: 500;
  color: var(--text);
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:before, &:after {
    content: '';
    height: 2px;
    width: 30px;
    background-color: var(--border);
    display: inline-block;
  }
`;

const ActionContainer = styled.div`
  text-align: center;
  margin-top: 3rem;
`;

const ProgressIndicator = styled.div`
  margin: 3rem auto 0;
  text-align: center;
  color: var(--text-light);
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  svg {
    color: var(--primary);
  }
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
    const assessmentText = "The quick brown fox jumps over the lazy dog. This simple pangram contains every letter of the English alphabet at least once.";

    const handleSelfAssessment = (isNewbie: boolean) => {
        if (isNewbie) {
            onComplete('beginner', 0);
        } else {
            setStep('test');
        }
    };

    const handleSkipAssessment = () => {
        onComplete('intermediate', 40); // Default to intermediate level with 40 WPM
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
        // Ensure we have both start and end time before proceeding
        if (!finalState.startTime || !finalState.endTime) {
            console.error('TypingAssessment: Missing start or end time, aborting');
            return;
        }

        const actualText = finalState.typedChars.join('');
        const timeInMinutes = (finalState.endTime - finalState.startTime) / 60000;

        // Ensure we have a valid timing (prevent division by zero)
        if (timeInMinutes <= 0) {
            console.error('TypingAssessment: Invalid timing, aborting');
            return;
        }

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
            errorPatterns,
            startTime: finalState.startTime,
            endTime: finalState.endTime,
            timeInMinutes
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
                <Card>
                    <Subtitle>Before we start...</Subtitle>
                    <AssessmentText>
                        Are you new to touch typing? (Using all fingers without looking at the keyboard)
                    </AssessmentText>
                    <Options>
                        <Button primary onClick={() => handleSelfAssessment(true)}>
                            Yes, I'm new to this
                        </Button>
                        <Button outline onClick={() => handleSelfAssessment(false)}>
                            No, I have some experience
                        </Button>
                    </Options>
                    <ProgressIndicator>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 16V12L10 10M12 8V8.01M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 16.9706 7.02944 21 12 21Z"
                                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Your answer helps our AI personalize your learning experience
                    </ProgressIndicator>
                </Card>
            </AssessmentContainer>
        );
    }

    return (
        <AssessmentContainer>
            <Card>
                <TypingHeader>
                    <Subtitle>AI-Powered Typing Assessment</Subtitle>
                    <AssessmentText>
                        Please type the following text to help our AI determine your current typing level:
                    </AssessmentText>
                    <TypingPrompt>Type the text below</TypingPrompt>
                </TypingHeader>
                <TypingArea
                    text={assessmentText}
                    onComplete={handleTestComplete}
                    updateStatistics={(expectedChar, typedChar) => {
                        // Optional: Add any additional statistics tracking here
                    }}
                />
            </Card>
        </AssessmentContainer>
    );
};

export default TypingAssessment; 
