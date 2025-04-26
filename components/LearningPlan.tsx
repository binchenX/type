import { useState, useEffect } from 'react';
import styled from 'styled-components';
import TypingArea from './TypingArea';
import Stats from './Stats';
import { TypingState } from '@/types';
import { LevelBasedPlanParams, AssessmentBasedPlanParams, LearningPlanParams } from '@/services/llmService';
import { StoredLearningPlan, saveLearningPlan, loadLearningPlan, updateLearningProgress, clearLearningPlan } from '@/utils/learningStorage';

const PlanContainer = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
`;

// New compact header component
const CompactHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--background-light);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
`;

const HeaderTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: var(--text);
  
  svg {
    width: 20px;
    height: 20px;
    color: var(--primary);
  }
`;

const HeaderPills = styled.div`
  display: flex;
  gap: 0.5rem;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const ModuleTitle = styled.h2`
  margin-bottom: 0.5rem;
  color: var(--text);
  font-size: 1.75rem;
  font-weight: 600;
  border-bottom: 2px solid var(--primary);
  padding-bottom: 0.25rem;
`;

const ModuleDescription = styled.p`
  margin-bottom: 1rem;
  color: var(--text-light);
  line-height: 1.4;
  font-size: 1rem;
`;

const LessonTitle = styled.h3`
  margin-bottom: 0.5rem;
  color: var(--text);
  font-size: 1.25rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:before {
    content: '▶';
    color: var(--primary);
    font-size: 0.9rem;
  }
`;

const LessonDescription = styled.p`
  margin-bottom: 1rem;
  color: var(--text-light);
  line-height: 1.4;
  font-size: 0.95rem;
  padding-left: 1.25rem;
  border-left: 2px solid var(--background-light);
`;

const ProgressBar = styled.div`
  height: 6px;
  width: 100%;
  background-color: var(--background-light);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.75rem;
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
  font-size: 0.9rem;
  
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

const LoadingContainer = styled.div`
    text-align: center;
    padding: 2rem;
    color: var(--text);
`;

const LoadingSpinner = styled.div`
    display: inline-block;
    width: 50px;
    height: 50px;
    border: 3px solid var(--background-light);
    border-radius: 50%;
    border-top-color: var(--primary);
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 1rem;

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
`;

const LoadingText = styled.div`
    font-size: 1.2rem;
    margin-bottom: 0.5rem;
`;

const LoadingSubText = styled.div`
    font-size: 0.9rem;
    color: var(--text-light);
`;

// Add a new wrapper for typing area with reduced margins
const TypingAreaWrapper = styled.div`
  margin-bottom: 1rem;
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
    planParams: LevelBasedPlanParams | AssessmentBasedPlanParams;
    onComplete: () => void;
    onExit: () => void;
    showKeyboard?: boolean;
}

const calculateTotalLessons = (modules: Module[]): number => {
    if (!modules || !Array.isArray(modules)) return 0;
    return modules.reduce((sum, module) => {
        return sum + (Array.isArray(module.lessons) ? module.lessons.length : 0);
    }, 0);
};

