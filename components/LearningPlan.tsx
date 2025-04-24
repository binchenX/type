import { useState, useEffect } from 'react';
import styled from 'styled-components';
import TypingArea from './TypingArea';
import Stats from './Stats';
import { TypingState } from '@/types';

const PlanContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const ModuleTitle = styled.h2`
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 1.75rem;
  font-weight: 600;
  border-bottom: 2px solid var(--primary);
  padding-bottom: 0.5rem;
`;

const ModuleDescription = styled.p`
  margin-bottom: 2rem;
  color: var(--text-light);
  line-height: 1.6;
  font-size: 1.1rem;
`;

const LessonTitle = styled.h3`
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 1.4rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:before {
    content: '▶';
    color: var(--primary);
    font-size: 1rem;
  }
`;

const LessonDescription = styled.p`
  margin-bottom: 2rem;
  color: var(--text-light);
  line-height: 1.6;
  font-size: 1.1rem;
  padding-left: 1.5rem;
  border-left: 3px solid var(--background-light);
`;

const ProgressBar = styled.div`
  height: 8px;
  width: 100%;
  background-color: var(--background-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressFill = styled.div<{ width: number }>`
  height: 100%;
  width: ${props => `${props.width}%`};
  background-color: var(--primary);
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressCounter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-light);
  font-size: 0.9rem;
`;

const ProgressPill = styled.span`
  background-color: var(--background-light);
  padding: 0.4rem 0.8rem;
  border-radius: 1rem;
  color: var(--text);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  
  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: var(--primary);
    border-radius: 50%;
  }
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
  margin-top: 1rem;

  &:hover {
    background-color: ${props => props.primary ? 'var(--primary-dark)' : 'var(--background-light)'};
  }
`;

interface Module {
    name: string;
    description: string;
    lessons: Array<{
        title: string;
        description: string;
        content: string;
        targetWpm: number;
    }>;
}

interface LearningPlanProps {
    userLevel: 'beginner' | 'intermediate' | 'advanced';
    initialWpm: number;
    onComplete: () => void;
    onExit: () => void;
}

const LearningPlan: React.FC<LearningPlanProps> = ({
    userLevel,
    initialWpm,
    onComplete,
    onExit
}) => {
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
    const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
    const [typingState, setTypingState] = useState<TypingState>({
        startTime: null,
        endTime: null,
        currentPosition: 0,
        errors: 0,
        typedChars: [],
        typingErrors: [],
        typingWordErrors: []
    });
    const [modules, setModules] = useState<Module[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generatePlan = async () => {
            let currentWpm: number;
            try {
                console.log('LearningPlan: Starting plan generation');
                console.log('LearningPlan: User level:', userLevel);
                console.log('LearningPlan: Initial WPM:', initialWpm);

                currentWpm = Number(initialWpm);
                if (isNaN(currentWpm)) {
                    throw new Error('Invalid WPM value');
                }

                const response = await fetch('/api/generate-learning-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        level: userLevel as 'beginner' | 'intermediate' | 'advanced',
                        currentWpm: Number(currentWpm)
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('LearningPlan: API Error Response:', errorData);
                    throw new Error(`Failed to generate learning plan: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                console.log('LearningPlan: Raw API response:', JSON.stringify(data, null, 2));

                if (data.modules && Array.isArray(data.modules)) {
                    console.log('LearningPlan: Number of modules:', data.modules.length);
                    data.modules.forEach((module: Module, index: number) => {
                        console.log(`LearningPlan: Module ${index + 1}:`, {
                            name: module.name,
                            description: module.description,
                            lessonCount: module.lessons?.length || 0
                        });
                    });
                    setModules(data.modules);
                } else {
                    console.error('LearningPlan: Invalid response format:', data);
                    throw new Error('Invalid learning plan format');
                }
            } catch (error) {
                console.error('LearningPlan: Error generating plan:', error);
                // Fallback modules if API fails
                const fallbackModules = [{
                    name: 'Home Row Basics',
                    description: 'Master the home row keys for touch typing',
                    lessons: [{
                        title: 'Home Row Introduction',
                        description: 'Learn the basic position of home row keys',
                        content: 'asdf jkl; asdf jkl; fjfjfj dkdkdk slslsl ajajaj',
                        targetWpm: Math.max(20, Math.floor(initialWpm * 0.8))
                    }]
                }];
                console.log('LearningPlan: Using fallback modules:', fallbackModules);
                setModules(fallbackModules);
            } finally {
                setIsLoading(false);
            }
        };

        generatePlan();
    }, [userLevel, initialWpm]);

    const handleLessonComplete = () => {
        const currentModule = modules[currentModuleIndex];
        if (currentLessonIndex < currentModule.lessons.length - 1) {
            // Move to next lesson in current module
            setCurrentLessonIndex(prev => prev + 1);
        } else if (currentModuleIndex < modules.length - 1) {
            // Move to first lesson of next module
            setCurrentModuleIndex(prev => prev + 1);
            setCurrentLessonIndex(0);
        } else {
            // Completed all modules
            onComplete();
        }

        // Reset typing state for next lesson
        setTypingState({
            startTime: null,
            endTime: null,
            currentPosition: 0,
            errors: 0,
            typedChars: [],
            typingErrors: [],
            typingWordErrors: []
        });
    };

    if (isLoading) {
        return (
            <PlanContainer>
                <ModuleTitle>Generating your personalized learning plan...</ModuleTitle>
            </PlanContainer>
        );
    }

    if (!modules.length) {
        return (
            <PlanContainer>
                <ModuleTitle>Error loading learning plan</ModuleTitle>
                <Button onClick={onExit}>Exit to Practice</Button>
            </PlanContainer>
        );
    }

    const currentModule = modules[currentModuleIndex];
    const currentLesson = currentModule.lessons[currentLessonIndex];
    const totalLessons = modules.reduce((sum, module) => sum + module.lessons.length, 0);
    const completedLessons = modules.slice(0, currentModuleIndex).reduce((sum, module) => sum + module.lessons.length, 0) + currentLessonIndex;
    const progress = (completedLessons / totalLessons) * 100;

    return (
        <PlanContainer>
            <ProgressBar>
                <ProgressFill width={progress} />
            </ProgressBar>
            <ProgressCounter>
                <ProgressPill>
                    Module {currentModuleIndex + 1} of {modules.length}
                </ProgressPill>
                <ProgressPill>
                    Lesson {currentLessonIndex + 1} of {currentModule.lessons.length}
                </ProgressPill>
            </ProgressCounter>

            <ModuleTitle>{currentModule.name}</ModuleTitle>
            <ModuleDescription>{currentModule.description}</ModuleDescription>

            <LessonTitle>{currentLesson.title}</LessonTitle>
            <LessonDescription>{currentLesson.description}</LessonDescription>

            <TypingArea
                text={currentLesson.content}
                typingState={typingState}
                setTypingState={setTypingState}
                onComplete={handleLessonComplete}
            />

            <Stats
                currentIndex={completedLessons}
                totalItems={totalLessons}
                typingState={typingState}
                currentText={currentLesson.content}
            />

            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
                <Button onClick={onExit}>Exit Learning Plan</Button>
            </div>
        </PlanContainer>
    );
};

export default LearningPlan; 