const LearningPlan: React.FC<LearningPlanProps> = ({
    planParams,
    onComplete,
    onExit,
    showKeyboard
}) => {
    // Log only once when component mounts or when planParams changes meaningfully
    const planParamsString = JSON.stringify(planParams);

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
    const [apiCallMade, setApiCallMade] = useState(false);
    const [restoredFromStorage, setRestoredFromStorage] = useState(false);

    // First, try to load the learning plan from localStorage
    useEffect(() => {
        const loadPlanData = async () => {
            setIsLoading(true);
            // First try to load from localStorage
            const savedPlan = loadLearningPlan();

            // Check if we have a saved plan that matches our criteria
            if (savedPlan) {
                // First validate that the saved plan has valid structure
                let isValidPlan = true;

                // Check that the plan has modules and they're an array
                if (!Array.isArray(savedPlan.modules) || !savedPlan.modules.length) {
                    console.error('Saved plan has invalid modules structure');
                    isValidPlan = false;
                } else {
                    // Validate each module has a valid lessons array
                    for (let i = 0; i < savedPlan.modules.length; i++) {
                        const module = savedPlan.modules[i];
                        if (!module || !Array.isArray(module.lessons) || !module.lessons.length) {
                            console.error(`Module at index ${i} has invalid lessons structure`);
                            isValidPlan = false;
                            break;
                        }
                    }

                    // Validate progress indices are valid
                    if (savedPlan.progress) {
                        const { currentModuleIndex, currentLessonIndex } = savedPlan.progress;

                        // Check if indices point to valid items
                        if (currentModuleIndex >= savedPlan.modules.length) {
                            console.error('Saved plan has invalid currentModuleIndex');
                            isValidPlan = false;
                        } else if (currentLessonIndex >= savedPlan.modules[currentModuleIndex]?.lessons.length) {
                            console.error('Saved plan has invalid currentLessonIndex');
                            isValidPlan = false;
                        }
                    } else {
                        console.error('Saved plan has no progress data');
                        isValidPlan = false;
                    }
                }

                // If invalid structure, don't try to use it
                if (!isValidPlan) {
                    console.error('Plan validation failed, generating new plan');
                } else if (savedPlan.planParams.type !== planParams.type) {
                    console.log(`Plan type mismatch: saved=${savedPlan.planParams.type}, new=${planParams.type}, will generate new plan`);
                } else if (planParams.type === 'level_based' && savedPlan.planParams.type === 'level_based') {
                    const savedLevelParams = savedPlan.planParams;
                    const newLevelParams = planParams;

                    // Check if level matches
                    if (savedLevelParams.level !== newLevelParams.level) {
                        console.log(`Level mismatch: saved=${savedLevelParams.level}, new=${newLevelParams.level}, will generate new plan`);
                    } else {
                        // All parameters match, we can reuse the plan
                        console.log('Restoring learning plan from localStorage - all parameters match', {
                            level: savedLevelParams.level,
                            wpm: savedLevelParams.currentWpm,
                            moduleCount: savedPlan.modules.length,
                            progress: `${savedPlan.progress.completedLessons}/${savedPlan.progress.totalLessons}`
                        });

                        setModules(savedPlan.modules);
                        setCurrentModuleIndex(savedPlan.progress.currentModuleIndex);
                        setCurrentLessonIndex(savedPlan.progress.currentLessonIndex);
                        setIsLoading(false);
                        return; // Exit early, no need to generate a plan
                    }
                } else if (planParams.type === 'assessment' && savedPlan.planParams.type === 'assessment') {
                    const savedAssessParams = savedPlan.planParams;
                    const newAssessParams = planParams;

                    if (savedAssessParams.wpm !== newAssessParams.wpm) {
                        console.log(`Assessment WPM mismatch: saved=${savedAssessParams.wpm}, new=${newAssessParams.wpm}, will generate new plan`);
                    } else {
                        // All parameters match, we can reuse the plan
                        console.log('Restoring assessment-based learning plan from localStorage', {
                            wpm: savedAssessParams.wpm,
                            moduleCount: savedPlan.modules.length,
                            progress: `${savedPlan.progress.completedLessons}/${savedPlan.progress.totalLessons}`
                        });

                        setModules(savedPlan.modules);
                        setCurrentModuleIndex(savedPlan.progress.currentModuleIndex);
                        setCurrentLessonIndex(savedPlan.progress.currentLessonIndex);
                        setIsLoading(false);
                        return; // Exit early, no need to generate a plan
                    }
                } else {
                    console.log('Plan type combination not handled, will generate new plan');
                }
            } else {
                console.log('No saved plan found in localStorage, will generate new plan');
            }

            // If we reach here, we need to generate a new plan
            try {
                console.log('Generating new learning plan from API');
                const response = await fetch('/api/generate-learning-plan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(planParams)
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('LearningPlan: API Error Response:', errorData);
                    throw new Error(`Failed to generate learning plan: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                if (data.modules && Array.isArray(data.modules)) {
                    setModules(data.modules);

                    // Calculate total lessons for progress tracking
                    const totalLessons = calculateTotalLessons(data.modules);

                    // Save the new plan to localStorage
                    const planToSave: StoredLearningPlan = {
                        modules: data.modules,
                        planParams,
                        progress: {
                            currentModuleIndex: 0,
                            currentLessonIndex: 0,
                            completedLessons: 0,
                            totalLessons
                        },
                        lastUpdated: Date.now()
                    };

                    saveLearningPlan(planToSave);
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
                        targetWpm: Math.max(20, Math.floor(
                            planParams.type === 'level_based' ? planParams.currentWpm * 0.8 : planParams.wpm * 0.8
                        ))
                    }]
                }];
                setModules(fallbackModules);

                // Save fallback plan to localStorage
                const totalLessons = calculateTotalLessons(fallbackModules);

                const fallbackPlan: StoredLearningPlan = {
                    modules: fallbackModules,
                    planParams,
                    progress: {
                        currentModuleIndex: 0,
                        currentLessonIndex: 0,
                        completedLessons: 0,
                        totalLessons
                    },
                    lastUpdated: Date.now()
                };

                saveLearningPlan(fallbackPlan);
            } finally {
                setIsLoading(false);
            }
        };

        loadPlanData();
    }, [planParamsString]);

    const handleLessonComplete = () => {
        // Safety check for modules array
        if (!modules.length) {
            console.error('No modules found when trying to complete lesson');
            onExit();
            return;
        }

        const currentModule = modules[currentModuleIndex];

        // Safety check for currentModule
        if (!currentModule) {
            console.error(`Module at index ${currentModuleIndex} not found when completing lesson`);
            onExit();
            return;
        }

        // Safety check for currentModule.lessons
        if (!Array.isArray(currentModule.lessons) || !currentModule.lessons.length) {
            console.error(`No lessons found in module ${currentModuleIndex} when completing lesson`);
            onExit();
            return;
        }

        let newModuleIndex = currentModuleIndex;
        let newLessonIndex = currentLessonIndex;

        if (currentLessonIndex < currentModule.lessons.length - 1) {
            // Move to next lesson in current module
            newLessonIndex = currentLessonIndex + 1;
        } else if (currentModuleIndex < modules.length - 1) {
            // Move to first lesson of next module
            newModuleIndex = currentModuleIndex + 1;
            newLessonIndex = 0;

            // Verify the next module has lessons
            if (!modules[newModuleIndex] || !Array.isArray(modules[newModuleIndex].lessons) || !modules[newModuleIndex].lessons.length) {
                console.error(`Next module at index ${newModuleIndex} has no valid lessons`);
                clearLearningPlan();
                onComplete();
                return;
            }
        } else {
            // Completed all modules
            clearLearningPlan(); // Clear saved plan on completion
            onComplete();
            return;
        }

        // Set new indices
        setCurrentModuleIndex(newModuleIndex);
        setCurrentLessonIndex(newLessonIndex);

        // Calculate progress data safely
        const totalLessons = calculateTotalLessons(modules);
        const completedLessons = modules.slice(0, newModuleIndex).reduce((sum, module) => {
            return sum + (Array.isArray(module.lessons) ? module.lessons.length : 0);
        }, 0) + newLessonIndex;

        // Update progress in localStorage
        updateLearningProgress({
            currentModuleIndex: newModuleIndex,
            currentLessonIndex: newLessonIndex,
            completedLessons,
            totalLessons
        });

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

    const handleExitWithClear = () => {
        // Clear saved plan if user manually exits
        clearLearningPlan();
        onExit();
    };

    if (isLoading) {
        return (
            <PlanContainer>
                <LoadingContainer>
                    <LoadingSpinner />
                    <LoadingText>
                        {restoredFromStorage
                            ? "Loading your saved learning plan..."
                            : "Our AI is generating your personalized learning plan..."}
                    </LoadingText>
                    <LoadingSubText>
                        {restoredFromStorage
                            ? "Resuming from where you left off"
                            : `Creating a custom AI-tailored plan for ${planParams.type === 'level_based' ?
                                `${planParams.level} level at ${planParams.currentWpm} WPM` :
                                `${planParams.wpm} WPM`}`
                        }
                    </LoadingSubText>
                </LoadingContainer>
            </PlanContainer>
        );
    }

    if (!modules.length) {
        return (
            <PlanContainer>
                <ModuleTitle>Error loading AI learning plan</ModuleTitle>
                <Button onClick={onExit}>Exit to Practice</Button>
            </PlanContainer>
        );
    }

    // Add safety checks to prevent accessing undefined objects
    const currentModule = modules[currentModuleIndex];

    // Check if currentModule exists
    if (!currentModule) {
        console.error(`Module at index ${currentModuleIndex} not found`);
        return (
            <PlanContainer>
                <ModuleTitle>Error: Learning module not found</ModuleTitle>
                <Button onClick={onExit}>Exit to Practice</Button>
            </PlanContainer>
        );
    }

    const currentLesson = currentModule.lessons?.[currentLessonIndex];

    // Check if currentLesson exists
    if (!currentLesson) {
        console.error(`Lesson at index ${currentLessonIndex} not found in module ${currentModuleIndex}`);
        return (
            <PlanContainer>
                <ModuleTitle>{currentModule.name}</ModuleTitle>
                <ModuleDescription>{currentModule.description}</ModuleDescription>
                <div style={{ margin: '2rem 0' }}>
                    <p>Error: Lesson not found. This may be due to a data corruption issue.</p>
                </div>
                <Button onClick={handleExitWithClear}>Exit Learning Plan</Button>
            </PlanContainer>
        );
    }

    const totalLessons = calculateTotalLessons(modules);
    const completedLessons = modules.slice(0, currentModuleIndex).reduce((sum, module) => {
        return sum + (Array.isArray(module.lessons) ? module.lessons.length : 0);
    }, 0) + currentLessonIndex;
    const progress = (completedLessons / totalLessons) * 100;

    return (
        <PlanContainer>
            <CompactHeader>
                <HeaderTitle>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    AI Learning Plan {restoredFromStorage && "(Saved)"}
                </HeaderTitle>
                <HeaderPills>
                    <ProgressPill>
                        Module {currentModuleIndex + 1} of {modules.length}
                    </ProgressPill>
                    <ProgressPill>
                        Lesson {currentLessonIndex + 1} of {currentModule.lessons.length}
                    </ProgressPill>
                </HeaderPills>
            </CompactHeader>

            <ModuleTitle>{currentModule.name}</ModuleTitle>
            <ModuleDescription>{currentModule.description}</ModuleDescription>

            <LessonTitle>{currentLesson.title}</LessonTitle>
            <LessonDescription>{currentLesson.description}</LessonDescription>

            <TypingAreaWrapper>
                <TypingArea
                    text={currentLesson.content}
                    typingState={typingState}
                    setTypingState={setTypingState}
                    onComplete={handleLessonComplete}
                    showKeyboard={showKeyboard}
                    blockOnError={planParams.type === 'level_based' ?
                        planParams.level !== 'intermediate' :
                        planParams.wpm < 30 || planParams.wpm >= 60}
                />
            </TypingAreaWrapper>

            <Stats
                currentIndex={completedLessons}
                totalItems={totalLessons}
                typingState={typingState}
                currentText={currentLesson.content}
            />

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <Button onClick={handleExitWithClear}>Exit Learning Plan</Button>
            </div>
        </PlanContainer>
    );
};

export default LearningPlan; 
